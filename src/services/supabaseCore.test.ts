import { describe, it, expect } from 'vitest'
import { toCamelCase, toSnakeCase } from './supabaseCore'

describe('supabaseCore / case conversion', () => {
  it('converts top-level snake_case → camelCase keys', () => {
    expect(toCamelCase({ user_id: 1, org_name: 'foo' })).toEqual({
      userId: 1,
      orgName: 'foo',
    })
  })

  it('converts top-level camelCase → snake_case keys', () => {
    expect(toSnakeCase({ userId: 1, orgName: 'foo' })).toEqual({
      user_id: 1,
      org_name: 'foo',
    })
  })

  it('preserves nested arrays of objects', () => {
    const input = {
      site_geometry: {
        elevation_samples: [
          { sample_x: 1, sample_y: 2 },
          { sample_x: 3, sample_y: 4 },
        ],
      },
    }
    const out = toCamelCase(input)
    expect(out.siteGeometry).toEqual({
      elevationSamples: [
        { sampleX: 1, sampleY: 2 },
        { sampleX: 3, sampleY: 4 },
      ],
    })
  })

  // Sprint AI-Buildable regression: arrays-of-arrays must STAY arrays.
  // Pre-fix toSnakeCase converted the inner array to {"0": ..., "1": ...}
  // because Object.entries on an array yields stringified-int keys.
  // Affects projects.obstacles_geometry which is JSONB Array<Array<{x,y}>>.
  it('preserves nested arrays of arrays (Sprint AI-Buildable)', () => {
    const input = {
      obstaclesGeometry: [
        [
          { x: 0.1, y: 0.2 },
          { x: 0.3, y: 0.4 },
        ],
        [
          { x: 0.5, y: 0.5 },
          { x: 0.6, y: 0.6 },
        ],
      ],
    }
    const out = toSnakeCase(input)
    expect(Array.isArray(out.obstacles_geometry)).toBe(true)
    expect(Array.isArray((out.obstacles_geometry as unknown[])[0])).toBe(true)
    expect(out.obstacles_geometry).toEqual([
      [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
      ],
      [
        { x: 0.5, y: 0.5 },
        { x: 0.6, y: 0.6 },
      ],
    ])
  })

  it('round-trips arrays-of-arrays through both directions', () => {
    const original = {
      buildableArea: [
        { x: 0.2, y: 0.5 },
        { x: 0.8, y: 0.5 },
        { x: 0.8, y: 0.9 },
        { x: 0.2, y: 0.9 },
      ],
      obstaclesGeometry: [
        [{ x: 0.3, y: 0.1 }],
        [{ x: 0.5, y: 0.5 }],
      ],
    }
    const snake = toSnakeCase(original)
    const back = toCamelCase(snake)
    expect(back).toEqual(original)
  })

  it('leaves Date objects intact (does not recurse into them)', () => {
    const d = new Date('2026-01-01T00:00:00Z')
    const out = toCamelCase({ created_at: d })
    expect(out.createdAt).toBe(d)
  })

  it('handles deeply nested mix of objects + arrays', () => {
    const input = {
      project_data: {
        elements: [
          {
            element_id: 'e1',
            geometry: {
              shape: { kind: 'polygon', points: [{ x: 1, y: 2 }] },
            },
          },
        ],
      },
    }
    const out = toCamelCase(input)
    const proj = out.projectData as Record<string, unknown>
    const els = proj.elements as Array<Record<string, unknown>>
    expect(els[0].elementId).toBe('e1')
    const geom = els[0].geometry as Record<string, unknown>
    const shape = geom.shape as Record<string, unknown>
    expect(shape.kind).toBe('polygon')
    expect(shape.points).toEqual([{ x: 1, y: 2 }])
  })

  it('handles empty arrays and empty objects', () => {
    expect(toSnakeCase({ obstacles: [] })).toEqual({ obstacles: [] })
    expect(toCamelCase({ site_geometry: {} })).toEqual({ siteGeometry: {} })
  })
})
