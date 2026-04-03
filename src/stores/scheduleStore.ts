import { create } from 'zustand'
import type { ScheduleEntry, ProjectCrewAssignment } from '@/types'
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
      } catch (err: any) {
        set({ error: err.message });
      }
    },

    createAssignment: async (assignmentData, orgId) => {
      const id = crypto.randomUUID();
      try {
        const result = await db.createProjectCrewAssignment(assignmentData, id, orgId);
        if (!result) return null;
        set((state) => ({ assignments: [...state.assignments, result] }));
        return result;
      } catch (err: any) {
        set({ error: err.message });
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
      } catch (err: any) {
        set({ assignments: prev, error: err.message });
      }
    },

    // ── Schedule entry actions ─────────────────────────────────────────────

    fetchEntries: async (orgId: string, startDate: string, endDate: string) => {
      set({ loading: true, isLoading: true, error: null });
      try {
        const entries = await db.fetchScheduleEntries(orgId, startDate, endDate);
        set({ entries, loading: false, isLoading: false });
      } catch (err: any) {
        set({ loading: false, isLoading: false, error: err.message });
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
      } catch (err: any) {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== newEntry.id),
          error: err.message,
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
      } catch (err: any) {
        set({ error: err.message });
      }
    },

    deleteEntry: async (id) => {
      const prev = get().entries;
      set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      try {
        await db.deleteScheduleEntry(id);
      } catch (err: any) {
        set({ entries: prev, error: err.message });
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
  })
);
