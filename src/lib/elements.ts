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
  stone: HARDSCAPE_SURFACE,
  tile: ['patio', 'walkway', 'pool_deck', 'outdoor_kitchen'],
  brick: ['patio', 'walkway', 'wall', 'fire_pit', 'steps_stairs'],
  concrete: ['concrete_slab', 'driveway', 'parking_lot', 'steps_stairs', 'curbing'],
  // Base/bedding — only hardscape areas that need base material
  gravel: [...HARDSCAPE_BASE, 'gravel_area'],
  sand: HARDSCAPE_BASE,
  // Softscape — only planting/soft areas
  soil: ['garden_bed', 'tree_planting', 'shrub_planting', 'mulch_area'],
  mulch: ['garden_bed', 'tree_planting', 'shrub_planting', 'mulch_area'],
  plant: ['garden_bed', 'shrub_planting'],
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
  // Catch-all — empty means manual assignment only
  misc: [],
}

/**
 * Get the element types a material category should auto-assign to.
 * Returns empty array for categories that need manual assignment.
 */
export function getElementTypesForCategory(category: string): ElementType[] {
  const key = category.toLowerCase() as MaterialCategory;
  return CATEGORY_TO_ELEMENT_TYPES[key] ?? [];
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
