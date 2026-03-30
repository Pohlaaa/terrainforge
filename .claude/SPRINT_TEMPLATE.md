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

## S[N]-1: [Task Title]

**Problem/Goal**: [What this task fixes or builds]

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

**Acceptance criteria**:
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

> If this sprint needs database changes, list the migration file and the SQL here.
> Charlie must run these in Supabase SQL Editor BEFORE testing.

**File**: `supabase/migrations/[NNN]_[description].sql`

```sql
-- Run this in Supabase SQL Editor BEFORE testing Sprint [N]
[SQL here]
```

---

## Post-Sprint Test Plan

> What Charlie should test after merging and running `npm run dev`:

1. [Test case 1 — what to do and what to expect]
2. [Test case 2]
3. [Check console for any `[TF-SUPABASE]` errors]
