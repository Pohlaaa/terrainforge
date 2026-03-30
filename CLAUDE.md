# TerrainForge — Master Project Context

## Product Identity
TerrainForge is a SaaS platform for landscaping contractors. It replaces spreadsheets, WhatsApp threads, and paper tickets with a single tool for project management, material manifests, crew coordination, equipment tracking, and AI-assisted pricing. Target customer: owner-operators and small landscaping companies (2–25 employees).

## Milestone Roadmap

| Milestone | Goal | Gate | Status |
|-----------|------|------|--------|
| M1 "Worth the Demo" | Full contractor workflow + scheduling | All pages live, billing, multi-tenant, scheduling | **ACTIVE** |
| M2 Operations | Time tracking, client portal, integrations | 5+ paying customers | Next |
| M3 3D Design Studio | Three.js design tool tied to manifest engine | 20+ customers, 90% retention | Future |
| M4 Scale & Marketplace | Supplier marketplace, subcontractor network | $15K+ MRR stable | Future |

## Current Status (2026-03-30) — M1 "Worth the Demo" Active
- Auth, onboarding, all 10+ pages wired to Zustand stores + Supabase
- Database: 15 tables, 55+ RLS policies, full multi-tenancy (org_id isolation)
- PDF export, Stripe billing, Claude AI features, Mapbox maps all live
- Dashboard: KPI customization, drag-and-drop widgets, schedule widget, map widget
- Weekly scheduling with drag-and-drop (Sprint 15), edit modal + equipment assignment (Sprint 16)
- Sprints 1–16 complete (70+ tasks). Sprint 16.5 hotfix pending (enum mismatch fix)
- Pre-existing bugs: material add, equipment add fail with DB enum mismatch — Sprint 16.5 fixes this

## Tech Stack
React 18 + Vite + TypeScript | Zustand 7 stores (localStorage + Supabase sync) | Supabase Auth + PostgreSQL | Tailwind CSS + CSS custom properties | Netlify (frontend) | Stripe (billing) | Claude API (AI features) | Dev server: localhost:3000 (set in vite.config.ts)

## Architecture Rules

### File Organization
- `src/pages/` — One component per route, named to match the route
- `src/components/layout/` — App shell (Sidebar, AppLayout, PageHeader)
- `src/components/shared/` — Reusable UI blocks (Modal, Badge, DataTable, KPICard, etc.)
- `src/components/pdf/` — @react-pdf/renderer PDF templates (ManifestPDF, CrewPacketPDF)
- `src/components/ui/` — Atomic form elements (Button, Input, Select, Checkbox, Textarea)
- `src/stores/` — Zustand stores, one per data domain (project, material, crew, equipment, ui, org, schedule)
- `src/services/` — External API clients (supabase, stripe, anthropic)
- `src/lib/` — Pure business logic functions (manifest engine, work orders, alerts, constants)
- `src/hooks/` — Custom React hooks (useAsync, useForm)
- `src/types/` — TypeScript interfaces and type definitions
- `src/utils/` — Formatting, dates, validation helpers

### Naming Conventions
- **Database columns:** snake_case (`org_id`, `crew_members`, `unit_cost`)
- **TypeScript interfaces/props:** camelCase (`unitCost`, `crewMembers`, `orgId`)
- **Mapping layer:** `src/services/supabaseData.ts` handles snake_case ↔ camelCase conversion
- **Components:** PascalCase files and exports
- **Stores:** camelCase files (`projectStore.ts`), hooks exported as `useProjectStore`

### Data Flow Pattern
1. Zustand store holds application state with localStorage persistence
2. Pages read from stores via hooks (`useProjectStore()`)
3. Mutations update local state first (optimistic), then sync to Supabase
4. Seed data exists in stores so the app works without a database connection
5. `supabaseData.ts` handles all DB operations with snake/camel mapping

### Styling Rules
- Use CSS custom properties: `var(--green-l)`, `var(--surface)`, `var(--text-2)`, etc.
- Dark theme is default — all colors defined in `src/index.css`
- Tailwind utilities for layout, spacing, typography
- Custom properties for brand colors and theme consistency
- Key colors: green (#2D6A4F / #74C69D), surface (#111810 / #161E14), text hierarchy (text/text-2/text-3/text-4)

### Auth Pattern
- `AuthContext` wraps the entire app, provides `user`, `session`, `signIn`, `signOut`
- `ProtectedRoute` gates all app routes — redirects to /login if no session
- Public routes: `/login`, `/signup`, `/forgot-password`
- All protected routes render inside `<Sidebar /> + <main>` layout

## Multi-Tenancy Model
- Every data table has `org_id` — RLS policies enforce tenant isolation
- 4 roles: admin, designer, foreman, client (in `org_role` enum)
- Admins: full CRUD | Designers: read + create | Foremen: read | Clients: limited read
- RLS violations return 0 rows silently — no error thrown. When debugging empty data, check RLS policies FIRST.

## Migrations (supabase/migrations/)
- `001_initial_schema.sql` — full schema, RLS
- `002_stripe_billing.sql` — Stripe columns
- `003_fix_rls_policies.sql` — org + self-membership INSERT
- `004_project_materials_jsonb.sql` — materials JSONB on projects
- `005_scheduling.sql` — schedule_entries + crew_status tables
- `006_fix_enum_mismatch.sql` — Replace all ENUM columns with TEXT + CHECK constraints

## Business Logic (src/lib/)
- **manifest.ts:** `computeQty()`, `generateManifest()`, `computeProjectCostRaw()` — material quantities from zone area/perimeter, reserve %, cost rollup
- **workorders.ts:** Generates installation steps per zone based on material categories
- **alerts.ts:** `getAllAlerts(state)` aggregates equipment, crew cert, inventory, project alerts by severity
- **constants.ts:** Reserve percentages, skill options, equipment capability maps, checklist items

## Material Categories
`paver | stone | tile | brick | concrete | sod | seed | mulch | gravel | sand | soil | edging | plant | shrub | tree | lighting | irrigation | lumber | misc`

## What NOT to Do
- Don't use `any` types — use interfaces in `src/types/`
- Don't put business logic in components — extract to `src/lib/`
- Don't hardcode colors — use CSS custom properties
- Don't skip the snake_case ↔ camelCase mapping when touching Supabase data
- Don't create Zustand stores without the `persist` middleware pattern
- Don't use relative paths when `@/` alias is available
- **NEVER use Postgres ENUM types** — always use TEXT columns with CHECK constraints. ENUMs cause silent write failures (22P02) when frontend values don't match. CHECK constraints are flexible and can be updated with ALTER TABLE. Sprint 16.5 migration 006 converted all existing ENUMs.
- **Every fetch function in supabaseData.ts MUST filter by org_id** — RLS policies enforce org isolation, but queries without `.eq('org_id', orgId)` return empty results (RLS silently blocks). Always accept `orgId: string` as a parameter.
- **Frontend type values must exactly match DB column CHECK constraint values** — if `MaterialCategory` has `'seed'`, the DB CHECK must also allow `'seed'`, not `'turf_seed'`. Mismatches cause silent INSERT failures.
- **Don't add new widgets to DEFAULT_WIDGET_LAYOUT without a merge function** — existing users have cached layouts in localStorage. The Zustand persist `merge` function must detect and append missing widget types.
- **Don't embed SQL in markdown docs** — all migrations go in `supabase/migrations/[NNN]_[description].sql`. Sprint prompt files reference the SQL file, never inline it.

## Core Principles
1. **Ship working software over perfect architecture** — Phase 1 must be demoable and sellable
2. **AI everywhere it adds value** — Every user action that could benefit from reasoning should have it
3. **Dual-mode always** — App works offline (localStorage) and syncs when connected (Supabase)
4. **Charlie is a BSA, not a full-time engineer** — Explain tradeoffs, flag risks, make recommendations explicit
5. **Budget-conscious scaling** — Minimize infrastructure cost until revenue justifies growth

## Codebase Quality Rules
- Prefer editing existing files over creating new ones
- Check if a shared component exists in `src/components/shared/` before building a new one
- Dead code gets deleted, not commented out
- File size soft limits: page 300 LOC, component 200 LOC, store 400 LOC, service 500 LOC
- Don't add a dependency for something that takes <30 lines to write
- New Supabase table checklist: RLS INSERT policy, RLS SELECT policy, org_id column, NOT NULL defaults, no UNIQUE conflicts with retry logic
- Import order: React → third-party → @/types → @/stores → @/lib → @/components → local

## .claude/ File Map
After the Sprint 25 consolidation, only these files are active:

### For Sprint Planning + Execution (Claude Code reads these)
- `.claude/CODE_GUIDE.md` — execution workflow, sprint lifecycle, testing protocol
- `.claude/CONTEXT.md` — current state, open bugs, git state
- `.claude/ROADMAP.md` — milestone plan, what to build next
- `.claude/CONSIDERATIONS.md` — backlog items, design decisions
- `.claude/ORCHESTRATOR.md` — full project knowledge base, Supabase rules
- `.claude/DESIGN_SYSTEM.md` — design tokens (for visual sprints)
- `.claude/SPRINT_TEMPLATE.md` — template for new sprint prompts

### Business/Strategy (Cowork only — Code does not read these)
- `.claude/business/BUSINESS.md` — pricing, unit economics
- `.claude/business/MARKETING.md` — ICP, channels, demo playbook
- `.claude/business/AI_PRODUCT.md` — AI integration strategy

### Subdirectories
- `.claude/archive/` — completed sprint prompts, old design previews, superseded docs
- `.claude/design/` — active design preview (v7)
- `.claude/TESTING/` — QA findings, test protocol, sprint test results
- `.claude/SQL/` — sprint-specific SQL reference files