import { create } from 'zustand'
import type { Material, PriceHistoryEntry } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

export interface BulkImportProgress {
  imported: number
  total: number
  failed: number
}

export interface BulkImportResult {
  imported: number
  failed: number
  failedRows: Array<{ index: number; error: string }>
}

interface MaterialStore {
  materials: Material[]
  isLoading: boolean
  error: string | null
  reset: () => void
  addMaterial: (material: Omit<Material, 'id'>) => Promise<void>
  /**
   * F-045: Bulk insert in chunks. Replaces the CSV importer's sequential
   * for-await loop that silently failed past ~50 rows. Chunks of 100, up
   * to 2 retries on throttle / transient errors with exponential backoff.
   */
  bulkImportMaterials: (
    materials: Array<Omit<Material, 'id'>>,
    onProgress?: (p: BulkImportProgress) => void,
  ) => Promise<BulkImportResult>
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>
  deleteMaterial: (id: string) => Promise<void>
  getMaterialById: (id: string) => Material | undefined
  getMaterialsByCategory: (category: string) => Material[]
  adjustStock: (id: string, qty: number) => Promise<void>
  searchMaterials: (query: string) => Material[]
  fetchMaterials: () => Promise<void>
  setMaterials: (materials: Material[]) => void
  fetchPriceHistory: (materialId: string, supplierId?: string, limit?: number) => Promise<PriceHistoryEntry[]>
}

const BULK_CHUNK_SIZE = 100
const BULK_MAX_RETRIES = 2
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const useMaterialStore = create<MaterialStore>()(
  (set, get) => ({
    materials: [],
    isLoading: false,
    error: null,
    reset: () => set({ materials: [], isLoading: false, error: null }),
    setMaterials: (materials) => set({ materials }),
    fetchMaterials: async () => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      set({ isLoading: true, error: null })
      try {
        const materials = await db.fetchMaterials(orgId)
        set({ materials, isLoading: false })
      } catch (err: unknown) {
        set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    addMaterial: async (materialData) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      const newMaterial: Material = {
        ...materialData,
        id: crypto.randomUUID(),
      }
      set((state) => ({ materials: [...state.materials, newMaterial] }))
      try {
        const result = await db.createMaterial(materialData, newMaterial.id, orgId)
        if (!result) {
          set((state) => ({
            materials: state.materials.filter((m) => m.id !== newMaterial.id),
            error: 'Failed to save material. Please try again.'
          }))
          return
        }
        await get().fetchMaterials()
      } catch (err: unknown) {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== newMaterial.id),
          error: err instanceof Error ? err.message : 'Unknown error'
        }))
      }
    },
    bulkImportMaterials: async (materials, onProgress) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) {
        return { imported: 0, failed: materials.length, failedRows: materials.map((_, index) => ({ index, error: 'No organization context' })) }
      }

      // Pre-assign client-side UUIDs so we know which row succeeded / failed.
      const withIds = materials.map((material, index) => ({
        index,
        material,
        id: crypto.randomUUID(),
      }))

      let imported = 0
      const failedRows: Array<{ index: number; error: string }> = []

      for (let i = 0; i < withIds.length; i += BULK_CHUNK_SIZE) {
        const chunk = withIds.slice(i, i + BULK_CHUNK_SIZE)
        let lastErr: Error | null = null
        let success = false

        for (let attempt = 0; attempt <= BULK_MAX_RETRIES; attempt++) {
          try {
            await db.createMaterialsBulk(
              chunk.map((c) => ({ material: c.material, id: c.id })),
              orgId,
            )
            imported += chunk.length
            success = true
            break
          } catch (err: unknown) {
            lastErr = err instanceof Error ? err : new Error(String(err))
            // Exponential backoff on transient failure (rate-limits, network blips).
            // Supabase surfaces these as 429 / 503 / status 0.
            const delay = 400 * Math.pow(2, attempt)
            await sleep(delay)
          }
        }

        if (!success && lastErr) {
          // Whole chunk failed — mark every row in it as failed with the error.
          for (const c of chunk) {
            failedRows.push({ index: c.index, error: lastErr.message })
          }
        }

        onProgress?.({
          imported,
          total: withIds.length,
          failed: failedRows.length,
        })
      }

      // Single reconciling fetch at the end — this is a huge win over the old
      // per-row fetchMaterials() which made the import O(N^2) in network calls.
      await get().fetchMaterials()

      return { imported, failed: failedRows.length, failedRows }
    },

    updateMaterial: async (id, updates) => {
      set((state) => ({
        materials: state.materials.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }))
      try {
        await db.updateMaterial(id, updates)
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    deleteMaterial: async (id) => {
      try {
        const success = await db.deleteMaterial(id)
        if (!success) {
          set({ error: 'Failed to delete material. Please try again.' })
          return
        }
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        }))
        await get().fetchMaterials()
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    getMaterialById: (id) =>
      get().materials.find((m) => m.id === id),
    getMaterialsByCategory: (category) =>
      get().materials.filter((m) => m.category === category),
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
        } catch (err: unknown) {
          set({ error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }
    },
    searchMaterials: (query) => {
      const lowerQuery = query.toLowerCase()
      return get().materials.filter((m) =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.category.toLowerCase().includes(lowerQuery) ||
        m.notes.toLowerCase().includes(lowerQuery)
      )
    },
    fetchPriceHistory: async (materialId, supplierId, limit = 50) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return []
      return db.fetchPriceHistory(orgId, materialId, supplierId, limit)
    },
  })
)
