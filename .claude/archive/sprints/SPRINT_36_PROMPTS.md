# Sprint 36 — Bug Fix & UI Consistency Pass

> **Goal**: Fix every known bug from Sprint 35 testing, eliminate all remaining UI inconsistencies across pages, and ensure every user-facing route is production-ready. After this sprint, a contractor demo should encounter zero visual glitches, broken interactions, or dead-end UX paths.
>
> **Branch**: `sprint-36-bugfix-polish`
> **Design reference**: `.claude/DESIGN_SYSTEM.md` — PageHeader pattern, design tokens, v7 layout system
> **SQL migrations**: None (this sprint is entirely frontend)
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-36-bugfix-polish --title "Sprint 36: Bug Fix & UI Consistency Pass" --body "Fixes all Sprint 35 testing bugs: Settings input, page headers, map routing, project deletion, and full UI consistency pass across all pages."`

---

## CRITICAL CONTEXT

> **Read these files before starting any task:**
> 1. `CLAUDE.md` (project root) — code standards, architecture rules
> 2. `.claude/DESIGN_SYSTEM.md` — design tokens, PageHeader pattern, component patterns
> 3. `.claude/CONTEXT.md` — current state (Sprint 35 complete, M2 done)
>
> **Key constraints:**
> - The app uses CSS custom properties (`var(--brand-primary)`, `var(--surface-card)`, etc.) — never hardcode colors
> - All pages must use the `PageHeader` component for their top-level header (title + optional actions)
> - The project dashboard lives at `/projects/:id` — all project navigation should route there
> - Supabase writes go through `src/services/supabaseData.ts` — never write directly from components
> - Every fix must pass `npm run build` before committing
> - Use incognito testing mindset: assume no localStorage cache, clean state
>
> **What NOT to break:**
> - The 7-step project creation wizard at `/projects/wizard` must remain fully functional
> - The project dashboard's 6 tabs (Overview, Tasks, Budget, Materials, Resources, Compliance) must remain functional
> - The crew app (`/crew/*`) must not be affected by any changes
> - KPI strip, widget grid, and setup checklist on Dashboard must remain functional
> - Onboarding wizard must remain functional

---

## S36-1: Fix Settings Page Input Bug (P0)

**Problem/Goal**: Organization name and display name fields in Settings only accept 1 character at a time. Display name maxes at 6 recurring characters. This is a controlled input state management bug — likely the component is re-rendering and resetting the input value on every keystroke, or the save/update function is firing on every character change instead of on blur/submit.

**Files to investigate and modify**:
- `src/pages/Settings.tsx` — find the org name and display name input handlers
- `src/stores/orgStore.ts` — check if `updateOrgName` or similar is being called on every keystroke

**Investigation steps**:
1. Read `src/pages/Settings.tsx` completely
2. Find the input elements for "Organization Name" and "Display Name"
3. Identify their `onChange` handlers and state management
4. Check if the handler is calling a Supabase update or store action on every keystroke (it should only do this on blur or form submit)

**Root cause patterns to check**:
- `onChange` handler calling an async store action that updates state, causing the component to re-render with the DB value (1 char behind)
- Missing local state — input value bound directly to store state instead of local `useState`
- `useEffect` that resets local state whenever the store value changes, creating a loop
- Debounce missing on a save function

**Fix approach**:
- Input values should be managed with local `useState`, initialized from the store value
- Save should happen on explicit button click or on blur — NOT on every keystroke
- After save completes, update the store state
- The save button should show a loading state while saving and a success confirmation after

**Implementation details**:
- Each editable field needs its own local state: `const [orgName, setOrgName] = useState(org?.name ?? '')`
- `onChange` updates ONLY the local state: `onChange={(e) => setOrgName(e.target.value)}`
- A "Save" button calls the store action with the local state value
- `useEffect` should sync local state FROM store ONLY on initial load (use a ref to track initialization)
- If there's a single "Save Changes" button for the whole form, gather all local state values and save them in one action

**Supabase considerations**: `organizations` table, `name` column. UPDATE requires admin role via RLS. The existing `updateOrgName` action in orgStore should handle this — just ensure it's not being called on every keystroke.

**Acceptance criteria**:
- [ ] Type a full organization name without any character-by-character lag or truncation
- [ ] Type a display name longer than 6 characters without issues
- [ ] Save button persists the change to Supabase
- [ ] Page refresh shows the saved values
- [ ] `npm run build` passes

---

## S36-2: Add PageHeader to All Pages Missing It (P1)

**Problem/Goal**: Several pages still use legacy headers instead of the shared `PageHeader` component. This creates visual inconsistency — some pages have the v7 header style and others don't. Every user-facing page must use `PageHeader` for its title area.

**Files to investigate and modify**:
- First, find the `PageHeader` component: search for `PageHeader` in `src/components/` to locate the file and understand its props interface
- Then audit EVERY page in `src/pages/` to check which ones use `PageHeader` and which don't

**Pages to audit** (check each one):
- `src/pages/Dashboard.tsx`
- `src/pages/Projects.tsx` (main projects list)
- `src/pages/MaterialLibrary.tsx`
- `src/pages/CrewManager.tsx`
- `src/pages/EquipmentManager.tsx`
- `src/pages/Schedule.tsx`
- `src/pages/WorkOrders.tsx`
- `src/pages/ManifestEngine.tsx`
- `src/pages/PriceResearch.tsx`
- `src/pages/Billing.tsx`
- `src/pages/Settings.tsx`

**Known missing from Sprint 35 testing**:
- Equipment Manager — has legacy header
- Crew Manager — has legacy header
- Materials (MaterialLibrary) — no PageHeader at all
- Projects (main list page) — no PageHeader

**Implementation details**:
1. Read the `PageHeader` component to understand its full prop interface (title, subtitle, actions, children, etc.)
2. For each page that does NOT use `PageHeader`, replace its existing header markup with `<PageHeader>`
3. Preserve any action buttons (like "+ New Project", "+ Add Crew Member", etc.) by passing them as the `actions` or `children` prop of PageHeader
4. Preserve any view toggles (list/card view) if they exist in the header area
5. Remove the old header markup completely — don't leave orphaned divs or classes
6. Match the existing pages that already use PageHeader for consistency (look at how they handle search bars, filter dropdowns, and action buttons within the header)

**Design tokens to use** (from DESIGN_SYSTEM.md):
- PageHeader should already use the correct tokens internally
- If manually styling anything around it: `var(--text)` for title, `var(--text-2)` for subtitle, `var(--surface-card)` or `var(--surface2)` for background

**Supabase considerations**: None — frontend-only styling change.

**Acceptance criteria**:
- [ ] Every page listed above uses the `PageHeader` component
- [ ] Action buttons (add/create) are preserved and functional on each page
- [ ] View toggles (list/card) are preserved where they exist
- [ ] No visual regression on pages that already had PageHeader
- [ ] Visual consistency — navigating between any two pages shows the same header pattern
- [ ] `npm run build` passes

---

## S36-3: Fix Map Widget → Project Dashboard Routing (P1)

**Problem/Goal**: Clicking a project pin on the map widget (Dashboard) does not navigate to the new project dashboard at `/projects/:id`. It either goes to the old project detail view, does nothing, or opens a different panel.

**Files to investigate and modify**:
- Search the codebase for the map widget component — likely in `src/components/dashboard/` or `src/components/widgets/`
- Find where map pin click handlers are defined
- Find where project navigation happens (look for `navigate('/projects/` or `useNavigate` calls related to projects)

**Investigation steps**:
1. Find the map widget component (search for "MapWidget", "mapbox", or "map" in dashboard components)
2. Read the component and find the click handler for map pins/markers
3. Check what route it navigates to on pin click
4. Update it to navigate to `/projects/${projectId}` (the new project dashboard)

**Implementation details**:
- The map widget likely uses Mapbox GL markers with popup or click events
- The click handler should call `navigate(\`/projects/${project.id}\`)` using React Router's `useNavigate`
- If the map uses popups with links, update the link href to `/projects/${project.id}`
- If there's a popup with a "View Project" button, ensure it routes to the dashboard
- Also check: the Projects page cards/list items — do they also route to `/projects/:id`? If any project click anywhere in the app goes to the old view instead of the new dashboard, fix those too

**Additional routing audit**:
- Search the entire codebase for any navigation to old project detail routes (e.g., `/projects?selected=`, or a detail panel pattern)
- Every project click/link in the app should now route to `/projects/:id` (the project dashboard)
- Places to check: Dashboard widgets, Projects page cards, Projects page list items, recent activity links, any breadcrumbs

**Supabase considerations**: None — routing change only.

**Acceptance criteria**:
- [ ] Clicking a map pin on the Dashboard navigates to `/projects/:id`
- [ ] Clicking a project card on the Projects page navigates to `/projects/:id`
- [ ] Clicking a project in list view on the Projects page navigates to `/projects/:id`
- [ ] The project dashboard loads correctly with the project's data
- [ ] Back navigation returns to the previous page
- [ ] `npm run build` passes

---

## S36-4: Fix Project Deletion (P1)

**Problem/Goal**: Projects can no longer be deleted. This is likely a regression from the M1.5b dashboard work (Sprints 33-34) — either the delete button was removed, the handler was broken, or the new dashboard component doesn't wire up deletion.

**Files to investigate and modify**:
- `src/pages/Projects.tsx` — check if delete button/handler still exists on project cards/list items
- `src/components/projects/ProjectDashboard.tsx` (or wherever the dashboard lives) — check for delete functionality
- `src/stores/projectStore.ts` — verify `deleteProject` action still works
- `src/services/supabaseData.ts` — verify `deleteProject` function still exists and handles cascading deletes

**Investigation steps**:
1. Read `src/stores/projectStore.ts` — find the `deleteProject` action
2. Read `src/services/supabaseData.ts` — find the `deleteProject` function
3. Read `src/pages/Projects.tsx` — find where delete is triggered (context menu, button, etc.)
4. Check if the project dashboard at `/projects/:id` has a delete option (it should — probably in a header menu or settings area)
5. Trace the full chain: UI trigger → store action → Supabase delete → state update

**Root cause patterns to check**:
- Delete button/menu item was removed during dashboard refactor
- Delete handler references an old state shape or component that no longer exists
- ConfirmDialog for delete was removed or broken
- The `deleteProject` in supabaseData.ts fails silently due to FK constraints from new M1.5 tables (project_tasks, project_subcontractors, project_permits, etc. referencing the project)
- RLS policy blocks the delete

**Fix approach**:
- Ensure delete is accessible from BOTH the Projects list page AND the project dashboard
- On the Projects page: each project card/list item should have a delete option (either a trash icon, context menu, or "..." menu)
- On the project dashboard: add a delete option in the header area (a "..." menu or a "Delete Project" button in a Danger Zone section)
- Delete must show a `ConfirmDialog` before executing
- After successful delete, navigate back to `/projects`
- If FK constraints block deletion: the delete function in supabaseData.ts needs to delete child records first (project_tasks, project_site_conditions, project_subcontractors, project_documents, project_permits) before deleting the project. Order: children first, parent last.

**Supabase considerations**:
- `projects` table — DELETE requires appropriate RLS role
- Child tables with FK to `project_id`: `project_tasks`, `project_site_conditions`, `project_subcontractors`, `project_documents`, `project_permits`, `zones`, `zone_materials`, `schedule_entries`
- If ON DELETE CASCADE is set on FKs, child records auto-delete. If not, manual cascade needed.
- Check the migration files (010, 011) for FK constraint definitions to see if CASCADE is configured

**Acceptance criteria**:
- [ ] Can delete a project from the Projects list page
- [ ] Can delete a project from the project dashboard
- [ ] ConfirmDialog appears before deletion
- [ ] After deletion, user is navigated to `/projects`
- [ ] Deleted project no longer appears in the projects list
- [ ] Child records (tasks, subs, permits, etc.) are cleaned up
- [ ] `npm run build` passes

---

## S36-5: Full UI Consistency Audit & Fix (P2)

**Problem/Goal**: Comprehensive pass across every page to fix remaining visual inconsistencies. This is the final polish before contractor demos and M3 launch prep.

**Scope**: Read every page component in `src/pages/` and fix any inconsistencies with the v7 design system.

**Files to audit and potentially modify** (read ALL of these):
- Every file in `src/pages/`
- `src/components/layout/AppLayout.tsx`
- `src/components/layout/Sidebar.tsx` (or IconRail equivalent)
- `src/components/layout/TopNav.tsx`
- Any shared components in `src/components/shared/`

**Checklist for each page** (apply to every page):

1. **PageHeader**: Uses the shared `PageHeader` component (handled by S36-2, but verify the result)
2. **Card styling**: All cards use consistent border-radius (`var(--radius-lg, 12px)` or `var(--radius-md, 8px)`), consistent background (`var(--surface-card)` or `var(--surface2)`), consistent border (`var(--border)`)
3. **Text hierarchy**: Page titles use `var(--text)`, subtitles use `var(--text-2)`, meta text uses `var(--text-3)`, disabled text uses `var(--text-4)`
4. **Button styling**: All buttons use the shared `Button` component with correct variants (primary/secondary/ghost/danger) — no inline styled buttons
5. **Empty states**: All empty states use the shared `EmptyState` component with action-oriented copy (from Sprint 26)
6. **Spacing**: Consistent padding/margin between sections (check for any page that looks cramped or overly spaced compared to others)
7. **Loading states**: All data-dependent sections show loading indicators, not blank space
8. **Dark theme**: All content renders correctly in dark theme — no white backgrounds, unreadable text, or missing borders
9. **Interactive elements**: All clickable items have hover states, focus rings, and appropriate cursor styles
10. **Touch targets**: All interactive elements are at least 44px tall (tablet-first design principle)

**Specific known issues to fix**:
- Billing page portal button — check if it actually tries to open a Stripe portal. If Stripe isn't configured, it should show a helpful message ("Stripe billing portal not configured yet") instead of failing silently or doing nothing
- Any remaining `console.log` debug statements (search for `console.log` across all files in `src/` — remove development artifacts, keep `[TF-SUPABASE]` error logs)
- Any inline styles that should be using CSS custom properties
- Any hardcoded color values (#hex) that should be using design tokens

**Implementation approach**:
1. Read every page file listed above
2. Make a mental checklist of issues found per page
3. Fix all issues on one page before moving to the next
4. After all pages are fixed, do a final `npm run build`

**Supabase considerations**: None — frontend-only.

**Acceptance criteria**:
- [ ] Every page uses PageHeader (verified)
- [ ] Every page uses consistent card styling
- [ ] Every page respects the dark theme fully
- [ ] No hardcoded hex colors remain in page components
- [ ] No stray `console.log` statements (except `[TF-SUPABASE]` error reporter)
- [ ] Billing portal button has graceful behavior when Stripe isn't configured
- [ ] All empty states use the shared EmptyState component
- [ ] All interactive elements meet the 44px touch target minimum
- [ ] `npm run build` passes

---

## S36-6: Verify & Fix Navigation Integrity (P2)

**Problem/Goal**: Ensure every navigation path in the app works correctly. Every sidebar link, every sub-tab, every button that navigates — they should all go where they claim to go, and the back button should work correctly.

**Files to investigate and modify**:
- `src/App.tsx` — route definitions
- `src/components/layout/Sidebar.tsx` (or icon rail component)
- `src/components/layout/SubTabBar.tsx` (if exists)
- Any component that uses `useNavigate` or `<Link>`

**Navigation audit checklist**:

1. **Sidebar / Icon Rail**: Click every icon — verify each navigates to the correct page
2. **Sub-tabs**: On pages with sub-tabs (if any), verify each tab shows the correct content
3. **Project flow**: Projects list → click project → dashboard loads → back button returns to list
4. **Wizard flow**: Projects → "+ New Project" → wizard step 1 → complete all steps → creates project → navigates to project dashboard or projects list
5. **Quick Create**: The old "Quick Create" modal path still works (if preserved)
6. **Crew app routes**: `/crew/login`, `/crew/schedule`, `/crew/work-orders` — verify these still render (don't need deep testing, just verify routes aren't broken)
7. **Settings sub-sections**: If Settings has tabs (Profile, Company, Preferences, Notifications, Billing, Danger Zone), verify each renders
8. **404 handling**: Navigate to a non-existent route — verify it shows a 404 page or redirects gracefully (not a blank screen)
9. **Auth routes**: `/login`, `/signup` should redirect to `/` if already authenticated
10. **Deep links**: Navigate directly to `/projects/some-uuid` — verify it loads the project dashboard (not a blank screen or error)

**Implementation details**:
- Read `src/App.tsx` to see all route definitions
- For any broken routes: fix the route definition or the component rendering
- For missing routes: add them if they should exist (e.g., `/projects/:id` if it's not defined)
- Ensure `ProtectedRoute` wraps all authenticated routes
- Ensure the crew app routes use `CrewLayout` not `AppLayout`

**Supabase considerations**: None — routing/navigation only.

**Acceptance criteria**:
- [ ] Every sidebar link navigates to the correct page
- [ ] Project list → project dashboard → back button works
- [ ] Wizard flow completes and navigates correctly after creation
- [ ] Settings page tabs all render
- [ ] No route leads to a blank screen or uncaught error
- [ ] Deep linking to `/projects/:id` works
- [ ] `npm run build` passes

---

## Execution Order

Execute tasks in this exact order. Each task builds on the previous and the order minimizes rework.

1. **S36-1** — Settings input bug (P0 — functional blocker, quick fix, high confidence)
2. **S36-4** — Project deletion (P1 — functional regression, may require investigating FK cascades)
3. **S36-3** — Map/project routing (P1 — routing fix, straightforward once investigated)
4. **S36-2** — PageHeader consistency (P1 — touches many files, but each change is mechanical)
5. **S36-5** — UI consistency audit (P2 — comprehensive pass, builds on S36-2's PageHeader work)
6. **S36-6** — Navigation integrity (P2 — final verification pass, confirms everything connects)

**Why this order**:
- S36-1 first because it's a functional blocker in a just-shipped feature
- S36-4 second because it's a regression that blocks a core workflow
- S36-3 third because it's a quick routing fix
- S36-2 fourth because the UI audit (S36-5) depends on PageHeaders being in place first
- S36-5 fifth because it's the broadest task and benefits from all prior fixes being in
- S36-6 last because it's a verification pass that confirms everything works end-to-end

---

## SQL Migrations Required

**None.** This sprint is entirely frontend. No database changes needed.

---

## Post-Sprint Test Plan

> Open `http://localhost:3000` in **incognito** (clean localStorage). Log in with a test account that has at least 1 project with tasks, subs, and permits.

### Settings (S36-1)
1. Navigate to Settings → type a full organization name (10+ characters) without issues
2. Type a display name longer than 6 characters
3. Click Save — verify success confirmation
4. Refresh page — verify saved values persist

### Project Deletion (S36-4)
5. Navigate to Projects → delete a project from the list view (via menu/button)
6. Confirm deletion dialog appears → confirm → project disappears from list
7. Create a new project via wizard → navigate to its dashboard → delete from dashboard
8. Verify child data (tasks, permits) was cleaned up (navigate to dashboard of deleted project URL — should show 404 or redirect)

### Map Routing (S36-3)
9. Navigate to Dashboard → click a project pin on the map widget
10. Verify it navigates to `/projects/:id` (the project dashboard, not an old view)
11. Click back button → returns to Dashboard

### Page Headers (S36-2)
12. Visit every page in sequence: Dashboard, Projects, Materials, Crew, Equipment, Schedule, Work Orders, Manifest, Price Research, Billing, Settings
13. Verify every page has the same PageHeader style at the top
14. Verify action buttons (+ New, + Add) are present and functional on relevant pages

### UI Consistency (S36-5)
15. On each page from step 12: check card styling, text colors, button styles, dark theme rendering
16. Check Billing page — click portal button — verify graceful behavior
17. Open DevTools console — navigate through all pages — verify no `console.log` noise (only `[TF-SUPABASE]` errors if triggered)

### Navigation (S36-6)
18. Click every sidebar icon — verify correct page loads
19. Projects → click a project → dashboard loads → click back → returns to list
20. Projects → "+ New Project" → complete wizard → verify navigation after creation
21. Navigate to `/projects/nonexistent-uuid` — verify no blank screen
22. Navigate to `/some-random-path` — verify 404 or redirect
23. While logged in, navigate to `/login` — verify redirect to `/`

### Full Flow Smoke Test
24. Sign out → sign in → navigate to Dashboard → check KPI strip → create project via wizard → view project dashboard → edit budget → toggle a task → delete the project → verify everything felt smooth and consistent
25. Console check: no unexpected errors throughout
