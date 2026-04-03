# TerrainForge — Milestone Roadmap

> **Purpose**: Replaces the old Phase 1-4 model. Milestones are outcome-driven with clear gates.
> **Created**: 2026-03-29
> **Owner**: Charlie (Business Systems Analyst II)
> **Last updated**: 2026-04-01 (Sprint 44.7 PASS — all hotfixes complete, ready for M3 execution)

---

## Why Milestones, Not Phases

The old phase model assumed "build features → get customers → build more features." That's backwards. A contractor won't pay $99/mo for a project management tool — they have spreadsheets and texts for that. They'll pay for something they open every single morning because their day doesn't start without it.

**The daily-use hook is crew & schedule management.** That means the product isn't launch-ready until a contractor can open TerrainForge at 6am, see today's schedule, know who's going where, and adjust on the fly. Everything else — manifests, AI estimation, project tracking — is supporting infrastructure that makes the scheduling *better* than a whiteboard.

---

## Milestone 1: "Worth the Demo" — Product Completeness

**Goal**: The product has enough daily-use value that a contractor would sit through a 15-minute demo and say "yeah, I need that."

**What's already done**:
- [x] 8 core pages (Dashboard, Projects, Materials, Crew, Equipment, Work Orders, Manifest, Billing)
- [x] AI project creation + material suggestions
- [x] Mapbox address geocoding + map widget
- [x] PDF manifest + crew packet export
- [x] Multi-tenancy + RLS isolation
- [x] Stripe billing (checkout, portal, webhook stub)
- [x] Light/dark theme + design token system

**What's missing (sprint work)**:

### Manager-Side (the main app)
- [x] **Scheduling & Calendar view** — Weekly schedule page, drag-and-drop, dashboard widget, project integration, Supabase CRUD. **DONE Sprint 15/15.5.**
- [x] **Material Library tab reorder** — Inventory first, library last. **DONE Sprint 15.**
- [ ] **Active project context fix** — Sidebar icon + Work Orders filtering by selected project.
- [ ] **Pre-existing bug fixes** — Material add, equipment add, work orders crash with active project (likely RLS).
- [ ] **Remove Debug page** from production routing.
- [ ] **UI polish pass** — v7 design preview items, consistent card styling, transition smoothness.

### Crew App (field-facing companion)
The crew app is a separate, simplified interface for field workers — foremen, installers, laborers. It connects to the same Supabase backend but is built for phones in the sun with dirty hands. The manager schedules; the crew executes.

- [ ] **Crew login** — Simplified auth (invite link or PIN, not full email/password signup). Crew members are created by the manager in the main app, then receive access.
- [ ] **Today's Schedule view** — "Here's your job today: [project name], [address], [crew members], [equipment]." One screen, glanceable.
- [ ] **Work order checklist** — Step-by-step task list for the day's zone. Tap to mark steps complete. Progress syncs back to the manager's dashboard in real-time.
- [ ] **Photo proof of completion** — Camera upload per checklist step or per zone. Stored in Supabase Storage, visible to the manager.
- [ ] **Basic crew communication** — Status updates: "On site", "Break", "Done for the day." Visible on the manager's schedule view. Not a chat app — just status signals.

**Architecture decision**: The crew app should be a separate route tree within the same React app (e.g., `/crew/*`), not a separate repo. Shares Supabase client, types, and services. Uses a `CrewLayout` component instead of `AppLayout`. RLS policies scope crew members to see only their org's data and only their assigned projects.

**Gate**: A 15-minute demo to a real contractor results in "how do I sign up?" not "what else does it do?" The demo includes showing the manager view AND the crew view side-by-side.

**Status**: **COMPLETE** (Sprints 15-25)

---

## Milestone 2: "First Impression" — Onboarding & Trial Experience

**Goal**: A contractor who finds TerrainForge online can sign up, understand the product, and see value within 5 minutes — without a demo call.

**What's done**:
- [x] **Setup checklist** — 5-step progress tracker on Dashboard, auto-dismiss for existing users. **DONE Sprint 26.**
- [x] **Enhanced empty states** — Action-oriented copy on 6 pages. **DONE Sprint 26.**
- [x] **Sample data loader** — "Load Sample Company" inserts 3 projects, 6 crew, 5 equipment, 8 materials. **DONE Sprint 26.**
- [x] **Tooltip system** — HelpIcon component with contextual help on 5 key pages. **DONE Sprint 26.**
- [x] **Onboarding KPI sync** — Wizard selections map to Dashboard KPIs. **DONE Sprint 27.**
- [x] **Welcome banner** — First-time user banner, auto-hides after 3 visits. **DONE Sprint 27.**
- [x] **Billing banners** — Trial/past-due banners in AppLayout. **DONE Sprint 27.**

**Gate**: A contractor completes signup-to-first-project in under 5 minutes without any external help.

**Status**: **COMPLETE** (Sprints 26-27, Settings page completed in Sprint 35, bug fixes in Sprint 36).

---

## Milestone 1.5a: "Project Intelligence — Creation Wizard"

**Goal**: A contractor describes a job and gets a fully structured project — tasks, materials, crew, equipment, timeline, budget — in under 5 minutes. AI does the heavy lifting; the contractor refines.

**Why this exists**: M1 proved the platform works. M2 proved onboarding works. But the *project creation experience* is still a basic form with some AI pre-fill. Projects are the core of everything a contractor does in TerrainForge. Making project creation intelligent and comprehensive is what turns "cool tool" into "I need this." This is also the demo moment that sells the product.

**Design principles**:
- **Guided wizard, not a giant form** — 7 steps that follow the natural dependency chain of how contractors plan jobs
- **AI generates, contractor owns** — AI produces a smart starting point at each step. Once the contractor edits, the AI doesn't override. No cascading recalculation surprises.
- **Progressive disclosure** — Each step reveals only what's relevant given what came before
- **Non-destructive** — Existing project creation still works. The wizard is an enhanced path, not a replacement that breaks things.

**Step 1: Describe the Job** (identity)
- Name, client info (name, phone, email, property type), description (natural language), project type (full install / renovation / hardscape / softscape / drainage / irrigation / maintenance), scope size (small/medium/large/commercial)
- AI processes description immediately, infers project type and scope if not specified

**Step 2: Site Intelligence** (location + conditions)
- Address autocomplete (existing Mapbox integration)
- AI infers: climate zone, typical soil type, municipal permit zone, HOA likelihood
- Contractor adds: slope/grade, existing vegetation, sun exposure, drainage patterns
- Access & logistics: gate codes, parking restrictions, permitted hours, utility locations, HOA rules
- Site photo upload (Supabase Storage — new `project-photos` bucket, separate from `crew-photos`)

**Step 3: Scope & Tasks** (AI-generated work breakdown)
- AI generates zones from description ("front yard hardscape", "backyard patio", "side drainage")
- AI generates tasks with dependencies, grouped into phases: Demo/Prep → Rough Grade → Hardscape → Softscape → Lighting/Irrigation → Cleanup/Punchlist
- Contractor reorders, adds, removes tasks. Edits phase assignments.
- Task dependencies visualized (task A must finish before task B starts)

**Step 4: Resources** (crew, materials, equipment, subs)
- AI recommends crew size and required skills based on tasks
- AI generates material list from zones + tasks (manifest engine runs automatically)
- AI suggests equipment with duration estimates ("skid steer, 3 days during grading phase")
- Subcontractor fields: name, trade, scope, scheduled dates
- Contractor assigns specific people, adjusts quantities

**Step 5: Timeline & Budget** (AI estimates, contractor adjusts)
- Start date / target completion
- AI proposes timeline based on scope + crew size + task dependencies
- Budget breakdown: labor (crew hours x rates), materials (from manifest), equipment rental, subcontractor costs, overhead/markup percentage
- Client quote field with margin calculation (quote - cost = profit)

**Step 6: Compliance** (permits, inspections, risk)
- AI generates permit checklist based on location + scope
- Inspection milestone fields tied to permit requirements
- Risk notes (freeform) — "underground utilities unmarked", "client particular about property line"

**Step 7: Review & Create**
- Full summary of everything. One tap to create.
- Project becomes a living entity with all data populated.

**Data model** (full schema in DATA_MODEL_M1.5.md — design upfront, build incrementally):
- New tables: `project_tasks`, `project_subcontractors`, `project_documents`, `project_site_conditions`
- Extended tables: `projects` (client fields, budget fields, project type, scope size, compliance notes)
- New Supabase Storage bucket: `project-photos`
- All new tables follow existing patterns: org_id, RLS, TEXT + CHECK (no ENUMs)

**Gate**: Contractor describes a job → full project plan with tasks, materials, crew, and preliminary schedule in under 5 minutes. Pilot contractor confirms: "this saves me real time."

**Status**: **COMPLETE** (Sprints 28-31). Full wizard shipped. AI integration and pilot testing deferred to Sprint 32 bridge sprint.

**What shipped**: 2 migrations (010-011), 5 new tables, 30+ new project columns, 24 CRUD functions, 9 wizard components, ProjectWizard page, route integration. "+ New Project" defaults to wizard; old modal preserved as Quick Create.

**What's deferred to Sprint 32**: AI task generation from description, AI site condition inference from location, AI crew/equipment recommendations. Pilot contractor outreach.

---

## Milestone 1.5b: "Project Intelligence — Project Dashboard"

**Goal**: A contractor can manage an active project entirely from the project detail view. Each project is its own command center.

**Why split from 1.5a**: The creation wizard (1.5a) ships first and gets tested with pilot contractors. Their feedback shapes which dashboard sections matter most. This prevents building a 12-panel dashboard when contractors only use 4 of them.

**Project detail view sections**:
- **Header**: Name, client, status phase, address with map pin, overall progress %
- **Schedule**: This project's schedule entries for the current week, who's assigned where
- **Task tracker**: Phase-grouped task list with completion status (linked to crew app checklist)
- **Resources**: Assigned crew, material status (ordered/on-site/used), equipment with date ranges
- **Budget**: Quote vs actual cost, visual on-budget/over-budget indicator, margin
- **Activity feed**: Recent photo uploads, status changes, task completions — chronological timeline
- **Documents**: Site photos, permits, contracts, manifests — uploaded files with preview
- **Compliance**: Permit status, inspection dates, risk notes

**Design approach**:
- Tabbed or scrollable sections (not all visible at once — that's overwhelming)
- Consistent with existing v7 design system (card-based, dark theme, 44px touch targets)
- Detail panel may need to become a full page rather than a slide-in panel — TBD based on information density

**Gate**: Contractor can manage an active project entirely from the project view without navigating to other pages. Pilot contractor confirms: "I can see everything I need about this job."

**Estimated sprints**: 2-3 (Sprint 32-34)

**Pilot testing**: Begin informal pilot contractor conversations during M1.5a development. Show current app state. Gather feedback that shapes M1.5b priorities.

---

## Milestone 3: "First Revenue" — Launch & Validation

**Goal**: 5 paying customers. Real contractors using the product weekly and paying for it.

**What's missing**:
- [ ] **Production deploy** — Netlify with production env vars, Stripe live mode.
- [ ] **Stripe webhook completion** — Handle subscription lifecycle events (created, cancelled, payment_failed, trial_ending).
- [ ] **Trial flow** — 14-day free trial, Day 7 usage nudge, Day 13 conversion prompt, Day 14 read-only downgrade.
- [ ] **Landing page** — Simple single-page marketing site. Value prop, screenshots, pricing, CTA.
- [ ] **Customer outreach execution** — LinkedIn, Facebook groups, Reddit per MARKETING.md playbook.
- [ ] **Feedback collection** — In-app mechanism to report issues or request features.
- [ ] **Analytics foundation** — Basic usage tracking (which pages, which features, session length). PostHog or similar.

**Gate**: 5 paying subscriptions, $400+ MRR, at least 2 weekly-active users.

**Estimated timeline**: 4-8 weeks after Milestone 2 (depends on sales cycle)

---

## Milestone 4: "Sticky" — Retention & Expansion

**Goal**: Monthly churn <5%. Users would feel pain if they had to switch away.

**What to build (prioritized by retention impact)**:

### Time Tracking (highest retention driver)
- [ ] Foreman clock-in/clock-out per project zone
- [ ] Manual time entry for back-fill or correction
- [ ] Time summary per project: total hours worked vs. estimated
- [ ] Labor cost tracking: hours x hourly rate → actual labor cost per project
- [ ] Export time records as CSV for payroll processing
- **DB**: `time_entries` table (id, org_id, project_id, zone_id, crew_member_id, clock_in, clock_out, notes, approved_by). New `hourly_rate` field on `crew_members`.

### Client Portal
- [ ] Invite a client to view a specific project (email invite → limited-access login)
- [ ] Client sees: project timeline, manifest summary (no internal costs), photo uploads
- [ ] Client can approve a manifest/proposal (triggers status change)
- [ ] Contractor can send a PDF summary directly from the portal
- **Architecture**: Uses existing `org_role = 'client'` in auth + RLS. Route: `/portal/:projectId`. Separate layout without sidebar.

### Invoicing + QuickBooks
- [ ] Generate invoice from completed project (materials + labor cost summary)
- [ ] Send invoice via email (PDF attachment)
- [ ] Mark invoices as paid/outstanding, invoice status dashboard
- [ ] QuickBooks Online OAuth integration — push invoice line items to QBO
- **DB**: `invoices` table + `invoice_line_items` table. Keep Stripe for subscription billing; QBO is for client invoicing.

### Additional M4 Items
- [ ] **CSV import/export** — Bulk data operations. Critical for onboarding contractors migrating from spreadsheets.
- [ ] **Push notifications** — Schedule changes (manager → crew app), low stock alerts, crew availability updates.
- [ ] **Crew app enhancements** — GPS check-in (verify crew is on-site), equipment checkout/return logging, daily summary reports auto-generated from crew activity.

**Gate**: <5% monthly churn, NPS > 40, at least one tier upgrade (Starter → Pro or Pro → Business).

**Estimated sprints**: 8-12 (ongoing)

---

## Milestone 5: "Scale" — Growth & Differentiation

**Goal**: $15K+ MRR. Product is the market leader for landscaping contractor operations.

**What to build**:
- [ ] **PWA for crew app** — Offline time entries, camera uploads, homescreen install. Service worker caches today's schedule + work orders for field use without connectivity. Implementation: `manifest.json` + service worker via `vite-plugin-pwa`. Mobile layouts: sidebar hidden on <768px, bottom navigation instead. No separate native app — PWA gets 80% of value at 10% of effort.
- [ ] **3D Design Studio** — AI-driven landscape design tool. The "wow" feature that separates TerrainForge from every competitor.
- [ ] **Marketplace** — Supplier directory, equipment rental partners, subcontractor network.
- [ ] **Multi-language (Spanish)** — Critical for landscaping workforce demographics. Crew app is the highest priority for translation — field workers may be Spanish-primary.
- [ ] **Advanced AI** — Manifest review (flag missing materials), auto-scheduling suggestions, cost prediction.

**Gate**: $15K MRR, 20+ active organizations, 90% weekly retention.

---

## Sprint-to-Milestone Mapping

| Sprint | Milestone | Theme |
|--------|-----------|-------|
| 14 | Cleanup | File consolidation, orphaned code removal (**COMPLETE**) |
| 15/15.5 | M1 | Scheduling module (manager side) + hotfix (**COMPLETE**) |
| 16/16.5 | M1 | Bug fixes, ENUM→TEXT migration, scheduling enhancements (**COMPLETE**) |
| 17-18 | M1 | Crew app — route tree, schedule, checklist, photo proof, status signals (**COMPLETE**) |
| 19-20 | M1 | UI polish, demo readiness, manager-crew integration (**COMPLETE**) |
| 21 | M1 | Layout shell — icon rail + top nav bar (**COMPLETE**) |
| 22 | M1 | Navigation consolidation — 5 groups with sub-tabs (**COMPLETE**) |
| 23 | M1 | Crew PIN auth — PIN login, org shortcode (**COMPLETE**) |
| 24 | M1 | Dashboard + Projects v7 redesign — KPI strip, dense cards, list view (**COMPLETE**) |
| 25/25.5/25.6 | M1 | Polish + demo prep — sidebar, widgets, map, KPI fixes (**COMPLETE**) |
| 26/26.5/26.6 | M2 | First-run experience — setup checklist, empty states, sample data, tooltips (**COMPLETE**) |
| 27/27.5/27.6 | M2 | Onboarding polish — KPI sync, welcome banner, billing banners, debug cleanup (**COMPLETE**) |
| 28 | M1.5a | Data layer — migration 010 (projects ext + tasks + site conditions), TypeScript interfaces, CRUD (**COMPLETE**) |
| 29 | M1.5a | Data layer — migration 011 (subcontractors, documents, permits), interfaces, CRUD (**COMPLETE**) |
| 30 | M1.5a | Wizard UI Steps 1-3 — ProjectWizard page, WizardStepper, job desc, site intel, scope/tasks (**COMPLETE**) |
| 31 | M1.5a | Wizard UI Steps 4-7 — resources, budget, compliance, review + route integration + Quick Create demotion (**COMPLETE**) |
| 32 | Bridge | AI wizard integration (task gen, site inference), step reorder, equipment dropdown, auto-calc costs, permit UX (**COMPLETE**) |
| 33 | M1.5b | Project dashboard — `/projects/:id` with Overview, Tasks, Budget, Resources, Compliance tabs (**COMPLETE**) |
| 34 | M1.5b | Materials tab, AI badge fix, inline budget editing, dashboard edit capabilities (**COMPLETE**) |
| 35 | M2/Pre-M3 | Settings page (last M2 item), production readiness, UI consistency (**COMPLETE**) |
| 36 | Bug Fix | Settings input fix, PageHeaders, map routing, project deletion, UI audit (**COMPLETE**) |
| 37 | M3 | Landing page + Netlify production deploy (**COMPLETE**) |
| 38-40 | M3 | Subscription enforcement, trial experience, launch readiness (batch) (**COMPLETE**) |
| 41 | Hotfix | Onboarding fixes — checklist, duplicate name, skip, sign-out redirect (**COMPLETE**) |
| 42 | Hotfix | Sample data implementation + manifest routing fix (**COMPLETE**) |
| 43 | Hotfix | Sample data quality — timestamp fix, zone_materials, task counts PASSED; resources/schedule/nav/widgets/clear FAILED |
| 44 | Hotfix | Resources tab, schedule entries, clearSampleData fixed (**COMPLETE**) |
| 44.5 | Hotfix | Manifest back nav fixed (**COMPLETE**) |
| 44.6-44.7 | Hotfix | Widget layout persistence — removed Supabase sync, localStorage only (**COMPLETE**) |
| 45 | M3 | Landing page visual upgrade — hero gradient, SVG icons, social proof, scroll animations, pricing polish |
| 46+ | M3/M4 | Netlify production deploy, customer outreach, time tracking, client portal |

*Sprint numbers are estimates. Actual scope depends on sprint outcomes and user feedback.*

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Restructured from Phase model to Milestone model | Phases were feature-grouped; milestones are outcome-driven with clear business gates |
| 2026-03-29 | Moved scheduling from Phase 2 to Milestone 1 (pre-launch) | Scheduling is the daily-use hook that makes the product indispensable, not a post-launch add-on |
| 2026-03-29 | Added guided onboarding as Milestone 2 | First-run experience is a blocker for self-serve signups; can't scale with demo-only acquisition |
| 2026-03-29 | Crew-facing app added to Milestone 1 | Manager schedules, crew executes — the two sides complete the loop. A scheduling tool without crew visibility is half a product. Same React app, separate route tree (`/crew/*`), shared Supabase backend. |
| 2026-03-30 | M1.5a complete — added Sprint 32 bridge sprint for AI + pilot testing | AI wizard integration and pilot testing were planned for Sprint 31 but wizard UI consumed the full sprint. Adding a bridge sprint keeps M1.5b focused on dashboard, not catching up on AI plumbing. |
| 2026-03-30 | Pilot contractor feedback shapes M1.5b tab priority: Budget #1, Tasks #2, Materials integration deferred to S34 | Budget auto-calculation is the contractor's favorite feature. Tasks useful for training but skipped by experienced crews ~50% of the time. Material quantity AI needs prompt tuning before wizard integration. |
| 2026-03-30 | Inserted M1.5a/b between M2 and M3 | Project creation experience is the core value differentiator. Rushing to M3 (revenue) with a basic project form would undermine the product's "I need this" moment. |
| 2026-03-30 | Split M1.5 into a (wizard) and b (dashboard) | Prevents scope gravity. Ship wizard first, pilot test it, let feedback shape which dashboard sections matter most before building all 8. |
| 2026-03-30 | Design data model upfront for all of M1.5 | Full schema in DATA_MODEL_M1.5.md. Avoids migration churn from discovering missing columns mid-sprint. Build incrementally but design holistically. |
| 2026-03-30 | Added `project_permits` table (not in original spec) | Permits have lifecycle state (applied → approved → inspected) that `project_documents` can't model. Landscaping permits are common enough to warrant a dedicated table. |
| 2026-03-30 | Deferred Settings page to Sprint 35 | Settings is the last M2 item but doesn't block M1.5 work. Bundling it with M3 prep avoids breaking M1.5 focus. |
| 2026-03-29 | Sprint 15/15.5 shipp