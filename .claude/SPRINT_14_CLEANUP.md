# Sprint 14 — Project Cleanup & File Consolidation

> **Goal**: Clean up stale files, remove orphaned code, consolidate instruction files, and prune git branches — without breaking any working functionality.
>
> **Branch**: `sprint-14-cleanup`
> **CRITICAL RULE**: This sprint touches ZERO application logic. No behavior changes. Only file moves, deletions of dead code, and git hygiene. `npm run build` must pass after every task with identical output.
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-14-cleanup --title "Sprint 14: Project cleanup and file consolidation" --body "Housekeeping: remove orphaned code, consolidate instruction files, prune stale branches"`

---

## S14-1: Remove Orphaned Source Code

**Goal**: Delete unused source files and dead exports that are never imported.

**Files to delete**:
- `src/utils/formatting.ts` — orphaned, never imported anywhere. All formatting imports use `src/lib/formatting.ts`.

**Files to modify**:
- `src/services/supabase.ts` — remove the `supabaseService` object and its exports (lines after the `supabase` client creation). This object is never imported anywhere — all data operations use `supabaseData.ts`. Keep the `supabase` client export and `fetchOrg` function.

**Verification**:
1. `npm run build` passes
2. `grep -r "supabaseService" src/` returns zero matches (confirming nothing imports it)
3. `grep -r "utils/formatting" src/` returns zero matches (confirming nothing imports it)

**Acceptance criteria**:
- [ ] `src/utils/formatting.ts` deleted
- [ ] `supabaseService` removed from `supabase.ts`
- [ ] `npm run build` passes with zero errors
- [ ] No import errors anywhere

---

## S14-2: Clean Up vite-env.d.ts

**Goal**: Remove unused environment variable declarations.

**File to modify**: `src/vite-env.d.ts`

**Fix**: Remove declarations for `VITE_POSTHOG_KEY` and `VITE_SENTRY_DSN` — these are declared but never referenced in any source file. If we add PostHog or Sentry later, we'll add them back.

**Acceptance criteria**:
- [ ] `VITE_POSTHOG_KEY` and `VITE_SENTRY_DSN` removed from vite-env.d.ts
- [ ] `npm run build` passes

---

## S14-3: Move Historical Sprint Files to Archive

**Goal**: Move completed sprint prompts and superseded instruction files to `.claude/archive/` to reduce clutter in the main `.claude/` directory.

**Create directory**: `.claude/archive/sprints/`

**Files to MOVE (not delete) to `.claude/archive/sprints/`**:
- `SPRINT_1_PROMPTS.md` through `SPRINT_13_PROMPTS.md` (all 13 files)
- `SPRINT_10_5_HOTFIX.md`
- `SPRINT_12_5_HOTFIX.md`
- `SPRINT_13_5_HOTFIX.md`

**Files to MOVE to `.claude/archive/`**:
- `DEPLOYMENT_BRIEF.md` — superseded by `CODE_GUIDE.md`
- `SPRINT_12_DEPLOYMENT_BRIEF.md` — Sprint 12-specific, superseded
- `SPRINT_EXECUTION.md` — superseded by `CODE_GUIDE.md`
- `WORKFLOW.md` — superseded by `ORCHESTRATOR.md`
- `PROJECT_MANAGEMENT.md` — key content moved to `ORCHESTRATOR.md` and `CONTEXT.md`

**Create directory**: `.claude/design/`

**Files to MOVE to `.claude/design/`**:
- `design-preview-v7-tablet-density.html` (latest active preview)
- All older design previews (`design-preview.html` through `design-preview-v6-polish.html`) → `.claude/archive/design/`

**DO NOT move or modify**:
- `ORCHESTRATOR.md` — new, stays in `.claude/`
- `CODE_GUIDE.md` — new, stays in `.claude/`
- `CONTEXT.md` — stays (living document)
- `SPRINT_TEMPLATE.md` — stays (active reference)
- `DESIGN_SYSTEM.md` — stays (active reference)
- `DESIGN.md` — stays (active reference)
- `DEVELOPMENT.md` — stays (active reference, supplements CODE_GUIDE)
- `CONSIDERATIONS.md` — stays (backlog)
- `AI_PRODUCT.md` — stays (active reference)
- `BUSINESS.md` — stays (active reference)
- `MARKETING.md` — stays (active reference)
- `OPERATIONS.md` — stays (active reference)
- `UI_DESIGN_BRIEF.md` — stays (UI Design session reads it)
- `CODEBASE_MANAGEMENT.md` — stays (active reference)
- `TESTING/` — stays (active)
- `SQL/` — stays (active)

**Acceptance criteria**:
- [ ] `.claude/` directory has ~12 active files, not 30+
- [ ] `.claude/archive/sprints/` contains all historical sprint files
- [ ] `.claude/archive/design/` contains old design previews
- [ ] `.claude/design/` contains latest design preview
- [ ] `npm run build` passes (sprint files don't affect build, but verify anyway)

---

## S14-4: Update Internal File References

**Goal**: Update any references to moved files in the remaining active instruction files.

**Files to check and update**:
- `CODE_GUIDE.md` — verify all paths are correct
- `ORCHESTRATOR.md` — update any references to sprint files or old briefs
- `CONTEXT.md` — update file structure diagram
- `DESIGN_SYSTEM.md` — check for references to design preview paths

**Specific updates needed**:
- Any reference to `SPRINT_EXECUTION.md` → `CODE_GUIDE.md`
- Any reference to `DEPLOYMENT_BRIEF.md` → `CODE_GUIDE.md`
- Any reference to `WORKFLOW.md` → `ORCHESTRATOR.md`
- Any reference to `PROJECT_MANAGEMENT.md` → `ORCHESTRATOR.md`
- Design preview references: update paths to `.claude/design/` for latest

**Acceptance criteria**:
- [ ] No broken file references in active instruction files
- [ ] `npm run build` passes

---

## Execution Order

1. S14-1 (orphaned code) — changes `src/`, must build-verify
2. S14-2 (env cleanup) — changes `src/`, must build-verify
3. S14-3 (file moves) — `.claude/` only, no build impact
4. S14-4 (reference updates) — `.claude/` only, no build impact

---

## Post-Sprint: Charlie's Git Cleanup (PowerShell)

After merging this sprint, Charlie should run these commands to clean up stale git branches and worktrees:

```powershell
cd C:\path\to\terrainforge

# Prune stale worktree references
git worktree prune

# Delete stale worktree directories (saves ~376MB)
Remove-Item -Recurse -Force .claude\worktrees\adoring-maxwell
Remove-Item -Recurse -Force .claude\worktrees\bold-grothendieck
Remove-Item -Recurse -Force .claude\worktrees\epic-zhukovsky
Remove-Item -Recurse -Force .claude\worktrees\goofy-hofstadter
Remove-Item -Recurse -Force .claude\worktrees\gracious-euclid
Remove-Item -Recurse -Force .claude\worktrees\gracious-liskov
Remove-Item -Recurse -Force .claude\worktrees\infallible-dhawan

# Delete merged sprint branches (safe — all already merged to main)
git branch -d claude/sprint-7-sql-dashboard
git branch -d claude/sprint-7-task-1
git branch -d claude/sprint-7-task-2
git branch -d claude/sprint-7-task-3
git branch -d claude/sprint-7-task-4
git branch -d claude/sprint-7-task-5
git branch -d claude/sprint-7-task-6
git branch -d claude/sprint-8-task-1
git branch -d claude/sprint-8-task-2
git branch -d claude/sprint-8-task-3
git branch -d claude/sprint-8-task-4
git branch -d claude/sprint-8-task-5
git branch -d claude/sprint-10-task-1
git branch -d claude/s9-hotfix
git branch -d sprint-10.5-hotfix
git branch -d sprint-11-ship-it
git branch -d sprint-12-polish
git branch -d sprint-12.5-fixes
git branch -d sprint-13-fixes
git branch -d fix-map-pins

# Verify clean state
git branch
git worktree list
```

Expected result: only `main` and a few active worktree branches remain.
