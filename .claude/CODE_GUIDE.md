# TerrainForge — Claude Code Guide

> **For Claude Code sessions in VSCode.** Code owns the full sprint lifecycle: planning, execution, testing support, and documentation updates.
> Last updated: 2026-03-30 (consolidated from CODE_GUIDE + EXECUTION)

---

## Your Role

You are the primary development environment for TerrainForge. You handle:
- **Sprint planning**: Read ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md, ORCHESTRATOR.md → write SPRINT_[N]_PROMPTS.md
- **Migration authoring**: Write SQL files in `supabase/migrations/` (NEVER inline SQL in markdown)
- **Sprint execution**: Branch, implement, build, commit, PR
- **Hotfix writing + execution**: When tests fail, write and run the fix
- **Doc updates**: Update CONTEXT.md and ORCHESTRATOR.md after sprints
- **Post-sprint support**: Provide Charlie with the merge/build/test command block

Cowork (the Anthropic desktop app) is only used for strategic/business work — NOT for sprint planning or coordination.

---

## Context Files

### For Planning
1. `ORCHESTRATOR.md` — full project knowledge base, Supabase rules, session model
2. `ROADMAP.md` — milestone plan, what to build next
3. `CONTEXT.md` — current state, open bugs, git state
4. `CONSIDERATIONS.md` — backlog items, design decisions

### For Execution
1. This file (`CODE_GUIDE.md`) — execution workflow
2. `SPRINT_[N]_PROMPTS.md` — sprint tasks (the actual work)
3. `DESIGN_SYSTEM.md` — if the sprint involves visual changes
4. `TESTING/FINDINGS.md` — open bugs and known issues
5. `business/AI_PRODUCT.md` — if the sprint involves AI features

---

## Sprint Lifecycle (Complete Workflow)

Charlie executes steps marked **(C)**. Claude Code handles **(CC)**.

### Phase A: Plan (CC)
1. Read ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md, ORCHESTRATOR.md
2. Write SPRINT_[N]_PROMPTS.md with all tasks, types, file paths, and test section
3. Write SQL migration file in `supabase/migrations/` if sprint adds DB features
4. Update CONTEXT.md with sprint status
5. Tell Charlie: "Sprint [N] is planned. Run migration [NNN] in Supabase SQL Editor, then tell me to execute."

### Phase B: Pre-Flight (C)
1. Run SQL migration in Supabase SQL Editor if sprint has one
2. Tell Code to execute

### Phase C: Execute (CC)
1. Read this file + SPRINT_[N]_PROMPTS.md
2. Create branch, implement all tasks, build, commit per task, push, create PR
3. Charlie should NOT interact with Code during execution

### Phase D: Merge + Test (C)
Charlie pastes the post-sprint command block (provided by Code with branch name filled in):
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git checkout main
git merge [branch]
git push origin main
git branch -d [branch]
npm run build
npm run dev
```
Then: open `http://localhost:3000` in incognito, run test checklist, report PASS / PARTIAL / FAIL.

### Phase E: Fix if Needed (CC)
If PARTIAL or FAIL: write SPRINT_[N]_5_HOTFIX.md, execute it, provide new merge block. Repeat until PASS.

### Phase F: Wrap Up (CC + C)
1. (CC) Update CONTEXT.md and ORCHESTRATOR.md with sprint results
2. (C) Commit .claude/ docs: `git add .claude/ supabase/migrations/ CLAUDE.md && git commit -m "docs: add Sprint [N] orchestration files" && git push origin main`

---

## Per-Task Execution Cycle

1. **Read** the task from the sprint prompt file
2. **Read** all target files + referenced components/stores before writing anything
3. **Implement** changes across all specified files
4. **Build** — `npm run build`. Fix TypeScript errors before proceeding.
5. **Commit** — format: `S[sprint]-[task]: [description]`
6. **Next task** — repeat until all tasks complete
7. **PR** — create one PR for the entire sprint branch

### Git Workflow
```bash
git checkout -b sprint-[N]-[description]
# ... implement all tasks, committing each ...
git push origin sprint-[N]-[description]
"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-[N]-[description] --title "Sprint [N]: [theme]" --body "[summary]"
```

### Error Recovery
- `npm run build` fails → fix TypeScript errors, rebuild, commit the fix
- PR merge conflicts → rebase onto main, resolve, push
- Supabase query fails at runtime → check RLS policies first, then CHECK constraints, then column mappings
- Never skip a failing build

---

## Code Standards

> Full architecture rules, naming conventions, and "What NOT to Do" are in `CLAUDE.md` at project root. This section covers execution-specific standards only.

### TypeScript
- No `any` types — use interfaces from `src/types/index.ts`
- Imports use `@/` alias: `import { Project } from '@/types'`
- Business logic lives in `src/lib/`, never in components

### Supabase
- ALL writes go through `src/services/supabaseData.ts`
- Always include `org_id` on inserts and fetches
- Use `onSupabaseError()` for error reporting (wired to toast notifications)
- Field mapping: frontend camelCase ↔ DB snake_case via `toSnakeCase()`/`toCamelCase()`
- Special mappings: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- Send NULL (not 0) for optional numeric fields with CHECK constraints
- NEVER use Postgres ENUM types — always TEXT + CHECK constraints

### Styling
- CSS custom properties only: `var(--brand-primary)`, `var(--surface-card)`, etc.
- Tailwind for layout utilities
- Design tokens defined in `DESIGN_SYSTEM.md`
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
- Sprint prompt docs REFERENCE the file — never embed SQL inline in markdown
- Charlie runs migrations manually in Supabase SQL Editor BEFORE testing

---

## What Code Should NOT Do

- Don't start a dev server (`npm run dev`) — Charlie tests locally
- Don't deploy to Netlify — Charlie deploys manually
- Don't run SQL against Supabase — Charlie runs migrations manually
- Don't modify `.env.local` or any secrets file
- Don't delete files outside `src/` without explicit instruction
- Don't make product decisions — execute what's in the sprint prompt

---

## Key Rules (Learned the Hard Way)

- **Never interact with Claude Code during sprint execution** — causes context breaks and partial commits
- **Always verify `git status` is clean before starting** — stale locks, phantom branches, and CRLF noise cause cascading failures
- **Close Claude Code sessions before running git commands** — prevents index.lock conflicts
- **Run SQL migration BEFORE sprint execution** — Code's Supabase CRUD functions will fail otherwise
- **Build before AND after** — pre-flight catches existing issues, post-merge catches sprint regressions
- **Use incognito for testing** — Zustand persist middleware caches old state in localStorage
- **Frontend type values must exactly match DB CHECK constraint values** — mismatches cause silent INSERT failures
- **Don't add widgets to DEFAULT_WIDGET_LAYOUT without a merge function** — existing users have cached layouts
