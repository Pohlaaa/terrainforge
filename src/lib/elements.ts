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
