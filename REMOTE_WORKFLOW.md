# TerrainForge — Remote Dispatch Workflow

> Strategy for running autonomous development from your phone while away from the desktop.
> Updated 2026-03-29 | Milestone 1 active — scheduling + crew app

---

## The Model

Your desktop runs Cowork with `C:\Users\PohlaDesk\Documents\AI\Terrain Forge` mounted.
Scheduled tasks execute on your desktop — they have full access to the project files, shell,
Netlify MCP, and git. From the Claude app on your phone you can trigger tasks, check results,
and give direction. Your desktop does the building.

**Pre-load at the desktop. Dispatch and monitor from anywhere.**

---

## Current Project State

| Item | Status |
|------|--------|
| Milestone | M1: "Worth the Demo" — scheduling + crew app |
| Last sprint | Sprint 14 (Cleanup) — complete |
| Next sprint | Sprint 15 (Scheduling, manager side) |
| Staging | terrainforge-staging.netlify.app (behind — preserving build minutes) |
| Netlify Site ID | d8efdf00-91f7-4717-aabd-d1c65372a634 |
| GitHub | github.com/Pohlaaa/terrainforge, branch: main |
| Roadmap | `.claude/ROADMAP.md` |

---

## Three Tiers of Automation

### Tier 1 — Scheduled (Runs Without You)
Tasks set on a cron schedule. You wake up to results.

- **Daily health check** — 8 AM every day: build status, git state, TypeScript errors
- **Weekly sprint summary** — Friday 9 AM: what shipped, what's pending, recommended priorities

### Tier 2 — On-Demand (One-Liner From Phone)
Pre-loaded tasks. Open Cowork on your phone, say the trigger phrase, it runs.

- Deploy to staging
- Run build verification
- Execute a sprint (reads SPRINT_N_PROMPTS.md, implements, commits, pushes PR)
- Investigate a bug
- Git cleanup

### Tier 3 — Autonomous Daily (The Power Move)
A single master prompt that orients itself, finds what needs doing, executes, verifies,
and reports — all without you. See DAILY_DISPATCH.md for the exact prompt.

---

## Phone Workflow

### Starting Work Remotely
1. Open Claude app on phone
2. Open or start a Cowork session
3. Say the trigger phrase (see DISPATCH_TASKS.md quick reference)
4. Check back when you get a completion notification

### Checking Results
Ask: "What happened with the last sprint?" or "Show me the health check results."
Session transcripts hold full detail. For code — check GitHub mobile for PRs and commits.

### Quick Fixes From Phone
Describe the issue in plain language. The session reads the relevant files, traces the
problem, applies the fix, verifies the build, commits, and pushes a branch. You review on GitHub.

---

## Integration With Execution Model

| Role | What It Does | Where It Lives |
|------|-------------|----------------|
| Orchestrator (Cowork) | Sprint planning, coordination, dispatch | Works from phone or desktop |
| Claude Code (VSCode) | Autonomous sprint execution from prompt file | Desktop — primary code executor |
| Scheduled tasks | Build checks, deploy, health monitoring | Runs on desktop even when you're away |
| UI Design (Cowork) | HTML design previews and specs | Desktop preferred |

### What Changes With Remote Dispatch
- Sprint prompts (already written in `.claude/SPRINT_N_PROMPTS.md`) become the input for dispatch tasks
- You don't need to be at the keyboard to kick off a sprint — trigger from phone
- Build verification, deploy, and health checks run autonomously

### What Doesn't Change
- Sprint prompt quality bar (file paths, acceptance criteria, explicit instructions, testing section)
- Git workflow: push to `origin HEAD:main`, Netlify watches `main`
- Deploy budget discipline: auto-deploy OFF, batch deploys, test locally first
- gh CLI path: `"C:\Program Files\GitHub CLI\gh.exe"`

---

## Key File Locations

| File | Purpose |
|------|---------|
| `DAILY_DISPATCH.md` | Master autonomous prompt |
| `DISPATCH_TASKS.md` | Full task catalog with execution steps |
| `terrainforge/.claude/ROADMAP.md` | Milestone roadmap — what we're building toward |
| `terrainforge/.claude/CONTEXT.md` | Current sprint state |
| `terrainforge/.claude/EXECUTION.md` | Full execution model (build, test, deploy) |
| `terrainforge/.claude/SPRINT_[N]_PROMPTS.md` | Current sprint tasks |
| `terrainforge/CLAUDE.md` | Master project instructions for Code |

---

## Constraints & Gotchas

- **Desktop must be on** and Cowork running for scheduled tasks to fire
- **Netlify build minutes** renew 4/19 — local builds cost nothing, Netlify deploys spend budget
- **VSCode Claude Code is primary** for coding sprints — lower token usage than Cowork
- **Complex merge conflicts** are better resolved at the desktop
- **Phone is for dispatch and triage** — detailed code review saves for the desktop
