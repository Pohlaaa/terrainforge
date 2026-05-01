import { test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CORPUS, scorePlacement } from './corpus'

import {
  buildPlacementPrompt,
} from '../../src/services/aiPlacement'
import {
  isNormalizedInTile,
  normalizedToPlanFeet,
} from '../../src/lib/mapTileMath'

/**
 * Sprint AI-Place harness runner.
 *
 * For each corpus entry:
 *   1. Build the Mapbox satellite URL via the entry's lat/lng/zoom.
 *   2. Fetch the tile server-side, base64-encode.
 *   3. POST the tile + placement prompt to Anthropic vision (Haiku 4.5).
 *      Note: this duplicates the proxy-claude server-side flow because
 *      the harness runs from Node, not the browser.
 *   4. Parse the response, score each placement against the corpus
 *      `expected` with tolerance.
 *
 * Outputs to `.claude/TESTING/`:
 *   placement-scorecard-<ISO>.json — full machine-readable report
 *   AI_PLACE_SCORECARD.md          — human-readable summary
 *
 * Run with `npm run placement:score`. Costs ~$0.75 per pass against
 * Claude Haiku vision.
 *
 * Skips automatically if `ANTHROPIC_API_KEY` (or `E2E_ANTHROPIC_KEY`)
 * isn't set, or if `MAPBOX_TOKEN` is missing — the corpus is useless
 * without real satellite tiles. The skip lets CI without keys mark
 * the test as skipped instead of failing red.
 *
 * **NOTE on the corpus's `expected` arrays**: most entries have
 * placeholder/TBD values that need contractor review before the score
 * is meaningful (see `.claude/TESTING/AI_PLACEMENT_NOTES.md`). Until
 * Charlie authors them, treat the score as directional, not absolute.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2048

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_DIR = path.resolve(__dirname, '../../.claude/TESTING')

function getApiKey(): string | undefined {
  return (
    process.env.E2E_ANTHROPIC_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY
  )
}

function getMapboxToken(): string | undefined {
  return process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN
}

interface AnthropicVisionContent {
  type: 'image' | 'text'
  source?: { type: 'base64'; media_type: string; data: string }
  text?: string
}

async function fetchTileBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`tile fetch ${res.status}`)
  const mediaType = res.headers.get('content-type') || 'image/png'
  if (!/^image\//.test(mediaType)) throw new Error(`tile non-image: ${mediaType}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
  return { base64: Buffer.from(binary, 'binary').toString('base64'), mediaType }
}

async function callAnthropicVision(
  prompt: string,
  imageB64: string,
  mediaType: string,
  apiKey: string,
): Promise<string> {
  const content: AnthropicVisionContent[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageB64 } },
    { type: 'text', text: prompt },
  ]
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content }],
    }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Anthropic API ${res.status}: ${errBody.slice(0, 200)}`)
  }
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  const block = data.content.find((b) => b.type === 'text')
  if (!block) throw new Error('No text content in response')
  return block.text
}

function buildMapboxUrl(lat: number, lng: number, zoom: number, pxWide: number, token: string): string {
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${zoom},0/${pxWide}x${pxWide}@2x?access_token=${token}&attribution=false&logo=false`
}

interface ParsedPlacement {
  key: string
  norm: { x: number; y: number }
  rationale: string
}

function parseModelResponse(raw: string): {
  imageryPoor: boolean
  placements: ParsedPlacement[]
} {
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  let parsed: Record<string, unknown> | null = null
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        /* ignore */
      }
    }
  }
  if (!parsed) return { imageryPoor: false, placements: [] }

  const imageryPoor = parsed.imageryPoor === true
  const placementsRaw = Array.isArray(parsed.placements) ? parsed.placements : []
  const placements: ParsedPlacement[] = []
  for (const p of placementsRaw as Array<Record<string, unknown>>) {
    if (typeof p.key !== 'string') continue
    if (typeof p.x !== 'number' || typeof p.y !== 'number') continue
    if (!isNormalizedInTile({ x: p.x, y: p.y })) continue
    placements.push({
      key: p.key,
      norm: { x: p.x, y: p.y },
      rationale: typeof p.rationale === 'string' ? p.rationale : '',
    })
  }
  return { imageryPoor, placements }
}

interface PerEntryReport {
  id: string
  label: string
  matched: number
  total: number
  score: number
  imageryPoor: boolean
  /** Sprint Corpus Authoring: 'manual' | 'heuristic' | 'placeholder'.
   *  Placeholder rows are skipped from the live scoring loop; their
   *  total/matched both stay 0 and they're surfaced separately. */
  source: 'manual' | 'heuristic' | 'placeholder'
  skipped: boolean
  /** Sprint Corpus Authoring: model's actual plan-feet placements per
   *  element key. Lets the operator review the JSON scorecard and
   *  promote heuristic→manual by accepting these coords as expected. */
  modelPlacements: Record<string, { x: number; y: number; rationale: string }>
  failures: Array<{ key: string; reason: string }>
}

interface SuiteReport {
  generatedAt: string
  /** Mean over OPERATIONAL entries only (manual + heuristic). Skipped
   *  placeholders aren't counted — otherwise a corpus that's mostly
   *  placeholders looks falsely broken. */
  meanScore: number
  entryCount: number
  /** Operational subset (geocoded + scored). Mean is over this set. */
  scoredCount: number
  /** Skipped because source === 'placeholder'. */
  skippedCount: number
  totalElements: number
  totalMatched: number
  imageryPoorCount: number
  entries: PerEntryReport[]
}

function renderMarkdown(suite: SuiteReport): string {
  const lines: string[] = []
  lines.push(`# AI Placement Scorecard`)
  lines.push('')
  lines.push(`Generated: ${suite.generatedAt}`)
  lines.push('')
  lines.push(`**Mean accuracy (operational entries only):** ${(suite.meanScore * 100).toFixed(1)}% (${suite.totalMatched}/${suite.totalElements} elements across ${suite.scoredCount} operational fixtures)`)
  lines.push('')
  lines.push(`**Threshold:** 70% — ${suite.meanScore >= 0.7 ? '✅ PASS' : '❌ BELOW'}`)
  lines.push('')
  lines.push(`Corpus: ${suite.entryCount} total, ${suite.scoredCount} scored, ${suite.skippedCount} placeholder (need authoring), ${suite.imageryPoorCount} imagery-poor`)
  lines.push('')
  lines.push('## Per-entry')
  lines.push('')
  lines.push('| ID | Label | Source | Matched | Score | Imagery |')
  lines.push('|---|---|---|---|---|---|')
  for (const e of suite.entries) {
    const status = e.skipped
      ? '_skipped_'
      : `${(e.score * 100).toFixed(0)}%`
    const imagery = e.skipped ? '—' : e.imageryPoor ? '⚠️ poor' : 'ok'
    lines.push(`| ${e.id} | ${e.label} | ${e.source} | ${e.matched}/${e.total} | ${status} | ${imagery} |`)
  }
  lines.push('')
  lines.push('## Failure detail')
  lines.push('')
  for (const e of suite.entries) {
    if (e.failures.length === 0) continue
    lines.push(`### ${e.id} — ${e.label}`)
    for (const f of e.failures) lines.push(`- \`${f.key}\`: ${f.reason}`)
    lines.push('')
  }
  return lines.join('\n')
}

test.describe('AI placement accuracy', () => {
  test('runs corpus and writes scorecard', async () => {
    test.setTimeout(15 * 60_000)
    const apiKey = getApiKey()
    const mapboxToken = getMapboxToken()
    if (!apiKey) {
      console.warn('[ai-place] No ANTHROPIC_API_KEY — skipping')
      test.skip()
      return
    }
    if (!mapboxToken) {
      console.warn('[ai-place] No MAPBOX_TOKEN — skipping')
      test.skip()
      return
    }

    const entryReports: PerEntryReport[] = []
    let imageryPoorCount = 0
    let totalElements = 0
    let totalMatched = 0

    for (const entry of CORPUS) {
      console.log(`\n[ai-place] ${entry.id}: ${entry.label}`)

      // Skip entries flagged as placeholders. They lack a real geocode
      // and would return garbage if we tried to fetch a tile. Don't
      // count toward the mean accuracy — the suite report distinguishes
      // operational entries from skipped ones.
      if (entry.source === 'placeholder') {
        console.log(`  source=placeholder — skipping (needs lat/lng + expected authoring)`)
        entryReports.push({
          id: entry.id,
          label: entry.label,
          matched: 0,
          total: entry.expected.length,
          score: 0,
          imageryPoor: false,
          source: entry.source,
          skipped: true,
          modelPlacements: {},
          failures: [],
        })
        continue
      }

      const tileUrl = buildMapboxUrl(entry.lat, entry.lng, entry.zoom, entry.tilePxWide, mapboxToken)

      let raw = ''
      let imageryPoor = false
      const failures: Array<{ key: string; reason: string }> = []
      let matched = 0

      try {
        const tile = await fetchTileBase64(tileUrl)
        const prompt = buildPlacementPrompt(entry.elements)
        raw = await callAnthropicVision(prompt, tile.base64, tile.mediaType, apiKey)
      } catch (err) {
        const msg = (err as Error).message
        console.error(`  call failed: ${msg}`)
        failures.push({ key: '*', reason: `call failed: ${msg}` })
        entryReports.push({
          id: entry.id,
          label: entry.label,
          matched: 0,
          total: entry.expected.length,
          score: 0,
          imageryPoor: false,
          source: entry.source,
          skipped: false,
          modelPlacements: {},
          failures,
        })
        continue
      }

      const { imageryPoor: poor, placements } = parseModelResponse(raw)
      imageryPoor = poor
      if (poor) imageryPoorCount += 1

      // Capture every model placement (regardless of whether it matched
      // an expected) so the scorecard JSON shows the full model output.
      // Lets the operator review + promote heuristic → manual by
      // accepting these coords as ground truth.
      const modelPlacements: Record<string, { x: number; y: number; rationale: string }> = {}
      for (const place of placements) {
        const planFt = normalizedToPlanFeet(place.norm, entry.lat, entry.zoom, entry.tilePxWide)
        modelPlacements[place.key] = {
          x: Math.round(planFt.x * 10) / 10,
          y: Math.round(planFt.y * 10) / 10,
          rationale: place.rationale,
        }
      }

      // Score each expected placement against model's returned coords.
      for (const exp of entry.expected) {
        const place = placements.find((p) => p.key === exp.key)
        if (!place) {
          failures.push({ key: exp.key, reason: 'model did not return a placement for this key' })
          continue
        }
        const planFt = normalizedToPlanFeet(place.norm, entry.lat, entry.zoom, entry.tilePxWide)
        const score = scorePlacement(planFt, exp)
        if (score === 1) {
          matched += 1
        } else {
          const dx = planFt.x - exp.expectedX
          const dy = planFt.y - exp.expectedY
          const dist = Math.sqrt(dx * dx + dy * dy)
          failures.push({
            key: exp.key,
            reason: `${dist.toFixed(0)} ft from expected (tolerance ${exp.toleranceFt} ft)`,
          })
        }
      }

      const total = entry.expected.length
      const score = total > 0 ? matched / total : poor ? 1 : 0
      totalElements += total
      totalMatched += matched

      console.log(`  matched: ${matched}/${total} | score: ${(score * 100).toFixed(0)}% | imageryPoor: ${imageryPoor}`)
      for (const f of failures) console.log(`    - ${f.key}: ${f.reason}`)

      entryReports.push({
        id: entry.id,
        label: entry.label,
        matched,
        total,
        score,
        imageryPoor,
        source: entry.source,
        skipped: false,
        modelPlacements,
        failures,
      })
    }

    const meanScore = totalElements > 0 ? totalMatched / totalElements : 0
    const scoredCount = entryReports.filter((r) => !r.skipped).length
    const skippedCount = entryReports.filter((r) => r.skipped).length
    const suite: SuiteReport = {
      generatedAt: new Date().toISOString(),
      meanScore,
      entryCount: CORPUS.length,
      scoredCount,
      skippedCount,
      totalElements,
      totalMatched,
      imageryPoorCount,
      entries: entryReports,
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const jsonPath = path.join(OUTPUT_DIR, `placement-scorecard-${stamp}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(suite, null, 2))

    const mdPath = path.join(OUTPUT_DIR, 'AI_PLACE_SCORECARD.md')
    fs.writeFileSync(mdPath, renderMarkdown(suite))

    console.log('\n[ai-place] Suite summary:')
    console.log(`  total entries:  ${suite.entryCount}`)
    console.log(`  scored:         ${suite.scoredCount} (operational)`)
    console.log(`  skipped:        ${suite.skippedCount} (placeholder — needs authoring)`)
    console.log(`  mean score:     ${(suite.meanScore * 100).toFixed(1)}% (across scored entries)`)
    console.log(`  matched:        ${suite.totalMatched}/${suite.totalElements}`)
    console.log(`  imagery poor:   ${suite.imageryPoorCount}`)
    console.log(`  scorecard JSON: ${jsonPath}`)
    console.log(`  scorecard MD:   ${mdPath}`)
  })
})
