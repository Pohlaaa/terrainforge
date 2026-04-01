# Sprint 42 — Sample Data & Manifest Routing Fix

> **Goal**: Fix two UX bugs found during Sprint 41 testing: (1) sample data loader doesn't create zones or tasks, making sample projects look empty, and (2) navigating from manifest to projects shows a stale view. After this sprint, "Load Sample Company" creates a fully populated demo experience and all navigation paths are clean.
>
> **Single sprint** (not a batch). Create a PR when done.
> **Branch**: `sprint-42-sample-data-fix`
> **Design reference**: `.claude/DESIGN_SYSTEM.md`
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-42-sample-data-fix --title "Sprint 42: Sample Data & Manifest Routing Fix" --body "Implements insertSampleData/clearSampleData with zones + tasks, fixes manifest-to-projects navigation."`

---

## CRITICAL CONTEXT

> - `src/lib/sampleData.ts` defines sample data: 3 projects (each with 2-3 zones), 6 crew, 5 equipment, 8 materials. Zones ARE defined but tasks are NOT.
> - `insertSampleData` and `clearSampleData` are imported from `@/services/supabaseData` in both Dashboard.tsx and Settings.tsx — **but these functions do NOT exist** in supabaseData.ts. They were never implemented. This is why sample data loading fails silently or crashes.
> - The Dashboard has a `handleLoadSample()` function that calls `insertSampleData(orgId)` and refreshes all stores on success.
> - Settings has `handleClearSampleData()` that calls `clearSampleData(org.id)`.
> - Sample data IDs are tracked in `localStorage` key `tf-sample-ids`.
> - All DB writes go through supabaseData.ts. Existing CRUD functions: `createProject`, `createZone`, `setZoneMaterials`, `createMaterial`, `createCrewMember`, `createEquipment`.
> - Project tasks use the `project_tasks` table (migration 010). Tasks have: `project_id`, `phase`, `title`, `description`, `status`, `is_ai_generated`, `org_id`, etc.
> - React 18 + Vite + TypeScript + Tailwind CSS + Supabase
> - RLS requires `org_id` on all inserts. Zones require `area_sqft > 0` and `perimeter_lnft > 0`.

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] `/login` page renders and login works
> - [ ] Landing page renders at `/` for unauthenticated users
> - [ ] Authenticated users see Dashboard at `/`
> - [ ] Project wizard at `/projects/wizard` still loads
> - [ ] Settings page still loads (sample data buttons in Danger Zone)
> - [ ] Manifest page still loads
> - [ ] Trial banner shows for trialing users
> - [ ] All existing projects/data still load correctly

---

## S42-1: Implement insertSampleData and clearSampleData

**Problem**: `insertSampleData` and `clearSampleData` are imported in Dashboard.tsx and Settings.tsx but don't exist in `supabaseData.ts`. The sample data loader is completely broken.

**Current state**: `src/lib/sampleData.ts` has the data definitions (projects with zones, crew, equipment, materials). The data is well-structured but has no tasks defined. The functions to actually insert this data into Supabase don't exist.

**Files to modify**:
- `src/services/supabaseData.ts` — add `insertSampleData()` and `clearSampleData()`
- `src/lib/sampleData.ts` — add sample tasks for each project

**Implementation details**:

### Add Sample Tasks to sampleData.ts

Add a `getSampleTasks()` function (or embed tasks within each sample project). Each of the 3 sample projects should have 5-8 realistic tasks grouped by phase:

**Riverside Patio & Firepit** (residential hardscape):
- Phase "Site Prep": Clear existing vegetation, Grade and level patio area, Install gravel base
- Phase "Hardscape": Lay paver base and edge restraints, Install flagstone pavers, Build firepit structure
- Phase "Finishing": Apply polymeric sand, Final grading and cleanup

**Cedar Park Front Yard** (landscape design):
- Phase "Demolition": Remove existing lawn and shrubs, Clear planting beds
- Phase "Irrigation": Install drip irrigation lines, Connect to main water supply
- Phase "Planting": Plant trees and large shrubs, Install sod, Mulch all beds
- Phase "Finishing": Install landscape lighting, Final walkthrough

**Thompson Pool Deck** (pool hardscape):
- Phase "Site Prep": Excavate deck area, Compact subgrade, Install drainage
- Phase "Hardscape": Pour concrete pad, Install stone veneer on pool edge, Lay deck pavers
- Phase "Finishing": Seal all surfaces, Install pool fence sections, Final inspection

Each task should have: `title`, `phase`, `description`, `status: 'not_started'`, `is_ai_generated: false`, `sequence` (ordering within phase).

### Implement insertSampleData in supabaseData.ts

```typescript
export async function insertSampleData(orgId: string): Promise<{ success: boolean; error?: string }> {
  // 1. Get sample data from sampleData.ts
  // 2. Insert projects (use createProject or direct supabase insert)
  // 3. Insert zones for each project (use createZone)
  // 4. Insert zone_materials (use setZoneMaterials)
  // 5. Insert tasks for each project (direct supabase insert to project_tasks)
  // 6. Insert crew, equipment, materials (use existing create functions)
  // 7. Track all inserted IDs in localStorage('tf-sample-ids') for cleanup
  // 8. Return { success: true } or { success: false, error: message }
}
```

**Key implementation notes**:
- Use `crypto.randomUUID()` for all IDs (or let Supabase generate them)
- Store all generated IDs in `localStorage` as JSON under key `tf-sample-ids` so `clearSampleData` can remove them
- Insert in dependency order: materials first (no FK deps), then projects, then zones (FK → projects), then zone_materials (FK → zones + materials), then tasks (FK → projects)
- All inserts need `org_id`
- Zone inserts must have `area_sqft > 0` and `perimeter_lnft > 0` (the sample data already has these)
- Wrap in try/catch, return error message on failure

### Implement clearSampleData in supabaseData.ts

```typescript
export async function clearSampleData(orgId: string): Promise<{ success: boolean; error?: string }> {
  // 1. Read IDs from localStorage('tf-sample-ids')
  // 2. Delete in reverse dependency order: zone_materials, zones, tasks, projects, crew, equipment, materials
  // 3. Clear localStorage('tf-sample-ids')
  // 4. Return { success: true } or { success: false, error: message }
}
```

**Supabase considerations**:
- All deletes need the record IDs. Don't delete by org_id (would delete real data too).
- RLS allows org members to delete their own org's records.
- Use `.in('id', idArray)` for batch deletes.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] `insertSampleData` and `clearSampleData` are exported from supabaseData.ts
- [ ] Dashboard.tsx import resolves without error
- [ ] Settings.tsx import resolves without error
- [ ] Sample tasks are defined for all 3 projects (5-8 tasks each)
- [ ] Insert order respects foreign key dependencies
- [ ] All sample data includes org_id

---

## S42-2: Fix Manifest → Projects Navigation

**Problem**: Navigating from the manifest page to projects shows an old/stale project view instead of the current project list or dashboard.

**Current state**: The ManifestEngine page (`src/pages/ManifestEngine.tsx`) has project cards that users can click. The navigation may be pointing to an old route or using a stale component reference.

**Investigation steps**:
1. Read `src/pages/ManifestEngine.tsx` — find all navigation to projects (look for `navigate`, `Link`, `onClick` handlers that change routes)
2. Read `src/pages/Projects.tsx` — understand the current projects view
3. Check `src/App.tsx` — verify `/projects` route points to the correct component
4. Look for any "old project menu" components that might still be rendered somewhere

**Likely causes**:
- ManifestEngine may have a project selector that renders its own mini-project list instead of navigating to `/projects`
- There could be a stale import of an old component
- The projects route in App.tsx might not have been updated when ProjectDashboard was added

**Fix**: Ensure all project navigation paths from manifest lead to either:
- `/projects` (project list view) for "view all projects"
- `/projects/:id` (project dashboard) for clicking a specific project

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Clicking a project from manifest navigates to `/projects/:id`
- [ ] Any "view all projects" link from manifest goes to `/projects`
- [ ] No stale component references

---

## Execution Order

1. **S42-1** — Sample data implementation (larger task, core fix)
2. **S42-2** — Manifest routing fix (investigation + quick fix)

---

## SQL Migrations Required

**None.**

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] `insertSampleData` and `clearSampleData` exist in supabaseData.ts and compile
- [ ] Sample data includes projects, zones, zone_materials, tasks, crew, equipment, materials
- [ ] Insert order respects FK dependencies
- [ ] Clear function removes only sample data (by stored IDs), not real data
- [ ] Manifest page navigates correctly to project views
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] No console.log debug statements left

### Charlie's Test Plan (after merge):
1. Sign in with existing account — verify all existing data still loads
2. Go to Dashboard → click "Load Sample Company" → should succeed with toast
3. Check Projects page — should show 3 sample projects
4. Open a sample project — should have zones, materials, AND tasks populated
5. Go to Manifest — select a sample project — should show materials
6. From Manifest, navigate to a project — should show the project dashboard (not an old view)
7. Go to Settings → Danger Zone → "Clear Sample Data" → should remove only sample data
8. Verify real data (if any) is still intact after clearing
9. Console check: no errors

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
