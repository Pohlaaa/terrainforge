import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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

const seedCrew: CrewMember[] = [
  {
    id: 'crew_001',
    name: 'Mike Reeves',
    role: 'foreman',
    skills: ['hardscape', 'concrete', 'grading', 'walls'],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
    maxProjects: 3,
    notes: 'Senior foreman, 15+ years experience, excellent safety record',
    bookedDates: ['2026-04-01', '2026-04-02', '2026-04-03'],
    certs: [
      { certId: 'cert-osha-10', label: 'OSHA 10 Hour', expiry: '2027-06-15' },
      { certId: 'cert-excavator', label: 'Excavator Operation', expiry: null },
    ],
  },
  {
    id: 'crew_002',
    name: 'Carlos Mendez',
    role: 'lead',
    skills: ['softscape', 'irrigation', 'sod', 'drainage'],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
    maxProjects: 2,
    notes: 'Landscape lead, specializes in irrigation and drainage design',
    bookedDates: ['2026-04-05', '2026-04-06'],
    certs: [
      { certId: 'cert-osha-10', label: 'OSHA 10 Hour', expiry: '2026-08-20' },
      { certId: 'cert-irrigation', label: 'Irrigation Technician', expiry: '2027-03-10' },
    ],
  },
  {
    id: 'crew_003',
    name: 'Jake Turner',
    role: 'installer',
    skills: ['hardscape', 'concrete', 'carpentry'],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
    maxProjects: 2,
    notes: 'Skilled hardscape installer, expert paver work',
    bookedDates: ['2026-04-08'],
    certs: [
      { certId: 'cert-osha-10', label: 'OSHA 10 Hour', expiry: '2026-05-01' },
    ],
  },
  {
    id: 'crew_004',
    name: 'Devon White',
    role: 'installer',
    skills: ['softscape', 'trees', 'sod', 'cleanup'],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
    maxProjects: 2,
    notes: 'Plantings specialist, excellent attention to detail',
    bookedDates: [],
    certs: [
      { certId: 'cert-pesticide-app', label: 'Pesticide Applicator License', expiry: '2026-12-31' },
    ],
  },
  {
    id: 'crew_005',
    name: 'Sarah Kim',
    role: 'specialist',
    skills: ['irrigation', 'lighting', 'drainage'],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
    maxProjects: 2,
    notes: 'Irrigation and outdoor lighting expert, licensed electrician',
    bookedDates: ['2026-04-10'],
    certs: [
      { certId: 'cert-electrician', label: 'Journeyman Electrician', expiry: '2027-09-15' },
      { certId: 'cert-irrigation', label: 'Irrigation Technician', expiry: '2026-10-20' },
    ],
  },
]

export const useCrewStore = create<CrewStore>()(
  persist(
    (set, get) => ({
      crew: seedCrew,
      isLoading: false,
      error: null,
      reset: () => set({ crew: [], isLoading: false, error: null }),
      setCrew: (crew) => set({ crew }),
      fetchCrew: async () => {
        set({ isLoading: true, error: null })
        try {
          const crew = await db.fetchCrew()
          set({ crew, isLoading: false })
        } catch (err: any) {
          set({ isLoading: false, error: err.message })
        }
      },
      addCrewMember: async (memberData) => {
        const orgId = useOrgStore.getState().org?.id
        if (!orgId) {
          console.error('addCrewMember: no org_id available')
          return
        }
        const newMember: CrewMember = {
          ...memberData,
          id: crypto.randomUUID(),
        }
        set((state) => ({ crew: [...state.crew, newMember] }))
        try {
          const result = await db.createCrewMember(memberData, newMember.id, orgId)
          if (!result) console.error('addCrewMember: createCrewMember returned null — Supabase write failed')
        } catch (err: any) {
          set((state) => ({ error: err.message }))
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
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      deleteCrewMember: async (id) => {
        set((state) => ({
          crew: state.crew.filter((m) => m.id !== id),
        }))
        try {
          await db.deleteCrewMember(id)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      getAvailableToday: () => {
        const today = new Date()
        const dayKeys: (keyof CrewMember['availability'])[] = [
          'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
        ]
        const todayKey = dayKeys[today.getDay()]
        // ISO date string for today e.g. "2026-04-01"
        const todayISO = today.toISOString().split('T')[0]
        return get().crew.filter((m) =>
          m.availability[todayKey] &&
          !(m.bookedDates ?? []).includes(todayISO)
        )
      },
      getBySkill: (skill) => {
        return get().crew.filter((m) => m.skills.includes(skill))
      },
    }),
    {
      name: 'tf_crew',
    }
  )
)
