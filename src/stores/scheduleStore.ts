import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduleEntry } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

// ── Seed data helpers ─────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function seedEntries(): ScheduleEntry[] {
  const mon = getMonday(new Date());
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    days.push(isoDate(d));
  }

  return [
    {
      id: 'se_001',
      orgId: 'demo',
      projectId: 'proj_001',
      crewMemberId: 'crew_001',
      equipmentId: null,
      scheduledDate: days[0], // Mon
      startTime: '07:00',
      endTime: '15:00',
      notes: 'Patio excavation and base prep',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'se_002',
      orgId: 'demo',
      projectId: 'proj_001',
      crewMemberId: 'crew_002',
      equipmentId: null,
      scheduledDate: days[0], // Mon
      startTime: '08:00',
      endTime: '16:00',
      notes: 'Garden bed layout',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'se_003',
      orgId: 'demo',
      projectId: 'proj_002',
      crewMemberId: 'crew_003',
      equipmentId: null,
      scheduledDate: days[1], // Tue
      startTime: '07:30',
      endTime: '15:30',
      notes: 'Entry walkway flagstone',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'se_004',
      orgId: 'demo',
      projectId: 'proj_001',
      crewMemberId: 'crew_001',
      equipmentId: null,
      scheduledDate: days[1], // Tue
      startTime: '07:00',
      endTime: '15:00',
      notes: 'Paver installation',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'se_005',
      orgId: 'demo',
      projectId: 'proj_002',
      crewMemberId: 'crew_002',
      equipmentId: null,
      scheduledDate: days[2], // Wed
      startTime: '08:00',
      endTime: '16:00',
      notes: 'Planting bed installation',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'se_006',
      orgId: 'demo',
      projectId: 'proj_001',
      crewMemberId: 'crew_003',
      equipmentId: null,
      scheduledDate: days[3], // Thu
      startTime: '07:00',
      endTime: '12:00',
      notes: 'Sod delivery and install',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'se_007',
      orgId: 'demo',
      projectId: 'proj_002',
      crewMemberId: 'crew_001',
      equipmentId: null,
      scheduledDate: days[4], // Fri
      startTime: '07:30',
      endTime: '15:30',
      notes: 'Irrigation and lighting',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// ── Store interface ───────────────────────────────────────────────────────────

interface ScheduleStore {
  entries: ScheduleEntry[]
  isLoading: boolean
  error: string | null
  reset: () => void
  setEntries: (entries: ScheduleEntry[]) => void
  fetchSchedule: (weekStart: string) => Promise<void>
  addEntry: (entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt' | 'orgId'>) => Promise<void>
  updateEntry: (id: string, updates: Partial<ScheduleEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  moveEntry: (id: string, newDate: string, newCrewMemberId?: string) => Promise<void>
  getEntriesForDate: (date: string) => ScheduleEntry[]
  getEntriesForCrewMember: (crewMemberId: string, date: string) => ScheduleEntry[]
  getEntriesForProject: (projectId: string) => ScheduleEntry[]
  hasConflict: (crewMemberId: string, date: string, excludeEntryId?: string) => boolean
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      entries: seedEntries(),
      isLoading: false,
      error: null,

      reset: () => set({ entries: seedEntries(), isLoading: false, error: null }),

      setEntries: (entries) => set({ entries }),

      fetchSchedule: async (weekStart: string) => {
        const orgId = useOrgStore.getState().org?.id;
        if (!orgId) return;

        // Compute end date (7 days from weekStart)
        const start = new Date(weekStart);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        const endDate = isoDate(end);

        set({ isLoading: true, error: null });
        try {
          const entries = await db.fetchScheduleEntries(orgId, weekStart, endDate);
          set({ entries, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
        }
      },

      addEntry: async (entryData) => {
        const orgId = useOrgStore.getState().org?.id ?? 'demo';
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

      getEntriesForDate: (date) => {
        return get().entries.filter((e) => e.scheduledDate === date);
      },

      getEntriesForCrewMember: (crewMemberId, date) => {
        return get().entries.filter(
          (e) => e.crewMemberId === crewMemberId && e.scheduledDate === date
        );
      },

      getEntriesForProject: (projectId) => {
        return get().entries.filter((e) => e.projectId === projectId);
      },

      hasConflict: (crewMemberId, date, excludeEntryId) => {
        const count = get().entries.filter(
          (e) =>
            e.crewMemberId === crewMemberId &&
            e.scheduledDate === date &&
            e.id !== excludeEntryId
        ).length;
        return count >= 2;
      },
    }),
    {
      name: 'tf_schedule',
    }
  )
);
