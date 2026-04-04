/**
 * Material Categories — Single Source of Truth
 *
 * Every component, store, and service that touches material categories
 * imports from this file. No hardcoded category strings elsewhere.
 */

import type { MaterialCategory } from '@/types';

// ── Individual Categories ────────────────────────────────────────────────────

/** All valid material categories (canonical list) */
export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'paver', 'stone', 'tile', 'brick', 'concrete',
  'sod', 'seed', 'mulch', 'gravel', 'sand', 'soil',
  'edging', 'plant', 'shrub', 'tree',
  'lighting', 'irrigation', 'lumber', 'misc',
];

/** Human-readable labels for individual categories */
export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  paver: 'Paver', stone: 'Stone', tile: 'Tile', brick: 'Brick', concrete: 'Concrete',
  sod: 'Sod', seed: 'Seed', mulch: 'Mulch', gravel: 'Gravel',
  sand: 'Sand', soil: 'Soil', edging: 'Edging', plant: 'Plant',
  shrub: 'Shrub', tree: 'Tree', lighting: 'Lighting', irrigation: 'Irrigation',
  lumber: 'Lumber', misc: 'Misc',
};

/** Badge CSS class per category (for visual grouping) */
export const CATEGORY_BADGES: Record<MaterialCategory, string> = {
  paver: 'badge-blue', stone: 'badge-blue', tile: 'badge-blue', brick: 'badge-blue',
  concrete: 'badge-blue', sod: 'badge-green', seed: 'badge-green',
  mulch: 'badge-green', gravel: 'badge-amber', sand: 'badge-amber',
  soil: 'badge-green', edging: 'badge-teal', plant: 'badge-green',
  shrub: 'badge-green', tree: 'badge-green', lighting: 'badge-amber',
  irrigation: 'badge-blue', lumber: 'badge-amber', misc: 'badge-purple',
};

/** Reserve % per category for manifest calculation */
export const CATEGORY_RESERVES: Record<MaterialCategory, number> = {
  paver: 0.10, stone: 0.10, tile: 0.12, brick: 0.10, sod: 0.08,
  seed: 0.15, mulch: 0.15, gravel: 0.12, sand: 0.15, soil: 0.10,
  edging: 0.08, plant: 0, tree: 0, shrub: 0, lighting: 0,
  irrigation: 0.05, concrete: 0.10, lumber: 0.12, misc: 0.10,
};

// ── Category Groups ──────────────────────────────────────────────────────────
// Higher-level groupings used for supplier matching, RFQ segmentation, etc.

export interface CategoryGroupDef {
  label: string;
  categories: MaterialCategory[];
}

export type CategoryGroupKey = 'hardscape' | 'softscape' | 'systems' | 'structural' | 'other';

export const CATEGORY_GROUPS: Record<CategoryGroupKey, CategoryGroupDef> = {
  hardscape: {
    label: 'Hardscape',
    categories: ['paver', 'stone', 'tile', 'brick', 'concrete', 'gravel', 'sand', 'edging'],
  },
  softscape: {
    label: 'Softscape',
    categories: ['sod', 'seed', 'mulch', 'soil', 'plant', 'shrub', 'tree'],
  },
  systems: {
    label: 'Systems & Fixtures',
    categories: ['lighting', 'irrigation'],
  },
  structural: {
    label: 'Structural',
    categories: ['lumber'],
  },
  other: {
    label: 'Other',
    categories: ['misc'],
  },
};

// ── Helper Functions ─────────────────────────────────────────────────────────

/** Get the display label for a category (case-insensitive, fallback to titlecase) */
export function getCategoryLabel(category: string): string {
  const key = category.toLowerCase() as MaterialCategory;
  return CATEGORY_LABELS[key] ?? titleCase(category);
}

/** Get the badge class for a category */
export function getCategoryBadge(category: string): string {
  const key = category.toLowerCase() as MaterialCategory;
  return CATEGORY_BADGES[key] ?? 'badge-purple';
}

/** Get the reserve % for a category */
export function getCategoryReserve(category: string): number {
  const key = category.toLowerCase() as MaterialCategory;
  return CATEGORY_RESERVES[key] ?? 0.10;
}

/** Find which group a category belongs to */
export function getCategoryGroup(category: string): CategoryGroupKey {
  const key = category.toLowerCase();
  for (const [groupKey, group] of Object.entries(CATEGORY_GROUPS)) {
    if (group.categories.includes(key as MaterialCategory)) {
      return groupKey as CategoryGroupKey;
    }
  }
  return 'other';
}

/**
 * Normalize a freeform category string to a canonical MaterialCategory.
 * Handles AI-generated categories, mixed case, plurals, and common synonyms.
 */
export function normalizeCategory(raw: string): MaterialCategory {
  if (!raw) return 'misc';

  const lower = raw.toLowerCase().trim();

  // Exact match
  if (MATERIAL_CATEGORIES.includes(lower as MaterialCategory)) {
    return lower as MaterialCategory;
  }

  // Synonym / fuzzy match table
  const SYNONYMS: Record<string, MaterialCategory> = {
    // Hardscape synonyms
    pavers: 'paver', paving: 'paver', flagstone: 'stone', cobblestone: 'stone',
    bluestone: 'stone', travertine: 'stone', slate: 'stone', granite: 'stone',
    marble: 'stone', limestone: 'stone', sandstone: 'stone', fieldstone: 'stone',
    tiles: 'tile', porcelain: 'tile', ceramic: 'tile',
    bricks: 'brick', masonry: 'brick',
    cement: 'concrete', mortar: 'concrete', rebar: 'concrete',
    // Aggregate synonyms
    'river rock': 'gravel', 'pea gravel': 'gravel', aggregate: 'gravel',
    'decomposed granite': 'gravel', 'crushed stone': 'gravel', rock: 'gravel', rocks: 'gravel',
    'mason sand': 'sand', 'play sand': 'sand', 'fill sand': 'sand',
    topsoil: 'soil', 'garden soil': 'soil', compost: 'soil', 'fill dirt': 'soil', dirt: 'soil',
    // Softscape synonyms
    turf: 'sod', grass: 'sod',
    'grass seed': 'seed', seeds: 'seed', overseeding: 'seed',
    'wood mulch': 'mulch', 'rubber mulch': 'mulch', bark: 'mulch', 'wood chips': 'mulch',
    border: 'edging', borders: 'edging', 'landscape edging': 'edging',
    // Plant synonyms
    plants: 'plant', perennial: 'plant', perennials: 'plant',
    annual: 'plant', annuals: 'plant', flower: 'plant', flowers: 'plant',
    groundcover: 'plant', 'ground cover': 'plant', vine: 'plant', vines: 'plant',
    fern: 'plant', ferns: 'plant', ornamental: 'plant',
    shrubs: 'shrub', bush: 'shrub', bushes: 'shrub', hedge: 'shrub', hedges: 'shrub',
    boxwood: 'shrub', azalea: 'shrub', holly: 'shrub',
    trees: 'tree', sapling: 'tree', saplings: 'tree', 'shade tree': 'tree',
    'ornamental tree': 'tree', 'fruit tree': 'tree', palm: 'tree',
    // Systems synonyms
    lights: 'lighting', 'landscape lighting': 'lighting', 'path light': 'lighting',
    'path lights': 'lighting', spotlight: 'lighting', floodlight: 'lighting', led: 'lighting',
    'drip line': 'irrigation', sprinkler: 'irrigation', sprinklers: 'irrigation',
    'drip irrigation': 'irrigation', 'drip system': 'irrigation', timer: 'irrigation',
    // Structural synonyms
    wood: 'lumber', timber: 'lumber', 'pressure treated': 'lumber',
    plywood: 'lumber', beam: 'lumber', beams: 'lumber', 'fence post': 'lumber',
    decking: 'lumber', pergola: 'lumber', 'retaining wall': 'lumber',
    // Catch-all patterns
    pipe: 'irrigation', tubing: 'irrigation', valve: 'irrigation',
    fabric: 'misc', 'landscape fabric': 'misc', 'weed barrier': 'misc',
    adhesive: 'misc', sealant: 'misc', 'polymeric sand': 'misc',
    'geotextile': 'misc', membrane: 'misc', drain: 'misc', drainage: 'misc',
  };

  // Direct synonym match
  if (SYNONYMS[lower]) return SYNONYMS[lower];

  // Partial match: check if any synonym key is contained in the input
  for (const [synonym, category] of Object.entries(SYNONYMS)) {
    if (lower.includes(synonym) || synonym.includes(lower)) {
      return category;
    }
  }

  return 'misc';
}

// ── Supplier Match Scoring ───────────────────────────────────────────────────

export interface SupplierMatchScore {
  supplierId: string;
  supplierName: string;
  score: number;          // 0–1 composite score
  declaredMatch: boolean; // supplier declared this category
  quoteCount: number;     // past quotes with materials in this category
  acceptRate: number;     // % of quotes accepted (0–1)
}

interface QuoteHistoryEntry {
  supplierId: string;
  category: string;
  status: string; // 'accepted' | 'declined' | 'sent' | 'received' | etc.
}

/**
 * Score suppliers for a given category based on:
 * - Declared categories (what they say they carry) — weight: 0.5
 * - Quote history (what they've been quoted on)    — weight: 0.3
 * - Acceptance rate (reliability signal)           — weight: 0.2
 *
 * Early on, declared categories dominate. As quote data accumulates,
 * the learned signals take over.
 */
export function scoreSuppliers(
  category: MaterialCategory,
  suppliers: { id: string; name: string; isActive: boolean; categories: MaterialCategory[] }[],
  quoteHistory: QuoteHistoryEntry[] = [],
): SupplierMatchScore[] {
  const activeSuppliers = suppliers.filter((s) => s.isActive);

  return activeSuppliers
    .map((supplier) => {
      // 1. Declared match (0 or 1)
      const declaredMatch = supplier.categories.includes(category);
      const declaredScore = declaredMatch ? 1.0 : 0.0;

      // 2. Quote history for this supplier + category
      const supplierQuotes = quoteHistory.filter(
        (q) => q.supplierId === supplier.id && q.category === category
      );
      const quoteCount = supplierQuotes.length;
      // Normalize: 5+ quotes = full score, scales linearly
      const quoteScore = Math.min(quoteCount / 5, 1.0);

      // 3. Acceptance rate
      const acceptedQuotes = supplierQuotes.filter((q) => q.status === 'accepted').length;
      const respondedQuotes = supplierQuotes.filter(
        (q) => q.status === 'accepted' || q.status === 'declined'
      ).length;
      const acceptRate = respondedQuotes > 0 ? acceptedQuotes / respondedQuotes : 0.5; // neutral default

      // Composite score (weighted)
      const score =
        declaredScore * 0.5 +
        quoteScore * 0.3 +
        acceptRate * 0.2;

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        score,
        declaredMatch,
        quoteCount,
        acceptRate,
      };
    })
    .filter((s) => s.score > 0) // exclude suppliers with zero relevance
    .sort((a, b) => b.score - a.score); // highest score first
}

/**
 * Score suppliers for a category group (multiple categories).
 * Returns suppliers that match ANY category in the group, scored by best category match.
 */
export function scoreSuppliersForGroup(
  groupKey: CategoryGroupKey,
  suppliers: { id: string; name: string; isActive: boolean; categories: MaterialCategory[] }[],
  quoteHistory: QuoteHistoryEntry[] = [],
): SupplierMatchScore[] {
  const group = CATEGORY_GROUPS[groupKey];
  if (!group) return [];

  // Score each supplier across all categories in the group, take best score
  const supplierScores = new Map<string, SupplierMatchScore>();

  for (const category of group.categories) {
    const scores = scoreSuppliers(category, suppliers, quoteHistory);
    for (const score of scores) {
      const existing = supplierScores.get(score.supplierId);
      if (!existing || score.score > existing.score) {
        supplierScores.set(score.supplierId, {
          ...score,
          quoteCount: (existing?.quoteCount ?? 0) + score.quoteCount,
        });
      }
    }
  }

  return Array.from(supplierScores.values()).sort((a, b) => b.score - a.score);
}

// ── Reserve Learning ────────────────────────────────────────────────────────

/**
 * Calculate a refined reserve % for a category based on historical usage data.
 * Uses exponential moving average: new_reserve = alpha * observed_waste + (1-alpha) * current_reserve
 * Alpha = 0.3 gives moderate weight to recent data while respecting the baseline.
 */
export function computeRefinedReserve(
  category: MaterialCategory,
  usageHistory: { estimated: number; actual: number }[],
  alpha: number = 0.3,
): number {
  const baseReserve = CATEGORY_RESERVES[category] ?? 0.10;
  if (usageHistory.length === 0) return baseReserve;

  // Calculate observed waste rate from history
  const totalEstimated = usageHistory.reduce((s, u) => s + u.estimated, 0);
  const totalActual = usageHistory.reduce((s, u) => s + u.actual, 0);
  if (totalEstimated === 0) return baseReserve;

  const observedWaste = Math.max(0, (totalEstimated - totalActual) / totalActual);

  // Blend: weight toward observed data as history grows
  const historyWeight = Math.min(usageHistory.length / 10, 1.0); // full weight at 10+ data points
  const effectiveAlpha = alpha * historyWeight;

  return effectiveAlpha * observedWaste + (1 - effectiveAlpha) * baseReserve;
}

// ── Utilities ────────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
