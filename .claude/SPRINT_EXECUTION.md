# TerrainForge — Autonomous Sprint Execution Guide

## Purpose
This document defines how Claude Code should execute sprints autonomously. The goal: Charlie kicks off a sprint with a single prompt, Code runs through all tasks end-to-end (code, test, debug, commit, merge, repeat), and Charlie reviews the final result on staging.

## Single-Prompt Sprint Execution

Instead of separate prompts per task, each sprint has ONE master prompt that Code executes sequentially. The prompt references this file for workflow rules.

### How Charlie kicks off a sprint:
```
Read .claude/SPRINT_EXECUTION.md and .claude/SPRINT_[N]_PROMPTS.md, then execute the full sprint autonomously. Follow the execution workflow in SPRINT_EXECUTION.md. Commit and merge each task before moving to the next.
```

That's it. One prompt, full sprint.

## Execution Workflow (for Code to follow)

### Per-Task Cycle:
1. **Read** the task requirements from the sprint prompt file
2. **Implement** the changes across all specified files
3. **Build** — run `npm run build` from the repo root. If TypeScript errors, fix them before proceeding.
4. **Commit** with the format: `S[sprint]-[task]: [description]`
5. **Create PR** against `main` with a one-line body
6. **Merge PR** immediately with `--squash`
7. **Move to next task**

### Git Workflow:
```bash
# After implementing changes:
git checkout -b claude/sprint-[N]-task-[T]
git add -A
git commit -m "S[N]-[T]: [description]"
git push origin claude/sprint-[N]-task-[T]
gh pr create --title "S[N]-[T]: [description]" --body "[one-line summary]" --base main
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

### Error Recovery:
- If `npm run build` fails: fix the TypeScript errors, rebuild, then commit
- If a PR merge conflicts: rebase onto main, resolve conflicts, force-push the branch, then merge
- If a Supabase query fails at runtime: add `[TF-DEBUG]` logging, check RLS policies, check column constraints
- Never skip a failing build — always fix before moving on

### Validation Gates:
- Every task must pass `npm run build` with zero errors
- Database schema changes: note them clearly in the commit message with exact SQL for Charlie to run manually
- Any SQL that needs to be run in Supabase should be written to a file: `.claude/SQL/sprint_[N]_migrations.sql`

### What Code Should NOT Do:
- Don't start a dev server (worktrees can't resolve node_modules)
- Don't deploy to Netlify (GitHub push triggers auto-deploy)
- Don't run SQL against Supabase (Charlie does this manually)
- Don't modify `.env.local` or any secrets file

## File Organization Rules

### Sprint Prompt Files:
- `.claude/SPRINT_[N]_PROMPTS.md` — master prompt for each sprint
- Keep all historical sprint prompts (they're the project's institutional memory)

### SQL Migrations:
- `.claude/SQL/sprint_[N]_migrations.sql` — any DB changes needed for the sprint
- Each migration is idempotent (uses IF NOT EXISTS, DROP IF EXISTS + CREATE)
- Charlie runs these manually in Supabase SQL Editor before testing

### Worktree Cleanup:
- After each sprint, delete all worktree directories: `.claude/worktrees/*/`
- These are temporary build artifacts and consume ~200MB each
- Git worktree references should also be pruned: `git worktree prune`

## Context Files Code Must Read Before Each Sprint

1. `CLAUDE.md` — master project context (architecture, tech stack, data flow)
2. `.claude/DEVELOPMENT.md` — code standards, RLS rules, review checklist
3. `.claude/SPRINT_EXECUTION.md` — this file (workflow rules)
4. `.claude/SPRINT_[N]_PROMPTS.md` — the actual sprint tasks
5. `.claude/TESTING/FINDINGS.md` — open bugs and known issues
6. `.claude/AI_PRODUCT.md` — if the sprint involves AI features

## Post-Sprint Checklist (for Charlie)

After Code completes a sprint:
1. `git pull origin main` — get all merged changes
2. `git push origin HEAD:master` — push to Netlify deploy branch
3. Run any SQL from `.claude/SQL/sprint_[N]_migrations.sql` in Supabase SQL Editor
4. Wait 2-3 minutes for Netlify deploy
5. Smoke test on staging
6. Clean up worktrees: `Remove-Item -Recurse -Force .claude\worktrees\*`
7. Report results back to Cowork for findings update
