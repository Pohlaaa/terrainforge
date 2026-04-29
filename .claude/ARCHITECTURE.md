# TerrainForge — Architecture

> **Purpose**: The north star for all development. Every code session reads this file. Every decision about where data lives, how it flows, and how pages consume it is answered here.
> **Created**: 2026-04-03 (data layer refactor)
> **Updated**: 2026-04-28 (3D-in-Wizard, Sprint X/S/U/D run, curved shapes, manifests wiring, /queue page, proxy-claude Edge Function)
> **Owner**: Charlie + Cowork

---

## TL;DR of post-2026-04-28 state

- **Wizard**: 5 steps now (3D-in-Wizard pivot). Step 1 = Job → Step 2 = Measurements + 3D canvas → Step 3 = Plan/Crew → Step 4 = Numbers → Step 5 = Review. The old "Step 4 Materials" got folded into Step 2 (per-element material picker on the canvas) + a Step 3 review panel.
- **Measurements are king**: `project_elements` (24 types, dimensions, **shape + radius** as of mig 033) + `project_element_materials` (junction with computation + spacing + manual_count + wall_length/height + waste overrides). The override UI is now wired (MaterialPicker `Adjust` panel).
- **Curved shapes (mig 033)**: shape='circle' uses π × r² for area, 2πr for circumference. Renders as cylinder in 3D, circle in 2D, circle in ElementVisual.
- **Manifest engine**: `src/materials-engine/` — 6 computation models (AREA_COVERAGE | UNIT_COVERAGE | LINEAR | POINT_SPACING | LINEAR_DEPTH | SUBSTRATE). 58 vitest tests as of Sprint U. **Snapshots fire on `approved → scheduled`** transition (Batch 1) — versioned rows in `manifests` table; OverviewTab has a history expander.
- **AI is server-side (Sprint S)**: every Claude call goes through the `proxy-claude` Edge Function (auth via Supabase JWT, 30 req/min per-org rate limit, audit-logged). The browser never sees the API key. Operator must set `ANTHROPIC_API_KEY` secret on Supabase for AI to work.
- **Lifecycle**: 7-state status enum `estimate → quoted → approved → scheduled → in_progress → completed (+ on_hold)`.
- **Share-link surface (Phase A/B/C v0)**: `/share/:token` viewer with role discriminator `client_view | client_approve | client_design`. Phase D Inc 1 added contractor `/queue` page for cross-project pending submissions; Inc 3 added "design invite" email mode (still uses send-proposal-email Edge Function with mode=design_invite).
- **RLS**: as of mig 027 every `auth.*()` call wraps in `(select auth.*())`. New policies MUST follow this pattern. Mig 028+ added share-token-scoped anon policies on projects/elements/materials/share_tokens.
- **Edge Functions** (7 deployed): `proxy-claude` (Sprint S), `send-proposal-email` (proposal + design_invite modes), `notify-client-response`, `search-local-suppliers`, `create-checkout-session`, `create-portal-session`, `stripe-webhook` (refactored to handlers.ts for unit testing in P0).
- **Testing (A-level)**: 88 vitest unit tests; Playwright walkthrough + rpc-negative + materials-accuracy harness. CI workflows (`pr-checks`, `nightly`, `pre-deploy`) added in P0 — warn-only by default. See `.claude/TESTING/PLAN.md` for the strategy doc.
- **Pages to NOT touch**: Schedule, CrewManager, EquipmentManager no longer exist — their UI lives in CrewEquipmentHub + project-dashboard tabs.

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
| `/queue` | ReviewQueue | **Sprint D Inc 1** — cross-project pending design submissions. Badge in TopNav reflects count. |
| `/work-orders` | WorkOrders | Unchanged |
| `/price-research` | PriceResearch | Unchanged |
| `/settings` | Settings | Unchanged |
| `/billing` | Billing | Unchanged |

### Detail Routes

| Route | Page | Notes |
|-------|------|-------|
| `/projects/:id` | ProjectDashboard (6 tabs) | Overview, Tasks, Budget, Materials, Resources, Compliance |
| `/projects/wizard` | ProjectWizard | 5-step flow (see §5) |
| `/share/:token` | SharedProjectView | **Public**, no auth. Anon access via project_share_tokens (mig 028). Role discriminator: client_view (read-only), client_approve (read + approve/reject), client_design (read + edit element geometry, mig 031). |
| `/auth/callback`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth pages | Public |
| `/onboarding` | Onboarding | Auth required, no AppLayout |
| `/crew/*` | CrewLayout (separate shell) | Crew app routes for foremen — `/crew` (dashboard), `/crew/job/:entryId` |

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

## 5. Wizard Architecture (5-step flow as of 2026-04-28 — 3D-in-Wizard pivot)

### Step order + responsibility

```
Step 1 — The Job           name, project/property type, scope size, client info, address
  ↓ AI inferElements() fires on Step 1 → 2 transition
Step 2 — Measurements +    project_elements with dimensions, AI-seeded onto a 3D
         3D canvas         canvas over a Mapbox satellite of the property. Shape
                           selector (rectangle / circle), per-element material picker
                           sidebar with "Tailored to this element" AI suggestions.
  ↓ AI generateProjectRecommendations() also fires on this transition
Step 3 — Plan              AI-suggested tasks / crew / equipment / permits +
                           Materials review (rolled up from Step 2's per-element
                           assignments). Old "Step 4 Materials" got folded into
                           Step 2 + this review panel.
Step 4 — The Numbers       budget breakdown, overhead %, quote
Step 5 — Review & Create   summary, status=estimate, write to DB
```

The wizard kicks off **two parallel AI calls** at the Step 1 → Step 2 transition
(both go through the `proxy-claude` Edge Function as of Sprint S):

- `inferElements()` — returns element list with rough dimensions + a placement
  hint. Hint feeds `placementBucket()` to seed each element's geometry on the
  satellite canvas so they appear in roughly the right zone (backyard / front /
  side / driveway / perimeter) before the contractor refines.
- `generateProjectRecommendations()` — the bigger call: tasks, crew, equipment,
  materials, permits, budget. Results feed Step 3.

Per-element material suggestions (`inferMaterialsForElement()`) fire lazily — the
first time the contractor selects an element of a given type in Step 2, the
sidebar caches the result by `tempId`. Type changes invalidate; renames don't.

### AI Recommendation Flow

```
Step 0 complete (description + projectType + scopeSize + address)
                  ↓
       AI call in `src/services/aiRecommendations.ts`
       Input: description, projectType, scopeSize, propertyType, address,
              siteConditions, org crew[], equipment[], materials[],
              defaultRates, existing scheduleEntries[], projects[]
                  ↓
       Returns: AIRecommendationSet {
         tasks, crewPicks, equipmentPicks, materialPicks,
         budgetEstimate, permitSuggestions
       }
                  ↓
Steps 2-4: Each step renders SuggestionPanel alongside the form.
           Accept/Dismiss per item. Accepted populates form fields; form
           remains fully editable.
                  ↓
Step 5: Review + submit. Project created with status='estimate'. Elements
        saved. Materials auto-linked to matching elements via
        project_element_materials (category → element-type heuristics).
```

### Suggest-then-Accept UX Pattern

Steps 2-4 render a `SuggestionPanel` alongside the step's form. The panel shows AI
recommendations as cards the contractor can accept (populates form), dismiss, or
edit. Items not accepted are not included. Form fields remain fully editable after
acceptance. Measurements (Step 1) also shows AI-suggested presets per project type
(e.g. "Full Install" → Patio + Walkway + Garden Beds + Sod + Edging), contractor
accepts and then enters real dimensions.

### Data Flow (on submit)

The wizard writes to ALL downstream systems in one coordinated operation:

```typescript
// ProjectWizard onCreateProject:
const project = await projectStore.createProject(projectData);
// projectData includes materials JSONB, all budget fields, site conditions

// Child entities
await projectStore.createProjectTasks(project.id, tasks);
await projectStore.createProjectSubcontractors(project.id, subs);
await projectStore.createProjectPermits(project.id, permits);

// Crew assignments + schedule entries
for (crew of acceptedCrewPicks) {
  await scheduleStore.createAssignment({ projectId, crewMemberId, roleOnProject });
  // Create schedule entries for project date range
  await scheduleStore.createEntry({ projectId, crewMemberId, scheduledDate, ... });
}

// Equipment status updates
for (equip of acceptedEquipmentPicks) {
  await equipmentStore.updateEquipment(equip.id, { status: 'in-use', assignedProject: project.id });
}

navigate(`/projects/${project.id}`);
```

### AI Service Layer

`src/services/aiRecommendations.ts` — dedicated module for project AI recommendations. Calls Claude via `anthropic.ts` with structured prompts. Returns typed recommendation objects. Does NOT write to any store — it's a pure suggestion layer. The wizard owns the accept/reject logic and the store writes.

### Post-Creation Editing

All editing happens on the ProjectDashboard tabs. Each tab's edit operations write through the same store actions the wizard uses. This guarantees consistency — there's one code path for creating data and one for updating it, both going through the store.

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

## 7. File Organization (current)

```
src/
  pages/              — One component per route.
                        - Dashboard, BudgetHub, MaterialLibrary, CrewEquipmentHub (4 hub tabs)
                        - ProjectDashboard, ProjectWizard
                        - ReviewQueue (Sprint D Inc 1), SharedProjectView (Phase A/B/C)
                        - Settings, Billing, WorkOrders, PriceResearch, Onboarding
                        - crew/CrewDashboard, crew/CrewJobDetail (separate layout)
                        - Login, Signup, ForgotPassword, ResetPassword, AuthCallback, Landing
  components/
    layout/           — TopNav (with pending-design badge), AppLayout, CrewLayout, MobileSidebar
    shared/           — Reusable UI blocks (KPICard, DataTable, Modal, MaterialPicker w/
                        override panel, ElementVisual w/ circle support, TaskTimeline, etc.)
    pdf/              — @react-pdf/renderer templates
    ui/               — Atomic form elements (Input, Select, Button, NumberInput, ...)
    wizard/           — 5-step wizard components incl. WizardStepMeasurements (3D canvas host)
    plan/             — PlanView2D, PlanView3D (R3F + drei + Mapbox satellite ground)
    project-dashboard/ — ProjectDashboard tab components (Overview, Budget, Materials, ...)
  stores/             — Zustand: projectStore, crewStore, scheduleStore, equipmentStore,
                        materialStore, orgStore, uiStore, supplierStore
  materials-engine/   — Pure compute layer: engine.ts (6 models),
                        unit-conversions.ts, catalog.ts (35-row starter catalog),
                        supplier-import.ts. 58 vitest tests. NO side effects.
  services/
    supabase.ts                 — Client instance
    supabaseData.ts             — Re-exports from supabaseElements/Materials/Crew/etc
    supabaseElements.ts         — project_elements + project_element_materials CRUD
    supabaseMaterials.ts        — org material library + bulk import (chunked)
    supabaseShareTokens.ts      — share-link CRUD, fetchPendingDesignSubmissions, etc
    supabaseManifests.ts        — manifest snapshot CRUD (Batch 1 wiring)
    supabaseShareTokens (cont)  — sendProposalEmail with mode='proposal' | 'design_invite'
    stripe.ts                   — Stripe.js loader
    anthropic.ts                — callClaude() — proxies through proxy-claude Edge Function
    aiRecommendations.ts        — Higher-level prompts (inferElements, inferMaterialsForElement,
                                  generateProjectRecommendations) — all go through callClaude
  lib/
    manifest.ts             — Legacy zone-based manifest wrapper around materials-engine
    workorders.ts           — Work order generation
    alerts.ts               — Alert aggregation
    constants.ts            — App constants
    kpiCompute.ts           — Pure KPI functions
    projectCost.ts          — computeProjectCost (wizard ↔ Overview consistency)
    projectProgress.ts      — Status-gated progress computation
    planLayout.ts           — autoLayout, placementBucket (AI hint → satellite zone),
                              elementColor, elementMaterial, fallbackDimensions
    elements.ts             — getElementTypesForMaterial, ELEMENT_TYPE_LABELS, dim configs
    categories.ts           — Material category normalization + labels
    taskTimeline.ts         — Critical path / overrun calc (X-12 fix)
  hooks/                    — useToast, useBillingGate, usePendingDesignCount (Sprint D)
  types/                    — TypeScript interfaces
  utils/                    — Formatting, dates, validation

supabase/
  functions/                — 7 Edge Functions (all deno-runtime + npm: imports)
    proxy-claude/           — AI proxy (Sprint S) — JWT auth + per-org rate limit
    send-proposal-email/    — Resend integration; mode toggle proposal vs design_invite
    notify-client-response/ — Contractor notification on client approve/reject/submit
    search-local-suppliers/ — Nominatim search + civic blocklist (X-10)
    create-checkout-session/ + create-portal-session/ — Stripe billing entry points
    stripe-webhook/         — index.ts (dispatch) + handlers.ts (unit-tested in P0 #2)
  migrations/               — 33 migrations applied to staging + prod

scripts/
  check-perf-budget.mjs     — Bundle size check vs PERF_BUDGET.md (P0 #5)
  test-persistence.ts       — Local DB diagnostic

e2e/                        — Playwright suite: walkthrough, rpc-negative + RLS sweep,
                              materials-accuracy harness, helpers.ts

.github/workflows/          — CI (P0 #1): pr-checks.yml, nightly.yml, pre-deploy.yml
```

---

## 8. Migrations Inventory

33 migrations applied. Recent (post-Apr-21) ones with brief context:

| # | File | What |
|---|------|------|
| 026 | `materials_engine_upgrade` | engine columns on materials, project_element_materials override columns, manifests table |
| 027 | `perf_and_security_hardening` | wrap auth.*() in (select auth.*()) across 88 RLS policies; FK indexes; pin search_path on functions |
| 028 | `design_app_foundation` | site_geometry on projects; element_geometry on project_elements; project_share_tokens (anon-readable when role-scoped) |
| 029 | `client_approval` | client_response/note/responded_at on share tokens; respond_to_share_token RPC |
| 030 | `material_textures` | textureAlbedoUrl/Normal/Roughness on materials |
| 031 | `client_design_edit` | role='client_design' on share tokens; client_update_element_geometry RPC (SECURITY DEFINER) |
| 032 | `project_design_versions` | Append-only design submission history; submit_design_changes RPC |
| 033 | `element_shapes` | shape (rectangle\|circle\|polyline) + radius_ft on project_elements; engine reads shape='circle' as π × r² |

When adding a new migration: name `NNN_snake_case.sql`, include RLS policies that wrap `auth.*()` calls per mig 027, default new columns so back-compat holds.

---

## 9. AI Layer (Sprint S — server-side)

```
src/services/aiRecommendations.ts
            ↓ callClaude() (no longer uses VITE_ANTHROPIC_API_KEY)
src/services/anthropic.ts
            ↓ supabase.functions.invoke('proxy-claude', { prompt, model, max_tokens })
proxy-claude Edge Function
            ↓ verify JWT, look up organization_members, rate-limit (audit_log count)
            ↓ forward to api.anthropic.com/v1/messages with x-api-key from secret
            ↓ insert audit_log row (action='view', entity_type='proxy-claude')
```

**Operator action required**: set `ANTHROPIC_API_KEY` in Supabase Edge Function Secrets before AI works. Failure mode is graceful — `callClaude()` rejects, callers return null/[] so the wizard still renders without recommendations.

The browser bundle no longer contains the API key. Rotate the previously-exposed key after the secret is set.

---

## 10. Manifest Snapshots (Batch 1 wiring)

`manifests` table (mig 026) was finally consumed by store wiring on 2026-04-28.

```
projectStore.updateProject(id, { status: 'scheduled' })
    ↓ if prevStatus === 'approved' && updates.status === 'scheduled'
    ↓ get current activeProject + materials catalog
src/services/supabaseManifests.ts.snapshotManifestForProject()
    ↓ generateEngineManifest() pure compute
    ↓ nextManifestVersion(projectId) → existing top + 1
    ↓ supabase.from('manifests').insert(buildManifestInsert(...))
toast.success('Manifest snapshot saved.')
```

OverviewTab has a "Manifest snapshots" expander showing version, timestamp, line-item count, and total cost. Each snapshot is the engine output frozen — line_items, purchase_list, summary as JSONB columns.

---

## 11. Future Considerations

- Real-time collaboration (multi-user editing)
- Offline/PWA support for field crews
- Magic-link auth for clients (Phase D Inc 2 — sensitive, deferred)
- 3D primitives for polygon and line shape kinds
- PDF export of manifest snapshots (planned)
- Cross-tenant RLS automation needs a second test account
- Client portal (read-only project view for clients)