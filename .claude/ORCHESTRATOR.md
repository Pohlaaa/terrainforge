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

### Milestone Roadmap (see ROADMAP.md for full detail)

| Milestone | Goal | Gate | Status |
|-----------|------|------|--------|
| M1 "Worth the Demo" | Full contractor workflow + scheduling + crew app | 15-min demo → "how do I sign up?" | **COMPLETE** (pending gate eval) |
| M2 "First Impression" | Onboarding & trial experience | Signup-to-first-project in <5 min | Next |
| M3 "First Revenue" | Launch & validation | 5 paying subs, $400+ MRR | Future |
| M4 "Sticky" | Retention & expansion | <5% monthly churn, NPS >40 | Future |
| M5 "Scale" | Growth & differentiation | $15K MRR, 20+ orgs | Future |

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

## 2. Session Model (Two-Mode + Workflow Loop)

VSCode Claude Code handles everything sprint-related. Cowork handles strategy, file optimization, and batch checkpoints.

### Claude Code in VSCode (PRIMARY — planning + execution)
- Reads ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md, ORCHESTRATOR.md, DATA_MODEL_M1.5.md to plan sprints
- Writes sprint prompt files (`.claude/SPRINT_[N]_PROMPTS.md`)
- Writes SQL migration files in `supabase/migrations/`
- Executes all sprint code (branch, implement, build, commit, PR)
- Writes hotfix prompts and executes them
- Updates CONTEXT.md after sprints
- Provides the post-sprint command block for Charlie
- The ONLY entity that touches files in `src/`
- Per-task cycle: implement → build → commit → next task
- **End-of-sprint**: reminds Charlie to update SPRINT_LOG.md

### Cowork (STRATEGY + BATCH CHECKPOINTS)
- Business strategy, roadmap decisions, milestone evaluation
- Non-code deliverables (pitch decks, marketing docs, presentations)
- UI Design preview production (HTML design previews)
- **Batch checkpoints** every 3-5 sprints (see Workflow Loop below)
- Does NOT plan sprints, write sprint prompts, write SQL, or touch code

### Charlie's role in the loop
- Runs SQL migrations in Supabase SQL Editor (from `supabase/migrations/` files)
- Merges sprint branches in PowerShell (command block provided by Code)
- Tests locally: `npm run dev` → `localhost:3000` (incognito)
- Reports test results back to Code: PASS / PARTIAL / FAIL
- **After each sprint pass**: updates SPRINT_LOG.md (~2 min)
- Deploys to prod: `git push origin main`
- Commits `.claude/` doc updates after sprints

### Workflow Loop

Two cadences drive the development cycle:

**Sprint Cadence** (every sprint):
```
Code executes sprint → Charlie tests → PASS/FAIL
  → Charlie updates SPRINT_LOG.md (what felt right, what felt off, what's missing)
  → Code starts next sprint
```

**Batch Cadence** (every 3-5 sprints, or at milestone boundaries):
```
Charlie opens Cowork → Cowork reads CONTEXT.md + ROADMAP.md + SPRINT_LOG.md
  → Cowork flags priority shifts from sprint log feedback
  → Cowork updates ROADMAP.md, CONSIDERATIONS.md, DATA_MODEL_M1.5.md as needed
  → Cowork archives processed sprint log entries
  → Cowork writes summary + next-batch direction
  → Charlie starts next Code session with updated files
```

**Why this matters**: CONTEXT.md tells Cowork what Code built. SPRINT_LOG.md tells Cowork what Charlie experienced. Both signals are needed to optimize the next batch of sprints.

---

## 3. Development Workflow

### Sprint Lifecycle

```
1. Plan    → Code reads ROADMAP/CONTEXT/CONSIDERATIONS/DATA_MODEL, writes SPRINT_[N]_PROMPTS.md + migration SQL
2. Pre-fly → Charlie runs SQL migration in Supabase (if any)
3. Execute → Code creates branch, implements, builds, commits, opens PR
4. Merge   → Charlie: pastes post-sprint command block into PowerShell
5. Test    → Charlie: localhost:3000 in incognito, runs test checklist
6. Fix     → If issues: Code writes + executes hotfix prompt, repeat 4-5
7. Wrap    → Code updates CONTEXT.md, reminds Charlie to update SPRINT_LOG.md
8. Log     → Charlie: adds sprint entry to SPRINT_LOG.md (~2 min)
9. Deploy  → Charlie: git push origin main (when ready)
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

> Full architecture rules, naming conventions, file organization, and "What NOT to Do" are in `CLAUDE.md` at project root. That is the authoritative source for code standards. This section covers only what Orchestrator/Cowork sessions need to know.

### Key Files
- `supabaseData.ts` — ALL Supabase CRUD. Every write goes through here.
- `projectStore.ts` — Project state, addProject returns project ID
- `Projects.tsx` — Largest page, handles project CRUD + zone builder + AI creation
- `AuthContext.tsx` — Auth state + role diagnostic on login
- `src/types/index.ts` — Single source of truth for all shared TypeScript interfaces

---

## 6. Environment & Infrastructure

- **Env vars**: Set in `.env.local` (local) and Netlify dashboard (prod). Full list in `CLAUDE.md`.
- **Dev server**: `npm run dev` → `localhost:3000`
- **Netlify auto-deploy**: OFF (build minute budget renews 4/19). Deploy manually after local testing.
- **Scaling triggers**: Supabase Pro at >400MB or >40K MAU. Netlify Pro at >80GB bandwidth. Redis caching at >50 customers.

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
| 16 | Fix + Polish | org_id filters, schedule edit modal, equipment assignment, lazy-load Debug |
| 16.5 | Hotfix | ENUM→TEXT migration, equipment date nulls, Work Orders hooks fix, sign-in data loading race |
| 17 | Crew App (M1) | Crew-facing route tree, CrewLayout, today's schedule, work order checklist, status signals, crew RLS |
| 18 | Crew Persistence (M1) | Checklist persistence, photo proof uploads, manager schedule status dots + progress counts |
| 19 | UI Polish (M1) | Card shadows, border-radius standardization, focus rings, PageHeader adoption, touch targets |
| 20 | Demo Ready (M1) | Manager photo gallery, active project indicators, Settings polish, crew map links |
| 21 | Layout Shell (M1) | 64px icon rail + top nav bar, MobileSidebar, v7 radius tokens |
| 22 | Nav Consolidation (M1) | 5 nav groups, SubTabBar, simplified TopNav dropdown |
| 23 | Crew PIN Auth (M1) | PIN login, org shortcode, CrewLogin page, 8-hour sessions, migration 009 |
| 24 | v7 Redesign (M1) | Dashboard KPI strip, Projects dense 2-col cards + list view toggle |
| 25 | Polish + Demo Prep (M1) | Responsive expanded sidebar, merged customize, widget 2-col, map fixes |
| 25.5 | Hotfix | KPI strip shows all, widget grid 2-col, map hover popups, sidebar sub-tabs |
| 25.6 | Hotfix | KPI compute fixes, map scroll re-enabled, widget half/full size toggle |

---

## 9. Current State (update after each sprint)

**Last completed**: Sprint 25 + hotfixes 25.5/25.6 (all tests passing)
**Milestone**: M1 "Worth the Demo" — COMPLETE (pending gate evaluation)
**All features working**: Auth, projects, zones, materials, crew, equipment, work orders, billing, PDF export, AI creation, maps, dashboard KPI strip, widget grid (2-col with resize), weekly scheduling, **crew app with PIN auth + checklist + photo proof + status signals**, **v7 UI overhaul (icon rail, top nav, sub-tabs, dense cards, list view)**
**No known blocking bugs.**
**Next**: M1 gate evaluation → begin M2 planning
**Workflow**: VSCode Claude Code for planning + execution, Cowork for strategy + deliverables

---

## 10. .claude/ File Map

After the Sprint 25 consolidation, the `.claude/` directory has a clean structure:

### Active files (what Code reads)
| File | Purpose |
|------|---------|
| `CONTEXT.md` | Current state — updated after each sprint |
| `ROADMAP.md` | Milestone plan with module specs |
| `ORCHESTRATOR.md` | This file — full knowledge base for Orchestrator/Cowork |
| `CODE_GUIDE.md` | Execution workflow, sprint lifecycle, testing protocol |
| `DESIGN_SYSTEM.md` | Design tokens, color system, component patterns |
| `DATA_MODEL_M1.5.md` | M1.5 Project Intelligence schema — new tables, extended projects, migration plan |
| `SPRINT_LOG.md` | Charlie's testing impressions per sprint — Cowork reads during batch checkpoints |
| `CONSIDERATIONS.md` | Backlog items not yet sprint-ready |
| `SPRINT_TEMPLATE.md` | Template for writing new sprint prompts |

### Subdirectories
| Directory | Contents |
|-----------|----------|
| `business/` | BUSINESS.md, MARKETING.md, AI_PRODUCT.md — Cowork-only, Code never reads |
| `archive/` | Completed sprint prompts, old design previews, superseded docs |
| `design/` | Active design preview (v7) |
| `TESTING/` | QA findings, test protocol, sprint test results |
| `SQL/` | Sprint-specific SQL reference files |

### How to start a new Code session
1. Read this file (`ORCHESTRATOR.md`) — you now know everything
2. Read `CONTEXT.md` — current sprint status
3. Read `ROADMAP.md` — what milestone is active, what's next
4. Read `DATA_MODEL_M1.5.md` — if working on M1.5 sprints
5. Ask Charlie: "I'm up to speed. What are we working on?"

### How to start a new Cowork session (batch checkpoint)
1. Read `CONTEXT.md` — what Code has built since last checkpoint
2. Read `ROADMAP.md` — milestone progress
3. Read `SPRINT_LOG.md` — Charlie's testing feedback since last checkpoint
4. Summarize: what changed, what needs attention, any priority shifts
5. Update files as needed: ROADMAP.md, CONSIDERATIONS.md, DATA_MODEL_M1.5.md
6. Archive processed SPRINT_LOG.md entries to `.claude/archive/sprint_log_archive.md`