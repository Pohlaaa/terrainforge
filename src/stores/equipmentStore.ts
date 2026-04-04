import { create } from 'zustand'
import type { Equipment, MaintenanceEntry } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

interface EquipmentStore {
  equipment: Equipment[]
  isLoading: boolean
  error: string | null
  reset: () => void
  addEquipment: (equip: Omit<Equipment, 'id'>) => Promise<void>
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>
  deleteEquipment: (id: string) => Promise<void>
  addMaintenanceEntry: (equipId: string, entry: Omit<MaintenanceEntry, 'id'>) => Promise<void>
  getByStatus: (status: Equipment['status']) => Equipment[]
  getByType: (type: string) => Equipment[]
  getEquipmentAlerts: () => string[]
  fetchEquipment: () => Promise<void>
  setEquipment: (equipment: Equipment[]) => void
}

export const useEquipmentStore = create<EquipmentStore>()(
  (set, get) => ({
    equipment: [],
    isLoading: false,
    error: null,
    reset: () => set({ equipment: [], isLoading: false, error: null }),
    setEquipment: (equipment) => set({ equipment }),
    fetchEquipment: async () => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      set({ isLoading: true, error: null })
      try {
        const equipment = await db.fetchEquipment(orgId)
        set({ equipment, isLoading: false })
      } catch (err: unknown) {
        set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    addEquipment: async (equipData) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      const newEquipment: Equipment = {
        ...equipData,
        id: crypto.randomUUID(),
      }
      set((state) => ({ equipment: [...state.equipment, newEquipment] }))
      try {
        const result = await db.createEquipment(equipData, newEquipment.id, orgId)
        if (!result) {
          set((state) => ({
            equipment: state.equipment.filter((e) => e.id !== newEquipment.id),
            error: 'Failed to save equipment. Please try again.'
          }))
          return
        }
        await get().fetchEquipment()
      } catch (err: unknown) {
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== newEquipment.id),
          error: err instanceof Error ? err.message : 'Unknown error'
        }))
      }
    },
    updateEquipment: async (id, updates) => {
      set((state) => ({
        equipment: state.equipment.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      }))
      try {
        await db.updateEquipment(id, updates)
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    deleteEquipment: async (id) => {
      try {
        const success = await db.deleteEquipment(id)
        if (!success) {
          set({ error: 'Failed to delete equipment. Please try again.' })
          return
        }
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
        }))
        await get().fetchEquipment()
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    addMaintenanceEntry: async (equipId, entryData) => {
      const newEntry: MaintenanceEntry = {
        ...entryData,
        id: crypto.randomUUID(),
      }
      set((state) => ({
        equipment: state.equipment.map((e) =>
          e.id === equipId
            ? { ...e, maintenanceLog: [...e.maintenanceLog, newEntry] }
            : e
        ),
      }))
      try {
        await db.addMaintenanceEntry(equipId, entryData)
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    getByStatus: (status) =>
      get().equipment.filter((e) => e.status === status),
    getByType: (type) =>
      get().equipment.filter((e) => e.type === type),
    getEquipmentAlerts: () => {
      const alerts: string[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      get().equipment.forEach((eq) => {
        if (eq.insuranceExpiry) {
          const insExpiry = new Date(eq.insuranceExpiry)
          if (insExpiry < today) alerts.push(`${eq.name}: Insurance EXPIRED`)
        }
        if (eq.regExpiry) {
          const regExpiry = new Date(eq.regExpiry)
          if (regExpiry < today) alerts.push(`${eq.name}: Registration EXPIRED`)
        }
        if (eq.inspectionDue) {
          const inspDue = new Date(eq.inspectionDue)
          if (inspDue < today) alerts.push(`${eq.name}: Inspection OVERDUE`)
        }
        if (eq.serviceDueHours && eq.hours >= eq.serviceDueHours) {
          const hoursOver = eq.hours - eq.serviceDueHours
          alerts.push(`${eq.name}: Service OVERDUE by ${Math.round(hoursOver)} hours`)
        }
      })

      return alerts
    },
  })
)
