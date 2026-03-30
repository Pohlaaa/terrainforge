# Sprint 15 — Scheduling Module (Manager Side) + UX Fixes

> **Milestone**: M1 — "Worth the Demo"
> **Goal**: Build the scheduling calendar so a contractor can assign crew to projects by day, see a weekly view, and get a "Today's Schedule" summary on the Dashboard. Also fix the active project context bug, reorder material tabs, and remove the Debug route.
>
> **Branch**: `sprint-15-scheduling`
> **Context files to read**: `CODE_GUIDE.md`, `DESIGN_SYSTEM.md`, `OPERATIONS.md` (scheduling section)
> **SQL migration required**: `supabase/migrations/005_scheduling.sql` — Charlie runs this BEFORE testing
> **CRITICAL RULE**: `npm run build` must pass after every task. Fix any TypeScript errors before moving on.
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-15-scheduling --title "Sprint 15: Scheduling module + UX fixes" --body "M1 scheduling: schedule_entries CRUD, weekly calendar page, drag-drop assignment, Today's Schedule widget, active project fix, material tab reorder, Debug route removal"`

---

## S15-1: Schedule Types and Store

**Goal**: Add TypeScript types for the scheduling system and create the Zustand store.

**Files to create**:
- `src/stores/scheduleStore.ts`

**Files to modify**:
- `src/types/index.ts`

### Types to add to `src/types/index.ts`:

```typescript
export type ScheduleEntryStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface ScheduleEntry {
  id: string;
  orgId: string;
  projectId: string;
  crewMemberId: string;
  equipmentId: string | null;
  scheduledDate: string;       // 'YYYY-MM-DD'
  startTime: string | null;    // 'HH:MM'
  endTime: string | null;      // 'HH:MM'
  notes: string;
  status: ScheduleEntryStatus;
  createdAt: string;
  updatedAt: string;
}
```

### Create `src/stores/scheduleStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduleEntry } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

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
```

- Follow the exact same pattern as `projectStore.ts` for the persist middleware
- `fetchSchedule(weekStart)` fetches entries for 7 days starting from `weekStart`
- `hasConflict` checks if a crew member already has 2+ entries on the same date (warn, don't block)
- `moveEntry` is for drag-and-drop — updates `scheduledDate` and optionally `crewMemberId`
- Seed data: include 5-8 demo schedule entries for the demo projects (`proj_001`, `proj_002`) and demo crew (`crew_001` through `crew_005`), spanning the current week. Use relative dates based on `new Date()`.

**Acceptance criteria**:
- [ ] `ScheduleEntry` type exported from `src/types/index.ts`
- [ ] `scheduleStore.ts` created with all interface methods implemented
- [ ] Store has seed data for demo projects/crew
- [ ] `npm run build` passes

---

## S15-2: Supabase CRUD for Schedule Entries

**Goal**: Add schedule entry CRUD operations to the data service layer.

**Files to modify**:
- `src/services/supabaseData.ts`

### Functions to add:

```typescript
// ===== SCHEDULE ENTRIES =====

export async function fetchScheduleEntries(
  orgId: string,
  startDate: string,  // 'YYYY-MM-DD'
  endDate: string     // 'YYYY-MM-DD'
): Promise<ScheduleEntry[]>
// SELECT * FROM schedule_entries WHERE org_id = orgId AND scheduled_date BETWEEN startDate AND endDate
// Order by scheduled_date, start_time
// Apply toCamelCase to results

export async function createScheduleEntry(
  data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<void>
// INSERT into schedule_entries
// Apply toSnakeCase before insert
// Include org_id

export async function updateScheduleEntry(
  id: string,
  updates: Partial<ScheduleEntry>
): Promise<void>
// UPDATE schedule_entries SET ... WHERE id = id
// Apply toSnakeCase to updates
// Set updated_at = now()

export async function deleteScheduleEntry(id: string): Promise<void>
// DELETE FROM schedule_entries WHERE id = id
```

**Special field mappings to add to the snake/camel case conversion**:
- `crewMemberId` ↔ `crew_member_id`
- `equipmentId` ↔ `equipment_id`
- `projectId` ↔ `project_id`
- `scheduledDate` ↔ `scheduled_date`
- `startTime` ↔ `start_time`
- `endTime` ↔ `end_time`
- `orgId` ↔ `org_id`

These should already be handled by the generic `toCamelCase`/`toSnakeCase` converters, but verify.

**Import the ScheduleEntry type at the top of supabaseData.ts.**

**Acceptance criteria**:
- [ ] All 4 CRUD functions added to `supabaseData.ts`
- [ ] Functions use existing error reporter (`onSupabaseError`)
- [ ] `npm run build` passes

---

## S15-3: Schedule Page — Weekly Calendar View

**Goal**: Create the Schedule page with a weekly calendar showing crew assignments per day.

**Files to create**:
- `src/pages/Schedule.tsx`

**Files to modify**:
- `src/App.tsx` — add route `/schedule`
- `src/components/layout/Sidebar.tsx` — add navigation item

### Route addition in `App.tsx`:

Add between the `/crew` and `/equipment` routes:
```tsx
<Route path="/schedule" element={<ErrorBoundary><Schedule /></ErrorBoundary>} />
```

Import at top:
```tsx
import Schedule from '@/pages/Schedule'
```

### Sidebar navigation item:

In the `navItems` array in `Sidebar.tsx`, add AFTER the crew entry (index 6):
```typescript
{ path: '/schedule', label: 'Schedule', icon: '📅', dotColor: '#818CF8' },
```

### Schedule Page Structure (`src/pages/Schedule.tsx`):

**Layout**: Full-width page with a week selector at top and a grid below.

**Week selector bar**:
- "← Prev Week" button | "Week of March 30, 2026" label | "Next Week →" button | "Today" button
- Uses `useState` for `weekStart` (Monday of the selected week)

**Calendar grid**:
- Header row: Mon | Tue | Wed | Thu | Fri | Sat | Sun (showing date, e.g. "Mon 3/30")
- Left column: crew member names (from `useCrewStore().crew`)
- Cells: each cell shows schedule entries for that crew member on that day
- Each entry rendered as a colored chip: project name, truncated. Color derived from project (use first 6 chars of project ID as hue seed).
- Empty cells show a subtle "+" icon on hover — clicking opens the assignment modal
- Today's column gets a subtle highlight (`var(--brand-primary)` at 10% opacity)

**Assignment modal** (triggered by clicking "+" or an empty cell):
- Project dropdown (from `useProjectStore().projects`)
- Start time (optional)
- End time (optional)
- Notes (optional)
- "Assign" button → calls `scheduleStore.addEntry()`

**Conflict indicator**:
- If a crew member has 2+ entries on the same day, show an amber warning icon on the cell
- Tooltip on hover: "Mike is assigned to 2 projects on this day"

**Styling**:
- Use existing CSS custom properties: `var(--surface-card)`, `var(--border-primary)`, `var(--text-primary)`, etc.
- Grid cells minimum height: 60px
- Entry chips: rounded-md, 12px font, padding 4px 8px
- Responsive: on tablet (<1024px), show 5 days (Mon-Fri) by default with toggle for weekend

**Exports**: `export default Schedule`

**Acceptance criteria**:
- [ ] `/schedule` route works
- [ ] Sidebar shows "Schedule" with 📅 icon
- [ ] Weekly grid renders with crew rows and day columns
- [ ] Week navigation (prev/next/today) works
- [ ] Seed schedule data appears in the correct cells
- [ ] Assignment modal opens on cell click
- [ ] `npm run build` passes

---

## S15-4: Drag-and-Drop Schedule Assignment

**Goal**: Enable dragging schedule entry chips between cells to reassign crew or change days.

**Files to modify**:
- `src/pages/Schedule.tsx`

### Implementation:

Use native HTML5 drag-and-drop (no extra library needed — keeps bundle small):
- Each entry chip gets `draggable={true}`, `onDragStart` sets `dataTransfer` with entry ID
- Each cell gets `onDragOver` (prevent default to allow drop) and `onDrop`
- On drop: call `scheduleStore.moveEntry(entryId, newDate, newCrewMemberId)`
- Visual feedback: dragged chip gets `opacity: 0.5`, drop target cell gets a subtle border highlight

**Drop behavior**:
- Dropping on a different day for the same crew member → changes `scheduledDate`
- Dropping on a different crew member's row → changes both `crewMemberId` and `scheduledDate`
- If the drop creates a conflict (2+ entries same crew same day), show the amber warning but allow it

**Drag state management**: Use `useState` in Schedule.tsx:
```typescript
const [dragEntryId, setDragEntryId] = useState<string | null>(null);
const [dropTarget, setDropTarget] = useState<{ crewId: string; date: string } | null>(null);
```

**Acceptance criteria**:
- [ ] Entry chips are draggable
- [ ] Dropping on a different day moves the entry
- [ ] Dropping on a different crew row reassigns the crew member
- [ ] Conflict warnings appear when appropriate
- [ ] `npm run build` passes

---

## S15-5: "Today's Schedule" Dashboard Widget

**Goal**: Add a widget to the Dashboard showing today's crew assignments at a glance.

**Files to create**:
- `src/components/dashboard/widgets/ScheduleWidget.tsx`

**Files to modify**:
- `src/components/dashboard/WidgetGrid.tsx` — register the new widget
- `src/lib/kpiDefinitions.ts` — add a "Today's Assignments" KPI

### ScheduleWidget component:

```tsx
interface ScheduleWidgetProps {
  // No props needed — reads from scheduleStore
}
```

**Content**:
- Header: "Today's Schedule" with 📅 icon
- List of today's entries: "Mike Reeves → Riverside Patio" (crew name → project name)
- Each entry shows: crew name, project name, status badge (scheduled/in_progress/completed)
- If no entries today: "No crew scheduled today"
- Footer: "View full schedule →" link to `/schedule`

**Styling**: Match existing widget card pattern (see `ProjectsWidget.tsx` or `CrewWidget.tsx` for reference).

### Register in WidgetGrid.tsx:

Add `ScheduleWidget` to the widget map. Import and render it in the same pattern as existing widgets. Assign it widget ID `'schedule'`.

### KPI Definition:

Add to `kpiDefinitions.ts`:
```typescript
{
  id: 'todays_assignments',
  label: "Today's Crew",
  category: 'operations',
  icon: '📅',
  compute: ({ /* needs schedule data — compute from scheduleStore */ }) => ({
    value: todaysEntryCount,
  }),
  colorVar: '--color-primary',
  navigateTo: '/schedule',
},
```

Note: The KPI compute function currently takes `AppState` which doesn't include schedule data. The simplest approach: have the KPI show a static count from the scheduleStore directly in the Dashboard component, rather than refactoring the compute signature. Follow the pattern of how other widgets access store data.

**Acceptance criteria**:
- [ ] ScheduleWidget renders on Dashboard
- [ ] Shows today's schedule entries with crew → project mapping
- [ ] "View full schedule" link navigates to `/schedule`
- [ ] New KPI "Today's Crew" shows the count
- [ ] `npm run build` passes

---

## S15-6: Schedule ↔ Project Integration

**Goal**: Show schedule entries on the project detail panel and allow quick scheduling from projects.

**Files to modify**:
- `src/pages/Projects.tsx`

### On the project detail panel:

When a project is selected and its detail panel is open, add a new section below the existing zones section:

**"Upcoming Schedule" section**:
- Header: "📅 Upcoming Schedule"
- List entries from `scheduleStore.getEntriesForProject(project.id)` that are today or future
- Each entry shows: date, crew member name, status
- "Schedule crew →" button that navigates to `/schedule` (the Schedule page)
- If no upcoming entries: "No crew scheduled — Schedule crew →"

Keep this section simple — it's a read-only summary. All editing happens on the Schedule page.

**Acceptance criteria**:
- [ ] Project detail panel shows "Upcoming Schedule" section
- [ ] Entries for the selected project are listed
- [ ] "Schedule crew" link navigates to Schedule page
- [ ] `npm run build` passes

---

## S15-7: Fix Active Project Context

**Goal**: Fix two UX bugs — sidebar icon doesn't update on project selection, and Work Orders doesn't filter by active project.

**Files to modify**:
- `src/components/layout/Sidebar.tsx`
- `src/pages/WorkOrders.tsx`

### Sidebar fix:

In `Sidebar.tsx`, the active project indicator needs to visually update when `activeProjectId` changes. Find the project indicator section in the sidebar (bottom section showing the active project name). Ensure:
- When `activeProjectId` is set, show the project name with a green dot indicator
- When `activeProjectId` is null, show "No project selected" with a gray dot
- The indicator should re-render when `activeProjectId` changes (it reads from `useProjectStore()` — verify the component re-renders on store changes)

### Work Orders fix:

In `WorkOrders.tsx`, the page currently shows all zones regardless of which project is selected. The `project` variable is already computed from `activeProjectId` (line ~35-38). The fix:

If `activeProjectId` is null, show a prompt: "Select a project to view work orders" with a button linking to `/projects`.

If `activeProjectId` is set but the project has no zones, show the existing empty state.

The page already filters by `activeProjectId` — verify this is actually working. If it shows all projects' zones, the issue is likely in how `project` is used downstream. Trace the data flow from `project` through `generateSteps` and ensure only the active project's zones are processed.

**Acceptance criteria**:
- [ ] Sidebar project indicator updates when a project is selected
- [ ] Work Orders shows only the active project's zones
- [ ] Work Orders shows a prompt when no project is selected
- [ ] `npm run build` passes

---

## S15-8: Material Library Tab Reorder + Debug Route Removal

**Goal**: Reorder Material Library tabs and remove the Debug page from production routing.

**Files to modify**:
- `src/pages/MaterialLibrary.tsx`
- `src/App.tsx`

### Material Library tab reorder:

In `MaterialLibrary.tsx`, find the `tabs` array (around line 381):
```typescript
const tabs = [
  { id: 'library', label: 'Material Library' },
  { id: 'inventory', label: `Inventory On Hand${lowStockCount > 0 ? ` (${lowStockCount} low)` : ''}` },
  { id: 'suppliers', label: 'Suppliers' },
];
```

Change to:
```typescript
const tabs = [
  { id: 'inventory', label: `Inventory On Hand${lowStockCount > 0 ? ` (${lowStockCount} low)` : ''}` },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'library', label: 'Material Library' },
];
```

Verify that the tab content sections render in the correct order to match. The tab panel rendering should be keyed by `id`, not by array index.

### Debug route removal:

In `App.tsx`, the Debug route (line ~56) is already gated by `import.meta.env.DEV`:
```tsx
{import.meta.env.DEV && <Route path="/debug" element={<Debug />} />}
```

This is actually already correct — it only renders in dev mode. Verify this is the case. If it IS already dev-only, this task is already done — just confirm and move on. If it renders in production, wrap it with the `import.meta.env.DEV` check.

**Acceptance criteria**:
- [ ] Material Library opens to "Inventory On Hand" tab by default
- [ ] Tab order: Inventory → Suppliers → Library
- [ ] Debug route only accessible in dev mode (already done — verify)
- [ ] `npm run build` passes

---

## Execution Order

1. **S15-1** (types + store) — foundation, no UI
2. **S15-2** (Supabase CRUD) — data layer
3. **S15-3** (Schedule page) — main UI
4. **S15-4** (drag-and-drop) — enhances S15-3
5. **S15-5** (Dashboard widget) — reads from store
6. **S15-6** (project integration) — reads from store
7. **S15-7** (active project fix) — independent UX fix
8. **S15-8** (tab reorder + Debug) — independent UX fix

Tasks 7 and 8 are independent of 1-6. If blockers arise on scheduling, skip to 7-8.

---

## Post-Sprint: What to Test

**IMPORTANT**: Run `supabase/migrations/005_scheduling.sql` in Supabase SQL Editor BEFORE testing.

### Setup
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git merge sprint-15-scheduling
npm run build
npm run dev
```
Open `http://localhost:3000` in incognito browser.

### New Features
1. **Schedule page** — Click "Schedule" in sidebar → weekly calendar renders with crew rows and day columns
2. **Week navigation** — Click "Next Week" → columns shift. Click "Today" → returns to current week
3. **Create assignment** — Click empty cell → modal opens → select project → click Assign → chip appears
4. **Drag-and-drop** — Drag a chip from Monday to Wednesday → entry moves. Drag to different crew row → reassigns
5. **Conflict warning** — Assign same crew member to 2 projects on same day → amber warning icon
6. **Dashboard widget** — Go to Dashboard → "Today's Schedule" widget shows today's assignments
7. **Project integration** — Open a project detail → "Upcoming Schedule" section shows future entries
8. **KPI** — "Today's Crew" KPI shows count of today's schedule entries

### Regression Checks
1. **Dashboard** — All existing widgets still render (KPI cards, map, crew, fleet, alerts)
2. **Projects** — Create/edit/delete still works
3. **Manifest engine** — Still generates correctly for existing projects
4. **Work Orders** — Now shows only active project's zones (this is the fix, not a regression)
5. **Material Library** — Opens to "Inventory On Hand" tab first (new order)
6. **Sidebar** — Project indicator updates when selecting a project

### Edge Cases
1. **No schedule entries** — Schedule page shows empty cells with "+" indicators
2. **No active project** — Work Orders page shows "Select a project" prompt
3. **Weekend toggle** — On narrower screens, toggle between 5-day and 7-day view
