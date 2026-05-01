# TerrainForge — Master Project Context

## Product Identity
TerrainForge is a SaaS platform for landscaping contractors. It replaces spreadsheets, WhatsApp threads, and paper tickets with a single tool for project management, material manifests, crew coordination, equipment tracking, and AI-assisted pricing. Target customer: owner-operators and small landscaping companies (2-25 employees).

## Current Status (2026-04-30) — Sprint AI-Place + AI-Buildable + V6 + Bucket A all live in prod

**Active work**: V6 contractor feedback loop with jbluhm closed at the architectural level. The wizard now does **vision-grounded element placement** on the satellite tile (Sprint AI-Place: Claude Haiku 4.5 vision call inside `proxy-claude` Edge Fn → normalized tile coords → plan-feet via Web Mercator), surfaces the AI-identified buildable polygon + obstacle polygons as overlays in 2D + 3D (Sprint AI-Buildable Phase 1), and survives every contractor pain point from jbluhm's V6 notes (scale, remove element, materials qty live-scale, Enter advances, hourly rates accept 0, materials tab reorder, Engine Math debug view, robust CSV parser, supplier-prefixed SKUs, edging consumables, draft persistence).

**Latest commits on `main`** (production = `terrainforge-staging.netlify.app`, drag-deployed via Netlify CLI):
- `6e081f3` fix(budget): preserve user-typed 0 in budget edit save (sweep)
- `5600201` fix(routing): F-V6-PROD-01 — eliminate /projects + /projects/new 404s
- `e31474e` feat(materials): jbluhm V6 — Bucket A (csv + suppliers + engine debug)
- `ad20075` fix(v6): jbluhm V6 feedback batch — P0/P1 wizard + onboarding
- `54d85d5` feat(wizard): Recompute button + localStorage draft persistence
- `bad421b` feat(ai-buildable-2): soft-clip drag warning + element collision nudge
- `4b75ad0` feat(ai-buildable): mig 035 + buildable + obstacle overlays in 2D/3D
- `5bb0b54` feat(ai-place): wizard wiring + harness — PR2 of 2
- `13073ca` feat(ai-place): plumbing PR — vision-grounded element placement
- `e2a539b` fix(3d): F-3D-MESH-01 element meshes invisible at parcel-scale framing

**What's in production now (verified live via Chrome MCP, 2026-04-30):**
- ✅ Wizard: 5-step (Job → Design → Plan → Numbers → Review), Enter advances, draft persists in localStorage scoped per org, Cancel routes to `/dashboard` (was 404)
- ✅ AI element inference + AI vision placement + per-element rationale tooltips + Recompute + Hide/Show overlay toggles
- ✅ Materials qty live-scales when contractor edits dimensions (no more "go forward, go back" workaround)
- ✅ 3D viewer: F-3D-MESH-01 fix landed — element-priority camera framing, 0.05 ft ground offset, hardscape thickness defaults (paver 0.4 ft, edging 0.3 ft, etc.). Polygon overlays in 2D + 3D for buildable area + obstacles
- ✅ Materials hub: tabs reordered (Library → Suppliers → Inventory On Hand), default landing on Library, ⚙ Engine Math debug view shows live unit conversions per material with test dimensions
- ✅ CSV import: RFC 4180 parser handles quoted commas, escaped quotes, embedded newlines, CRLF; survives the historical 50-row failure mode
- ✅ Supplier short_code (mig 036) → SKU prefix at CSV import (RH-PAVER-12) → supplier_prices junction rows for per-supplier pricing
- ✅ Engine consumables: edging spikes, paver-edge restraint + spikes, landscape staples (5 new starter-catalog entries)
- ✅ Onboarding: hourly rates accept "0" explicitly (the F-V6 falsy-coerce was nuking 0); BudgetTab edit save same-class sweep also done
- ✅ Cmd-K quick switcher (59 results: pages + projects with status badges)

**Materials engine (still rock-solid)**: 6 computation models, 89.6% mean accuracy across 30-scenario harness, 0 forbidden hits, junction count consistent across cascade (10/7).

**Infrastructure live in prod**:
- 7 Edge Functions deployed including `proxy-claude` v7 with vision support (server-side base64-fetch of Mapbox tiles so the token never reaches Anthropic)
- 36 migrations applied (001-036)
- Email delivery via Resend (real inbox, 2.3s round-trip)
- Cmd-Z / Cmd-Shift-Z global undo via zundo temporal middleware

**Test posture**: 181 vitest unit tests (engine, supabase mapping with arrays-of-arrays regression, mapTileMath, polygonGeom, elementOverlap, scaleAIQuantity, csvParse, aiPlacement). Playwright walkthrough green (28s, 23/23). Materials accuracy harness + AI placement corpus harness available via `npm run materials:score` and `npm run placement:score` (corpus expected[] still pending Charlie's authoring per `.claude/TESTING/AI_PLACEMENT_NOTES.md`).

**Repo state**: single working tree on `main` at `6e081f3` (parent worktree). The historical `claude/quirky-ishizaka` worktree was removed after the merge — fresh feature branches go in fresh worktrees as needed. 17 already-merged old branches deleted; only `main` and `sprint-23-crew-pin-auth` (abandoned 2026-03-30) remain locally.

---

## Earlier status — kept for context

### Materials engine cascade journey (closed Apr 26)
~50 distinct contractor-walkthrough findings closed across 18 commits over the F-CW series. The materials engine — TerrainForge's central value prop — went from completely broken to producing accurate, contractor-ready material rows with sensible quantities, verified live on staging.

**Materials engine cascade journey** (5 deploys on staging, junction-row count is the headline metric):
- Pre-fix: **1 of 8** materials linked to elements (silent unit-CHECK rejection)
- `e3799eb` (LIVE-08 unit normalization): 1/8 with library IDs now valid
- `e7c3972`+`1193844` (LIVE-09 + LIVE-03 iter): **8/9** — broader category mapping + name-keyword fallback
- `04f230f` (kwIdx fix): 10/8 — final element-inference edge case
- `5cb1d7c` (LIVE-11/12/13): **10/7** — dedup + trench formula + AI plant count

**Live-verified working as of project bbf79870**:
- Element inference clean: 4/4 elements (Sod, Shrub, Mulch, Drainage), 0 false positives
- Materials cascade: every element has materials, multi-element linking works
- Hydrangea qty = AI's stated count (8), not 1
- Stone material on drainage = trench-formula cuyd, not 0
- No duplicate Sod entries
- Manifest tab and Closeout tab agree (single junction source of truth)

**Recent commit chain** (`claude/quirky-ishizaka` branch, walkthrough series):
- `c219d80` — F-CW-04/06/07/09 (P1 walkthrough fixes)
- `4c6bd84` — F-CW-01/02/03/05/10 (P2/P3 polish)
- `e4e5c06` — Edge Functions `client → client_name` + redeploy
- `2665cfd` — MD refresh
- `06765ec` — walkthrough #2 findings
- `cdfb047` — walkthroughs #3-5 findings
- `a154357` — walkthroughs #6-8 + 2nd P0 surfaced
- `3d9851f` — walkthroughs #9-13
- `ed62f15` — Session 1 fix sweep (16 findings)
- `673403e` — Session 2 fix sweep (15 findings)
- `7869eb8` — live walkthrough on staging
- `e3799eb` — LIVE-01/03/05/07/08 fixes
- `1193844` — LIVE-03 iteration
- `e7c3972` — LIVE-09 broader mapping + name-keyword fallback
- `04f230f` — LIVE-03 final edge (kwIdx == verbIdx)
- `5cb1d7c` — LIVE-11/12/13 precision (dedup + trench + plant count)
- `3ede65f` — final FINDINGS update

**Email delivery configured**: Resend API + Supabase Edge Function secrets. `send-proposal-email` v8 verified live with `emailed: true` in 2.3s. Real inbox delivery confirmed.

**3D pivot sprints shipped** (commit range ~`d48061b → 1ee17d9`, 19 commits, 3 migrations):
- S1-S7 PARTIAL: full share-link viewer at `/share/:token` with 2D + 3D toggle, Mapbox backdrop, geo-aligned satellite ground, element-focused camera, per-category material props, shape primitives for trees/shrubs/fire pits, client approve/reject loop with email notifications

**3D pivot sprint backlog** (still pending — feeds into next session):
- 6a/7a — 3D editing (drag/resize/rotate with camera-space math)
- 6c — precise element-on-property placement (partial via 7b; element origin still (0,0))
- 6f/7e — Shape primitives for remaining types (currently boxes/cylinders/spheres for trees/shrubs/fire pits)
- 7c — Real PBR texture maps via migration 030 columns (needs hosting decision)

**Next session focus**: integrate the 3D viewer into the project wizard so contractors see their elements rendered in 3D as they enter measurements (Step 2 Measurements), with live preview that updates as dimensions change. Currently 3D is post-creation only — toggle on Overview after project exists. Pulling 3D into the wizard tightens the feedback loop and exercises the 3D editing backlog (6a/7a) on a different surface.

See `.claude/TESTING/FINDINGS.md` for per-finding detail and `.claude/TESTING/PUNCH_LIST.md` for the open polish backlog.

**Earlier work still shipped**: P0 remediation sweep (F-040 through F-050) Apr 21, platform stabilization (mig 027) Apr 17. Contractor feedback round 1 complete. 4-tab hub, 6-step wizard, materials engine with 6 computation models, measurement-driven ProjectElement architecture, project lifecycle states.

**Dev escape hatches** (DEV-only, stripped from prod builds): `VITE_DEV_AUTO_SIGNIN_EMAIL/PASSWORD` auto-signs in, `VITE_DEV_BYPASS_BILLING=true` skips trial gate. Enables fast local iteration without login friction.

**Database**: 34+ tables, 130+ RLS policies, **36 migrations applied** (001-036). Production project: `axasujjoywqadzuisvaj` "Terrain Forge" (us-east-1, Postgres 17). Test fixture data still disposable; no real clients.

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
- `027_perf_and_security_hardening.sql` — Wrap auth.*() in subselects across all 88 RLS policies; add 12 missing FK indexes; drop 28 unused indexes; pin search_path on 10 functions; tighten audit_log INSERT

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