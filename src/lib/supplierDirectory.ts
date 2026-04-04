/**
 * Supplier Directory — Common landscaping material suppliers
 * Used by onboarding to suggest real businesses for quick-add
 * These are well-known national/regional suppliers in the landscaping industry
 */

import type { MaterialCategory } from '@/types'

export interface SupplierSuggestion {
  name: string
  website: string
  categories: MaterialCategory[]
  description: string
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
 * Search suppliers by name or category
 */
export function searchSuppliers(query: string, limit = 10): SupplierSuggestion[] {
  if (!query || query.length < 1) return SUPPLIER_DIRECTORY.slice(0, limit)

  const lower = query.toLowerCase()
  const scored = SUPPLIER_DIRECTORY.map(s => {
    let score = 0
    if (s.name.toLowerCase().includes(lower)) score += 10
    if (s.description.toLowerCase().includes(lower)) score += 3
    if (s.categories.some(c => c.includes(lower))) score += 5
    return { s, score }
  })

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.s)
}

/**
 * Get suppliers that match a set of material categories
 */
export function getSuppliersForCategories(categories: MaterialCategory[]): SupplierSuggestion[] {
  return SUPPLIER_DIRECTORY.filter(s =>
    s.categories.some(c => categories.includes(c))
  )
}
