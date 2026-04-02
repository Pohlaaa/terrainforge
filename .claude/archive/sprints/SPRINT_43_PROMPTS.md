# Sprint 43 — Sample Data Quality & Navigation Fixes

> **Goal**: Fix 7 issues found during Sprint 42 testing. The sample data experience needs to be a polished demo that sells the product. After this sprint, "Load Sample Company" creates a fully realistic contractor environment and all navigation paths work correctly.
>
> **Single sprint** (not a batch). Create a PR when done.
> **Branch**: `sprint-43-sample-data-polish`
> **Design reference**: `.claude/DESIGN_SYSTEM.md`
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-43-sample-data-polish --title "Sprint 43: Sample Data Quality & Navigation Fixes" --body "Fixes: material timestamp error, zone_materials linkage, equipment display, task count mismatch, manifest back nav, widget layout per-user, sample schedule entries."`

---

## CRITICAL CONTEXT

> - Sprint 42 implemented `insertSampleData()` and `clearSampleData()` in `src/services/supabaseData.ts`
> - Sample data definitions are in `src/lib/sampleData.ts`
> - 3 sample projects with zones, tasks, crew, equipment, materials
> - Console error on material insert: `{ code: "22007", message: 'invalid input syntax for type timestamp with time zone: ""' }` — empty string `""` is being sent instead of `null` for a timestamp column
> - Dashboard widget layout is stored in localStorage (not per-user in Supabase)
> - `schedule_entries` table exists (migration 005) — sample data doesn't populate it
> - ManifestEngine is at `/manifest`
> - React 18 + Vite + TypeScript + Tailwind CSS + Supabase
> - RLS requires `org_id` on all inserts

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] `/login` page renders and login works
> - [ ] Landing page renders at `/` for unauthenticated users
> - [ ] Dashboard loads for authenticated users
> - [ ] Project wizard still loads
> - [ ] Settings page still loads
> - [ ] Trial banner shows for trialing users
> - [ ] Existing (non-sample) data still loads correctly

---

## S43-1: Fix createMaterial Timestamp Error (P0)

**Problem**: Console error when inserting sample materials: `invalid input syntax for type timestamp with time zone: ""`. An empty string `""` is being sent for a timestamp column instead of `null` or omitting the field entirely.

**Current state**: Some or all sample materials may be failing to insert, which cascades into the materials tab showing empty in sample projects.

**Investigation steps**:
1. Read `insertSampleData()` in `src/services/supabaseData.ts` — find the material insert logic
2. Read `getSampleMaterials()` in `src/lib/sampleData.ts` — check for any timestamp fields with `""` values
3. Read `createMaterial()` in `src/services/supabaseData.ts` — check what fields it sends to Supabase
4. Check the `materials` table schema — which columns are TIMESTAMPTZ? Likely `created_at`, `updated_at`, or `last_ordered`
5. Find every instance where `""` could be sent for a timestamp field

**Fix**: Replace any `""` (empty string) timestamp values with `null` or omit the field entirely. This applies to:
- The sample data definitions in `sampleData.ts`
- The `createMaterial()` function if it doesn't sanitize inputs
- The `insertSampleData()` function if it's constructing objects with empty timestamp strings

**General rule** (add to the insert flow): Before any Supabase insert, strip empty strings from timestamp fields. A helper like:
```typescript
function sanitizeTimestamps(obj: Record<string, unknown>, timestampFields: string[]): Record<string, unknown> {
  const cleaned = { ...obj };
  for (const field of timestampFields) {
    if (cleaned[field] === '') cleaned[field] = null;
  }
  return cleaned;
}
```

**Self-verification**:
- [ ] `npm run build` passes
- [ ] No `""` values sent for any TIMESTAMPTZ columns
- [ ] Sample materials insert without console errors
- [ ] Materials appear in the materials list after loading sample data

---

## S43-2: Fix Materials Tab in Sample Projects (P1)

**Problem**: Within a sample project, the Materials tab says "No materials yet, add zones and materials to track costs here" even though the project has zones defined.

**Current state**: Sample projects have zones (from `sampleData.ts`), but the Materials tab in the project dashboard isn't finding zone_materials. This could be because:
- S43-1's timestamp error prevented materials from being created (fix that first)
- `zone_materials` rows weren't inserted (linking zones to materials)
- The Materials tab query isn't finding the zone_materials for the sample project's zones

**Investigation steps** (after fixing S43-1):
1. Read the Materials tab component in ProjectDashboard — find how it fetches zone_materials
2. Read `insertSampleData()` — verify it creates `zone_materials` rows linking sample zones to sample materials
3. If zone_materials are being created, check the query: does it filter by project_id → zones → zone_materials correctly?

**Fix**: Ensure `insertSampleData()`:
1. Creates materials first (with valid timestamps — S43-1)
2. Creates zones for each project
3. Creates `zone_materials` rows linking each zone to relevant materials with quantities
4. The Materials tab query chain works: project → zones → zone_materials → materials

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Sample project Materials tab shows zone-grouped materials with quantities
- [ ] Materials tab shows subtotals and project total

---

## S43-3: Fix Equipment Display in Sample Projects (P1)

**Problem**: Within a sample project, equipment entries show "[sample]" followed by the project description text instead of the equipment name/description.

**Current state**: The equipment display in the project dashboard Resources tab is rendering incorrectly for sample data.

**Investigation steps**:
1. Read the Resources tab component in ProjectDashboard — find how equipment is displayed
2. Read `insertSampleData()` — check how equipment is associated with projects
3. Check if there's a `project_equipment` or similar junction table, or if equipment is linked via schedule_entries
4. Check what field the Resources tab reads for the equipment description — it might be reading from the wrong property

**Likely cause**: The sample data insert is putting the project description into an equipment field, or the Resources tab is displaying a relationship field (like `notes` or `assignment`) that got populated with wrong data.

**Fix**: Correct the data being inserted or the field being displayed. Equipment in the Resources tab should show: equipment name, type, status, and any assignment notes — not project descriptions or "[sample]" tags.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Sample project Resources tab shows equipment with correct names and descriptions
- [ ] No "[sample]" tags visible in equipment display

---

## S43-4: Fix Task Completion Count on Project Cards (P1)

**Problem**: When viewing the project list (cards or list view), the task completion percentage/count doesn't match what's shown inside the actual project dashboard.

**Current state**: The Projects page shows project cards with a task completion indicator. The project dashboard Tasks tab shows the actual tasks and their statuses. These numbers don't agree.

**Investigation steps**:
1. Read `src/pages/Projects.tsx` — find how task completion is calculated for the card display
2. Read the Tasks tab in ProjectDashboard — find how it counts completed tasks
3. Compare: are they querying the same table (`project_tasks`)? Using the same status values?
4. Check if the Projects page is using a stale count from the `projects` table (like a `task_count` column) vs. the actual `project_tasks` rows

**Likely cause**: The Projects page card is computing completion from a different source than the project dashboard. Could be:
- Card uses `projects.task_count` (a cached column) while dashboard counts live `project_tasks` rows
- Card counts tasks with `status = 'complete'` while dashboard uses `status = 'completed'` (or similar mismatch)
- Card doesn't account for sample tasks at all

**Fix**: Make the card's task completion count query the same data source as the dashboard Tasks tab. Both should count from `project_tasks` where `project_id = X`.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Project card shows same task completion as project dashboard Tasks tab
- [ ] Works for both sample and real projects

---

## S43-5: Fix Manifest Back Navigation (P1)

**Problem**: After clicking into a project from the ManifestEngine project cards, the back button/navigation returns to the main Dashboard instead of back to the ManifestEngine.

**Current state**: ManifestEngine at `/manifest` shows project cards. Clicking one drills into that project's manifest. Going "back" navigates to `/` instead of `/manifest`.

**Investigation steps**:
1. Read `src/pages/ManifestEngine.tsx` — find how clicking a project card works
2. Is it using `navigate()` to a different route, or is it using internal state to show project details?
3. If it navigates away (e.g., to `/projects/:id`), the "back" from that page would go to browser history — and `/manifest` might not be the previous entry
4. If it uses internal state, look for the "back" button and where it navigates

**Fix depends on the pattern**:
- If ManifestEngine uses internal state (active project selection): the "back" or "close" action should clear the active project and stay on `/manifest`
- If it navigates to a different route: the back button should use `navigate('/manifest')` instead of `navigate(-1)` or `navigate('/')`

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Click a project in ManifestEngine → view manifest details → click back → return to ManifestEngine project cards
- [ ] Does NOT navigate to Dashboard

---

## S43-6: Scope Widget Layout Per User (P2)

**Problem**: Dashboard widget layout is stored in localStorage and persists across accounts. When switching accounts, the widget layout from the previous account carries over.

**Current state**: Widget layout is saved in localStorage (likely under a key like `tf-widget-layout`). It's not scoped to the user/org.

**Investigation steps**:
1. Search for `widget` in localStorage key names — find the storage key
2. Read `src/stores/uiStore.ts` or wherever widget layout state is managed
3. Check if there's already a `user_preferences` table that could store this (likely yes — Sprint 26 added preferences)

**Fix** (choose the simplest that works):
- **Option A (quick)**: Scope the localStorage key by user/org ID: `tf-widget-layout-${orgId}` instead of `tf-widget-layout`
- **Option B (better)**: Store widget layout in the `user_preferences` Supabase table (if it exists and already stores other layout prefs). This makes it persistent across devices.

If Option B is already partially implemented (Sprint 26 added `updateWidgetLayout` in preferences.ts), make sure it's being read on login and that localStorage is only used as a cache.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Sign in as User A, rearrange widgets, sign out
- [ ] Sign in as User B — should see default layout, not User A's layout
- [ ] Sign back in as User A — should see their custom layout

---

## S43-7: Add Sample Schedule Entries (P2)

**Problem**: Sample data doesn't include any schedule entries, so the Schedule page is empty even with sample data loaded.

**Current state**: `schedule_entries` table exists (migration 005). The sample data creates projects, crew, equipment, materials, zones, and tasks — but no schedule entries.

**Files to modify**:
- `src/lib/sampleData.ts` — add sample schedule entries
- `src/services/supabaseData.ts` — update `insertSampleData()` to insert schedule entries, update `clearSampleData()` to delete them

**Implementation details**:

Add 5-8 schedule entries across the 3 sample projects and sample crew. Spread across the current week so they show up on the default schedule view:

Example entries:
- Marco Gutierrez assigned to "Riverside Patio" — Mon-Wed this week, 7am-4pm
- James Wilson assigned to "Cedar Park Front Yard" — Mon-Fri this week, 7am-3pm
- Tyler Brooks assigned to "Thompson Pool Deck" — Thu-Fri this week, 8am-5pm
- Sofia Reyes assigned to "Riverside Patio" — Thu-Fri this week, 7am-4pm

Use relative dates (today, tomorrow, day after) so the sample data always looks current regardless of when it's loaded. Use `new Date()` + day offsets.

**Schedule entry fields** (check the `schedule_entries` table schema):
- Likely: `id`, `org_id`, `project_id`, `crew_member_id`, `date`, `start_time`, `end_time`, `notes`
- Check actual column names by reading `createScheduleEntry()` in supabaseData.ts

**Self-verification**:
- [ ] `npm run build` passes
- [ ] After loading sample data, Schedule page shows entries for the current week
- [ ] Schedule entries reference correct sample projects and crew
- [ ] `clearSampleData()` removes schedule entries

---

## Execution Order

1. **S43-1** — Timestamp error fix (P0 — unblocks S43-2)
2. **S43-2** — Materials tab fix (P1 — depends on S43-1)
3. **S43-3** — Equipment display fix (P1 — independent)
4. **S43-4** — Task completion count fix (P1 — independent)
5. **S43-5** — Manifest back navigation (P1 — independent)
6. **S43-6** — Widget layout per user (P2 — independent)
7. **S43-7** — Sample schedule entries (P2 — depends on S43-1 insert flow)

---

## SQL Migrations Required

**None.**

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] No console errors when loading sample data
- [ ] Sample project Materials tab shows materials grouped by zone
- [ ] Sample project Resources tab shows equipment correctly (no "[sample]" or description bleed)
- [ ] Project card task counts match project dashboard task counts
- [ ] Manifest back navigation returns to manifest (not dashboard)
- [ ] Widget layout doesn't leak between accounts
- [ ] Schedule page shows sample entries for current week
- [ ] clearSampleData removes everything including schedule entries
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] No console.log debug statements left

### Charlie's Test Plan (after merge):
1. Create a new account in incognito → load sample data
2. Check Dashboard — widgets should show default layout
3. Check Projects — 3 sample projects with correct task completion counts
4. Open a sample project:
   - Overview tab: KPIs, tasks summary, budget snapshot
   - Tasks tab: grouped tasks with correct statuses
   - Materials tab: zone-grouped materials with quantities and costs
   - Resources tab: equipment with correct names (no "[sample]" or description bleed)
5. Check Schedule — should show sample crew assignments for this week
6. Check Manifest — select a project, view manifest, click back → should return to manifest project cards
7. Rearrange dashboard widgets → sign out → sign in with different account → widgets should be default
8. Sign back in to first account → widget layout should be preserved
9. Settings → Clear Sample Data → verify all sample data removed
10. Console check: no errors on any page

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
