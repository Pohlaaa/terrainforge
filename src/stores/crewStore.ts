import { create } from 'zustand'
import type { CrewMember } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

interface CrewStore {
  crew: CrewMember[]
  isLoading: boolean
  error: string | null
  reset: () => void
  addCrewMember: (member: Omit<CrewMember, 'id'>) => Promise<void>
  updateCrewMember: (id: string, updates: Partial<CrewMember>) => Promise<void>
  deleteCrewMember: (id: string) => Promise<void>
  getAvailableToday: () => CrewMember[]
  getBySkill: (skill: string) => CrewMember[]
  fetchCrew: () => Promise<void>
  setCrew: (crew: CrewMember[]) => void
}

export const useCrewStore = create<CrewStore>()(
  (set, get) => ({
    crew: [],
    isLoading: false,
    error: null,
    reset: () => set({ crew: [], isLoading: false, error: null }),
    setCrew: (crew) => set({ crew }),
    fetchCrew: async () => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      set({ isLoading: true, error: null })
      try {
        const crew = await db.fetchCrew(orgId)
        set({ crew, isLoading: false })
      } catch (err: unknown) {
        set({ isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    addCrewMember: async (memberData) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      const newMember: CrewMember = {
        ...memberData,
        id: crypto.randomUUID(),
      }
      set((state) => ({ crew: [...state.crew, newMember] }))
      try {
        const result = await db.createCrewMember(memberData, newMember.id, orgId)
        if (!result) console.error('addCrewMember: createCrewMember returned null — Supabase write failed')
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    updateCrewMember: async (id, updates) => {
      set((state) => ({
        crew: state.crew.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }))
      try {
        await db.updateCrewMember(id, updates)
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    deleteCrewMember: async (id) => {
      set((state) => ({
        crew: state.crew.filter((m) => m.id !== id),
      }))
      try {
        await db.deleteCrewMember(id)
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    getAvailableToday: () => {
      const today = new Date()
      const dayKeys: (keyof CrewMember['availability'])[] = [
        'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
      ]
      const todayKey = dayKeys[today.getDay()]
      const todayISO = today.toISOString().split('T')[0]
      return get().crew.filter((m) =>
        m.availability[todayKey] &&
        !(m.bookedDates ?? []).includes(todayISO)
      )
    },
    getBySkill: (skill) => {
      return get().crew.filter((m) => m.skills.includes(skill))
    },
  })
)
