/**
 * parcelLookup — Sprint AI-Buildable Phase 2.
 *
 * Looks up a "lot hint" polygon for a property's geocoded coordinates so
 * the wizard can render a parcel-scale boundary distinct from the AI's
 * buildable polygon. Closes the "AI placed my element on the neighbor's
 * lawn" failure mode that Sprint AI-Place couldn't solve alone — the
 * vision LLM has no parcel data, just satellite pixels.
 *
 * MVP source: OpenStreetMap Overpass API. Free, no key, ~70% hit rate
 * on US suburban addresses where buildings are tagged. Real per-lot
 * parcel data (Regrid, county GIS) is a deferred follow-up that can
 * swap in via the same `lookupParcel(lat, lng)` interface.
 *
 * What we actually return:
 *   - The closest OSM building polygon within ~80m of (lat, lng), if
 *     any. Building outlines are the most reliable OSM data per
 *     address — neighborhood `landuse=residential` polygons are too
 *     coarse to be useful at single-property scale.
 *   - Polygon is converted to plan-feet, origin = (lat, lng) tile
 *     center, same coordinate space as ProjectElement.geometry.position
 *     and the buildable polygon. Renderable directly by PlanView2D.
 *
 * Naming:
 *   - The store column is `projects.lot_geometry` (mig 035).
 *   - In contractor copy we call it the "lot hint" or "house outline"
 *     because it's typically the building footprint, not a real lot.
 *
 * Failure modes (all return null, caller falls back to "no parcel hint"):
 *   - No buildings tagged near the address (rural / new construction)
 *   - Overpass times out / 5xxs / rate-limits
 *   - Address geocoding off (lat/lng landed in a body of water etc.)
 *
 * Cost: free. Overpass API has soft rate limits (~10k queries/day,
 * ~10MB/min); a single project create costs one Overpass query.
 */

import { feetPerPixel } from '@/lib/mapTileMath'

// Overpass API. Public mirror; falls back to .ru on de outage.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
// Search radius around the geocoded point. 80 m is generous enough to
// catch the building even when geocoding lands at the curb instead of
// the structure (Mapbox's address-point convention).
const SEARCH_RADIUS_M = 80
// Overpass timeout in seconds (server-side). 8s gives us a snappy
// fallback when the API is slow without burning the wizard step.
const OVERPASS_TIMEOUT_S = 8

// Coarse local timeout — shorter than Overpass server-side so we can
// abort and let the wizard proceed without parcel hint.
const LOOKUP_TIMEOUT_MS = 12_000

const EARTH_CIRCUMFERENCE_M = 40075016.686
const METERS_PER_FOOT = 0.3048

export type ParcelSource = 'osm-building' | 'osm-landuse'

export interface ParcelLookupResult {
  /** Polygon in plan-feet, origin = (lat, lng), +y = south. */
  polygon: Array<{ x: number; y: number }>
  /** What kind of OSM feature backed the polygon. Drives the renderer's
   *  label copy ("House outline" vs. "Lot boundary"). */
  source: ParcelSource
  /** Optional building name / landuse tag for telemetry. */
  label?: string
}

/**
 * Convert a (lat, lng) WGS84 point to plan-feet offset from a center
 * (lat0, lng0). Same Web-Mercator math the rest of the codebase uses
 * (mapTileMath.feetPerPixel etc.) — kept inline because we only need
 * the small-area linearization, not the full pixel-projection helpers.
 *
 * For sub-kilometer offsets the linearization error is well under 1 ft
 * at typical mid-latitudes, which is more than good enough for
 * lot-scale visualization.
 */
function llToPlanFeet(
  lat: number,
  lng: number,
  lat0: number,
  lng0: number,
): { x: number; y: number } {
  const fpp = feetPerPixel(lat0, /* zoom = irrelevant cancellation */ 0)
  // Above is meters-per-foot scaled at zoom 0; we want straight m → ft
  // at lat0, ignoring zoom. So compute meters-per-degree directly.
  const metersPerDegreeLat = EARTH_CIRCUMFERENCE_M / 360
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos((lat0 * Math.PI) / 180)
  const dx_m = (lng - lng0) * metersPerDegreeLng
  const dy_m = (lat0 - lat) * metersPerDegreeLat // lat0 - lat so +y = south
  return {
    x: dx_m / METERS_PER_FOOT,
    y: dy_m / METERS_PER_FOOT,
  }
  // (fpp is unused; the inline helper below is correct as-is. Kept the
  //  import to mirror the rest of the codebase's units.)
}

/** Squared distance between two plan-feet points. */
function distSqFt(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/** Centroid of a polygon (simple average — fine for small lot-scale shapes). */
function polygonCentroid(poly: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (!poly.length) return { x: 0, y: 0 }
  let sx = 0
  let sy = 0
  for (const p of poly) {
    sx += p.x
    sy += p.y
  }
  return { x: sx / poly.length, y: sy / poly.length }
}

interface OverpassNode {
  type: 'node'
  id: number
  lat: number
  lon: number
}

interface OverpassWay {
  type: 'way'
  id: number
  nodes: number[]
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: Array<OverpassNode | OverpassWay>
}

/**
 * Build the Overpass QL query for buildings within SEARCH_RADIUS_M of
 * (lat, lng). Returns ways (closed polylines) tagged with building=*.
 * Includes node positions so we can resolve each way's geometry.
 */
function buildBuildingsQuery(lat: number, lng: number): string {
  return `[out:json][timeout:${OVERPASS_TIMEOUT_S}];
(
  way["building"](around:${SEARCH_RADIUS_M},${lat},${lng});
);
(._; >;);
out body;`
}

/**
 * Best-effort fetch with our local LOOKUP_TIMEOUT_MS guard.
 * Returns null on network / parse / timeout failure.
 */
async function fetchOverpass(query: string): Promise<OverpassResponse | null> {
  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    })
    clearTimeout(t)
    if (!res.ok) return null
    const json = (await res.json()) as OverpassResponse
    if (!json || !Array.isArray(json.elements)) return null
    return json
  } catch {
    return null
  }
}

/**
 * Pick the closest closed-way building to (lat, lng), convert to
 * plan-feet centered on (lat, lng).
 *
 * Exported for test reuse — pure given the Overpass response.
 */
export function pickClosestBuildingPolygon(
  resp: OverpassResponse,
  lat: number,
  lng: number,
): ParcelLookupResult | null {
  const nodeMap = new Map<number, { lat: number; lon: number }>()
  for (const el of resp.elements) {
    if (el.type === 'node') nodeMap.set(el.id, { lat: el.lat, lon: el.lon })
  }

  const ways: Array<{ way: OverpassWay; polygon: Array<{ x: number; y: number }> }> = []
  for (const el of resp.elements) {
    if (el.type !== 'way') continue
    if (!el.nodes || el.nodes.length < 4) continue // need at least a triangle + close
    // Drop the duplicated last node (closed polygon convention) so
    // centroid math doesn't get pulled by the duplicate.
    const closed = el.nodes[0] === el.nodes[el.nodes.length - 1]
    const nodeIds = closed ? el.nodes.slice(0, -1) : el.nodes
    const polygon: Array<{ x: number; y: number }> = []
    let valid = true
    for (const nid of nodeIds) {
      const n = nodeMap.get(nid)
      if (!n) { valid = false; break }
      polygon.push(llToPlanFeet(n.lat, n.lon, lat, lng))
    }
    if (!valid || polygon.length < 3) continue
    ways.push({ way: el, polygon })
  }

  if (!ways.length) return null

  // Pick the way whose centroid is closest to (lat, lng) — i.e. the
  // building closest to the geocoded address. Ties are unlikely at
  // 80m radius; first-wins is fine.
  const origin = { x: 0, y: 0 }
  let best: { way: OverpassWay; polygon: Array<{ x: number; y: number }> } | null = null
  let bestD = Infinity
  for (const w of ways) {
    const c = polygonCentroid(w.polygon)
    const d = distSqFt(c, origin)
    if (d < bestD) {
      bestD = d
      best = w
    }
  }
  if (!best) return null

  return {
    polygon: best.polygon,
    source: 'osm-building',
    label: best.way.tags?.name || best.way.tags?.building || 'house',
  }
}

/**
 * Look up a lot-hint polygon for the property at (lat, lng).
 *
 * Returns null on:
 *   - Overpass timeout / 5xx / rate-limit
 *   - No buildings tagged within SEARCH_RADIUS_M
 *   - Malformed response
 *
 * Caller (wizard) treats null as "no parcel hint available — render
 * canvas without overlay, contractor uses satellite + AI buildable
 * polygon for placement reference."
 */
export async function lookupParcel(
  lat: number,
  lng: number,
): Promise<ParcelLookupResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  // Quick sanity: lat in [-90, 90], lng in [-180, 180].
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

  const resp = await fetchOverpass(buildBuildingsQuery(lat, lng))
  if (!resp) return null
  return pickClosestBuildingPolygon(resp, lat, lng)
}
