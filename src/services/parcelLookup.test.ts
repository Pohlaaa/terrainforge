/**
 * parcelLookup tests — pure logic only. The Overpass API call itself
 * is exercised by the live wizard + manual staging verification (no
 * point in stubbing fetch when the math is the interesting part).
 *
 * Sprint AI-Buildable Phase 2.
 */

import { describe, it, expect } from 'vitest'
import { pickClosestBuildingPolygon } from './parcelLookup'

// Asheville baseline (matches the placement corpus 01-suburban-asheville)
const LAT = 35.5905
const LNG = -82.516

// Helper: build a single closed-way building at lat/lng with a 10m square footprint.
function squareBuilding(centerLat: number, centerLng: number, sizeM = 10): { nodes: Array<{ id: number; lat: number; lon: number }>; way: { id: number; nodes: number[]; tags?: Record<string, string> } } {
  // Convert sizeM to lat/lng degree offset (rough, mid-latitude).
  const dLat = sizeM / 111_000 // ~1 deg lat ≈ 111 km
  const dLng = sizeM / (111_000 * Math.cos((centerLat * Math.PI) / 180))
  const halfLat = dLat / 2
  const halfLng = dLng / 2
  const nodes = [
    { id: 1, lat: centerLat - halfLat, lon: centerLng - halfLng }, // SW
    { id: 2, lat: centerLat - halfLat, lon: centerLng + halfLng }, // SE
    { id: 3, lat: centerLat + halfLat, lon: centerLng + halfLng }, // NE
    { id: 4, lat: centerLat + halfLat, lon: centerLng - halfLng }, // NW
  ]
  const way = {
    id: 100,
    nodes: [1, 2, 3, 4, 1], // closed
    tags: { building: 'residential' },
  }
  return { nodes, way }
}

describe('parcelLookup / pickClosestBuildingPolygon', () => {
  it('returns the lone building when one is found at the center', () => {
    const { nodes, way } = squareBuilding(LAT, LNG, 10)
    const resp = {
      elements: [
        ...nodes.map((n) => ({ type: 'node' as const, id: n.id, lat: n.lat, lon: n.lon })),
        { type: 'way' as const, ...way },
      ],
    }
    const result = pickClosestBuildingPolygon(resp, LAT, LNG)
    expect(result).not.toBeNull()
    expect(result!.source).toBe('osm-building')
    expect(result!.polygon).toHaveLength(4) // closed point dedup'd
    // Centroid should be near (0, 0) plan-feet (= the (lat, lng) origin).
    const cx = result!.polygon.reduce((a, p) => a + p.x, 0) / 4
    const cy = result!.polygon.reduce((a, p) => a + p.y, 0) / 4
    expect(Math.abs(cx)).toBeLessThan(1)
    expect(Math.abs(cy)).toBeLessThan(1)
  })

  it('picks the closer of two candidate buildings', () => {
    // Building 1: 5 m east of origin — closer
    const a = squareBuilding(LAT, LNG + 5 / (111_000 * Math.cos((LAT * Math.PI) / 180)), 8)
    // Building 2: 30 m east — farther
    const b = squareBuilding(LAT, LNG + 30 / (111_000 * Math.cos((LAT * Math.PI) / 180)), 8)
    a.way.id = 100
    b.way.id = 200
    // Renumber b's nodes to avoid clashes
    b.nodes = b.nodes.map((n) => ({ ...n, id: n.id + 100 }))
    b.way.nodes = b.way.nodes.map((nid) => nid + 100)

    const resp = {
      elements: [
        ...a.nodes.map((n) => ({ type: 'node' as const, id: n.id, lat: n.lat, lon: n.lon })),
        ...b.nodes.map((n) => ({ type: 'node' as const, id: n.id, lat: n.lat, lon: n.lon })),
        { type: 'way' as const, ...a.way },
        { type: 'way' as const, ...b.way },
      ],
    }
    const result = pickClosestBuildingPolygon(resp, LAT, LNG)
    expect(result).not.toBeNull()
    // Closer building's centroid should be ~5m / 0.3048 ≈ 16 ft east.
    const cx = result!.polygon.reduce((a, p) => a + p.x, 0) / result!.polygon.length
    expect(cx).toBeGreaterThan(0)
    expect(cx).toBeLessThan(50)
  })

  it('returns null when there are no ways', () => {
    const result = pickClosestBuildingPolygon({ elements: [] }, LAT, LNG)
    expect(result).toBeNull()
  })

  it('returns null when ways have unresolvable nodes', () => {
    const resp = {
      elements: [
        // Way references node 999 which is not in the response.
        { type: 'way' as const, id: 100, nodes: [999, 1, 2, 999], tags: { building: 'yes' } },
      ],
    }
    const result = pickClosestBuildingPolygon(resp, LAT, LNG)
    expect(result).toBeNull()
  })

  it('handles open polygons (last node ≠ first)', () => {
    const { nodes, way } = squareBuilding(LAT, LNG, 10)
    // Strip the closing duplicate node — the polygon is now "open" in OSM terms.
    way.nodes = way.nodes.slice(0, -1)
    const resp = {
      elements: [
        ...nodes.map((n) => ({ type: 'node' as const, id: n.id, lat: n.lat, lon: n.lon })),
        { type: 'way' as const, ...way },
      ],
    }
    const result = pickClosestBuildingPolygon(resp, LAT, LNG)
    expect(result).not.toBeNull()
    expect(result!.polygon).toHaveLength(4)
  })

  it('passes through the building name as the label', () => {
    const { nodes, way } = squareBuilding(LAT, LNG, 10)
    way.tags = { building: 'house', name: 'Smith Residence' }
    const resp = {
      elements: [
        ...nodes.map((n) => ({ type: 'node' as const, id: n.id, lat: n.lat, lon: n.lon })),
        { type: 'way' as const, ...way },
      ],
    }
    const result = pickClosestBuildingPolygon(resp, LAT, LNG)
    expect(result?.label).toBe('Smith Residence')
  })

  it('falls back to building tag value when name is absent', () => {
    const { nodes, way } = squareBuilding(LAT, LNG, 10)
    way.tags = { building: 'garage' }
    const resp = {
      elements: [
        ...nodes.map((n) => ({ type: 'node' as const, id: n.id, lat: n.lat, lon: n.lon })),
        { type: 'way' as const, ...way },
      ],
    }
    const result = pickClosestBuildingPolygon(resp, LAT, LNG)
    expect(result?.label).toBe('garage')
  })
})
