import type { ProjectElement, ElementGeometry, ElementType } from '@/types'

// ===== PLAN LAYOUT =====
//
// Pure functions that resolve a ProjectElement's on-plane geometry. When the
// contractor hasn't touched the design editor yet, every element has
// geometry === null. This module synthesizes a reasonable fallback layout
// so the 2D viewer can render something useful on day one — essentially
// a block diagram scaled by each element's measured dimensions.
//
// Once the design editor ships, contractors will drag elements around and
// geometry gets persisted. The viewer code doesn't change — it reads the
// real geometry when present, falls back to auto-layout when absent.

/**
 * Resolves an element to a concrete geometry. Returns the stored geometry
 * verbatim if present, otherwise synthesizes a rectangle sized by the
 * element's measured dimensions.
 */
export function resolveGeometry(element: ProjectElement, fallbackPosition: { x: number; y: number }): ElementGeometry {
  if (element.geometry) return element.geometry

  const { width, height } = fallbackDimensions(element)
  return {
    position: fallbackPosition,
    rotation: 0,
    shape: { kind: 'rectangle', width, height },
  }
}

/**
 * Best-effort width × height in feet for an element that has no geometry.
 * Uses the element's own dimension fields when possible; falls back to a
 * square of area (sqft), and finally a fixed minimum so zero-area elements
 * still render as a visible placeholder.
 */
export function fallbackDimensions(element: ProjectElement): { width: number; height: number } {
  const MIN = 4 // feet — keep even zero-sized placeholder elements visible

  if (element.lengthFt && element.widthFt) {
    return { width: Math.max(element.lengthFt, MIN), height: Math.max(element.widthFt, MIN) }
  }

  if (element.areaSqft && element.areaSqft > 0) {
    const side = Math.sqrt(element.areaSqft)
    return { width: Math.max(side, MIN), height: Math.max(side, MIN) }
  }

  if (element.computedAreaSqft > 0) {
    const side = Math.sqrt(element.computedAreaSqft)
    return { width: Math.max(side, MIN), height: Math.max(side, MIN) }
  }

  // Linear elements — draw as a thin strip
  if (element.linearFt && element.linearFt > 0) {
    return { width: Math.max(element.linearFt, MIN), height: 1.5 }
  }

  return { width: MIN, height: MIN }
}

/**
 * Tiles elements left-to-right, wrapping at a target total width. Only
 * used for the null-geometry fallback. Returns each element paired with
 * its resolved geometry so callers can render directly.
 */
/**
 * Default origin offset for auto-laid elements (Sprint 6c residual).
 *
 * Elements with null geometry used to spawn at exactly (0, 0), which in the
 * 3D view (where world origin = project lat/lng ≈ house center) meant the
 * elements overlapped the house. Offsetting to (0, 25) places them ~25 ft
 * south of the property center so they sit on the lawn/yard area visible in
 * the satellite.
 *
 * This offset is invisible in the 2D view because the SVG viewBox centers on
 * the element bbox regardless of absolute position.
 */
const DEFAULT_ORIGIN_OFFSET_FT = { x: 0, y: 25 }

export function autoLayout(
  elements: ProjectElement[],
  opts: {
    targetRowWidthFt?: number
    gapFt?: number
    originOffsetFt?: { x: number; y: number }
  } = {},
): Array<{ element: ProjectElement; geometry: ElementGeometry }> {
  const targetRowWidthFt = opts.targetRowWidthFt ?? 80
  const gap = opts.gapFt ?? 3
  const origin = opts.originOffsetFt ?? DEFAULT_ORIGIN_OFFSET_FT

  let cursorX = origin.x
  let cursorY = origin.y
  let rowHeight = 0

  return elements.map((element) => {
    if (element.geometry) {
      return { element, geometry: element.geometry }
    }

    const { width, height } = fallbackDimensions(element)

    if (cursorX + width > origin.x + targetRowWidthFt && cursorX > origin.x) {
      cursorX = origin.x
      cursorY += rowHeight + gap
      rowHeight = 0
    }

    const geometry: ElementGeometry = {
      position: { x: cursorX, y: cursorY },
      rotation: 0,
      shape: { kind: 'rectangle', width, height },
    }

    cursorX += width + gap
    rowHeight = Math.max(rowHeight, height)

    return { element, geometry }
  })
}

/**
 * Axis-aligned bounding box across a set of elements+geometries, in feet.
 * Handles rectangles, circles, and polygon shapes; ignores lines (they
 * have no area — callers should wrap them in a small rect).
 */
export function computeBoundingBox(
  items: Array<{ geometry: ElementGeometry }>,
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (items.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const { geometry } of items) {
    const { position, shape } = geometry
    let w = 0, h = 0
    if (shape.kind === 'rectangle') { w = shape.width; h = shape.height }
    else if (shape.kind === 'circle') { w = shape.radius * 2; h = shape.radius * 2 }
    else if (shape.kind === 'line') { w = shape.length; h = 0.5 }
    else if (shape.kind === 'polygon') {
      // Rough: bbox of the polygon's points
      const xs = shape.points.map((p) => p.x)
      const ys = shape.points.map((p) => p.y)
      w = Math.max(...xs) - Math.min(...xs)
      h = Math.max(...ys) - Math.min(...ys)
    }

    minX = Math.min(minX, position.x)
    minY = Math.min(minY, position.y)
    maxX = Math.max(maxX, position.x + w)
    maxY = Math.max(maxY, position.y + h)
  }

  return { minX, minY, maxX, maxY }
}

// ===== ELEMENT COLOR PALETTE =====
//
// Until PBR textures land, the viewer uses a flat color per element type.
// Colors chosen from the TerrainForge palette + adjacent natural-material
// tones so a patio reads as stone, sod reads as green, etc.

const ELEMENT_COLORS: Record<ElementType, string> = {
  patio: '#78716C',           // warm stone
  walkway: '#A8A29E',         // lighter stone
  driveway: '#57534E',        // dark asphalt / concrete
  pool_deck: '#D6D3D1',       // bone / travertine
  parking_lot: '#44403C',
  steps_stairs: '#78716C',
  concrete_slab: '#A8A29E',

  wall: '#8B4513',            // brick
  retaining_wall: '#6B4423',  // darker stone
  fence: '#92400E',           // cedar
  pergola: '#78350F',

  garden_bed: '#7F1D1D',      // mulch-brown-red
  sod_area: '#4D7C0F',        // grass green
  mulch_area: '#7C2D12',      // mulch brown
  gravel_area: '#A8A29E',

  edging: '#44403C',
  curbing: '#57534E',

  tree_planting: '#166534',   // tree green
  shrub_planting: '#15803D',

  fire_pit: '#DC2626',        // accent red
  outdoor_kitchen: '#78716C',

  drainage: '#0891B2',        // water blue
  irrigation_zone: '#0284C7',

  other: '#6B7280',
}

export function elementColor(type: ElementType): string {
  return ELEMENT_COLORS[type] ?? ELEMENT_COLORS.other
}

// ===== 3D EXTRUSION HEIGHTS (Sprint 4) =====
//
// PlanView3D extrudes each rectangle into a box. The height is a
// reasonable default per element type, overridden by the element's
// own heightFt or depthIn when the contractor has supplied one. Values
// in feet. Flat hardscape is ~0.1 ft so the outline is visible but it
// still reads as a surface. Walls and fences get real human-scale
// heights.

const ELEMENT_HEIGHTS_FT: Record<ElementType, number> = {
  patio: 0.1,
  walkway: 0.1,
  driveway: 0.1,
  pool_deck: 0.15,
  parking_lot: 0.1,
  steps_stairs: 0.8,
  concrete_slab: 0.1,
  curbing: 0.3,

  wall: 4,
  retaining_wall: 3,
  fence: 6,
  pergola: 8,

  garden_bed: 0.8,
  mulch_area: 0.3,
  gravel_area: 0.3,
  sod_area: 0.1,

  edging: 0.2,

  tree_planting: 15,
  shrub_planting: 4,

  fire_pit: 1.8,
  outdoor_kitchen: 3,

  drainage: 0.2,
  irrigation_zone: 0.1,

  other: 0.5,
}

/**
 * Height in feet for a given element, rendered as the Y-extrusion of its
 * rectangle in 3D. Prefers the element's own heightFt, then depthIn / 12,
 * then the type default, then 0.5.
 */
export function elementHeightFt(element: {
  elementType: ElementType
  heightFt: number | null
  depthIn: number | null
}): number {
  if (element.heightFt && element.heightFt > 0) return element.heightFt
  if (element.depthIn && element.depthIn > 0) return element.depthIn / 12
  return ELEMENT_HEIGHTS_FT[element.elementType] ?? 0.5
}

// ===== 3D MATERIAL PROPS (Sprint 6d-lite) =====
//
// Per-type PBR-ish material settings for the 3D view. Real texture maps
// (migration 030 columns) are Sprint 7 — this just varies roughness /
// metalness / emissive so stone reads differently from sod. Flat colors
// with category-tuned surface response.

export interface ElementMaterialProps {
  roughness: number
  metalness: number
  // Slight tint brightness adjustment — 1 = as-is, >1 = brighter
  intensity?: number
}

const ELEMENT_MATERIALS: Record<ElementType, ElementMaterialProps> = {
  // Hardscape — matte-ish stone, low metalness
  patio: { roughness: 0.85, metalness: 0.02 },
  walkway: { roughness: 0.82, metalness: 0.02 },
  driveway: { roughness: 0.9, metalness: 0.01 },
  pool_deck: { roughness: 0.6, metalness: 0.03 },
  parking_lot: { roughness: 0.95, metalness: 0 },
  steps_stairs: { roughness: 0.85, metalness: 0.02 },
  concrete_slab: { roughness: 0.88, metalness: 0.02 },
  curbing: { roughness: 0.85, metalness: 0.03 },

  // Structural — slight sheen on treated wood / finished stone
  wall: { roughness: 0.75, metalness: 0.05 },
  retaining_wall: { roughness: 0.9, metalness: 0.02 },
  fence: { roughness: 0.7, metalness: 0.05 },
  pergola: { roughness: 0.7, metalness: 0.05 },

  // Organic — very matte, no metalness
  garden_bed: { roughness: 1, metalness: 0 },
  mulch_area: { roughness: 1, metalness: 0 },
  gravel_area: { roughness: 0.95, metalness: 0 },
  sod_area: { roughness: 0.98, metalness: 0 },

  edging: { roughness: 0.75, metalness: 0.15 },

  tree_planting: { roughness: 0.9, metalness: 0 },
  shrub_planting: { roughness: 0.95, metalness: 0 },

  fire_pit: { roughness: 0.6, metalness: 0.4, intensity: 1.2 },
  outdoor_kitchen: { roughness: 0.4, metalness: 0.6 },

  drainage: { roughness: 0.3, metalness: 0.1 },
  irrigation_zone: { roughness: 0.4, metalness: 0.05 },

  other: { roughness: 0.75, metalness: 0.05 },
}

export function elementMaterial(type: ElementType): ElementMaterialProps {
  return ELEMENT_MATERIALS[type] ?? ELEMENT_MATERIALS.other
}

// ===== 3D-in-Wizard: Placement Buckets =====
//
// AI element inference returns a coarse `placementHint` per element
// ("backyard", "frontyard", "side", "perimeter", "driveway", "unknown").
// Without a cadastral parcel/structure outline (we only have a satellite
// tile centered on the property lat/lng), we can't pinpoint where the
// house actually sits. The buckets below are reasonable defaults relative
// to the world origin (which IS the property lat/lng, so the house tends
// to be near origin in the satellite tile):
//
//   - backyard: south of origin (positive plan-Y)
//   - frontyard: north (negative plan-Y, closer to the street in most US lots)
//   - side: east of origin
//   - driveway: west of origin
//   - perimeter: wraps the property ~50ft from origin
//   - unknown: falls back to autoLayout's tiling
//
// The contractor drags from these defaults to the actual location in
// seconds. The point isn't to be right — it's to scaffold faster than
// "everything overlapping the house."

export type PlacementHint = 'frontyard' | 'backyard' | 'side' | 'perimeter' | 'driveway' | 'unknown'

interface PlacementSlot {
  /** Center of the bucket region in plan-feet. */
  center: { x: number; y: number }
  /** Rough radius the bucket can spread elements within before stacking visibly. */
  radius: number
}

const PLACEMENT_BUCKETS: Record<PlacementHint, PlacementSlot> = {
  backyard: { center: { x: 0, y: 35 }, radius: 25 },
  frontyard: { center: { x: 0, y: -35 }, radius: 20 },
  side: { center: { x: 35, y: 0 }, radius: 18 },
  driveway: { center: { x: -35, y: 0 }, radius: 18 },
  perimeter: { center: { x: 0, y: 50 }, radius: 30 },
  unknown: { center: { x: 0, y: 25 }, radius: 20 },
}

/**
 * Computes the top-left position (in plan feet) for an element with the
 * given hint, dimensions, and stack index. The stack index lets multiple
 * elements with the same hint spread along an arc inside the bucket
 * instead of overlapping perfectly. Use a deterministic spread so re-runs
 * of the wizard place the same elements in the same default slots.
 */
export function placementBucket(
  hint: PlacementHint,
  dimensions: { width: number; height: number },
  stackIndex = 0,
): { x: number; y: number } {
  const slot = PLACEMENT_BUCKETS[hint] ?? PLACEMENT_BUCKETS.unknown
  // Deterministic angular spread: golden-angle-ish. First element at center,
  // subsequent ones fan around it.
  const phi = stackIndex === 0 ? 0 : stackIndex * 137.5 * (Math.PI / 180)
  const r = stackIndex === 0 ? 0 : Math.min(slot.radius, 6 + stackIndex * 4)
  const cx = slot.center.x + Math.cos(phi) * r
  const cy = slot.center.y + Math.sin(phi) * r
  // Convert center → top-left in plan-feet.
  return {
    x: Math.round(cx - dimensions.width / 2),
    y: Math.round(cy - dimensions.height / 2),
  }
}
