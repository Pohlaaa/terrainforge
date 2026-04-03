import { create } from 'zustand'
import type {
  Project, Zone, ProjectListItem, ProjectFull,
  ProjectTask, ProjectSubcontractor, ProjectPermit,
  ProjectCrewAssignment, ProjectSiteCondition, ProjectMaterialEntry, ProjectCrewEntry
} from '@/types'
import { computeProjectCostRaw } from '@/lib/manifest'
import { useMaterialStore } from './materialStore'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'
import { toast } from '@/hooks/useToast'

// Wire up Supabase error reporter — shows toasts and structured console logs
db.setSupabaseErrorReporter((operation, table, error) => {
  console.error(`[TF-SUPABASE] ${operation} on ${table} failed:`, error);
  toast.error(`Database error on ${table}: ${error?.message || 'Unknown error'}. Check console.`);
});

interface ProjectStore {
  // State
  projects: ProjectListItem[]
  activeProject: ProjectFull | null
  loading: boolean
  error: string | null

  // List actions
  fetchProjects: (orgId?: string) => Promise<void>
  fetchProjectFull: (orgId: string, projectId: string) => Promise<void>
  clearActiveProject: () => void

  // Project CRUD
  createProject: (project: Omit<Project, 'id' | 'createdAt'>, orgId: string) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // Project sub-entity actions (update activeProject in place)
  createProjectTask: (task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<ProjectTask | null>
  updateProjectTask: (id: string, updates: Partial<ProjectTask>) => Promise<ProjectTask | null>
  deleteProjectTask: (id: string) => Promise<boolean>
  createProjectSubcontractor: (sub: Omit<ProjectSubcontractor, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<ProjectSubcontractor | null>
  updateProjectSubcontractor: (id: string, updates: Partial<ProjectSubcontractor>) => Promise<ProjectSubcontractor | null>
  deleteProjectSubcontractor: (id: string) => Promise<boolean>
  createProjectPermit: (permit: Omit<ProjectPermit, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<ProjectPermit | null>
  updateProjectPermit: (id: string, updates: Partial<ProjectPermit>) => Promise<ProjectPermit | null>

  // Zone operations (kept for backward compatibility)
  addZone: (projectId: string, zone: Omit<Zone, 'id' | 'createdAt'>) => Promise<void>
  updateZone: (projectId: string, zoneId: string, updates: Partial<Zone>) => Promise<void>
  deleteZone: (projectId: string, zoneId: string) => Promise<void>
  toggleChecklist: (projectId: string, key: keyof Project['checklist']) => Promise<void>

  // Backward-compatible helpers (used by pages until refactored)
  /** @deprecated Use fetchProjects instead */
  setProjects: (projects: Project[]) => void
  /** @deprecated Use activeProject instead */
  activeProjectId: string | null
  /** @deprecated Use fetchProjectFull + activeProject */
  setActiveProject: (id: string | null) => void
  /** @deprecated Use createProject */
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<string | null>
  /** @deprecated Use activeProject directly */
  getActiveProject: () => Project | null
  getProjectCost: (projectId: string) => number
  reset: () => void
  isLoading: boolean
  /** @deprecated Materials live in Project.materials JSONB — backward compat shim */
  projectMaterials: Record<string, ProjectMaterialEntry[]>
  /** @deprecated Crew assignments live in project_crew_assignments — backward compat shim */
  projectCrew: Record<string, ProjectCrewEntry[]>
  addProjectMaterial: (projectId: string, entry: Omit<ProjectMaterialEntry, 'id'>) => Promise<void>
  updateProjectMaterial: (projectId: string, entryId: string, updates: Partial<ProjectMaterialEntry>) => void
  removeProjectMaterial: (projectId: string, entryId: string) => void
  addProjectCrew: (projectId: string, entry: Omit<ProjectCrewEntry, 'id'>) => void
  removeProjectCrew: (projectId: string, entryId: string) => void
}

export const useProjectStore = create<ProjectStore>()(
  (set, get) => ({
    // State
    projects: [],
    activeProject: null,
    loading: false,
    error: null,
    activeProjectId: null,
    isLoading: false,
    projectMaterials: {},
    projectCrew: {},

    reset: () => set({
      projects: [], activeProject: null, loading: false, error: null,
      activeProjectId: null, isLoading: false, projectMaterials: {}, projectCrew: {}
    }),

    setProjects: (projects) => set({ projects: projects as ProjectListItem[] }),

    setActiveProject: (id) => set({ activeProjectId: id }),

    // ── Fetch actions ────────────────────────────────────────────────────────

    fetchProjects: async (orgIdParam?: string) => {
      const orgId = orgIdParam || useOrgStore.getState().org?.id
      if (!orgId) return
      set({ loading: true, isLoading: true, error: null })
      try {
        const projects = await db.fetchProjects(orgId)
        // Build backward-compat projectMaterials map
        const projectMaterials: Record<string, ProjectMaterialEntry[]> = {}
        for (const p of projects) {
          if (Array.isArray((p as any).materials) && (p as any).materials.length > 0) {
            projectMaterials[p.id] = (p as any).materials
          }
        }
        set({ projects, loading: false, isLoading: false, projectMaterials })
      } catch (err: any) {
        set({ loading: false, isLoading: false, error: err.message })
      }
    },

    fetchProjectFull: async (orgId: string, projectId: string) => {
      set({ loading: true, isLoading: true, error: null, activeProjectId: projectId })
      try {
        const project = await db.fetchProjectFull(orgId, projectId)
        set({ activeProject: project, loading: false, isLoading: false })
      } catch (err: any) {
        set({ loading: false, isLoading: false, error: err.message })
      }
    },

    clearActiveProject: () => set({ activeProject: null, activeProjectId: null }),

    // ── Project CRUD ─────────────────────────────────────────────────────────

    createProject: async (projectData, orgId) => {
      const id = crypto.randomUUID()
      try {
        const result = await db.createProject(projectData, id, orgId)
        if (!result) {
          set({ error: 'Failed to save project. Please try again.' })
          return null
        }
        // Refresh project list
        await get().fetchProjects(orgId)
        return result
      } catch (err: any) {
        set({ error: err.message })
        return null
      }
    },

    addProject: async (projectData) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return null
      const result = await get().createProject(projectData, orgId)
      return result?.id ?? null
    },

    updateProject: async (id, updates) => {
      const previous = get().projects.find((p) => p.id === id)
      // Optimistic update on list
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        // Also update activeProject if it matches
        activeProject: state.activeProject?.id === id
          ? { ...state.activeProject, ...updates }
          : state.activeProject,
      }))
      try {
        const result = await db.updateProject(id, updates)
        if (!result) {
          if (previous) {
            set((state) => ({
              projects: state.projects.map((p) => p.id === id ? previous as ProjectListItem : p),
              error: 'Failed to update project. Please try again.',
            }))
          }
          return
        }
        // Refresh project list to get accurate summaries
        const orgId = useOrgStore.getState().org?.id
        if (orgId) await get().fetchProjects(orgId)
      } catch (err: any) {
        if (previous) {
          set((state) => ({
            projects: state.projects.map((p) => p.id === id ? previous as ProjectListItem : p),
            error: err.message,
          }))
        }
      }
    },

    deleteProject: async (id) => {
      try {
        const success = await db.deleteProject(id)
        if (!success) {
          set({ error: 'Failed to delete project. Please try again.' })
          return
        }
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProject: state.activeProject?.id === id ? null : state.activeProject,
          activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        }))
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    // ── Sub-entity CRUD (updates activeProject in place) ─────────────────────

    createProjectTask: async (taskData, orgId) => {
      const id = crypto.randomUUID()
      try {
        const result = await db.createProjectTask(taskData, id, orgId)
        if (!result) return null
        // Update activeProject in place
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, tasks: [...state.activeProject.tasks, result] }
            : state.activeProject,
        }))
        return result
      } catch (err: any) {
        set({ error: err.message })
        return null
      }
    },

    updateProjectTask: async (id, updates) => {
      try {
        const result = await db.updateProjectTask(id, updates)
        if (!result) return null
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, tasks: state.activeProject.tasks.map((t) => t.id === id ? result : t) }
            : state.activeProject,
        }))
        return result
      } catch (err: any) {
        set({ error: err.message })
        return null
      }
    },

    deleteProjectTask: async (id) => {
      try {
        const success = await db.deleteProjectTask(id)
        if (!success) return false
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, tasks: state.activeProject.tasks.filter((t) => t.id !== id) }
            : state.activeProject,
        }))
        return true
      } catch (err: any) {
        set({ error: err.message })
        return false
      }
    },

    createProjectSubcontractor: async (subData, orgId) => {
      const id = crypto.randomUUID()
      try {
        const result = await db.createProjectSubcontractor(subData, id, orgId)
        if (!result) return null
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, subcontractors: [...state.activeProject.subcontractors, result] }
            : state.activeProject,
        }))
        return result
      } catch (err: any) {
        set({ error: err.message })
        return null
      }
    },

    updateProjectSubcontractor: async (id, updates) => {
      try {
        const result = await db.updateProjectSubcontractor(id, updates)
        if (!result) return null
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, subcontractors: state.activeProject.subcontractors.map((s) => s.id === id ? result : s) }
            : state.activeProject,
        }))
        return result
      } catch (err: any) {
        set({ error: err.message })
        return null
      }
    },

    deleteProjectSubcontractor: async (id) => {
      try {
        const success = await db.deleteProjectSubcontractor(id)
        if (!success) return false
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, subcontractors: state.activeProject.subcontractors.filter((s) => s.id !== id) }
            : state.activeProject,
        }))
        return true
      } catch (err: any) {
        set({ error: err.message })
        return false
      }
    },

    createProjectPermit: async (permitData, orgId) => {
      const id = crypto.randomUUID()
      try {
        const result = await db.createProjectPermit(permitData, id, orgId)
        if (!result) return null
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, permits: [...state.activeProject.permits, result] }
            : state.activeProject,
        }))
        return result
      } catch (err: any) {
        set({ error: err.message })
        return null
      }
    },

    updateProjectPermit: async (id, updates) => {
      try {
        const result = await db.updateProjectPermit(id, updates)
        if (!result) return null
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, permits: state.activeProject.permits.map((p) => p.id === id ? result : p) }
            : state.activeProject,
        }))
        return result
      } catch (err: any) {
        set({ error: err.message })
        return null
      }
    },

    // ── Zone operations (backward compat) ────────────────────────────────────

    addZone: async (projectId, zoneData) => {
      const orgId = useOrgStore.getState().org?.id
      if (!orgId) return
      const newZone: Zone = {
        ...zoneData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      }
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, zones: [...p.zones, newZone] } : p
        ),
      }))
      try {
        await db.createZone(projectId, zoneData, orgId)
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    updateZone: async (projectId, zoneId, updates) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, zones: p.zones.map((z) => z.id === zoneId ? { ...z, ...updates } : z) }
            : p
        ),
      }))
      try {
        await db.updateZone(zoneId, updates)
      } catch (err: any) {
        set({ error: err.message })
      }
    },

    deleteZone: async (projectId, zoneId) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, zones: p.zones.filter((z) => z.id !== zoneId) } : p
        ),
      }))
      try {
        await db.deleteZone(zoneId)
      } catch (err: any) {
        set({ error: err.message })
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

    // ── Backward-compat helpers ──────────────────────────────────────────────

    getActiveProject: () => {
      const state = get()
      if (state.activeProject) return state.activeProject
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

    // Material backward-compat shims
    addProjectMaterial: async (projectId, entry) => {
      const { supabase } = await import('@/services/supabase')
      const newEntry: ProjectMaterialEntry = { ...entry, id: crypto.randomUUID() }
      set((state) => ({
        projectMaterials: {
          ...state.projectMaterials,
          [projectId]: [...(state.projectMaterials[projectId] ?? []), newEntry],
        },
      }))
      const allEntries = get().projectMaterials[projectId] ?? []
      await supabase
        .from('projects')
        .update({ materials: allEntries })
        .eq('id', projectId)
    },

    updateProjectMaterial: (projectId, entryId, updates) => {
      set((state) => ({
        projectMaterials: {
          ...state.projectMaterials,
          [projectId]: (state.projectMaterials[projectId] ?? []).map((e) =>
            e.id === entryId ? { ...e, ...updates } : e
          ),
        },
      }))
    },

    removeProjectMaterial: (projectId, entryId) => {
      set((state) => ({
        projectMaterials: {
          ...state.projectMaterials,
          [projectId]: (state.projectMaterials[projectId] ?? []).filter((e) => e.id !== entryId),
        },
      }))
    },

    addProjectCrew: (projectId, entry) => {
      const newEntry: ProjectCrewEntry = { ...entry, id: crypto.randomUUID() }
      set((state) => ({
        projectCrew: {
          ...state.projectCrew,
          [projectId]: [...(state.projectCrew[projectId] ?? []), newEntry],
        },
      }))
    },

    removeProjectCrew: (projectId, entryId) => {
      set((state) => ({
        projectCrew: {
          ...state.projectCrew,
          [projectId]: (state.projectCrew[projectId] ?? []).filter((e) => e.id !== entryId),
        },
      }))
    },
  })
)
