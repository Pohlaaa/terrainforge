# TerrainForge — Execution Model

> **Purpose**: How we build, test, and ship code. Covers the full loop from sprint prompt through testing.
> **Audience**: Claude Code (VSCode), Cowork, and Charlie.
> **Last updated**: 2026-03-30

---

## 1. Two-Mode Workflow

### VSCode + Claude Code (PRIMARY — planning, execution, and testing)
Claude Code in VSCode is the primary environment for ALL sprint work: planning, writing sprint prompts, writing migrations, executing code, and generating post-sprint test/merge instructions.

**Why VSCode owns everything**:
- Direct file access — reads/writes `.claude/` docs and `src/` code natively
- Lower token usage — no MCP overhead, no cross-session copy-pasting
- Full lifecycle — plan a sprint, write the prompt, execute it, all in one session
- Integrated terminal — git, npm, build output all in one place
- No context-switching tax — Charlie doesn't relay between Cowork and VSCode

**Setup** (one-time):
1. Open VSCode in the terrainforge directory: `code C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge`
2. Claude Code extension reads `CLAUDE.md` at project root automatically

**What Code does**:
- Reads ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md to plan sprints
- Writes SPRINT_[N]_PROMPTS.md with all tasks, types, file paths, test cases
- Writes SQL migration files in `supabase/migrations/`
- Executes sprint code (branch, implement, build, commit, PR)
- Writes hotfix prompts when tests fail
- Updates CONTEXT.md, ORCHESTRATOR.md after sprints
- Provides the post-sprint command block for Charlie to merge/build/test

### Cowork (STRATEGIC only — not for sprint work)
Use Cowork for:
- Business strategy, roadmap decisions, milestone evaluation
- Non-code deliverables (pitch decks, marketing docs, presentations)
- UI Design preview production
- Remote dispatch from phone (see REMOTE_WORKFLOW.md)
- Onboarding a new Cowork session when context is needed

Cowork does NOT:
- Plan or write sprint prompts (Code does this now)
- Write SQL migrations (Code does this now)
- Coordinate sprint execution (Code does this now)
- Interact with git or the codebase (causes index.lock and path issues)

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
If build fails: report to Claude Code, which writes and executes a hotfix prompt.

### Step 2: Start Local Dev Server
```powershell
npm run dev
```
Open `http://localhost:3000` in an incognito browser window (avoids cached state).

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
Charlie reports back to Claude Code in VSCode:
- PASS — all tests passed, ready to deploy
- PARTIAL — some issues found (list them)
- FAIL — blocking issues (list them)

If PARTIAL or FAIL: Code writes a hotfix prompt (`SPRINT_[N]_5_HOTFIX.md`), executes it, repeat.

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
- **ALWAYS** as a `.sql` file in `supabase/migrations/[NNN]_[description].sql`
- Sprint prompt docs (`.claude/SPRINT_*.md`) REFERENCE the migration file — they do NOT embed the SQL inline
- This keeps all SQL in one canonical location and matches the project file structure

### Charlie's Steps
1. Open the migration file at `supabase/migrations/[NNN]_[description].sql`
2. Copy/paste into Supabase SQL Editor (https://supabase.com/dashboard)
3. Run it
4. Verify: check table/column/policy exists in the Table Editor
5. THEN merge the sprint PR and test locally

### Migration Rules (for Orchestrator writing prompts)
- Every migration is idempotent: `CREATE TABLE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`
- Include RLS policies in the same migration
- Include CHECK constraints — NEVER use Postgres ENUM types
- Note which migration must run before testing
- **NEVER embed SQL in markdown docs** — always write a `.sql` file and reference it

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

### For Sprint Planning (Code now handles this)
| Priority | File | Purpose |
|----------|------|---------|
| 1 | `CLAUDE.md` (project root) | Architecture rules, naming, what NOT to do |
| 2 | `.claude/ORCHESTRATOR.md` | Full project knowledge base, session model, Supabase rules |
| 3 | `.claude/ROADMAP.md` | Milestone plan, what to build next |
| 4 | `.claude/CONTEXT.md` | Current sprint state, open bugs, git state |
| 5 | `.claude/CONSIDERATIONS.md` | Backlog items, design decisions pending |
| 6 | `.claude/EXECUTION.md` | This file — workflow, testing protocol |

### For Sprint Execution
| Priority | File | Purpose |
|----------|------|---------|
| 1 | `CLAUDE.md` (project root) | Architecture rules, naming, what NOT to do |
| 2 | `.claude/CODE_GUIDE.md` | Execution workflow, git, build commands |
| 3 | `.claude/SPRINT_[N]_PROMPTS.md` | Sprint tasks — the actual work |
| 4 | `.claude/DESIGN_SYSTEM.md` | If sprint has visual tasks |
| 5 | `.claude/AI_PRODUCT.md` | If sprint has AI tasks |
| 6 | `.claude/TESTING/FINDINGS.md` | Open bugs to avoid regressing |

### For Strategic/Business (Cowork only)
BUSINESS.md, MARKETING.md, OPERATIONS.md — not needed for sprint work.

---

## 8. Sprint Lifecycle — Complete Workflow

This is the repeatable loop for every sprint. Charlie executes steps marked with **(C)**. Claude Code handles **(CC)** — both planning and execution now live in VSCode.

### Phase A: Plan (CC — Claude Code in VSCode)
1. (CC) Read ROADMAP.md, CONTEXT.md, CONSIDERATIONS.md, ORCHESTRATOR.md
2. (CC) Write SPRINT_[N]_PROMPTS.md with all tasks, types, file paths, and test section
3. (CC) Write SQL migration file in `supabase/migrations/` if sprint adds DB features
4. (CC) Update CONTEXT.md with sprint status
5. (CC) Tell Charlie: "Sprint [N] is planned. Run migration [NNN] in Supabase SQL Editor, then tell me to execute."

### Phase B: Pre-Flight (C — Charlie)
1. (C) Run SQL migration in Supabase SQL Editor if sprint has one (open the `.sql` file from `supabase/migrations/`)
2. (C) Tell Code to execute

### Phase C: Execute (CC — Claude Code in VSCode)
1. (CC) Read CODE_GUIDE.md + SPRINT_[N]_PROMPTS.md
2. (CC) Create branch, implement all tasks, build, commit per task, push, create PR
3. (C) Wait for PR creation confirmation — do NOT interact with Claude Code during execution

### Phase D: Merge, Build, Launch, Test (C — Charlie in PowerShell + Browser)

After Code finishes, it provides the post-sprint command block with the branch name filled in. Charlie copy-pastes it into PowerShell.

**Post-sprint command block template**:
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
2. (C) Open `http://localhost:3000` in incognito (avoids cached localStorage state)
3. (C) Run through test cases from the "What to Test" section of the sprint prompt
4. (C) Report results to Code: PASS / PARTIAL / FAIL

### Phase E: Fix if Needed (CC — Claude Code in VSCode)
1. (CC) If PARTIAL or FAIL: write SPRINT_[N]_5_HOTFIX.md, then execute it
2. (CC) Create PR for hotfix
3. (C) Merge, re-test — repeat until PASS

### Phase F: Wrap Up (CC + C)
1. (CC) Update CONTEXT.md and ORCHESTRATOR.md with sprint results
2. (C) Commit untracked .claude/ docs:
   ```powershell
   git add .claude/ supabase/migrations/ CLAUDE.md
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
- **SQL files live in `supabase/migrations/`** — never embed SQL inline in markdown docs
- **Frontend type values must exactly match DB CHECK constraint values** — mismatches cause silent INSERT failures
