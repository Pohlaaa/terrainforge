import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Zone } from '@/types'
import { computeProjectCostRaw } from '@/lib/manifest'
import { useMaterialStore } from './materialStore'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

interface ProjectStore {
  projects: Project[]
  activeProjectId: string | null
  isLoading: boolean
  error: string | null
  reset: () => void
  setProjects: (projects: Project[]) => void
  setActiveProject: (id: string | null) => void
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  addZone: (projectId: string, zone: Omit<Zone, 'id' | 'createdAt'>) => Promise<void>
  updateZone: (projectId: string, zoneId: string, updates: Partial<Zone>) => Promise<void>
  deleteZone: (projectId: string, zoneId: string) => Promise<void>
  toggleChecklist: (projectId: string, key: keyof Project['checklist']) => Promise<void>
  fetchProjects: () => Promise<void>
  getActiveProject: () => Project | null
  getProjectCost: (projectId: string) => number
}

const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj_001',
    name: 'Henderson Backyard Redesign',
    client: 'Sarah Henderson',
    address: '1247 Maple Ridge Dr, Austin TX',
    totalArea: 3200,
    startDate: '2026-04-01',
    targetDate: '2026-05-15',
    budget: 45000,
    notes: 'Complete backyard transformation with new patio, garden beds, and lawn replacement',
    createdAt: new Date().toISOString(),
    checklist: {
      permit: true,
      utility: true,
      deposit: true,
      design: true,
      access: true,
      materials: false,
      crew: false,
      equipment: false,
    },
    zones: [
      {
        id: 'zone_001',
        name: 'Patio',
        area: 800,
        perimeter: 120,
        sequence: 1,
        crew: 'crew_001',
        dependencies: [],
        notes: 'Large entertaining patio with concrete pavers',
        materials: [
          { materialId: 'mat_001', name: 'Concrete Pavers' },
          { materialId: 'mat_014', name: 'Polymeric Sand' },
          { materialId: 'mat_015', name: 'Paver Base (Class II)' },
        ],
        equipment: [
          { equipId: 'eq_004', name: 'Wacker Neuson WP1550 Compactor' },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'zone_002',
        name: 'Garden Beds',
        area: 1200,
        perimeter: 160,
        sequence: 2,
        crew: 'crew_002',
        dependencies: [],
        notes: 'Raised garden beds with native plantings',
        materials: [
          { materialId: 'mat_009', name: 'Boxwood (3gal)' },
          { materialId: 'mat_010', name: 'Japanese Maple (15gal)' },
          { materialId: 'mat_011', name: 'Perennial Mix (1gal)' },
          { materialId: 'mat_004', name: 'Hardwood Mulch' },
        ],
        equipment: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'zone_003',
        name: 'Lawn',
        area: 1200,
        perimeter: 140,
        sequence: 3,
        crew: 'crew_002',
        dependencies: ['zone_001'],
        notes: 'New premium sod installation',
        materials: [
          { materialId: 'mat_003', name: 'Premium Sod (Bermuda)' },
        ],
        equipment: [],
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'proj_002',
    name: 'Oakwood Commercial Entrance',
    client: 'Oakwood Properties LLC',
    address: '500 Commerce Blvd, Round Rock TX',
    totalArea: 5800,
    startDate: '2026-05-01',
    targetDate: '2026-06-30',
    budget: 82000,
    notes: 'Corporate entrance redesign with hardscape and professional landscaping',
    createdAt: new Date().toISOString(),
    checklist: {
      permit: true,
      utility: true,
      deposit: false,
      design: true,
      access: true,
      materials: false,
      crew: false,
      equipment: false,
    },
    zones: [
      {
        id: 'zone_004',
        name: 'Entry Walkway',
        area: 2400,
        perimeter: 200,
        sequence: 1,
        crew: 'crew_001',
        dependencies: [],
        notes: 'Stamped concrete entry with drainage',
        materials: [
          { materialId: 'mat_002', name: 'Natural Flagstone' },
          { materialId: 'mat_007', name: 'Steel Edging' },
          { materialId: 'mat_015', name: 'Paver Base (Class II)' },
        ],
        equipment: [
          { equipId: 'eq_005', name: 'Stihl TS420 Concrete Saw' },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'zone_005',
        name: 'Planting Beds',
        area: 3400,
        perimeter: 280,
        sequence: 2,
        crew: 'crew_002',
        dependencies: [],
        notes: 'Tiered planting beds with irrigation',
        materials: [
          { materialId: 'mat_009', name: 'Boxwood (3gal)' },
          { materialId: 'mat_011', name: 'Perennial Mix (1gal)' },
          { materialId: 'mat_012', name: 'Drip Irrigation Kit' },
          { materialId: 'mat_013', name: 'Low-Voltage Path Light' },
        ],
        equipment: [],
        createdAt: new Date().toISOString(),
      },
    ],
  },
]

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: DEFAULT_PROJECTS,
      activeProjectId: null,
      isLoading: false,
      error: null,
      reset: () => set({ projects: [], activeProjectId: null, isLoading: false, error: null }),
      setProjects: (projects) => set({ projects }),
      setActiveProject: (id) => set({ activeProjectId: id }),
      fetchProjects: async () => {
        set({ isLoading: true, error: null })
        try {
          const projects = await db.fetchProjects()
          set({ projects, isLoading: false })
        } catch (err: any) {
          set({ isLoading: false, error: err.message })
        }
      },
      addProject: async (projectData) => {
        const orgId = useOrgStore.getState().org?.id
        if (!orgId) {
          console.error('addProject: no org_id available')
          return
        }
        const newProject: Project = {
          ...projectData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          zones: []
        }
        set((state) => ({ projects: [...state.projects, newProject] }))
        try {
          await db.createProject(projectData, newProject.id, orgId)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      updateProject: async (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }))
        try {
          await db.updateProject(id, updates)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      deleteProject: async (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }))
        try {
          await db.deleteProject(id)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      addZone: async (projectId, zoneData) => {
        const newZone: Zone = {
          ...zoneData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, zones: [...p.zones, newZone] }
              : p
          ),
        }))
        try {
          await db.createZone(projectId, zoneData)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      updateZone: async (projectId, zoneId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  zones: p.zones.map((z) =>
                    z.id === zoneId ? { ...z, ...updates } : z
                  ),
                }
              : p
          ),
        }))
        try {
          await db.updateZone(zoneId, updates)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      deleteZone: async (projectId, zoneId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, zones: p.zones.filter((z) => z.id !== zoneId) }
              : p
          ),
        }))
        try {
          await db.deleteZone(zoneId)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      toggleChecklist: async (projectId, key) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return
        const newChecklist = { ...project.checklist, [key]: !project.checklist[key] }
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, checklist: newChecklist } : p
          ),
        }))
        try {
          await db.updateProject(projectId, { checklist: newChecklist })
        } catch (err: any) {
          set({ error: err.message })
        }
      },
      getActiveProject: () => {
        const state = get()
        return state.activeProjectId
          ? state.projects.find((p) => p.id === state.activeProjectId) || null
          : null
      },
      getProjectCost: (projectId) => {
        const project = get().projects.find((p) => p.id === projectId)
        if (!project) return 0
        const materials = useMaterialStore.getState().materials
        return computeProjectCostRaw(project, materials)
      },
    }),
    {
      name: 'tf_projects',
    }
  )
)
