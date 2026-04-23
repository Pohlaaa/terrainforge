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
export function autoLayout(
  elements: ProjectElement[],
  opts: { targetRowWidthFt?: number; gapFt?: number } = {},
): Array<{ element: ProjectElement; geometry: ElementGeometry }> {
  const targetRowWidthFt = opts.targetRowWidthFt ?? 80
  const gap = opts.gapFt ?? 3

  let cursorX = 0
  let cursorY = 0
  let rowHeight = 0

  return elements.map((element) => {
    if (element.geometry) {
      return { element, geometry: element.geometry }
    }

    const { width, height } = fallbackDimensions(element)

    if (cursorX + width > targetRowWidthFt && cursorX > 0) {
      cursorX = 0
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
