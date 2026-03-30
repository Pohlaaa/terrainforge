# TerrainForge Multi-Session Workflow

> **Purpose**: Defines the role of each session and how they coordinate. All sessions should read this file.

## Session Roles

### Orchestrator (Cowork — this is the planning hub)
- Cross-session coordination and sprint planning
- Synthesizes feedback between UI Design and Deployment sessions
- Crafts handoff prompts between sessions
- Tracks overall project state and priorities

### UI Design (Cowork)
- Design iteration: HTML previews, mockups, design tokens, specs
- Produces visual references (design-preview-vN.html files)
- **Does NOT write application code** (React, Zustand, CSS in src/)
- When a design is finalized, hand it off as specs for the sprint prompt file

### Deployment (Cowork)
- Sprint prompt creation (`.claude/SPRINT_[N]_PROMPTS.md`)
- SQL migration authoring
- Deployment coordination (git workflow, Netlify, Supabase)
- Post-sprint verification checklists
- **Does NOT write application code** — creates prompts for Code to execute

### Claude Code (autonomous execution)
- Writes all application code (React components, Zustand stores, CSS, services)
- Runs via `SPRINT_EXECUTION.md` workflow with single-prompt kickoff
- Per-task cycle: implement → build → commit → PR → merge → next task
- The ONLY session that touches files in `src/`

## Pipeline

```
UI Design (visual reference)
    ↓ design specs + preview files
Orchestrator (coordination)
    ↓ handoff prompts
Deployment (sprint prompts + SQL)
    ↓ SPRINT_[N]_PROMPTS.md
Claude Code (autonomous execution)
    ↓ commits + PRs
Charlie (merge, push to master, run SQL, smoke test)
```

## Feedback Loop

When either session completes meaningful work, tell the Orchestrator chat with a one-liner:
- "UI session finished v4 preview"
- "Deployment session wrote Sprint 9 prompts"
- "Code hit an RLS error on user_preferences"

The Orchestrator reads the full transcript and coordinates the next handoff.

## Sprint Prompt Quality Bar

The sprint prompt file (`.claude/SPRINT_[N]_PROMPTS.md`) is the single most important deliverable from the planning sessions. When written well, Charlie pastes ONE line into Code and the entire sprint executes autonomously with zero follow-up.

**What a good sprint prompt file looks like:**

Each task (S[N]-[T]) must include:
1. **Goal** — one sentence on what this task accomplishes
2. **Files to create/modify** — explicit list of file paths
3. **Acceptance criteria** — bullet list of what "done" looks like, testable by `npm run build`
4. **Implementation details** — specific enough that Code doesn't have to make design decisions. Include:
   - Component names, prop interfaces, and state shape
   - CSS class names and design token references (from `DESIGN_SYSTEM.md`)
   - Supabase table/column names and RLS policy requirements
   - AI prompt templates (if the task involves AI features)
5. **Design reference** — which preview file and which section to match visually (e.g., "Match Screen 2 in `design-preview-v4-flows.html`")
6. **Dependencies** — which tasks must complete first (if any)

**What to avoid:**
- Vague instructions like "make it look professional" — reference specific design tokens
- Leaving component structure up to Code — specify it
- Skipping SQL migration details — include exact table definitions with RLS policies
- Forgetting to reference `SPRINT_EXECUTION.md` workflow in the kickoff prompt

**The test**: Could a developer with zero project context read this prompt file and build exactly what we want? If yes, Code will one-shot it.

## Key Rules

1. **Only Code writes source code** — Cowork sessions plan, design, and prompt
2. **Sprint prompts are the interface** between planning and execution
3. **Design previews are the interface** between design and planning
4. **Git workflow**: local `main` tracks `origin/master` — always push with `git push origin HEAD:master`
5. **SQL migrations**: authored by Deployment session, reviewed by Orchestrator, run by Charlie in Supabase
6. **One-shot execution**: Every sprint prompt file should enable a single-prompt Code run with no follow-up needed
