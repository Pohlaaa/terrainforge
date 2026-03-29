# TerrainForge Deployment & Code Support Brief

> **Purpose**: Context file for the deployment/code support session. Read this first to understand the current state and what needs to happen.

## Infrastructure

- **Repo**: `Pohlaaa/terrainforge` on GitHub
- **Hosting**: Netlify (Git-connected auto-deploy from `master` branch)
  - Site ID: `d8efdf00-91f7-4717-aabd-d1c65372a634`
  - Team: `woodsrider82`
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth with email confirmation enabled
- **Stack**: React 18 + Vite + TypeScript + Zustand + Supabase

## Critical Git Quirk

Local branch `main` tracks remote `origin/master`. Always push with:
```bash
git push origin HEAD:master
```
Regular `git push` will fail with "upstream branch does not match."

## Sprint Status

### Sprint 8 (JUST COMPLETED by Code — needs deployment)
Tasks completed:
- S8-1: Actionable AI material suggestions (Add/Dismiss/Add All buttons)
- S8-2: Post-creation material prompt (AI suggests materials after project creation)
- S8-3: Supplier management enhancement
- S8-4: Settings page with dark/light theme toggle

### Post-Sprint 8 Checklist (Charlie needs to do):
1. `git pull origin main` — pull Code's Sprint 8 commits
2. `git push origin HEAD:master` — push to master to trigger Netlify deploy
3. Check if `.claude/SQL/sprint_8_migrations.sql` exists — if yes, run in Supabase SQL editor
4. Smoke test on staging site once Netlify deploy completes
5. Verify: AI material suggestions work, theme toggle works, supplier management works

### Sprints 5-7: All complete and deployed

## Known Patterns & Gotchas

### RLS Policy Rules (learned the hard way)
- Every new table needs all 4 CRUD policies (SELECT, INSERT, UPDATE, DELETE)
- `org_role` enum values: `{admin, designer, foreman, client}` — there is NO 'viewer'
- Always test from the frontend client, not just Supabase dashboard
- Use `DROP POLICY IF EXISTS` before `CREATE POLICY` to avoid conflicts

### Error Logging
- All Supabase writes use `[TF-DEBUG]` prefix for structured logging
- Log full error objects, not just `.message`

### Delete Pattern
- Confirm-first (not optimistic) with post-mutation refetch
- RLS DELETE policies require admin role

### Deployment Flow
- Code works in worktree branches → PRs to main → merge on GitHub
- After merge: `git pull origin main && git push origin HEAD:master`
- Netlify auto-deploys from master

### Autonomous Sprint Execution
- Sprint prompts live in `.claude/SPRINT_[N]_PROMPTS.md`
- Execution workflow in `.claude/SPRINT_EXECUTION.md`
- Single-prompt kickoff: "Read .claude/SPRINT_EXECUTION.md and .claude/SPRINT_[N]_PROMPTS.md, then execute the full sprint autonomously."
- Per-task cycle: implement → build → commit → PR → merge → next task

## Disk Cleanup (optional but recommended)

Previously identified ~823MB of dead worktrees and deploy artifacts. PowerShell commands to clean:
```powershell
# From the terrainforge repo root
git worktree list  # check for stale worktrees
git worktree prune  # clean up stale worktree references
# Then manually delete any leftover worktree directories
```

## Key Files

- `.claude/PROJECT_MANAGEMENT.md` — sprint tracking, Phase 1 gate criteria
- `.claude/DEVELOPMENT.md` — development standards, RLS rules, code review checklist
- `.claude/TESTING/FINDINGS.md` — bug log, findings F-001 through F-031
- `.claude/SPRINT_EXECUTION.md` — autonomous sprint workflow
- `.claude/SPRINT_8_PROMPTS.md` — Sprint 8 task definitions
- `.claude/SQL/sprint_7_migrations.sql` — latest SQL migrations (already run)

## What's Next for Code

After Sprint 8 is deployed and verified:
1. Sprint 9 planning — implementing the design system from the UI iteration session
2. Design tokens → CSS custom properties mapping
3. Component library build-out (cards, panels, buttons, forms matching v3 preview)
4. Widget system implementation
5. Map integration with Mapbox GL JS
6. Onboarding flow
