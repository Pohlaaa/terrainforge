# Sprint [N] — [Theme Name]

> **Goal**: [One sentence describing what this sprint accomplishes]
>
> **Branch**: `sprint-[N]-[description]`
> **Design reference**: `.claude/design/design-preview-v[X].html` — [which sections]
> **SQL migrations**: [Yes/No — if yes, list them and note they must be run BEFORE testing]
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-[N]-[description] --title "Sprint [N]: [theme]" --body "[summary]"`

---

## CRITICAL CONTEXT

> Include anything Code MUST know before starting. Examples:
> - RLS policies that affect this sprint's tables
> - CHECK constraints that could cause silent failures
> - Field mapping quirks in supabaseData.ts
> - Components that must NOT be broken (e.g., "KPI drawer must remain functional")
> - Environment variables required

---

## REGRESSION CHECKLIST

> **Code must verify these still work after all tasks are complete.** Run `npm run build` and then verify each item renders without console errors.
>
> - [ ] [Existing feature 1 that could be affected by this sprint's changes]
> - [ ] [Existing feature 2]
> - [ ] [Existing feature 3]
> - [ ] Dashboard loads without errors
> - [ ] Project wizard completes without errors

---

## S[N]-1: [Task Title]

**Problem/Goal**: [What this task fixes or builds]

**Current state**: [Brief description of how the component/feature works RIGHT NOW. What exists, what the user sees, how state is managed. This prevents Code from making wrong assumptions.]

**Design reference**: `design-preview-v[X].html` → [Section name] — [extract key values: colors, sizes, animations]

**Files to modify**:
- `src/path/to/file.tsx` — [what changes]
- `src/path/to/other.ts` — [what changes]

**Implementation details**:
[Specific enough that Code makes zero design decisions. Include:]
- Component names and prop interfaces
- CSS tokens from DESIGN_SYSTEM.md (e.g., `var(--brand-primary)`)
- Supabase table/column names
- State shape changes in Zustand stores
- Animation values (duration, easing, delay)

**Supabase considerations**:
- [Table name, required RLS role, relevant CHECK constraints]
- [Field mapping: frontend name → DB column name]
- [Or "None — frontend-only change"]

**Self-verification** (Code must confirm after implementing):
- [ ] Navigate to [page/route] — component renders without console errors
- [ ] [Specific behavior to verify — e.g., "Click button X — modal opens"]
- [ ] [Data verification — e.g., "Supabase query returns expected shape"]

**Acceptance criteria** (Charlie verifies after merge):
- [ ] [Testable outcome 1]
- [ ] [Testable outcome 2]
- [ ] [Testable outcome 3]
- [ ] `npm run build` passes

---

## S[N]-2: [Next Task Title]

[Same structure as above]

---

## Execution Order

[List tasks in the order Code should execute them, noting any dependencies]

1. **S[N]-1** — [why first]
2. **S[N]-2** — [depends on S[N]-1 because...]
3. **S[N]-3** — standalone, can run in any order

---

## SQL Migrations Required

> If this sprint needs database changes, list the migration file.
> Charlie must run these in Supabase SQL Editor BEFORE Code executes.

**File**: `supabase/migrations/[NNN]_[description].sql`

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
> After all tasks are committed, Code runs `npm run build` and verifies:
- [ ] Each modified page loads without console errors
- [ ] Regression checklist items still work
- [ ] `npm run build` passes clean

### Charlie's Test Plan (after merge):
> Open `http://localhost:3000` in **incognito** (clean localStorage).

1. [Test case 1 — what to do and what to expect]
2. [Test case 2]
3. [Full flow smoke test]
4. Console check: no unexpected errors

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
