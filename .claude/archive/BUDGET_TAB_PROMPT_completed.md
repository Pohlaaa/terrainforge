# TerrainForge — Budget & Finance Tab Build

> **Goal**: Replace the BudgetHub placeholder with a fully functional org-wide financial overview. KPI cards, charts, project budget table, and org rate settings.
>
> **Branch**: `feature-budget-tab`
> **SQL migrations**: None — migration 014 (contractor fields) already applied
> **Architecture reference**: `.claude/ARCHITECTURE.md` (read FIRST)
> **Design reference**: `.claude/DESIGN_SYSTEM.md` (read for hub tab patterns, chart styling, KPI card specs)

---

## PRE-FLIGHT: Read These Files

1. `.claude/ARCHITECTURE.md` — §0 layout architecture, §4 hub tab architecture
2. `.claude/DESIGN_SYSTEM.md` — hub tab content pattern, KPI card spec, chart styling section
3. `.claude/CODE_GUIDE.md` — execution rules, verification protocol
4. `CLAUDE.md` (root) — naming conventions, what NOT to do
5. `src/index.css` — CSS variable names
6. `src/pages/BudgetHub.tsx` — current placeholder (will be replaced)
7. `src/stores/orgStore.ts` — org rate settings live here
8. `src/stores/projectStore.ts` — project budget data lives here
9. `src/types/index.ts` — Project and Organization interfaces

---

## CRITICAL: orgStore SELECT Bug

`src/stores/orgStore.ts` line 99-101 — the `fetchOrg` query does NOT select the new contractor fields:
```typescript
// CURRENT (missing new fields):
.select('id, name, shortcode, subscription_status, subscription_tier, trial_ends_at, subscription_ends_at, stripe_customer_id')
```

**Fix this first** — add `default_labor_rate, default_equipment_rate, disposal_rates` to the select. Also add them to the insert on line 123 (the new-user org creation path). And remove the `(row as any)` casts in `mapOrgRow` — update the `OrgRow` interface to include these fields properly.

---

## TASK 1: Fix orgStore Field Selection + Add updateOrgSettings

**File**: `src/stores/orgStore.ts`

### 1a: Update OrgRow interface
```typescript
interface OrgRow {
  id: string;
  name: string | null;
  shortcode: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  stripe_customer_id: string | null;
  default_labor_rate: number | null;       // ADD
  default_equipment_rate: number | null;   // ADD
  disposal_rates: Record<string, number>;  // ADD
}
```

### 1b: Update SELECT query
Add the 3 new fields to both SELECT calls (the fetch on ~line 99 and the insert-then-select on ~line 123).

### 1c: Fix mapOrgRow
Remove the `(row as any)` casts — use typed `row.default_labor_rate` etc.

### 1d: Add updateOrgSettings action
Add a new store action to update org rate settings:

```typescript
interface OrgStore {
  // ... existing
  updateOrgSettings: (settings: {
    defaultLaborRate?: number | null;
    defaultEquipmentRate?: number | null;
    disposalRates?: Record<string, number>;
  }) => Promise<void>;
}
```

Implementation:
1. Optimistically update local state
2. Write to Supabase: `supabase.from('organizations').update({ default_labor_rate, default_equipment_rate, disposal_rates }).eq('id', orgId)`
3. On error, roll back optimistic update

**Self-verification:**
- [ ] `npm run build` passes
- [ ] OrgRow interface has typed fields (no `any` casts)
- [ ] fetchOrg SELECT includes all 3 new fields
- [ ] updateOrgSettings writes to Supabase

---

## TASK 2: Build BudgetHub Page

**File**: `src/pages/BudgetHub.tsx` (REPLACE placeholder)

### Layout
Follow the hub tab content pattern from DESIGN_SYSTEM.md:

```
┌─ KPI Cards ──────────────────────────────────────────────┐
│ [Total Revenue] [Total Expenses] [Net Profit] [Outstanding]│
└──────────────────────────────────────────────────────────┘

┌─ Charts (side by side on desktop, stacked on mobile) ────┐
│  ┌─ Revenue vs Expenses ──┐  ┌─ Expense Breakdown ─────┐ │
│  │  Line chart (6 months) │  │  Donut chart             │ │
│  │                        │  │  Labor / Materials /     │ │
│  │                        │  │  Equipment / Disposal    │ │
│  └────────────────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

┌─ Project Budgets Table ──────────────────────────────────┐
│ Project | Client | Budget | Spent | Remaining | Status    │
│ ...                                                       │
└──────────────────────────────────────────────────────────┘

┌─ Org Rate Settings (collapsible) ────────────────────────┐
│ Default Labor Rate: $__/hr                                │
│ Default Equipment Rate: $__/hr                            │
│ Disposal Rates: [Brush: $__ ] [Concrete: $__ ] [Mixed: $__]│
│                                        [Save Settings]    │
└──────────────────────────────────────────────────────────┘
```

### KPI Cards (4 across top)
Use the existing `KPICard` shared component (check `src/components/shared/` for it). If no shared KPICard exists, build one following the DESIGN_SYSTEM.md spec (card with left green accent, caption label, heading-lg value, optional trend).

Computed from `useProjectStore().projects`:

1. **Total Revenue** — `sum of project.budget` for all active + completed projects
2. **Total Expenses** — `sum of (project.laborBudget + project.materialsBudget + project.equipmentBudget + project.subcontractorBudget + project.disposalCost + project.equipmentCost)` across all projects. Use 0 for null fields.
3. **Net Profit** — Revenue minus Expenses
4. **Outstanding** — `sum of project.budget` for projects NOT in 'completed' status

Format all values as currency (`$XX,XXX`).

### Revenue vs Expenses Line Chart
- Use Recharts `<LineChart>` with `<Line>` components
- X-axis: last 6 months (derive from project.startDate, group by month)
- Two lines: Revenue (green — `var(--status-green)`) and Expenses (red — `var(--status-red)`)
- Revenue per month = sum of project.budget where startDate falls in that month
- Expenses per month = sum of all cost fields where startDate falls in that month
- If no data for a month, show 0
- Tooltip on hover showing month, revenue, expenses
- Wrap in a card container with heading "Revenue vs Expenses"

### Expense Breakdown Donut Chart
- Use Recharts `<PieChart>` with `<Pie>` and `<Cell>` components
- Aggregate across ALL projects:
  - Labor: sum of `laborBudget`
  - Materials: sum of `materialsBudget`
  - Equipment: sum of `equipmentBudget + equipmentCost`
  - Disposal: sum of `disposalCost`
  - Subcontractor: sum of `subcontractorBudget`
- Colors: Labor=`var(--status-blue)`, Materials=`var(--status-green)`, Equipment=`var(--status-amber)`, Disposal=`var(--status-gray)`, Subcontractor=`var(--brand-secondary)`
- Legend below showing category, amount, percentage
- Center label showing total expenses
- Wrap in a card container with heading "Expense Breakdown"

### Project Budgets Table
Use or extend the existing `DataTable` shared component if one exists, or build a styled table.

Columns:
- **Project** — name (clickable, navigates to `/projects/:id`)
- **Client** — from project.clientName
- **Total Budget** — project.budget formatted as currency
- **Spent** — sum of all cost fields on the project
- **Remaining** — budget minus spent
- **Completion** — checklist-based completion % (same calculation as Projects tab)
- **Status** — status badge

Sortable by any column. Default sort: most remaining budget first.

### Org Rate Settings Section
Collapsible section below the table (default collapsed). Header: "Default Rate Settings" with a chevron toggle.

When expanded:
- **Default Labor Rate** — number input, $/hr, from `useOrgStore().org.defaultLaborRate`
- **Default Equipment Rate** — number input, $/hr, from `useOrgStore().org.defaultEquipmentRate`
- **Disposal Rates** — dynamic key-value pairs from `useOrgStore().org.disposalRates`
  - Each row: category name (text input) + rate (number input, $/load or $/yd)
  - "+ Add Category" button to add a new disposal rate row
  - "×" button to remove a category
- **Save Settings** button — calls `orgStore.updateOrgSettings()`
- Show a success toast on save

### Data Loading
On mount:
```typescript
const { projects, fetchProjects } = useProjectStore();
const { org, fetchOrg } = useOrgStore();

useEffect(() => {
  if (orgId) {
    fetchProjects(orgId);
    // org is already loaded from app init, but ensure fresh
  }
}, [orgId]);
```

### Styling
- Follow hub tab pattern: same padding, card backgrounds, borders as other tabs
- Cards: `var(--surface-card)` bg, `var(--border-default)` border, `var(--shadow-card)` shadow
- Chart container: same card treatment
- Use CSS custom properties throughout — NO hardcoded colors
- Responsive: charts side-by-side on desktop (>1024px), stacked on tablet/mobile

**Self-verification:**
- [ ] `npm run build` passes
- [ ] KPI cards show computed values (or $0 if no projects)
- [ ] Line chart renders with correct month groupings
- [ ] Donut chart renders expense categories
- [ ] Empty state: if no projects, show "No project data yet" message instead of empty charts
- [ ] Project table shows all projects, sortable
- [ ] Clicking a project navigates to ProjectDashboard
- [ ] Rate settings section expands/collapses
- [ ] Rate settings save and persist (check Supabase after save)
- [ ] Dark theme and light theme both look correct
- [ ] No console errors

---

## TASK 3: Install Recharts (if not already present)

Check if `recharts` is already in `package.json`. If not:
```
npm install recharts
```

If Recharts is already installed, skip this task.

**Self-verification:**
- [ ] `import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'` compiles

---

## TASK 4: Verify Integration

### 4a: Budget tab navigation
- Tab in TopNav links to `/budget`
- Active indicator shows on Budget & Finance tab

### 4b: Wizard → Budget flow
- Create a project with the wizard
- Set a budget, labor budget, materials budget, disposal cost, equipment cost
- Navigate to Budget & Finance tab
- Verify the new project's data appears in KPI cards, charts, and table

### 4c: Rate settings round-trip
- Open rate settings section
- Set default labor rate to $75/hr
- Set default equipment rate to $50/hr
- Add disposal categories: Brush=$200, Concrete=$350, Mixed=$275
- Save
- Refresh page
- Verify all values persisted

**Self-verification:**
- [ ] All 4a-4c pass
- [ ] `npm run build` passes clean

---

## REGRESSION CHECKLIST

After all tasks complete, verify nothing else broke:

- [ ] TopNav still works with all 4 tabs
- [ ] Projects tab loads normally
- [ ] Materials tab loads normally
- [ ] Crew & Equipment tab loads normally
- [ ] Project wizard still completes
- [ ] ProjectDashboard all 6 tabs load
- [ ] Theme toggle works
- [ ] Sign out works
- [ ] `npm run build` passes clean

---

## EXECUTION ORDER

1. **Task 3** (Recharts) — install dependency first if needed
2. **Task 1** (orgStore fix) — fix SELECT, add updateOrgSettings
3. **Task 2** (BudgetHub) — build the full page
4. **Task 4** (Integration verification)

Run `npm run build` after each task.

---

## PR COMMAND

```
"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head feature-budget-tab --title "Feature: Budget & Finance tab" --body "Builds the Budget & Finance hub tab with org-wide financial KPIs, revenue/expenses line chart, expense breakdown donut chart, project budgets table, and org rate settings. Fixes orgStore field selection for contractor rate fields."
```
