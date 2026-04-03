# Data Layer Refactor — Execution Prompt

> **Goal**: Rebuild stores, data fetching, and page data consumption so that every piece of data entered anywhere in the app is immediately visible everywhere it should be. Same visual design. Same Supabase schema (plus one new table). Clean, consistent data flow.
>
> **Branch**: `refactor-data-layer`
> **SQL migration**: `supabase/migrations/013_project_crew_assignments.sql` — Charlie runs BEFORE execution
> **Architecture reference**: `.claude/ARCHITECTURE.md` — read this FIRST. Every decision is there.
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head refactor-data-layer --title "Refactor: Data layer rebuild for workflow integrity" --body "Rebuilds stores, supabaseData, and page data consumption per ARCHITECTURE.md. One new table (project_crew_assignments). No visual changes."`

---

## CRITICAL CONTEXT

Read these files before writing any code:
1. `.claude/ARCHITECTURE.md` — the blueprint for everything below
2. `.claude/CODE_GUIDE.md` — execution rules, verification protocol
3. `CLAUDE.md` (project root) — naming conventions, what NOT to do
4. `src/types/index.ts` — existing type definitions
5. `src/services/supabaseData.ts` — current CRUD functions (you'll refactor this)
6. All store files in `src/stores/` — current implementations (you'll refactor these)

### What Stays Untouched
- `src/components/layout/` — Sidebar, AppLayout, PageHeader
- `src/components/shared/` — all shared UI components
- `src/components/pdf/` — PDF templates
- `src/components/ui/` — atomic form elements
- `src/services/supabase.ts` — Supabase client instance
- `src/services/stripe.ts` — Stripe integration
- `src/services/anthropic.ts` — AI integration
- `src/lib/manifest.ts` — manifest engine
- `src/lib/workorders.ts` — work order generation
- `src/lib/alerts.ts` — alert aggregation
- `src/lib/constants.ts` — app constants
- `src/hooks/` — custom hooks
- `src/utils/` — utility functions
- Auth components (AuthContext, ProtectedRoute, LoginPage, SignUpPage)
- Landing page, onboarding components
- `src/index.css` — styles
- All config files (vite, tailwind, tsconfig, netlify, etc.)

### What Gets Refactored
- `src/services/supabaseData.ts` — add fetchProjectFull, fetchProjectCrewAssignments, summary counts
- `src/stores/projectStore.ts` — rebuild with list/full fetch modes, store-only data gateway
- `src/stores/scheduleStore.ts` — add crew assignments ownership, project timeline data
- `src/stores/crewStore.ts` — simplify to profiles only (remove assignment logic)
- `src/stores/materialStore.ts` — verify clean (org-level library only)
- `src/stores/equipmentStore.ts` — verify clean
- `src/stores/uiStore.ts` — verify localStorage-only, no domain data
- `src/stores/orgStore.ts` — verify widget layout persistence
- `src/lib/kpiDefinitions.ts` → refactor to `src/lib/kpiCompute.ts` — pure functions
- `src/pages/Dashboard.tsx` — coordinated loading, widget reads from stores only
- `src/pages/ProjectDashboard.tsx` — consume fetchProjectFull, all tabs from activeProject
- `src/pages/Projects.tsx` — consume project list with summary counts
- `src/pages/ProjectWizard.tsx` — write through stores, populate materials JSONB
- `src/pages/Schedule.tsx` — show project timelines + crew entries
- `src/pages/Crew.tsx` — reflect crew assignments from scheduleStore
- Dashboard widget components — read from stores, navigate to detail views

---

## TASK 1: Types

**Add new types to `src/types/index.ts`:**

```typescript
/** Project with computed summary counts — used by list views and dashboard */
export interface ProjectListItem extends Project {
  taskCount: number;
  completedTaskCount: number;
  crewCount: number;
  nextScheduledDate: string | null;
}

/** Complete project graph — used by ProjectDashboard */
export interface ProjectFull extends Project {
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  crewAssignments: ProjectCrewAssignment[];
  scheduleEntries: ScheduleEntry[];
  siteConditions: ProjectSiteCondition[];
}

/** Persisted crew-to-project assignment */
export interface ProjectCrewAssignment {
  id: string;
  orgId: string;
  projectId: string;
  crewMemberId: string;
  roleOnProject: string | null;
  assignedAt: string;
}
```

**Self-verification:**
- [ ] `npm run build` passes
- [ ] No duplicate or conflicting type names

---

## TASK 2: supabaseData.ts

**Refactor `src/services/supabaseData.ts`:**

Add these new functions (keep all existing functions that are still needed):

### fetchProjects(orgId) — now returns ProjectListItem[]
Modify the existing `fetchProjects` to also return summary counts. Use Supabase's ability to do count queries or fetch related counts. The result should include `taskCount`, `completedTaskCount`, `crewCount`, and `nextScheduledDate` for each project.

Implementation approach: fetch projects, then batch-fetch task counts and crew assignment counts. Combine into ProjectListItem[].

### fetchProjectFull(orgId, projectId) — NEW, returns ProjectFull
Fetches a single project with its complete graph in parallel:
```
Promise.all([
  fetch project by id,
  fetchProjectTasks(orgId, projectId),
  fetchProjectSubcontractors(orgId, projectId),
  fetchProjectPermits(orgId, projectId),
  fetchProjectCrewAssignments(orgId, projectId),   // NEW
  fetchScheduleEntriesForProject(orgId, projectId), // NEW — entries for this project only
  fetchProjectSiteConditions(orgId, projectId),     // may already exist
])
```
Combine into a single ProjectFull object.

### fetchProjectCrewAssignments(orgId, projectId) — NEW
```
supabase.from('project_crew_assignments')
  .select('*')
  .eq('org_id', orgId)
  .eq('project_id', projectId)
```
Map to camelCase ProjectCrewAssignment[].

### createProjectCrewAssignment(assignment, id, orgId) — NEW
Insert into project_crew_assignments. Handle unique constraint violation gracefully (crew member already assigned).

### deleteProjectCrewAssignment(id) — NEW
Delete by id.

### fetchScheduleEntriesForProject(orgId, projectId) — NEW
Like fetchScheduleEntries but filtered by project_id instead of date range.

**Keep all existing CRUD functions** that are still used (createProject, updateProject, deleteProject, createProjectTask, updateProjectTask, deleteProjectTask, fetchProjectSubcontractors, createProjectSubcontractor, fetchProjectPermits, createProjectPermit, updateProjectPermit, fetchCrew, fetchEquipment, fetchMaterials, fetchScheduleEntries, createScheduleEntry, updateScheduleEntry, etc.)

**Self-verification:**
- [ ] `npm run build` passes
- [ ] All new functions accept orgId parameter
- [ ] All new functions use snake_case ↔ camelCase mapping
- [ ] Existing function signatures unchanged (or consumers updated)

---

## TASK 3: projectStore

**Rebuild `src/stores/projectStore.ts`:**

New shape:
```typescript
interface ProjectStore {
  // State
  projects: ProjectListItem[];       // List view data with summaries
  activeProject: ProjectFull | null; // Currently viewed project (full graph)
  loading: boolean;

  // Actions
  fetchProjects: (orgId: string) => Promise<void>;
  fetchProjectFull: (orgId: string, projectId: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'createdAt'>, orgId: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Project sub-entity actions (write through store, update activeProject)
  createProjectTask: (task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<ProjectTask>;
  updateProjectTask: (id: string, updates: Partial<ProjectTask>) => Promise<void>;
  deleteProjectTask: (id: string) => Promise<void>;
  createProjectSubcontractor: (sub: Omit<ProjectSubcontractor, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<void>;
  updateProjectSubcontractor: (id: string, updates: Partial<ProjectSubcontractor>) => Promise<void>;
  deleteProjectSubcontractor: (id: string) => Promise<void>;
  createProjectPermit: (permit: Omit<ProjectPermit, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<void>;
  updateProjectPermit: (id: string, updates: Partial<ProjectPermit>) => Promise<void>;

  clearActiveProject: () => void;
}
```

**Key rules:**
- **NO localStorage persistence.** Remove Zustand `persist` middleware from this store.
- **NO seed/demo data in the store.** Sample data comes from Supabase (the insertSampleData flow).
- All actions call supabaseData functions, then update local state.
- `createProject` returns the created Project so the wizard can navigate to it.
- Sub-entity actions (createProjectTask, etc.) update `activeProject` in place after the Supabase write succeeds, so the ProjectDashboard re-renders immediately.
- Remove `projectMaterials` and `projectCrew` maps — materials live in Project.materials (JSONB), crew assignments live in scheduleStore.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] No localStorage persistence on this store
- [ ] No seed data in the store definition
- [ ] All actions call supabaseData, not Supabase client directly

---

## TASK 4: scheduleStore

**Rebuild `src/stores/scheduleStore.ts`:**

New shape:
```typescript
interface ScheduleStore {
  // State
  assignments: ProjectCrewAssignment[];  // Active crew-to-project assignments
  entries: ScheduleEntry[];              // Calendar entries for current view
  loading: boolean;

  // Actions
  fetchAssignments: (orgId: string) => Promise<void>;
  fetchEntries: (orgId: string, startDate: string, endDate: string) => Promise<void>;
  createAssignment: (assignment: Omit<ProjectCrewAssignment, 'id' | 'assignedAt'>, orgId: string) => Promise<ProjectCrewAssignment>;
  deleteAssignment: (id: string) => Promise<void>;
  createEntry: (entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>, orgId: string) => Promise<void>;
  updateEntry: (id: string, updates: Partial<ScheduleEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}
```

**Key rules:**
- **NO localStorage persistence.**
- `fetchAssignments` fetches ALL active assignments for the org (not project-filtered). This lets the Crew page and Dashboard show assignment status for all crew.
- `createAssignment` writes to project_crew_assignments table via supabaseData.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Assignments and entries are separate state slices
- [ ] No localStorage persistence

---

## TASK 5: crewStore, equipmentStore, materialStore

**Verify and simplify these stores:**

### crewStore
- Should only own crew member profiles (CRUD for crew_members table)
- Remove any assignment logic (that's scheduleStore's responsibility now)
- No localStorage persistence — always fetch from Supabase
- Keep existing fetch/create/update/delete actions

### equipmentStore
- Should only own equipment profiles
- No localStorage persistence
- Keep existing actions

### materialStore
- Should only own the org-level material library
- No localStorage persistence
- Keep existing actions

For each: if they currently have localStorage persistence via Zustand `persist`, remove it. If they have seed/demo data, remove it (sample data comes from Supabase).

**Self-verification:**
- [ ] `npm run build` passes
- [ ] No store has domain data in localStorage
- [ ] No store has hardcoded seed data

---

## TASK 6: kpiCompute

**Refactor KPI system:**

If `src/lib/kpiDefinitions.ts` exists, refactor it into `src/lib/kpiCompute.ts`. If it's already named kpiCompute.ts, refactor in place.

The KPI compute layer should be pure functions that take AppState and return computed values. No store imports, no side effects.

```typescript
// src/lib/kpiCompute.ts
import type { ProjectListItem, CrewMember, Equipment, Material } from '@/types';

export interface KPIAppState {
  projects: ProjectListItem[];
  crew: CrewMember[];
  equipment: Equipment[];
  materials: Material[];
}

export interface KPIResult {
  value: number;
  subtitle?: string;
}

export function activeProjectCount(state: KPIAppState): KPIResult { ... }
export function pipelineValue(state: KPIAppState): KPIResult { ... }
export function crewAvailable(state: KPIAppState): KPIResult { ... }
export function fleetAvailable(state: KPIAppState): KPIResult { ... }
// ... etc for all existing KPIs
```

Port all existing KPI compute functions to this pattern. Update the KPI strip component to consume these.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] kpiCompute.ts has no store imports
- [ ] All KPI functions are pure (input → output, no side effects)

---

## TASK 7: Page Refactors

### Dashboard.tsx
- On mount: coordinated fetch — `await Promise.all([fetchProjects, fetchCrew, fetchEquipment, fetchMaterials, fetchTodaySchedule])`. Show loading skeleton until all complete.
- KPI strip reads from the KPI compute layer, not directly from stores.
- Each widget reads from store hooks. No widget calls supabaseData.
- Widget clicks navigate to detail views (project → /projects/:id, crew → /crew, etc.)

### Projects.tsx
- Reads `projects` (ProjectListItem[]) from projectStore.
- Project cards show task completion from `taskCount` / `completedTaskCount`.
- No separate task count fetch needed — it's in the ProjectListItem.

### ProjectDashboard.tsx
- On mount: calls `projectStore.fetchProjectFull(orgId, projectId)`.
- Reads all tab data from `projectStore.activeProject` (ProjectFull).
- **No separate fetches per tab.** All data comes from the single fetchProjectFull call.
- On unmount: calls `projectStore.clearActiveProject()`.
- All inline edit operations write through projectStore actions, which update activeProject in place.
- Resources tab: reads crew assignments from `activeProject.crewAssignments`. Create/delete writes through `scheduleStore.createAssignment()` / `deleteAssignment()`, then refreshes activeProject.

### ProjectWizard.tsx
- On "Create Project": calls `projectStore.createProject(data, orgId)`.
- Materials from the wizard get included in the project data as the materials JSONB field.
- Tasks: calls `projectStore.createProjectTask()` for each task.
- Subcontractors: calls `projectStore.createProjectSubcontractor()` for each.
- Permits: calls `projectStore.createProjectPermit()` for each.
- **All writes go through the store, not directly to supabaseData.**
- After creation: navigates to `/projects/${newProject.id}`.

### Schedule.tsx
- Reads `entries` from scheduleStore for the visible date range.
- Reads `projects` from projectStore to display project timeline bars (startDate → targetDate).
- Reads `crew` from crewStore for crew member names.
- Project timeline bars: horizontal visual spanning each project's date range across the week/month view.
- Crew entries: individual schedule slots under the project bars.

### Crew.tsx
- Reads `crew` from crewStore (profiles).
- Reads `assignments` from scheduleStore to show current project assignment per crew member.
- Displays "Assigned to [project name]" or "Available" based on active assignments.

**Self-verification for all pages:**
- [ ] No page imports from `src/services/supabaseData.ts`
- [ ] All data reads go through store hooks
- [ ] All data writes go through store actions
- [ ] `npm run build` passes
- [ ] Each page loads without console errors (static check: no missing imports, no undefined references)

---

## REGRESSION CHECKLIST

After all tasks are complete, verify:

- [ ] Dashboard loads with all widgets populated (no empty widgets, no console errors)
- [ ] Projects page shows project cards with task counts
- [ ] Clicking a project card navigates to ProjectDashboard
- [ ] ProjectDashboard Overview tab shows project details
- [ ] ProjectDashboard Tasks tab shows tasks (for wizard-created projects)
- [ ] ProjectDashboard Materials tab shows project materials
- [ ] ProjectDashboard Budget tab shows budget breakdown
- [ ] ProjectDashboard Resources tab shows crew assignments and subcontractors
- [ ] ProjectDashboard Compliance tab shows permits
- [ ] Project wizard completes and navigates to new project's dashboard
- [ ] New project appears on Projects page immediately after creation
- [ ] Schedule page renders without errors
- [ ] Crew page renders without errors
- [ ] Equipment page renders without errors
- [ ] Materials page renders without errors
- [ ] Manifest page renders without errors
- [ ] Settings page renders without errors
- [ ] Sign out → sign in flow works (no stale data from previous session)
- [ ] `npm run build` passes clean
- [ ] No `console.log` debug statements left in code

---

## EXECUTION ORDER

1. **Task 1 (Types)** — foundation, everything else depends on these types
2. **Task 2 (supabaseData)** — data access layer, stores depend on this
3. **Task 3 (projectStore)** — most complex store, pages depend on this
4. **Task 4 (scheduleStore)** — depends on new supabaseData functions
5. **Task 5 (other stores)** — cleanup, straightforward
6. **Task 6 (kpiCompute)** — dashboard depends on this
7. **Task 7 (pages)** — consume the refactored stores. Do Dashboard and ProjectDashboard first, then others.

Run `npm run build` after each task. Do not proceed to the next task with a broken build.
