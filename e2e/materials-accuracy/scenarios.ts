import type { ElementType } from '../../src/types'
import type { ElementMaterialInferenceContext } from '../../src/services/aiRecommendations'

/**
 * Sprint M scenario library — synthetic test cases for
 * `inferMaterialsForElement`. Coverage: 10 element types × 3 dimension
 * tiers (small / medium / large) = 30 scenarios.
 *
 * Each scenario specifies:
 *
 *   element                  — the input passed to inferMaterialsForElement
 *
 *   expectedCategories       — categories the AI MUST surface (within
 *                              the returned materials list). At least
 *                              one material with a matching category
 *                              counts the requirement as met.
 *
 *   forbiddenCategories      — categories the AI MUST NOT surface.
 *                              Penalised in the score if present.
 *
 *   quantityChecks           — explicit per-material quantity-range
 *                              assertions. Each entry says "if a
 *                              material with this category appears, its
 *                              quantity must be within [min, max]". A
 *                              material that's neither required nor
 *                              forbidden but appears with an out-of-range
 *                              quantity gets a warning, not a hard fail.
 *
 * Quantity ranges are derived from industry formulas in CLAUDE.md +
 * the existing prompt:
 *
 *   - Bulk materials (cuyd):  area_sqft / 324 × depth_in × (1 + waste)
 *   - Coverage materials (sqft): area_sqft × (1 + waste)
 *   - Bagged sand: area_sqft / 65 (typical polymeric coverage)
 *   - Linear materials (lnft): perimeter or run length × (1 + waste)
 *   - Pavers (each): area_sqft / face_sqft_per_paver (~0.4–0.5 sqft for
 *     8×10 pavers, so ~2.2 pavers/sqft × area)
 *
 * Bands are intentionally loose (often ±50% of the formula) so the
 * harness scores AI's reasonableness, not its precision. Anything
 * inside the band is "right enough." A tight band would be a brittle
 * test; the goal is "did Claude apply the right kind of formula?"
 */

export type Tier = 'small' | 'medium' | 'large'

export interface QuantityCheck {
  category: string
  unit: string
  min: number
  max: number
  /** Free-text describing why this range; surfaces in the scorecard. */
  rationale: string
}

export interface Scenario {
  id: string // e.g. "patio_small"
  tier: Tier
  element: ElementMaterialInferenceContext
  expectedCategories: string[]
  forbiddenCategories: string[]
  quantityChecks: QuantityCheck[]
  /** Description of what this scenario is testing. */
  notes: string
}

// ─── helpers ──────────────────────────────────────────────────────────

const wasteHigh = 1.15 // 15% upper waste tolerance
const wasteLow = 1.0 // 0% lower (occasionally AI returns no waste; that's still "applied a formula")

function bulkCuyd(areaSqft: number, depthIn: number): { min: number; max: number } {
  const cuyd = (areaSqft / 324) * depthIn
  return { min: cuyd * wasteLow * 0.6, max: cuyd * wasteHigh * 1.5 }
}

function coverageSqft(areaSqft: number): { min: number; max: number } {
  return { min: areaSqft * wasteLow * 0.85, max: areaSqft * wasteHigh * 1.5 }
}

function paverEach(areaSqft: number): { min: number; max: number } {
  // 2.2 pavers/sqft is typical for 6"×9" pavers; bands span 4×4 to 12×12
  return { min: areaSqft * 1.0, max: areaSqft * 6.0 }
}

function bagsForArea(areaSqft: number, sqftPerBag = 65): { min: number; max: number } {
  return { min: Math.max(1, Math.floor(areaSqft / sqftPerBag) - 1), max: Math.ceil(areaSqft / sqftPerBag * wasteHigh) + 1 }
}

function linearFt(runFt: number): { min: number; max: number } {
  return { min: runFt * wasteLow * 0.85, max: runFt * wasteHigh * 1.4 }
}

function makeElement(
  name: string,
  elementType: ElementType,
  dims: Partial<ElementMaterialInferenceContext>,
): ElementMaterialInferenceContext {
  return {
    name,
    elementType,
    lengthFt: dims.lengthFt ?? null,
    widthFt: dims.widthFt ?? null,
    areaSqft: dims.areaSqft ?? null,
    linearFt: dims.linearFt ?? null,
    heightFt: dims.heightFt ?? null,
    depthIn: dims.depthIn ?? null,
  }
}

// ─── scenarios ────────────────────────────────────────────────────────

export const SCENARIOS: Scenario[] = [
  // ===== PATIO ===========================================================
  {
    id: 'patio_small',
    tier: 'small',
    element: makeElement('Small Paver Patio', 'patio', {
      lengthFt: 8, widthFt: 8, areaSqft: 64,
    }),
    expectedCategories: ['paver', 'gravel', 'sand'],
    forbiddenCategories: ['fertilizer', 'sod', 'soil', 'mulch', 'plant', 'shrub', 'tree'],
    quantityChecks: [
      { category: 'paver', unit: 'each', ...paverEach(64), rationale: '64 sqft × 2.2 pavers/sqft ≈ 140; band 64–384' },
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(64, 6), rationale: '64 sqft × 6" base ≈ 1.2 cuyd' },
      { category: 'sand', unit: 'bag', ...bagsForArea(64), rationale: 'polymeric: 64 / 65 ≈ 1 bag' },
    ],
    notes: 'Smallest hardscape. Should NOT include softscape/organic materials.',
  },
  {
    id: 'patio_medium',
    tier: 'medium',
    element: makeElement('Backyard Patio', 'patio', {
      lengthFt: 16, widthFt: 12, areaSqft: 192,
    }),
    expectedCategories: ['paver', 'gravel', 'sand'],
    forbiddenCategories: ['fertilizer', 'sod', 'soil', 'mulch', 'plant', 'tree'],
    quantityChecks: [
      { category: 'paver', unit: 'each', ...paverEach(192), rationale: '192 sqft × 2.2 ≈ 422; band 192–1152' },
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(192, 6), rationale: '192 sqft × 6" base ≈ 3.6 cuyd' },
      { category: 'sand', unit: 'bag', ...bagsForArea(192), rationale: '192 / 65 ≈ 3 bags' },
    ],
    notes: 'Median patio size from contractor walkthroughs.',
  },
  {
    id: 'patio_large',
    tier: 'large',
    element: makeElement('Large Patio', 'patio', {
      lengthFt: 24, widthFt: 18, areaSqft: 432,
    }),
    expectedCategories: ['paver', 'gravel', 'sand'],
    forbiddenCategories: ['fertilizer', 'sod', 'soil', 'mulch', 'plant', 'tree'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(432, 6), rationale: '432 sqft × 6" ≈ 8 cuyd' },
      { category: 'sand', unit: 'bag', ...bagsForArea(432), rationale: '432 / 65 ≈ 7 bags' },
    ],
    notes: 'Thompson-scale patio.',
  },

  // ===== WALKWAY =========================================================
  {
    id: 'walkway_small',
    tier: 'small',
    element: makeElement('Front Path', 'walkway', {
      lengthFt: 20, widthFt: 3, areaSqft: 60,
    }),
    expectedCategories: ['paver', 'gravel'],
    forbiddenCategories: ['fertilizer', 'sod', 'soil', 'mulch', 'plant'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(60, 6), rationale: '60 sqft × 6" ≈ 1.1 cuyd' },
    ],
    notes: 'Long narrow walkway. Edging optional but base + paver required.',
  },
  {
    id: 'walkway_medium',
    tier: 'medium',
    element: makeElement('Side Walkway', 'walkway', {
      lengthFt: 30, widthFt: 4, areaSqft: 120,
    }),
    expectedCategories: ['paver', 'gravel'],
    forbiddenCategories: ['fertilizer', 'sod', 'soil', 'plant'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(120, 6), rationale: '120 sqft × 6" ≈ 2.2 cuyd' },
    ],
    notes: 'Medium walkway.',
  },
  {
    id: 'walkway_large',
    tier: 'large',
    element: makeElement('Loop Walkway', 'walkway', {
      lengthFt: 60, widthFt: 4, areaSqft: 240,
    }),
    expectedCategories: ['paver', 'gravel'],
    forbiddenCategories: ['fertilizer', 'sod', 'soil', 'plant'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(240, 6), rationale: '240 sqft × 6" ≈ 4.4 cuyd' },
    ],
    notes: 'Large walkway loop.',
  },

  // ===== SOD AREA ========================================================
  {
    id: 'sod_small',
    tier: 'small',
    element: makeElement('Front Lawn Sod', 'sod_area', {
      lengthFt: 20, widthFt: 10, areaSqft: 200,
    }),
    expectedCategories: ['sod', 'soil'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'stone'],
    quantityChecks: [
      { category: 'sod', unit: 'sqft', ...coverageSqft(200), rationale: '200 sqft × waste ≈ 200–230' },
    ],
    notes: 'F-PHB-02 regression: must NOT include gravel/crushed-stone base.',
  },
  {
    id: 'sod_medium',
    tier: 'medium',
    element: makeElement('Backyard Sod', 'sod_area', {
      areaSqft: 1000,
    }),
    expectedCategories: ['sod', 'soil'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'stone'],
    quantityChecks: [
      { category: 'sod', unit: 'sqft', ...coverageSqft(1000), rationale: '1000 sqft × waste ≈ 1000–1500' },
    ],
    notes: 'Medium sod patch. F-PHB-02 regression check.',
  },
  {
    id: 'sod_large',
    tier: 'large',
    element: makeElement('Full Yard Sod', 'sod_area', {
      areaSqft: 2500,
    }),
    expectedCategories: ['sod', 'soil'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'stone'],
    quantityChecks: [
      { category: 'sod', unit: 'sqft', ...coverageSqft(2500), rationale: '2500 sqft × waste ≈ 2500–3750' },
    ],
    notes: 'Large sod install. F-PHB-02 regression check.',
  },

  // ===== GARDEN BED ======================================================
  {
    id: 'garden_bed_small',
    tier: 'small',
    element: makeElement('Front Bed', 'garden_bed', {
      lengthFt: 6, widthFt: 4, areaSqft: 24,
    }),
    expectedCategories: ['soil', 'mulch'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'sod'],
    quantityChecks: [
      { category: 'soil', unit: 'cuyd', ...bulkCuyd(24, 6), rationale: '24 sqft × 6" topsoil ≈ 0.45 cuyd' },
      { category: 'mulch', unit: 'cuyd', ...bulkCuyd(24, 3), rationale: '24 sqft × 3" mulch ≈ 0.22 cuyd' },
    ],
    notes: 'Small garden bed. No gravel/concrete.',
  },
  {
    id: 'garden_bed_medium',
    tier: 'medium',
    element: makeElement('Side Garden Beds', 'garden_bed', {
      lengthFt: 20, widthFt: 5, areaSqft: 100,
    }),
    expectedCategories: ['soil', 'mulch'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'sod'],
    quantityChecks: [
      { category: 'soil', unit: 'cuyd', ...bulkCuyd(100, 6), rationale: '100 sqft × 6" topsoil ≈ 1.85 cuyd' },
      { category: 'mulch', unit: 'cuyd', ...bulkCuyd(100, 3), rationale: '100 sqft × 3" mulch ≈ 0.93 cuyd' },
    ],
    notes: 'Medium garden bed run.',
  },
  {
    id: 'garden_bed_large',
    tier: 'large',
    element: makeElement('Whole-Yard Beds', 'garden_bed', {
      lengthFt: 40, widthFt: 6, areaSqft: 240,
    }),
    expectedCategories: ['soil', 'mulch'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'sod'],
    quantityChecks: [
      { category: 'soil', unit: 'cuyd', ...bulkCuyd(240, 6), rationale: '240 sqft × 6" topsoil ≈ 4.4 cuyd' },
      { category: 'mulch', unit: 'cuyd', ...bulkCuyd(240, 3), rationale: '240 sqft × 3" mulch ≈ 2.2 cuyd' },
    ],
    notes: 'Large garden bed.',
  },

  // ===== MULCH AREA ======================================================
  {
    id: 'mulch_small',
    tier: 'small',
    element: makeElement('Front Mulch Strip', 'mulch_area', {
      lengthFt: 10, widthFt: 3, areaSqft: 30,
    }),
    expectedCategories: ['mulch'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'sod', 'fertilizer'],
    quantityChecks: [
      { category: 'mulch', unit: 'cuyd', ...bulkCuyd(30, 3), rationale: '30 sqft × 3" mulch ≈ 0.28 cuyd' },
    ],
    notes: 'Pure mulch refresh, small.',
  },
  {
    id: 'mulch_medium',
    tier: 'medium',
    element: makeElement('Garden Mulch', 'mulch_area', {
      areaSqft: 200,
    }),
    expectedCategories: ['mulch'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'sod', 'fertilizer'],
    quantityChecks: [
      { category: 'mulch', unit: 'cuyd', ...bulkCuyd(200, 3), rationale: '200 sqft × 3" mulch ≈ 1.85 cuyd' },
    ],
    notes: 'Medium mulch refresh.',
  },
  {
    id: 'mulch_large',
    tier: 'large',
    element: makeElement('Whole-Yard Mulch', 'mulch_area', {
      areaSqft: 800,
    }),
    expectedCategories: ['mulch'],
    forbiddenCategories: ['gravel', 'paver', 'concrete', 'sod', 'fertilizer'],
    quantityChecks: [
      { category: 'mulch', unit: 'cuyd', ...bulkCuyd(800, 3), rationale: '800 sqft × 3" mulch ≈ 7.4 cuyd' },
    ],
    notes: 'Large mulch refresh.',
  },

  // ===== GRAVEL AREA =====================================================
  {
    id: 'gravel_small',
    tier: 'small',
    element: makeElement('Side Gravel Path', 'gravel_area', {
      lengthFt: 15, widthFt: 3, areaSqft: 45,
    }),
    expectedCategories: ['gravel'],
    forbiddenCategories: ['paver', 'sod', 'mulch', 'soil', 'fertilizer'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(45, 4), rationale: '45 sqft × 4" gravel ≈ 0.55 cuyd' },
    ],
    notes: 'Small gravel area.',
  },
  {
    id: 'gravel_medium',
    tier: 'medium',
    element: makeElement('Backyard Gravel Pad', 'gravel_area', {
      lengthFt: 12, widthFt: 12, areaSqft: 144,
    }),
    expectedCategories: ['gravel'],
    forbiddenCategories: ['paver', 'sod', 'mulch', 'soil', 'fertilizer'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(144, 4), rationale: '144 sqft × 4" gravel ≈ 1.78 cuyd' },
    ],
    notes: 'Medium gravel pad.',
  },
  {
    id: 'gravel_large',
    tier: 'large',
    element: makeElement('Equipment Gravel Pad', 'gravel_area', {
      lengthFt: 24, widthFt: 16, areaSqft: 384,
    }),
    expectedCategories: ['gravel'],
    forbiddenCategories: ['paver', 'sod', 'mulch', 'soil', 'fertilizer'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', ...bulkCuyd(384, 4), rationale: '384 sqft × 4" gravel ≈ 4.7 cuyd' },
    ],
    notes: 'Large gravel install.',
  },

  // ===== FENCE ===========================================================
  {
    id: 'fence_small',
    tier: 'small',
    element: makeElement('Side Yard Fence', 'fence', {
      linearFt: 30, heightFt: 6,
    }),
    expectedCategories: ['lumber'],
    forbiddenCategories: ['fertilizer', 'sod', 'mulch', 'paver'],
    quantityChecks: [
      // Posts every 8 ft → 4-5 posts. Linear ft of rail material ≈ 60 (2 rails × 30 ft).
      // Lumber typically by board (each) or linear-foot — accept either.
      { category: 'lumber', unit: 'each', min: 4, max: 200, rationale: 'posts + boards count' },
    ],
    notes: 'Short fence run. Should call out posts and boards.',
  },
  {
    id: 'fence_medium',
    tier: 'medium',
    element: makeElement('Backyard Fence', 'fence', {
      linearFt: 80, heightFt: 6,
    }),
    expectedCategories: ['lumber'],
    forbiddenCategories: ['fertilizer', 'sod', 'mulch', 'paver'],
    quantityChecks: [
      { category: 'lumber', unit: 'each', min: 10, max: 600, rationale: 'medium fence material count' },
    ],
    notes: 'Standard backyard perimeter fence.',
  },
  {
    id: 'fence_large',
    tier: 'large',
    element: makeElement('Property Perimeter Fence', 'fence', {
      linearFt: 200, heightFt: 6,
    }),
    expectedCategories: ['lumber'],
    forbiddenCategories: ['fertilizer', 'sod', 'mulch', 'paver'],
    quantityChecks: [
      { category: 'lumber', unit: 'each', min: 25, max: 1500, rationale: 'large fence material count' },
    ],
    notes: 'Full property perimeter.',
  },

  // ===== RETAINING WALL ==================================================
  {
    id: 'retaining_wall_small',
    tier: 'small',
    element: makeElement('Garden Retaining Wall', 'retaining_wall', {
      linearFt: 12, heightFt: 2,
    }),
    expectedCategories: ['stone'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver'],
    quantityChecks: [],
    notes: 'Short retaining wall. Block + base + drainage stone all reasonable.',
  },
  {
    id: 'retaining_wall_medium',
    tier: 'medium',
    element: makeElement('Slope Retaining Wall', 'retaining_wall', {
      linearFt: 30, heightFt: 3,
    }),
    expectedCategories: ['stone'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver'],
    quantityChecks: [],
    notes: 'Standard retaining wall scope.',
  },
  {
    id: 'retaining_wall_large',
    tier: 'large',
    element: makeElement('Major Retaining Wall', 'retaining_wall', {
      linearFt: 60, heightFt: 4,
    }),
    expectedCategories: ['stone'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver'],
    quantityChecks: [],
    notes: 'Tall retaining wall — drainage materials critical.',
  },

  // ===== DRAINAGE ========================================================
  {
    id: 'drainage_small',
    tier: 'small',
    element: makeElement('Yard French Drain', 'drainage', {
      linearFt: 20, depthIn: 12,
    }),
    expectedCategories: ['gravel'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver'],
    quantityChecks: [
      // Drain rock for 20 ft × 1.5 ft × 1 ft / 27 ≈ 1.1 cuyd
      { category: 'gravel', unit: 'cuyd', min: 0.5, max: 4.0, rationale: '20 ft trench × 1.5×1 ft / 27 ≈ 1.1 cuyd' },
    ],
    notes: 'Short trench. Drain rock + pipe required.',
  },
  {
    id: 'drainage_medium',
    tier: 'medium',
    element: makeElement('Yard Drain Run', 'drainage', {
      linearFt: 60, depthIn: 12,
    }),
    expectedCategories: ['gravel'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', min: 1.5, max: 12.0, rationale: '60 ft trench × 1.5×1 ft / 27 ≈ 3.3 cuyd' },
    ],
    notes: 'Medium drainage run.',
  },
  {
    id: 'drainage_large',
    tier: 'large',
    element: makeElement('Whole Yard Drainage', 'drainage', {
      linearFt: 150, depthIn: 12,
    }),
    expectedCategories: ['gravel'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver'],
    quantityChecks: [
      { category: 'gravel', unit: 'cuyd', min: 4.0, max: 30.0, rationale: '150 ft trench × 1.5×1 ft / 27 ≈ 8.3 cuyd' },
    ],
    notes: 'Large multi-zone drainage.',
  },

  // ===== EDGING ==========================================================
  {
    id: 'edging_small',
    tier: 'small',
    element: makeElement('Bed Edging', 'edging', {
      linearFt: 30,
    }),
    expectedCategories: ['edging'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver', 'soil'],
    quantityChecks: [
      { category: 'edging', unit: 'lnft', ...linearFt(30), rationale: '30 lnft + waste' },
    ],
    notes: 'Short edging run.',
  },
  {
    id: 'edging_medium',
    tier: 'medium',
    element: makeElement('Garden Edging', 'edging', {
      linearFt: 80,
    }),
    expectedCategories: ['edging'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver', 'soil'],
    quantityChecks: [
      { category: 'edging', unit: 'lnft', ...linearFt(80), rationale: '80 lnft + waste' },
    ],
    notes: 'Medium edging.',
  },
  {
    id: 'edging_large',
    tier: 'large',
    element: makeElement('Whole-Yard Edging', 'edging', {
      linearFt: 200,
    }),
    expectedCategories: ['edging'],
    forbiddenCategories: ['sod', 'fertilizer', 'mulch', 'paver', 'soil'],
    quantityChecks: [
      { category: 'edging', unit: 'lnft', ...linearFt(200), rationale: '200 lnft + waste' },
    ],
    notes: 'Large edging.',
  },
]
