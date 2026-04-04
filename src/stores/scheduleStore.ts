import { create } from 'zustand'
import type { ScheduleEntry, ProjectCrewAssignment } from '@/types'
import type { CrewPhoto } from '@/services/supabaseCrewOps'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

// ── Store interface ───────────────────────────────────────────────────────────

interface ScheduleStore {
  // State
  assignments: ProjectCrewAssignment[]
  entries: ScheduleEntry[]
  loading: boolean
  error: string | null

  // Assignment actions
  fetchAssignments: (orgId?: string) => Promise<void>
  createAssignment: (assignment: Omit<ProjectCrewAssignment, 'id' | 'assignedAt'>, orgId: string) => Promise<ProjectCrewAssignment | null>
  deleteAssignment: (id: string) => Promise<void>

  // Schedule entry actions
  fetchEntries: (orgId: string, startDate: string, endDate: string) => Promise<void>
  createEntry: (entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt' | 'orgId'>, orgId?: string) => Promise<void>
  updateEntry: (id: string, updates: Partial<ScheduleEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  moveEntry: (id: string, newDate: string, newCrewMemberId?: string) => Promise<void>

  // Query helpers
  getEntriesForDate: (date: string) => ScheduleEntry[]
  getEntriesForCrewMember: (crewMemberId: string, date: string) => ScheduleEntry[]
  getEntriesForProject: (projectId: string) => ScheduleEntry[]
  hasConflict: (crewMemberId: string, date: string, excludeEntryId?: string) => boolean

  // Backward-compat aliases
  /** @deprecated Use fetchEntries */
  fetchSchedule: (weekStart: string) => Promise<void>
  /** @deprecated Use createEntry */
  addEntry: (entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt' | 'orgId'>) => Promise<void>
  isLoading: boolean
  reset: () => void
  setEntries: (entries: ScheduleEntry[]) => void

  // Crew operations (routed through store to avoid page→supabaseData imports)
  fetchTodayEntriesForCrew: (orgId: string, crewMemberId: string) => Promise<ScheduleEntry[]>
  fetchCrewStatus: (crewMemberId: string) => Promise<string>
  upsertCrewStatus: (orgId: string, crewMemberId: string, scheduleEntryId: string, status: string) => Promise<void>
  fetchAllCrewStatuses: (orgId: string) => Promise<Array<{ crewMemberId: string; status: string }>>
  fetchChecklistProgress: (scheduleEntryId: string) => Promise<Array<{ zoneId: string; stepNumber: number }>>
  saveChecklistStep: (orgId: string, scheduleEntryId: string, crewMemberId: string, zoneId: string, stepNumber: number) => Promise<void>
  removeChecklistStep: (scheduleEntryId: string, zoneId: string, stepNumber: number) => Promise<void>
  fetchChecklistProgressCounts: (scheduleEntryIds: string[]) => Promise<Record<string, number>>
  uploadCrewPhoto: (orgId: string, scheduleEntryId: string, crewMemberId: string, file: File, zoneId?: string, stepNumber?: number, caption?: string) => Promise<CrewPhoto | null>
  fetchCrewPhotos: (scheduleEntryId: string) => Promise<CrewPhoto[]>
  getPhotoUrl: (storagePath: string) => Promise<string>
  deleteCrewPhoto: (id: string, storagePath: string) => Promise<boolean>
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useScheduleStore = create<ScheduleStore>()(
  (set, get) => ({
    assignments: [],
    entries: [],
    loading: false,
    isLoading: false,
    error: null,

    reset: () => set({ assignments: [], entries: [], loading: false, isLoading: false, error: null }),

    setEntries: (entries) => set({ entries }),

    // ── Assignment actions ─────────────────────────────────────────────────

    fetchAssignments: async (orgIdParam?: string) => {
      const orgId = orgIdParam || useOrgStore.getState().org?.id;
      if (!orgId) return;
      try {
        const assignments = await db.fetchAllProjectCrewAssignments(orgId);
        set({ assignments });
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    },

    createAssignment: async (assignmentData, orgId) => {
      const id = crypto.randomUUID();
      try {
        const result = await db.createProjectCrewAssignment(assignmentData, id, orgId);
        if (!result) return null;
        set((state) => ({ assignments: [...state.assignments, result] }));
        return result;
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' });
        return null;
      }
    },

    deleteAssignment: async (id) => {
      const prev = get().assignments;
      set((state) => ({ assignments: state.assignments.filter((a) => a.id !== id) }));
      try {
        const success = await db.deleteProjectCrewAssignment(id);
        if (!success) {
          set({ assignments: prev, error: 'Failed to delete assignment' });
        }
      } catch (err: unknown) {
        set({ assignments: prev, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    },

    // ── Schedule entry actions ─────────────────────────────────────────────

    fetchEntries: async (orgId: string, startDate: string, endDate: string) => {
      set({ loading: true, isLoading: true, error: null });
      try {
        const entries = await db.fetchScheduleEntries(orgId, startDate, endDate);
        set({ entries, loading: false, isLoading: false });
      } catch (err: unknown) {
        set({ loading: false, isLoading: false, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    },

    fetchSchedule: async (weekStart: string) => {
      const orgId = useOrgStore.getState().org?.id;
      if (!orgId) return;
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      await get().fetchEntries(orgId, weekStart, isoDate(end));
    },

    createEntry: async (entryData, orgIdParam) => {
      const orgId = orgIdParam || useOrgStore.getState().org?.id || 'demo';
      const newEntry: ScheduleEntry = {
        ...entryData,
        id: crypto.randomUUID(),
        orgId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((state) => ({ entries: [...state.entries, newEntry] }));
      try {
        await db.createScheduleEntry({ ...entryData, orgId }, newEntry.id, orgId);
      } catch (err: unknown) {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== newEntry.id),
          error: err instanceof Error ? err.message : 'Unknown error',
        }));
      }
    },

    addEntry: async (entryData) => {
      await get().createEntry(entryData);
    },

    updateEntry: async (id, updates) => {
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
        ),
      }));
      try {
        await db.updateScheduleEntry(id, updates);
      } catch (err: unknown) {
        set({ error: err instanceof Error ? err.message : 'Unknown error' });
      }
    },

    deleteEntry: async (id) => {
      const prev = get().entries;
      set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      try {
        await db.deleteScheduleEntry(id);
      } catch (err: unknown) {
        set({ entries: prev, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    },

    moveEntry: async (id, newDate, newCrewMemberId) => {
      const updates: Partial<ScheduleEntry> = { scheduledDate: newDate };
      if (newCrewMemberId) updates.crewMemberId = newCrewMemberId;
      await get().updateEntry(id, updates);
    },

    // ── Query helpers ──────────────────────────────────────────────────────

    getEntriesForDate: (date) =>
      get().entries.filter((e) => e.scheduledDate === date),

    getEntriesForCrewMember: (crewMemberId, date) =>
      get().entries.filter(
        (e) => e.crewMemberId === crewMemberId && e.scheduledDate === date
      ),

    getEntriesForProject: (projectId) =>
      get().entries.filter((e) => e.projectId === projectId),

    hasConflict: (crewMemberId, date, excludeEntryId) => {
      const count = get().entries.filter(
        (e) =>
          e.crewMemberId === crewMemberId &&
          e.scheduledDate === date &&
          e.id !== excludeEntryId
      ).length;
      return count >= 2;
    },

    // ── Crew operations ────────────────────────────────────────────────────

    fetchTodayEntriesForCrew: async (orgId, crewMemberId) => {
      const today = new Date().toISOString().split('T')[0];
      const all = await db.fetchScheduleEntries(orgId, today, today);
      return all.filter(e => e.crewMemberId === crewMemberId);
    },

    fetchCrewStatus: (crewMemberId) => db.fetchCrewStatus(crewMemberId),

    upsertCrewStatus: (orgId, crewMemberId, scheduleEntryId, status) =>
      db.upsertCrewStatus(orgId, crewMemberId, scheduleEntryId, status),

    fetchAllCrewStatuses: (orgId) => db.fetchAllCrewStatuses(orgId),

    fetchChecklistProgress: (scheduleEntryId) => db.fetchChecklistProgress(scheduleEntryId),

    saveChecklistStep: (orgId, scheduleEntryId, crewMemberId, zoneId, stepNumber) =>
      db.saveChecklistStep(orgId, scheduleEntryId, crewMemberId, zoneId, stepNumber),

    removeChecklistStep: (scheduleEntryId, zoneId, stepNumber) =>
      db.removeChecklistStep(scheduleEntryId, zoneId, stepNumber),

    fetchChecklistProgressCounts: (scheduleEntryIds) => db.fetchChecklistProgressCounts(scheduleEntryIds),

    uploadCrewPhoto: (orgId, scheduleEntryId, crewMemberId, file, zoneId, stepNumber, caption) =>
      db.uploadCrewPhoto(orgId, scheduleEntryId, crewMemberId, file, zoneId, stepNumber, caption),

    fetchCrewPhotos: (scheduleEntryId) => db.fetchCrewPhotos(scheduleEntryId),

    getPhotoUrl: (storagePath) => db.getPhotoUrl(storagePath),

    deleteCrewPhoto: (id, storagePath) => db.deleteCrewPhoto(id, storagePath),
  })
);
