# TerrainForge — Execution Model

> **Purpose**: How we build, test, and ship code. Covers the full loop from sprint prompt through testing.
> **Audience**: Orchestrator, Claude Code, and Charlie.
> **Last updated**: 2026-03-29

---

## 1. Development Environments

### VSCode + Claude Code Extension (PRIMARY — use for all coding sprints)
Charlie has VSCode installed with the Claude Code extension. This is the primary execution environment for all sprint work going forward.

**Why VSCode over Cowork for code execution**:
- Lower token usage — Claude Code in VSCode has direct file access without MCP overhead
- Better context — VSCode extension can read/write files natively, run terminal commands, and see build output
- Persistent workspace — no session timeout, no context window limits during long coding runs
- Extension features — inline diff review, integrated terminal, git integration

**Setup** (one-time):
1. Open VSCode in the terrainforge directory: `code C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge`
2. Claude Code extension reads `CLAUDE.md` at project root automatically
3. Sprint kickoff: paste the kickoff prompt into Claude Code chat

**Sprint kickoff prompt for VSCode Claude Code**:
```
Read .claude/CODE_GUIDE.md and .claude/SPRINT_[N]_PROMPTS.md, then execute all tasks autonomously. Branch: sprint-[N]-[description]. One commit per task. Create PR when done using "C:\Program Files\GitHub CLI\gh.exe".
```

### Cowork (for Orchestrator + UI Design + remote dispatch)
- Sprint planning, file production, coordination
- UI Design preview production
- Remote dispatch from phone (see REMOTE_WORKFLOW.md)
- NOT for coding sprints — use VSCode Claude Code instead

### Key Paths
| Context | Path |
|---------|------|
| Windows (PowerShell/VSCode) | `C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge` |
| Cowork VM | `/sessions/[session-name]/mnt/Terrain Forge/terrainforge` |
| GitHub | `github.com/Pohlaaa/terrainforge` |
| Staging | `terrainforge-staging.netlify.app` |
| gh CLI | `"C:\Program Files\GitHub CLI\gh.exe"` |

---

## 2. Sprint Prompt Design for Uninterrupted Execution

The goal is that Claude Code reads the sprint prompt and executes ALL tasks without stopping to ask questions. Every sprint prompt must be self-contained.

### What Every Sprint Prompt Must Include

**Per task**:
1. **Goal** — one sentence
2. **Files to create/modify** — explicit paths (`src/pages/Schedule.tsx`, not "create a schedule page")
3. **Design reference** — which preview file and section (if visual)
4. **Implementation details** — specific enough that Code makes ZERO design decisions
5. **Supabase considerations** — table names, column names, RLS policy requirements, CHECK constraints
6. **New types** — full TypeScript interface definitions for any new data structures
7. **Store changes** — exact function signatures and state shape additions
8. **Acceptance criteria** — testable by `npm run build`
9. **Dependencies** — which tasks must complete first

**Per sprint**:
1. **Branch name** — exact: `sprint-[N]-[description]`
2. **PR command** — full `gh.exe` command with title and body
3. **SQL migrations** — complete SQL files included inline or as separate files
4. **Context files to read** — list of `.claude/` files Code should read before starting
5. **Regression checks** — what existing features to verify still work after each task

### What Makes Code Stop (avoid these)
- Ambiguous instructions: "make it look good" — specify exact CSS tokens
- Missing type definitions: Code will try to infer types and may guess wrong
- Unclear data flow: "hook it up to the store" — specify which store, which function, which state key
- Unspecified file names: "create a new component" — give the exact path
- Missing DB schema: "save to database" — specify table, columns, RLS policies

### Sprint Prompt Template
The template lives at `.claude/SPRINT_TEMPLATE.md`. Every sprint prompt follows this format.

---

## 3. Claude Code Execution Cycle

### Per-Task Cycle (Code follows this automatically)
```
1. READ the task from sprint prompt
2. READ all target files + referenced components/stores
3. IMPLEMENT changes across all specified files
4. BUILD — npm run build. Fix TypeScript errors before proceeding.
5. COMMIT — format: S[sprint]-[task]: [description]
6. NEXT — repeat until all tasks complete
```

### Per-Sprint Cycle
```
1. Read CODE_GUIDE.md + SPRINT_[N]_PROMPTS.md
2. Create branch: git checkout -b sprint-[N]-[description]
3. Execute all tasks (per-task cycle above)
4. Final build verification: npm run build
5. Push: git push origin sprint-[N]-[description]
6. PR: gh.exe pr create --base main ...
```

### What Code Should NOT Do
- Start a dev server (`npm run dev`) — Charlie tests locally
- Deploy to Netlify — Charlie deploys manually
- Run SQL against Supabase — Charlie runs migrations manually
- Modify `.env.local` or any secrets
- Delete files outside `src/` without explicit instruction
- Make product decisions — execute what's in the sprint prompt

---

## 4. Post-Sprint Testing Protocol

After Code completes a sprint and creates a PR, Charlie follows this protocol.

### Step 1: Merge and Build
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git merge [sprint-branch-name]
npm run build
```
If build fails: report to Orchestrator, who writes a hotfix prompt.

### Step 2: Start Local Dev Server
```powershell
npm run dev
```
Open `http://localhost:5173` in an incognito browser window (avoids cached state).

### Step 3: Sprint-Specific Tests
Every sprint prompt includes a **"What to Test"** section at the bottom. This section lists:
- New features to verify (with exact click paths)
- Existing features to regression-check
- Edge cases to try
- Expected behavior for each test

**Format in sprint prompts**:
```markdown
## Post-Sprint: What to Test

### New Features
1. [Feature] — [How to test] → [Expected result]

### Regression Checks
1. [Existing feature] — [How to verify it still works] → [Expected result]

### Edge Cases
1. [Scenario] — [What to try] → [Expected result]
```

### Step 4: Report Results
Charlie reports back to Orchestrator:
- PASS — all tests passed, ready to deploy
- PARTIAL — some issues found (list them)
- FAIL — blocking issues (list them)

If PARTIAL or FAIL: Orchestrator writes a hotfix prompt (`SPRINT_[N]_5_HOTFIX.md`), Code executes it, repeat.

### Step 5: Deploy (when ready)
```powershell
git push origin HEAD:main
```
Netlify watches `main` branch. Auto-deploy is OFF — deploy manually in Netlify dashboard or via CLI:
```powershell
npx netlify-cli deploy --prod --dir=dist
```

---

## 5. SQL Migration Protocol

Sprints that add DB features include migration files.

### Where Migrations Live
- Sprint prompt includes full SQL inline
- Also saved to `supabase/migrations/[NNN]_[description].sql`

### Charlie's Steps
1. Open Supabase SQL Editor (https://supabase.com/dashboard)
2. Copy/paste the migration SQL
3. Run it
4. Verify: check table/column/policy exists in the Table Editor
5. THEN merge the sprint PR and test locally

### Migration Rules (for Orchestrator writing prompts)
- Every migration is idempotent: `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`
- Include RLS policies in the same migration
- Include CHECK constraints
- Note which migration must run before testing

---

## 6. Remote Dispatch (Phone Workflow)

See `REMOTE_WORKFLOW.md` for full detail. Summary:

- Desktop must be on with Cowork running
- Scheduled tasks (health check, weekly summary) run on cron
- Sprint execution can be triggered from phone
- Sprint prompts must be pre-loaded in `.claude/` before dispatch
- Reports are written to session transcripts — check from phone

---

## 7. File Inventory — What Code Reads

When Code starts a sprint, it reads files in this order:

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `CLAUDE.md` (project root) | Architecture rules, naming, what NOT to do |
| 2 | `.claude/CODE_GUIDE.md` | Execution workflow, git, build commands |
| 3 | `.claude/SPRINT_[N]_PROMPTS.md` | Sprint tasks — the actual work |
| 4 | `.claude/DESIGN_SYSTEM.md` | If sprint has visual tasks |
| 5 | `.claude/AI_PRODUCT.md` | If sprint has AI tasks |
| 6 | `.claude/TESTING/FINDINGS.md` | Open bugs to avoid regressing |

Code does NOT need to read: ORCHESTRATOR.md, ROADMAP.md, BUSINESS.md, MARKETING.md, OPERATIONS.md. Those are for Orchestrator planning sessions.

---

## 8. Sprint Lifecycle — Complete Workflow

This is the repeatable loop for every sprint. Charlie executes steps marked with (C). Orchestrator handles (O). Claude Code handles (CC).

### Phase A: Plan (O — Orchestrator in Cowork)
1. (O) Read ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md
2. (O) Write SPRINT_[N]_PROMPTS.md with all tasks, types, file paths, and test section
3. (O) Write SQL migration file if sprint adds DB features
4. (O) Update CONTEXT.md with sprint status

### Phase B: Pre-Flight (C — Charlie in PowerShell)
1. (C) Verify clean git state:
   ```powershell
   cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
   git status          # should be clean or only untracked .claude/ files
   git log --oneline -3  # confirm you're on main at the right commit
   ```
2. (C) Run SQL migration in Supabase SQL Editor (if sprint has one)
3. (C) Verify build passes before handing off: `npm run build`

### Phase C: Execute (CC — Claude Code in VSCode)
1. (C) Open VSCode with terrainforge folder
2. (C) Paste the kickoff prompt into Claude Code:
   ```
   Read .claude/CODE_GUIDE.md and .claude/SPRINT_[N]_PROMPTS.md, then execute all tasks autonomously. Branch: sprint-[N]-[description]. One commit per task. Create PR when done using "C:\Program Files\GitHub CLI\gh.exe".
   ```
3. (CC) Claude Code reads files, creates branch, implements, builds, commits per task, pushes, creates PR
4. (C) Wait for PR creation confirmation — do NOT interact with Claude Code during execution

### Phase D: Merge, Build, Launch, Test (C — Charlie in PowerShell + Browser)

**IMPORTANT**: After Claude Code finishes a sprint, Orchestrator ALWAYS provides the full post-sprint command block below (with the actual branch name filled in). Charlie copies and pastes the entire block into PowerShell.

**Post-sprint command block** (Orchestrator fills in `[branch]` each time):
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git checkout main
git merge [branch]
git push origin main
git branch -d [branch]
npm run build
npm run dev
```

After pasting:
1. (C) Confirm build passes (zero errors)
2. (C) Open `http://localhost:5173` in incognito (avoids cached localStorage state)
3. (C) Run through test cases in `.claude/TESTING/SPRINT_[N]_TESTS.md`
4. (C) Report results to Orchestrator: PASS / PARTIAL / FAIL

### Phase F: Fix if Needed
1. (O) If PARTIAL or FAIL: write SPRINT_[N]_5_HOTFIX.md
2. (C) Paste hotfix kickoff into VSCode Claude Code
3. (CC) Execute hotfix, create PR
4. (C) Merge, re-test — repeat until PASS

### Phase G: Wrap Up
1. (O) Update CONTEXT.md with sprint results
2. (C) Commit untracked .claude/ docs:
   ```powershell
   git add .claude/ supabase/migrations/
   git commit -m "docs: add Sprint [N] orchestration files"
   git push origin main
   ```

### Key Rules Learned
- **Never interact with Claude Code during sprint execution** — it causes context breaks and partial commits
- **Always verify `git status` is clean before starting** — stale locks, phantom branches, and CRLF noise cause cascading failures
- **Close Claude Code sessions before running git commands** — prevents index.lock conflicts
- **Run SQL migration BEFORE sprint execution** — Code's Supabase CRUD functions will fail otherwise
- **Build before AND after** — pre-flight build catches existing issues, post-merge build catches sprint regressions
- **Use incognito for testing** — Zustand persist middleware caches old state in localStorage
