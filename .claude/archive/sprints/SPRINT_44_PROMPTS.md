# Sprint 44 — Hotfix: Sprint 43 Test Failures

> **Goal**: Fix 5 failures from Sprint 43 testing. All must pass before production deploy. These are the last blockers before the sample data experience is demo-ready.
>
> **Single sprint** (not a batch). Create a PR when done.
> **Branch**: `sprint-44-hotfix`
> **Design reference**: None — all fixes are logic/data/navigation
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-44-hotfix --title "Sprint 44: Hotfix — sample data, navigation, widget persistence, cleanup" --body "Fixes 5 Sprint 43 test failures: Resources tab crew/equipment, schedule entries, manifest back nav, widget layout persistence, clearSampleData."`

---

## CRITICAL CONTEXT

> - Sprint 43 landed timestamp sanitization, zone_materials linkage, and task count fixes — those PASSED testing
> - 5 items FAILED testing — this sprint fixes only those 5
> - Sample data is inserted by `insertSampleData()` in `src/services/supabaseData.ts`
> - Sample data definitions are in `src/lib/sampleData.ts`
> - `clearSampleData()` is also in `src/services/supabaseData.ts`
> - Widget layout state is managed by `src/stores/uiStore.ts`
> - Widget layout persistence was added in Sprint 43 via `user_preferences` in Supabase
> - ManifestEngine is at `src/pages/ManifestEngine.tsx`, route `/manifest`
> - `schedule_entries` table (migration 005): columns likely include `id`, `org_id`, `project_id`, `crew_member_id`, `date`, `start_time`, `end_time`, `notes`
> - RLS requires `org_id` on all inserts AND deletes
> - RLS violations return 0 rows silently — no error. If inserts/deletes seem to do nothing, check RLS policies FIRST
> - React 18 + Vite + TypeScript + Tailwind CSS + Supabase

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] `/login` page renders and login works
> - [ ] Landing page renders at `/` for unauthenticated users
> - [ ] Dashboard loads for authenticated users
> - [ ] Sample data load completes without console errors (S43 fix — don't break this)
> - [ ] Project cards show correct task completion counts (S43 fix — don't break this)
> - [ ] Materials tab in sample project shows zone-grouped materials (S43 fix — don't break this)
> - [ ] Project wizard still loads
> - [ ] Settings page still loads

---

## S44-1: Fix Resources Tab — No Crew, No Equipment (P0)

**Problem**: Opening a sample project → Resources tab shows no crew and no equipment. This was partially addressed in Sprint 43 (equipment display fix) but the data isn't appearing at all.

**Current state**: The Resources tab in ProjectDashboard should show crew assigned to the project and equipment used. Sprint 43 attempted to fix equipment display, but testing shows neither crew nor equipment appear.

**Investigation steps**:
1. Read the Resources tab component in ProjectDashboard — find what data it expects and how it fetches it
2. Trace the data source: does it read from `schedule_entries` (crew assignments per project)? From a `project_equipment` table? From the `projects` table itself?
3. Read `insertSampleData()` — verify it creates the associations that the Resources tab queries
4. Check if the Resources tab has any filtering (e.g., filtering by date range or status) that might exclude sample data
5. Check Supabase: are the association rows actually in the database, or are the inserts silently failing?

**Root cause patterns to check**:
- Resources tab queries `schedule_entries` for crew → sample schedule entries may not be inserting (related to S44-2)
- Resources tab queries equipment from a field on the project or from a junction table → sample data may not populate that field
- The component may expect data in a shape that doesn't match what `insertSampleData()` provides

**Fix**: Ensure the data `insertSampleData()` creates matches exactly what the Resources tab component queries. This means:
1. Read the component's fetch logic first
2. Understand what tables/columns it reads
3. Make `insertSampleData()` populate those exact tables/columns
4. Verify with `npm run build` that types align

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Read the Resources tab fetch logic — confirm data source
- [ ] Confirm `insertSampleData()` creates rows in that data source
- [ ] No TypeScript errors in the Resources tab component

---

## S44-2: Fix Schedule Page — No Sample Schedule Data (P0)

**Problem**: After loading sample data, the Schedule page shows no crew schedule entries. Sprint 43 added `getSampleScheduleEntries()` and schedule insert logic, but entries aren't appearing.

**Current state**: `insertSampleData()` supposedly creates schedule entries, and `getSampleScheduleEntries()` was added in Sprint 43. But the Schedule page shows nothing.

**Investigation steps**:
1. Read `getSampleScheduleEntries()` in `src/lib/sampleData.ts` — check the entry format
2. Read the schedule entry insert logic in `insertSampleData()` — find where it inserts into `schedule_entries`
3. Read `createScheduleEntry()` in `src/services/supabaseData.ts` — check the expected column names and field mapping
4. **Compare field names**: Does `getSampleScheduleEntries()` use the same field names that `createScheduleEntry()` expects? Common mismatch: camelCase in sample data vs snake_case expected by the insert function, or vice versa
5. Check if the insert is wrapped in a try/catch that swallows errors silently
6. Check the Schedule page component — does it filter by date range? Are sample entries using dates that fall within the visible range?
7. **Check RLS**: Does `schedule_entries` have an INSERT policy that allows the current user's role? Log the full error object, not just `.message`

**Common failure patterns**:
- Date format mismatch: Schedule page may expect `YYYY-MM-DD` strings while sample data provides Date objects (or vice versa)
- The sample entries use `crew_member_id` values that don't match actual inserted crew IDs (name lookups may have failed)
- RLS blocks the insert silently — check that `org_id` is included and matches
- `start_time`/`end_time` format: the table may expect `HH:MM:SS` or a full timestamp — check what `createScheduleEntry()` sends for non-sample entries

**Fix**: Make schedule entry inserts succeed and make the entries visible on the Schedule page for the current week. The entries must:
1. Use the correct field names matching `createScheduleEntry()` or the direct Supabase insert
2. Reference valid `crew_member_id` values (from the crew created earlier in `insertSampleData()`)
3. Reference valid `project_id` values (from the projects created earlier)
4. Use dates within the current week
5. Include `org_id`

**Self-verification**:
- [ ] `npm run build` passes
- [ ] `insertSampleData()` schedule insert logic uses correct field names
- [ ] Sample schedule entries reference valid crew_member_id and project_id values
- [ ] Entries use dates in the current week (relative to `new Date()`)
- [ ] `org_id` is included on every schedule entry insert

---

## S44-3: Fix Manifest Back Navigation (P1)

**Problem**: After clicking into a project from ManifestEngine's project card list, clicking "back" navigates to the Dashboard (`/`) instead of back to the ManifestEngine project list (`/manifest`).

**Current state**: Sprint 43 added a "Back to Manifest Projects" button, but testing shows it still navigates to Dashboard.

**Investigation steps**:
1. Read `src/pages/ManifestEngine.tsx` fully — understand the component's structure
2. Find ALL navigation calls: search for `navigate(`, `useNavigate`, `Link`, `href`, `history` within ManifestEngine.tsx
3. Identify which navigation path fires when the user clicks "back" from a project manifest view
4. Check: is the "Back to Manifest Projects" button from Sprint 43 actually being rendered? Or is a different back button taking precedence?
5. Check if ManifestEngine uses internal state (active project) or route-based navigation to show project details

**Fix depends on pattern**:
- **If internal state pattern** (ManifestEngine has `selectedProject` state): The back action should call `setSelectedProject(null)` to return to the card list — NOT `navigate('/')` or `navigate(-1)`
- **If route-based pattern** (clicks go to `/projects/:id` or `/manifest/:id`): The back button at that destination must use `navigate('/manifest')` explicitly — NOT `navigate(-1)` (which goes to browser history, unpredictable) and NOT `navigate('/')` 
- **Check for multiple back buttons**: There may be a back button in a page header or breadcrumb that uses a generic `navigate('/')`. If so, the ManifestEngine-specific back button must override or replace it

**Key rule**: The fix must use an explicit path (`'/manifest'`) or state reset (`setSelectedProject(null)`). Never rely on `navigate(-1)` for this — browser history is unpredictable.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Read ManifestEngine.tsx — identify ALL navigate calls
- [ ] The back/return action from a project manifest view navigates to `/manifest` or clears selected project
- [ ] No `navigate(-1)` or `navigate('/')` in the manifest-to-project-list return path

---

## S44-4: Fix Widget Layout Persistence (P1)

**Problem**: When a user rearranges dashboard widgets, signs out, and signs back in, the custom layout is not preserved — default layout loads instead. However, the default layout correctly loads for NEW accounts (no cross-account leakage).

**Current state**: Sprint 43 added `setWidgetLayout` action to uiStore and loads widget layout from `user_preferences` on login. The "load default for new accounts" part works. The "persist custom layout" part does not.

**Investigation steps**:
1. Read `src/stores/uiStore.ts` — find the `setWidgetLayout` action and the widget layout state
2. Search for where `setWidgetLayout` is called — is it called when the user rearranges widgets?
3. Find the widget arrangement/drag handler — when a user moves a widget, does it:
   a. Update local state (uiStore)? 
   b. Save to Supabase `user_preferences`?
4. Read the login/auth flow — when a user signs in, does it:
   a. Fetch `user_preferences` from Supabase?
   b. Call `setWidgetLayout()` with the saved layout?
5. Check `user_preferences` table: is there a column for widget layout? What format does it expect?

**Root cause patterns**:
- **Save not wired**: Widget rearrange updates uiStore but never calls a Supabase save function
- **Save fires but fails silently**: The upsert to `user_preferences` may be failing (RLS, wrong column name, wrong data format)
- **Load works but overwrites**: Login flow may load from Supabase correctly, but then a default layout initialization runs AFTER and overwrites it
- **Race condition**: The Supabase fetch completes after the component has already rendered with defaults, and the result is ignored

**Fix**: Ensure the full round-trip works:
1. User rearranges widgets → uiStore updates → Supabase `user_preferences` saves the layout
2. User signs in → Supabase `user_preferences` fetched → uiStore populated with saved layout → Dashboard renders with saved layout
3. If no saved layout exists in Supabase → use DEFAULT_WIDGET_LAYOUT (this already works)

**Important**: The save must be debounced or only fire on a stable state (not on every pixel of a drag). Check if there's already a save mechanism — it may just need to be connected.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Widget rearrange calls a save function (to Supabase, not just uiStore)
- [ ] Login flow loads saved layout from Supabase and applies it to uiStore
- [ ] No race condition: saved layout isn't overwritten by default initialization after login

---

## S44-5: Fix clearSampleData (P1)

**Problem**: Clicking "Clear Sample Data" in Settings does not remove the sample data. After clearing, sample projects, crew, equipment, materials, and schedule entries all remain.

**Current state**: `clearSampleData()` exists in `src/services/supabaseData.ts`. Sprint 43 added schedule entry deletion. But testing shows nothing gets removed.

**Investigation steps**:
1. Read `clearSampleData()` in `src/services/supabaseData.ts` — what does it actually do?
2. Check: is `clearSampleData()` actually being called when the user clicks the button? Read the Settings page component — find the "Clear Sample Data" button handler. Add a console.log or verify the call chain.
3. Check: does `clearSampleData()` receive the `orgId` parameter? Without it, RLS blocks all deletes silently.
4. Read the delete logic: what tables does it delete from? In what order?
5. **Deletion order matters** — foreign key constraints require deleting child rows before parent rows:
   - Delete `schedule_entries` first (references `project_id`, `crew_member_id`)
   - Delete `zone_materials` (references `zone_id`, `material_id`)
   - Delete `project_tasks` (references `project_id`)
   - Delete `project_site_conditions` (references `project_id`)
   - Delete `project_subcontractors` (references `project_id`)
   - Delete `project_permits` (references `project_id`)
   - Delete `zones` (references `project_id`)
   - Delete `crew_members`
   - Delete `equipment`
   - Delete `materials`
   - Delete `projects` (last — everything else references it)
6. Check: how does `clearSampleData()` identify sample data? By a `is_sample` flag? By name patterns? By IDs stored during insert?
7. **Check RLS on DELETE**: Do the relevant tables have DELETE policies? If not, deletes are silently blocked.

**Common failure patterns**:
- Function isn't being called at all (button handler broken or wired to wrong function)
- `orgId` not passed → RLS blocks all deletes → returns 0 rows deleted, no error
- Foreign key constraint violations → first delete fails silently, function continues but can't delete parent rows either
- Function deletes from some tables but misses others (e.g., deletes projects but not crew, equipment, materials)
- Sample data identification fails (e.g., looks for `is_sample = true` but that column doesn't exist, or looks for specific IDs that don't match)

**Fix**: Make `clearSampleData()` reliably:
1. Accept `orgId` as a parameter (and verify the caller passes it)
2. Delete in correct order (children before parents — see order above)
3. Identify sample data correctly (whatever method was chosen — flag, name pattern, or stored IDs)
4. Delete from ALL tables that `insertSampleData()` populated
5. Log any errors with full error objects (not just `.message`)
6. After deletion, refresh the relevant stores so the UI updates immediately

**Self-verification**:
- [ ] `npm run build` passes
- [ ] `clearSampleData()` is called when button is clicked (trace the handler)
- [ ] `clearSampleData()` receives `orgId`
- [ ] Deletion order respects foreign key constraints
- [ ] All tables populated by `insertSampleData()` are also cleared by `clearSampleData()`
- [ ] After clearing, refreshing the page shows empty states (no leftover data)

---

## Execution Order

1. **S44-1** — Resources tab fix (P0 — investigate data source first, may inform S44-2)
2. **S44-2** — Schedule entries fix (P0 — may share root cause with S44-1 if Resources reads from schedule_entries)
3. **S44-3** — Manifest back navigation (P1 — independent, quick fix)
4. **S44-4** — Widget layout persistence (P1 — independent)
5. **S44-5** — clearSampleData fix (P1 — do last, after inserts are confirmed working, so you know what needs to be deleted)

---

## SQL Migrations Required

**None.**

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] Sample project Resources tab shows crew and equipment
- [ ] Schedule page shows sample entries for the current week
- [ ] ManifestEngine: click project → view manifest → back → returns to `/manifest` project cards
- [ ] Widget layout: rearrange → sign out → sign in → custom layout loads (not default)
- [ ] Widget layout: new account gets default layout (no cross-account bleed)
- [ ] clearSampleData removes ALL sample data (projects, crew, equipment, materials, zones, tasks, schedule entries, zone_materials)
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] No `console.log` debug statements left in code
- [ ] `git diff --stat` — only expected files modified

### Charlie's Test Plan (after merge):
> Open `http://localhost:3000` in **incognito** (clean localStorage).

1. Create a new account → load sample data → no console errors
2. Dashboard — default widget layout, KPIs populated
3. Projects — 3 sample projects, task completion counts correct
4. Open sample project:
   - Tasks tab: grouped tasks ✓ (S43 fix)
   - Materials tab: zone-grouped materials ✓ (S43 fix)
   - **Resources tab: crew assignments and equipment visible**
5. **Schedule page: sample crew entries visible for this week**
6. **Manifest: click project → view manifest → back → returns to /manifest project cards**
7. **Rearrange dashboard widgets → sign out → sign in with same account → custom layout preserved**
8. Sign in with different account → default layout (no bleed)
9. **Settings → Clear Sample Data → all sample data removed, pages show empty states**
10. Console check: no errors on any page

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
