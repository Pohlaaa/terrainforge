# TerrainForge — UI Rebuild + Contractor Features

> **Goal**: Replace the current multi-page sidebar navigation with a 4-tab hub layout. Integrate contractor feature requests. Same data layer (just refactored), new presentation layer.
>
> **Branch**: `rebuild-ui-hub`
> **SQL migrations**: `014_contractor_fields.sql` — Charlie runs BEFORE execution
> **Architecture reference**: `.claude/ARCHITECTURE.md` (read FIRST)
> **Design reference**: `.claude/DESIGN_SYSTEM.md` (read for tokens, typography, component patterns)
> **Contractor feedback**: `.claude/CONTRACTOR_FEEDBACK.md` (read for feature requirements)

---

## CRITICAL CONTEXT

### What's Changing
The app moves from 10+ sidebar pages to a **4-tab hub** with a top navigation bar. The tabs are:

1. **Projects** — KPI cards + project progress chart + map toggle + project data table
2. **Budget & Finance** — KPI cards + revenue/expense charts + expense breakdown + invoices
3. **Materials** — KPI cards + low stock alerts + inventory table + purchase orders
4. **Crew & Equipment** — KPI cards + crew cards + weekly schedule grid + equipment table

Secondary pages (Manifest Engine, Work Orders, Price Research, Settings, Billing) move to a "More" dropdown in the top nav.

### What's NOT Changing
- All Zustand stores and the data layer (just refactored — don't touch stores or supabaseData.ts unless adding new fields)
- Auth flow (login, signup, forgot-password, protected routes)
- Supabase schema (except migration 014 for new fields)
- ProjectDashboard with its 6 tabs (Overview, Tasks, Resources, Budget, Materials, Compliance)
- Project wizard (just changes launch point — button on Projects tab instead of sidebar nav)
- PDF templates, manifest engine, work orders, AI integration
- Landing page, onboarding flow

### Navigation Structure (NEW)
```
┌──────────────────────────────────────────────────────────────────┐
│ [TF Logo]  Projects  Budget & Finance  Materials  Crew & Equip  │  ← Top nav bar
│                                            [🔔] [More ▾] [👤]  │
└──────────────────────────────────────────────────────────────────┘
│                                                                   │
│  Tab Content Area                                                 │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

"More" dropdown:
  - Manifest Engine → /manifest
  - Work Orders → /work-orders
  - Price Research → /price-research
  - Settings → /settings
  - Billing → /billing
```

### Theme
- **Dark mode remains the default** (brand decision, documented in DESIGN_SYSTEM.md)
- Add a light/dark toggle in user menu (top-right avatar dropdown)
- Both themes already have CSS custom properties defined in DESIGN_SYSTEM.md
- The `[data-theme="dark"]` selector in index.css handles dark theme overrides
- Toggle persists in localStorage via uiStore

---

## PRE-FLIGHT: Read These Files

Before writing any code:
1. `.claude/ARCHITECTURE.md` — store boundaries, data flow, fetch patterns
2. `.claude/DESIGN_SYSTEM.md` — color tokens, typography, component specs
3. `.claude/CODE_GUIDE.md` — execution rules, verification protocol
4. `.claude/CONTRACTOR_FEEDBACK.md` — feature requirements to integrate
5. `CLAUDE.md` (project root) — naming conventions, what NOT to do
6. `src/index.css` — actual CSS variable names (may differ from design spec names)
7. `src/types/index.ts` — existing type definitions
8. `src/components/layout/Sidebar.tsx` — current nav (being replaced)
9. `src/components/layout/AppLayout.tsx` — current layout wrapper (being replaced)

---

## MIGRATION 014: Contractor Fields

**File**: `supabase/migrations/014_contractor_fields.sql`

Charlie runs this in Supabase SQL Editor BEFORE code execution.

```sql
-- Migration 014: Contractor feedback fields
-- Adds fields requested by contractor testing

-- Crew: phone number
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS phone TEXT;

-- Equipment: hourly cost and equipment type
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS hourly_cost NUMERIC;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS equipment_type TEXT;

-- Equipment type CHECK constraint (landscaping-specific)
-- Using TEXT + CHECK per project conventions (never ENUM)
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_type_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_type_check CHECK (
  equipment_type IS NULL OR equipment_type IN (
    'excavator', 'mini-excavator', 'skid-steer', 'mini-skid-steer',
    'tractor', 'dump-truck', 'trailer', 'pickup-truck', 'other'
  )
);

-- Projects: disposal cost and equipment cost budget fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS disposal_cost NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS equipment_cost NUMERIC;

-- Organizations: rate settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_labor_rate NUMERIC;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_equipment_rate NUMERIC;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS disposal_rates JSONB DEFAULT '{}';
```

---

## TASK 1: Types Update

**File**: `src/types/index.ts`

Add/update these fields on existing interfaces:

```typescript
// On CrewMember interface — add:
phone: string | null;

// On Equipment interface — add:
hourlyCost: number | null;
equipmentType: string | null;

// On Project interface — add:
disposalCost: number | null;
equipmentCost: number | null;

// On Organization interface — add:
defaultLaborRate: number | null;
defaultEquipmentRate: number | null;
disposalRates: Record<string, number>;  // category → rate

// NEW: Equipment type constants (for dropdown)
export const EQUIPMENT_TYPES = [
  { value: 'excavator', label: 'Excavator' },
  { value: 'mini-excavator', label: 'Mini-Excavator' },
  { value: 'skid-steer', label: 'Skid Steer' },
  { value: 'mini-skid-steer', label: 'Mini Skid Steer' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'dump-truck', label: 'Dump Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'pickup-truck', label: 'Pickup Truck' },
  { value: 'other', label: 'Other' },
] as const;
```

**Self-verification:**
- [ ] `npm run build` passes
- [ ] No duplicate or conflicting type names
- [ ] New fields are nullable (existing records don't have them)

---

## TASK 2: supabaseData.ts — Field Mappings

**File**: `src/services/supabaseData.ts`

Update the snake_case ↔ camelCase mappings to handle the new fields:

- `phone` → `phone` (same in both)
- `hourly_cost` → `hourlyCost`
- `equipment_type` → `equipmentType`
- `disposal_cost` → `disposalCost`
- `equipment_cost` → `equipmentCost`
- `default_labor_rate` → `defaultLaborRate`
- `default_equipment_rate` → `defaultEquipmentRate`
- `disposal_rates` → `disposalRates`

Verify these new fields are included in the SELECT and INSERT/UPDATE operations for their respective tables. The existing `toSnakeCase()` / `toCamelCase()` utility functions should handle most of this automatically if they're generic mappers. If they have explicit field lists, add the new fields.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] New fields round-trip correctly through snake↔camel mapping

---

## TASK 3: Layout Shell — TopNav + Tab Router

This is the biggest structural change. Replace the Sidebar + AppLayout with a TopNav + Tab content area.

### 3a: Create TopNav component

**File**: `src/components/layout/TopNav.tsx` (NEW)

```
┌──────────────────────────────────────────────────────────────────┐
│ [TF Logo]  Projects  Budget & Finance  Materials  Crew & Equip  │
│                                            [🔔] [More ▾] [👤]  │
└──────────────────────────────────────────────────────────────────┘
```

Structure:
- Logo (left) — links to / (which is now Projects tab)
- 4 tab links (center-left):
  - Projects → `/`
  - Budget & Finance → `/budget`
  - Materials → `/materials`
  - Crew & Equipment → `/crew`
- Right side:
  - Alert bell icon (links to alerts or shows dropdown)
  - "More" dropdown button with secondary nav items:
    - Manifest Engine → `/manifest`
    - Work Orders → `/work-orders`
    - Price Research → `/price-research`
    - Settings → `/settings`
    - Billing → `/billing`
  - User avatar dropdown:
    - User name/email
    - Theme toggle (Dark/Light)
    - Sign Out

Active tab gets an underline indicator using `var(--brand-primary)`.

Styling:
- Full-width, fixed at top of viewport
- Height: 56px
- Background: `var(--surface-card)` with bottom border `var(--border-default)`
- Tab text: `var(--text-secondary)`, active: `var(--text-primary)` + green underline
- Use existing CSS custom properties from `src/index.css`

Responsive:
- Desktop (>1024px): full labels
- Tablet (640-1024px): abbreviated labels or icons + labels
- Phone (<640px): hamburger menu that opens a slide-out with all nav items

### 3b: Update AppLayout

**File**: `src/components/layout/AppLayout.tsx` (MODIFY)

Replace the current Sidebar + content layout with:
```tsx
<div className="app-layout">
  <TopNav />
  <main className="main-content">
    <Outlet /> {/* or children */}
  </main>
</div>
```

Remove sidebar-related state and props. The main content area should be full-width below the TopNav.

### 3c: Update Routes

**File**: `src/App.tsx` or wherever routes are defined

Update route mapping:
- `/` → Projects tab (was Dashboard)
- `/budget` → Budget & Finance tab (NEW)
- `/materials` → Materials tab (was `/materials`)
- `/crew` → Crew & Equipment tab (merges `/crew-manager` + `/equipment` + `/schedule`)
- `/projects/:id` → ProjectDashboard (UNCHANGED)
- `/projects/new` → ProjectWizard (UNCHANGED)
- `/manifest` → ManifestEngine (UNCHANGED)
- `/work-orders` → WorkOrders (UNCHANGED)
- `/price-research` → PriceResearch (UNCHANGED)
- `/settings` → Settings (UNCHANGED)
- `/billing` → Billing (UNCHANGED)

Remove old routes: `/crew-manager`, `/equipment`, `/schedule` (absorbed into `/crew`)

### 3d: Remove Sidebar

Don't delete `src/components/layout/Sidebar.tsx` yet — just stop rendering it. We can delete after verification.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] TopNav renders with 4 tabs
- [ ] Active tab indicator works on route change
- [ ] "More" dropdown opens and links work
- [ ] User menu dropdown opens with sign out
- [ ] Routes navigate correctly
- [ ] No sidebar visible

---

## TASK 4: Projects Tab (Home Page)

**File**: `src/pages/Dashboard.tsx` → **rename/refactor to** `src/pages/ProjectsHub.tsx` (or refactor in place)

This replaces both the old Dashboard and Projects pages.

### Layout:
```
┌─ KPI Cards ──────────────────────────────────────────┐
│ [Active Projects] [Completed] [Total Revenue] [Avg %]│
└──────────────────────────────────────────────────────┘

┌─ Visualization ──────────────────────────────────────┐
│  [Chart ▾ | Map]          [+ New Project]            │
│                                                       │
│  Bar chart: project progress (green=complete,         │
│  blue=remaining per project) — OR — Interactive map   │
│                                                       │
└──────────────────────────────────────────────────────┘

┌─ Projects Table ─────────────────────────────────────┐
│ Project    | Client | Status | Progress | Budget | ↕ │
│ Oak St     | Smith  | Active | ▓▓▓65%  | $5K/$8K| 3 │
│ Elm Ave    | Jones  | Plan.  | ▓▓░░30% | $2K/$6K| 2 │
│ ...                                                   │
└──────────────────────────────────────────────────────┘
```

### KPI Cards (top row):
Use the existing `KPICard` shared component. 4 cards:
1. **Active Projects** — count of projects with status 'in-progress' or 'active'
2. **Completed This Month** — count completed in current month
3. **Pipeline Value** — sum of project budgets for active projects
4. **Average Completion** — mean of checklist-based completion % across active projects

Data source: `useProjectStore().projects` (ProjectListItem[]) — already has summary counts.

### Visualization area:
- **Toggle**: Chart view / Map view (segmented control, persist preference in localStorage)
- **Chart view**: Horizontal or vertical bar chart showing each active project's completion %. Use Recharts (already available via the existing charts in the codebase, or import from recharts). Green bar = completed portion, gray = remaining.
- **Map view**: Reuse the existing `MapWidget` component from `src/components/dashboard/widgets/MapWidget.tsx`. It already plots project locations and shows completion on hover.
- **"+ New Project" button**: top-right of this section. Links to `/projects/new` (wizard).

### Projects Table:
Use or extend the existing `DataTable` shared component. Columns:
- **Project** (name + address on second line) — clickable, navigates to `/projects/:id`
- **Client** — from project.clientName
- **Status** — status badge (use existing `Badge` component)
- **Progress** — progress bar + percentage (checklist-based: `Object.values(project.checklist).filter(Boolean).length / 8 * 100`)
- **Budget** — spent / total (from project budget fields)
- **Crew** — count from `project.crewCount` (in ProjectListItem)
- **Location** — project.address (truncated)

Table features: sortable columns, search/filter bar above table.

### Data Loading:
On mount, fetch from stores (same coordinated loading pattern):
```typescript
await Promise.all([
  projectStore.fetchProjects(orgId),
  crewStore.fetchCrew(orgId),
  equipmentStore.fetchEquipment(orgId),
  materialStore.fetchMaterials(orgId),
]);
```

**Self-verification:**
- [ ] `npm run build` passes
- [ ] KPI cards show correct values from store data
- [ ] Chart/Map toggle works and persists
- [ ] Projects table renders with all columns
- [ ] Clicking a project row navigates to ProjectDashboard
- [ ] "+ New Project" button links to wizard
- [ ] Completion % uses checklist-based calculation (not taskCount)

---

## TASK 5: Budget & Finance Tab — DEFERRED

> **Skip this task.** The Budget & Finance tab will be built in a follow-up sprint after the hub rebuild passes testing. For now, the `/budget` route should render a placeholder page with a "Coming Soon" message and the 4 KPI card slots empty. This keeps the tab clickable in the TopNav without breaking navigation.

**File**: `src/pages/BudgetHub.tsx` (NEW — placeholder only for now)

This is a new org-wide financial view. Data comes from aggregating across all projects.

### Layout:
```
┌─ KPI Cards ──────────────────────────────────────────┐
│ [Total Revenue] [Total Expenses] [Net Profit] [Outstanding] │
└──────────────────────────────────────────────────────┘

┌─ Charts ─────────────────────────────────────────────┐
│  Revenue vs Expenses (line chart, 6 months)          │
│  ─────────────────────────────────────────            │
│  Expense Breakdown (pie/donut chart)                 │
│  Labor 48% | Materials 30% | Equipment 13% |         │
│  Disposal 5% | Overhead 4%                           │
└──────────────────────────────────────────────────────┘

┌─ Invoices / Project Budgets Table ───────────────────┐
│ Project | Budget | Spent | Remaining | Status        │
└──────────────────────────────────────────────────────┘
```

### KPI Cards:
1. **Total Revenue** — sum of project quoted amounts (or budget totals) for active/completed projects
2. **Total Expenses** — sum of all project costs (labor + materials + equipment + disposal + overhead)
3. **Net Profit** — Revenue - Expenses
4. **Outstanding** — Revenue from projects not yet marked complete

### Charts:
- **Revenue vs Expenses**: line chart over last 6 months. Group projects by their startDate month. Use Recharts `<LineChart>`.
- **Expense Breakdown**: donut chart showing cost categories across all projects. Categories: Labor, Materials, Equipment, Disposal, Overhead. Use Recharts `<PieChart>`.

### Project Budgets Table:
Columns: Project Name, Total Budget, Amount Spent, Remaining, Completion %. Sorted by most remaining budget first.

### Org Rate Settings:
Below the table or as a collapsible section, show org-level default rates:
- Default labor rate ($/hr)
- Default equipment rate ($/hr)
- Disposal rates by category (from `organization.disposalRates` JSONB)

Editable inline — writes through `orgStore.updateOrganization()`.

### Data Source:
All from `useProjectStore().projects` (aggregated) and `useOrgStore()` for rate settings.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] KPI cards compute from project data
- [ ] Charts render with Recharts
- [ ] Project budgets table shows all projects
- [ ] Org rate settings are editable and persist

---

## TASK 6: Materials Tab

**File**: `src/pages/MaterialLibrary.tsx` (MODIFY — refactor in place)

Enhance the existing Materials page to match the Figma layout.

### Layout:
```
┌─ KPI Cards ──────────────────────────────────────────┐
│ [Total Items] [Low Stock] [Inventory Value] [Pending]│
└──────────────────────────────────────────────────────┘

┌─ Low Stock Alert Banner ─────────────────────────────┐
│ ⚠ Low stock: Mulch (5 bags), Pavers (12 units), ... │
└──────────────────────────────────────────────────────┘

┌─ Inventory Table ────────────────────────────────────┐
│ Material | Category | Qty | Unit | Cost | Supplier | │
│ ...                                                   │
│                                        [+ Add Material]│
└──────────────────────────────────────────────────────┘
```

### KPI Cards:
1. **Total Items** — count of materials in org library
2. **Low Stock Alerts** — count of materials where quantity < reorderPoint (or a threshold)
3. **Inventory Value** — sum of (quantity × unitCost) across all materials
4. **Pending Orders** — placeholder for future purchase order tracking (show 0 for now)

### Low Stock Alert Banner:
- Yellow/amber banner listing materials below threshold
- Uses existing alert patterns from `src/lib/alerts.ts`
- Only shows if there are low stock items

### Inventory Table:
Enhance the existing material table with columns matching the Figma:
Material Name, Category, Quantity, Unit, Unit Cost, Total Value (computed), Supplier, Status

### Data Source:
`useMaterialStore().materials` — already fetched.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] KPI cards compute from material data
- [ ] Low stock banner shows when applicable
- [ ] Inventory table renders all materials
- [ ] Add Material flow still works

---

## TASK 7: Crew & Equipment Tab

**File**: `src/pages/CrewEquipmentHub.tsx` (NEW — merges CrewManager, Equipment, Schedule)

This is the most complex tab — it merges three current pages.

### Layout:
```
┌─ KPI Cards ──────────────────────────────────────────┐
│ [Total Crew] [Available] [Equipment] [Maintenance Due]│
└──────────────────────────────────────────────────────┘

┌─ Split View ─────────────────────────────────────────┐
│  Crew Cards (left 50%)  │  Weekly Schedule (right 50%)│
│                          │                             │
│  ┌─ John Smith ────┐    │  Mon: Oak St (John, Mike)   │
│  │ Foreman | 📞    │    │  Tue: Oak St (John, Mike)   │
│  │ Assigned: Oak St │    │  Wed: Elm Ave (Sarah)       │
│  │ Skills: [excavat]│    │  Thu: —                     │
│  └─────────────────┘    │  Fri: Oak St (John, Mike)   │
│                          │                             │
│  ┌─ Mike Johnson ──┐    │                             │
│  │ Laborer | 📞    │    │                             │
│  └─────────────────┘    │                             │
│                          │                             │
│  [+ Add Crew Member]    │  [◀ Week] Apr 1-5 [Week ▶] │
└──────────────────────────────────────────────────────┘

┌─ Equipment Table ────────────────────────────────────┐
│ Name | Type | Status | Hourly Cost | Next Maint | Assigned │
│ CAT 320 | Excavator | Available | $85/hr | Apr 15 | — │
│ ...                                                   │
│                                          [+ Add Equipment]│
└──────────────────────────────────────────────────────┘
```

### KPI Cards:
1. **Total Crew** — count of crew members
2. **Available** — crew members not currently assigned to an active project
3. **Total Equipment** — count of equipment
4. **Maintenance Due** — equipment with upcoming maintenance (within 7 days)

### Crew Cards (left panel):
For each crew member from `useCrewStore().crew`:
- Name, role, phone number (NEW field)
- Current assignment: look up in `useScheduleStore().assignments` to find if assigned to a project. Show project name or "Available".
- Skill tags (from crew member skills array)
- Click card to edit crew member details (modal)

"+ Add Crew Member" button at bottom.

### Weekly Schedule Grid (right panel):
- Shows the current week (Mon-Fri/Sat)
- Each day shows: project name + crew members scheduled for that day
- Data from `useScheduleStore().entries` filtered to current week
- Week navigation: ◀ Previous Week | Date Range | Next Week ▶
- Project timeline bars across the top (project startDate → targetDate spanning multiple days)

### Equipment Table:
Columns: Name, Type (NEW dropdown field), Status, Hourly Cost (NEW field), Next Maintenance, Assigned To (project).

Type dropdown uses `EQUIPMENT_TYPES` constant.

### Data Source:
```typescript
await Promise.all([
  crewStore.fetchCrew(orgId),
  equipmentStore.fetchEquipment(orgId),
  scheduleStore.fetchAssignments(orgId),
  scheduleStore.fetchEntries(orgId, weekStart, weekEnd),
  projectStore.fetchProjects(orgId),  // for project names in assignments
]);
```

**Self-verification:**
- [ ] `npm run build` passes
- [ ] KPI cards compute from crew + equipment data
- [ ] Crew cards show assignment status
- [ ] Phone number displays on crew cards
- [ ] Weekly schedule grid renders entries
- [ ] Equipment table shows type dropdown and hourly cost
- [ ] Add crew member flow works
- [ ] Add equipment flow works

---

## TASK 8: Wizard Enhancements (Contractor Feedback)

**File**: `src/pages/ProjectWizard.tsx` and wizard step components

### 8a: Budget Step — Add Disposal Cost + Equipment Cost

In the Budget/Timeline step (WizardStep7 or equivalent):
- Add **Disposal Cost** field (number input, manual entry)
- Add **Equipment Cost** field (number input, manual entry)
- Remove the "Equipment Rental" checkbox if it exists (contractor said fold rental into equipment cost)
- **Estimated Hours → Labor Cost auto-calc**: When user changes estimated hours, auto-compute labor cost = hours × org default labor rate (from orgStore). Allow manual override.
- Wire disposal_cost and equipment_cost into the project data that gets saved

### 8b: Verify Wizard → ProjectDashboard Flow

After wizard creates a project:
1. Navigate to `/projects/:id` — verify all wizard data appears in ProjectDashboard tabs
2. Budget tab should show disposal cost and equipment cost as line items
3. Materials tab should show materials from wizard

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Disposal cost field appears in wizard budget step
- [ ] Equipment cost field appears in wizard budget step
- [ ] Hours → labor cost auto-calculates
- [ ] New fields save to project and appear in ProjectDashboard budget tab

---

## TASK 9: Theme Toggle

### 9a: Add theme toggle to uiStore

**File**: `src/stores/uiStore.ts`

Add `theme: 'dark' | 'light'` to uiStore state (persisted in localStorage).
Add `setTheme(theme)` action that:
1. Updates store state
2. Sets `document.documentElement.setAttribute('data-theme', theme)`

Default: `'dark'`

### 9b: Apply theme on app load

In AppLayout or App.tsx, on mount read theme from uiStore and apply the data-theme attribute.

### 9c: Theme toggle in user menu

In the TopNav user dropdown, add a toggle switch: "Dark Mode" on/off. Calls `uiStore.setTheme()`.

### 9d: Verify both themes

Ensure index.css has both light and dark CSS custom properties. The design system doc has both defined — verify they're in the actual CSS file. If not, add the light theme variables and the `[data-theme="dark"]` overrides.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Dark theme is default
- [ ] Toggle switches to light theme
- [ ] Toggle persists across page refresh
- [ ] Both themes have readable text contrast

---

## TASK 10: Cleanup & Polish

### 10a: Remove dead pages
- `src/pages/CrewManager.tsx` → DELETED (absorbed into CrewEquipmentHub)
- `src/pages/EquipmentManager.tsx` → DELETED (absorbed into CrewEquipmentHub)
- `src/pages/Schedule.tsx` → DELETED (absorbed into CrewEquipmentHub)
- `src/pages/Dashboard.tsx` → DELETED or renamed (replaced by ProjectsHub)
- `src/pages/Projects.tsx` → DELETED (absorbed into ProjectsHub)

### 10b: Remove dead components
- `src/components/layout/Sidebar.tsx` → DELETED (replaced by TopNav)
- `src/components/dashboard/WidgetGrid.tsx` → DELETED (no more widget customization)
- `src/components/dashboard/KPIDrawer.tsx` → DELETED (KPIs are fixed per tab)
- `src/components/dashboard/KPILibraryCard.tsx` → DELETED
- `src/components/dashboard/SetupChecklist.tsx` → keep for now (onboarding may use it)

### 10c: Remove dead widget components
The individual widget files in `src/components/dashboard/widgets/` can be deleted EXCEPT:
- `MapWidget.tsx` — KEEP (reused in Projects tab chart/map toggle)
- `AlertsWidget.tsx` — KEEP if alerts are shown somewhere

Delete: `CrewWidget.tsx`, `FleetWidget.tsx`, `ProjectsWidget.tsx`, `ScheduleWidget.tsx`

### 10d: Verify no dead imports
Run `npm run build` — TypeScript will catch any broken imports from deleted files.

### 10e: Remove console.log statements
Search all modified files for `console.log` and remove debug statements.

**Self-verification:**
- [ ] `npm run build` passes clean
- [ ] No dead imports
- [ ] No console.log debug statements
- [ ] All routes work
- [ ] No 404s on navigation

---

## REGRESSION CHECKLIST

After all tasks complete:

### Navigation
- [ ] TopNav renders with 4 tabs and "More" dropdown
- [ ] Each tab navigates to correct page
- [ ] "More" dropdown items navigate correctly
- [ ] Active tab indicator matches current route
- [ ] User menu dropdown works (theme toggle, sign out)
- [ ] Mobile hamburger menu works (<640px)

### Projects Tab
- [ ] KPI cards show data
- [ ] Chart view renders project progress bars
- [ ] Map view renders project pins with completion hover
- [ ] Chart ↔ Map toggle works
- [ ] Projects table shows all projects with correct columns
- [ ] Clicking project navigates to ProjectDashboard
- [ ] "+ New Project" launches wizard
- [ ] Completion % uses checklist-based calculation

### Budget & Finance Tab (DEFERRED — placeholder only)
- [ ] `/budget` route renders a placeholder page without errors
- [ ] Tab is clickable in TopNav and navigates correctly

### Materials Tab
- [ ] KPI cards show data
- [ ] Low stock banner appears when applicable
- [ ] Inventory table shows all materials
- [ ] Add material flow works

### Crew & Equipment Tab
- [ ] KPI cards show data
- [ ] Crew cards show name, role, phone, assignment status
- [ ] Weekly schedule grid renders entries
- [ ] Week navigation works
- [ ] Equipment table shows type and hourly cost
- [ ] Add crew member flow works
- [ ] Add equipment flow works

### Project Wizard
- [ ] Wizard completes and navigates to new project dashboard
- [ ] Disposal cost and equipment cost fields appear in budget step
- [ ] Hours → labor cost auto-calculates with org default rate
- [ ] All wizard data appears in ProjectDashboard tabs

### ProjectDashboard
- [ ] All 6 tabs load without errors
- [ ] Budget tab shows disposal cost and equipment cost
- [ ] Resources tab shows crew assignments

### Secondary Pages
- [ ] Manifest Engine loads from "More" dropdown
- [ ] Work Orders loads
- [ ] Settings loads
- [ ] Billing loads

### Theme
- [ ] Dark mode is default
- [ ] Light mode toggle works
- [ ] Both themes have proper contrast

### Auth
- [ ] Sign out works and redirects to login (or landing page)
- [ ] Sign in loads the Projects tab (not old dashboard)
- [ ] No stale data from previous session

### Build
- [ ] `npm run build` passes clean
- [ ] No console.log debug statements
- [ ] No dead imports from deleted files

---

## EXECUTION ORDER

1. **Task 1** (Types) — add new fields to interfaces
2. **Task 2** (supabaseData) — field mappings for new columns
3. **Task 3** (Layout Shell) — TopNav + routes. This is the structural foundation.
4. **Task 4** (Projects Tab) — the home page, most critical
5. **Task 5** (Budget Tab) — **DEFERRED** — placeholder page only. Just a "Coming Soon" shell so the route works.
6. **Task 6** (Materials Tab) — enhance existing
7. **Task 7** (Crew & Equipment Tab) — most complex, merges 3 pages
8. **Task 8** (Wizard Enhancements) — contractor feedback fields
9. **Task 9** (Theme Toggle) — polish
10. **Task 10** (Cleanup) — remove dead code

Run `npm run build` after each task. Do not proceed to the next task with a broken build.

---

## PR COMMAND

```
"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head rebuild-ui-hub --title "Rebuild: 4-tab hub layout + contractor features" --body "Replaces sidebar with top nav 4-tab hub (Projects, Budget, Materials, Crew & Equipment). Adds contractor-requested fields (crew phone, equipment type/hourly cost, disposal/equipment cost, org rates). Theme toggle. Dead page cleanup."
```
