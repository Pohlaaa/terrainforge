import { create } from 'zustand'
import type {
  Project, Zone, ProjectListItem, ProjectFull,
  ProjectTask, ProjectSubcontractor, ProjectPermit,
  ProjectCrewAssignment, ProjectSiteCondition, ProjectMaterial, ProjectCrewEntry,
  ProjectElement, ProjectElementMaterial,
  ZoneMaterialDetail,
} from '@/types'
import { computeProjectCostRaw } from '@/lib/manifest'
import { useMaterialStore } from './materialStore'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'
import { toast } from '@/hooks/useToast'
import { snapshotManifestForProject } from '@/services/supabaseManifests'

// Wire up Supabase error reporter — shows toasts and structured console logs
db.setSupabaseErrorReporter((operation, table, error) => {
  console.error(`[TF-SUPABASE] ${operation} on ${table} failed:`, error);
  const message = error instanceof Error ? error.message : (error as Record<string, unknown>)?.message || 'Unknown error';
  toast.error(`Database error on ${table}: ${message}. Check console.`);
});

interface ProjectStore {
  // State
  projects: ProjectListItem[]
  activeProject: ProjectFull | null
  /** @deprecated Zone materials are legacy. Kept for backward compat only. */
  zoneMaterialDetails: ZoneMaterialDetail[]
  loading: boolean
  error: string | null

  // List actions
  fetchProjects: (orgId?: string) => Promise<void>
  /** @deprecated Zone materials are legacy. Materials live in Project.materials JSONB. Kept for backward compat. */
  fetchZoneMaterialDetails: (projectId: string) => Promise<void>
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
  createProjectSiteCondition: (condition: Omit<ProjectSiteCondition, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<ProjectSiteCondition | null>

  // Element CRUD (measurement-driven architecture)
  fetchProjectElements: (orgId: string, projectId: string) => Promise<ProjectElement[]>
  addElement: (element: Omit<ProjectElement, 'id' | 'materials'>, orgId: string) => Promise<ProjectElement | null>
  updateElement: (id: string, updates: Partial<ProjectElement>) => Promise<ProjectElement | null>
  deleteElement: (id: string) => Promise<boolean>

  // Element-material CRUD (connects materials to elements for measurement-driven quantities)
  addElementMaterial: (elementId: string, material: Omit<ProjectElementMaterial, 'id' | 'createdAt'>, orgId: string) => Promise<ProjectElementMaterial | null>
  updateElementMaterial: (elementId: string, materialId: string, updates: Partial<ProjectElementMaterial>) => Promise<ProjectElementMaterial | null>
  removeElementMaterial: (elementId: string, materialId: string) => Promise<boolean>
  /** Update materials for project materials JSONB (store action for wizard) */
  updateProjectMaterials: (projectId: string, materials: ProjectMaterial[]) => Promise<void>

  // Zone operations (kept for backward compatibility with older projects)
  /** @deprecated Zones are legacy. Kept for backward compat with pre-wizard projects. */
  addZone: (projectId: string, zone: Omit<Zone, 'id' | 'createdAt'>) => Promise<void>
  /** @deprecated Zones are legacy. Kept for backward compat with pre-wizard projects. */
  updateZone: (projectId: string, zoneId: string, updates: Partial<Zone>) => Promise<void>
  /** @deprecated Zones are legacy. Kept for backward compat with pre-wizard projects. */
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
  projectMaterials: Record<string, ProjectMaterial[]>
  /** @deprecated Crew assignments live in project_crew_assignments — backward compat shim */
  projectCrew: Record<string, ProjectCrewEntry[]>
  addProjectMaterial: (projectId: string, entry: Omit<ProjectMaterial, 'id'>) => Promise<void>
  updateProjectMaterial: (projectId: string, entryId: string, updates: Partial<ProjectMaterial>) => void
  removeProjectMaterial: (projectId: string, entryId: string) => void
  addProjectCrew: (projectId: string, entry: Omit<ProjectCrewEntry, 'id'>) => void
  removeProjectCrew: (projectId: string, entryId: string) => void
}

export const useProjectStore = create<ProjectStore>()(
  (set, get) => ({
    // State
    projects: [],
    activeProject: null,
    zoneMaterialDetails: [],
    loading: false,
    error: null,
    activeProjectId: null,
    isLoading: false,
    projectMaterials: {},
    projectCrew: {},

    reset: () => set({
      projects: [], activeProject: null, zoneMaterialDetails: [], loading: false, error: null,
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
        const projectMaterials: Record<string, ProjectMaterial[]> = {}
        for (const p of projects) {
          const pMats = (p as unknown as Record<string, unknown>).materials;
          if (Array.isArray(pMats) && pMats.length > 0) {
            projectMaterials[p.id] = pMats as ProjectMaterial[]
          }
        }
        set({ projects, loading: false, isLoading: false, projectMaterials })
      } catch (err: unknown) {
        set({ loading: false, isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },

    fetchProjectFull: async (orgId: string, projectId: string) => {
      set({ loading: true, isLoading: true, error: null, activeProjectId: projectId })
      try {
        const project = await db.fetchProjectFull(orgId, projectId)
        set({ activeProject: project, loading: false, isLoading: false })
      } catch (err: unknown) {
        set({ loading: false, isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    },

    fetchZoneMaterialDetails: async (projectId: string) => {
      try {
        const details = await db.fetchZoneMaterialDetails(projectId);
        set({ zoneMaterialDetails: details });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('fetchZoneMaterialDetails error:', message);
      }
    },

    clearActiveProject: () => set({ activeProject: null, activeProjectId: null, zoneMaterialDetails: [] }),

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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      // Capture pre-update status so we can detect approved → scheduled
      // transitions and snapshot a manifest at exactly that moment.
      const prevStatus = previous?.status
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

        // Manifests: when a project crosses approved → scheduled, freeze the
        // current materials engine output as a versioned snapshot. This is
        // the audit trail of "what we ordered when we ordered it." Failure
        // here is non-fatal — the status update already landed.
        if (
          prevStatus === 'approved' &&
          updates.status === 'scheduled'
        ) {
          const active = get().activeProject
          const orgId = useOrgStore.getState().org?.id
          // Only snapshot if we have the full project loaded; the wizard
          // and dashboard both call updateProject after fetchProjectFull,
          // so this is the common case.
          if (active && active.id === id && orgId) {
            const catalog = useMaterialStore.getState().materials
            snapshotManifestForProject({
              projectId: id,
              orgId,
              elements: active.elements ?? [],
              catalog,
            })
              .then((mid) => {
                if (mid) console.log(`[manifests] snapshot ${mid} created for project ${id}`)
              })
              .catch((err) => {
                console.warn('[manifests] snapshot failed:', err)
              })
          }
        }

        // Refresh project list to get accurate summaries
        const orgId = useOrgStore.getState().org?.id
        if (orgId) await get().fetchProjects(orgId)
      } catch (err: unknown) {
        if (previous) {
          set((state) => ({
            projects: state.projects.map((p) => p.id === id ? previous as ProjectListItem : p),
            error: err instanceof Error ? err.message : 'Unknown error',
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
        return null
      }
    },

    createProjectSiteCondition: async (conditionData, orgId) => {
      const id = crypto.randomUUID()
      try {
        const result = await db.createProjectSiteCondition(conditionData, id, orgId)
        if (!result) return null
        set((state) => ({
          activeProject: state.activeProject
            ? { ...state.activeProject, siteConditions: [...state.activeProject.siteConditions, result] }
            : state.activeProject,
        }))
        return result
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' })
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
      const newEntry: ProjectMaterial = { ...entry, id: crypto.randomUUID() }
      set((state) => ({
        projectMaterials: {
          ...state.projectMaterials,
          [projectId]: [...(state.projectMaterials[projectId] ?? []), newEntry],
        },
      }))
      const allEntries = get().projectMaterials[projectId] ?? []
      await db.updateProjectMaterials(projectId, allEntries)
    },

    updateProjectMaterial: async (projectId, entryId, updates) => {
      set((state) => ({
        projectMaterials: {
          ...state.projectMaterials,
          [projectId]: (state.projectMaterials[projectId] ?? []).map((e) =>
            e.id === entryId ? { ...e, ...updates } : e
          ),
        },
      }))
      const allEntries = get().projectMaterials[projectId] ?? []
      await db.updateProjectMaterials(projectId, allEntries)
    },

    removeProjectMaterial: async (projectId, entryId) => {
      set((state) => ({
        projectMaterials: {
          ...state.projectMaterials,
          [projectId]: (state.projectMaterials[projectId] ?? []).filter((e) => e.id !== entryId),
        },
      }))
      const allEntries = get().projectMaterials[projectId] ?? []
      await db.updateProjectMaterials(projectId, allEntries)
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

    // ── Element CRUD (measurement-driven architecture) ─────────────────────
    fetchProjectElements: async (orgId, projectId) => {
      try {
        const elements = await db.fetchProjectElements(orgId, projectId)
        // Update activeProject if it matches
        set((state) => ({
          activeProject: state.activeProject?.id === projectId
            ? { ...state.activeProject, elements }
            : state.activeProject,
        }))
        return elements
      } catch (err: unknown) {
        console.error('fetchProjectElements error:', err instanceof Error ? err.message : err)
        return []
      }
    },

    addElement: async (elementData, orgId) => {
      try {
        const id = crypto.randomUUID()
        const result = await db.createProjectElement(elementData, id, orgId)
        if (!result) return null
        // Add to activeProject elements
        set((state) => ({
          activeProject: state.activeProject?.id === elementData.projectId
            ? { ...state.activeProject, elements: [...(state.activeProject.elements || []), result] }
            : state.activeProject,
        }))
        return result
      } catch (err: unknown) {
        console.error('addElement error:', err instanceof Error ? err.message : err)
        return null
      }
    },

    updateElement: async (id, updates) => {
      try {
        const result = await db.updateProjectElement(id, updates)
        if (!result) return null
        set((state) => ({
          activeProject: state.activeProject
            ? {
                ...state.activeProject,
                elements: (state.activeProject.elements || []).map(
                  (el) => el.id === id ? { ...el, ...result } : el
                ),
              }
            : null,
        }))
        return result
      } catch (err: unknown) {
        console.error('updateElement error:', err instanceof Error ? err.message : err)
        return null
      }
    },

    deleteElement: async (id) => {
      try {
        const success = await db.deleteProjectElement(id)
        if (!success) return false
        set((state) => ({
          activeProject: state.activeProject
            ? {
                ...state.activeProject,
                elements: (state.activeProject.elements || []).filter((el) => el.id !== id),
              }
            : null,
        }))
        return true
      } catch (err: unknown) {
        console.error('deleteElement error:', err instanceof Error ? err.message : err)
        return false
      }
    },

    // ── Element-Material CRUD ────────────────────────────────────────────────

    addElementMaterial: async (elementId, materialData, orgId) => {
      try {
        const id = crypto.randomUUID()
        const result = await db.createElementMaterial(materialData, id, orgId)
        if (!result) return null
        // Update activeProject element's materials array in place
        set((state) => {
          if (!state.activeProject) return state
          const elements = (state.activeProject.elements || []).map((el) =>
            el.id === elementId
              ? { ...el, materials: [...el.materials, result] }
              : el
          )
          return { activeProject: { ...state.activeProject, elements } }
        })
        return result
      } catch (err: unknown) {
        console.error('addElementMaterial error:', err instanceof Error ? err.message : err)
        return null
      }
    },

    updateElementMaterial: async (elementId, materialId, updates) => {
      try {
        const result = await db.updateElementMaterial(materialId, updates)
        if (!result) return null
        // Replace the row in activeProject.elements[].materials in place.
        set((state) => {
          if (!state.activeProject) return state
          const elements = (state.activeProject.elements || []).map((el) =>
            el.id === elementId
              ? {
                  ...el,
                  materials: el.materials.map((m) =>
                    m.id === materialId ? { ...m, ...result } : m,
                  ),
                }
              : el,
          )
          return { activeProject: { ...state.activeProject, elements } }
        })
        return result
      } catch (err: unknown) {
        console.error('updateElementMaterial error:', err instanceof Error ? err.message : err)
        return null
      }
    },

    removeElementMaterial: async (elementId, materialId) => {
      try {
        const success = await db.deleteElementMaterial(materialId)
        if (!success) return false
        set((state) => {
          if (!state.activeProject) return state
          const elements = (state.activeProject.elements || []).map((el) =>
            el.id === elementId
              ? { ...el, materials: el.materials.filter((m) => m.id !== materialId) }
              : el
          )
          return { activeProject: { ...state.activeProject, elements } }
        })
        return true
      } catch (err: unknown) {
        console.error('removeElementMaterial error:', err instanceof Error ? err.message : err)
        return false
      }
    },

    updateProjectMaterials: async (projectId, materials) => {
      try {
        await db.updateProjectMaterials(projectId, materials)
      } catch (err: unknown) {
        console.error('updateProjectMaterials error:', err instanceof Error ? err.message : err)
      }
    },
  })
)
