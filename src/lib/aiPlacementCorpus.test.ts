/**
 * Corpus shape integrity tests. Pure data validation — confirms every
 * entry has a sane source/lat/lng combination and no placeholder
 * accidentally claims to be operational. Cheap regression gate.
 *
 * Sprint Corpus Authoring.
 */

import { describe, it, expect } from 'vitest'
import { CORPUS } from '../../e2e/ai-placement/corpus'

describe('AI placement corpus shape', () => {
  it('every entry has a stable id and label', () => {
    const ids = new Set<string>()
    for (const e of CORPUS) {
      expect(e.id).toBeTruthy()
      expect(e.label).toBeTruthy()
      ids.add(e.id)
    }
    expect(ids.size).toBe(CORPUS.length) // ids are unique
  })

  it('every entry has a source tag', () => {
    for (const e of CORPUS) {
      expect(['manual', 'heuristic', 'placeholder']).toContain(e.source)
    }
  })

  it('placeholder entries have lat/lng = 0/0 (or are the bad-address fixture)', () => {
    for (const e of CORPUS) {
      if (e.source !== 'placeholder') continue
      expect(e.lat).toBe(0)
      expect(e.lng).toBe(0)
    }
  })

  it('non-placeholder entries have non-zero lat/lng (except the intentional bad-address)', () => {
    for (const e of CORPUS) {
      if (e.source === 'placeholder') continue
      if (e.id === '15-bad-address') continue // codified failure path
      expect(Math.abs(e.lat)).toBeGreaterThan(0)
      expect(Math.abs(e.lng)).toBeGreaterThan(0)
      expect(Math.abs(e.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(e.lng)).toBeLessThanOrEqual(180)
    }
  })

  it('every expected key references a real corpus element', () => {
    for (const e of CORPUS) {
      const keys = new Set(e.elements.map((el) => el.key))
      for (const exp of e.expected) {
        expect(keys).toContain(exp.key)
      }
    }
  })

  it('every expected has either acceptableZones with positive radii OR a legacy point + tolerance', () => {
    for (const e of CORPUS) {
      for (const exp of e.expected) {
        const hasZones = Array.isArray(exp.acceptableZones) && exp.acceptableZones.length > 0
        const hasLegacy =
          typeof exp.expectedX === 'number' &&
          typeof exp.expectedY === 'number' &&
          typeof exp.toleranceFt === 'number' &&
          exp.toleranceFt > 0
        expect(hasZones || hasLegacy).toBe(true)
        if (hasZones) {
          for (const z of exp.acceptableZones!) {
            expect(z.radiusFt).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('zoom levels are sensible (Mapbox supports 0-22)', () => {
    for (const e of CORPUS) {
      expect(e.zoom).toBeGreaterThanOrEqual(15) // we never go below city scale
      expect(e.zoom).toBeLessThanOrEqual(22)
    }
  })

  it('tile pixel width matches PlanView3D BACKDROP_IMAGE_PX (1200)', () => {
    for (const e of CORPUS) {
      expect(e.tilePxWide).toBe(1200)
    }
  })

  it('the bad-address fixture has empty expected (codifies the failure path)', () => {
    const bad = CORPUS.find((e) => e.id === '15-bad-address')
    expect(bad).toBeDefined()
    expect(bad!.source).toBe('manual')
    expect(bad!.expected).toEqual([])
  })

  it('reports the operational corpus size for visibility', () => {
    const operational = CORPUS.filter((e) => e.source !== 'placeholder')
    const placeholders = CORPUS.filter((e) => e.source === 'placeholder')
    // Don't fix exact counts — both rise as the corpus matures.
    // Just confirm we have at least a baseline corpus to score.
    expect(operational.length).toBeGreaterThanOrEqual(5)
    // Log so the count surfaces when running locally.
    // eslint-disable-next-line no-console
    console.log(`[corpus] ${operational.length} operational, ${placeholders.length} placeholder`)
  })
})
