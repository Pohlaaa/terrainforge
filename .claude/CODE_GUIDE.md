# TerrainForge — Claude Code Guide

> **For Claude Code sessions in VSCode.** Code owns sprint execution: implement, self-verify, build, commit, PR.
> Code does NOT plan sprints — Cowork prepares all sprint prompts in advance.
> Last updated: 2026-03-31 (batch execution model — chain sprints on one branch)

---

## Your Role

You execute pre-planned sprints. You do not plan them. Your inputs:
1. `CONTEXT.md` — current project state, Supabase rules, what's working
2. This file (`CODE_GUIDE.md`) — execution rules
3. `SPRINT_[N]_PROMPTS.md` — the specific tasks to implement

That's it. You do NOT need to read ORCHESTRATOR.md, ROADMAP.md, or CONSIDERATIONS.md unless the sprint prompt explicitly references them.

---

## Sprint Execution (Batch Model)

Code executes **all sprints in a batch** on a single branch before stopping. Charlie merges and tests the whole batch in one evening session.

Charlie executes steps marked **(C)**. Claude Code handles **(CC)**.

### Phase A: Pre-Flight (C)
1. Check each sprint prompt in the batch for a **SQL migrations** line in the header
2. If any sprint lists a migration: open the file from `supabase/migrations/`, copy the SQL, run it in Supabase SQL Editor
3. Kick off Code with: `Read .claude/CODE_GUIDE.md, then execute SPRINT_[N] through SPRINT_[M] in sequence.`

**Current batch (Sprints 38-40) requires**:
- `supabase/migrations/012_trial_columns.sql` — run in Supabase SQL Editor before starting

### Phase B: Execute Batch (CC)
1. Read this file
2. Create ONE branch for the entire batch: `batch-sprint-[N]-to-[M]`
3. **For each sprint in the batch**:
   a. Read SPRINT_[N]_PROMPTS.md
   b. For each task in that sprint:
      - Read all target files + referenced components before writing anything
      - Implement changes
      - Run `npm run build` — fix TypeScript errors before proceeding
      - **Self-verify** — see Self-Verification Protocol below
      - Commit: `S[sprint]-[task]: [description]`
   c. After all tasks in this sprint: run that sprint's regression checklist
   d. Run `npm run build` — confirm clean before moving to next sprint
   e. Commit: `S[sprint]: sprint complete, build passing`
   f. **Continue immediately to the next sprint in the batch** — do NOT stop, do NOT create a PR, do NOT wait for Charlie
4. After ALL sprints in the batch are complete:
   a. Run the FINAL sprint's regression checklist (it covers the most ground)
   b. Push branch
   c. Create ONE PR covering all sprints: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head batch-sprint-[N]-to-[M] --title "Batch: Sprints [N]-[M]" --body "[summary of all sprints completed]"`
   d. Update CONTEXT.md with all sprint results
   e. Move all sprint prompts to archive: `git mv .claude/SPRINT_[N]_PROMPTS.md .claude/archive/sprints/` (for each sprint)

### Phase C: Merge + Test (C)
Charlie pastes the post-sprint command block:
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git checkout main
git merge batch-sprint-[N]-to-[M]
git push origin main
git branch -d batch-sprint-[N]-to-[M]
npm run build
npm run dev
```
Then: open `http://localhost:3000` in incognito, run each sprint's test checklist, report PASS / PARTIAL / FAIL.

### Phase D: Fix if Needed (CC)
If PARTIAL or FAIL: Code writes a hotfix on the same batch branch, pushes, Charlie re-merges.

### Phase E: Wrap Up (C)
1. Update SPRINT_LOG.md for each sprint in the batch (~2 min per sprint)
2. Commit docs: `git add .claude/ && git commit -m "docs: Batch [N]-[M] wrap-up" && git push origin main`

### Single-Sprint Mode
If Charlie kicks off only ONE sprint, Code still follows the same flow — the batch just contains one sprint. Branch name: `sprint-[N]-[description]` (not batch prefix).

### Key Batch Rules
- **Never stop between sprints** — the whole point is autonomous execution
- **Each sprint builds on the previous** — Code is working on the same branch, so Sprint N+1 has access to all code from Sprint N
- **If `npm run build` fails between sprints**, fix it before continuing — do not start the next sprint with a broken build
- **Migrations**: Charlie runs all SQL migrations in Pre-Flight before the batch starts. If a sprint prompt includes a migration file task, the file already exists in `supabase/migrations/` — do NOT recreate it, but DO verify it exists. The migration has already been applied to the database.

---

## Self-Verification Protocol

**This is mandatory.** After each task AND after all tasks are complete, verify your work.

### Per-Task Verification
After implementing each task, before committing:
1. Run `npm run build` — must pass clean
2. Check the sprint prompt's **Self-verification** section for that task
3. If the task modifies a page component, verify the import chain compiles (no missing exports, no circular deps)
4. If the task modifies supabaseData.ts, verify the function signature matches all call sites

### End-of-Sprint Verification
After all tasks are committed, before creating PR:
1. Run `npm run build` one final time
2. Run through the **Regression Checklist** from the sprint prompt
3. Search for any `console.log` statements you added during debugging — remove them
4. Verify no files outside the sprint scope were accidentally modified (`git diff --stat`)

### What Self-Verification Does NOT Include
- You do NOT run `npm run dev` or start a dev server
- You do NOT test in a browser (Charlie does this)
- You DO verify everything that can be checked statically

---

## Git Conventions

- Batch branches: `batch-sprint-[N]-to-[M]` (or `sprint-N-description` for single sprints)
- One commit per task: `S[sprint]-[task]: [description]`
- One checkpoint commit per sprint: `S[sprint]: sprint complete, build passing`
- PR covers the entire batch: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head batch-sprint-[N]-to-[M] --title "Batch: Sprints [N]-[M]" --body "[summary of all sprints]"`
- Push to prod: `git push origin HEAD:main` (Netlify watches `main`)
- GitHub has BOTH `main` and `master` — always use `main`

---

## Code Standards

> Full architecture rules, naming conventions, and "What NOT to Do" are in `CLAUDE.md` at project root.

### TypeScript
- No `any` types — use interfaces from `src/types/index.ts`
- Imports use `@/` alias: `import { Project } from '@/types'`
- Business logic lives in `src/lib/`, never in components

### Supabase
- ALL writes go through `src/services/supabaseData.ts`
- Always include `org_id` on inserts and fetches
- Use `onSupabaseError()` for error reporting
- Field mapping: frontend camelCase ↔ DB snake_case via `toSnakeCase()`/`toCamelCase()`
- Special mappings: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- Send NULL (not 0) for optional numeric fields with CHECK constraints
- NEVER use Postgres ENUM types — always TEXT + CHECK constraints

### Styling
- CSS custom properties only: `var(--brand-primary)`, `var(--surface-card)`, etc.
- Tailwind for layout utilities
- Design tokens in `DESIGN_SYSTEM.md`
- All pages MUST use the shared `PageHeader` component
- Respect `prefers-reduced-motion` for all animations

### RLS Policy Reference
| Table | INSERT requires | Notes |
|-------|----------------|-------|
| projects | designer or admin | |
| zones | foreman or admin | CHECK: area_sqft > 0, perimeter_lnft > 0 |
| zone_materials | foreman or admin | CHECK: quantity > 0 |
| materials | designer or admin | |
| crew_members | foreman or admin | |
| equipment | foreman or admin | |

`admin` role passes ALL checks (via `user_has_role` function).

---

## SQL Migration Protocol

- Write migration files to `supabase/migrations/[NNN]_[description].sql`
- Each migration is idempotent (`IF NOT EXISTS`, `DROP IF EXISTS + CREATE`)
- Include RLS policies and CHECK constraints in the same migration
- NEVER use Postgres ENUM types — always TEXT + CHECK
- Sprint prompts REFERENCE the migration file — never embed SQL inline

---

## What Code Should NOT Do

- Don't start a dev server (`npm run dev`) — Charlie tests locally
- Don't deploy to Netlify — Charlie deploys manually
- Don't run SQL against Supabase — Charlie runs migrations manually
- Don't modify `.env.local` or any secrets file
- Don't delete files outside `src/` without explicit instruction
- Don't make product decisions — execute what's in the sprint prompt
- Don't plan sprints — Cowork does this

---

## Key Rules (Learned the Hard Way)

- **Never interact with Claude Code during sprint execution** — causes context breaks
- **Always verify `git status` is clean before starting**
- **Close Claude Code sessions before running git commands** — prevents index.lock conflicts
- **Run SQL migration BEFORE sprint execution** — CRUD functions will fail otherwise
- **Build before AND after** — pre-flight catches existing issues, post-merge catches regressions
- **Use incognito for testing** — Zustand persist middleware caches old state in localStorage
- **Frontend type values must exactly match DB CHECK constraint values** — mismatches cause silent INSERT failures
- **Don't add widgets to DEFAULT_WIDGET_LAYOUT w