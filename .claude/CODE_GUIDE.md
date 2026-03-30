# TerrainForge — Claude Code Execution Guide

> **For Claude Code sessions.** Read this file + the sprint prompt file, then execute autonomously.
> Replaces: SPRINT_EXECUTION.md, DEPLOYMENT_BRIEF.md, SPRINT_12_DEPLOYMENT_BRIEF.md

---

## Kickoff

Charlie starts a sprint with one prompt:
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

## Context Files to Read Per Sprint

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
2. Create PR with summary of all changes
3. Report completion with table: Task | Change | Files modified
