# TerrainForge — Orchestrator Knowledge Base

> **What this file is**: The complete knowledge base for the Orchestrator session. Any new Cowork session that reads this file can immediately take over project coordination. This is the single source of truth for how we work.
>
> **Last updated**: 2026-03-29 (post Sprint 13.5)

---

## 1. Project Overview

**TerrainForge** is a SaaS platform for landscaping contractors. It covers project management, material inventory, crew/equipment tracking, manifest generation, work orders, and AI-assisted project creation.

**Owner**: Charlie (Business Systems Analyst II — builds tools that make work more efficient)
**Repo**: github.com/Pohlaaa/terrainforge
**Live site**: terrainforge-staging.netlify.app
**Netlify site ID**: `d8efdf00-91f7-4717-aabd-d1c65372a634`
**Netlify team**: `woodsrider82`

### Phase Roadmap

| Phase | Goal | Gate | Status |
|-------|------|------|--------|
| Phase 1 | MVP — full contractor workflow | All 8 pages live, billing, multi-tenant | **COMPLETE** |
| Phase 2 | Operations & Integrations | 5+ paying customers | Next |
| Phase 3 | 3D Design Studio | 20+ customers, 90% retention | Future |
| Phase 4 | Scale & Marketplace | $15K+ MRR stable | Future |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| State | Zustand (6 stores) + Supabase sync |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL, 15 tables, 55+ RLS policies |
| Styling | Tailwind CSS + CSS custom properties |
| Billing | Stripe (checkout, portal, webhook via Netlify Edge Functions) |
| AI | Anthropic Claude API (price research + smart project creation) |
| Maps | Mapbox GL JS (geocoding + map display) |
| PDF | @react-pdf/renderer |
| Deploy | Netlify (auto-deploy OFF — manual deploy only) |

---

## 2. Session Model

Three active sessions, each with a distinct role:

### Orchestrator (Cowork — you)
- Sprint planning and coordination
- Writes sprint prompt files (`.claude/SPRINT_[N]_PROMPTS.md`)
- Writes SQL migrations for Charlie to run
- Tracks project state and priorities
- Reads Code transcripts to monitor progress
- Uses auto-memory for cross-session continuity

### UI Design (Cowork)
- Produces HTML design previews (`design-preview-vN.html`)
- Defines visual specs: colors, spacing, animations, interactions
- Has folder access — can read `.claude/` files and the codebase
- **Does NOT write application code** — delivers specs for sprint prompts
- Latest preview: `.claude/design/design-preview-v7-tablet-density.html`

### Claude Code (autonomous execution)
- Writes ALL application code (React, Zustand, CSS, services)
- Runs from `SPRINT_[N]_PROMPTS.md` + `CODE_GUIDE.md`
- Per-task cycle: implement → build → commit → next task
- Creates PRs via `gh` CLI
- The ONLY entity that touches files in `src/`

### Charlie's role in the loop
- Merges PRs in PowerShell: `git merge <branch>`
- Runs SQL migrations in Supabase SQL Editor
- Tests locally: `npm run dev` → `localhost:3000`
- Deploys to prod: `git push origin HEAD:main`
- Reports test results back to Orchestrator

---

## 3. Development Workflow

### Sprint Lifecycle

```
1. Plan    → Orchestrator writes SPRINT_[N]_PROMPTS.md
2. Design  → UI Design delivers preview HTML (if visual sprint)
3. Execute → Charlie pastes kickoff into Code
4. Build   → Code creates branch, implements, commits, opens PR
5. Merge   → Charlie: git merge <branch-name>
6. Test    → Charlie: npm run dev → localhost:3000
7. Fix     → If issues: Orchestrator writes hotfix prompt, repeat 3-6
8. Deploy  → Charlie: git push origin HEAD:main (when ready)
```

### Sprint Prompt Quality Bar

Each task in a sprint prompt MUST include:
1. **Goal** — one sentence
2. **Files to create/modify** — explicit paths
3. **Design reference** — which preview file and section (if visual)
4. **Implementation details** — specific enough that Code makes zero design decisions
5. **Supabase considerations** — table names, RLS policies, CHECK constraints
6. **Acceptance criteria** — testable by `npm run build`

Template: `.claude/SPRINT_TEMPLATE.md`

### Git Conventions
- Push to prod: `git push origin HEAD:main` (Netlify watches `main`)
- GitHub has BOTH `main` and `master` — always use `main`
- Sprint branches: `sprint-N-description`
- PR creation in Code: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main`
- One commit per task: `S[sprint]-[task]: [description]`

### Deploy Rules
- Auto-deploy is **OFF** on Netlify (build minute budget renews 4/19)
- ALWAYS test locally first: `npm run dev` → `localhost:3000` (free, costs zero build minutes)
- Deploy only when local testing passes
- Batch deploys — merge everything, test once, deploy once

---

## 4. Supabase — The Rules

These were learned through painful silent failures across Sprints 5-13:

### RLS Policy Model
- `user_has_role(org_id, role)` returns true for the specified role OR `admin`
- Admin role bypasses all role checks
- Projects: requires `designer` or `admin`
- Zones, zone_materials, crew: requires `foreman` or `admin`
- Materials library: requires `designer` or `admin`

### Silent Failure Patterns
- **RLS violations return 0 rows** — no error thrown, no exception. You just get empty data back.
- **CHECK constraint violations** on INSERT return an error object, but our catch blocks previously swallowed them. Sprint 13 added toast notifications.
- When debugging persistence: check RLS policies FIRST, then CHECK constraints, then column mappings.

### Field Mapping (supabaseData.ts)
- Frontend uses camelCase, Supabase uses snake_case
- `toSnakeCase()` / `toCamelCase()` handle conversion
- Special mappings: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- `client` field is stripped before INSERT (DB expects `client_id` UUID FK, unused)
- Checklist stored as JSONB
- Materials stored as JSONB on projects table (added Sprint 13, migration 004)

### CHECK Constraints to Remember
- `zones.area_sqft CHECK (area_sqft > 0)` — send NULL not 0
- `zones.perimeter_lnft CHECK (perimeter_lnft > 0)` — send NULL not 0
- `zone_materials.quantity CHECK (quantity > 0)`

### Migrations
Run manually in Supabase SQL Editor. Files in `supabase/migrations/`:
- `001_initial_schema.sql` — full schema, enums, RLS
- `002_stripe_billing.sql` — Stripe columns
- `003_fix_rls_policies.sql` — org INSERT + self-membership INSERT
- `004_project_materials_jsonb.sql` — materials JSONB on projects

---

## 5. Codebase Architecture

### Source Structure (87 files, ~17K lines)
```
src/
├── pages/          13 files, 5,882 LOC  (route components)
├── components/     25 files, 3,018 LOC  (dashboard, layout, pdf, shared, ui)
├── stores/          6 files, 1,823 LOC  (Zustand: project, material, equipment, crew, org, ui)
├── services/        5 files, 1,332 LOC  (supabaseData, supabase, anthropic, stripe, preferences)
├── lib/             9 files, 1,127 LOC  (business logic, KPI definitions, alerts)
├── hooks/           7 files,   597 LOC  (useMapbox, useAddressAutocomplete, useBillingGate, etc.)
├── types/           2 files,   504 LOC  (TypeScript interfaces)
├── utils/           2 files,   ~90 LOC  (validation, dates)
└── contexts/        1 file,    150 LOC  (AuthContext)
```

### Key Files to Know
- `supabaseData.ts` (774 LOC) — ALL Supabase CRUD. Every write goes through here.
- `projectStore.ts` (404 LOC) — Project state, addProject returns project ID
- `Projects.tsx` (1,358 LOC) — Largest page, handles project CRUD + zone builder + AI creation
- `useMapbox.ts` (215 LOC) — Map initialization + marker rendering
- `AuthContext.tsx` (150 LOC) — Auth state + role diagnostic on login

### Code Conventions
- No `any` types — use `src/types/index.ts` interfaces
- Colors via CSS custom properties: `var(--brand-primary)`, `var(--surface-card)`
- Business logic in `src/lib/`, never in components
- Supabase writes only through `supabaseData.ts`, always include `org_id`
- Imports use `@/` alias, never relative paths

---

## 6. Environment Variables

| Variable | Required | Used In |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | supabase.ts |
| `VITE_SUPABASE_ANON_KEY` | Yes | supabase.ts |
| `VITE_STRIPE_PK` | Yes | stripe.ts |
| `VITE_STRIPE_PRICE_STARTER` | Yes | Billing.tsx |
| `VITE_STRIPE_PRICE_PRO` | Yes | Billing.tsx |
| `VITE_STRIPE_PRICE_BUSINESS` | Yes | Billing.tsx |
| `VITE_ANTHROPIC_API_KEY` | Optional | anthropic.ts |
| `VITE_MAPBOX_TOKEN` | Optional | useMapbox.ts, AddressInput.tsx |

Set in `.env.local` (local) and Netlify dashboard (prod).
Mapbox token: set in `.env.local` (local) and Netlify dashboard (prod) — do not commit

---

## 7. Writing Sprint Prompts

### What Makes a Good Sprint Prompt

The sprint prompt is the most important file in the project. When written well, Charlie pastes ONE kickoff line and Code executes the entire sprint with zero follow-up.

**The test**: Could a developer with zero project context read this prompt file and build exactly what we want? If yes, Code will one-shot it.

### Checklist for Every Task
- [ ] Explicit file paths (not "update the store" — say `src/stores/projectStore.ts`)
- [ ] Component names and prop interfaces
- [ ] CSS token references from DESIGN_SYSTEM.md
- [ ] Supabase table/column names and RLS requirements
- [ ] Design preview reference (file + section) for visual tasks
- [ ] Acceptance criteria testable by `npm run build`
- [ ] Dependencies between tasks noted

### Kickoff Prompt for Code
```
Read .claude/CODE_GUIDE.md and .claude/SPRINT_[N]_PROMPTS.md, then execute all tasks autonomously. Branch: sprint-[N]-[description]. One commit per task. Create PR when done using "C:\Program Files\GitHub CLI\gh.exe".
```

### Hotfix Naming
When bugs surface after a sprint, write hotfix prompts as `SPRINT_[N]_5_HOTFIX.md` (e.g., 13.5).

---

## 8. Sprint History Summary

Full sprint archive in `.claude/archive/SPRINT_HISTORY.md`. Key milestones:

| Sprint | Theme | Key Deliverables |
|--------|-------|-----------------|
| 1-3 | Foundation | Auth, 8 pages, PDF export, Stripe billing |
| 4-5 | Multi-tenancy | RLS policies, data isolation, org provisioning |
| 6-7 | AI Features | Price research, SQL dashboard, delete workflows |
| 8-9 | Smart Creation | AI project creation, material suggestions, onboarding |
| 10-11 | Polish | Dashboard customization, widget drag-drop, micro-interactions |
| 12-13 | Visual & Maps | Mapbox integration, address geocoding, KPI navigation, empty states |
| 13.5 | Persistence | Zone/material persistence fixes, error toasts, role diagnostics |

---

## 9. Current State (update after each sprint)

**Last completed**: Sprint 13.5 (all tests passing)
**All features working**: Auth, projects, zones, materials, crew, equipment, work orders, billing, PDF export, AI creation, maps, dashboard customization
**Open non-blocking issues**: See CONSIDERATIONS.md
**Next**: UI iteration based on v7 design preview, then deploy

---

## 10. How to Start a New Orchestrator Session

If this session runs out of context, start a new one with:

1. Read this file (`ORCHESTRATOR.md`) — you now know everything
2. Read `.claude/CONTEXT.md` — current sprint status
3. Check auto-memory files — preferences, feedback, references
4. Ask Charlie: "I'm up to speed. What are we working on?"

That's it. No context loss.
