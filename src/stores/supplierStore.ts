import { create } from 'zustand'
import type { Supplier, SupplierPrice, MaterialCategory } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

interface SupplierStore {
  suppliers: Supplier[]
  supplierPrices: SupplierPrice[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchSuppliers: () => Promise<void>
  addSupplier: (supplier: Partial<Supplier>) => Promise<Supplier | null>
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>

  fetchSupplierPrices: (materialId?: string) => Promise<void>
  upsertSupplierPrice: (price: Partial<SupplierPrice>) => Promise<void>
  deleteSupplierPrice: (id: string) => Promise<void>

  // Selectors
  getSupplierById: (id: string) => Supplier | undefined
  getSuppliersForCategory: (category: MaterialCategory) => Supplier[]
  getPricesForMaterial: (materialId: string) => SupplierPrice[]
  getPreferredSupplier: (materialId: string) => SupplierPrice | undefined

  reset: () => void
}

export const useSupplierStore = create<SupplierStore>()(
  (set, get) => ({
    suppliers: [],
    supplierPrices: [],
    isLoading: false,
    error: null,

    reset: () => set({ suppliers: [], supplierPrices: [], isLoading: false, error: null }),

    // ── Supplier CRUD ─────────────────────────────────────────────────────

    fetchSuppliers: async () => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      set({ isLoading: true, error: null })
      try {
        const suppliers = await db.fetchSuppliers(orgId)
        set({ suppliers, isLoading: false })
      } catch (err: unknown) {
        set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to load suppliers' })
      }
    },

    addSupplier: async (supplierData) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return null
      try {
        const result = await db.createSupplier(orgId, supplierData)
        if (!result) {
          set({ error: 'Failed to create supplier.' })
          return null
        }
        // Refresh list from DB for consistency
        await get().fetchSuppliers()
        return result
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to create supplier' })
        return null
      }
    },

    updateSupplier: async (id, updates) => {
      // Optimistic update
      set((state) => ({
        suppliers: state.suppliers.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }))
      try {
        const result = await db.updateSupplier(id, updates)
        if (!result) {
          set({ error: 'Failed to update supplier.' })
          await get().fetchSuppliers() // Revert on failure
        }
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to update supplier' })
        await get().fetchSuppliers()
      }
    },

    deleteSupplier: async (id) => {
      try {
        const success = await db.deleteSupplier(id)
        if (!success) {
          set({ error: 'Failed to delete supplier.' })
          return
        }
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
          // Also remove any prices from this supplier
          supplierPrices: state.supplierPrices.filter((sp) => sp.supplierId !== id),
        }))
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to delete supplier' })
      }
    },

    // ── Supplier Prices ────────────────────────────────────────────────────

    fetchSupplierPrices: async (materialId?) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      try {
        const prices = await db.fetchSupplierPrices(orgId, materialId)
        if (materialId) {
          // Merge: replace prices for this material, keep others
          set((state) => ({
            supplierPrices: [
              ...state.supplierPrices.filter((sp) => sp.materialId !== materialId),
              ...prices,
            ],
          }))
        } else {
          set({ supplierPrices: prices })
        }
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to load supplier prices' })
      }
    },

    upsertSupplierPrice: async (priceData) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      try {
        const result = await db.upsertSupplierPrice(orgId, priceData)
        if (!result) {
          set({ error: 'Failed to save supplier price.' })
          return
        }
        // Auto-record price history on successful upsert
        if (priceData.materialId && priceData.supplierId && priceData.unitCost !== undefined) {
          await db.recordPriceHistory(orgId, priceData.materialId, priceData.supplierId, priceData.unitCost, 'manual')
        }
        // Refresh prices for this material
        if (priceData.materialId) {
          await get().fetchSupplierPrices(priceData.materialId)
        }
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to save supplier price' })
      }
    },

    deleteSupplierPrice: async (id) => {
      try {
        const success = await db.deleteSupplierPrice(id)
        if (!success) {
          set({ error: 'Failed to delete supplier price.' })
          return
        }
        set((state) => ({
          supplierPrices: state.supplierPrices.filter((sp) => sp.id !== id),
        }))
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Failed to delete supplier price' })
      }
    },

    // ── Selectors ─────────────────────────────────────────────────────────

    getSupplierById: (id) =>
      get().suppliers.find((s) => s.id === id),

    getSuppliersForCategory: (category) =>
      get().suppliers.filter((s) =>
        s.isActive && s.categories.includes(category)
      ),

    getPricesForMaterial: (materialId) =>
      get().supplierPrices.filter((sp) => sp.materialId === materialId),

    getPreferredSupplier: (materialId) =>
      get().supplierPrices.find((sp) => sp.materialId === materialId && sp.isPreferred),
  })
)
