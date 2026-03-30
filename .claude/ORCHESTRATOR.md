# TerrainForge — Orchestrator Knowledge Base

> **What this file is**: The complete knowledge base for the Orchestrator session. Any new Cowork session that reads this file can immediately take over project coordination. This is the single source of truth for how we work.
>
> **Last updated**: 2026-03-30 (two-mode workflow model)

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
| State | Zustand (7 stores) + Supabase sync |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL, 15 tables, 55+ RLS policies |
| Styling | Tailwind CSS + CSS custom properties |
| Billing | Stripe (checkout, portal, webhook via Netlify Edge Functions) |
| AI | Anthropic Claude API (price research + smart project creation) |
| Maps | Mapbox GL JS (geocoding + map display) |
| PDF | @react-pdf/renderer |
| Deploy | Netlify (auto-deploy OFF — manual deploy only) |

---

## 2. Session Model (Two-Mode)

As of Sprint 16.5, we use a two-mode model. VSCode Claude Code handles everything sprint-related. Cowork is reserved for strategic/business work only.

### Claude Code in VSCode (PRIMARY — planning + execution)
- Reads ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md, ORCHESTRATOR.md to plan sprints
- Writes sprint prompt files (`.claude/SPRINT_[N]_PROMPTS.md`)
- Writes SQL migration files in `supabase/migrations/`
- Executes all sprint code (branch, implement, build, commit, PR)
- Writes hotfix prompts and executes them
- Updates CONTEXT.md, ORCHESTRATOR.md after sprints
- Provides the post-sprint command block for Charlie
- The ONLY entity that touches files in `src/`
- Per-task cycle: implement → build → commit → next task

### Cowork (STRATEGIC only)
- Business strategy, roadmap decisions, milestone evaluation
- Non-code deliverables (pitch decks, marketing docs, presentations)
- UI Design preview production (HTML design previews)
- Remote dispatch from phone (see REMOTE_WORKFLOW.md)
- Does NOT plan sprints, write sprint prompts, write SQL, or touch code

### Charlie's role in the loop
- Runs SQL migrations in Supabase SQL Editor (from `supabase/migrations/` files)
- Merges sprint branches in PowerShell (command block provided by Code)
- Tests locally: `npm run dev` → `localhost:3000` (incognito)
- Reports test results back to Code: PASS / PARTIAL / FAIL
- Deploys to prod: `git push origin main`
- Commits `.claude/` doc updates after sprints

---

## 3. Development Workflow

### Sprint Lifecycle

```
1. Plan    → Code reads ROADMAP/CONTEXT/CONSIDERATIONS, writes SPRINT_[N]_PROMPTS.md + migration SQL
2. Pre-fly → Charlie runs SQL migration in Supabase (if any)
3. Execute → Code creates branch, implements, builds, commits, opens PR
4. Merge   → Charlie: pastes post-sprint command block into PowerShell
5. Test    → Charlie: localhost:3000 in incognito, runs test checklist
6. Fix     → If issues: Code writes + executes hotfix prompt, repeat 4-5
7. Wrap    → Code updates CONTEXT.md, Charlie commits .claude/ docs
8. Deploy  → Charlie: git push origin main (when ready)
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
- **Enum mismatch (22P02)** — Postgres ENUM types reject values not in the enum. If the frontend TypeScript type and the DB enum have different values, INSERT/UPDATE silently fails. Sprint 16.5 replaced all ENUMs with TEXT + CHECK constraints to eliminate this permanently.
- When debugging persistence: check RLS policies FIRST, then enum/CHECK constraints, then column mappings.

### Critical Rule: No Postgres ENUMs
**NEVER use Postgres ENUM types.** Always use TEXT columns with CHECK constraints. ENUMs are rigid (ALTER TYPE ADD VALUE is not transactional), create mismatch risk with frontend types, and are a recurring source of silent write failures. Sprint 16.5 migration 006 converted all existing ENUMs to TEXT + CHECK. All future migrations must follow this pattern.

### Field Mapping (supabaseData.ts)
- Frontend uses camelCase, Supabase uses snake_case
- `toSnakeCase()` / `toCamelCase()` handle conversion
- Special mappings: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- `client` field is stripped before INSERT (DB expects `client_id` UUID FK, unused)
- Checklist stored as JSONB
- Materials stored as JSONB on projects table (added Sprint 13, migration 004)

### org_id Filtering Rule
**Every fetch function in supabaseData.ts MUST filter by org_id.** RLS policies enforce org isolation on the DB side, but queries without `.eq('org_id', orgId)` return empty results (RLS silently blocks). Sprint 16 fixed this for fetchProjects, fetchMaterials, fetchEquipment, and fetchCrew. All future fetch functions must accept `orgId: string` as a parameter and include the filter.

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
- `005_scheduling.sql` — schedule_entries + crew_status tables
- `006_fix_enum_mismatch.sql` — Replace all ENUM columns with TEXT + CHECK constraints

**Migration authoring rule**: SQL always lives as a `.sql` file in `supabase/migrations/`. Sprint prompt docs (`.claude/SPRINT_*.md`) REFERENCE the file — never embed SQL inline in markdown. This keeps all SQL in one canonical location.

---

## 5. Codebase Architecture

### Source Structure (87 files, ~17K lines)
```
src/
├── pages/          13 files, 5,882 LOC  (route components)
├── components/     25 files, 3,018 LOC  (dashboard, layout, pdf, shared, ui)
├── stores/          7 files, ~2,100 LOC (Zustand: project, material, equipment, crew, org, ui, schedule)
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
| 14 | Cleanup | File consolidation, orphaned code removal, archive organization |
| 15 | Scheduling (M1) | Weekly schedule page, drag-and-drop, dashboard widget, project integration, Supabase CRUD |
| 15.5 | Hotfix | Widget localStorage migration, conflict indicator fix, occupied cell assignment |

---

## 9. Current State (update after each sprint)

**Last completed**: Sprint 15.5 (all tests passing)
**Milestone**: M1 "Worth the Demo" — ACTIVE
**All features working**: Auth, projects, zones, materials, crew, equipment, work orders, billing, PDF export, AI creation, maps, dashboard customization, **weekly scheduling with drag-and-drop**
**Pre-existing bugs**: Material add, equipment add, and work orders with active project all fail with in-app errors (likely RLS — see CONSIDERATIONS.md)
**Next**: Sprint 16 — planning now
**Workflow**: VSCode Claude Code for execution, Cowork for orchestration. Full lifecycle documented in EXECUTION.md.

---

## 10. How to Start a New Orchestrator Session

If this session runs out of context, start a new one with:

1. Read this file (`ORCHESTRATOR.md`) — you now know everything
2. Read `.claude/CONTEXT.md` — current sprint status
3. Check auto-memory files — preferences, feedback, references
4. Ask Charlie: "I'm up to speed. What are we working on?"

That's it. No context loss.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            