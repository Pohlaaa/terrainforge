# TerrainForge — Current Project State

> Living document — updated after each sprint. Read for current status.
> For full project knowledge: read `ORCHESTRATOR.md`
> For roadmap and milestones: read `ROADMAP.md`
> Last updated: 2026-03-30 (Sprint 25 complete, M1 gate-ready)

---

## Current Status

**Milestone 1: "Worth the Demo"** — COMPLETE (pending gate evaluation)
**Last completed**: Sprint 25 + hotfixes 25.5/25.6 — All polish items resolved
**Status**: M1 fully built. UI overhaul, nav consolidation, crew PIN auth, v7 redesign, widget polish all shipped.
**Pending**: M1 gate review with a real contractor → then M2 (Onboarding & Trial Experience)
**Workflow model**: Two-mode (VSCode Claude Code = planning + execution, Cowork = strategic only)
**Git state**: Clean, main pushed to origin. Migrations 001–009 applied. Storage bucket `crew-photos` created.
**SQL migration needed**: None (all applied)

---

## What's Working (Manager App)

All Phase 1 MVP features complete:
- Auth (signup, login, logout, session persistence, email confirmation)
- 4-step onboarding wizard
- 10+ pages wired to live Supabase data
- AI smart project creation (natural language → form pre-fill)
- AI material suggestions with click-to-add persistence
- Zone creation with DB persistence (NULL handling for optional fields)
- Address autocomplete with Mapbox geocoding + mini-map preview
- Map widget with status-colored pins, hover popups, and ResizeObserver
- KPI strip (inline compact, all selected KPIs shown, mini sparklines)
- Widget grid (2-column with half/full width toggle per widget)
- PDF manifest + crew packet export
- Stripe billing (checkout, portal, webhook stub)
- Multi-tenancy with RLS isolation (55+ policies)
- Error visibility (toast notifications on Supabase failures)
- Role diagnostic on login
- Light/dark theme with design token system
- Responsive tablet-first layout

**UI Overhaul (Sprints 21-25)**:
- v7 layout shell: 64px icon rail (collapsed) / 220px expanded sidebar with sub-tabs
- 5-group navigation: Dashboard, Jobs (Projects/Schedule/Work Orders), Resources (Crew/Equipment/Materials), Manifest (Engine/Price Research), Settings (Settings/Billing)
- SubTabBar component for grouped page navigation
- TopNav with theme toggle, user dropdown, mobile hamburger
- MobileSidebar with grouped navigation and section headers
- TF logo navigates to Dashboard
- Responsive sidebar: expanded (labels + sub-tabs) on xl+, icon-only on lg, hidden on mobile
- v7 radius tokens (--radius-sm/md/lg/xl) and spring easing
- Dashboard: compact greeting header, inline KPI strip, single "Customize" button
- Projects: dense 2-column cards with accent bars, list view toggle (persisted)
- Widget grid: 2-col layout with half/full width resize toggle

**Crew App (Sprints 17-23)**:
- Crew app at `/crew/*` with separate `CrewLayout` (no sidebar, mobile-first)
- PIN-based crew login: company code → pick name → enter PIN → 8-hour session
- CrewLogin page at `/crew/login`
- Today's schedule dashboard with job cards
- Work order checklist with tap-to-complete steps (persists to Supabase)
- Photo proof of completion (camera upload to Supabase Storage)
- Crew status signals (en route / on site / done) visible on manager schedule
- Manager: Set PIN modal on Crew Manager page, org shortcode display
- "Switch" button in crew layout for changing crew member

**Scheduling (Sprints 15-16)**:
- Weekly schedule page with crew-by-day grid, assignment modal, drag-and-drop
- Today's Schedule dashboard widget
- Schedule entries + crew_status tables with Supabase CRUD
- Conflict detection (double-booked crew)

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

---

## Sprint History (Sprints 21-25)

| Sprint | Theme | Key Changes |
|--------|-------|-------------|
| 21 | Layout Shell | 64px icon rail, TopNav, MobileSidebar, v7 radius tokens |
| 22 | Nav Consolidation | 5 groups with SubTabBar, simplified TopNav dropdown |
| 23 | Crew PIN Auth | PIN login, org shortcode, CrewLogin page, session management |
| 24 | v7 Redesign | Dashboard KPI strip, Projects dense 2-col cards + list view |
| 25 | Polish + Demo Prep | Responsive expanded sidebar, merged customize button, widget 2-col, map fixes |
| 25.5 | Hotfix | KPI strip shows all, widget grid proper 2-col, map hover popups, sidebar sub-tabs |
| 25.6 | Hotfix | KPI compute fixes, map scroll re-enabled, widget size toggle (half/full) |

---

## What's Not Started Yet

- **M1 gate evaluation** — demo to a real contractor
- **M2: Onboarding & Trial** — guided first-run, sample data, settings completion
- **M3: First Revenue** — production deploy, Stripe live mode, landing page, trial flow
- **Debug page removal** from production routing (low priority)

---

## Open Issues

### Milestone 1
- No known blocking bugs. All pre-existing issues fixed.

### Future Milestones
- Multi-supplier support per material (M4)
- CSV import/export (M4)
- Time tracking, client portal (M4)
- PWA for crew app (M5)

---

## Key Technical Details

- **Dev server**: `npm run dev` → `localhost:3000` (Vite)
- **Git push**: `git push origin main` (Netlify watches `main`)
- **Netlify auto-deploy**: OFF (budget renews 4/19)
- **Supabase**: Multi-tenant with RLS. Admin role passes all checks.
- **Zustand stores**: 7 stores with localStorage persistence
- **Layout components**: IconRail, TopNav, SubTabBar, MobileSidebar, AppLayout
- **Nav config**: `src/components/layout/navConfig.ts` (NavGroup structure)
