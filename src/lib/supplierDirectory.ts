/**
 * Supplier Directory — Common landscaping material suppliers
 *
 * Used by onboarding's AddSuppliersStep AND the Materials → Suppliers tab
 * (SupplierFormModal autocomplete). Closes jbluhm V6 P1 ask:
 *   > "Supplier search returns small landscape services [...] I want
 *   > Gertens, Site One, Frador, Bachmans, Rock Hard."
 *
 * Mix of national distributors, regional Twin Cities suppliers (jbluhm's
 * area), and big-box retailers. Living catalog — additions encouraged
 * as new operators / contractors call out missing entries.
 *
 * Each entry is metadata-only — no live API integration. The "Sprint
 * Provider Catalog Phase 2" follow-up adds real per-supplier pricing
 * via supplier APIs (where they exist) or scraped quote forms.
 */

import type { MaterialCategory } from '@/types'

export interface SupplierSuggestion {
  name: string
  website: string
  categories: MaterialCategory[]
  description: string
  /** Optional region tag — surfaces "Twin Cities" / "Southeast US" etc.
   *  in the picker. National chains have no region tag. */
  region?: string
  /** Short reference label visible in the autocomplete. Optional —
   *  defaults to the first 24 chars of `description`. */
  badge?: string
}

/**
 * Directory of well-known landscaping material suppliers
 * Mix of national chains, specialty suppliers, and big-box
 */
export const SUPPLIER_DIRECTORY: SupplierSuggestion[] = [
  // ── Hardscape / Masonry Suppliers ─────────────────────────────
  {
    name: 'Belgard (Oldcastle APG)',
    website: 'belgard.com',
    categories: ['paver', 'stone', 'brick', 'edging'],
    description: 'Leading paver and hardscape manufacturer',
  },
  {
    name: 'Unilock',
    website: 'unilock.com',
    categories: ['paver', 'stone', 'brick', 'edging'],
    description: 'Premium concrete pavers and retaining walls',
  },
  {
    name: 'Techo-Bloc',
    website: 'techo-bloc.com',
    categories: ['paver', 'stone', 'edging', 'concrete'],
    description: 'Design-forward pavers, slabs, and walls',
  },
  {
    name: 'Tremron',
    website: 'tremron.com',
    categories: ['paver', 'stone', 'brick', 'edging'],
    description: 'Pavers, retaining walls, and fire pits',
  },
  {
    name: 'Pavestone',
    website: 'pavestone.com',
    categories: ['paver', 'stone', 'brick', 'edging'],
    description: 'Concrete pavers and masonry products',
  },
  {
    name: 'EP Henry',
    website: 'ephenry.com',
    categories: ['paver', 'stone', 'edging', 'concrete'],
    description: 'Hardscape products, pavers, and walls',
  },
  {
    name: 'Natural Stone Veneers International',
    website: 'nsvi.com',
    categories: ['stone', 'brick'],
    description: 'Manufactured stone veneer products',
  },
  {
    name: 'Eldorado Stone',
    website: 'eldoradostone.com',
    categories: ['stone', 'brick'],
    description: 'Architectural stone and brick veneers',
  },

  // ── Aggregate & Bulk Materials ────────────────────────────────
  {
    name: 'Vulcan Materials',
    website: 'vulcanmaterials.com',
    categories: ['gravel', 'sand', 'concrete'],
    description: 'Largest US producer of aggregates',
  },
  {
    name: 'Martin Marietta',
    website: 'martinmarietta.com',
    categories: ['gravel', 'sand', 'concrete'],
    description: 'Aggregates, cement, and ready-mix',
  },
  {
    name: 'Lehigh Hanson',
    website: 'lehighhanson.com',
    categories: ['gravel', 'sand', 'concrete'],
    description: 'Aggregates, cement, and concrete',
  },
  {
    name: 'U.S. Concrete',
    website: 'us-concrete.com',
    categories: ['concrete', 'gravel', 'sand'],
    description: 'Ready-mix concrete and aggregates',
  },
  {
    name: 'Quikrete',
    website: 'quikrete.com',
    categories: ['concrete', 'sand', 'gravel'],
    description: 'Packaged concrete and cement mixes',
  },

  // ── Nursery / Plants / Softscape ──────────────────────────────
  {
    name: 'SiteOne Landscape Supply',
    website: 'siteone.com',
    categories: ['sod', 'seed', 'mulch', 'soil', 'plant', 'shrub', 'tree', 'irrigation', 'lighting', 'edging'],
    description: 'Largest landscape supply distributor in US',
  },
  {
    name: 'Ewing Irrigation & Landscape Supply',
    website: 'ewingirrigation.com',
    categories: ['irrigation', 'lighting', 'plant', 'shrub', 'mulch', 'soil'],
    description: 'Irrigation, landscape, and outdoor lighting',
  },
  {
    name: 'Horizon Distributors',
    website: 'horizononline.com',
    categories: ['irrigation', 'lighting', 'plant', 'seed', 'mulch', 'soil'],
    description: 'Landscape and irrigation products',
  },
  {
    name: 'Seed Superstore',
    website: 'seedsuperstore.com',
    categories: ['seed', 'soil'],
    description: 'Professional grass seed and turf products',
  },
  {
    name: 'Super-Sod',
    website: 'supersod.com',
    categories: ['sod', 'seed', 'soil'],
    description: 'Sod, seed, and soil amendments',
  },

  // ── Mulch / Soil / Organic ────────────────────────────────────
  {
    name: 'Garick Corporation',
    website: 'garick.com',
    categories: ['mulch', 'soil', 'sand'],
    description: 'Mulch, soils, and landscape materials',
  },
  {
    name: 'Oldcastle APG',
    website: 'oldcastleapg.com',
    categories: ['mulch', 'soil', 'paver', 'stone', 'edging'],
    description: 'Landscape and hardscape products',
  },

  // ── Irrigation ────────────────────────────────────────────────
  {
    name: 'Rain Bird',
    website: 'rainbird.com',
    categories: ['irrigation'],
    description: 'Irrigation systems and controllers',
  },
  {
    name: 'Hunter Industries',
    website: 'hunterindustries.com',
    categories: ['irrigation', 'lighting'],
    description: 'Irrigation and landscape lighting',
  },
  {
    name: 'Netafim',
    website: 'netafimusa.com',
    categories: ['irrigation'],
    description: 'Drip irrigation and micro-irrigation',
  },
  {
    name: 'Toro Irrigation',
    website: 'toro.com',
    categories: ['irrigation'],
    description: 'Sprinklers, controllers, and valves',
  },

  // ── Lighting ──────────────────────────────────────────────────
  {
    name: 'FX Luminaire',
    website: 'fxl.com',
    categories: ['lighting'],
    description: 'Professional landscape lighting',
  },
  {
    name: 'Kichler Landscape Lighting',
    website: 'kichler.com',
    categories: ['lighting'],
    description: 'LED landscape and path lighting',
  },
  {
    name: 'WAC Lighting',
    website: 'waclighting.com',
    categories: ['lighting'],
    description: 'Architectural and landscape LED lighting',
  },

  // ── Lumber / Structural ───────────────────────────────────────
  {
    name: '84 Lumber',
    website: '84lumber.com',
    categories: ['lumber'],
    description: 'Lumber and building materials',
  },
  {
    name: 'Trex',
    website: 'trex.com',
    categories: ['lumber'],
    description: 'Composite decking and railing',
  },
  {
    name: 'TimberTech / AZEK',
    website: 'timbertech.com',
    categories: ['lumber'],
    description: 'Composite and PVC decking',
  },

  // ── Twin Cities / Upper Midwest regional (jbluhm V6) ──────────
  {
    name: 'Gertens',
    website: 'gertens.com',
    categories: ['plant', 'shrub', 'tree', 'sod', 'mulch', 'soil', 'seed', 'edging', 'irrigation', 'lighting', 'gravel', 'sand', 'misc'],
    description: 'Full-line landscape and garden supplier — Inver Grove Heights, MN',
    region: 'Twin Cities',
  },
  {
    name: 'Frador',
    website: 'frador.com',
    categories: ['paver', 'stone', 'brick', 'edging', 'concrete'],
    description: 'Stone, paver, and hardscape supplier — Twin Cities',
    region: 'Twin Cities',
  },
  {
    name: 'Bachman’s',
    website: 'bachmans.com',
    categories: ['plant', 'shrub', 'tree', 'sod', 'mulch', 'soil', 'seed'],
    description: 'Greenhouse + nursery — Minneapolis-St. Paul',
    region: 'Twin Cities',
  },
  {
    name: 'Rock Hard Landscape Supply',
    website: 'rockhardlandscape.com',
    categories: ['gravel', 'stone', 'paver', 'mulch', 'soil', 'sand', 'edging'],
    description: 'Bulk landscape rock, mulch, and pavers — Twin Cities',
    region: 'Twin Cities',
  },
  {
    name: 'Hedberg Landscape & Masonry Supplies',
    website: 'hedbergsupplies.com',
    categories: ['paver', 'stone', 'brick', 'gravel', 'sand', 'mulch', 'soil', 'edging'],
    description: 'Hardscape, masonry, and bulk materials — Twin Cities',
    region: 'Twin Cities',
  },
  {
    name: 'Plaisted Companies',
    website: 'plaistedcompanies.com',
    categories: ['gravel', 'sand', 'soil', 'mulch'],
    description: 'Aggregates and topsoil — Twin Cities',
    region: 'Twin Cities',
  },

  // ── Big Box / General ─────────────────────────────────────────
  {
    name: 'Home Depot Pro',
    website: 'homedepot.com',
    categories: ['paver', 'stone', 'mulch', 'soil', 'gravel', 'sand', 'lumber', 'concrete', 'irrigation', 'lighting', 'edging', 'misc'],
    description: 'Pro desk for contractor accounts',
  },
  {
    name: "Lowe's Pro Supply",
    website: 'lowes.com',
    categories: ['paver', 'stone', 'mulch', 'soil', 'gravel', 'sand', 'lumber', 'concrete', 'irrigation', 'lighting', 'edging', 'misc'],
    description: 'Contractor supply and pro services',
  },
  {
    name: "Menard's",
    website: 'menards.com',
    categories: ['paver', 'stone', 'mulch', 'soil', 'lumber', 'concrete', 'lighting', 'misc'],
    description: 'Building materials and landscaping',
  },
]

/**
 * Search suppliers by name, category, region, or description.
 *
 * Token-aware: a query like "rock hard" is split into ["rock", "hard"]
 * and an entry must match every token to be a candidate. This lets
 * partial-name searches resolve cleanly without inadvertent description
 * collisions. Exact substring matches on the full name still get the
 * highest score (Sprint Provider Catalog).
 */
export function searchSuppliers(query: string, limit = 10): SupplierSuggestion[] {
  if (!query || query.trim().length < 1) return SUPPLIER_DIRECTORY.slice(0, limit)

  const normalized = query.toLowerCase().trim()
  const tokens = normalized.split(/\s+/).filter(Boolean)

  const scored = SUPPLIER_DIRECTORY.map((s) => {
    const nameLc = s.name.toLowerCase()
    const descLc = s.description.toLowerCase()
    const regionLc = (s.region ?? '').toLowerCase()
    const haystack = `${nameLc} ${descLc} ${regionLc} ${s.categories.join(' ')}`

    // Reject the entry if not every token shows up somewhere.
    if (!tokens.every((t) => haystack.includes(t))) return { s, score: 0 }

    let score = 0
    if (nameLc.includes(normalized)) score += 20 // full-phrase name hit
    for (const t of tokens) {
      if (nameLc.includes(t)) score += 10
      else if (descLc.includes(t)) score += 3
      else if (regionLc.includes(t)) score += 5
      else if (s.categories.some((c) => c.includes(t))) score += 5
    }
    return { s, score }
  })

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s)
}

/**
 * Get suppliers that match a set of material categories
 */
export function getSuppliersForCategories(categories: MaterialCategory[]): SupplierSuggestion[] {
  return SUPPLIER_DIRECTORY.filter(s =>
    s.categories.some(c => categories.includes(c))
  )
}
