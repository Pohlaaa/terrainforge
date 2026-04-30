import { describe, it, expect } from 'vitest'
import { nudgeOverlaps, type ElementBox } from './elementOverlap'

function aabbsOverlap(a: ElementBox, b: ElementBox, margin = 0): boolean {
  return (
    a.x < b.x + b.w + margin &&
    a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin &&
    a.y + a.h + margin > b.y
  )
}

describe('nudgeOverlaps', () => {
  it('leaves non-overlapping inputs unchanged', () => {
    const input: ElementBox[] = [
      { key: 'a', x: 0, y: 0, w: 10, h: 10 },
      { key: 'b', x: 30, y: 0, w: 10, h: 10 },
    ]
    const r = nudgeOverlaps(input)
    expect(r.changed).toBe(false)
    expect(r.positions.size).toBe(0)
  })

  it('separates two boxes on top of each other', () => {
    const input: ElementBox[] = [
      { key: 'patio', x: 0, y: 0, w: 16, h: 12 },
      { key: 'patio2', x: 0, y: 0, w: 16, h: 12 },
    ]
    const r = nudgeOverlaps(input)
    expect(r.changed).toBe(true)
    expect(r.positions.has('patio2')).toBe(true)
    // 'patio' should not have moved
    expect(r.positions.has('patio')).toBe(false)
  })

  it('keeps anchor element fixed (first wins)', () => {
    const input: ElementBox[] = [
      { key: 'first', x: 5, y: 5, w: 10, h: 10 },
      { key: 'second', x: 6, y: 6, w: 10, h: 10 },
    ]
    const r = nudgeOverlaps(input)
    expect(r.positions.has('first')).toBe(false)
    expect(r.positions.has('second')).toBe(true)
  })

  it('produces non-overlapping AABBs after nudging (chain of 4)', () => {
    const input: ElementBox[] = [
      { key: 'a', x: 0, y: 0, w: 10, h: 10 },
      { key: 'b', x: 0, y: 0, w: 10, h: 10 },
      { key: 'c', x: 0, y: 0, w: 10, h: 10 },
      { key: 'd', x: 0, y: 0, w: 10, h: 10 },
    ]
    const r = nudgeOverlaps(input)

    // Apply nudges to a working copy.
    const final = input.map((box) => {
      const moved = r.positions.get(box.key)
      return moved ? { ...box, x: moved.x, y: moved.y } : box
    })

    for (let i = 0; i < final.length; i++) {
      for (let j = i + 1; j < final.length; j++) {
        expect(aabbsOverlap(final[i], final[j], 0)).toBe(false)
      }
    }
  })

  it('chooses minimum-displacement axis', () => {
    // 'b' overlaps the right edge of 'a' by 1 ft horizontally and
    // overlaps the bottom by 5 ft vertically. Minimum-axis push is
    // horizontal (right) by 1 ft + margin.
    const input: ElementBox[] = [
      { key: 'a', x: 0, y: 0, w: 10, h: 10 },
      { key: 'b', x: 9, y: 5, w: 10, h: 10 },
    ]
    const r = nudgeOverlaps(input)
    const newPos = r.positions.get('b')!
    expect(newPos).toBeDefined()
    // Should have moved right (x increased), not down (y unchanged from 5).
    expect(newPos.x).toBeGreaterThan(9)
    expect(newPos.y).toBe(5)
  })

  it('terminates within iteration cap on stacked input', () => {
    const input: ElementBox[] = Array.from({ length: 5 }, (_, i) => ({
      key: `e${i}`,
      x: 0,
      y: 0,
      w: 10,
      h: 10,
    }))
    const r = nudgeOverlaps(input)
    expect(r.iterations).toBeLessThanOrEqual(20)
    expect(r.changed).toBe(true)
  })

  it('does not mutate input', () => {
    const input: ElementBox[] = [
      { key: 'a', x: 0, y: 0, w: 10, h: 10 },
      { key: 'b', x: 0, y: 0, w: 10, h: 10 },
    ]
    const snapshot = JSON.stringify(input)
    nudgeOverlaps(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})
