/**
 * aiPlacement — vision-grounded element placement on satellite tiles.
 *
 * Sprint AI-Place. Today the wizard puts elements on the property using
 * `autoLayout()` geometric heuristics with zero awareness of road / roof
 * / lawn / driveway. Charlie's manual test confirmed the failure: a
 * 16x12 patio sits on a building roof, a 60-LF edging slices through a
 * road. This module replaces that with a vision call: pass the Mapbox
 * satellite tile + the inferred element list to Claude Haiku 4.5, get
 * back placement coords as fractions of the tile, map them to plan-feet
 * via mapTileMath.
 *
 * Hard requirement (per ROADMAP.md "Sprint AI-Place"): must work for any
 * address the contractor inputs. Includes urban / rural / commercial /
 * recently-built / partially-occluded properties. Falls back to
 * autoLayout when the vision call fails or returns junk so the
 * contractor flow never blocks.
 *
 * This module is PURE and dependency-light:
 *   - takes the tile URL (caller fetches via Mapbox Static API)
 *   - takes the lat/zoom/tile-px (caller computes from address geocode)
 *   - takes the element list to place
 *   - returns a Map<elementKey, { position, rationale }> in plan-feet
 *
 * The wizard wires this into Step 1 → Step 2 transition (separate PR
 * — this is the plumbing layer).
 */

import { callClaudeWithVision, DEFAULT_MODEL } from '@/services/anthropic'
import { isNormalizedInTile, normalizedToPlanFeet } from '@/lib/mapTileMath'
import type { ElementType } from '@/types'

export interface ElementToPlace {
  /** Stable identity used as map key in the result. Wizard tempId or DB id. */
  key: string
  /** Element type so the prompt can reason about typical placement */
  elementType: ElementType
  /** Display name for the prompt — Claude uses it as the place-this-here label */
  name: string
  /** Best-known dimensions, in feet. Pass nulls when unknown. */
  lengthFt: number | null
  widthFt: number | null
  linearFt: number | null
}

export interface PlacementResult {
  /** Plan-feet, origin = tile center. Same coordinate space as ProjectElement.geometry.position */
  position: { x: number; y: number }
  /** 1-sentence justification from the model — surfaced to the contractor as a hint */
  rationale: string
}

export interface PlacementCallResult {
  /** Per-element placements that the model returned with valid coords */
  placements: Map<string, PlacementResult>
  /** Optional: AI-identified buildable polygon, normalized tile coords */
  buildableArea: Array<{ x: number; y: number }> | null
  /** Optional: AI-identified obstacles (roof, road, driveway, water), normalized tile coords */
  obstacles: Array<Array<{ x: number; y: number }>>
  /** Parallel-index labels for `obstacles` ("house roof", "driveway", "pool", …).
   *  Empty string when the model omitted the label. Used by the wizard's
   *  soft-clip warning tooltip to say "On house roof" instead of generic
   *  "On obstacle (rooftop / road / driveway)". */
  obstacleLabels: string[]
  /** True when the model self-rated imagery as too poor to place reliably */
  imageryPoor: boolean
  /** Raw rationale string for the whole call — used by the harness */
  reasoning: string
}

export interface PlacementContext {
  /** Public-ish Mapbox satellite URL for the property. Token is in the URL but
   *  the proxy never forwards it to Anthropic — only fetches the bytes. */
  tileImageUrl: string
  /** Tile center latitude (= geocoded address) */
  lat: number
  /** Tile center longitude (kept for symmetry; not used in math) */
  lng: number
  /** Mapbox zoom used for the static request (typically 19) */
  zoom: number
  /** Tile pixel width = height (typically 1200) */
  tilePxWide: number
  /** Elements to place */
  elements: ElementToPlace[]
}

const MAX_TOKENS = 2048
const PLACEMENT_TIMEOUT_MS = 15_000

/**
 * Builds the prompt used to ask Claude where to place each element on
 * the satellite tile. Kept separate from the call so it's testable +
 * inspectable from the harness.
 */
export function buildPlacementPrompt(elements: ElementToPlace[]): string {
  const elementBriefs = elements.map((el, i) => {
    const dims: string[] = []
    if (el.lengthFt && el.widthFt) dims.push(`${el.lengthFt}x${el.widthFt} ft`)
    if (el.linearFt) dims.push(`${el.linearFt} LF`)
    const dimStr = dims.length ? ` (${dims.join(', ')})` : ''
    return `${i + 1}. key="${el.key}" type=${el.elementType} name="${el.name}"${dimStr}`
  }).join('\n')

  return `You are a senior landscape designer reviewing a satellite image of a property. The contractor wants to place these landscaping elements on the property:

${elementBriefs}

## Your task
Return JSON with placement coordinates for each element. Coordinates are NORMALIZED to the satellite image: x = 0 is the LEFT edge, x = 1 is the RIGHT edge, y = 0 is the TOP edge (north), y = 1 is the BOTTOM edge (south). The property is centered in the image.

## Rules
1. Place each element on REAL GROUND. Avoid placing on:
   - Building rooftops (dark uniform rectangles, often with HVAC units / shadows)
   - Roads, streets, asphalt parking lots
   - Driveways and concrete walkways (unless replacing them is the element's purpose)
   - Pools (clearly blue / aqua water)
   - Mature tree canopies (large green clouds with shadows)
   - Neighboring properties (look for property-line cues — fences, vegetation breaks, mailbox/curb spacing)
2. Place elements where they make functional sense:
   - Patios, decks, fire pits → backyard, near house
   - Walkways → connecting front door to driveway/sidewalk
   - Driveways → existing driveway location, or adjacent to garage
   - Garden beds → along house foundation, fence lines, or as accent
   - Edging → perimeter of beds, walkways, or patios
   - Trees → with adequate clearance from structures
3. If you cannot identify a good placement (e.g. image is too blurry, no clear yard, all hardscape), set imageryPoor=true and return placements at (0.5, 0.5) for all elements. The contractor will manually drag them.
4. Coordinates must be in [0, 1]. Center is (0.5, 0.5).

## Output schema
\`\`\`json
{
  "imageryPoor": false,
  "buildableArea": [{"x": 0.2, "y": 0.5}, {"x": 0.8, "y": 0.5}, {"x": 0.8, "y": 0.9}, {"x": 0.2, "y": 0.9}],
  "obstacles": [
    {"label": "house roof", "polygon": [{"x": 0.3, "y": 0.2}, ...]},
    {"label": "driveway", "polygon": [...]}
  ],
  "placements": [
    {"key": "<key from input>", "x": 0.5, "y": 0.7, "rationale": "Backyard, behind house, away from pool."}
  ],
  "reasoning": "1-2 sentences describing what you see in the image and how you placed elements"
}
\`\`\`

Return ONLY valid JSON. No markdown fencing, no preamble.`
}

interface RawPlacementResponse {
  imageryPoor?: boolean
  buildableArea?: Array<{ x?: unknown; y?: unknown }>
  obstacles?: Array<{ label?: unknown; polygon?: Array<{ x?: unknown; y?: unknown }> }>
  placements?: Array<{
    key?: unknown
    x?: unknown
    y?: unknown
    rationale?: unknown
  }>
  reasoning?: unknown
}

/**
 * Best-effort JSON parse. Strips markdown fencing if present. Returns
 * null on unrecoverable parse failure.
 */
function parsePlacementResponse(raw: string): RawPlacementResponse | null {
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned) as RawPlacementResponse
  } catch {
    // Best-effort: try to find the first { ... } block.
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as RawPlacementResponse
    } catch {
      return null
    }
  }
}

/**
 * Validate + normalize a polygon array of `{x, y}` points. Returns
 * null if any point fails validation.
 */
function validatePolygon(
  raw: Array<{ x?: unknown; y?: unknown }> | undefined,
): Array<{ x: number; y: number }> | null {
  if (!raw || !Array.isArray(raw) || raw.length < 3) return null
  const out: Array<{ x: number; y: number }> = []
  for (const p of raw) {
    if (typeof p.x !== 'number' || typeof p.y !== 'number') return null
    if (!isNormalizedInTile({ x: p.x, y: p.y })) return null
    out.push({ x: p.x, y: p.y })
  }
  return out
}

/**
 * Run the vision-placement call against a satellite tile. The caller
 * provides the tile URL + lat/zoom/px so this module stays decoupled
 * from Mapbox URL construction.
 *
 * Always returns a `PlacementCallResult`. On any failure path the
 * `placements` map is empty and the caller should fall back to
 * `autoLayout()` for those elements.
 */
export async function inferElementPlacements(
  ctx: PlacementContext,
): Promise<PlacementCallResult> {
  const empty: PlacementCallResult = {
    placements: new Map(),
    buildableArea: null,
    obstacles: [],
    obstacleLabels: [],
    imageryPoor: false,
    reasoning: '',
  }
  if (ctx.elements.length === 0) return empty

  const prompt = buildPlacementPrompt(ctx.elements)

  let raw: string
  try {
    raw = await withTimeout(
      callClaudeWithVision(prompt, [ctx.tileImageUrl], DEFAULT_MODEL, MAX_TOKENS),
      PLACEMENT_TIMEOUT_MS,
    )
  } catch (err) {
    console.warn('[aiPlacement] vision call failed:', (err as Error).message)
    return empty
  }

  const parsed = parsePlacementResponse(raw)
  if (!parsed) {
    console.warn('[aiPlacement] response parse failed; raw:', raw.slice(0, 200))
    return empty
  }

  const imageryPoor = parsed.imageryPoor === true

  const buildableArea = validatePolygon(parsed.buildableArea)

  const obstacles: Array<Array<{ x: number; y: number }>> = []
  const obstacleLabels: string[] = []
  if (Array.isArray(parsed.obstacles)) {
    for (const ob of parsed.obstacles) {
      const poly = validatePolygon(ob.polygon)
      if (poly) {
        obstacles.push(poly)
        // Capture label when present + non-empty; empty string means
        // "model didn't say" so the consumer falls back to the generic copy.
        const label = typeof ob.label === 'string' ? ob.label.trim() : ''
        obstacleLabels.push(label)
      }
    }
  }

  const placements = new Map<string, PlacementResult>()
  if (Array.isArray(parsed.placements)) {
    const validKeys = new Set(ctx.elements.map((e) => e.key))
    for (const p of parsed.placements) {
      if (typeof p.key !== 'string') continue
      if (!validKeys.has(p.key)) continue
      if (typeof p.x !== 'number' || typeof p.y !== 'number') continue
      const norm = { x: p.x, y: p.y }
      if (!isNormalizedInTile(norm)) continue
      const planFt = normalizedToPlanFeet(norm, ctx.lat, ctx.zoom, ctx.tilePxWide)
      placements.set(p.key, {
        position: planFt,
        rationale: typeof p.rationale === 'string' ? p.rationale : '',
      })
    }
  }

  return {
    placements,
    buildableArea,
    obstacles,
    obstacleLabels,
    imageryPoor,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
  }
}

/**
 * Promise.race wrapper that rejects after `ms` milliseconds. Used to
 * keep the wizard transition snappy — a stuck vision call should fall
 * back to autoLayout, not block Step 2 from rendering.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI placement timed out')), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}
