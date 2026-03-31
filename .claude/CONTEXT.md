# TerrainForge — Current Project State

> Living document — updated after each sprint. Read for current status.
> For full project knowledge: read `ORCHESTRATOR.md`
> For roadmap and milestones: read `ROADMAP.md`
> For execution workflow: read `CODE_GUIDE.md`
> For M1.5 data model: read `DATA_MODEL_M1.5.md`
> Last updated: 2026-03-30 (Sprint 32 complete — AI wizard integration shipped)

---

## Current Status

**Milestone 1.5b: "Project Intelligence — Project Dashboard"** — STARTING
**Last completed**: Sprint 32 — AI wizard refinements + pilot contractor feedback fixes
**Status**: Wizard is AI-powered and contractor-tested. Project dashboard is next.
**Current sprint**: Sprint 33 — Project dashboard page (M1.5b kickoff)
**Git state**: Clean, main pushed to origin. Migrations 001–011 applied. Storage buckets `crew-photos` and `project-photos` both created.
**SQL migration needed**: None (no new tables for Sprint 33 — dashboard reads existing data)

---

## What's Working (Manager App)

All M1 + M2 + M1.5a features complete:

**M1.5a — Project Intelligence Wizard (Sprints 28-32)**:
- 7-step project creation wizard at `/projects/wizard`
- Step 1: Job Description — name, type, scope, client info, natural language description
- Step 2: Site Intelligence — address (Mapbox), AI-inferred climate zone + soil type + HOA, site conditions, access logistics
- Step 3: Scope & Tasks — AI-generated task breakdown from description, phase-grouped, reorderable, quick-add presets
- Step 4: Resources — crew size, equipment dropdown from org library with duration/daily rate, subcontractor list
- Step 5: Compliance — "No permits required" toggle, 9-item permit checklist with per-permit fees, parking permit, risk notes
- Step 6: Timeline & Budget — auto-calculated labor/equipment/sub costs from earlier steps, permit fees included, margin guidance
- Step 7: Review & Create — full summary with section progress, one-tap creation
- WizardStepper component with visual progress, clickable back-navigation, responsive labels
- "+ New Project" defaults to wizard; old modal preserved as "Quick Create"
- 5 new DB tables: project_tasks, project_site_conditions, project_subcontractors, project_documents, project_permits
- 24 new CRUD functions in supabaseData.ts with full org_id isolation
- 40+ new TypeScript interfaces and union types
- AI integration: task generation from description, site condition inference from address (Claude Haiku)

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

## Sprint History (Sprints 21-32)

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
| 32 | Bridge Sprint | AI wizard integration (task gen, site inference), step reorder, equipment dropdown, auto-calc costs, permit UX |

---

## Pilot Contractor Feedback (Sprint 32)

From testing the wizard with a real contractor:

**What worked well**:
- AI correctly pulled soil type, climate zone, HOA from address
- Timeline & Budget are the best features — contractors love the auto-calculation
- AI task generation is good for the minimal input given

**What needs improvement**:
- AI material quantity estimates need work (e.g., paver sqft calculation was wrong)
- Want materials incorporated into the wizard so costs can be estimated before generating a quote
- Client quote should be auto-estimated based on costs to achieve recommended margin
- Need more project conditions input before auto-generating tasks for accuracy
- Scope & Tasks useful for training new crew, but experienced crews skip it ~50% of the time

**Priority for M1.5b** (shaped by feedback):
1. Budget tab is highest priority — contractor favorite feature
2. Task tracker matters for training and project tracking
3. Materials integration for cost estimation (wizard enhancement, defer to Sprint 34+)

---

## Known Gaps (M1.5a → M1.5b transition)

1. **No project detail page** — Current detail view is inline in Projects.tsx with tabs for zones/materials/crew. No `/projects/:id` route exists. M1.5b needs a full-page project dashboard.
2. **No Zustand stores for M1.5 data** — Tasks, subs, conditions, docs, permits use direct supabaseData calls. Project dashboard needs stores for display/edit workflows.
3. **Document upload UI** — project_documents table + CRUD exist but no file upload component yet.
4. **Settings page** — Still the one remaining M2 item. Deferred to Sprint 35.
5. **AI material estimates** — Quantities need improvement per contractor feedback. Wizard materials integration is a Sprint 34+ candidate.
