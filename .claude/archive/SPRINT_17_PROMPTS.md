# Sprint 17 — Crew App Foundation

> **Goal**: Build the crew-facing companion app within the same React app. A field worker opens `/crew`, sees today's assignments, taps into a job to view the work order checklist, and updates their status — all on a phone screen.
>
> **Branch**: `sprint-17-crew-app`
> **Design reference**: None — this sprint uses the existing design system tokens. Mobile-first, high-contrast, large touch targets.
> **SQL migrations**: YES — `supabase/migrations/007_crew_app_auth.sql` must be run BEFORE testing.
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-17-crew-app --title "Sprint 17: Crew App Foundation" --body "Adds crew-facing route tree at /crew/*, CrewLayout, today's schedule view, work order checklist with step completion, and crew status signals. Shares Supabase backend with manager app."`

---

## CRITICAL CONTEXT

> Read these files before starting:
> 1. `CLAUDE.md` (project root) — architecture rules, naming, what NOT to do
> 2. `.claude/CODE_GUIDE.md` — execution workflow
> 3. This file
>
> Key rules:
> - Crew app lives at `/crew/*` — separate route tree, NOT inside AppLayout
> - Uses `CrewLayout` (new component) instead of `AppLayout`
> - Shares: Supabase client, types, services, lib functions, AuthContext
> - Does NOT share: Sidebar, AppLayout, dashboard widgets, manager-specific stores
> - All Supabase queries MUST filter by org_id
> - CSS custom properties from `index.css` — no hardcoded colors
> - Touch targets: minimum 44x44px on all interactive elements
> - The existing `/crew` route (CrewManager page) must be renamed to `/crew-manager` to free up the `/crew` path for the crew app

---

## S17-1: Rename existing /crew route to /crew-manager

**Problem/Goal**: Free up the `/crew` path for the crew app. The existing Crew Manager page (manager-side) is currently at `/crew`.

**Files to modify**:
- `src/App.tsx` — Change route path from `/crew` to `/crew-manager`
- `src/components/layout/Sidebar.tsx` — Update navItems path from `/crew` to `/crew-manager`

**Implementation details**:
1. In `App.tsx`, change the crew route:
   ```tsx
   <Route path="/crew-manager" element={<ErrorBoundary><CrewManager /></ErrorBoundary>} />
   ```
2. In `Sidebar.tsx`, update the navItems array:
   ```tsx
   { path: '/crew-manager', label: 'Crew Manager', icon: '👥', dotColor: '#F87171' },
   ```

**Supabase considerations**: None — frontend-only change.

**Acceptance criteria**:
- [ ] `/crew-manager` loads the Crew Manager page
- [ ] Sidebar "Crew Manager" link navigates to `/crew-manager`
- [ ] `/crew` is now available for the crew app
- [ ] `npm run build` passes

---

## S17-2: Add CrewLayout component

**Problem/Goal**: The crew app needs its own layout shell — no sidebar, mobile-first, minimal chrome.

**Files to create**:
- `src/components/layout/CrewLayout.tsx`

**Implementation details**:

Create `CrewLayout.tsx` with this structure:
```tsx
interface CrewLayoutProps {
  children: React.ReactNode;
}
```

Layout structure:
- Top bar: 56px tall, contains TerrainForge logo text (left), crew member name (center), status indicator dot + sign out button (right)
- Background: `var(--bg-primary)`
- Top bar background: `var(--bg-sidebar)` with bottom border `var(--sidebar-border)`
- Logo: `font-serif text-[16px]` with color `var(--sidebar-text)`
- Main content area: full remaining height, scrollable, padding `16px`
- No sidebar, no navigation tabs — the crew app is a single-purpose view

The crew layout reads the authenticated user from `useAuth()`. It also needs to identify which crew member this user is. Add a simple lookup:
```tsx
const { user, signOut } = useAuth();
const { crew } = useCrewStore();
const crewMember = crew.find(c => c.id === user?.id) || null;
```

Note: In Sprint 17, crew members authenticate as regular Supabase auth users. The `crew_members.user_id` column (added by migration 007) links a Supabase auth user to a crew member record. For now, we'll match by `user_id` field. If no match is found, show a "Not assigned as crew" message.

Actually, since we don't yet have the `user_id` field on the frontend CrewMember type, use a simpler approach for Sprint 17: the crew app reads ALL crew members for the org and lets the user select who they are from a dropdown on first load. Store the selected crew member ID in localStorage as `tf_crew_member_id`. This avoids needing the migration's user_id linkage for MVP.

Sign out button: `text-[12px]`, color `var(--text-3)`, no background, padding `8px 12px`, min-height `44px`.

**Supabase considerations**: None directly — uses existing crew store.

**Acceptance criteria**:
- [ ] CrewLayout renders with top bar and scrollable content area
- [ ] Shows crew member name once selected
- [ ] Sign out button works
- [ ] No sidebar rendered
- [ ] `npm run build` passes

---

## S17-3: Wire up crew app routes in App.tsx

**Problem/Goal**: Add the `/crew/*` route tree that renders inside `CrewLayout` instead of `AppLayout`.

**Files to modify**:
- `src/App.tsx` — Add crew route tree

**Files to create**:
- `src/pages/crew/CrewDashboard.tsx` — Today's schedule (main crew landing page)
- `src/pages/crew/CrewJobDetail.tsx` — Work order checklist for a specific job

**Implementation details**:

In `App.tsx`, add a new top-level route block BEFORE the catch-all `/*` route:

```tsx
import CrewLayout from '@/components/layout/CrewLayout'
const CrewDashboard = React.lazy(() => import('@/pages/crew/CrewDashboard'))
const CrewJobDetail = React.lazy(() => import('@/pages/crew/CrewJobDetail'))

// Inside <Routes>:
{/* Crew app routes — separate layout, no sidebar */}
<Route path="/crew/*" element={
  <ProtectedRoute>
    <CrewLayout>
      <React.Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-2)' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<CrewDashboard />} />
          <Route path="/job/:entryId" element={<CrewJobDetail />} />
        </Routes>
      </React.Suspense>
    </CrewLayout>
  </ProtectedRoute>
} />
```

For S17-3, create minimal placeholder pages:

**CrewDashboard.tsx** — just render:
```tsx
<div className="text-[var(--text)]">
  <h1 className="text-[22px] font-serif mb-[8px]">Today's Schedule</h1>
  <p className="text-[13px] text-[var(--text-3)]">Your assignments will appear here.</p>
</div>
```

**CrewJobDetail.tsx** — just render:
```tsx
<div className="text-[var(--text)]">
  <h1 className="text-[22px] font-serif mb-[8px]">Job Detail</h1>
  <p className="text-[13px] text-[var(--text-3)]">Work order checklist will appear here.</p>
</div>
```

Both files must `export default` the component for lazy loading.

**Supabase considerations**: None — placeholder pages.

**Acceptance criteria**:
- [ ] `/crew` renders CrewLayout with CrewDashboard
- [ ] `/crew/job/some-id` renders CrewLayout with CrewJobDetail
- [ ] No sidebar visible on crew routes
- [ ] Manager routes (/, /projects, etc.) still render with sidebar
- [ ] `npm run build` passes

---

## S17-4: Build CrewDashboard — Today's Schedule

**Problem/Goal**: The main crew app screen. Shows today's assignments for the selected crew member: project name, address, time, and a tap target to open the job detail.

**Files to modify**:
- `src/pages/crew/CrewDashboard.tsx` — Replace placeholder with full implementation

**Implementation details**:

The crew dashboard reads schedule entries for today and filters to the selected crew member.

**Data flow**:
1. Get `crewMemberId` from localStorage (`tf_crew_member_id`)
2. Get `orgId` from `useOrgStore`
3. Call `fetchScheduleEntries(orgId, today, today)` from `supabaseData.ts`
4. Filter entries where `crewMemberId` matches
5. For each entry, look up the project from `useProjectStore` to get name + address

**If no crew member selected**: Show a crew member picker. List all crew members from `useCrewStore()`. Each row is a button (min-height 56px) showing name and role. On tap, save to localStorage and reload.

**If crew member selected but no entries today**: Show an empty state:
- Large icon area: `text-[48px] opacity-30` — use ☀ character
- Title: "No jobs today" — `text-[16px] font-[600] text-[var(--text-2)]`
- Subtitle: "Enjoy your day off." — `text-[13px] text-[var(--text-3)]`

**If entries exist**: Render a card list. Each card:
- Background: `var(--surface-card, var(--surface2))`
- Border: `1px solid var(--border)`
- Border-radius: `12px`
- Padding: `16px`
- Min-height: `80px` (touch-friendly)
- Margin-bottom: `12px`
- On tap: navigate to `/crew/job/${entry.id}`

Card contents:
- **Row 1**: Project name — `text-[15px] font-[600] text-[var(--text)]`
- **Row 2**: Address — `text-[12px] text-[var(--text-3)]` (from project.address)
- **Row 3**: Time range + status badge
  - Time: `text-[12px] font-mono text-[var(--text-2)]` — show `startTime – endTime` or "All day" if no times
  - Status badge: use the existing `Badge` component with variant mapped from entry.status:
    - `scheduled` → `blue`
    - `in_progress` → `amber`
    - `completed` → `green`
    - `cancelled` → `red`
- **Row 4** (if notes): `text-[11px] text-[var(--text-4)] italic mt-[4px]`
- Right side: chevron `▶` — `text-[var(--text-4)] text-[12px]`

**Top of page**: Today's date — `text-[13px] font-[600] text-[var(--text-2)]` formatted as "Monday, March 30". Below it, the greeting: "Hi, {crewMemberName}" — `text-[22px] font-serif text-[var(--text)]`.

**Supabase considerations**:
- Uses `fetchScheduleEntries` from `supabaseData.ts` — already exists
- Reads projects from `useProjectStore` — fetched in AppLayout... but CrewLayout doesn't call fetchProjects. **Add a useEffect in CrewLayout** that calls `fetchOrg` then `fetchProjects`, `fetchCrew`, `fetchEquipment`, `fetchScheduleEntries` after org loads. Same pattern as AppLayout but simplified.

Wait — CrewLayout needs to load data. Add a data fetch effect in CrewLayout:
```tsx
const fetchOrg = useOrgStore((s) => s.fetchOrg);
const fetchProjects = useProjectStore((s) => s.fetchProjects);
const fetchCrew = useCrewStore((s) => s.fetchCrew);

useEffect(() => {
  if (user?.id) {
    fetchOrg(user.id).then(() => {
      fetchProjects();
      fetchCrew();
    });
  }
}, [user?.id]);
```

Schedule entries are fetched directly in CrewDashboard (not via a store), since the crew app only needs today's entries.

**Acceptance criteria**:
- [ ] Crew member picker shows on first visit (no localStorage ID)
- [ ] After selecting crew member, today's schedule entries appear
- [ ] Empty state shows when no entries for today
- [ ] Tapping a card navigates to `/crew/job/{entryId}`
- [ ] `npm run build` passes

---

## S17-5: Build CrewJobDetail — Work Order Checklist

**Problem/Goal**: When a crew member taps a job card, they see the work order checklist for that project's zones. They can tap steps to mark them complete. This is the core daily-use feature.

**Files to modify**:
- `src/pages/crew/CrewJobDetail.tsx` — Replace placeholder with full implementation

**Implementation details**:

**Data flow**:
1. Read `entryId` from URL params (`useParams`)
2. Fetch the schedule entry (already in memory from dashboard, or re-fetch for today's date range)
3. Look up the project from `useProjectStore` using `entry.projectId`
4. Look up materials from `useMaterialStore`
5. Generate work order steps using `generateSteps(zone, materials)` from `@/lib/workorders`

**Page structure**:

**Back button**: Top-left, `← Back` — `text-[13px] text-[var(--green-l)]`, min-height `44px`, navigates to `/crew`

**Project header card**:
- Background: `var(--surface-card, var(--surface2))`
- Border-radius: `12px`, padding: `16px`, margin-bottom: `16px`
- Project name: `text-[18px] font-serif font-[600] text-[var(--text)]`
- Address: `text-[12px] text-[var(--text-3)]`
- Equipment assigned (if `entry.equipmentId`): look up from equipment store, show name — `text-[12px] text-[var(--text-2)]`

**Overall progress bar**: Use the existing `ProgressBar` component. Show "X of Y steps complete".

**Zone sections**: For each zone in the project:
- Zone header: sequence number badge (same style as WorkOrders.tsx — green circle) + zone name + zone progress `X/Y`
- Step list: Each step is a tappable row (min-height `48px`):
  - Left: Step number in a circle (22px, same as WorkOrders) — green with checkmark when done
  - Center: Step text — `text-[13px] text-[var(--text-2)]`, line-through when done
  - On tap: toggle completion

**Step completion state**: Store in component state as `Record<string, Set<number>>` keyed by zone ID (same pattern as WorkOrders.tsx). For Sprint 17, this is local state only — no Supabase persistence. Sprint 18 will add persistence.

**Status update buttons** at the bottom of the page. Fixed to bottom of viewport:
- Container: `fixed bottom-0 left-0 right-0`, background `var(--bg-primary)`, border-top `1px solid var(--border)`, padding `12px 16px`, flex row with gap `8px`
- Three buttons, each flex-1:
  - "En Route" — `bg-[var(--blue, #60A5FA)]` when active, otherwise `bg-[var(--surface2)]`
  - "On Site" — `bg-[var(--green)]` when active
  - "Done" — `bg-[var(--green-l)]` when active
- Active state: white text, colored background
- Inactive state: `text-[var(--text-2)]`, `bg-[var(--surface2)]`, border `1px solid var(--border)`
- Min-height: `44px`, border-radius: `8px`, `text-[13px] font-[600]`
- On tap: update crew_status in Supabase via a new function (see S17-6)

**Acceptance criteria**:
- [ ] Back button navigates to `/crew`
- [ ] Project info card shows name, address, equipment
- [ ] Work order steps render for each zone using `generateSteps`
- [ ] Tapping a step toggles its completion state
- [ ] Progress bar updates as steps are completed
- [ ] Status buttons render at bottom (functionality wired in S17-6)
- [ ] `npm run build` passes

---

## S17-6: Crew Status Updates

**Problem/Goal**: Crew members can signal their status (en route, on site, done). This is visible to managers on the schedule page.

**Files to modify**:
- `src/services/supabaseData.ts` — Add `upsertCrewStatus` function
- `src/pages/crew/CrewJobDetail.tsx` — Wire status buttons to Supabase

**Implementation details**:

**New function in supabaseData.ts**:
```typescript
export async function upsertCrewStatus(
  orgId: string,
  crewMemberId: string,
  scheduleEntryId: string,
  status: string,
): Promise<void> {
  try {
    // Check if a status row exists for this crew member
    const { data: existing } = await supabase
      .from('crew_status')
      .select('id')
      .eq('crew_member_id', crewMemberId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('crew_status')
        .update({
          status,
          schedule_entry_id: scheduleEntryId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('crew_status')
        .insert([{
          org_id: orgId,
          crew_member_id: crewMemberId,
          schedule_entry_id: scheduleEntryId,
          status,
        }]);
      if (error) throw error;
    }
  } catch (err: any) {
    onSupabaseError('UPSERT', 'crew_status', err);
  }
}
```

**In CrewJobDetail.tsx**:
- Track current status in local state: `useState<string>('off_duty')`
- On mount, fetch current status from crew_status table for this crew member
- When a status button is tapped, call `upsertCrewStatus` and update local state
- Map button labels to DB values: "En Route" → `en_route`, "On Site" → `on_site`, "Done" → `done`

**Also add a fetch function in supabaseData.ts**:
```typescript
export async function fetchCrewStatus(crewMemberId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('crew_status')
      .select('status')
      .eq('crew_member_id', crewMemberId)
      .single();
    if (error) return 'off_duty';
    return data?.status || 'off_duty';
  } catch {
    return 'off_duty';
  }
}
```

**Supabase considerations**:
- Table: `crew_status` (created in migration 005, extended in migration 007)
- RLS: `crew_status_self_update` policy allows crew to update their own status
- `crew_status_insert` policy allows any org member to insert
- Status values: `off_duty`, `en_route`, `on_site`, `on_break`, `done`

**Acceptance criteria**:
- [ ] Tapping "En Route" saves status to Supabase and highlights button
- [ ] Tapping "On Site" updates status
- [ ] Tapping "Done" updates status
- [ ] Status persists across page refreshes
- [ ] `npm run build` passes

---

## S17-7: Add crew app link to manager sidebar

**Problem/Goal**: Managers need a quick way to preview the crew app view. Add a link in the sidebar footer area.

**Files to modify**:
- `src/components/layout/Sidebar.tsx` — Add "Crew App" link below the nav items, before settings/sign out

**Implementation details**:

Add a small link after the main navItems list, separated by a divider:

```tsx
{/* After the main nav list, before the bottom section */}
<div style={{ borderTop: '1px solid var(--sidebar-border)', margin: '8px 16px', opacity: 0.3 }} />
<a
  href="/crew"
  target="_blank"
  rel="noopener"
  className="flex items-center gap-[10px] px-[16px] py-[10px] text-[12px] rounded-[8px] transition-colors"
  style={{ color: 'var(--sidebar-text-2)' }}
>
  <span style={{ fontSize: '14px' }}>📱</span>
  {!collapsed && <span>Crew App Preview</span>}
</a>
```

This opens the crew app in a new tab so the manager can see what their crew sees. Use `target="_blank"` so it doesn't disrupt the manager's session.

**Supabase considerations**: None — frontend-only.

**Acceptance criteria**:
- [ ] "Crew App Preview" link visible in sidebar
- [ ] Clicking opens `/crew` in new tab
- [ ] Link hides label when sidebar is collapsed (shows icon only)
- [ ] `npm run build` passes

---

## Execution Order

1. **S17-1** — Rename `/crew` → `/crew-manager` (must be first — frees up the path)
2. **S17-2** — Create `CrewLayout` component (needed by all crew pages)
3. **S17-3** — Wire up crew routes in `App.tsx` with placeholder pages
4. **S17-4** — Build CrewDashboard (today's schedule) — depends on S17-2 and S17-3
5. **S17-5** — Build CrewJobDetail (work order checklist) — depends on S17-4
6. **S17-6** — Crew status updates (Supabase CRUD) — depends on S17-5
7. **S17-7** — Add crew app link to manager sidebar — standalone, last

---

## SQL Migrations Required

**File**: `supabase/migrations/007_crew_app_auth.sql`

Charlie must run this in Supabase SQL Editor BEFORE testing. It adds:
- `user_id`, `email`, `phone`, `pin_hash` columns to `crew_members`
- `lat`, `lng`, `status_note` columns to `crew_status`
- RLS policies for crew self-access (`crew_members_self_select`, `crew_status_self_update`, `schedule_entries_crew_select`)

---

## Post-Sprint Test Plan

### Pre-Test Setup
1. Run migration 007 in Supabase SQL Editor
2. Merge sprint branch, `npm run build`, `npm run dev`
3. Open `http://localhost:3000` in incognito

### Manager App Regression
1. Navigate to Dashboard → loads normally
2. Navigate to Crew Manager (now at `/crew-manager`) → loads, add/edit/delete works
3. Navigate to Schedule → create entry, drag-and-drop works
4. Navigate to Equipment Manager → add equipment works
5. Navigate to Work Orders → select project → page loads, checklist works
6. Sidebar "Crew App Preview" link → opens `/crew` in new tab

### Crew App — New Features
7. Navigate to `/crew` directly → see crew member picker (no one selected yet)
8. Select a crew member → today's date and greeting shown
9. If schedule entries exist for today for that crew member → job cards appear
10. Tap a job card → navigates to `/crew/job/{id}`
11. Job detail shows project name, address, work order checklist with zones and steps
12. Tap steps to mark complete → progress bar updates
13. Tap "En Route" → button highlights, status saved
14. Tap "On Site" → button highlights, status updates
15. Tap "Done" → button highlights
16. Refresh page → status persists (loaded from Supabase)
17. Navigate back to `/crew` → schedule view still works

### Edge Cases
18. Crew app with no schedule entries today → "No jobs today" empty state
19. Crew app for a project with no zones → shows project info but no checklist
20. Sign out from crew app → returns to login page
21. Open manager app and crew app side-by-side → both work independently
