# TerrainForge — Current Project State

> Living document — updated after each sprint. Read for current status.
> For full project knowledge: read `ORCHESTRATOR.md`
> For roadmap and milestones: read `ROADMAP.md`
> For execution workflow: read `CODE_GUIDE.md`
> For M1.5 data model: read `DATA_MODEL_M1.5.md`
> Last updated: 2026-03-30 (Sprint 31 complete — M1.5a Creation Wizard shipped)

---

## Current Status

**Milestone 1.5a: "Project Intelligence — Creation Wizard"** — COMPLETE
**Last completed**: Sprint 31 — Wizard Steps 4-7 + route integration + Quick Create demotion
**Status**: Full 7-step project creation wizard shipped and tested. All M1.5a data layer and UI work done.
**Current sprint**: None active — batch checkpoint in Cowork
**Pending**: Cowork batch checkpoint → M1.5b planning (project dashboard) or bridge sprint (AI tuning + pilot testing)
**Workflow model**: Two-mode (VSCode Claude Code = planning + execution, Cowork = strategic only)
**Git state**: Clean, main pushed to origin. Migrations 001–011 applied. Storage buckets `crew-photos` and `project-photos` both created.
**SQL migration needed**: None (010 + 011 applied)

---

## What's Working (Manager App)

All M1 + M2 + M1.5a features complete:

**M1.5a — Project Intelligence Wizard (Sprints 28-31)**:
- 7-step project creation wizard at `/projects/wizard`
- Step 1: Job Description — name, type, scope, client info, natural language description
- Step 2: Site Intelligence — address (Mapbox), site conditions, climate/permits, access logistics
- Step 3: Scope & Tasks — task list with phases, hours, reorder, quick-add presets (Basic Hardscape, Full Install, Maintenance)
- Step 4: Resources — crew size, equipment notes, subcontractor list with trade/cost/scope
- Step 5: Timeline & Budget — dates, cost breakdown (labor/materials/equipment/subs), overhead %, client quote, profit/margin calculation with guidance messaging
- Step 6: Compliance — permit status, 8-item permit checklist, risk notes
- Step 7: Review & Create — full summary with section progress, one-tap creation
- WizardStepper component with visual progress, clickable back-navigation, responsive labels
- "+ New Project" defaults to wizard; old modal preserved as "Quick Create"
- 5 new DB tables: project_tasks, project_site_conditions, project_subcontractors, project_documents, project_permits
- 24 new CRUD functions in supabaseData.ts with full org_id isolation
- 40+ new TypeScript interfaces and union types

**M1 + M2 features** (unchanged from Sprint 27):
- Auth (signup, login, logout, session persistence, email confirmation)
- 4-step onboarding wizard
- 10+ pages wired to live Supabase data
- AI smart project creation (natural language → form pre-fill) — original flow, not yet wired to wizard
- AI material suggestions with click-to-add persistence
- Zone creation with DB persistence
- Address autocomplete with Mapbox geocoding + mini-map preview
- Map widget with status-colored pins, hover popups
- KPI strip (inline compact, all selected KPIs shown, mini sparklines)
- Widget grid (2-column with half/full width toggle per widget)
- PDF manifest + crew packet export
- Stripe billing (checkout, portal, webhook stub)
- Multi-tenancy with RLS isolation (55+ policies, now 75+ with M1.5 tables)
- Light/dark theme with design token system
- Responsive tablet-first layout
- v7 layout shell: icon rail, top nav, sub-tabs, dense cards, list view
- Crew app: PIN auth, today's schedule, work order checklist, photo proof, status signals
- First-run experience: setup checklist, sample data, tooltips, welcome banner, billing banners

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

---

## Sprint History (Sprints 21-31)

| Sprint | Theme | Key Changes |
|--------|-------|-------------|
| 21 | Layout Shell | 64px icon rail, TopNav, MobileSidebar, v7 radius tokens |
| 22 | Nav Consolidation | 5 groups with SubTabBar, simplified TopNav dropdown |
| 23 | Crew PIN Auth | PIN login, org shortcode, CrewLogin page, session management |
| 24 | v7 Redesign | Dashboard KPI strip, Projects dense 2-col cards + list view |
| 25/25.5/25.6 | Polish + Demo Prep | Responsive expanded sidebar, merged customize button, widget 2-col, map fixes |
| 26/26.5/26.6 | First-Run Experience | Setup checklist, enhanced empty states, sample data, tooltips |
| 27/27.5/27.6 | Onboarding Polish | KPI sync, welcome banner, billing banners, debug cleanup |
| 28 | M1.5a Data Layer | Migration 010 (projects extension + tasks + site conditions), TypeScript interfaces, CRUD functions |
| 29 | M1.5a Resources | Migration 011 (subcontractors, documents, permits), interfaces, CRUD functions |
| 30 | M1.5a Wizard UI (1-3) | ProjectWizard page, WizardStepper, Steps 1-3 (job description, site, scope/tasks) |
| 31 | M1.5a Wizard UI (4-7) | Steps 4-7 (resources, budget, compliance, review), route integration, Quick Create demotion |

---

## Known Gaps (M1.5a → M1.5b transition)

1. **AI not wired to wizard** — Wizard has hints ("AI will use this...") but AI task generation, site condition inference, and crew recommendations are placeholder-only. Sprint 32 scope.
2. **No Zustand stores for M1.5 data** — Tasks, subs, conditions, docs, permits use direct supabaseData calls. Project dashboard (M1.5b) will need stores for display/edit workflows.
3. **Document upload UI** — project_documents table + CRUD exist but no file upload component in wizard or dashboard yet.
4. **Settings page** — Still the one remaining M2 item. Deferred to Sprint 35.

## Pilot Contractor Feedback (from first demo session)

Sprint 32 must address before M1.5b:
- Equipment step should pull from org library (dropdown), not manual text entry
- Compliance step should come before budget step (permit costs affect estimate)
- "No permits required" needs a quick toggle, not clicking through the checklist
- Add parking permits to permit checklist
- Costs should auto-calculate from project data (crew rates × hours, material costs, equipment daily rates)
- AI should recommend margin improvements
- Contractor wants org-level sub/supplier directory (was M4 — needs decision on timing)
- Needs estimated vs. actual cost tracking during project execution (M1.5b budget tab)
