import { describe, it, expect } from 'vitest'
import { pointInPolygon, polygonAABB } from './polygonGeom'

const SQUARE_10 = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
]

const TRIANGLE = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 5, y: 10 },
]

const CONCAVE_L = [
  // L-shape
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 4 },
  { x: 4, y: 4 },
  { x: 4, y: 10 },
  { x: 0, y: 10 },
]

describe('pointInPolygon / convex shapes', () => {
  it('returns true for a point clearly inside a square', () => {
    expect(pointInPolygon(5, 5, SQUARE_10)).toBe(true)
  })

  it('returns false for points outside a square', () => {
    expect(pointInPolygon(-1, 5, SQUARE_10)).toBe(false)
    expect(pointInPolygon(5, -1, SQUARE_10)).toBe(false)
    expect(pointInPolygon(11, 5, SQUARE_10)).toBe(false)
    expect(pointInPolygon(5, 11, SQUARE_10)).toBe(false)
  })

  it('handles points strictly inside a triangle', () => {
    expect(pointInPolygon(5, 1, TRIANGLE)).toBe(true)
    expect(pointInPolygon(5, 9, TRIANGLE)).toBe(true) // narrow but inside
    expect(pointInPolygon(0, 9, TRIANGLE)).toBe(false) // left of apex slope
    expect(pointInPolygon(5, 11, TRIANGLE)).toBe(false) // above peak
  })
})

describe('pointInPolygon / concave shapes', () => {
  // L-shape: "inside" only in the L's arm
  it('point in the L arm is inside', () => {
    expect(pointInPolygon(2, 2, CONCAVE_L)).toBe(true)
    expect(pointInPolygon(2, 8, CONCAVE_L)).toBe(true)
  })

  it('point in the L notch is OUTSIDE', () => {
    // (7, 7) is in the cut-out corner — outside the L
    expect(pointInPolygon(7, 7, CONCAVE_L)).toBe(false)
  })
})

describe('pointInPolygon / degenerate inputs', () => {
  it('returns false for fewer than 3 points', () => {
    expect(pointInPolygon(0, 0, [])).toBe(false)
    expect(pointInPolygon(0, 0, [{ x: 0, y: 0 }])).toBe(false)
    expect(pointInPolygon(0, 0, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false)
  })
})

describe('pointInPolygon / orientation independence', () => {
  it('works the same with reversed winding', () => {
    const ccw = SQUARE_10
    const cw = [...SQUARE_10].reverse()
    for (const [x, y] of [
      [5, 5],
      [-5, 0],
      [11, 11],
      [3, 9],
    ]) {
      expect(pointInPolygon(x, y, ccw)).toBe(pointInPolygon(x, y, cw))
    }
  })
})

describe('polygonAABB', () => {
  it('computes a tight bounding box', () => {
    expect(polygonAABB(SQUARE_10)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 10,
      maxY: 10,
    })
  })

  it('handles negative coords', () => {
    expect(
      polygonAABB([
        { x: -10, y: -5 },
        { x: 5, y: 0 },
        { x: 0, y: 8 },
      ]),
    ).toEqual({ minX: -10, minY: -5, maxX: 5, maxY: 8 })
  })

  it('returns null for empty input', () => {
    expect(polygonAABB([])).toBeNull()
  })
})
