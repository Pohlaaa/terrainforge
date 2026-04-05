# TerrainForge — Master Project Context

## Product Identity
TerrainForge is a SaaS platform for landscaping contractors. It replaces spreadsheets, WhatsApp threads, and paper tickets with a single tool for project management, material manifests, crew coordination, equipment tracking, and AI-assisted pricing. Target customer: owner-operators and small landscaping companies (2-25 employees).

## Current Status (2026-04-04) — Contractor Feedback & Architecture Sprint

**Active work**: Contractor feedback response — (1) Measurement-input architecture (ProjectElement system), (2) Material formula corrections (polymeric sand coverage, base depth minimums), (3) Project lifecycle expansion (estimate→approved→scheduled→in_progress→completed), (4) Man hours vs clock hours clarification, (5) Bug fixes (equipment maintenance, session persistence). Plus ongoing: architecture cleanup, UI polish, account management.

**What's done**: 4-tab hub rebuild, Budget & Finance tab, wizard↔dashboard field alignment (PR #114), AI wizard with suggest-then-accept UX (PR #115), 3 rounds of wizard refinements (PRs #116-#118). AI wizard is feature-complete. Local supplier search rebuilt (Nominatim v5). Landing page updated with green brand identity and full feature coverage. First real contractor feedback received and solution documented.

**Milestones complete**: M1, M1.5a, M1.5b, M2. Data layer refactor complete. UI hub rebuild complete. AI wizard complete. Currently in M3 "First Revenue".

**Database**: 15+ tables, 75+ RLS policies, 15 migrations applied (015_schema_cleanup applied — dropped dead project_crew table, added equipment FK, fixed cascade rules).

## Tech Stack
React 18 + Vite + TypeScript | Zustand 7 stores (Supabase-primary, localStorage for UI only) | Supabase Auth + PostgreSQL | Tailwind CSS + CSS custom properties | Netlify (frontend) | Stripe (billing) | Claude API (AI features) | Dev server: localhost:3000 (set in vite.config.ts)

## Architecture (read .claude/ARCHITECTURE.md for full details)

### Core Principle
Every piece of data has exactly one place it lives, one store that owns it, and one way it gets written. Pages are thin consumers — they read from store hooks and render. No page calls supabaseData directly.

### Data Flow
```
Page → store hook → store action → supabaseData function → Supabase
                         ↓
                   store state updated → page re-renders
```

### Store Ownership
| Store | Owns |
|-------|------|
| `projectStore` | Projects, tasks, materials (JSONB), subcontractors, permits, site conditions |
| `crewStore` | Crew member profiles |
| `scheduleStore` | Project crew assignments, schedule entries |
| `equipmentStore` | Equipment profiles |
| `materialStore` | Org-level material library |
| `uiStore` | Theme (dark/light), modals (localStorage) |
| `orgStore` | Org profile, subscription, preferences, widget layout (localStorage + Supabase) |

### Key Patterns
- **Project fetch modes**: `fetchProjects()` (list with summaries) and `fetchProjectFull()` (complete graph)
- **Materials source of truth**: `projects.materials` JSONB column. Zone materials are optional drill-down.
- **Crew assignments**: `project_crew_assignments` table (persisted). Not in-memory.
- **Domain stores fetch from Supabase, not localStorage.** Only UI preferences use localStorage.

## Layout Architecture
4-tab hub with top navigation bar. No sidebar.

| Tab | Route | Page Component | Data Sources |
|-----|-------|---------------|-------------|
| Projects | `/` | ProjectsHub | projectStore, all stores for KPIs |
| Budget & Finance | `/budget` | BudgetHub | projectStore, orgStore |
| Materials | `/materials` | MaterialLibrary | materialStore |
| Crew & Equipment | `/crew` | CrewEquipmentHub | crewStore, equipmentStore, scheduleStore, projectStore |

Secondary pages (Manifest Engine, Work Orders, Price Research, Settings, Billing) in "More" dropdown.
ProjectDashboard (6 tabs) and ProjectWizard unchanged.

## File Organization
- `src/pages/` — One component per route. 4 hub tabs + detail views + secondary pages.
- `src/components/layout/` — App shell (TopNav, AppLayout)
- `src/components/shared/` — Reusable UI blocks (Modal, Badge, DataTable, KPICard, etc.)
- `src/components/pdf/` — @react-pdf/renderer PDF templates
- `src/components/ui/` — Atomic form elements (Button, Input, Select, etc.)
- `src/components/wizard/` — Wizard step components
- `src/components/dashboard/` — Shared dashboard components (MapWidget)
- `src/components/project-dashboard/` — ProjectDashboard tab components
- `src/stores/` — Zustand stores with clear ownership boundaries
- `src/services/` — External API clients (supabase, stripe, anthropic)
- `src/lib/` — Pure business logic (manifest engine, work orders, alerts, KPI compute)
- `src/hooks/` — Custom React hooks
- `src/types/` — TypeScript interfaces
- `src/utils/` — Formatting, dates, validation

## Naming Conventions
- **Database columns:** snake_case (`org_id`, `crew_members`, `unit_cost`)
- **TypeScript interfaces/props:** camelCase (`unitCost`, `crewMembers`, `orgId`)
- **Mapping layer:** `src/services/supabaseData.ts` handles snake_case ↔ camelCase conversion
- **Components:** PascalCase files and exports
- **Stores:** camelCase files (`projectStore.ts`), hooks exported as `useProjectStore`

## Auth Pattern
- `AuthContext` wraps the entire app, provides `user`, `session`, `signIn`, `signOut`
- `ProtectedRoute` gates all app routes — redirects to /login if no session
- Public routes: `/login`, `/signup`, `/forgot-password`
- All protected routes render inside `<Sidebar /> + <main>` layout

## Multi-Tenancy Model
- Every data table has `org_id` — RLS policies enforce tenant isolation
- 4 roles: admin, designer, foreman, client
- Admins: full CRUD | Designers: read + create | Foremen: read | Clients: limited read
- RLS violations return 0 rows silently — no error thrown. Check RLS policies FIRST when debugging empty data.

## Migrations (supabase/migrations/)
- `001_initial_schema.sql` — full schema, RLS
- `002_stripe_billing.sql` — Stripe columns
- `003_fix_rls_policies.sql` — org + self-membership INSERT
- `004_project_materials_jsonb.sql` — materials JSONB on projects
- `005_scheduling.sql` — schedule_entries + crew_status tables
- `006_fix_enum_mismatch.sql` — Replace all ENUM columns with TEXT + CHECK constraints
- `007_crew_app_auth.sql` — crew_members auth linkage, crew RLS
- `008_checklist_progress_photos.sql` — crew checklist + photo metadata
- `009_org_shortcode.sql` — org shortcode with auto-generation trigger
- `010_project_intelligence_core.sql` — Extended projects, project_tasks, project_site_conditions
- `011_project_intelligence_resources.sql` — project_subcontractors, project_documents, project_permits
- `012_trial_columns.sql` — trial_starts_at, trial_ends_at on organizations
- `013_project_crew_assignments.sql` — crew-to-project assignment persistence
- `014_contractor_fields.sql` — crew phone, equipment type/hourly cost, disposal/equipment cost, org rates
- `015_schema_cleanup.sql` — Drop dead project_crew table, add equipment FK, fix cascade rules, add missing project columns

## Business Logic (src/lib/)
- **manifest.ts:** `computeQty()`, `generateManifest()`, `computeProjectCostRaw()` — material quantities, cost rollup
- **workorders.ts:** Generates installation steps per zone based on material categories
- **alerts.ts:** `getAllAlerts(state)` aggregates alerts by severity
- **constants.ts:** Reserve percentages, skill options, equipment capability maps
- **kpiCompute.ts:** Pure functions computing KPIs from AppState (replaces kpiDefinitions.ts)

## What NOT to Do
- Don't use `any` types — use interfaces in `src/types/`
- Don't put business logic in components — extract to `src/lib/`
- Don't hardcode colors — use CSS custom properties
- Don't skip the snake_case ↔ camelCase mapping when touching Supabase data
- Don't use relative paths when `@/` alias is available
- **NEVER use Postgres ENUM types** — always TEXT + CHECK constraints
- **Every fetch function in supabaseData.ts MUST filter by org_id**
- **Frontend type values must exactly match DB CHECK constraint values**
- **Pages NEVER import from supabaseData.ts** — always go through stores
- **Domain stores do NOT use localStorage persistence** — always fetch fresh from Supabase
- Don't embed SQL in markdown docs — migrations go in `supabase/migrations/`

## Data Model Principles (Contractor-Validated)
These principles were established from real contractor field testing and are non-negotiable for all new feature work.

1. **Measurements are King** — Every material quantity must trace back to a real measurement. Chain: Contractor Measurement → Element Dimension → Formula Calculation → Material Quantity. If any link is an AI guess without contractor verification, the output is untrusted.
2. **Objects Reflect Physical Reality** — Data structures map to things a contractor can point at on a job site. A `ProjectElement` is a patio, a wall, a garden bed — not an abstract zone. Materials attach to elements because that's how contractors think.
3. **AI Assists, Contractor Decides** — AI should suggest, estimate, and pre-fill. Every AI-generated value must be editable and clearly marked as "estimated." When the contractor enters a real value, it replaces the estimate and becomes the source of truth.
4. **Status Gates Control Visibility** — Project data is only actionable at the right lifecycle stage. Dates on estimates are noise. Material orders on un-approved projects are premature. Status gates what's shown and what actions are available.
5. **Industry Formulas are Sacred** — Material quantity formulas must match field standards: `sqft / 324 × depth_inches` for bulk materials, 50lb bag per 65sqft for polymeric sand, 6″ base minimum. These are industry standards built into the calculation engine, not configurable preferences.
6. **Man Hours are the Unit of Labor** — All labor estimation uses man-hours as the base unit. Clock hours are derived: `clockHours = manHours / crewSize`. Display both, store man-hours.

## Project Lifecycle Model
Projects follow a pipeline: `estimate` → `approved` → `scheduled` → `in_progress` → `completed` (+ `on_hold`). Start/end dates are only assigned after client approval. The wizard creates projects in "estimate" status. Calendar views only show scheduled/in_progress projects.

## Measurement-Driven Architecture (Planned)
The `ProjectElement` type represents a measurable area of work (patio, wall, garden bed, sod area, edging run). Each element has contractor-supplied dimensions and materials attach to elements. The manifest engine calculates quantities from element dimensions — never from AI guesses. See `Contractor_Feedback_Solution.docx` for full architecture spec.

## Codebase Quality Rules
- Prefer editing existing files over creating new ones
- Check if a shared component exists in `src/components/shared/` before building new
- Dead code gets deleted, not commented out
- File size soft limits: page 300 LOC, component 200 LOC, store 400 LOC, service 500 LOC
- Don't add a dependency for something that takes <30 lines to write
- New Supabase table checklist: RLS INSERT policy, RLS SELECT policy, org_id column, NOT NULL defaults
- Import order: React → third-party → @/types → @/stores → @/lib → @/components → local

## .claude/ File Map

### Active Files (Code reads these)
- `.claude/ARCHITECTURE.md` — **North star.** Store boundaries, data flow, layout architecture, fetch patterns, page composition.
- `.claude/CODE_GUIDE.md` — Execution workflow, git conventions, verification protocol.
- `.claude/DESIGN_SYSTEM.md` — Design tokens, color system, spacing, component specs, hub layout patterns.
- `.claude/CONTRACTOR_FEEDBACK.md` — Real contractor requirements integrated into UI rebuild.
- `.claude/CLEANUP_TRACK1_ARCHITECTURE_PROMPT.md` — **Current sprint.** Split supabaseData.ts, fix store bypasses, type safety.
- `.claude/CLEANUP_TRACK2_UI_POLISH_PROMPT.md` — **Current sprint.** Extract oversized components, migrate styles, responsive.
- `.claude/CLEANUP_TRACK3_ACCOUNT_MGMT_PROMPT.md` — **Current sprint.** Settings rebuild, org profile, roles, onboarding.

### Reference Files
- `.claude/DEPLOY_CHECKLIST.md` — Netlify deploy steps
- `.claude/STRIPE_SETUP.md` — Stripe configuration reference
- `.claude/SQL/` — SQL reference files

### Business/Strategy (Cowork only)
- `.claude/business/BUSINESS.md` — pricing, unit economics
- `.claude/business/MARKETING.md` — ICP, channels, demo playbook
- `.claude/business/AI_PRODUCT.md` — AI integration strategy

### Archived (historical reference only)
- `.claude/archive/` — Pre-refactor docs, old sprint prompts, superseded files
- `.claude/archive/REBUILD_PROMPT_completed.md` — 4-tab hub rebuild + contractor features
- `.claude/archive/BUDGET_TAB_PROMP