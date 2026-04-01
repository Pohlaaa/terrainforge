# TerrainForge — Orchestrator Knowledge Base

> **What this file is**: The knowledge base for Cowork sessions. Any new Cowork session that reads this file can immediately take over project coordination. For Code sessions, start with CONTEXT.md and CODE_GUIDE.md instead — this file is Cowork-only.
>
> **Last updated**: 2026-03-31 (post-M2 restructure — streamlined for new workflow)

---

## 1. Project Overview

**TerrainForge** is a SaaS platform for landscaping contractors. It covers project management, material inventory, crew/equipment tracking, manifest generation, work orders, and AI-assisted project creation.

**Owner**: Charlie (Business Systems Analyst II — builds tools that make work more efficient)
**Repo**: github.com/Pohlaaa/terrainforge
**Live site**: terrainforge-staging.netlify.app
**Netlify site ID**: `d8efdf00-91f7-4717-aabd-d1c65372a634`
**Netlify team**: `woodsrider82`

### Milestone Status

| Milestone | Goal | Gate | Status |
|-----------|------|------|--------|
| M1 "Worth the Demo" | Full contractor workflow + scheduling + crew app | 15-min demo → "how do I sign up?" | **COMPLETE** |
| M1.5a "Project Intelligence — Wizard" | AI-powered 7-step project creation | Contractor creates full project in <5 min | **COMPLETE** |
| M1.5b "Project Intelligence — Dashboard" | Project detail view as command center | Manage project entirely from dashboard | **COMPLETE** |
| M2 "First Impression" | Onboarding & trial experience | Signup-to-first-project in <5 min | **COMPLETE** |
| M3 "First Revenue" | Launch & validation | 5 paying subs, $400+ MRR | **ACTIVE** |
| M4 "Sticky" | Retention & expansion | <5% monthly churn, NPS >40 | Future |
| M5 "Scale" | Growth & differentiation | $15K MRR, 20+ orgs | Future |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| State | Zustand (7 stores) + Supabase sync |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL, 15+ tables, 75+ RLS policies |
| Styling | Tailwind CSS + CSS custom properties |
| Billing | Stripe (checkout, portal, webhook via Netlify Edge Functions) |
| AI | Anthropic Claude API (price research + smart project creation) |
| Maps | Mapbox GL JS (geocoding + map display) |
| PDF | @react-pdf/renderer |
| Deploy | Netlify (auto-deploy OFF — manual deploy only) |

---

## 2. Workflow Model

### Autonomous Development Workflow

Charlie's goal: kick off sessions in the morning/evening, Cowork and Code work autonomously, Charlie reviews and approves.

**Two modes, clear lanes:**

**Claude Code in VSCode (Code)** — owns all code execution:
- Reads CONTEXT.md + CODE_GUIDE.md + SPRINT_[N]_PROMPTS.md
- Executes sprint: branch → implement → self-verify → build → commit → PR
- Self-verifies features before PR (new requirement — see CODE_GUIDE.md)
- Updates CONTEXT.md after sprints
- Archives sprint prompt to `.claude/archive/sprints/`
- The ONLY entity that touches files in `src/`

**Cowork** — owns strategy, planning, and non-code deliverables:
- Batch-prepares sprint prompts in advance (Code does NOT plan its own sprints)
- Business strategy, roadmap decisions, milestone evaluation
- Non-code deliverables (landing pages, marketing copy, pitch decks)
- Batch checkpoints every 3-5 sprints
- File maintenance (ROADMAP.md, CONSIDERATIONS.md, ORCHESTRATOR.md)
- Does NOT write SQL, modify source code, or execute sprints

**Charlie's role:**
- Runs SQL migrations in Supabase SQL Editor (batch before sprint sessions)
- Merges sprint branches + tests locally (evening sessions, variable time)
- Updates SPRINT_LOG.md after each sprint pass (~2 min)
- Deploys to prod: `git push origin main`
- Approves Cowork decisions from phone during workday

### Cadences

**Sprint Cadence**: Code executes → Charlie merges/tests → PASS/FAIL → next sprint
**Batch Cadence** (every 3-5 sprints): Cowork reads SPRINT_LOG.md → flags priority shifts → updates docs → prepares next sprint batch
**Evening Session**: Charlie merges 1-3 sprints, tests, signs off, kicks off next session

---

## 3. Supabase Rules (Hard-Won Lessons)

These are duplicated in CODE_GUIDE.md for Code. Cowork needs them for planning.

- **RLS violations return 0 rows** — no error thrown. Debug persistence issues by checking RLS FIRST.
- **NEVER use Postgres ENUM types** — always TEXT + CHECK constraints (Sprint 16.5 lesson)
- **Every fetch function MUST filter by org_id** — even though RLS enforces it, omitting the filter returns empty results
- **Field mapping**: frontend camelCase ↔ DB snake_case via `toSnakeCase()`/`toCamelCase()`
- **Special mappings**: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- **CHECK constraints**: `area_sqft > 0`, `perimeter_lnft > 0`, `quantity > 0` — send NULL not 0
- **Migrations run manually** in Supabase SQL Editor. Files in `supabase/migrations/` (001-012 applied)

---

## 4. .claude/ File Map

### Active Files

| File | Owner | Purpose | Code Reads? |
|------|-------|---------|-------------|
| `CONTEXT.md` | Code + Cowork | Current state, sprint history, what's working | **Yes — primary** |
| `CODE_GUIDE.md` | Cowork (maintains) | Execution rules, git workflow, self-verification | **Yes — primary** |
| `SPRINT_[N]_PROMPTS.md` | Cowork (writes) | Sprint tasks for Code to execute | **Yes — execution** |
| `SPRINT_TEMPLATE.md` | Cowork | Template for writing sprint prompts | No |
| `ROADMAP.md` | Cowork | Milestone plan, sprint mapping | Planning only |
| `ORCHESTRATOR.md` | Cowork | This file — Cowork-only knowledge base | No |
| `CONSIDERATIONS.md` | Cowork | Backlog items not yet sprint-ready | Planning only |
| `DESIGN_SYSTEM.md` | Cowork | Design tokens, patterns | If visual sprint |
| `SPRINT_LOG.md` | Charlie | Testing feedback per sprint | Cowork reads |
| `DAILY_WORKFLOW.md` | Cowork | Autonomous workflow playbook | Reference only |

### Subdirectories

| Directory | Contents |
|-----------|----------|
| `business/` | BUSINESS.md, MARKETING.md, AI_PRODUCT.md — Cowork-only |
| `archive/` | Completed sprint prompts, old docs, DATA_MODEL_M1.5.md |
| `design/` | Active design preview (v7) |
| `TESTING/` | QA findings, test protocol |
| `SQL/` | Sprint-specific SQL reference files |

### Code Session Startup (streamlined)
1. Read `CONTEXT.md` — current state + Supabase rules
2. Read `CODE_GUIDE.md` — execution rules + self-verification
3. Read `SPRINT_[N]_PROMPTS.md` — the actual work
4. Execute. No planning, no decisions — just build what the prompt says.

### Cowork Session Startup (batch checkpoint)
1. Read `CONTEXT.md` — what Code has built since last checkpoint
2. Read `ROADMAP.md` — milestone progress
3. Read `SPRINT_LOG.md` — Charlie's testing feedback
4. Summarize: what changed, what needs attention, any priority shifts
5. Update files as needed, archive processed sprint log entries

---

## 5. Contractor Feedback Summary

Three pillars the pilot contractor cares about most (shapes M4 planning):

1. **Budget Management** — auto-calculation is the #1 loved feature. Wants: better material quantity AI, auto-quote from costs + margin, actual vs. estimated cost tracking.
2. **Materials Management** — wants materials integrated into wizard for pre-quote cost estimation. Wants org-level supplier directory.
3. **AI Inte