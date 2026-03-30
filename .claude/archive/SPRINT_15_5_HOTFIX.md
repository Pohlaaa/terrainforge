# Sprint 15.5 Hotfix — Schedule Widget + Conflict UX

> **Branch**: `sprint-15.5-hotfix`
> **Base**: `main` at `c9c1d07`
> **Scope**: 3 targeted fixes from Sprint 15 testing

---

## Context Files to Read First

1. `CLAUDE.md` (project root)
2. `.claude/CODE_GUIDE.md`
3. `.claude/TESTING/SPRINT_15_TESTS.md` — read the TESTING NOTEs for failed items

---

## Task 1: Fix Dashboard Schedule Widget Not Appearing

**Problem**: The `DEFAULT_WIDGET_LAYOUT` in `src/lib/kpiDefinitions.ts` correctly includes the schedule widget at order 5. However, existing users have a cached `widgetLayout` in localStorage (key: `tf_ui`) from before Sprint 15, which does NOT include the schedule widget. The Zustand persist middleware loads the cached layout and never adds new widgets.

**File**: `src/stores/uiStore.ts`

**Fix**: Add a layout migration in the persist middleware's `onRehydrateStorage` callback, OR add a `merge` function to the persist config. The simplest approach:

In the `persist` config (around line 98-102), add a `merge` function that ensures any widgets in `DEFAULT_WIDGET_LAYOUT` that are missing from the persisted state get appended:

```typescript
{
  name: 'tf_ui',
  merge: (persistedState: any, currentState: UIStore) => {
    const merged = { ...currentState, ...persistedState };
    // Ensure new widgets from DEFAULT_WIDGET_LAYOUT are added to cached layouts
    if (merged.widgetLayout && Array.isArray(merged.widgetLayout)) {
      const existingTypes = new Set(merged.widgetLayout.map((w: WidgetConfig) => w.type));
      const missing = DEFAULT_WIDGET_LAYOUT.filter(w => !existingTypes.has(w.type));
      if (missing.length > 0) {
        const maxOrder = Math.max(...merged.widgetLayout.map((w: WidgetConfig) => w.order), -1);
        merged.widgetLayout = [
          ...merged.widgetLayout,
          ...missing.map((w, i) => ({ ...w, order: maxOrder + 1 + i })),
        ];
      }
    }
    return merged;
  },
}
```

**Import needed**: `DEFAULT_WIDGET_LAYOUT` is already imported from `@/lib/kpiDefinitions`.

**Acceptance criteria**:
- `npm run build` passes
- Opening the dashboard with an old cached layout still shows the schedule widget
- New users see the schedule widget in the default layout
- Existing widget order/visibility preferences are preserved

---

## Task 2: Fix Conflict Warning Emoji Rendering

**Problem**: The ⚠️ emoji in `src/pages/Schedule.tsx` line ~480 renders as a question mark (□ or ?) on some systems/browsers. Replace with an inline SVG or a CSS-styled warning indicator.

**File**: `src/pages/Schedule.tsx`

**Find the conflict warning div** (around line 476-486):
```tsx
{conflict && (
  <div
    title={`${member.name} has multiple assignments on this day`}
    style={{
      position: 'absolute', top: '4px', right: '4px',
      fontSize: '12px', cursor: 'help', zIndex: 2,
    }}
  >
    ⚠️
  </div>
)}
```

**Replace with**:
```tsx
{conflict && (
  <div
    title={`${member.name} has multiple assignments on this day`}
    style={{
      position: 'absolute', top: '4px', right: '4px',
      cursor: 'help', zIndex: 2,
      width: '16px', height: '16px', borderRadius: '50%',
      background: '#F59E0B', color: '#000', fontSize: '11px',
      fontWeight: 800, display: 'flex', alignItems: 'center',
      justifyContent: 'center', lineHeight: 1,
    }}
  >
    !
  </div>
)}
```

**Acceptance criteria**:
- `npm run build` passes
- The conflict indicator shows as a gold circle with "!" instead of a broken emoji
- Tooltip still works on hover

---

## Task 3: Allow Adding Entries to Cells That Already Have Assignments

**Problem**: The `onClick` handler on day cells (around line 453-457) only opens the assignment modal when `cellEntries.length === 0`. This means you can't directly add a second entry to a crew member's day — you have to assign elsewhere and drag. Users should be able to click any cell to add an assignment, even if one already exists.

**File**: `src/pages/Schedule.tsx`

**Find the onClick condition** on the `<td>` element (around line 453):
```tsx
onClick={() => {
  if (cellEntries.length === 0) {
    setModalTarget({ crewMemberId: member.id, date });
  }
}}
```

**Replace with**:
```tsx
onClick={() => {
  setModalTarget({ crewMemberId: member.id, date });
}}
```

**Also update the cursor style** on the same `<td>` (around line 470):
```tsx
cursor: cellEntries.length === 0 ? 'pointer' : 'default',
```
Change to:
```tsx
cursor: 'pointer',
```

**Also add a "+" button for occupied cells**. After the entry chips `<div>` (around line 539, after the closing `</div>` of the chips container), add:
```tsx
{cellEntries.length > 0 && (
  <div
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '20px', opacity: 0.4, transition: 'opacity 0.15s',
      color: 'var(--text-4)', fontSize: '14px', marginTop: '2px',
    }}
    className="schedule-cell-plus"
  >
    +
  </div>
)}
```

**Acceptance criteria**:
- `npm run build` passes
- Clicking an empty cell still opens the assignment modal
- Clicking a cell with existing entries ALSO opens the assignment modal
- Both empty and occupied cells show a "+" indicator
- After adding a second entry, the ⚠️ (now "!") conflict indicator appears

---

## Post-Sprint: What to Test

### Fixes to Verify
1. Dashboard → Schedule widget now appears (may need to clear localStorage first: open DevTools → Application → Local Storage → delete `tf_ui`, then reload)
2. Schedule page → drag two entries to the same cell → gold "!" circle appears (not broken emoji)
3. Schedule page → click a cell that already has an entry → modal opens to add another assignment
4. After adding second entry via modal, "!" conflict warning shows

### Regression Checks
1. Dashboard → all other widgets still show (alerts, projects, crew, fleet)
2. Dashboard → Edit Layout mode still works (reorder, hide/show)
3. Schedule → drag-and-drop still works
4. Schedule → delete entry ("✕") still works
5. Schedule → week navigation still works

---

## Commit Format

One commit per task:
- `S15.5-1: Fix schedule widget not showing for existing users`
- `S15.5-2: Replace conflict emoji with styled indicator`
- `S15.5-3: Allow adding entries to occupied schedule cells`

## PR

```
"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --title "Sprint 15.5: Schedule widget + conflict UX fixes" --body "Fixes 3 issues found during Sprint 15 testing:
- Schedule widget not appearing for existing users (localStorage cache)
- Conflict warning emoji rendering as question mark
- Cannot add entries to cells that already have assignments"
```
