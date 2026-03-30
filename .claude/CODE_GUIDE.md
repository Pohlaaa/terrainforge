# TerrainForge — Claude Code Guide

> **For Claude Code sessions in VSCode.** Code owns the full sprint lifecycle: planning, execution, testing support, and documentation updates.
> Last updated: 2026-03-30

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

## Sprint Planning Mode

When Charlie asks you to plan a sprint:
1. Read: ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md, ORCHESTRATOR.md
2. Write: `.claude/SPRINT_[N]_PROMPTS.md` following the template in `.claude/SPRINT_TEMPLATE.md`
3. Write: `supabase/migrations/[NNN]_[description].sql` if the sprint needs DB changes
4. Tell Charlie: "Sprint [N] is planned. Run migration [NNN] in Supabase SQL Editor, then tell me to execute."

## Sprint Execution Mode

When Charlie says to execute:
```
Read .claude/CODE_GUIDE.md and .claude/SPRINT_[N]_PROMPTS.md, then execute all tasks autonomously. Branch: sprint-[N]-[description]. One commit per task. Create PR when done using "C:\Program Files\GitHub CLI\gh.exe".
```

---

## Per-Task Execution Cycle

1. **Read** the task from the sprint prompt file
2. **Implement** changes across all specified files
3. **Build** — `npm run build`. If TypeScript errors, fix before proceeding.
4. **Commit** — format: `S[sprint]-[task]: [description]`
5. **Next task** — repeat until all tasks complete
6. **PR** — create one PR for the entire sprint branch

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

### TypeScript
- No `any` types — use interfaces from `src/types/index.ts`
- Imports use `@/` alias: `import { Project } from '@/types'`
- Business logic lives in `src/lib/`, never in components

### Supabase
- ALL writes go through `src/services/supabaseData.ts`
- Always include `org_id` on inserts
- Use `onSupabaseError()` for error reporting (wired to toast notifications)
- Field mapping: frontend camelCase ↔ DB snake_case via `toSnakeCase()`/`toCamelCase()`
- Special mappings: `totalArea` → `total_area_sqft`, `area` → `area_sqft`, `perimeter` → `perimeter_lnft`
- `client` field stripped before INSERT (DB expects `client_id` FK, unused)
- Send NULL (not 0) for optional numeric fields with CHECK constraints

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

## What Code Should NOT Do

- Don't start a dev server (`npm run dev`) — Charlie tests locally
- Don't deploy to Netlify — Charlie deploys manually
- Don't run SQL against Supabase — Charlie runs migrations manually
- Don't modify `.env.local` or any secrets file
- Don't delete files outside `src/` without explicit instruction

---

## Context Files

### For Planning
1. `ORCHESTRATOR.md` — full project knowledge base, Supabase rules, session model
2. `ROADMAP.md` — milestone plan, what to build next
3. `CONTEXT.md` — current state, open bugs, git state
4. `CONSIDERATIONS.md` — backlog items, design decisions
5. `EXECUTION.md` — workflow, testing protocol, lifecycle phases

### For Execution
1. This file (`CODE_GUIDE.md`) — execution workflow
2. `SPRINT_[N]_PROMPTS.md` — sprint tasks
3. `DESIGN_SYSTEM.md` — if the sprint involves visual changes
4. `TESTING/FINDINGS.md` — open bugs and known issues
5. `AI_PRODUCT.md` — if the sprint involves AI features

---

## SQL Migrations

- Write migration files to `supabase/migrations/[NNN]_[description].sql`
- Each migration is idempotent (`IF NOT EXISTS`, `DROP IF EXISTS + CREATE`)
- Note in commit message: "SQL migration required — run [filename] in Supabase SQL Editor"
- Charlie runs these manually BEFORE testing

---

## Post-Sprint

After all tasks complete:
1. Verify `npm run build` passes with zero errors
2. Push branch and create PR
3. **Provide Charlie with the post-sprint command block** (fill in actual branch name):
   ```powershell
   cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
   git checkout main
   git merge [branch]
   git push origin main
   git branch -d [branch]
   npm run build
   npm run dev
   ```
4. Tell Charlie to open `http://localhost:3000` in incognito and run through the test checklist
5. Wait for Charlie's test report: PASS / PARTIAL / FAIL
6. If PARTIAL or FAIL: write a hotfix prompt, execute it, provide new merge block
7. After PASS: update CONTEXT.md with sprint results