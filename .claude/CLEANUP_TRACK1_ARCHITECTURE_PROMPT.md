# Track 1 — Architecture Cleanup

> **Branch**: `refactor-architecture-cleanup`
> **Priority**: Run FIRST (Tracks 2 and 3 depend on this)
> **Goal**: Split the 2,171-line supabaseData.ts monolith into domain modules, fix 5 pages that bypass the store layer, and eliminate `any` types in stores.

---

## Task 1: Split supabaseData.ts into Domain Modules

`src/services/supabaseData.ts` is 2,171 lines. Split it into focused modules while preserving the barrel export so existing imports don't break.

### New file structure:

```
src/services/
├── supabaseData.ts          ← barrel re-export (keeps all existing imports working)
├── supabaseCore.ts          ← error reporter, sanitizeTimestamps, toCamelCase, toSnakeCase
├── supabaseProjects.ts      ← fetchProjects, fetchProjectFull, createProject, updateProject, deleteProject, summary helpers (fetchCrewAssignmentCounts, fetchNextScheduledDates)
├── supabaseZones.ts         ← createZone, updateZone, deleteZone, setZoneMaterials, setZoneEquipment, fetchZoneMaterialDetails
├── supabaseMaterials.ts     ← fetchMaterials, createMaterial, updateMaterial, deleteMaterial
├── supabaseCrew.ts          ← fetchCrew, createCrewMember, updateCrewMember, deleteCrewMember
├── supabaseEquipment.ts     ← fetchEquipment, createEquipment, updateEquipment, deleteEquipment, addMaintenanceEntry
├── supabaseSchedule.ts      ← fetchScheduleEntries, fetchScheduleEntriesForProject, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry
├── supabaseCrewOps.ts       ← fetchProjectCrewAssignments, fetchAllProjectCrewAssignments, createProjectCrewAssignment, deleteProjectCrewAssignment, fetchCrewStatus, upsertCrewStatus, fetchAllCrewStatuses, fetchChecklistProgress, saveChecklistStep, removeChecklistStep, fetchChecklistProgressCounts, uploadCrewPhoto, fetchCrewPhotos, getPhotoUrl, deleteCrewPhoto
├── supabaseProjectDetails.ts ← fetchProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask, fetchProjectSiteConditions, createProjectSiteCondition, updateProjectSiteCondition, deleteProjectSiteCondition, fetchProjectSubcontractors, createProjectSubcontractor, updateProjectSubcontractor, deleteProjectSubcontractor, fetchProjectDocuments, createProjectDocument, updateProjectDocument, deleteProjectDocument, fetchProjectPermits, createProjectPermit, updateProjectPermit, deleteProjectPermit
├── supabaseSampleData.ts    ← insertSampleData, clearSampleData, diagnoseUserRole
```

### Rules:
- Every new module imports `{ supabase }` from `./supabase` and utilities from `./supabaseCore`
- `supabaseData.ts` becomes a **barrel file** that re-exports everything: `export * from './supabaseProjects'` etc.
- **Zero import changes** in any other file. Every existing `import { X } from '@/services/supabaseData'` must continue to work.
- Move the `setSupabaseErrorReporter` export to `supabaseCore.ts` and re-export from barrel.
- Each module file should have a section comment header matching the original.
- Run `npm run build` after this task — zero errors expected since all exports are preserved.

---

## Task 2: Fix Store-Bypass Pages

5 pages currently import directly from `supabaseData.ts`. Fix each by routing through the appropriate store.

### 2a. ProjectDashboard.tsx → projectStore

**Current**: Imports `fetchZoneMaterialDetails` from supabaseData, calls it directly.

**Fix**: Add `fetchZoneMaterialDetails(projectId)` action to `projectStore`. The store action calls the supabaseData function and stores the result. Page imports from `useProjectStore()` instead.

In `projectStore.ts`, add:
```typescript
zoneMaterialDetails: ZoneMaterialDetail[];
fetchZoneMaterialDetails: (projectId: string) => Promise<void>;
```

The action fetches and sets `zoneMaterialDetails`. ProjectDashboard uses `useProjectStore().fetchZoneMaterialDetails(id)` and reads `useProjectStore().zoneMaterialDetails`.

### 2b. CrewDashboard.tsx → scheduleStore

**Current**: Imports `fetchScheduleEntries` from supabaseData, filters by crewMemberId.

**Fix**: `scheduleStore` already has schedule entry management. Add:
```typescript
fetchTodayEntriesForCrew: (orgId: string, crewMemberId: string) => Promise<ScheduleEntry[]>;
```

CrewDashboard uses `useScheduleStore().fetchTodayEntriesForCrew(orgId, memberId)`.

### 2c. CrewJobDetail.tsx → scheduleStore + crewStore

**Current**: Imports 9 functions from supabaseData (schedule, crew status, checklist, photos).

**Fix**: Extend `scheduleStore` with crew-operational methods:
```typescript
// Crew status
crewStatuses: Record<string, CrewStatus>;
fetchCrewStatus: (scheduleEntryId: string) => Promise<void>;
upsertCrewStatus: (status: CrewStatus) => Promise<void>;

// Checklist
checklistProgress: Record<string, ChecklistStep[]>;
fetchChecklistProgress: (scheduleEntryId: string) => Promise<void>;
saveChecklistStep: (step: ChecklistStep) => Promise<void>;
removeChecklistStep: (scheduleEntryId: string, stepIndex: number) => Promise<void>;

// Photos
crewPhotos: Record<string, CrewPhoto[]>;
fetchCrewPhotos: (scheduleEntryId: string) => Promise<void>;
uploadCrewPhoto: (file: File, meta: PhotoMeta) => Promise<string | null>;
getPhotoUrl: (path: string) => string;
```

CrewJobDetail imports everything from `useScheduleStore()`. No direct supabaseData imports.

### 2d. Schedule.tsx → scheduleStore

**Current**: Imports `fetchAllCrewStatuses`, `fetchChecklistProgressCounts`, `fetchCrewPhotos`, `getPhotoUrl`.

**Fix**: These are all schedule-adjacent operations added to scheduleStore in 2c. Schedule.tsx switches to:
```typescript
const { fetchAllCrewStatuses, fetchChecklistProgressCounts, fetchCrewPhotos, getPhotoUrl } = useScheduleStore();
```

### 2e. Settings.tsx → orgStore

**Current**: Imports `insertSampleData`, `clearSampleData` from supabaseData.

**Fix**: Add to `orgStore`:
```typescript
insertSampleData: () => Promise<{ success: boolean; error?: string }>;
clearSampleData: () => Promise<{ success: boolean; error?: string }>;
```

These actions call the supabaseData functions internally, then trigger refreshes on all dependent stores (projects, crew, equipment, materials, schedule). Settings.tsx uses `useOrgStore().insertSampleData()`.

### After all 2a-2e:
- **Zero pages should import from `@/services/supabaseData`**. Run this grep to verify: `grep -r "from '@/services/supabaseData'" src/pages/` should return nothing.
- Run `npm run build` — zero errors.

---

## Task 3: Type Safety — Eliminate `any` in Stores

Replace `any` types in all 7 stores with proper interfaces.

### Pattern to fix:

Most stores use `any` for error objects in catch blocks and for Supabase response data.

**Error objects**: Replace `catch (err: any)` with `catch (err: unknown)` and use type narrowing:
```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  onSupabaseError('FETCH', 'projects', { message });
}
```

**Supabase data**: The `toCamelCase()` function returns `Record<string, any>`. Add explicit return type assertions:
```typescript
const project = toCamelCase(data) as Project;
```

### Files to fix:
1. `src/stores/projectStore.ts` — error catches + data transforms
2. `src/stores/crewStore.ts` — error catches
3. `src/stores/equipmentStore.ts` — error catches
4. `src/stores/materialStore.ts` — error catches
5. `src/stores/scheduleStore.ts` — error catches + new methods from Task 2
6. `src/stores/orgStore.ts` — error catches
7. `src/stores/uiStore.ts` — error catches
8. `src/services/supabaseCore.ts` — `ErrorReporter` type uses `any` for error param, change to `unknown`
9. `src/utils/validation.ts` — replace `any` with specific types
10. `src/components/shared/DataTable.tsx` — replace `any` with generics
11. `src/lib/suggestions.ts` — replace `any` with proper types

**Target**: `grep -r ': any' src/` returns zero matches in stores, services, and lib. Components can have `any` only where truly unavoidable (third-party library callbacks).

Run `npm run build` after — zero errors.

---

## Task 4: Verification

1. `npm run build` passes with zero errors and zero warnings
2. `grep -r "from '@/services/supabaseData'" src/pages/` returns **nothing** (no pages bypass stores)
3. `grep -r ': any' src/stores/ src/services/ src/lib/` returns **zero matches**
4. `supabaseData.ts` is now a barrel file under 100 lines
5. Each new `supabase*.ts` module is under 500 lines
6. All existing functionality works — no behavior changes, only structural refactor
