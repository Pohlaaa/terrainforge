import { describe, it, expect } from 'vitest'
import { scaleAIQuantityForDimensions } from './scaleAIQuantity'

describe('scaleAIQuantityForDimensions / area units', () => {
  // jbluhm-V6 reference scenario: contractor sets 100sqft work zone,
  // AI suggests 1yd dirt. Contractor changes to 500sqft. Should
  // display ~5yd, not 1yd.
  it("scales mulch yards proportionally to area changes", () => {
    const rec = { estimatedQuantity: 1, unit: 'yd' }
    expect(
      scaleAIQuantityForDimensions(rec, 500, 0, 100, 0),
    ).toBe(5)
  })

  it("treats unknown units as area-scaled", () => {
    // All non-linear units scale by area. The unit string is just a
    // label; what matters is whether `LINEAR_UNITS` contains it.
    for (const unit of ['sqft', 'cuyd', 'yard', 'tons', 'each', 'bag']) {
      const rec = { estimatedQuantity: 1, unit }
      expect(
        scaleAIQuantityForDimensions(rec, 500, 0, 100, 0),
        `unit ${unit}`,
      ).toBe(5)
    }
  })

  it('downscales when current area < baseline', () => {
    const rec = { estimatedQuantity: 10, unit: 'cuyd' }
    expect(
      scaleAIQuantityForDimensions(rec, 50, 0, 100, 0),
    ).toBe(5)
  })
})

describe('scaleAIQuantityForDimensions / linear units', () => {
  it("scales LF qty by linearFt change", () => {
    const rec = { estimatedQuantity: 30, unit: 'LF' }
    expect(
      scaleAIQuantityForDimensions(rec, 0, 60, 0, 30),
    ).toBe(60)
  })

  it("recognizes alternate linear unit spellings", () => {
    for (const unit of ['LF', 'lf', 'linear ft', 'linearft', 'ft', 'feet']) {
      const rec = { estimatedQuantity: 30, unit }
      expect(
        scaleAIQuantityForDimensions(rec, 0, 60, 0, 30),
        `unit ${unit}`,
      ).toBe(60)
    }
  })
})

describe('scaleAIQuantityForDimensions / degrade gracefully', () => {
  it('returns original qty when baseline is zero', () => {
    const rec = { estimatedQuantity: 5, unit: 'cuyd' }
    expect(
      scaleAIQuantityForDimensions(rec, 500, 0, 0, 0),
    ).toBe(5)
  })

  it('returns original qty when current dim is zero', () => {
    const rec = { estimatedQuantity: 5, unit: 'cuyd' }
    expect(
      scaleAIQuantityForDimensions(rec, 0, 0, 100, 0),
    ).toBe(5)
  })

  it('rounds to 1 decimal', () => {
    const rec = { estimatedQuantity: 1, unit: 'cuyd' }
    // 1 * (333/100) = 3.33 → rounds to 3.3
    expect(
      scaleAIQuantityForDimensions(rec, 333, 0, 100, 0),
    ).toBe(3.3)
  })
})
