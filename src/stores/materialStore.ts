import { create } from 'zustand'
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
  })
)
