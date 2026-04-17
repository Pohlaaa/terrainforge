# TerrainForge — Master Project Context

## Product Identity
TerrainForge is a SaaS platform for landscaping contractors. It replaces spreadsheets, WhatsApp threads, and paper tickets with a single tool for project management, material manifests, crew coordination, equipment tracking, and AI-assisted pricing. Target customer: owner-operators and small landscaping companies (2-25 employees).

## Current Status (2026-04-05) — Contractor Feedback Complete, Lifecycle & Man Hours Live

**Active work**: Architecture cleanup, UI polish, account management. All contractor feedback items implemented.

**What's done**: 4-tab hub rebuild, Budget & Finance tab, wizard↔dashboard field alignment (PR #114), AI wizard with suggest-then-accept UX (PR #115), 3 rounds of wizard refinements (PRs #116-#118). AI wizard is feature-complete. Local supplier search rebuilt (Nominatim v5). Landing page updated with green brand identity and full feature coverage. Contractor feedback: measurement-input architecture (ProjectElement system), material formula corrections (polymeric sand, base depth minimums), project lifecycle (estimate→approved→scheduled→in_progress→completed with status gates and transition buttons), man hours as base unit with clock hours derived, equipment maintenance bugfix, session persistence fix, soil type UX.

**Milestones complete**: M1, M1.5a, M1.5b, M2. Data layer refactor complete. UI hub rebuild complete. AI wizard complete. Contractor feedback phases 1-4 complete. Currently in M3 "First Revenue".

**Database**: 17+ tables, 80+ RLS policies, 20 migrations applied (020_project_lifecycle_manhours — status column with lifecycle CHECK, completed_at/approved_at/started_at timestamps).

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
- `019_project_elements.sql` — project_elements table for measurement-driven architecture
- `020_project_lifecycle_manhours.sql` — status column (estimate→approved→scheduled→in_progress→completed→on_hold), completed_at/approved_at/started_at timestamps
- `021_project_element_materials.sql` — element↔material junction table
- `022_missing_indexes.sql` — FK index coverage
- `023_expand_element_types.sql` — wider element_type CHECK
- `024_add_quoted_status.sql` — "quoted" project status
- `025_add_owner_crew_role.sql` — owner crew role
- `026_materials_engine_upgrade.sql` — Engine columns on materials + element_materials, manifests table, RLS

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

## Measurement-Driven Architecture (LIVE — Migration 026)
The `ProjectElement` type represents a measurable area of work (patio, wall, garden bed, sod area, edging run). Each element has contractor-supplied dimensions and materials attach to elements via `project_element_materials`. The manifest engine calculates quantities from element dimensions — never from AI guesses.

### Materials Engine (src/materials-engine/)
The engine is a pure, stateless TypeScript module with zero dependencies. It computes material quantities from element geometry using 6 computation models. **For full spec, formulas, TypeScript interfaces, starter catalog, and migration details, read `../.claude/skills/terrainforge/references/engine-spec.md`.**

**6 Computation Models** — every material gets exactly one:
| Model | Formula | Materials |
|-------|---------|-----------|
| AREA_COVERAGE | area × (depth/12) → volume → purchase units | Mulch, gravel, topsoil, base rock, sand |
| UNIT_COVERAGE | area ÷ coverage_per_unit → count | Pavers, flagstone, sod, tile |
| LINEAR | linear_ft ÷ length_per_unit → count | Edging, border stone, wall caps, wire |
| POINT_SPACING | area ÷ (spacing/12)² → count, or manual_count | Plants, shrubs, trees, lights |
| LINEAR_DEPTH | length × height ÷ face_area_per_unit → count | Retaining wall block, stacked stone |
| SUBSTRATE | area × (1 + overlap) ÷ coverage_per_roll → rolls | Landscape fabric, geotextile |

**Critical rules:**
1. Waste applied BEFORE purchase rounding (never double-buffer)
2. Purchase list aggregates from raw totals across elements (not summed rounded values)
3. Bulk materials (cubic_yard, ton) round to nearest 0.5
4. Dependent materials are suggestions, not auto-added
5. Engine is pure — `generateEngineManifest()` has no side effects, React/Zustand handles persistence

**Engine files:** `engine.ts` (core compute), `unit-conversions.ts` (all math), `catalog.ts` (35 starter materials), `supplier-import.ts` (CSV/Excel import with model inference), `types.ts` (in src/types/), `index.ts` (re-exports)

**Database columns added (migration 026):**
- `materials` table: computation_model, compute_params (JSONB), subcategory, purchase_unit, qty_per_purchase_unit, cost_per_purchase_unit, default_waste_factor, supplier_sku, dependent_material_ids (TEXT[]), metadata (JSONB), is_active
- `project_element_materials` table: spacing_override_inches, waste_factor_override, manual_count, wall_length_ft, wall_height_ft, computation_model
- NEW `manifests` table: versioned JSONB snapshots (line_items, purchase_list, summary)

**Known issue:** TypeScript property `wasteFacorOverride` is a typo (missing 't'). The DB column `waste_factor_override` is correct. Fix is pending.

### Full Schema Reference
For complete column-level schema of all 33+ tables, read `../.claude/skills/terrainforge/references/live-schema.md`.

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