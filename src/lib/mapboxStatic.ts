/**
 * mapboxStatic — shared Mapbox Static API URL builder.
 *
 * Single source of truth for the satellite tiles fetched by:
 *   - PlanView2D (SVG backdrop)
 *   - PlanView3D (3D ground plane)
 *   - aiPlacement (Sprint AI-Place vision call)
 *
 * Pre-this-module the constants + URL builder were duplicated in both
 * PlanView files with the same values. Sprint AI-Place needed the
 * wizard to build the same URL to pass to the vision call, so the
 * builder moved here. Importing PlanView3D from the wizard would pull
 * three.js into the eager bundle (898 KB) — Bad.
 *
 * Why not in `mapTileMath.ts`? mapTileMath is meant to be pure +
 * importable from Edge Functions / harnesses. `buildMapboxStaticUrl`
 * reads `import.meta.env.VITE_MAPBOX_TOKEN` which is browser-only.
 * Keeping them separate.
 */

/** Zoom level used for the satellite backdrop. Same in 2D + 3D so
 *  the property scale matches across surfaces. */
export const BACKDROP_ZOOM = 19

/** Tile pixel dimension. 1200 is the ceiling for non-@2x requests; we
 *  pass `@2x` for retina-quality but the geographic coverage is still
 *  determined by the pre-@2x dimension. */
export const BACKDROP_IMAGE_PX = 1200

/**
 * Build a Mapbox Static API URL for the satellite tile centered on
 * `(lat, lng)`. Returns null if the token env var is missing — caller
 * should fall back to a non-satellite render path.
 */
export function buildMapboxStaticUrl(lat: number, lng: number): string | null {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  if (!token) return null
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${BACKDROP_ZOOM},0/${BACKDROP_IMAGE_PX}x${BACKDROP_IMAGE_PX}@2x?access_token=${token}&attribution=false&logo=false`
}
