import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Material } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

interface MaterialStore {
  materials: Material[]
  isLoading: boolean
  error: string | null
  reset: () => void
  addMaterial: (material: Omit<Material, 'id'>) => Promise<void>
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>
  deleteMaterial: (id: string) => Promise<void>
  getMaterialById: (id: string) => Material | undefined
  getMaterialsByCategory: (category: string) => Material[]
  adjustStock: (id: string, qty: number) => Promise<void>
  searchMaterials: (query: string) => Material[]
  fetchMaterials: () => Promise<void>
  setMaterials: (materials: Material[]) => void
}

const seedMaterials: Material[] = [
  {
    id: 'mat_001',
    name: 'Concrete Pavers',
    category: 'paver',
    unit: 'sqft',
    cost: 4.50,
    reserveOverride: null,
    coverage: 1,
    depthIn: null,
    notes: 'Standard concrete paver 12x12, grey finish',
    supplier_name: 'SRS Distribution',
    supplier_sku: 'CP-1212-GRY',
    supplier_phone: '(512) 555-0101',
    supplier_contact: 'Mike Johnson',
    lead_time_days: 3,
    price_update_date: '2026-03-20',
    supplier_notes: 'Stock available, free delivery on orders >2000 sqft',
    qtyOnHand: 2400,
    minStockLevel: 500,
    storageLocation: 'Warehouse A, Rack 12',
    lastRestocked: '2026-03-15',
  },
  {
    id: 'mat_002',
    name: 'Natural Flagstone',
    category: 'stone',
    unit: 'sqft',
    cost: 8.75,
    reserveOverride: null,
    coverage: 1,
    depthIn: null,
    notes: 'Random cut flagstone, natural finish, 1.5" thick',
    supplier_name: 'Stone Quarry Direct',
    supplier_sku: 'FS-RND-NAT',
    supplier_phone: '(512) 555-0102',
    supplier_contact: 'Sarah Miller',
    lead_time_days: 5,
    price_update_date: '2026-03-18',
    supplier_notes: 'Seasonal pricing, request quote for large orders',
    qtyOnHand: 800,
    minStockLevel: 200,
    storageLocation: 'Outdoor Yard B',
    lastRestocked: '2026-03-10',
  },
  {
    id: 'mat_003',
    name: 'Premium Sod (Bermuda)',
    category: 'sod',
    unit: 'sqft',
    cost: 0.85,
    reserveOverride: null,
    coverage: 1,
    depthIn: null,
    notes: 'Grade A Bermuda sod, pre-grown 1 year, healthy root system',
    supplier_name: 'Texas Sod Farms',
    supplier_sku: 'SOD-BRM-A',
    supplier_phone: '(512) 555-0103',
    supplier_contact: 'Tom Bradley',
    lead_time_days: 1,
    price_update_date: '2026-03-22',
    supplier_notes: 'Fresh cut daily, must install within 24 hours',
    qtyOnHand: 5000,
    minStockLevel: 1000,
    storageLocation: 'Sod Farm, Rack 1-5',
    lastRestocked: '2026-03-22',
  },
  {
    id: 'mat_004',
    name: 'Hardwood Mulch',
    category: 'mulch',
    unit: 'cuyd',
    cost: 45.00,
    reserveOverride: null,
    coverage: 108,
    depthIn: 3,
    notes: '3" depth coverage, 108 sqft per cubic yard, dark brown',
    supplier_name: 'Local Mulch Supply',
    supplier_sku: 'MUL-HWD-3',
    supplier_phone: '(512) 555-0104',
    supplier_contact: 'Robert Chen',
    lead_time_days: 2,
    price_update_date: '2026-03-21',
    supplier_notes: 'Volume pricing available, bulk delivery $50',
    qtyOnHand: 30,
    minStockLevel: 5,
    storageLocation: 'Warehouse B, Yard 2',
    lastRestocked: '2026-03-14',
  },
  {
    id: 'mat_005',
    name: 'Decomposed Granite',
    category: 'gravel',
    unit: 'ton',
    cost: 55.00,
    reserveOverride: null,
    coverage: 80,
    depthIn: 3,
    notes: '3" depth, crushed granite, drains well, natural tan',
    supplier_name: 'Granite Works TX',
    supplier_sku: 'GRAN-DEC-TAN',
    supplier_phone: '(512) 555-0105',
    supplier_contact: 'Linda Torres',
    lead_time_days: 2,
    price_update_date: '2026-03-19',
    supplier_notes: 'Quarry direct pricing, FOB pickup',
    qtyOnHand: 12,
    minStockLevel: 2,
    storageLocation: 'Outdoor Yard A',
    lastRestocked: '2026-03-12',
  },
  {
    id: 'mat_006',
    name: 'River Rock (3-5")',
    category: 'gravel',
    unit: 'ton',
    cost: 125.00,
    reserveOverride: null,
    coverage: 50,
    depthIn: 3,
    notes: '3" depth, polished river rock, 3-5" diameter, decorative',
    supplier_name: 'Stone Quarry Direct',
    supplier_sku: 'RR-3-5-POL',
    supplier_phone: '(512) 555-0102',
    supplier_contact: 'Sarah Miller',
    lead_time_days: 7,
    price_update_date: '2026-03-18',
    supplier_notes: 'Premium grade, ships from out of state',
    qtyOnHand: 8,
    minStockLevel: 1,
    storageLocation: 'Outdoor Yard C',
    lastRestocked: '2026-02-28',
  },
  {
    id: 'mat_007',
    name: 'Steel Edging',
    category: 'edging',
    unit: 'lnft',
    cost: 3.25,
    reserveOverride: null,
    coverage: 1,
    depthIn: null,
    notes: '5" height, powder-coated black, 10 ft sections',
    supplier_name: 'Landscape Supply Co',
    supplier_sku: 'EDGE-STL-5',
    supplier_phone: '(512) 555-0106',
    supplier_contact: 'James Wilson',
    lead_time_days: 3,
    price_update_date: '2026-03-20',
    supplier_notes: 'Stakes included, professional grade',
    qtyOnHand: 500,
    minStockLevel: 100,
    storageLocation: 'Warehouse A, Rack 8',
    lastRestocked: '2026-03-16',
  },
  {
    id: 'mat_008',
    name: 'Landscape Timbers',
    category: 'lumber',
    unit: 'each',
    cost: 8.50,
    reserveOverride: null,
    coverage: 8,
    depthIn: null,
    notes: '6x6 pressure-treated pine, 8ft length',
    supplier_name: 'Landscape Supply Co',
    supplier_sku: 'TIMB-6x6-PT',
    supplier_phone: '(512) 555-0106',
    supplier_contact: 'James Wilson',
    lead_time_days: 3,
    price_update_date: '2026-03-20',
    supplier_notes: '15+ year lifespan, standard construction grade',
    qtyOnHand: 60,
    minStockLevel: 10,
    storageLocation: 'Warehouse B, Rack 4',
    lastRestocked: '2026-03-17',
  },
  {
    id: 'mat_009',
    name: 'Boxwood (3gal)',
    category: 'shrub',
    unit: 'each',
    cost: 28.00,
    reserveOverride: null,
    coverage: null,
    depthIn: null,
    notes: 'Buxus microphylla, 2-3 ft height, container grown',
    supplier_name: 'Austin Native Nursery',
    supplier_sku: 'BOX-3GAL',
    supplier_phone: '(512) 555-0107',
    supplier_contact: 'Patricia Green',
    lead_time_days: 1,
    price_update_date: '2026-03-22',
    supplier_notes: 'Local propagation, healthy stock, seasonal availability',
    qtyOnHand: 40,
    minStockLevel: 5,
    storageLocation: 'Nursery Area, Section B',
    lastRestocked: '2026-03-22',
  },
  {
    id: 'mat_010',
    name: 'Japanese Maple (15gal)',
    category: 'tree',
    unit: 'each',
    cost: 185.00,
    reserveOverride: null,
    coverage: null,
    depthIn: null,
    notes: 'Acer palmatum dissectum, 8-10 ft mature height, specimen grade',
    supplier_name: 'Premier Tree Nursery',
    supplier_sku: 'JM-15GAL-DIS',
    supplier_phone: '(512) 555-0108',
    supplier_contact: 'Dr. Lisa Park',
    lead_time_days: 2,
    price_update_date: '2026-03-19',
    supplier_notes: 'Premium cultivar, rare color form available',
    qtyOnHand: 3,
    minStockLevel: 1,
    storageLocation: 'Nursery Area, Display',
    lastRestocked: '2026-03-15',
  },
  {
    id: 'mat_011',
    name: 'Perennial Mix (1gal)',
    category: 'plant',
    unit: 'each',
    cost: 12.50,
    reserveOverride: null,
    coverage: null,
    depthIn: null,
    notes: 'Mixed native perennials, 1 gal, assorted varieties',
    supplier_name: 'Austin Native Nursery',
    supplier_sku: 'PER-MIX-1',
    supplier_phone: '(512) 555-0107',
    supplier_contact: 'Patricia Green',
    lead_time_days: 1,
    price_update_date: '2026-03-22',
    supplier_notes: 'Seasonal mix varies, full sun to part shade varieties',
    qtyOnHand: 120,
    minStockLevel: 20,
    storageLocation: 'Nursery Area, Section A',
    lastRestocked: '2026-03-21',
  },
  {
    id: 'mat_012',
    name: 'Drip Irrigation Kit',
    category: 'irrigation',
    unit: 'each',
    cost: 85.00,
    reserveOverride: null,
    coverage: 400,
    depthIn: null,
    notes: '400 sqft coverage, includes drip tubing, emitters, timer',
    supplier_name: 'Ewing Irrigation',
    supplier_sku: 'DIP-KIT-400',
    supplier_phone: '(512) 555-0109',
    supplier_contact: 'Kevin Hayes',
    lead_time_days: 2,
    price_update_date: '2026-03-21',
    supplier_notes: 'Compatible with standard garden hose, all connectors included',
    qtyOnHand: 6,
    minStockLevel: 1,
    storageLocation: 'Warehouse A, Rack 15',
    lastRestocked: '2026-03-18',
  },
  {
    id: 'mat_013',
    name: 'Low-Voltage Path Light',
    category: 'lighting',
    unit: 'each',
    cost: 42.00,
    reserveOverride: null,
    coverage: null,
    depthIn: null,
    notes: 'LED, 12V, warm white, 100 lumen output, IP67 rated',
    supplier_name: 'Ewing Irrigation',
    supplier_sku: 'PATH-LED-12V',
    supplier_phone: '(512) 555-0109',
    supplier_contact: 'Kevin Hayes',
    lead_time_days: 1,
    price_update_date: '2026-03-22',
    supplier_notes: 'Weatherproof, 50,000 hr lifespan, solar charge option available',
    qtyOnHand: 24,
    minStockLevel: 4,
    storageLocation: 'Warehouse A, Rack 14',
    lastRestocked: '2026-03-20',
  },
  {
    id: 'mat_014',
    name: 'Polymeric Sand',
    category: 'sand',
    unit: 'bag',
    cost: 22.00,
    reserveOverride: null,
    coverage: 50,
    depthIn: null,
    notes: '50 lb bag, polymeric binder, water-activated, grey',
    supplier_name: 'SRS Distribution',
    supplier_sku: 'PS-50-GRY',
    supplier_phone: '(512) 555-0101',
    supplier_contact: 'Mike Johnson',
    lead_time_days: 2,
    price_update_date: '2026-03-20',
    supplier_notes: 'Pro-grade formula, resists weeds and ants',
    qtyOnHand: 30,
    minStockLevel: 5,
    storageLocation: 'Warehouse A, Rack 9',
    lastRestocked: '2026-03-19',
  },
  {
    id: 'mat_015',
    name: 'Paver Base (Class II)',
    category: 'gravel',
    unit: 'ton',
    cost: 38.00,
    reserveOverride: null,
    coverage: 65,
    depthIn: 4,
    notes: '4" depth coverage = 65 sqft per ton, crushed limestone',
    supplier_name: 'Granite Works TX',
    supplier_sku: 'BASE-CL2-LIM',
    supplier_phone: '(512) 555-0105',
    supplier_contact: 'Linda Torres',
    lead_time_days: 1,
    price_update_date: '2026-03-20',
    supplier_notes: 'Compacts well, local quarry source, bulk pricing available',
    qtyOnHand: 15,
    minStockLevel: 3,
    storageLocation: 'Outdoor Yard A',
    lastRestocked: '2026-03-20',
  },
  {
    id: 'mat_016',
    name: 'Weed Barrier Fabric',
    category: 'fabric',
    unit: 'sqft',
    cost: 0.35,
    reserveOverride: null,
    coverage: 1,
    depthIn: null,
    notes: '4 oz, landscape grade, 50 ft roll x 6 ft width',
    supplier_name: 'Landscape Supply Co',
    supplier_sku: 'WB-4OZ-ROLL',
    supplier_phone: '(512) 555-0106',
    supplier_contact: 'James Wilson',
    lead_time_days: 1,
    price_update_date: '2026-03-22',
    supplier_notes: 'UV-stabilized, permeable, prevents soil migration',
    qtyOnHand: 3000,
    minStockLevel: 500,
    storageLocation: 'Warehouse B, Rack 2',
    lastRestocked: '2026-03-21',
  },
]

export const useMaterialStore = create<MaterialStore>()(
  persist(
    (set, get) => ({
      materials: seedMaterials,
      isLoading: false,
      error: null,
      reset: () => set({ materials: [], isLoading: false, error: null }),
      setMaterials: (materials) => set({ materials }),
      fetchMaterials: async () => {
        set({ isLoading: true, error: null })
        try {
          const materials = await db.fetchMaterials()
          set({ materials, isLoading: false })
        } catch (err: any) {
          set({ isLoading: false, error: err.message })
        }
      },
      addMaterial: async (materialData) => {
        const orgId = useOrgStore.getState().org?.id
        if (!orgId) {
          console.error('addMaterial: no org_id available')
          return
        }
        const newMaterial: Material = {
          ...materialData,
          id: crypto.randomUUID(),
        }
        set((state) => ({ materials: [...state.materials, newMaterial] }))
        try {
          const result = await db.createMaterial(materialData, newMaterial.id, orgId)
          if (!result) console.error('addMaterial: createMaterial returned null — Supabase write failed')
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      updateMaterial: async (id, updates) => {
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }))
        try {
          await db.updateMaterial(id, updates)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      deleteMaterial: async (id) => {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        }))
        try {
          await db.deleteMaterial(id)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      getMaterialById: (id) => {
        return get().materials.find((m) => m.id === id)
      },
      getMaterialsByCategory: (category) => {
        return get().materials.filter((m) => m.category === category)
      },
      adjustStock: async (id, qty) => {
        const material = get().materials.find((m) => m.id === id)
        if (material) {
          set((state) => ({
            materials: state.materials.map((m) =>
              m.id === id ? { ...m, qtyOnHand: m.qtyOnHand + qty } : m
            ),
          }))
          try {
            await db.updateMaterial(id, { qtyOnHand: material.qtyOnHand + qty })
          } catch (err: any) {
            set((state) => ({ error: err.message }))
          }
        }
      },
      searchMaterials: (query) => {
        const lowerQuery = query.toLowerCase()
        return get().materials.filter((m) =>
          m.name.toLowerCase().includes(lowerQuery) ||
          m.category.toLowerCase().includes(lowerQuery) ||
          m.supplier_name.toLowerCase().includes(lowerQuery)
        )
      },
    }),
    {
      name: 'tf_materials',
    }
  )
)
