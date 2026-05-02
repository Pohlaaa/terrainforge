import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock supabase BEFORE importing aiPlacement so the proxy-claude call
// doesn't try to hit the real network. We only test the parse +
// validation + coord-mapping logic here; the corpus harness exercises
// real network round-trips.
vi.mock('@/services/anthropic', () => ({
  callClaudeWithVision: vi.fn(),
  DEFAULT_MODEL: 'claude-haiku-4-5-20251001',
}))

import { callClaudeWithVision } from '@/services/anthropic'
import {
  buildPlacementPrompt,
  inferElementPlacements,
  type ElementToPlace,
  type PlacementContext,
} from './aiPlacement'

const mockCall = callClaudeWithVision as unknown as ReturnType<typeof vi.fn>

const ASHEVILLE_CTX = {
  tileImageUrl: 'https://api.mapbox.com/...token',
  lat: 35.59,
  lng: -82.51,
  zoom: 19,
  tilePxWide: 1200,
} as const

const PATIO_AND_EDGING: ElementToPlace[] = [
  {
    key: 'patio-1',
    elementType: 'patio',
    name: 'Paver Patio',
    lengthFt: 16,
    widthFt: 12,
    linearFt: null,
  },
  {
    key: 'edging-1',
    elementType: 'edging',
    name: 'Garden Bed Edging',
    lengthFt: null,
    widthFt: null,
    linearFt: 60,
  },
]

function ctx(elements: ElementToPlace[] = PATIO_AND_EDGING): PlacementContext {
  return { ...ASHEVILLE_CTX, elements }
}

beforeEach(() => {
  mockCall.mockReset()
})
afterEach(() => {
  mockCall.mockReset()
})

describe('buildPlacementPrompt', () => {
  it('embeds element metadata in a numbered list', () => {
    const p = buildPlacementPrompt(PATIO_AND_EDGING)
    expect(p).toMatch(/key="patio-1" type=patio/)
    expect(p).toMatch(/key="edging-1" type=edging/)
    expect(p).toMatch(/16x12 ft/)
    expect(p).toMatch(/60 LF/)
  })

  it('omits dim parens when no dimensions known', () => {
    const p = buildPlacementPrompt([
      {
        key: 'mystery',
        elementType: 'patio',
        name: 'Mystery patio',
        lengthFt: null,
        widthFt: null,
        linearFt: null,
      },
    ])
    expect(p).toMatch(/key="mystery" type=patio name="Mystery patio"\n/)
    expect(p).not.toMatch(/key="mystery".*\(.*ft\)/)
  })

  it('includes the normalized-coords schema rules + obstacle list', () => {
    const p = buildPlacementPrompt(PATIO_AND_EDGING)
    expect(p).toMatch(/Building rooftops/)
    expect(p).toMatch(/Roads, streets, asphalt parking lots/)
    expect(p).toMatch(/Pools/)
    expect(p).toMatch(/imageryPoor/)
  })

  it('explicitly tells the model that (x, y) is the element CENTER', () => {
    // F-PLAC-03 defense in depth: the wizard converts AI center → top-left,
    // but the model interpretation needs to match. Without this guidance
    // the model could plausibly return a top-left corner. Make it
    // unambiguous in the prompt.
    const p = buildPlacementPrompt(PATIO_AND_EDGING)
    expect(p).toMatch(/CENTER/)
    expect(p).toMatch(/NOT a corner/)
  })

  it('asks for rotationDeg per element with the long-axis convention', () => {
    // F-PLAC-rotation: model should return a rotation per element so
    // long edging strips orient along property edges instead of always
    // east-west. Default 0 = long axis runs east-west.
    const p = buildPlacementPrompt(PATIO_AND_EDGING)
    expect(p).toMatch(/rotationDeg/)
    expect(p).toMatch(/long axis/)
    expect(p).toMatch(/0°/)
  })
})

describe('inferElementPlacements / happy path', () => {
  it('returns placements mapped to plan-feet for valid responses', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        imageryPoor: false,
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.7, rationale: 'Backyard, away from house.' },
          { key: 'edging-1', x: 0.4, y: 0.65, rationale: 'Around the bed.' },
        ],
        reasoning: 'House is upper-left; backyard runs south.',
      }),
    )

    const result = await inferElementPlacements(ctx())

    expect(result.placements.size).toBe(2)
    const patio = result.placements.get('patio-1')!
    expect(patio).toBeDefined()
    expect(patio.rationale).toBe('Backyard, away from house.')
    // y=0.7 is below center (south) → plan-y > 0
    expect(patio.position.y).toBeGreaterThan(0)
    // x=0.5 is dead center → plan-x ≈ 0
    expect(Math.abs(patio.position.x)).toBeLessThan(1)
    expect(result.imageryPoor).toBe(false)
  })

  it('parses + validates buildableArea + obstacles polygons', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        imageryPoor: false,
        buildableArea: [
          { x: 0.2, y: 0.5 },
          { x: 0.8, y: 0.5 },
          { x: 0.8, y: 0.9 },
          { x: 0.2, y: 0.9 },
        ],
        obstacles: [
          {
            label: 'house',
            polygon: [
              { x: 0.3, y: 0.1 },
              { x: 0.7, y: 0.1 },
              { x: 0.7, y: 0.4 },
              { x: 0.3, y: 0.4 },
            ],
          },
        ],
        placements: [],
      }),
    )

    const result = await inferElementPlacements(ctx())
    expect(result.buildableArea).toHaveLength(4)
    expect(result.obstacles).toHaveLength(1)
    expect(result.obstacles[0]).toHaveLength(4)
  })
})

describe('inferElementPlacements / error + sanitization paths', () => {
  it('returns empty on network failure', async () => {
    mockCall.mockRejectedValue(new Error('proxy 500'))
    const result = await inferElementPlacements(ctx())
    expect(result.placements.size).toBe(0)
    expect(result.imageryPoor).toBe(false)
  })

  it('returns empty on unparseable response', async () => {
    mockCall.mockResolvedValue('completely not JSON at all')
    const result = await inferElementPlacements(ctx())
    expect(result.placements.size).toBe(0)
  })

  it('strips markdown code fences before parsing', async () => {
    mockCall.mockResolvedValue(
      '```json\n' +
        JSON.stringify({
          placements: [
            { key: 'patio-1', x: 0.5, y: 0.5, rationale: 'Center.' },
          ],
        }) +
        '\n```',
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.size).toBe(1)
  })

  it('falls back to first JSON-block recovery when leading prose is present', async () => {
    mockCall.mockResolvedValue(
      'Sure — here you go:\n' +
        JSON.stringify({
          placements: [
            { key: 'patio-1', x: 0.5, y: 0.5, rationale: 'Center.' },
          ],
        }) +
        '\nHope that helps!',
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.size).toBe(1)
  })

  it('rejects placements with coords outside [0,1]', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [
          { key: 'patio-1', x: 1.5, y: 0.5, rationale: '' },
          { key: 'edging-1', x: -0.2, y: 0.3, rationale: '' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.size).toBe(0)
  })

  it('rejects placements for unknown keys (hallucinated elements)', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.5, rationale: 'OK' },
          { key: 'made-up-element', x: 0.7, y: 0.7, rationale: 'BAD' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.size).toBe(1)
    expect(result.placements.has('patio-1')).toBe(true)
    expect(result.placements.has('made-up-element')).toBe(false)
  })

  it('rejects placements with non-number coords', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [{ key: 'patio-1', x: 'left', y: 'middle', rationale: '' }],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.size).toBe(0)
  })

  it('drops invalid polygons silently (keeps others)', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        obstacles: [
          {
            label: 'good',
            polygon: [
              { x: 0.1, y: 0.1 },
              { x: 0.2, y: 0.1 },
              { x: 0.15, y: 0.2 },
            ],
          },
          {
            label: 'too-few-points',
            polygon: [{ x: 0.5, y: 0.5 }],
          },
          {
            label: 'out-of-tile',
            polygon: [
              { x: 1.5, y: 0.5 },
              { x: 1.6, y: 0.5 },
              { x: 1.6, y: 0.6 },
            ],
          },
        ],
        placements: [],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.obstacles).toHaveLength(1)
  })

  it('honors imageryPoor flag', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        imageryPoor: true,
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.5, rationale: 'Image too poor' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.imageryPoor).toBe(true)
  })

  it('returns empty PlacementCallResult when elements list is empty', async () => {
    const result = await inferElementPlacements({
      ...ASHEVILLE_CTX,
      elements: [],
    })
    expect(result.placements.size).toBe(0)
    expect(mockCall).not.toHaveBeenCalled()
  })
})

describe('inferElementPlacements / rotation', () => {
  it('parses a valid rotationDeg, snaps to 15°', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.5, rotationDeg: 47, rationale: '' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.get('patio-1')!.rotationDeg).toBe(45)
  })

  it('defaults rotationDeg to 0 when missing', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.5, rationale: '' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.get('patio-1')!.rotationDeg).toBe(0)
  })

  it('defaults rotationDeg to 0 when non-finite', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.5, rotationDeg: 'horizontal', rationale: '' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.get('patio-1')!.rotationDeg).toBe(0)
  })

  it('normalizes rotationDeg outside [-180, 180] before snapping', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.5, rotationDeg: 270, rationale: '' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    // 270 → -90 after normalize; already on a 15° boundary
    expect(result.placements.get('patio-1')!.rotationDeg).toBe(-90)
  })

  it('preserves negative rotation values', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [
          { key: 'patio-1', x: 0.5, y: 0.5, rotationDeg: -45, rationale: '' },
        ],
      }),
    )
    const result = await inferElementPlacements(ctx())
    expect(result.placements.get('patio-1')!.rotationDeg).toBe(-45)
  })
})

describe('inferElementPlacements / coordinate fidelity', () => {
  it('center placement maps to plan-feet (0, 0)', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [{ key: 'patio-1', x: 0.5, y: 0.5, rationale: '' }],
      }),
    )
    const result = await inferElementPlacements(ctx())
    const patio = result.placements.get('patio-1')!
    expect(patio.position.x).toBeCloseTo(0, 3)
    expect(patio.position.y).toBeCloseTo(0, 3)
  })

  it('top-left placement maps to negative x and negative y', async () => {
    mockCall.mockResolvedValue(
      JSON.stringify({
        placements: [{ key: 'patio-1', x: 0, y: 0, rationale: 'NW corner' }],
      }),
    )
    const result = await inferElementPlacements(ctx())
    const patio = result.placements.get('patio-1')!
    expect(patio.position.x).toBeLessThan(0)
    expect(patio.position.y).toBeLessThan(0)
    // Must be roughly the half-footprint at this lat
    expect(Math.abs(patio.position.x)).toBeGreaterThan(400)
    expect(Math.abs(patio.position.x)).toBeLessThan(500)
  })
})
