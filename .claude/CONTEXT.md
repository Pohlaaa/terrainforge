# TerrainForge — Current Project State

> Living document — updated after each sprint. Read for current status.
> For full project knowledge: read `ORCHESTRATOR.md`
> For roadmap and milestones: read `ROADMAP.md`
> Last updated: 2026-03-29 (post Sprint 15.5)

---

## Current Status

**Milestone 1: "Worth the Demo"** — ACTIVE
**Last completed**: Sprint 15.5 — Scheduling module (manager side) + hotfix (merged, build passing, tested PASS)
**Active sprint**: None — planning Sprint 16
**Git state**: Main at `c9c1d07` + Sprint 15.5 merge, fully pushed to origin/main. Untracked .claude/ docs pending commit.

---

## What's Working (Manager App)

All Phase 1 MVP features complete, PLUS:
- Auth (signup, login, logout, session persistence, email confirmation)
- 4-step onboarding wizard
- 8 pages wired to live Supabase data (Dashboard, Projects, Materials, Crew, Equipment, Work Orders, Manifest, Billing)
- AI smart project creation (natural language → form pre-fill)
- AI material suggestions with click-to-add persistence
- Zone creation with DB persistence (NULL handling for optional fields)
- Address autocomplete with Mapbox geocoding + mini-map preview
- Map widget with status-colored pins and popups
- KPI customization drawer (pick 6 from 12 metrics)
- Drag-and-drop widget grid with layout persistence
- PDF manifest + crew packet export
- Stripe billing (checkout, portal, webhook stub)
- Multi-tenancy with RLS isolation
- Error visibility (toast notifications on Supabase failures)
- Role diagnostic on login
- Light/dark theme with design token system
- Responsive tablet-first layout

**NEW in Sprint 15/15.5**:
- Weekly schedule page with crew-by-day grid, assignment modal, HTML5 drag-and-drop
- Today's Schedule dashboard widget (with localStorage migration for existing users)
- Upcoming Schedule section on project detail panel
- Schedule nav link in sidebar
- Conflict detection (gold "!" indicator for double-booked crew)
- Add entries to occupied cells (click any cell to assign)
- Material Library tabs reordered: Inventory → Suppliers → Library
- Supabase CRUD for schedule_entries + crew_status tables (migration 005)

## What's Not Started Yet (Milestone 1 scope)

- **Crew App** — Separate route tree (`/crew/*`), today's schedule, work order checklist, photo upload, status signals
- **UI polish pass** — v7 design items, consistent card styling, transition smoothness

## Known Pre-Existing Bugs (found during Sprint 15 testing)

These are NOT Sprint 15 regressions — they existed before and were surfaced during regression testing:
- **Material Library** — Adding materials fails with in-app load error warning
- **Equipment Manager** — Adding equipment fails with in-app load error warning
- **Work Orders** — Page fails when an active project is selected; works fine without one
- All three likely caused by Supabase RLS policy issues or missing data — needs diagnosis

---

## File Structure

```
terrainforge/
├── src/                         ← Application code (90+ files, ~18K lines)
├── supabase/migrations/         ← 5 SQL migration files (001-005)
├── .claude/
│   ├── ORCHESTRATOR.md          ← Full knowledge base for Orchestrator sessions
│   ├── ROADMAP.md               ← Milestone-based roadmap
│   ├── EXECUTION.md             ← Sprint lifecycle, workflow, testing protocol
│   ├── CODE_GUIDE.md            ← Execution guide for Claude Code
│   ├── CONTEXT.md               ← This file (current state)
│   ├── SPRINT_TEMPLATE.md       ← Template for writing new sprint prompts
│   ├── SPRINT_15_PROMPTS.md     ← Sprint 15 tasks (completed)
│   ├── SPRINT_15_5_HOTFIX.md    ← Sprint 15.5 hotfix (completed)
│   ├── DESIGN_SYSTEM.md         ← Design tokens reference
│   ├── CONSIDERATIONS.md        ← Backlog items tagged by milestone
│   ├── BUSINESS.md              ← Pricing, unit economics, Stripe plan
│   ├── MARKETING.md             ← ICP, channels, demo playbook
│   ├── OPERATIONS.md            ← Module specs
│   ├── AI_PRODUCT.md            ← AI integration strategy
│   ├── TESTING/                 ← QA findings, protocol, sprint test results
│   ├── SQL/                     ← Sprint-specific SQL files
│   ├── design/                  ← Active design preview (v7)
│   └── archive/                 ← Historical sprint prompts, old briefs, old design previews
└── .env.local                   ← Environment secrets (not in git)
```

---

## Key Technical Details

- **Dev server**: `npm run dev` → `localhost:5173` (Vite default port)
- **Git push**: `git push origin main` (Netlify watches `main`, NOT `master`)
- **Netlify auto-deploy**: OFF (budget renews 4/19)
- **Supabase**: Multi-tenant with RLS. Admin role passes all checks.
- **Mapbox token**: Set in `.env.local` and Netlify env vars (redacted from source control)
- **Zustand stores**: 7 stores (project, material, equipment, crew, org, ui, schedule) with localStorage persistence

---

## Open Issues (by Milestone)

### Milestone 1 (current)
- Material Library: adding materials fails (pre-existing, likely RLS)
- Equipment Manager: adding equipment fails (pre-existing, likely RLS)
- Work Orders: page fails with active project selected (pre-existing, likely RLS)
- Sidebar icons show colored dots not emojis (by design, not a bug)

### Milestone 4+
- Multi-supplier support per material
- CSV import/export

---

## How to Use This File

New session starting work:
1. Read `ORCHESTRATOR.md` for full knowledge base
2. Read `ROADMAP.md` for milestone plan and current milestone
3. Read this file for current sprint state
4. Check `.claude/auto-memory/` for preferences
5. You're ready to work
