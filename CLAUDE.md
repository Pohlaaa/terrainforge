# TerrainForge — Master Project Context

## Product Identity
TerrainForge is a SaaS platform for landscaping contractors. It replaces spreadsheets, WhatsApp threads, and paper tickets with a single tool for project management, material manifests, crew coordination, equipment tracking, and AI-assisted pricing. Target customer: owner-operators and small landscaping companies (2-25 employees).

## Current Status (2026-04-03) — AI Wizard Sprint

**Active work**: AI-powered project creation wizard. AI recommends tasks, crew (with availability), equipment, materials, budget, and permits based on project description + org data. Suggest-then-accept UX pattern. Wizard submit writes to all downstream systems (crew assignments, schedule entries, equipment status).

**What's done**: 4-tab hub rebuild, Budget & Finance tab, wizard↔dashboard field alignment (PR #114 merged).

**Milestones complete**: M1, M1.5a, M1.5b, M2. Data layer refactor complete. UI hub rebuild complete. Currently in M3 "First Revenue".

**Database**: 15+ tables, 75+ RLS policies, 14 migrations applied (including 014_contractor_fields). No new migrations needed for AI wizard sprint.

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
- `014_contractor_fields.sql` — **PENDING** — crew phone, equipment type/hourly cost, disposal/equipment cost, org rates

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
- `.claude/AI_WIZARD_PROMPT.md` — **Current execution prompt.** AI-powered wizard with suggest-then-accept UX and downstream writes.

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