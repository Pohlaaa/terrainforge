/**
 * polygonGeom — small pure-geometry helpers for the AI buildable
 * area + obstacle polygon work.
 *
 * Sprint AI-Buildable Phase 2 lives here because:
 *   - PlanView2D needs `pointInPolygon` for the soft-clip drag warning
 *   - PlanView3D may eventually want the same check (3D drag clipping)
 *   - The harness scoring code may want it for "did the AI place
 *     elements inside the buildable polygon?" assertions
 *   - Edge functions (e.g. server-side parcel fetch validation) may
 *     want a Node-safe import without React deps
 */

/**
 * Ray-casting point-in-polygon test. Returns true when (px, py) is
 * strictly inside the polygon defined by `points` (winding-order
 * independent — concave shapes work too). Boundary cases (point ON an
 * edge) are treated as outside, which is the "soft" behavior we want
 * for drag warnings: if the contractor lands the element exactly on
 * the boundary, no warning fires.
 *
 * Returns false for degenerate polygons (< 3 points).
 */
export function pointInPolygon(
  px: number,
  py: number,
  points: ReadonlyArray<{ x: number; y: number }>,
): boolean {
  if (points.length < 3) return false
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x
    const yi = points[i].y
    const xj = points[j].x
    const yj = points[j].y
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Axis-aligned bounding box for a polygon in plan-feet. Cheap pre-test
 * to short-circuit pointInPolygon when callers are checking many
 * polygons against many points (e.g. when there are 5+ obstacles, an
 * AABB miss saves a full ray-cast).
 */
export function polygonAABB(
  points: ReadonlyArray<{ x: number; y: number }>,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (points.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}
