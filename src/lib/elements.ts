import type { ElementType, MaterialCategory } from '@/types'

/** Human-readable labels for element types */
export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  patio: 'Patio',
  wall: 'Seating Wall',
  garden_bed: 'Garden Bed',
  sod_area: 'Sod / Turf Area',
  edging: 'Edging / Border',
  walkway: 'Walkway / Path',
  driveway: 'Driveway',
  retaining_wall: 'Retaining Wall',
  fire_pit: 'Fire Pit',
  pool_deck: 'Pool Deck',
  parking_lot: 'Parking Lot',
  steps_stairs: 'Steps / Stairs',
  fence: 'Fence / Gate',
  pergola: 'Pergola / Arbor',
  outdoor_kitchen: 'Outdoor Kitchen',
  drainage: 'Drainage / French Drain',
  tree_planting: 'Tree Planting',
  shrub_planting: 'Shrub / Hedge Planting',
  irrigation_zone: 'Irrigation Zone',
  mulch_area: 'Mulch Area',
  gravel_area: 'Gravel / Rock Area',
  concrete_slab: 'Concrete Slab',
  curbing: 'Curbing',
  other: 'Other',
}

/**
 * Maps material categories to the element types they typically apply to.
 * Used for auto-assigning materials to elements during wizard project creation.
 *
 * Logic:
 * - Hardscape surface materials (paver, stone, tile, brick, concrete) → patio, walkway, driveway, pool_deck, fire_pit
 * - Base/bedding materials (gravel, sand) → ALL area-based elements (base is universal)
 * - Softscape materials (soil, mulch, plant, shrub, tree, seed) → garden_bed
 * - Sod → sod_area
 * - Edging → edging
 * - Wall materials (lumber, brick, stone for walls) → wall, retaining_wall
 * - Everything else → all elements (fallback)
 */
const HARDSCAPE_SURFACE: ElementType[] = ['patio', 'walkway', 'driveway', 'pool_deck', 'fire_pit', 'parking_lot', 'concrete_slab', 'steps_stairs'];
const HARDSCAPE_BASE: ElementType[] = ['patio', 'walkway', 'driveway', 'pool_deck', 'parking_lot', 'concrete_slab'];

export const CATEGORY_TO_ELEMENT_TYPES: Record<MaterialCategory, ElementType[]> = {
  // Hardscape surface materials — only hardscape elements
  paver: HARDSCAPE_SURFACE,
  // F-CW-LIVE-09: stone includes drainage (drain rock / drain gravel are
  // routinely classified `stone` by the AI but belong on the drainage
  // element). Also retaining_wall (stacked stone walls).
  stone: [...HARDSCAPE_SURFACE, 'drainage', 'retaining_wall', 'wall', 'gravel_area'],
  tile: ['patio', 'walkway', 'pool_deck', 'outdoor_kitchen'],
  brick: ['patio', 'walkway', 'wall', 'fire_pit', 'steps_stairs'],
  concrete: ['concrete_slab', 'driveway', 'parking_lot', 'steps_stairs', 'curbing'],
  // Base/bedding — only hardscape areas that need base material
  gravel: [...HARDSCAPE_BASE, 'gravel_area', 'drainage'],
  sand: [...HARDSCAPE_BASE, 'drainage'],
  // Softscape — only planting/soft areas
  soil: ['garden_bed', 'tree_planting', 'shrub_planting', 'mulch_area', 'sod_area'],
  mulch: ['garden_bed', 'tree_planting', 'shrub_planting', 'mulch_area'],
  plant: ['garden_bed', 'shrub_planting', 'tree_planting'],
  shrub: ['shrub_planting', 'garden_bed'],
  tree: ['tree_planting'],
  seed: ['sod_area'],
  sod: ['sod_area'],
  // Edging/curbing
  edging: ['edging', 'curbing'],
  // Structural
  lumber: ['wall', 'retaining_wall', 'fence', 'pergola', 'steps_stairs'],
  // Systems
  lighting: ['patio', 'walkway', 'garden_bed', 'pool_deck', 'outdoor_kitchen', 'pergola'],
  irrigation: ['garden_bed', 'sod_area', 'tree_planting', 'shrub_planting', 'irrigation_zone'],
  // Catch-all — empty means manual assignment only.
  // F-CW-LIVE-09: AI returns "misc" liberally for items that have a
  // proper home (drain pipe, fabric, topsoil, hydrangeas). Use name-
  // keyword fallback via getElementTypesForMaterial below.
  misc: [],
}

/**
 * F-CW-LIVE-09: name-keyword fallback for when category mapping returns
 * no element types (commonly category='misc'). Each entry maps a single
 * keyword (lowercased substring match) to a list of element types the
 * material likely belongs on. First-match-wins.
 */
const NAME_KEYWORD_TO_ELEMENT_TYPES: Array<[string, ElementType[]]> = [
  // Plants & planting (highest priority — order matters since "tree" is in
  // many shrub names; check specific terms first)
  ['boxwood', ['shrub_planting', 'garden_bed']],
  ['hydrangea', ['shrub_planting', 'garden_bed']],
  ['azalea', ['shrub_planting', 'garden_bed']],
  ['holly', ['shrub_planting', 'garden_bed']],
  ['ornamental tree', ['tree_planting']],
  ['shade tree', ['tree_planting']],
  ['oak', ['tree_planting']],
  ['maple', ['tree_planting']],
  ['shrub', ['shrub_planting', 'garden_bed']],
  ['hedge', ['shrub_planting', 'garden_bed']],
  ['perennial', ['garden_bed']],
  ['annual', ['garden_bed']],
  ['flower', ['garden_bed']],
  ['tree', ['tree_planting']],
  // Drainage
  ['drain pipe', ['drainage']],
  ['drainage', ['drainage']],
  ['french drain', ['drainage']],
  ['perforated', ['drainage']],
  ['drain rock', ['drainage']],
  ['drain gravel', ['drainage']],
  ['catch basin', ['drainage']],
  // Soil / amendments — broad, can go on any planting element
  ['topsoil', ['garden_bed', 'sod_area', 'shrub_planting', 'tree_planting']],
  ['compost', ['garden_bed', 'sod_area', 'shrub_planting', 'tree_planting']],
  ['amendment', ['garden_bed', 'sod_area', 'shrub_planting', 'tree_planting']],
  ['planting soil', ['garden_bed', 'shrub_planting', 'tree_planting']],
  // Sod / lawn
  ['sod', ['sod_area']],
  ['turf', ['sod_area']],
  ['grass seed', ['sod_area']],
  ['lawn seed', ['sod_area']],
  // Mulch
  ['mulch', ['mulch_area', 'garden_bed', 'shrub_planting', 'tree_planting']],
  ['wood chips', ['mulch_area', 'garden_bed']],
  // Fabric / barriers
  ['landscape fabric', ['garden_bed', 'mulch_area', 'shrub_planting', 'drainage']],
  ['weed barrier', ['garden_bed', 'mulch_area', 'shrub_planting']],
  ['geotextile', ['drainage', 'retaining_wall']],
  // Edging
  ['edging', ['edging', 'curbing']],
  ['border', ['edging', 'curbing']],
  // Hardscape signals
  ['paver', ['patio', 'walkway', 'driveway']],
  ['flagstone', ['patio', 'walkway']],
  ['retaining wall', ['retaining_wall']],
  ['stacked stone', ['retaining_wall', 'wall']],
  // Lighting / irrigation
  ['light', ['patio', 'walkway', 'garden_bed']],
  ['sprinkler', ['sod_area', 'irrigation_zone']],
  ['drip line', ['garden_bed', 'shrub_planting', 'irrigation_zone']],
];

/**
 * Get the element types a material category should auto-assign to.
 * Returns empty array for categories that need manual assignment.
 */
export function getElementTypesForCategory(category: string): ElementType[] {
  const key = category.toLowerCase() as MaterialCategory;
  return CATEGORY_TO_ELEMENT_TYPES[key] ?? [];
}

/**
 * F-CW-LIVE-09: prefer category mapping; fall back to name-keyword
 * matching when the category yields no element types (catches the
 * common AI default of category='misc' for things like drain pipe,
 * landscape fabric, hydrangea shrubs, topsoil). Returns deduplicated
 * union when both produce results.
 */
export function getElementTypesForMaterial(
  category: string,
  name: string,
): ElementType[] {
  const fromCategory = getElementTypesForCategory(category);
  if (fromCategory.length > 0) return fromCategory;
  const lc = (name || '').toLowerCase();
  for (const [kw, types] of NAME_KEYWORD_TO_ELEMENT_TYPES) {
    if (lc.includes(kw)) return types;
  }
  return [];
}

// ── Phase ↔ Material Category Mapping ───────────────────────────────────────
// Maps task phases to the material categories typically used in that phase.
// Used to show which materials are relevant to each task.

export const PHASE_MATERIAL_CATEGORIES: Record<string, MaterialCategory[]> = {
  demo_prep: [],
  rough_grade: ['gravel', 'sand', 'soil'],
  hardscape: ['paver', 'stone', 'tile', 'brick', 'concrete', 'gravel', 'sand', 'edging'],
  softscape: ['soil', 'mulch', 'plant', 'shrub', 'tree', 'seed', 'sod'],
  irrigation: ['irrigation'],
  lighting: ['lighting'],
  cleanup_punchlist: ['misc'],
  custom: [],
};

/**
 * Get project materials relevant to a task's phase.
 */
export function getMaterialsForPhase(
  phase: string,
  projectMaterials: { name: string; category: string; quantity: number; unit: string }[]
): { name: string; category: string; quantity: number; unit: string }[] {
  const cats = PHASE_MATERIAL_CATEGORIES[phase] ?? [];
  if (cats.length === 0) return [];
  return projectMaterials.filter(m => cats.includes(m.category.toLowerCase() as MaterialCategory));
}

// ── Element dimension presets ────────────────────────────────────────────────
//
// One-click defaults for common element sizes. Each preset clears the
// dimension fields it doesn't set, so picking a circular preset on a
// rectangular element wipes lengthFt/widthFt and vice versa. Numbers are
// from real partner-test projects + standard contractor estimating
// references — small/medium/large covers the 80% case for most types.

export interface ElementPreset {
  label: string;
  shape?: 'rectangle' | 'circle' | 'polygon';
  lengthFt?: number | null;
  widthFt?: number | null;
  radiusFt?: number | null;
  linearFt?: number | null;
  heightFt?: number | null;
  depthIn?: number | null;
  /** Manual area override — used for irregular shapes the contractor measures by area. */
  areaSqft?: number | null;
  /**
   * Polygon vertex points in feet, only set when shape='polygon'. Origin
   * is the polygon's local top-left; the wizard re-centers them on the
   * canvas via geometry.position. Vertices should be ordered (CW or CCW)
   * around the polygon — the engine tolerates either via abs() in
   * polygonAreaSqft.
   */
  polygonPoints?: Array<{ x: number; y: number }>;
}

// Helper: 8-point smooth ring approximating an ellipse with semi-axes
// (a, b). Used for kidney bean and other curved presets — beats a manual
// 30-vertex string for a tight bundle, and the Shoelace formula gives
// area accurate to <1% for the 80% case.
function ellipseRing(
  a: number,
  b: number,
  cx: number,
  cy: number,
  steps = 12,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + a * Math.cos(t), y: cy + b * Math.sin(t) });
  }
  return pts;
}

// Kidney bean: two overlapping ellipses joined by a concave waist.
// Ratio approximates a real garden-bed silhouette.
function kidneyBean(scaleFt: number): Array<{ x: number; y: number }> {
  // 12-point hand-tuned ring at scale=1, scaled to scaleFt total length.
  const base: Array<{ x: number; y: number }> = [
    { x: 0,    y: 2 },
    { x: 1.5,  y: 4 },
    { x: 4,    y: 4.5 },
    { x: 7,    y: 4 },
    { x: 9,    y: 2.5 },
    { x: 10,   y: 0 },
    { x: 9,    y: -2.5 },
    { x: 7,    y: -4 },
    { x: 4,    y: -4.5 },
    { x: 2,    y: -2 }, // concave waist on the lower side
    { x: 1.5,  y: 0 },
    { x: 0,    y: 1 },
  ];
  const k = scaleFt / 10; // base spans 10 units in x
  return base.map((p) => ({ x: p.x * k, y: p.y * k }));
}

export const ELEMENT_PRESETS: Partial<Record<ElementType, ElementPreset[]>> = {
  patio: [
    { label: '12×12 (small)', shape: 'rectangle', lengthFt: 12, widthFt: 12 },
    { label: '16×20 (medium)', shape: 'rectangle', lengthFt: 20, widthFt: 16 },
    { label: '24×18 (large)', shape: 'rectangle', lengthFt: 24, widthFt: 18 },
    { label: '14-ft round', shape: 'circle', radiusFt: 7 },
    {
      label: 'L-shape 16×16',
      shape: 'polygon',
      // L = 16×16 outer with an 8×8 corner notch cut out → 192 sqft.
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 8 },
        { x: 16, y: 8 },
        { x: 16, y: 16 },
        { x: 0, y: 16 },
      ],
    },
    {
      label: 'Octagon 16-ft',
      shape: 'polygon',
      // 8-sided regular polygon, ~178 sqft. Apothem ≈ 7.4 ft.
      polygonPoints: ellipseRing(8, 8, 8, 8, 8).map((p) => ({
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
      })),
    },
  ],
  walkway: [
    { label: '4×20 ft', shape: 'rectangle', lengthFt: 20, widthFt: 4, linearFt: 20 },
    { label: '4×40 ft', shape: 'rectangle', lengthFt: 40, widthFt: 4, linearFt: 40 },
    { label: '5×30 ft', shape: 'rectangle', lengthFt: 30, widthFt: 5, linearFt: 30 },
  ],
  driveway: [
    { label: '12×40 (single)', shape: 'rectangle', lengthFt: 40, widthFt: 12 },
    { label: '20×40 (double)', shape: 'rectangle', lengthFt: 40, widthFt: 20 },
    {
      label: 'Trapezoidal flare',
      shape: 'polygon',
      // Single-car drive that flares from 12 ft at the street to 16 ft at
      // the garage door. Typical residential ask.
      polygonPoints: [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
        { x: 14, y: 30 },
        { x: -2, y: 30 },
      ],
    },
  ],
  garden_bed: [
    { label: '4×8 (small)', shape: 'rectangle', lengthFt: 8, widthFt: 4 },
    { label: '6×12 (medium)', shape: 'rectangle', lengthFt: 12, widthFt: 6 },
    { label: '6-ft round', shape: 'circle', radiusFt: 3 },
    {
      label: 'Kidney 12 ft',
      shape: 'polygon',
      polygonPoints: kidneyBean(12).map((p) => ({
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
      })),
    },
    {
      label: 'Kidney 18 ft',
      shape: 'polygon',
      polygonPoints: kidneyBean(18).map((p) => ({
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
      })),
    },
  ],
  sod_area: [
    { label: '200 sqft', areaSqft: 200 },
    { label: '500 sqft', areaSqft: 500 },
    { label: '1,000 sqft', areaSqft: 1000 },
    { label: '2,500 sqft', areaSqft: 2500 },
  ],
  mulch_area: [
    { label: '100 sqft @ 3"', areaSqft: 100, depthIn: 3 },
    { label: '250 sqft @ 3"', areaSqft: 250, depthIn: 3 },
    { label: '500 sqft @ 3"', areaSqft: 500, depthIn: 3 },
  ],
  gravel_area: [
    { label: '200 sqft @ 4"', areaSqft: 200, depthIn: 4 },
    { label: '400 sqft @ 4"', areaSqft: 400, depthIn: 4 },
  ],
  fire_pit: [
    { label: '3-ft radius', shape: 'circle', radiusFt: 3 },
    { label: '4-ft radius', shape: 'circle', radiusFt: 4 },
    { label: '5-ft radius', shape: 'circle', radiusFt: 5 },
  ],
  retaining_wall: [
    { label: '20 ft × 3 ft', linearFt: 20, heightFt: 3 },
    { label: '30 ft × 4 ft', linearFt: 30, heightFt: 4 },
    { label: '50 ft × 4 ft', linearFt: 50, heightFt: 4 },
  ],
  wall: [
    { label: '12 ft × 18"', linearFt: 12, heightFt: 1.5 },
    { label: '20 ft × 18"', linearFt: 20, heightFt: 1.5 },
  ],
  edging: [
    { label: '50 ft', linearFt: 50 },
    { label: '100 ft', linearFt: 100 },
    { label: '200 ft', linearFt: 200 },
  ],
  curbing: [
    { label: '50 ft', linearFt: 50 },
    { label: '100 ft', linearFt: 100 },
  ],
  fence: [
    { label: '50 ft × 6 ft', linearFt: 50, heightFt: 6 },
    { label: '100 ft × 6 ft', linearFt: 100, heightFt: 6 },
  ],
  drainage: [
    { label: '50 ft french drain', linearFt: 50, depthIn: 18 },
    { label: '100 ft french drain', linearFt: 100, depthIn: 18 },
  ],
  pool_deck: [
    { label: '12-ft surround', shape: 'rectangle', lengthFt: 24, widthFt: 24 },
    { label: '15×30 lap', shape: 'rectangle', lengthFt: 30, widthFt: 15 },
  ],
  steps_stairs: [
    { label: '4 ft × 3 step', linearFt: 4, heightFt: 1.5 },
    { label: '6 ft × 5 step', linearFt: 6, heightFt: 2.5 },
  ],
  pergola: [
    { label: '10×10', shape: 'rectangle', lengthFt: 10, widthFt: 10, heightFt: 8 },
    { label: '12×16', shape: 'rectangle', lengthFt: 16, widthFt: 12, heightFt: 8 },
  ],
};

/**
 * Apply a preset by returning the field deltas. Caller merges them into
 * the existing element. Fields the preset doesn't touch are explicitly
 * cleared (set to null) so picking a 'circle' preset on a rectangle
 * element wipes lengthFt/widthFt instead of layering inconsistent state.
 *
 * Polygon presets return polygonPoints; the wizard wires them into
 * geometry.shape.points so the canvas + engine pick them up immediately.
 */
export function applyElementPreset(preset: ElementPreset): {
  shape: 'rectangle' | 'circle' | 'polygon';
  lengthFt: number | null;
  widthFt: number | null;
  radiusFt: number | null;
  linearFt: number | null;
  heightFt: number | null;
  depthIn: number | null;
  areaSqft: number | null;
  polygonPoints: Array<{ x: number; y: number }> | null;
} {
  const shape = preset.shape ?? 'rectangle';
  return {
    shape,
    lengthFt: preset.lengthFt ?? null,
    widthFt: preset.widthFt ?? null,
    radiusFt: preset.radiusFt ?? null,
    linearFt: preset.linearFt ?? null,
    heightFt: preset.heightFt ?? null,
    depthIn: preset.depthIn ?? null,
    areaSqft: preset.areaSqft ?? null,
    polygonPoints: preset.polygonPoints ?? null,
  };
}
