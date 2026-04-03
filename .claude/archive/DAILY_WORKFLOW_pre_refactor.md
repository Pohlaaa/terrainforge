# TerrainForge — Autonomous Development Workflow

> **What this file is**: The operational playbook for Charlie's daily development rhythm. Describes how Cowork (strategy) and Code (execution) run autonomously while Charlie works his day job, with evening merge/test sessions.
>
> **Last updated**: 2026-03-31 (batch execution model)

---

## Daily Rhythm

### Morning (~10 min)

Charlie kicks off the day's work:

1. **Check SPRINT_LOG.md** — anything left from last night's testing?
2. **Run all SQL migrations** listed in the batch prompts (Supabase SQL Editor)
3. **Kick off Code** with the batch command:
   > "Read .claude/CODE_GUIDE.md, then execute SPRINT_[N] through SPRINT_[M] in sequence."
4. **If hotfix needed from last night**: Cowork writes a hotfix prompt, Code executes it first

That's it. Code chains all sprints in the batch autonomously — one branch, one PR at the end.

### During the Day (autonomous)

**Code** (in VSCode):
- Executes ALL sprints in the batch on one branch (implement, self-verify, build, commit, next sprint)
- Creates ONE PR when the entire batch is complete
- If Code finishes early: it stops. Charlie merges and tests in the evening.

**Cowork** (when Charlie opens a session):
- Batch checkpoint every 3-5 sprints
- Prepare next sprint prompts
- Strategy discussions, file maintenance
- Charlie can approve decisions from phone

### Evening Session (30 min to 2+ hours, variable)

Charlie's merge/test cycle:

1. **Check Code's batch PR** — review the diff, verify self-verification passed
2. **Merge the batch branch** + build + test:
   ```powershell
   cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
   git checkout main
   git merge batch-sprint-[N]-to-[M]
   git push origin main
   git branch -d batch-sprint-[N]-to-[M]
   npm run build
   npm run dev
   ```
3. **Run each sprint's test checklist** (open localhost in incognito)
4. **Report result**: PASS / PARTIAL / FAIL
5. **Update SPRINT_LOG.md** for each sprint in the batch (~2 min per sprint)
6. **If time permits**: kick off the next batch for overnight work

### Batch Checkpoint (every 3-5 sprints)

Cowork runs this when Charlie opens a strategy session:

1. Read CONTEXT.md, ROADMAP.md, SPRINT_LOG.md
2. Archive processed sprint log entries
3. Flag priority shifts from testing feedback
4. Prepare next batch of sprint prompts
5. Update ROADMAP.md if milestones shift
6. Update CONSIDERATIONS.md with new backlog items

---

## Sprint Execution Flow (Detail)

```
Charlie     -> runs SQL migrations, kicks off Code with batch range
Code        -> reads CODE_GUIDE.md
Code        -> creates branch: batch-sprint-N-to-M
Code        -> for each sprint in batch:
                read SPRINT_[N]_PROMPTS.md
                for each task:
                  read target files
                  implement changes
                  npm run build (fix errors)
                  self-verify (checklist from prompt)
                  commit: S[N]-[task]: description
                run regression checklist
                commit: S[N]: sprint complete, build passing
                continue to next sprint (DO NOT STOP)
Code        -> after last sprint: push branch, create ONE PR
Code        -> update CONTEXT.md, archive all sprint prompts
Code        -> DONE (waits for Charlie)
Charlie     -> merges batch, tests all sprints, reports PASS/FAIL
Charlie     -> updates SPRINT_LOG.md for each sprint
Charlie     -> kicks off next batch (or stops for the night)
```

---

## What Goes Where

| Decision | Who Decides | When |
|----------|-------------|------|
| What to build next | Cowork + Charlie | Batch checkpoints |
| Sprint task details | Cowork | Prompt prep sessions |
| How to implement | Code | During sprint execution |
| Ship/no-ship | Charlie | Evening test sessions |
| Priority shifts | Charlie + Cowork | After testing feedback |
| Milestone advancement | Cowork | Batch checkpoints |

---

## Scaling Up (Multiple Sessions)

Currently Code runs one session at a time. To increase throughput:

**When it's safe to parallelize:**
- Sprints that touch completely different parts of the codebase (e.g., landing page vs. env docs)
- Documentation-only tasks alongside code tasks
- Cowork strategy session while Code executes a sprint

**When it's NOT safe to parallelize:**
- Two sprints that modify the same files (merge conflicts)
- A sprint that depends on the previous sprint's output
- Any sprint that modifies App.tsx routing (only one at a time)

**How to scale when ready:**
1. Split independent tasks into separate mini-sprints with non-overlapping file scopes
2. Run Code Session A on sprint N, Code Session B on sprint N+1 (if independent)
3. Merge in order: sprint N first, then sprint N+1
4. Always test after each merge, not after both

For M3 sprints 37-40, the dependency chain is linear (each depends on the previous), so they run sequentially. M4 sprints can be designed for parallelism from the start.

---

## Communication Protocol

**Charlie to Cowork**: Opens a Cowork session, describes what he needs. Cowork asks clarifying questions, then executes.

**Cowork to Charlie**: Provides summaries, asks for decisions. Charlie can approve from phone.

**Cowork to Code**: Writes sprint prompts. Code reads them autonomously. No live interaction needed.

**Code to Charlie**: Creates PR with summary. Charlie reviews in GitHub app or evening session.

**Charlie to Code**: Kicks off sessions with the standard command. Reports PASS/FAIL after testing.

---

## Key Principles

1. **Batch prep over just-in-time**: Sprint prompts are written in advance, not improvised when Code starts.
2. **Self-verification reduces rework**: Code checks its own work before PR. Target: under 10% hotfix rate (down from 20%).
3. **Charlie's time is the bottleneck**: Every process decision should minimize the manual steps Charlie needs to take.
4. **Evening time is variable**: Some nights Charlie has 30 minutes, some nights 2+ hours. The workflow adapts — merge 1 sprint or merge 3.
5. **Files are documentation**: Every sprint prompt is archived. Every decision is traceable. No tribal knowledge.
