# Hotfix — Consistent Completion % (Checklist-Based)

> **Goal**: All completion percentages across the app should use the same calculation: checklist completion (completed checklist items / 8 total items). Currently the Dashboard widget and map use checklist completion, but the Projects page uses task completion — causing a mismatch.
>
> **Branch**: `hotfix-completion-pct`
> **SQL migrations**: None
> **Architecture reference**: `.claude/ARCHITECTURE.md`

---

## CRITICAL CONTEXT

The `project.checklist` object has 8 boolean fields: `permit`, `utility`, `deposit`, `design`, `access`, `materials`, `crew`, `equipment`. Completion % = count of `true` values / 8.

The Dashboard projects widget (`src/components/dashboard/widgets/ProjectsWidget.tsx`) already calculates this correctly:
```typescript
const checks = Object.values(p.checklist);
const completedCount = checks.filter(Boolean).length;
const pct = Math.round((completedCount / checks.length) * 100);
```

## TASK 1: Align Projects page completion %

**File**: `src/pages/Projects.tsx`

Find where completion percentage is calculated using `taskCount` / `completedTaskCount` and replace it with the checklist-based calculation (same as ProjectsWidget). This likely appears in both the card view and the list/row view.

Look for patterns like:
```typescript
const taskTotal = (project as any).taskCount ?? 0;
const taskCompleted = (project as any).completedTaskCount ?? 0;
const pct = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;
```

Replace with:
```typescript
const checks = Object.values(project.checklist);
const completedCount = checks.filter(Boolean).length;
const pct = Math.round((completedCount / checks.length) * 100);
```

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Projects page card view shows checklist-based %
- [ ] Projects page list view shows checklist-based % (if applicable)

## TASK 2: Verify map pin hover uses checklist %

**File**: `src/components/dashboard/widgets/MapWidget.tsx` (or similar)

Verify the map pin hover tooltip calculates completion from `project.checklist`, same as the Dashboard widget. If it already does, no change needed. If it uses task counts, align it.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Map hover uses same checklist calculation

## REGRESSION CHECKLIST

- [ ] Dashboard projects widget shows completion %
- [ ] Projects page shows same completion % for the same project
- [ ] Map pin hover shows same completion % for the same project
- [ ] All three match for every project
- [ ] `npm run build` passes clean
