# TerrainForge — Claude Code Guide

> **For Claude Code sessions in VSCode.** Code owns execution: implement, self-verify, build, commit, PR.
> Last updated: 2026-04-03 (UI hub rebuild — 4-tab layout + contractor features)

---

## Your Role

You implement code changes based on instructions provided by Charlie or prepared prompt files. Your inputs:
1. `CLAUDE.md` (project root) — project context, tech stack, naming conventions, what NOT to do
2. `ARCHITECTURE.md` — the data flow blueprint. **Every store, fetch pattern, and page composition decision is in this file. Follow it exactly.**
3. This file (`CODE_GUIDE.md`) — execution rules, git workflow, verification protocol
4. Sprint/refactor prompt files — the specific work to implement

---

## Execution Workflow

Charlie executes steps marked **(C)**. Claude Code handles **(CC)**.

### Phase A: Pre-Flight (C)
1. Check the prompt for **SQL migrations** — if listed, run in Supabase SQL Editor first
2. Kick off Code with instructions referencing the prompt file or describing the work

### Phase B: Execute (CC)
1. Read this file + `ARCHITECTURE.md`
2. Create a feature branch: `refactor-[description]` or `sprint-[N]-[description]`
3. **Read all target files + referenced components before writing anything**
4. For each task:
   - Implement changes
   - Run `npm run build` — fix TypeScript errors before proceeding
   - **Self-verify** (see protocol below)
   - Commit: descriptive message (e.g., `refactor: rebuild projectStore with fetchProjectFull`)
5. After all tasks complete:
   - Run full regression checklist
   - Push branch
   - Create PR: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head [branch] --title "[title]" --body "[summary]"`

### Phase C: Merge + Test (C)
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git checkout main
git merge [branch-name]
git push origin main
git branch -d [branch-name]
npm run build
npm run dev
```
Open `http://localhost:3000` in incognito. Run test checklist. Report PASS / PARTIAL / FAIL.

### Phase C.5: Cowork Doc Commit (C)
After each sprint, Cowork may have created or modified documentation files that are untracked by git (execution prompts, CLAUDE.md updates, utility scripts). Before moving to the next sprint:
1. Run `git status` — look for untracked `.claude/` files and modified docs
2. Archive completed prompt files: move `[NAME].md` → `.claude/archive/[NAME]_completed.md`
3. Update `CLAUDE.md` "Current Status" and "Active Files" sections
4. Stage and commit: `git add .claude/ CLAUDE.md && git commit -m "docs: archive [sprint name] prompts, update project status"`
5. Push to main

### Phase D: Fix if Needed (CC)
If PARTIAL or FAIL: Code writes a hotfix, pushes, Charlie re-merges.

---

## Architecture Compliance (CRITICAL)

**Before writing any store, service, or page code, re-read `ARCHITECTURE.md`.** Key rules:

### Store Rules
- **Stores are the only data gateway.** Pages never import from `supabaseData.ts`.
- Each store has clear ownership boundaries (see ARCHITECTURE.md §1).
- Domain stores (project, crew, schedule, equipment, material) do NOT use localStorage persistence. Always fetch fresh from Supabase.
- Only `uiStore` (theme toggle) and `orgStore` (preferences) use localStorage.

### Layout Rules
- App uses a **TopNav** with 4 tabs — no sidebar. See ARCHITECTURE.md §0.
- Every hub tab follows: KPI cards → visualization → data table.
- Secondary pages (Manifest, Work Orders, Price Research, Settings, Billing) are in a "More" dropdown.
- Theme toggle (dark/light) lives in the user menu dropdown. Dark is default.

### Data Flow
```
Page → store hook → store action → supabaseData function → Supabase
                         ↓
                   store state updated → page re-renders
```

### Project Fetch Modes
- `fetchProjects(orgId)` — list mode with summary counts. For Projects page, Dashboard, KPIs.
- `fetchProjectFull(orgId, projectId)` — complete graph. For ProjectDashboard only. Always fresh.

### Materials
- Project-level materials (JSONB on projects table) = single source of truth
- Zone materials = optional drill-down, derived from project materials
- Org materials library = catalog with unit costs and inventory

### Wizard → AI → Store → Supabase
- After Step 2, AI generates recommendations using org context (crew, equipment, materials, rates, schedules)
- AI recommendations are pure suggestions — `aiRecommendations.ts` never writes to stores
- Contractor reviews suggestions via `SuggestionPanel` in Steps 3–6, accepting/rejecting/editing each
- On "Create Project": wizard writes to ALL downstream systems (project, tasks, subs, crew assignments, schedule entries, equipment status)
- Post-creation editing happens on ProjectDashboard tabs, same store paths

---

## Self-Verification Protocol

**Mandatory.** After each task AND after all tasks are complete.

### Per-Task
1. Run `npm run build` — must pass clean
2. If task modifies a page: verify import chain compiles (no missing exports, no circular deps)
3. If task modifies supabaseData.ts: verify function signature matches all call sites
4. If task modifies a store: verify all page consumers still compile
5. **Verify the architecture rule**: does this change follow the data flow pattern in ARCHITECTURE.md?

### End-of-Session
1. `npm run build` — clean pass
2. Run regression checklist (provided in prompt or below)
3. Remove any `console.log` statements added during debugging
4. Verify no files outside scope were modified: `git diff --stat`

### Standard Regression Checklist
- [ ] TopNav renders with 4 tabs, active indicator, and "More" dropdown
- [ ] Projects tab (`/`) — KPI cards, chart/map toggle, projects table all render
- [ ] Projects tab — clicking a project navigates to ProjectDashboard
- [ ] Projects tab — "+ New Project" launches wizard
- [ ] Budget tab (`/budget`) — KPI cards, charts, project budgets table, org rate settings
- [ ] Materials tab (`/materials`) — KPI cards, low stock banner, inventory table render
- [ ] Crew & Equipment tab (`/crew`) — KPI cards, crew cards, schedule grid, equipment table render
- [ ] Project wizard completes and creates project visible on Projects tab
- [ ] ProjectDashboard loads all 6 tabs without errors
- [ ] Secondary pages load from "More" dropdown (Manifest, Work Orders, Settings, Billing)
- [ ] Theme toggle switches between dark/light and persists
- [ ] Sign out works and redirects to login
- [ ] `npm run build` passes clean

---

## Git Conventions

- Feature branches: `refactor-[description]` or `sprint-[N]-[description]`
- Descriptive commits: `refactor: rebuild projectStore`, `fix: crew assignment persistence`
- Push to prod: `git push origin HEAD:main` (Netlify watches `main`)
- GitHub uses `main` branch (not `master`)

---

## Code Standards

> Full naming conventions and "What NOT to Do" are in `CLAUDE.md` at project root.

### TypeScript
- No `any` types — use interfaces from `src/types/index.ts`
- Imports use `@/` alias: `import { Project } from '@/types'`
- Business logic lives in `src/lib/`, never in components
- New types for refactor (ProjectListItem, ProjectFull, ProjectCrewAssignment) go in `src/types/index.ts`

### Supabase
- ALL operations go through `src/services/supabaseData.ts`
- **Stores call supabaseData. Pages call stores. No exceptions.**
- Always include `org_id` on inserts and fetches
- Field mapping: camelCase ↔ snake_case via `toSnakeCase()` / `toCamelCase()`
- Special mappings: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- New contractor fields: `hourlyCost` → `hourly_cost`, `equipmentType` → `equipment_type`, `disposalCost` → `disposal_cost`, `equipmentCost` → `equipment_cost`, `defaultLaborRate` → `default_labor_rate`, `defaultEquipmentRate` → `default_equipment_rate`, `disposalRates` → `disposal_rates`
- Send NULL (not 0) for optional numeric fields with CHECK constraints
- NEVER use Postgres ENUM types — always TEXT + CHECK constraints

### Styling
- CSS custom properties: `var(--brand-primary)`, `var(--surface-card)`, etc.
- Tailwind for layout utilities
- Design tokens in `DESIGN_SYSTEM.md`
- Hub tabs use the shared `KPICard` and `DataTable` components
- Theme: dark default, light via `[data-theme="dark"]` CSS selector. Both sets of variables in `index.css`.

### RLS Policy Reference
| Table | INSERT requires | Notes |
|-------|----------------|-------|
| projects | designer or admin | |
| zones | foreman or admin | CHECK: area_sqft > 0, perimeter_lnft > 0 |
| zone_materials | foreman or admin | CHECK: quantity > 0 |
| materials | designer or admin | |
| crew_members | foreman or admin | |
| equipment | foreman or admin | |
| project_crew_assignments | designer or admin | NEW — same pattern as project_tasks |

---

## SQL Migration Protocol

- Files go in `supabase/migrations/[NNN]_[description].sql`
- Each migration is idempotent (`IF NOT EXISTS`, `DROP IF EXISTS + CREATE`)
- Include RLS policies and CHECK constraints in the same migration
- NEVER use Postgres ENUM types — always TEXT + CHECK
- Charlie runs migrations manually in Supabase SQL Editor before Code executes

---

## What Code Should NOT Do

- Don't start a dev server (`npm run dev`) — Charlie tests locally
- Don't deploy to Netlify — Charlie deploys manually
- Don't run SQL against Supabase — Charlie runs migrations manually
- Don't modify `.env.local` or any secrets file
- Don't delete files outside `src/` without explicit instruction
- Don't make architecture decisions — follow ARCHITECTURE.md

---

## Key Rules (Learned the Hard Way)

- **Always verify `git status` is clean before starting**
- **Close Claude Code sessions before running git commands** — prevents index.lock conflicts
- **Run SQL migration BEFORE execution** — CRUD functions will fail otherwise
- **Build before AND after** — pre-flight catches existing issues, post-merge catches regressions
- **Use incognito for testing** — Zustand persist middleware caches old state in localStorage
- **Frontend type values must exactly match DB CHECK constraint val