import { test } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { CORPUS } from './corpus'
import { buildPlacementPrompt } from '../../src/services/aiPlacement'
import { isNormalizedInTile } from '../../src/lib/mapTileMath'

/**
 * AI placement PROBE — single-entry, dump-only, no scoring.
 *
 * Use this for prompt iteration. Costs ~$0.05 per run vs the full
 * corpus's ~$0.75. Picks one entry (default: 01-suburban-asheville,
 * the only entry with real lat/lng pre-authored), runs the prompt
 * + vision call, dumps the parsed response to stdout + writes a
 * markdown report to `.claude/TESTING/AI_PLACE_PROBE.md`.
 *
 * Flow when iterating the prompt:
 *   1. edit `buildPlacementPrompt` in src/services/aiPlacement.ts
 *   2. `npm run placement:probe`            (runs default fixture)
 *   3. or `PLACEMENT_PROBE_ID=06-heavily-treed npm run placement:probe`
 *   4. eyeball the dumped JSON; iterate
 *
 * Skips automatically when ANTHROPIC_API_KEY or MAPBOX_TOKEN is
 * unset (same convention as the scoring harness).
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

interface ParsedProbe {
  imageryPoor: boolean
  buildableArea: Array<{ x: number; y: number }> | null
  obstacles: Array<{ label: string; vertices: number; allInTile: boolean }>
  placements: Array<{ key: string; x: number; y: number; rationale: string; inTile: boolean }>
  reasoning: string
}

function safeParse(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try { return JSON.parse(cleaned) as Record<string, unknown> } catch { /* fall through */ }
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try { return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown> } catch { return null }
}

function digestResponse(raw: string): ParsedProbe {
  const parsed = safeParse(raw) ?? {}
  const placementsRaw = Array.isArray(parsed.placements) ? parsed.placements : []
  const obstaclesRaw = Array.isArray(parsed.obstacles) ? parsed.obstacles : []
  const buildableAreaRaw = Array.isArray(parsed.buildableArea) ? parsed.buildableArea : null

  const placements = (placementsRaw as Array<Record<string, unknown>>).map((p) => ({
    key: typeof p.key === 'string' ? p.key : '?',
    x: typeof p.x === 'number' ? p.x : NaN,
    y: typeof p.y === 'number' ? p.y : NaN,
    rationale: typeof p.rationale === 'string' ? p.rationale : '',
    inTile:
      typeof p.x === 'number' && typeof p.y === 'number' && isNormalizedInTile({ x: p.x, y: p.y }),
  }))

  const obstacles = (obstaclesRaw as Array<Record<string, unknown>>).map((o) => {
    const poly = Array.isArray(o.polygon) ? (o.polygon as Array<Record<string, unknown>>) : []
    return {
      label: typeof o.label === 'string' ? o.label : 'unlabeled',
      vertices: poly.length,
      allInTile: poly.every((p) =>
        typeof p.x === 'number' && typeof p.y === 'number' && isNormalizedInTile({ x: p.x, y: p.y }),
      ),
    }
  })

  const buildableArea = buildableAreaRaw
    ? (buildableAreaRaw as Array<Record<string, unknown>>)
        .filter((p) => typeof p.x === 'number' && typeof p.y === 'number')
        .map((p) => ({ x: p.x as number, y: p.y as number }))
    : null

  return {
    imageryPoor: parsed.imageryPoor === true,
    buildableArea,
    obstacles,
    placements,
    reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
  }
}

function renderProbeMarkdown(args: {
  entryId: string
  entryLabel: string
  address: string
  promptCharCount: number
  responseCharCount: number
  digest: ParsedProbe
  rawResponse: string
}): string {
  const { entryId, entryLabel, address, promptCharCount, responseCharCount, digest, rawResponse } = args
  const lines: string[] = [
    `# AI Placement Probe — ${entryId}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Fixture:** ${entryLabel}`,
    `**Address:** ${address}`,
    `**Prompt size:** ${promptCharCount} chars  •  **Response size:** ${responseCharCount} chars`,
    '',
    '## Soft sanity checks',
    '',
    `- imageryPoor: \`${digest.imageryPoor}\``,
    `- buildableArea: ${digest.buildableArea ? `${digest.buildableArea.length} vertices` : '*missing*'}`,
    `- obstacles returned: ${digest.obstacles.length}`,
    `- placements returned: ${digest.placements.length}`,
    `- placements in tile [0,1]: ${digest.placements.filter((p) => p.inTile).length}/${digest.placements.length}`,
    `- obstacles fully in tile: ${digest.obstacles.filter((o) => o.allInTile).length}/${digest.obstacles.length}`,
    '',
    '## Placements',
    '',
    '| key | (x, y) | in tile | rationale |',
    '|---|---|---|---|',
    ...digest.placements.map(
      (p) =>
        `| \`${p.key}\` | (${p.x.toFixed(3)}, ${p.y.toFixed(3)}) | ${p.inTile ? '✅' : '❌'} | ${p.rationale.replace(/\|/g, '\\|') || '*none*'} |`,
    ),
    '',
    '## Obstacles',
    '',
    digest.obstacles.length === 0 ? '*none*' : '| label | vertices | all in tile |\n|---|---|---|',
    ...digest.obstacles.map(
      (o) => `| ${o.label.replace(/\|/g, '\\|')} | ${o.vertices} | ${o.allInTile ? '✅' : '❌'} |`,
    ),
    '',
    '## Reasoning (verbatim from model)',
    '',
    digest.reasoning ? `> ${digest.reasoning.replace(/\n/g, '\n> ')}` : '*none returned*',
    '',
    '## Raw model response',
    '',
    '```json',
    rawResponse,
    '```',
  ]
  return lines.join('\n')
}

test.describe('AI placement probe', () => {
  test('runs one fixture and dumps the response', async () => {
    test.setTimeout(120_000)

    const apiKey = getApiKey()
    const mapboxToken = getMapboxToken()
    if (!apiKey || !mapboxToken) {
      console.warn('[probe] Missing ANTHROPIC_API_KEY or MAPBOX_TOKEN — skipping')
      test.skip()
      return
    }

    const targetId = process.env.PLACEMENT_PROBE_ID || '01-suburban-asheville'
    const entry = CORPUS.find((e) => e.id === targetId)
    if (!entry) {
      throw new Error(`Probe target "${targetId}" not in corpus. Available ids: ${CORPUS.map((e) => e.id).join(', ')}`)
    }
    if (entry.lat === 0 && entry.lng === 0) {
      throw new Error(`Probe target "${targetId}" has placeholder lat/lng (lat=0,lng=0). Pick a fixture with real coords or author this one first.`)
    }

    console.log(`[probe] ${entry.id}: ${entry.label}`)
    console.log(`[probe] address=${entry.address}`)
    console.log(`[probe] tile=${entry.lat},${entry.lng} z=${entry.zoom} px=${entry.tilePxWide}`)

    const prompt = buildPlacementPrompt(entry.elements)
    const tileUrl = buildMapboxUrl(entry.lat, entry.lng, entry.zoom, entry.tilePxWide, mapboxToken)
    const tile = await fetchTileBase64(tileUrl)
    console.log(`[probe] tile fetched (${tile.mediaType}, ${tile.base64.length} b64 chars)`)

    const t0 = Date.now()
    const raw = await callAnthropicVision(prompt, tile.base64, tile.mediaType, apiKey)
    const ms = Date.now() - t0
    console.log(`[probe] vision call returned in ${ms} ms (${raw.length} chars)`)

    const digest = digestResponse(raw)

    console.log(`\n[probe] DIGEST:`)
    console.log(`  imageryPoor:  ${digest.imageryPoor}`)
    console.log(`  buildable:    ${digest.buildableArea ? `${digest.buildableArea.length} vertices` : 'missing'}`)
    console.log(`  obstacles:    ${digest.obstacles.length}`)
    console.log(`  placements:   ${digest.placements.length}`)
    console.log(`  in-tile coords: ${digest.placements.filter((p) => p.inTile).length}/${digest.placements.length}`)
    for (const p of digest.placements) {
      console.log(`    ${p.key}  (${p.x.toFixed(3)}, ${p.y.toFixed(3)})  ${p.inTile ? '✓' : '✗'}  — ${p.rationale.slice(0, 80)}`)
    }
    if (digest.reasoning) console.log(`\n  reasoning: ${digest.reasoning.slice(0, 240)}`)

    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    const md = renderProbeMarkdown({
      entryId: entry.id,
      entryLabel: entry.label,
      address: entry.address,
      promptCharCount: prompt.length,
      responseCharCount: raw.length,
      digest,
      rawResponse: raw,
    })
    const mdPath = path.join(OUTPUT_DIR, 'AI_PLACE_PROBE.md')
    fs.writeFileSync(mdPath, md)
    console.log(`\n[probe] wrote ${mdPath}`)
  })
})
