import { create } from 'zustand'
import type { CrewMember } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'
import { toast } from '@/hooks/useToast'

interface CrewStore {
  crew: CrewMember[]
  isLoading: boolean
  error: string | null
  reset: () => void
  addCrewMember: (member: Omit<CrewMember, 'id'>) => Promise<CrewMember | null>
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
      if (!orgId) return null
      const newMember: CrewMember = {
        ...memberData,
        id: crypto.randomUUID(),
      }
      // Optimistic add
      set((state) => ({ crew: [...state.crew, newMember] }))
      try {
        const result = await db.createCrewMember(memberData, newMember.id, orgId)
        if (!result) {
          // Rollback — Supabase write silently failed (RLS, validation, etc.)
          set((state) => ({
            crew: state.crew.filter((m) => m.id !== newMember.id),
            error: 'Failed to save crew member. Please try again.',
          }))
          toast.error('Failed to save crew member. Please try again.')
          return null
        }
        // Reconcile with server (in case Supabase normalized fields)
        await get().fetchCrew()
        // Return the up-to-date copy from the refreshed list, falling back to
        // the optimistic copy if for some reason it isn't in the refreshed set.
        return get().crew.find((m) => m.id === newMember.id) ?? newMember
      } catch (err: unknown) {
        // Rollback on throw
        const msg = err instanceof Error ? err.message : 'Unknown error'
        set((state) => ({
          crew: state.crew.filter((m) => m.id !== newMember.id),
          error: msg,
        }))
        toast.error(`Failed to save crew member: ${msg}`)
        return null
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
