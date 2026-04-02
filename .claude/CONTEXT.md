# TerrainForge — Current Project State

> Living document — updated after each sprint.
> For execution workflow: read `CODE_GUIDE.md`
> For milestones and roadmap: read `ROADMAP.md` (Cowork-only for planning)
> For backlog items: read `CONSIDERATIONS.md` (Cowork-only for planning)
> For M1.5 data model reference: see `archive/DATA_MODEL_M1.5.md`
> Last updated: 2026-04-01 (Sprint 44.7 — widget persistence simplified, remove Supabase dependency)

---

## Current Status

**Active milestone**: M3 "First Revenue" — subscription enforcement, trial flow, launch readiness
**Last completed**: Sprint 44.7 — Simplified widget persistence (removed Supabase sync, localStorage only)
**Milestones complete**: M1, M1.5a, M1.5b, M2
**Current sprint**: None — awaiting Charlie's test of S44.7
**Git state**: PR #108 open (sprint-44-7-hotfix). Migrations 001–012 applied. Trial columns + trigger active.
**SQL migration needed**: None

**Sprint 44.7 results** (code-verified, pending Charlie test):
- Removed Supabase widget layout fetch/save from Dashboard entirely
- Widget layout now persists via Zustand persist (localStorage) only
- Sign-out clears localStorage (cross-account safe, but layout resets on re-login)
- Build passes clean

---

## What's Working (Manager App)

All M1 + M2 + M1.5a + M1.5b features complete and tested:

**M1.5b — Project Dashboard (Sprints 33-34)**:
- Project dashboard at `/projects/:id` with 6 tabs
- **Overview**: KPI cards, task summary, budget snapshot, schedule entries, recent permits
- **Tasks**: Phase-grouped task list, status toggling, inline add/edit/delete, AI badge on AI-generated tasks
- **Budget**: Cost breakdown, quote vs cost visual, margin guidance. Inline editing for client quote, overhead %, labor/materials/equipment costs
- **Materials**: Zone-grouped material list with quantities, unit costs, subtotals, project total
- **Resources**: Scheduled crew, subcontractor cards with inline add/edit/delete, actual vs quoted cost comparison, zone list
- **Compliance**: Permit list with inline edit form, add permit, HOA/access/risk notes

**M1.5a — Project Intelligence Wizard (Sprints 28-32)**:
- 7-step project creation wizard at `/projects/wizard`
- AI integration: task generation from description, site condition inference from address (Claude Haiku)
- 5 new DB tables, 24 CRUD functions, 40+ TypeScript interfaces

**Sprint 35 — Settings + Production Readiness**:
- Settings page with 6 sections (Profile, Company, Preferences, Notifications, Billing, Danger Zone)
- Production readiness pass, UI consistency pass

**Sprint 36 — Bug Fix & UI Consistency**:
- Fixed Settings input bug (org name / display name)
- Added PageHeader to all pages (Equipment, Crew, Materials, Projects)
- Fixed map widget → project dashboard routing
- Fixed project deletion
- Full UI consistency audit across all pages
- Navigation integrity verification

**M1 + M2 Core** (Sprints 1-27):
- Auth (signup, login, logout, session persistence, email confirmation)
- 4-step onboarding wizard + first-run experience (setup checklist, sample data, tooltips)
- 10+ pages wired to live Supabase data
- AI smart project creation + AI material suggestions
- Mapbox address geocoding + map widget with status pins
- KPI strip, widget grid (2-column with resize), weekly scheduling
- PDF manifest + crew packet export
- Stripe billing (checkout, portal, webhook stub)
- Multi-tenancy with RLS isolation (75+ policies)
- Light/dark theme with design token system
- v7 layout shell: icon rail, top nav, sub-tabs, dense cards, list view
- Crew app: PIN auth, today's schedule, work order checklist, photo proof, status signals

---

## Supabase Rules (Code must follow these)

- **RLS violations return 0 rows** — no error. Check RLS FIRST when debugging persistence.
- **NEVER use Postgres ENUM types** — always TEXT + CHECK constraints
- **Every fetch function MUST filter by org_id** — even though RLS enforces it
- **Field mapping**: camelCase ↔ snake_case via `toSnakeCase()`/`toCamelCase()`
- **Special mappings**: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- **CHECK constraints**: `area_sqft > 0`, `perimeter_lnft > 0`, `quantity > 0` — send NULL not 0
- **All writes go through** `src/services/supabaseData.ts`

---

## Migrations (supabase/migrations/)

- `001_initial_schema.sql` — full schema, RLS
- `002_stripe_billing.sql` — Stripe columns
- `003_fix_rls_policies.sql` — org + self-membership INSERT
- `004_project_materials_jsonb.sql` — materials JSONB on projects
- `005_scheduling.sql` — schedule_entries + crew_status tables
- `006_fix_enum_mismatch.sql` — Replace all ENUM columns with TEXT + CHECK constraints
- `007_crew_app_auth.sql` — crew_members auth linkage, crew_status extensions, crew RLS policies
- `008_checklist_progress_photos.sql` — crew checklist persistence + photo metadata tables
- `009_org_shortcode.sql` — org shortcode column with auto-generation trigger + crew login RLS
- `010_project_intelligence_core.sql` — Extended projects table (30+ cols), project_tasks, project_site_conditions
- `011_project_intelligence_resources.sql` — project_subcontractors, project_documents, project_permits
- `012_trial_columns.sql` — trial_starts_at, trial_ends_at on organizations + auto-trial trigger

---

## Sprint History (Recent)

| Sprint | Theme | Key Changes |
|--------|-------|-------------|
| 28-29 | M1.5a Data Layer | Migrations 010-011, TypeScript interfaces, CRUD functions |
| 30-31 | M1.5a Wizard UI | 7-step wizard, WizardStepper, route integration |
| 32 | Bridge Sprint | AI integration (task gen, site inference), equipment dropdown, auto-calc costs |
| 33 | M1.5b Dashboard | ProjectDashboard at `/projects/:id` — 5 tabs, KPI cards, task toggling |
| 34 | M1.5b Polish | Materials tab, AI badge fix, inline editing across all tabs |
| 35 | M2/Pre-M3 | Settings page (6 sections), production readiness, PageHeader consistency |
| 36 | Bug Fix & Polish | Settings input fix, PageHeaders on all pages, map routing, deletion fix, UI audit |
| 37 | Landing Page | Marketing landing page, Netlify production config, SPA redirect |
| 38 | Subscription & Billing | Bug fixes (login race, sign-out, onboarding skip), subscription types, billing gate, billing page |
| 39 | Trial Experience | 14-day trial banner, countdown, read-only downgrade on expiry |
| 40 | Launch Readiness | Signup-to-trial messaging, checkout return handling, env var docs, deploy checklist |
| 41 | Hotfix | Onboarding fixes — checklist, duplicate name, skip/exit, sign-out redirect |
| 42 | Sample Data | insertSampleData/clearSampleData implementation, sample tasks, manifest→projects nav fix |
| 43 | Sample Polish | Timestamp fix, materials/equipment/task display, manifest nav, widget scoping, schedule entries |

Full history: Sprints 1-27 in `