# TerrainForge — Current Project State

> Living document — updated after each sprint. Read for current status.
> For full project knowledge: read `ORCHESTRATOR.md`
> For roadmap and milestones: read `ROADMAP.md`
> Last updated: 2026-03-29 (post Sprint 14)

---

## Current Status

**Milestone 1: "Worth the Demo"** — ACTIVE
**Last completed**: Sprint 14 — Project cleanup and file consolidation (merged, build passing)
**Active sprint**: None — planning Sprint 15 (Scheduling module, manager side)
**Planning docs**: `ROADMAP.md` (milestone roadmap), `SPRINT_15_RECOMMENDATION.md` (being revised)

---

## What's Working (Manager App)

All Phase 1 MVP features complete:
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

## What's Not Started Yet (Milestone 1 scope)

- **Scheduling & Calendar** — Manager-side weekly view, crew assignment, drag-drop
- **Crew App** — Separate route tree (`/crew/*`), today's schedule, work order checklist, photo upload, status signals
- **Active project context fix** — Sidebar icon + Work Orders filtering
- **UI polish pass** — v7 design items, material library tab reorder, Debug page removal

---

## File Structure

```
terrainforge/
├── src/                         ← Application code (86 files, ~17K lines)
├── supabase/migrations/         ← 4 SQL migration files
├── .claude/
│   ├── ORCHESTRATOR.md          ← Full knowledge base for Orchestrator sessions
│   ├── ROADMAP.md               ← Milestone-based roadmap (replaces old Phase model)
│   ├── CODE_GUIDE.md            ← Execution guide for Claude Code
│   ├── CONTEXT.md               ← This file (current state)
│   ├── SPRINT_TEMPLATE.md       ← Template for writing new sprint prompts
│   ├── DESIGN_SYSTEM.md         ← Design tokens reference
│   ├── CONSIDERATIONS.md        ← Backlog items tagged by milestone
│   ├── BUSINESS.md              ← Pricing, unit economics, Stripe plan
│   ├── MARKETING.md             ← ICP, channels, demo playbook
│   ├── OPERATIONS.md            ← Phase 2+ module specs
│   ├── AI_PRODUCT.md            ← AI integration strategy
│   ├── TESTING/                 ← QA findings and protocol
│   ├── SQL/                     ← Sprint-specific SQL files
│   ├── design/                  ← Active design preview (v7)
│   └── archive/                 ← Historical sprint prompts, old briefs, old design previews
└── .env.local                   ← Environment secrets (not in git)
```

---

## Key Technical Details

- **Dev server**: `npm run dev` → `localhost:3000` (Vite, port set in vite.config.ts)
- **Git push**: `git push origin HEAD:main` (Netlify watches `main`, NOT `master`)
- **Netlify auto-deploy**: OFF (budget renews 4/19)
- **Supabase**: Multi-tenant with RLS. Admin role passes all checks.
- **Mapbox token**: Set in `.env.local` and Netlify env vars (redacted from source control)

---

## Open Issues (by Milestone)

### Milestone 1 (current)
- Active project sidebar icon doesn't update on selection
- Work Orders page doesn't filter by active project
- Material Library tab order inverted from usage priority
- Debug page exposed in production routing

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
