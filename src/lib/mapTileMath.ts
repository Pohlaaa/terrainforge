/**
 * Map tile math — Web Mercator helpers for converting between
 * normalized tile coordinates (0–1, 0–1 where (0, 0) is the top-left
 * pixel of the satellite image), pixel coordinates, and plan-feet
 * offsets from the tile center.
 *
 * This module exists for **Sprint AI-Place** (vision-grounded element
 * placement). The vision LLM returns placements as fractions of the
 * tile width/height; we map those fractions to plan-feet so they can
 * land in `ProjectElement.geometry.position`.
 *
 * Conventions (must match the rest of the codebase):
 *   - Mapbox Static API tiles are CENTERED on the requested lat/lng
 *   - Plan-feet origin (0, 0) is also at the tile center
 *   - Plan-y INCREASES going SOUTH (matching the SVG/2D viewer's
 *     "down is +y" convention used throughout PlanView2D / PlanView3D)
 *   - Image pixel (0, 0) is the top-left, +x going right, +y going down
 *
 * So:
 *   normX = px / pxWide      → [0, 1] left-to-right
 *   normY = py / pxHeight    → [0, 1] top-to-bottom (= south-to-north
 *                              flipped → see toFeet below)
 *
 * Earth circumference + meters-per-foot match PlanView3D so the
 * `feetPerPixel` value computed here equals the one used to size the
 * 3D ground plane. If you change the constants, change them in one
 * place — they are duplicated for now to keep this module pure (no
 * React dep) and importable from Edge Functions / harnesses.
 */

const EARTH_CIRCUMFERENCE_M = 40075016.686
const METERS_PER_FOOT = 0.3048

/**
 * Meters per pixel at a given Mapbox zoom level + latitude. Web
 * Mercator: a 256-pixel tile at zoom z covers
 * `EARTH_CIRCUMFERENCE / 2^z` meters at the equator. The horizontal
 * scale shrinks toward the poles by `cos(latitude)`.
 */
export function metersPerPixel(lat: number, zoom: number): number {
  const atEquator = EARTH_CIRCUMFERENCE_M / Math.pow(2, zoom) / 256
  return atEquator * Math.cos((lat * Math.PI) / 180)
}

/**
 * Feet per pixel at a given lat/zoom. Convenience around
 * `metersPerPixel`.
 */
export function feetPerPixel(lat: number, zoom: number): number {
  return metersPerPixel(lat, zoom) / METERS_PER_FOOT
}

/**
 * Total width (= height) in feet of a square Mapbox satellite tile of
 * `pxWide` pixels at the given lat/zoom. Used to size the 3D ground
 * plane and to convert vision-LLM normalized placements to plan-feet.
 */
export function tileFootprintFt(
  lat: number,
  zoom: number,
  pxWide: number,
): number {
  return feetPerPixel(lat, zoom) * pxWide
}

/**
 * Convert a normalized tile coordinate (0–1, 0–1, top-left origin) to
 * plan-feet offset from the tile center. The Y axis is flipped so
 * that increasing plan-y goes SOUTH, matching the rest of the
 * codebase's coordinate convention.
 *
 * Example: normalized (0.5, 0.5) → plan-feet (0, 0). Normalized
 * (0.5, 0) → plan-feet (0, -halfFootprint) (= north of center).
 *
 * @param norm  Normalized tile coords (x: 0–1 left-to-right, y: 0–1
 *              top-to-bottom)
 * @param lat   Tile center latitude
 * @param zoom  Mapbox zoom level
 * @param pxWide Tile pixel dimension (typically 1200 for our static
 *              API requests)
 */
export function normalizedToPlanFeet(
  norm: { x: number; y: number },
  lat: number,
  zoom: number,
  pxWide: number,
): { x: number; y: number } {
  const footprint = tileFootprintFt(lat, zoom, pxWide)
  // norm.y = 0 → plan-y = -half (north). norm.y = 1 → plan-y = +half
  // (south). Matches PlanView2D's +y-is-down convention. No flip needed —
  // image-down and plan-south are the same direction.
  return {
    x: (norm.x - 0.5) * footprint,
    y: (norm.y - 0.5) * footprint,
  }
}

/**
 * Inverse: convert a plan-feet offset back to normalized tile coords.
 * Used by the harness to render expected ground-truth placements as
 * pixel overlays for human review.
 *
 * Returns `null` when the point lies outside the tile (off the
 * satellite image).
 */
export function planFeetToNormalized(
  pos: { x: number; y: number },
  lat: number,
  zoom: number,
  pxWide: number,
): { x: number; y: number } | null {
  const footprint = tileFootprintFt(lat, zoom, pxWide)
  const half = footprint / 2
  if (Math.abs(pos.x) > half || Math.abs(pos.y) > half) return null
  return {
    x: pos.x / footprint + 0.5,
    y: pos.y / footprint + 0.5,
  }
}

/**
 * Convert plan-feet directly to image-pixel coords (top-left origin).
 * Useful for drawing ground-truth markers on a Mapbox tile in the
 * harness for visual review.
 */
export function planFeetToPixel(
  pos: { x: number; y: number },
  lat: number,
  zoom: number,
  pxWide: number,
): { px: number; py: number } | null {
  const norm = planFeetToNormalized(pos, lat, zoom, pxWide)
  if (!norm) return null
  return { px: norm.x * pxWide, py: norm.y * pxWide }
}

/**
 * Validate that a normalized coord is within the tile (0–1 inclusive
 * on both axes). Used by aiPlacement to filter out hallucinated
 * coords that fall outside the image before we map them to plan-feet.
 */
export function isNormalizedInTile(norm: { x: number; y: number }): boolean {
  return norm.x >= 0 && norm.x <= 1 && norm.y >= 0 && norm.y <= 1
}
