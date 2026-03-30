# TerrainForge — Current Project State

> Living document — updated after each sprint. Read for current status.
> For full project knowledge: read `ORCHESTRATOR.md`
> Last updated: 2026-03-29

---

## Current Status

**Phase 1 MVP — COMPLETE** (Sprints 1-13.5, all tests passing)

**Last completed**: Sprint 13.5 — Pin hover fix + material persistence fix
**Active sprint**: None
**Next**: UI iteration from v7 design preview, then deploy to production

---

## What's Working

Everything. Full feature list:
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
- Stripe billing (checkout, portal, webhook)
- Multi-tenancy with RLS isolation
- Error visibility (toast notifications on Supabase failures)
- Role diagnostic on login
- Light/dark theme with design token system
- Responsive tablet-first layout

---

## File Structure

```
terrainforge/
├── src/                         ← Application code (87 files, ~17K lines)
├── supabase/migrations/         ← 4 SQL migration files
├── .claude/
│   ├── ORCHESTRATOR.md          ← Full knowledge base for Orchestrator sessions
│   ├── CODE_GUIDE.md            ← Execution guide for Claude Code
│   ├── CONTEXT.md               ← This file (current state)
│   ├── SPRINT_TEMPLATE.md       ← Template for writing new sprint prompts
│   ├── DESIGN_SYSTEM.md         ← Design tokens reference
│   ├── CONSIDERATIONS.md        ← Backlog and Phase 2+ ideas
│   ├── TESTING/                 ← QA findings and protocol
│   ├── SQL/                     ← Sprint-specific SQL files
│   ├── design/                  ← Active design preview files
│   └── archive/                 ← Historical sprint prompts and old briefs
└── .env.local                   ← Environment secrets (not in git)
```

---

## Key Technical Details

- **Dev server**: `npm run dev` → `localhost:3000` (Vite, port set in vite.config.ts)
- **Git push**: `git push origin HEAD:main` (Netlify watches `main`, NOT `master`)
- **Netlify auto-deploy**: OFF (budget renews 4/19)
- **Supabase**: Multi-tenant with RLS. Admin role passes all checks.
- **Mapbox token**: Set in `.env.local` and Netlify env vars

---

## Open Non-Blocking Issues

From CONSIDERATIONS.md:
- Active project sidebar icon doesn't update on selection
- Work Orders page doesn't filter by active project
- Material Library tab order inverted from usage priority
- Multi-supplier support per material (Phase 2)
- CSV import/export (Phase 2)

---

## How to Use This File

New session starting work:
1. Read `ORCHESTRATOR.md` for full knowledge base
2. Read this file for current state
3. Check `.claude/auto-memory/` for preferences
4. You're ready to work
