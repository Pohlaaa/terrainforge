# TerrainForge — Dispatch Task Catalog

> Tasks you can trigger from your phone to run autonomously on your desktop PC.
> All tasks operate on: `C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge`
> Updated 2026-03-29 | Milestone 1 active

---

## Project Quick Reference

| Item | Value |
|------|-------|
| Netlify site ID | `d8efdf00-91f7-4717-aabd-d1c65372a634` |
| Staging URL | `https://terrainforge-staging.netlify.app` |
| GitHub repo | `github.com/Pohlaaa/terrainforge` |
| Main branch | `main` |
| Active milestone | M1: "Worth the Demo" |
| Current sprint | Check `.claude/CONTEXT.md` for latest |
| gh CLI path | `"C:\Program Files\GitHub CLI\gh.exe"` |
| Build command | `cd terrainforge && npm run build` |
| TS check | `cd terrainforge && npx tsc --noEmit` |

---

## Task 1: Daily Health Check

**ID:** `tf-health-check`
**Schedule:** Every day at 8:00 AM
**Purpose:** Morning status report

### Execution Steps
1. `cd terrainforge && npm run build` — verify clean build
2. `npx tsc --noEmit` — TypeScript errors
3. `git status` — uncommitted changes
4. `git log --oneline -5` — last 5 commits
5. `git branch` — open branches
6. Read `.claude/CONTEXT.md` — current sprint state
7. Read `.claude/TESTING/FINDINGS.md` — open P0/P1 issues
8. Write summary report

### Phone Trigger
> "Run the health check" / "How's the project?" / "Morning status"

---

## Task 2: Sprint Execution (Generic)

**ID:** `tf-sprint-exec`
**Schedule:** Manual only
**Purpose:** Execute any sprint given its prompt file number

### Execution Steps
1. Read `CLAUDE.md` + `.claude/CODE_GUIDE.md`
2. Read `.claude/SPRINT_[N]_PROMPTS.md`
3. Create sprint branch
4. Execute each task: implement → build → commit
5. Push branch, create PR via gh CLI
6. Write report with testing instructions

### Phone Trigger
> "Execute sprint N" / "Run sprint [number]" / "Start the sprint"

---

## Task 3: Build Verification

**ID:** `tf-build-verify`
**Schedule:** Manual only
**Purpose:** Quick sanity check without deploying

### Execution Steps
1. `npm install` — sync deps
2. `npm run build` — Vite production build
3. `npx tsc --noEmit` — strict TypeScript check
4. Report: build time, warnings, TS error count, bundle produced

### Phone Trigger
> "Does it build?" / "Run build check" / "Verify build"

---

## Task 4: Bug Investigation

**ID:** `tf-bug-investigate`
**Schedule:** Manual only
**Purpose:** Trace and diagnose a specific bug

### Execution Steps
1. Describe the bug in plain language
2. Search codebase for relevant terms
3. Trace data flow: page → store → supabaseData.ts → Supabase
4. Check RLS policies if persistence issue
5. Identify root cause with file:line references
6. If "fix it": apply change, build, commit, push, PR
7. If "just report": write-up with root cause and recommended fix

### Phone Trigger
> "Why is [X] broken?" / "Investigate [description]" / "Debug [issue]"

---

## Task 5: Weekly Sprint Summary

**ID:** `tf-weekly-summary`
**Schedule:** Every Friday at 9:00 AM
**Purpose:** End-of-week progress report

### Execution Steps
1. `git log --oneline --since="7 days ago"` — commits this week
2. Read current sprint prompt — planned vs completed
3. `git branch` + `gh pr list` — open branches and PRs
4. Read `.claude/ROADMAP.md` — milestone gate status
5. Write weekly report: commits, sprint status, PRs, milestone progress, priorities

### Phone Trigger
> "Weekly summary" / "What did we get done this week?"

---

## Task 6: Git Cleanup

**ID:** `tf-git-cleanup`
**Schedule:** Manual only
**Purpose:** Clean up merged and stale branches

### Execution Steps
1. `git fetch --all --prune`
2. `git branch -a` — list all branches
3. Identify merged + stale branches
4. Report findings — does NOT delete without approval
5. If approved: delete specified branches

### Phone Trigger
> "Clean up branches" / "Any stale branches?"

---

## Task 7: Deploy to Staging

**ID:** `tf-deploy`
**Schedule:** Manual only
**Purpose:** Deploy current main to Netlify staging

### Execution Steps
1. `npm run build` — verify build passes
2. `npx tsc --noEmit` — verify no TS errors
3. `git status` — verify clean working tree
4. Deploy via Netlify MCP or CLI
5. Verify staging URL loads correctly
6. Report: deploy status, URL, any issues

### Phone Trigger
> "Deploy to staging" / "Push to live"

---

## Quick Reference: Phone Commands

| Say This | Task | Status |
|----------|------|--------|
| "Morning status" | tf-health-check | Ready |
| "Run the dispatch" | DAILY_DISPATCH.md | Ready |
| "Weekly summary" | tf-weekly-summary | Ready |
| "Execute sprint N" | tf-sprint-exec | Ready |
| "Does it build?" | tf-build-verify | Ready |
| "Why is [X] broken?" | tf-bug-investigate | Ad-hoc |
| "Deploy to staging" | tf-deploy | Ready |
| "Clean up branches" | tf-git-cleanup | Ready |
