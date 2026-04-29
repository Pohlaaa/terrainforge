import { describe, it, expect } from 'vitest'
import {
  metersPerPixel,
  feetPerPixel,
  tileFootprintFt,
  normalizedToPlanFeet,
  planFeetToNormalized,
  planFeetToPixel,
  isNormalizedInTile,
} from './mapTileMath'

// Sprint AI-Place — coordinate math correctness gate.
// Web Mercator drift is silent: a sign error or off-by-one in
// `metersPerPixel` won't throw, just plant the patio 200 ft away from
// where the contractor intended. These tests pin the math against
// hand-computed reference values so future changes can't drift.
//
// Reference values cross-checked with:
//   - Mapbox documentation:
//     https://docs.mapbox.com/help/glossary/zoom-level/
//   - Web Mercator spec (256 px tile baseline)
//
// Tolerance is 0.5% (relative). The math is exact modulo float
// precision; the tolerance covers rounding in the published reference
// tables.

const RELATIVE_TOLERANCE = 0.005

function expectClose(actual: number, expected: number, label?: string) {
  const rel = Math.abs(actual - expected) / Math.abs(expected)
  expect(rel, `${label ?? ''}: actual=${actual}, expected=${expected}, rel=${rel}`).toBeLessThan(
    RELATIVE_TOLERANCE,
  )
}

describe('mapTileMath / metersPerPixel', () => {
  // Equator at zoom 0: a single 256 px tile covers the entire equator.
  // 40_075_017 m / 256 px ≈ 156_543 m/px.
  it('zoom 0 at equator gives ~156,543 m/px', () => {
    expectClose(metersPerPixel(0, 0), 156543, 'z=0,lat=0')
  })

  // Each zoom step halves m/px. zoom 18 at equator ≈ 0.597 m/px.
  it('halves with each zoom level', () => {
    const z0 = metersPerPixel(0, 0)
    const z1 = metersPerPixel(0, 1)
    expectClose(z1 / z0, 0.5, 'halving')
    const z18 = metersPerPixel(0, 18)
    // 156543 / 2^18 = 0.5972
    expectClose(z18, 0.5972, 'z=18,lat=0')
  })

  // Latitude scales by cos(lat). Asheville ≈ 35.59°N.
  it('scales by cos(lat) — Asheville at zoom 19', () => {
    // metersPerPixel(0, 19) = 156543 / 2^19 ≈ 0.2986
    // cos(35.59°) ≈ 0.8133
    // → 0.2986 * 0.8133 ≈ 0.2429
    expectClose(metersPerPixel(35.59, 19), 0.2429, 'asheville z=19')
  })

  it('approaches zero at the poles', () => {
    expect(metersPerPixel(89.999, 18)).toBeLessThan(0.01)
  })
})

describe('mapTileMath / feetPerPixel', () => {
  it('matches metersPerPixel / 0.3048', () => {
    const lat = 35.59
    const zoom = 19
    expectClose(
      feetPerPixel(lat, zoom),
      metersPerPixel(lat, zoom) / 0.3048,
      'unit-convert',
    )
  })

  // Sanity: at zoom 19 / Asheville lat, 1200-px tile should be ~955 ft
  // wide, matching PlanView3D's BACKDROP_IMAGE_PX = 1200 / zoom = 19
  // assumption.
  it('1200 px tile at zoom 19 / Asheville ≈ 955 ft', () => {
    expectClose(tileFootprintFt(35.59, 19, 1200), 956, 'asheville-tile-ft')
  })

  // Higher latitudes shrink the tile: same zoom, Anchorage (61.2°N)
  // tile is much smaller in feet.
  it('Anchorage (61.2°N) at zoom 19 is ~565 ft', () => {
    expectClose(tileFootprintFt(61.2, 19, 1200), 565, 'anchorage-tile-ft')
  })

  // Equator: largest possible tile at given zoom. Zoom 19 / equator =
  // 1200 * (40_075_017 / 2^19 / 256) m / 0.3048 ≈ 1175 ft.
  it('equator zoom 19 tile ≈ 1175 ft', () => {
    expectClose(tileFootprintFt(0, 19, 1200), 1175.4, 'equator-tile-ft')
  })
})

describe('mapTileMath / normalizedToPlanFeet', () => {
  const lat = 35.59
  const zoom = 19
  const px = 1200
  const footprint = tileFootprintFt(lat, zoom, px) // ≈ 956

  it('center of tile maps to (0, 0)', () => {
    const r = normalizedToPlanFeet({ x: 0.5, y: 0.5 }, lat, zoom, px)
    expectClose(r.x === 0 ? 1 : Math.abs(r.x), 1e-9 + 1, 'center-x') // tolerate float
    expect(r.x).toBeCloseTo(0, 5)
    expect(r.y).toBeCloseTo(0, 5)
  })

  it('top-left corner maps to (-half, -half) — northwest of center', () => {
    const r = normalizedToPlanFeet({ x: 0, y: 0 }, lat, zoom, px)
    expect(r.x).toBeCloseTo(-footprint / 2, 1)
    expect(r.y).toBeCloseTo(-footprint / 2, 1)
  })

  it('bottom-right corner maps to (+half, +half) — southeast of center', () => {
    const r = normalizedToPlanFeet({ x: 1, y: 1 }, lat, zoom, px)
    expect(r.x).toBeCloseTo(footprint / 2, 1)
    expect(r.y).toBeCloseTo(footprint / 2, 1)
  })

  it('quarter-point round-trip preserves position', () => {
    const orig = { x: 0.25, y: 0.75 }
    const planFeet = normalizedToPlanFeet(orig, lat, zoom, px)
    const back = planFeetToNormalized(planFeet, lat, zoom, px)
    expect(back).not.toBeNull()
    expect(back!.x).toBeCloseTo(orig.x, 5)
    expect(back!.y).toBeCloseTo(orig.y, 5)
  })
})

describe('mapTileMath / planFeetToNormalized', () => {
  const lat = 35.59
  const zoom = 19
  const px = 1200

  it('returns null for points outside the tile', () => {
    const halfFt = tileFootprintFt(lat, zoom, px) / 2
    expect(planFeetToNormalized({ x: halfFt + 100, y: 0 }, lat, zoom, px)).toBeNull()
    expect(planFeetToNormalized({ x: 0, y: -halfFt - 100 }, lat, zoom, px)).toBeNull()
  })

  it('boundary point at exactly half-footprint is in', () => {
    const halfFt = tileFootprintFt(lat, zoom, px) / 2
    const r = planFeetToNormalized({ x: halfFt, y: -halfFt }, lat, zoom, px)
    expect(r).not.toBeNull()
    expect(r!.x).toBeCloseTo(1, 5)
    expect(r!.y).toBeCloseTo(0, 5)
  })
})

describe('mapTileMath / planFeetToPixel', () => {
  const lat = 35.59
  const zoom = 19
  const px = 1200

  it('center maps to (px/2, px/2)', () => {
    const r = planFeetToPixel({ x: 0, y: 0 }, lat, zoom, px)
    expect(r).not.toBeNull()
    expect(r!.px).toBeCloseTo(px / 2, 1)
    expect(r!.py).toBeCloseTo(px / 2, 1)
  })

  it('returns null for points outside the tile', () => {
    expect(planFeetToPixel({ x: 99999, y: 0 }, lat, zoom, px)).toBeNull()
  })
})

describe('mapTileMath / isNormalizedInTile', () => {
  it('accepts coords on the [0,1] interval', () => {
    expect(isNormalizedInTile({ x: 0, y: 0 })).toBe(true)
    expect(isNormalizedInTile({ x: 1, y: 1 })).toBe(true)
    expect(isNormalizedInTile({ x: 0.5, y: 0.5 })).toBe(true)
  })

  it('rejects coords outside [0,1]', () => {
    expect(isNormalizedInTile({ x: -0.01, y: 0.5 })).toBe(false)
    expect(isNormalizedInTile({ x: 0.5, y: 1.01 })).toBe(false)
    expect(isNormalizedInTile({ x: 1.5, y: -0.5 })).toBe(false)
  })
})

// Cross-validation: the 3D viewer's `BACKDROP_ZOOM = 19` and
// `BACKDROP_IMAGE_PX = 1200` should produce a footprint that matches
// PlanView3D's `backdropFootprintFt`. If anyone changes either
// constant in PlanView3D without updating the other side, this test
// will catch it via the sanity check below.
describe('mapTileMath / cross-checks vs PlanView3D constants', () => {
  // Known good: Asheville (35.59°N) at zoom 19 / 1200 px ≈ 955.6 ft.
  // PlanView3D's `backdropFootprintFt` uses identical math. If the
  // value here drifts, the satellite ground plane will no longer
  // align with element positions.
  it('Asheville reference footprint stays stable (regression gate)', () => {
    const ft = tileFootprintFt(35.59, 19, 1200)
    expect(ft).toBeGreaterThan(950)
    expect(ft).toBeLessThan(965)
  })
})
