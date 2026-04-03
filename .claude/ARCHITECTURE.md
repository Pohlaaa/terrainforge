# TerrainForge — Architecture

> **Purpose**: The north star for all development. Every code session reads this file. Every decision about where data lives, how it flows, and how pages consume it is answered here.
> **Created**: 2026-04-03 (data layer refactor)
> **Updated**: 2026-04-03 (UI hub rebuild — 4-tab layout)
> **Owner**: Charlie + Cowork

---

## Core Principle

**Every piece of data has exactly one place it lives, one store that owns it, and one way it gets written.** Pages are thin consumers — they read from store hooks and render. No page calls supabaseData directly. No data exists only in memory if it should persist.

---

## 0. Layout Architecture (UI Hub)

### Navigation Structure

The app uses a **top navigation bar** with 4 primary tabs. No sidebar.

```
┌──────────────────────────────────────────────────────────────────┐
│ [TF Logo]  Projects  Budget & Finance  Materials  Crew & Equip  │
│                                            [🔔] [More ▾] [👤]  │
└──────────────────────────────────────────────────────────────────┘
```

### Route → Tab Mapping

| Tab | Route | Page Component | Replaces |
|-----|-------|---------------|----------|
| Projects | `/` | ProjectsHub | Dashboard + Projects |
| Budget & Finance | `/budget` | BudgetHub | (new) |
| Materials | `/materials` | MaterialLibrary | MaterialLibrary |
| Crew & Equipment | `/crew` | CrewEquipmentHub | CrewManager + Equipment + Schedule |

### Secondary Routes ("More" dropdown)

| Route | Page | Notes |
|-------|------|-------|
| `/manifest` | ManifestEngine | Unchanged |
| `/work-orders` | WorkOrders | Unchanged |
| `/price-research` | PriceResearch | Unchanged |
| `/settings` | Settings | Unchanged |
| `/billing` | Billing | Unchanged |

### Detail Routes (unchanged)

| Route | Page |
|-------|------|
| `/projects/:id` | ProjectDashboard (6 tabs) |
| `/projects/new` | ProjectWizard |

### Tab Content Pattern

Every tab follows the same layout:
1. **KPI Cards** (4 per tab) — top row
2. **Visualization** (charts, map, schedule grid) — middle
3. **Data Table** — bottom

### Theme

Dark mode is the default. Light mode available via toggle in user menu. Theme stored in `uiStore` (localStorage). Applied via `data-theme` attribute on `<html>`.

---

## 1. Store Architecture

### Store Boundaries

| Store | Owns | Does NOT Own |
|-------|------|-------------|
| `projectStore` | Projects, project tasks, project materials (JSONB), project subcontractors, project permits, project site conditions | Crew profiles, equipment profiles, org materials library |
| `crewStore` | Crew member profiles (name, role, skills, availability, certs, phone) | Crew-to-project assignments, schedule entries |
| `scheduleStore` | Project crew assignments, schedule entries (calendar) | Crew profiles, project details |
| `equipmentStore` | Equipment profiles (specs, maintenance, status, rates) | Equipment-to-project assignments |
| `materialStore` | Org-level material library (catalog, inventory, suppliers) | Per-project material quantities |
| `uiStore` | Theme, sidebar state, modals, toast notifications | Any domain data |
| `orgStore` | Organization profile, subscription, user preferences, widget layout | Any cross-domain data |

### The Golden Rule

**Stores are the only data gateway.** All reads and writes go through store actions. Store actions call `supabaseData.ts` functions internally. Pages never import from `supabaseData.ts`.

```
Page → useProjectStore().fetchProjectFull(id) → store action → supabaseData.fetchProjectFull() → Supabase
                                                    ↓
                                              store.activeProject updated
                                                    ↓
                                              Page re-renders via hook
```

### Store Persistence

| Store | localStorage | Supabase | Notes |
|-------|-------------|----------|-------|
| `projectStore` | No | Yes (primary) | Always fetch from Supabase. No stale cache. |
| `crewStore` | No | Yes (primary) | Always fetch from Supabase. |
| `scheduleStore` | No | Yes (primary) | Always fetch from Supabase. |
| `equipmentStore` | No | Yes (primary) | Always fetch from Supabase. |
| `materialStore` | No | Yes (primary) | Always fetch from Supabase. |
| `uiStore` | Yes | No | Theme, sidebar state. Local-only. |
| `orgStore` | Yes (widget layout, preferences) | Yes (org profile, subscription) | Widget layout in localStorage per user. Org data from Supabase. |

**Rationale**: localStorage persistence caused cross-account data leaks (Sprint 44 series). Domain stores now always fetch fresh from Supabase. Only UI preferences use localStorage.

---

## 2. Project Data Model

### Two Fetch Modes

**List mode** (`fetchProjects`): Returns all projects with lightweight computed summaries.

```typescript
interface ProjectListItem {
  // All fields from Project interface
  // Plus computed summaries:
  taskCount: number;        // COUNT from project_tasks
  completedTaskCount: number;
  crewCount: number;        // COUNT from project_crew_assignments
  nextScheduledDate: string | null; // MIN future date from schedule_entries
}
```

Used by: Projects page, Dashboard widgets, KPI compute layer, Map widget.

**Full mode** (`fetchProjectFull`): Returns a single project with its complete graph.

```typescript
interface ProjectFull extends Project {
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  crewAssignments: ProjectCrewAssignment[];
  scheduleEntries: ScheduleEntry[];
  siteConditions: ProjectSiteCondition[];
}
```

Used by: ProjectDashboard (all tabs).

**Always fresh-fetched.** No caching of activeProject. Navigating to a project dashboard always calls `fetchProjectFull()`.

### Materials: Single Source of Truth

**Project-level materials** (`projects.materials` JSONB column) is the authoritative source for a project's material quantities and costs.

- The wizard writes materials here on project creation
- The Budget tab reads from here for cost calculations
- The Materials tab displays and edits from here
- The manifest engine reads from here to generate manifests

**Zone materials** (`zone_materials` junction table) are an optional drill-down for contractors who want per-zone breakdowns. They are derived from / subset of project-level materials, not a separate source.

**Org-level materials** (`materials` table) is the catalog/library. It provides unit costs, supplier info, and inventory levels. Project materials reference this catalog by materialId but store their own quantities.

### Project Crew Assignments (NEW)

```typescript
interface ProjectCrewAssignment {
  id: string;
  orgId: string;
  projectId: string;
  crewMemberId: string;
  roleOnProject: string;   // Can differ from crew member's default role
  assignedAt: string;
}
```

**Table**: `project_crew_assignments` (new migration required)
- RLS: org_id isolation, same pattern as other project_* tables
- Unique constraint: (project_id, crew_member_id) — one assignment per person per project

**Flow**: Assign crew on Resources tab → write to project_crew_assignments → prompt "Add to schedule?" → if yes, create schedule_entries for project date range.

---

## 3. Schedule Architecture

### What the Schedule Page Shows

1. **Project timeline bars**: horizontal bars spanning each project's startDate → targetDate. Visual indicator of what's running this week/month.
2. **Crew schedule entries**: individual day-level assignments (who, which project, what time). These are the existing ScheduleEntry records.
3. **Unassigned projects**: projects with crew assignments but no schedule entries for the visible date range. Visual nudge to schedule them.

### Schedule Store Shape

```typescript
interface ScheduleStore {
  assignments: ProjectCrewAssignment[];  // All active assignments
  entries: ScheduleEntry[];              // Calendar entries for current view range

  // Actions
  fetchAssignments(orgId: string): void;
  fetchEntries(orgId: string, startDate: string, endDate: string): void;
  createAssignment(data: Omit<ProjectCrewAssignment, 'id' | 'assignedAt'>): void;
  createEntry(data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>): void;
}
```

---

## 4. Hub Tab Architecture

### Coordinated Loading

On mount, each hub tab triggers all required store fetches in parallel. Sections render a loading skeleton until their store is populated. No section makes its own fetch.

```typescript
// ProjectsHub.tsx onMount (same pattern for all hub tabs):
await Promise.all([
  fetchProjects(orgId),
  fetchCrew(orgId),
  fetchEquipment(orgId),
  fetchMaterials(orgId),
]);
```

### KPI Compute Layer

Pure functions in `src/lib/kpiCompute.ts`. Each KPI receives the full AppState and returns a computed value.

```typescript
// src/lib/kpiCompute.ts
interface AppState {
  projects: ProjectListItem[];
  crew: CrewMember[];
  equipment: Equipment[];
  materials: Material[];
}

// Each KPI is a pure function:
function activeProjectCount(state: AppState): number { ... }
function pipelineValue(state: AppState): number { ... }
function crewUtilization(state: AppState): number { ... }
```

**Adding a new KPI**: write one function in kpiCompute.ts, register it in the KPI_LIBRARY. No store changes. No fetch changes.

### Widget → Detail Navigation

Every clickable item in a widget navigates to the appropriate detail view:
- Project card → `/projects/:id` (project dashboard)
- Crew member → `/crew` (crew page, filtered)
- Schedule entry → `/schedule?date=YYYY-MM-DD` (schedule page, focused date)
- Equipment item → `/equipment` (equipment page, filtered)
- Map pin → `/projects/:id` (project dashboard)

---

## 5. Wizard Architecture

### Data Flow

The wizard collects data across steps in local component state (no premature persistence). On "Create Project" (final step), it writes everything through store actions in one coordinated operation:

```typescript
// ProjectWizard onCreateProject:
const project = await projectStore.createProject(projectData);
// projectData includes materials in the JSONB field

if (tasks.length > 0) {
  await projectStore.createProjectTasks(project.id, tasks);
}
if (subcontractors.length > 0) {
  await projectStore.createProjectSubcontractors(project.id, subs);
}
if (permits.length > 0) {
  await projectStore.createProjectPermits(project.id, permits);
}

// Navigate to new project's dashboard
navigate(`/projects/${project.id}`);
```

### Post-Creation Editing

All editing happens on the ProjectDashboard tabs. Each tab's edit operations write through the same projectStore actions the wizard uses. This guarantees consistency — there's one code path for creating data and one for updating it, both going through the store.

| Dashboard Tab | Edits | Store Action |
|---------------|-------|-------------|
| Overview | Project name, client info, address, dates | `projectStore.updateProject()` |
| Tasks | Add/edit/delete/reorder tasks | `projectStore.createProjectTask()`, `updateProjectTask()`, `deleteProjectTask()` |
| Budget | Labor, materials, equipment, overhead, quote | `projectStore.updateProject()` (budget fields) |
| Materials | Material quantities, costs | `projectStore.updateProject()` (materials JSONB) |
| Resources | Crew assignments, subcontractors | `scheduleStore.createAssignment()`, `projectStore.createProjectSubcontractor()` |
| Compliance | Permits, inspections | `projectStore.createProjectPermit()`, `updateProjectPermit()` |

---

## 6. supabaseData.ts Contract

All Supabase operations live in `src/services/supabaseData.ts`. Store actions call these; pages never do.

### Required Patterns

- **Every function accepts `orgId` as a parameter** — even though RLS enforces it, queries without `.eq('org_id', orgId)` return empty results
- **snake_case ↔ camelCase mapping** via `toSnakeCase()` / `toCamelCase()` on every read/write
- **Special field mappings**: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- **CHECK constraint compliance**: send NULL not 0 for optional numeric fields
- **Error handling**: all functions use `onSupabaseError()` and return typed results

### Key Functions (Post-Refactor)

```
// Projects
fetchProjects(orgId) → ProjectListItem[]        // With summary counts
fetchProjectFull(orgId, projectId) → ProjectFull // Complete graph
createProject(project, id, orgId) → Project
updateProject(id, updates) → Project
deleteProject(id) → boolean

// Project Tasks
fetchProjectTasks(orgId, projectId) → ProjectTask[]
createProjectTask(task, id, orgId) → ProjectTask
updateProjectTask(id, updates) → ProjectTask
deleteProjectTask(id) → boolean

// Project Crew Assignments (NEW)
fetchProjectCrewAssignments(orgId, projectId) → ProjectCrewAssignment[]
createProjectCrewAssignment(assignment, id, orgId) → ProjectCrewAssignment
deleteProjectCrewAssignment(id) → boolean

// Schedule
fetchScheduleEntries(orgId, startDate, endDate) → ScheduleEntry[]
createScheduleEntry(entry, id, orgId) → ScheduleEntry
updateScheduleEntry(id, updates) → ScheduleEntry
deleteScheduleEntry(id) → boolean

// Existing functions (unchanged)
fetchCrew(orgId), fetchEquipment(orgId), fetchMaterials(orgId)
createCrew, updateCrew, createEquipment, updateEquipment, etc.
```

---

## 7. File Organization (Post-Rebuild)

```
src/
  pages/              — One component per route. 4 hub tabs + ProjectDashboard + wizard + secondary.
  components/
    layout/           — App shell (TopNav, AppLayout)
    shared/           — Reusable UI blocks (KPICard, DataTable, Modal, Badge, etc.)
    pdf/              — PDF templates — UNCHANGED
    ui/               — Atomic form elements — UNCHANGED
    wizard/           — Wizard step components
    dashboard/        — Shared dashboard components (MapWidget)
    project-dashboard/ — ProjectDashboard tab components
  stores/             — Zustand stores with clear ownership boundaries
  services/
    supabase.ts       — Client instance — UNCHANGED
    supabaseData.ts   — ALL Supabase CRUD — refactored
    stripe.ts         — Billing — UNCHANGED
    anthropic.ts      — AI — UNCHANGED
  lib/
    manifest.ts       — Manifest engine — UNCHANGED
    workorders.ts     — Work order generation — UNCHANGED
    alerts.ts         — Alert aggregation — UNCHANGED
    constants.ts      — App constants — UNCHANGED
    kpiCompute.ts     — KPI pure functions (refactored from kpiDefinitions.ts)
  hooks/              — Custom React hooks — UNCHANGED
  types/              — TypeScript interfaces — extended with new types
  utils/              — Formatting, dates, validation — UNCHANGED
```

---

## 8. Migration Required

**One new migration**: `013_project_crew_assignments.sql`

```sql
-- project_crew_assignments table
-- Persists crew-to-project assignments (replaces in-memory projectCrew map)
-- NOTE: Org membership table is `organization_members` (not `org_members`)
CREATE TABLE IF NOT EXISTS project_crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  role_on_project TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, crew_member_id)
);

-- RLS policies (same pattern as project_tasks, project_subcontractors)
-- Uses `organization_members` table for role checks
ALTER TABLE project_crew_assignments ENABLE ROW LEVEL SECURITY;
```

**No other schema changes needed for stabilization.** The contractor's feature requests (disposal costs, org rates, equipment types, crew phone) will require additional migrations post-stabilization.

---

## 9. What This Architecture Does NOT Cover (Post-Stabilization)

These are documented in `CONTRACTOR_FEEDBACK.md` and will be layered on after the refactor:

- New wizard step for material quantities / disposal categories
- Org-level rate settings
- Disposal cost as a budget category
- Utility locate safety check on crew assignment
- Equipment type dropdown values
- Crew phone number field
- Equipment hourly cost field
- AI client quote generation
- Address dropdown keyboard navigation
