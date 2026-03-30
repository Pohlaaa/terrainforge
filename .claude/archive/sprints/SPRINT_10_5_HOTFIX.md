# Sprint 10.5 — Dashboard UX Hotfix

> **Goal**: Fix 5 dashboard UX issues discovered in Sprint 10 smoke test.
> Run all tasks on a single branch `sprint-10.5-hotfix`, one commit per task, then open a single PR to main.

---

## S10.5-1: Fix widget card entrance animation not firing on mount

**Problem**: `WidgetCard.tsx` only triggers `animate-card-birth` when `config.visible` transitions from `false` → `true`. Since widgets start with `visible: true`, the condition `!prevVisible.current && config.visible` is always false on first render — the animation never plays.

**Files to modify**:
- `src/components/dashboard/WidgetCard.tsx`

**Changes**:
1. Replace the current `born` logic. Instead of tracking visibility transitions, trigger the birth animation on **initial mount** of each card.
2. Use a simple pattern:
   ```tsx
   const [born, setBorn] = useState(true);
   useEffect(() => {
     const t = setTimeout(() => setBorn(false), 400);
     return () => clearTimeout(t);
   }, []);
   ```
3. This makes every widget card play `animate-card-birth` when it first mounts, then the class is removed after the animation completes.
4. Keep the existing `config.visible` check for conditional rendering — just decouple it from the animation trigger.

**Acceptance criteria**:
- On dashboard load, every visible widget card plays a subtle entrance animation (scale + opacity over 0.3s)
- Animation plays once, does not repeat on re-render
- No animation on widgets that are hidden (`config.visible === false`)

---

## S10.5-2: Fix skeleton loading states not appearing

**Problem**: `isLoading` in `useProjectStore` defaults to `false` and only becomes `true` during `fetchProjects()`. If data is already cached or the fetch resolves before `Dashboard` mounts, skeletons never render. Users see a blank flash then content.

**Files to modify**:
- `src/pages/Dashboard.tsx`

**Changes**:
1. Add a local `initialLoad` state to Dashboard that starts `true` and transitions to `false` after a minimum display time:
   ```tsx
   const [initialLoad, setInitialLoad] = useState(true);
   useEffect(() => {
     const t = setTimeout(() => setInitialLoad(false), 600);
     return () => clearTimeout(t);
   }, []);
   ```
2. Update the skeleton render condition from `if (isLoading)` to `if (isLoading || initialLoad)`.
3. This guarantees skeletons display for at least 600ms on every dashboard visit, giving the shimmer animation time to be seen, even if data is already cached.

**Acceptance criteria**:
- On every dashboard load (including navigating away and back), skeleton shimmer is visible for ~600ms before real content appears
- `skeleton-shimmer` CSS animation (the sweeping gradient) is visually obvious during this window
- After 600ms (or when data finishes loading, whichever is later), real KPIs and widgets render with `animate-card-birth`

---

## S10.5-3: Make entire widget card draggable in edit mode

**Problem**: Drag is only captured on a 32x44px handle icon (the ⠿ character). Users expect to click anywhere on the card to drag when in edit mode. The handle is especially hard to hit on touch devices.

**Files to modify**:
- `src/components/dashboard/WidgetCard.tsx`
- `src/components/dashboard/WidgetGrid.tsx`

**Changes to WidgetCard.tsx**:
1. When `editMode` is true, apply the `dragHandleProps` (onPointerDown, etc.) to the **entire card wrapper div**, not just the small handle element.
2. Keep the ⠿ icon visible as a visual indicator, but it should no longer be the exclusive drag target.
3. Change the card wrapper's cursor to `grab` when in edit mode.
4. Add a dashed border and subtle background tint to the whole card in edit mode to signal "this is draggable."
5. Add `touch-action: none` and `user-select: none` to the card wrapper in edit mode to prevent scroll interference on mobile.

**Changes to WidgetGrid.tsx**:
1. Remove the broken inline `@media (pointer: coarse)` style (inline styles don't support media queries).
2. Pass `dragHandleProps` through to WidgetCard but let the card decide where to attach them based on edit mode.

**Acceptance criteria**:
- In edit mode, clicking and dragging anywhere on a widget card initiates the drag
- The ⠿ icon remains visible as a hint but is not the only drag target
- On touch devices (tablet), tap-and-drag works from anywhere on the card
- Outside edit mode, cards behave normally (no drag, normal click/scroll)

---

## S10.5-4: Add KPI card drag-to-reorder

**Problem**: Dashboard widgets can be reordered via drag-and-drop, but KPI cards at the top are a static array with no reorder capability. Users expect the same drag behavior for KPIs.

**Files to modify**:
- `src/pages/Dashboard.tsx`
- `src/services/preferences.ts` (if needed for persistence)

**Changes to Dashboard.tsx**:
1. Wrap the KPI card strip in a reorderable container using the same pointer-event drag pattern from WidgetGrid.
2. Track `kpiOrder` as local state, initialized from `selectedKpis` order.
3. On drag-and-drop, update the `kpiOrder` state and persist to `user_preferences.selected_kpis` (the array order determines display order).
4. In edit mode:
   - Show a drag handle or cursor change on KPI cards
   - Apply the same dashed-border "draggable" visual treatment as widgets
   - Enable pointer-based reorder with drop animation (`animate-drop-settle`)
5. Outside edit mode, KPI cards render normally with no drag affordance.

**Implementation approach**: Either extract the drag logic from WidgetGrid into a shared `useDragReorder` hook that both KPIs and widgets can use, OR inline a simpler version since KPIs are a single horizontal row.

**Acceptance criteria**:
- In edit mode, KPI cards can be dragged left/right to reorder
- Drop animation plays when a KPI is released into a new position
- New order persists (page refresh retains the order)
- Outside edit mode, KPIs are static and not draggable

---

## S10.5-5: Wire up toast notifications for dashboard actions

**Problem**: `ToastContainer` is mounted in `AppLayout.tsx` (line 194) and the `toast` API exists in `useToast.ts`, but no dashboard action actually calls `toast()`. Users never see toast notifications.

**Files to modify**:
- `src/pages/Dashboard.tsx`

**Changes**:
1. Import `{ toast }` from `@/hooks/useToast`.
2. Add toast calls for these dashboard actions:
   - **KPI customization saved**: `toast.success('KPI layout saved')` — when the KPI drawer saves changes
   - **Widget layout saved**: `toast.success('Dashboard layout saved')` — when widget reorder completes
   - **Widget hidden**: `toast.info('Widget hidden — use Edit Layout to restore')` — when a widget is hidden in edit mode
   - **Widget restored**: `toast.success('Widget restored')` — when a hidden widget is made visible
   - **Data fetch error**: `toast.error('Failed to load dashboard data')` — when project store fetch fails
3. Each toast should use the appropriate type (success/info/error) so the correct animation plays:
   - Success → green accent, `animate-toast-in`
   - Error → red accent, `animate-error-shake` then `animate-toast-in`
   - Info → blue accent, `animate-toast-in`

**Acceptance criteria**:
- Toast slides in from bottom-right when any of the above actions occurs
- Toast auto-dismisses after 4 seconds
- Error toast shakes briefly before settling
- Multiple toasts stack vertically

---

## Execution Notes

- Create branch `sprint-10.5-hotfix` from current HEAD
- One commit per task: `S10.5-1: Fix widget entrance animation`, etc.
- After all 5 tasks, open a single PR to main
- Do NOT modify any files outside the ones listed per task
- Do NOT touch the map widget (Mapbox token will be added separately)
- Push with: `git push origin sprint-10.5-hotfix`
