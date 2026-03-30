# TerrainForge — Milestone Roadmap

> **Purpose**: Replaces the old Phase 1-4 model. Milestones are outcome-driven with clear gates.
> **Created**: 2026-03-29
> **Owner**: Charlie (Business Systems Analyst II)
> **Last updated**: 2026-03-29

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

**Estimated sprints**: 5-8 (Sprint 15-22)

---

## Milestone 2: "First Impression" — Onboarding & Trial Experience

**Goal**: A contractor who finds TerrainForge online can sign up, understand the product, and see value within 5 minutes — without a demo call.

**What's missing**:
- [ ] **Guided first-run experience** — After onboarding wizard, walk user through creating first project → adding crew → viewing schedule. Not a tutorial modal — contextual prompts on each page.
- [ ] **Empty state redesign** — Every page with zero data should guide toward the next action, not show a blank table.
- [ ] **Sample data toggle** — Let new users explore with pre-loaded demo data before committing their own. One-click "Load sample landscaping company" that populates 3 projects, 8 crew, materials, equipment.
- [ ] **Settings page completion** — Profile, company info, notification preferences (even if notifications aren't wired yet — the settings should exist).
- [ ] **Help & support foundation** — Tooltip system on key features, "?" icons linking to short explanations. Not a help center — just contextual guidance.

**Gate**: A contractor completes signup-to-first-project in under 5 minutes without any external help.

**Estimated sprints**: 2-3 (Sprint 20-22)

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
- [ ] **Time tracking** — Clock in/out per project (crew app). Tied to payroll. Once they track time here, switching cost is very high. Foreman clocks in/out; manager sees labor cost vs. estimate in real-time.
- [ ] **Client portal** — Contractors can share project status with homeowners. Professional look, upsell opportunity.
- [ ] **CSV import/export** — Bulk data operations. Critical for onboarding contractors migrating from spreadsheets.
- [ ] **Invoicing + QuickBooks** — Generate invoices from completed projects. QB Online OAuth integration.
- [ ] **Push notifications** — Schedule changes (manager → crew app), low stock alerts, crew availability updates.
- [ ] **Crew app enhancements** — GPS check-in (verify crew is on-site), equipment checkout/return logging, daily summary reports auto-generated from crew activity.

**Gate**: <5% monthly churn, NPS > 40, at least one tier upgrade (Starter → Pro or Pro → Business).

**Estimated sprints**: 8-12 (ongoing)

---

## Milestone 5: "Scale" — Growth & Differentiation

**Goal**: $15K+ MRR. Product is the market leader for landscaping contractor operations.

**What to build**:
- [ ] **PWA for crew app** — Offline time entries, camera uploads, homescreen install. The crew app becomes a true mobile-first experience. Service worker caches today's schedule + work orders for field use without connectivity.
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
| 26-27 | M2 | Onboarding flow, empty states, settings, help tooltips |
| 28-29 | M3 | Stripe completion, landing page, deploy, outreach |
| 30+ | M4 | Time tracking, client portal, CSV, invoicing, crew app enhancements |

*Sprint numbers are estimates. Actual scope depends on sprint outcomes and user feedback.*

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Restructured from Phase model to Milestone model | Phases were feature-grouped; milestones are outcome-driven with clear business gates |
| 2026-03-29 | Moved scheduling from Phase 2 to Milestone 1 (pre-launch) | Scheduling is the daily-use hook that makes the product indispensable, not a post-launch add-on |
| 2026-03-29 | Added guided onboarding as Milestone 2 | First-run experience is a blocker for self-serve signups; can't scale with demo-only acquisition |
| 2026-03-29 | Crew-facing app added to Milestone 1 | Manager schedules, crew executes — the two sides complete the loop. A scheduling tool without crew visibility is half a product. Same React app, separate route tree (`/crew/*`), shared Supabase backend. |
| 2026-03-29 | Sprint 15/15.5 shipped scheduling | Manager-side scheduling complete. Weekly grid, drag-and-drop, dashboard widget, project integration, Supabase CRUD, conflict detection. 3 pre-existing bugs discovered during regression testing (materials, equipment, work orders). |
| 2026-03-30 | M1 extended: Sprints 21-25 for UI overhaul, nav consolidation, crew auth | App was feature-complete but messy — needed v7 design, simplified nav, real crew auth before demo |
| 2026-03-30 | Navigation consolidated to 5 groups | Dashboard, Jobs, Resources, Manifest, Settings. Reduces 9+ sidebar items to 5 top-level. |
| 2026-03-30 | Crew auth: same app, role-based routing with PIN | Single URL/deploy. /crew/* route tree. PIN login for crew, Supabase auth for managers. |
| 2026-03-30 | M1 complete: Sprints 21-25.6 all shipped | UI overhaul, nav consolidation, crew PIN auth, v7 redesign, widget polish all done. Ready for gate evaluation. |

---

## How This File Gets Updated

After each sprint:
1. Orchestrator marks completed items
2. Updates sprint-to-milestone mapping
3. Adds any new decisions to the decision log
4. Adjusts estimates based on velocity

After each milestone gate review:
1. Charlie evaluates whether the gate criteria are met
2. If not met, Orchestrator identifies remaining gaps and plans additional sprints
3. If met, Orchestrator begins planning the next milestone's first sprint
