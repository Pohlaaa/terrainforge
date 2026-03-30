# Sprint 10 — Dashboard Power Features

> **Kickoff prompt for Code:**
> ```
> Read .claude/SPRINT_EXECUTION.md and .claude/SPRINT_10_PROMPTS.md, then execute the full sprint autonomously. Follow the execution workflow in SPRINT_EXECUTION.md. Commit and merge each task before moving to the next.
> ```

**Sprint goal:** Transform the Dashboard from a static KPI display into an interactive, customizable command center with drag-and-drop widgets, KPI selection, micro-interactions, and a Mapbox map widget.

**Prerequisites:**
- Sprint 9 must be fully merged (design token migration, onboarding, settings, etc.)
- `user_preferences` table must exist in Supabase (Sprint 9 SQL migration)
- The new CSS custom property system from S9-1 must be active in `src/index.css`

**Design references (archived in git history):**
- `design-preview-v3-customizable.html` (commit `ed22f60`) — KPI drawer, widget system, AI input
- `design-preview-v5-microinteractions.html` (commit `2624063`) — Animation patterns, drag-and-drop, touch optimization
- `DESIGN_SYSTEM.md` — Design tokens, component specs, motion system

---

## S10-1: KPI Customization Drawer

### Goal
Add a slide-in drawer to the Dashboard that lets users choose which KPIs to display (max 6) from a library of available metrics. Selections persist to `user_preferences.selected_kpis` in Supabase and to localStorage for offline use.

### Files to create/modify
- **Modify:** `src/pages/Dashboard.tsx` — Add "Customize" button, render selected KPIs dynamically
- **Create:** `src/components/dashboard/KPIDrawer.tsx` — Slide-in drawer with KPI library grid
- **Create:** `src/components/dashboard/KPILibraryCard.tsx` — Individual KPI toggle card
- **Modify:** `src/stores/uiStore.ts` — Add `kpiDrawerOpen: boolean`, `toggleKpiDrawer()` action
- **Modify:** `src/types/index.ts` — Add `KPIDefinition` interface, extend `UserPreferences` if not already present from S9
- **Create:** `src/lib/kpiDefinitions.ts` — KPI library with compute functions
- **Create:** `src/services/preferences.ts` — CRUD for `user_preferences` table (if not already created in S9-2; if it exists, extend it with KPI-specific helpers)

### Implementation Details

#### KPI Library (`src/lib/kpiDefinitions.ts`)

```typescript
export interface KPIDefinition {
  id: string;
  label: string;
  category: 'projects' | 'financial' | 'crew' | 'equipment' | 'materials';
  icon: string;                // emoji icon
  compute: (state: AppState) => { value: string | number; subtitle?: string };
  colorVar: string;            // CSS custom property for accent, e.g. '--color-primary'
}
```

Define these KPIs in the library (each with a `compute` function):

| id | label | category | compute logic |
|---|---|---|---|
| `active_projects` | Active Projects | projects | `projects.filter(p => p.zones?.length > 0).length` |
| `planning_projects` | In Planning | projects | `projects.filter(p => !p.zones || p.zones.length === 0).length` |
| `pipeline_value` | Pipeline Value | financial | `projects.reduce((s,p) => s + computeProjectCostRaw(p, materials), 0)` formatted as `$XXk` |
| `avg_project_value` | Avg Project Value | financial | total value / project count |
| `crew_available` | Crew Available | crew | `getAvailableToday().length` with subtitle `"of {teamSize} total"` |
| `crew_utilization` | Crew Utilization | crew | `(assigned / teamSize * 100).toFixed(0) + '%'` |
| `fleet_available` | Fleet Available | equipment | `equipment.filter(e => e.status === 'available').length` |
| `fleet_in_service` | In Service | equipment | `equipment.filter(e => e.status === 'maintenance').length` |
| `low_stock_alerts` | Low Stock Items | materials | Count of materials where `qtyOnHand < minStockLevel` (from inventory items if available, else 0) |
| `total_materials` | Material Types | materials | `materials.length` |
| `overdue_projects` | Overdue | projects | Projects past `dueDate` and not all checklist items complete |
| `cert_expiring` | Certs Expiring | crew | Crew with certs expiring within 30 days |

Default selected (matches current dashboard): `['active_projects', 'pipeline_value', 'crew_available', 'fleet_available']`

**KPI color assignments** (for `colorVar` field):
- `active_projects`, `planning_projects`, `overdue_projects` → `'--color-primary'`
- `pipeline_value`, `avg_project_value` → `'--color-primary'`
- `crew_available`, `crew_utilization`, `cert_expiring` → `'--status-info'`
- `fleet_available`, `fleet_in_service` → `'--status-warning'`
- `low_stock_alerts` → `'--status-error'`
- `total_materials` → `'--color-primary'`

**All count-up animated:** Every KPI with a numeric value should use the `useCountUp` hook from S10-3. Non-numeric KPIs (percentage strings) should format the number portion and append the suffix.

#### AppState helper type

```typescript
// In kpiDefinitions.ts — import stores and pass combined state
export interface AppState {
  projects: Project[];
  materials: Material[];
  crew: CrewMember[];
  equipment: Equipment[];
}
```

#### KPI Drawer Component (`src/components/dashboard/KPIDrawer.tsx`)

Props:
```typescript
interface KPIDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedKpis: string[];          // array of KPI ids
  onSelectionChange: (ids: string[]) => void;
}
```

Layout:
- Fixed overlay: `position: fixed; inset: 0; z-index: 50` with `bg-black/40` backdrop that closes drawer on click
- Drawer panel: `position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 90vw`
- Background: `var(--surface-card)` with `border-left: 1px solid var(--border-default)`
- Header: "Customize KPIs" title (16px, font-weight 700, `var(--text-primary)`) + close button (×, 24px hit area min 44px)
- Subtitle: "Choose up to 6 metrics" (13px, `var(--text-secondary)`)
- Category sections: Group KPIs by category with section headers (11px, uppercase, `var(--text-tertiary)`, `letter-spacing: 0.06em`)
- Each section renders `KPILibraryCard` items in a 2-column grid (`grid-template-columns: 1fr 1fr; gap: 8px`)

Animation:
```css
/* Drawer slide-in */
.kpi-drawer-enter {
  transform: translateX(100%);
}
.kpi-drawer-active {
  transform: translateX(0);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
/* Backdrop fade */
.kpi-backdrop-enter {
  opacity: 0;
}
.kpi-backdrop-active {
  opacity: 1;
  transition: opacity 0.2s ease;
}
```

Use `useEffect` + `requestAnimationFrame` for enter animation. On close, reverse with `0.2s ease-out` then unmount after `transitionend`.

Alternatively (simpler): use inline styles with a `mounted` state that flips after first render:
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
// style={{ transform: mounted ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
```

#### KPI Library Card (`src/components/dashboard/KPILibraryCard.tsx`)

Props:
```typescript
interface KPILibraryCardProps {
  kpi: KPIDefinition;
  selected: boolean;
  disabled: boolean;  // true when 6 are selected and this one isn't
  onToggle: () => void;
}
```

Appearance:
- Container: `border-radius: 8px; padding: 12px; cursor: pointer; min-height: 44px`
- Default: `background: var(--surface-bg); border: 1px solid var(--border-default)`
- Selected: `background: var(--surface-selected); border-color: var(--color-primary)`
- Disabled (not selected + max reached): `opacity: 0.4; cursor: not-allowed`
- Hover (non-disabled): `background: var(--surface-hover)`
- Icon: 16px, left-aligned
- Label: 12px, font-weight 600, `var(--text-primary)`
- Category badge: 10px, `var(--text-tertiary)`, italic
- Checkmark indicator when selected: small green circle (8px) or checkbox icon, top-right corner

#### Dashboard.tsx Modifications

Replace the hardcoded 4-KPI block (lines ~110–154) with a dynamic renderer:

```typescript
// At top of component:
const { selected_kpis } = usePreferencesStore(); // or however S9-2 exposes it
const kpiDrawerOpen = useUIStore(s => s.kpiDrawerOpen);
const toggleKpiDrawer = useUIStore(s => s.toggleKpiDrawer);

// Build app state for compute functions
const appState: AppState = { projects, materials, crew, equipment };

// Get selected KPI definitions
const selectedDefs = (selected_kpis ?? DEFAULT_SELECTED_KPIS)
  .map(id => KPI_LIBRARY.find(k => k.id === id))
  .filter(Boolean);
```

Render KPIs:
```tsx
<div className="flex flex-col gap-[8px]">
  {selectedDefs.map(kpi => {
    const result = kpi.compute(appState);
    return (
      <div key={kpi.id} className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[10px] p-[16px]">
        <div className="text-[10px] font-[700] text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-[6px]">
          {kpi.icon} {kpi.label}
        </div>
        <div className="font-serif text-[28px] text-[var(--text-primary)] leading-[1]">
          {result.value}
        </div>
        {result.subtitle && (
          <div className="text-[10px] text-[var(--text-tertiary)] mt-[4px]">{result.subtitle}</div>
        )}
      </div>
    );
  })}
  {/* Customize button */}
  <button
    onClick={toggleKpiDrawer}
    className="w-full py-[10px] rounded-[8px] border border-dashed border-[var(--border-default)] text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all duration-200 min-h-[44px]"
  >
    ✎ Customize KPIs
  </button>
</div>
```

#### Persistence

When `onSelectionChange` fires in the drawer:
1. Update local state immediately (optimistic)
2. Call `preferences.updateSelectedKpis(ids)` which writes to `user_preferences.selected_kpis` via Supabase
3. Also update localStorage through the Zustand persist middleware so it works offline

If `src/services/preferences.ts` already exists from S9-2, add:
```typescript
export async function updateSelectedKpis(userId: string, kpis: string[]): Promise<void> {
  await supabase
    .from('user_preferences')
    .update({ selected_kpis: kpis })
    .eq('user_id', userId);
}
```

If the preferences service doesn't exist yet, create `src/services/preferences.ts` following the `supabaseData.ts` pattern with `toCamelCase`/`toSnakeCase` mapping. It should export `fetchUserPreferences(userId)`, `upsertUserPreferences(userId, prefs)`, `updateSelectedKpis(userId, kpis)`, and `updateWidgetLayout(userId, layout)`.

**Accessibility:** The drawer slide-in animation must respect `prefers-reduced-motion: reduce`. When reduced motion is preferred, skip the translate animation and show the drawer immediately (set `transition: none`).

#### uiStore.ts additions

Add to the interface and implementation:
```typescript
kpiDrawerOpen: boolean;
toggleKpiDrawer: () => void;
openKpiDrawer: () => void;
closeKpiDrawer: () => void;
```

### Acceptance Criteria
- [ ] "Customize KPIs" button appears below KPI cards on Dashboard
- [ ] Clicking opens a slide-in drawer from the right with backdrop overlay
- [ ] KPI library shows all 12 KPIs grouped by category in 2-column grid
- [ ] Selecting a KPI adds a green border + check indicator; deselecting removes it
- [ ] Maximum 6 KPIs enforced — additional cards show disabled state at 50% opacity
- [ ] Closing the drawer persists selection to `user_preferences.selected_kpis` in Supabase
- [ ] Dashboard re-renders with only selected KPIs, each computing its value live
- [ ] Drawer animates in (translateX 0.25s) and out (0.2s)
- [ ] Backdrop click closes drawer
- [ ] `npm run build` passes with zero errors

### Design Reference
Match the "KPI Customization Drawer" section in `design-preview-v3-customizable.html` (commit `ed22f60`). The drawer uses a 2-column KPI library grid, category grouping, and the slideIn animation pattern.

### Dependencies
- Sprint 9 must be complete (design tokens from S9-1, preferences service from S9-2)

---

## S10-2: Drag-and-Drop Widget Dashboard

### Goal
Replace the static right-column layout in Dashboard.tsx with a configurable widget grid. Users enter "Edit Mode" to reorder widgets via pointer-based drag-and-drop. Widget layout persists to `user_preferences.widget_layout` in Supabase and localStorage.

### Files to create/modify
- **Modify:** `src/pages/Dashboard.tsx` — Add edit mode toggle, render widgets from layout config
- **Create:** `src/components/dashboard/WidgetGrid.tsx` — Container that manages drag state and layout
- **Create:** `src/components/dashboard/WidgetCard.tsx` — Wrapper for each widget with drag handle, collapse, remove
- **Create:** `src/components/dashboard/widgets/ProjectsWidget.tsx` — "Projects in Progress" content (extract from Dashboard.tsx lines ~191–252)
- **Create:** `src/components/dashboard/widgets/CrewWidget.tsx` — Crew utilization content (extract from Dashboard.tsx lines ~257–296)
- **Create:** `src/components/dashboard/widgets/FleetWidget.tsx` — Fleet status content (extract from Dashboard.tsx lines ~298–end)
- **Create:** `src/components/dashboard/widgets/AlertsWidget.tsx` — Alerts content (extract from Dashboard.tsx lines ~157–186)
- **Create:** `src/components/dashboard/widgets/MapWidget.tsx` — Placeholder for S10-4 (renders "Map — coming soon" with empty state)
- **Modify:** `src/types/index.ts` — Add `WidgetConfig`, `WidgetType` types
- **Modify:** `src/stores/uiStore.ts` — Add `editMode`, `widgetLayout`, layout mutation actions

### Implementation Details

#### Type Definitions (`src/types/index.ts`)

```typescript
export type WidgetType = 'projects' | 'crew' | 'fleet' | 'alerts' | 'map';

export interface WidgetConfig {
  id: string;           // unique instance id (e.g. 'widget-projects-1')
  type: WidgetType;
  title: string;
  visible: boolean;
  collapsed: boolean;
  order: number;        // sort position in the grid
}
```

#### Default Widget Layout

```typescript
export const DEFAULT_WIDGET_LAYOUT: WidgetConfig[] = [
  { id: 'widget-alerts', type: 'alerts', title: 'Alerts', visible: true, collapsed: false, order: 0 },
  { id: 'widget-projects', type: 'projects', title: 'Projects in Progress', visible: true, collapsed: false, order: 1 },
  { id: 'widget-crew', type: 'crew', title: 'Crew Utilization', visible: true, collapsed: false, order: 2 },
  { id: 'widget-fleet', type: 'fleet', title: 'Fleet Status', visible: true, collapsed: false, order: 3 },
  { id: 'widget-map', type: 'map', title: 'Project Map', visible: false, collapsed: false, order: 4 },
];
```

#### uiStore.ts additions

```typescript
editMode: boolean;
widgetLayout: WidgetConfig[];
toggleEditMode: () => void;
reorderWidgets: (fromIndex: number, toIndex: number) => void;
toggleWidgetVisibility: (widgetId: string) => void;
toggleWidgetCollapsed: (widgetId: string) => void;
resetWidgetLayout: () => void;
```

The `reorderWidgets` action must:
1. Remove the item at `fromIndex`
2. Insert it at `toIndex`
3. Reassign `order` values (0, 1, 2...) sequentially
4. Persist to Supabase via `preferences.updateWidgetLayout()`

#### WidgetGrid Component (`src/components/dashboard/WidgetGrid.tsx`)

Props:
```typescript
interface WidgetGridProps {
  widgets: WidgetConfig[];
  editMode: boolean;
  appState: AppState;    // pass-through for widget compute
  onReorder: (fromIndex: number, toIndex: number) => void;
}
```

Layout:
- Visible widgets only, sorted by `order`
- Full-width widgets stacked vertically (single column in the right panel)
- During edit mode, each widget gets a 2px dashed border `var(--color-primary)` and the drag handle becomes visible

**CRITICAL: Use pointer events for drag-and-drop, NOT native HTML drag API.**

Drag implementation (pointer-based):

```typescript
// State for drag tracking
const [dragState, setDragState] = useState<{
  dragging: boolean;
  dragIndex: number;
  startY: number;
  currentY: number;
  itemHeight: number;
} | null>(null);

// On the drag handle element:
onPointerDown={(e) => {
  if (!editMode) return;
  e.preventDefault();
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  const rect = widgetRefs.current[index]?.getBoundingClientRect();
  setDragState({
    dragging: true,
    dragIndex: index,
    startY: e.clientY,
    currentY: e.clientY,
    itemHeight: rect?.height ?? 80,
  });
}}

onPointerMove={(e) => {
  if (!dragState?.dragging) return;
  setDragState(prev => prev ? { ...prev, currentY: e.clientY } : null);
}}

onPointerUp={(e) => {
  if (!dragState) return;
  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  // Calculate drop index from Y offset
  const delta = dragState.currentY - dragState.startY;
  const indexOffset = Math.round(delta / dragState.itemHeight);
  const toIndex = Math.max(0, Math.min(widgets.length - 1, dragState.dragIndex + indexOffset));
  if (toIndex !== dragState.dragIndex) {
    onReorder(dragState.dragIndex, toIndex);
  }
  setDragState(null);
}}
```

During drag, the dragged widget gets:
```css
transform: translateY(${currentY - startY}px);
z-index: 100;
box-shadow: var(--shadow-elevated, 0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08));
transition: box-shadow 0.2s ease;
/* scale slightly: */
transform: translateY(${delta}px) scale(1.02);
```

Other widgets shift with a placeholder animation:
```css
transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
```

The placeholder gap uses a pulsing animation:
```css
@keyframes placeholderPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
/* Applied to drop target placeholder div */
animation: placeholderPulse 1.5s ease-in-out infinite;
background: var(--surface-hover);
border: 2px dashed var(--border-default);
border-radius: 10px;
```

Touch-specific: Add `touch-action: none` on drag handles. At `@media (pointer: coarse)`, make handles 48px wide instead of 32px.

#### WidgetCard Component (`src/components/dashboard/WidgetCard.tsx`)

Props:
```typescript
interface WidgetCardProps {
  config: WidgetConfig;
  editMode: boolean;
  onToggleCollapse: () => void;
  onToggleVisibility: () => void;
  dragHandleProps: Record<string, any>;  // spread onto handle element
  isDragging: boolean;
  style?: React.CSSProperties;           // for drag transform
  children: React.ReactNode;
}
```

Structure:
```
┌─────────────────────────────────────────────┐
│ ⠿ [drag handle]   Title          ▾ [collapse] × [remove, edit mode only] │
├─────────────────────────────────────────────┤
│                                             │
│  [widget content — children]                │
│                                             │
└─────────────────────────────────────────────┘
```

- Outer container: `bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[10px] overflow-hidden`
- Header bar: `px-[16px] py-[12px] border-b border-[var(--border-default)] flex items-center gap-[8px]`
- Drag handle: `⠿` icon (or `⋮⋮`), only visible in edit mode, `cursor: grab` (or `cursor: grabbing` during drag), min 44px touch target
- Title: 12px, font-weight 700, `var(--text-primary)`
- Collapse chevron: rotates 180° on collapse with `transition: transform 0.2s ease`
- Remove button: only visible in edit mode, 16px × icon, `var(--text-tertiary)` hover `var(--status-error)`
- When collapsed: content area hidden with `max-height: 0; overflow: hidden; transition: max-height 0.2s ease`
- When edit mode active on card: `border: 2px dashed var(--color-primary); border-radius: 10px`
- Birth animation for newly-added widgets:
```css
@keyframes cardBirth {
  0% { opacity: 0; transform: translateY(12px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
/* animation: cardBirth 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; */
```

#### Widget Content Components

Extract existing Dashboard content into standalone components. Each receives `appState: AppState` as a prop and handles its own rendering:

**ProjectsWidget.tsx:** Extract lines ~191–252 from Dashboard.tsx. Shows active project cards with progress bars. Keep the "View all →" link to `/projects`.

**CrewWidget.tsx:** Extract lines ~257–296. Shows crew members with availability badges (Available/On Job/Booked/Off). Keep `{availableToday}/{teamSize} today` subtitle in header.

**FleetWidget.tsx:** Extract lines ~298–end. Shows fleet status summary (3-column grid: Available/In Use/Service counts) and equipment list.

**AlertsWidget.tsx:** Extract lines ~157–186. Shows top 5 alerts with severity-colored cards. Keep `({alerts.length})` count in header.

**MapWidget.tsx:** Placeholder for S10-4. Show empty state:
```tsx
<div className="text-center py-[40px]">
  <div className="text-[32px] mb-[10px] opacity-30">🗺️</div>
  <div className="text-[13px] text-[var(--text-secondary)] mb-[4px]">Project Map</div>
  <div className="text-[11px] text-[var(--text-tertiary)]">Coming in a future update</div>
</div>
```

#### Edit Mode Toggle in Dashboard

Add an "Edit Dashboard" button in the top-right of the right column:

```tsx
<div className="flex items-center justify-between mb-[12px]">
  <div className="text-[14px] font-[700] text-[var(--text-primary)]">Your Dashboard</div>
  <button
    onClick={toggleEditMode}
    className={`px-[12px] py-[6px] rounded-[6px] text-[12px] font-[600] min-h-[44px] transition-all duration-200 ${
      editMode
        ? 'bg-[var(--color-primary)] text-white'
        : 'bg-[var(--surface-bg)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--color-primary)]'
    }`}
  >
    {editMode ? '✓ Done' : '✎ Edit Dashboard'}
  </button>
</div>
```

When edit mode is active, also show an "Add Widget" button. Implementation:
- Render a `<select>` or custom dropdown next to the "Done" button
- Options: one entry per hidden widget (`widgets.filter(w => !w.visible)`), showing the widget title
- On selection: call `toggleWidgetVisibility(widgetId)` which sets `visible: true` and appends it to the end of the layout
- If no widgets are hidden, hide the "Add Widget" button entirely
- Style: same as secondary button — `bg-[var(--surface-bg)] border border-[var(--border-default)] text-[var(--text-secondary)]`

**Accessibility:** All drag animations (spring settling, elevated shadow, placeholder pulse) must respect `prefers-reduced-motion: reduce`. When reduced motion is preferred, reorder should still work but without transform animations — items snap to new positions immediately. Add this check at the top of WidgetGrid:
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Use 0ms transitions when prefersReducedMotion is true
```

#### Dashboard.tsx Final Structure

```tsx
return (
  <div>
    {error && <AlertBanner ... />}
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-[16px] items-start">
      {/* LEFT: KPIs (from S10-1) + Customize button */}
      <div className="flex flex-col gap-[12px]">
        {/* Dynamic KPI cards */}
        {/* Customize KPIs button */}
        {/* KPIDrawer (conditionally rendered) */}
      </div>

      {/* RIGHT: Widget grid */}
      <div className="flex flex-col gap-[12px]">
        {/* Edit mode toggle */}
        <WidgetGrid
          widgets={widgetLayout}
          editMode={editMode}
          appState={appState}
          onReorder={reorderWidgets}
        />
      </div>
    </div>
  </div>
);
```

#### Persistence

On layout change (reorder, collapse, visibility toggle):
1. Update `uiStore.widgetLayout` immediately
2. Persist to localStorage via Zustand persist middleware
3. Debounce Supabase write by 1 second: `preferences.updateWidgetLayout(userId, layout)`

### Acceptance Criteria
- [ ] Dashboard shows widgets from a configurable layout array, not hardcoded sections
- [ ] "Edit Dashboard" button toggles edit mode with visual indicator (dashed borders, visible drag handles)
- [ ] Pointer-based drag-and-drop reorders widgets with spring animation (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- [ ] Dragged widget lifts with elevated shadow and 1.02× scale
- [ ] Drop placeholder pulses with `placeholderPulse` animation
- [ ] Collapse chevron toggles widget content with smooth height transition
- [ ] Hidden widgets can be re-added from "Add Widget" dropdown in edit mode
- [ ] Layout persists to localStorage and Supabase `user_preferences.widget_layout`
- [ ] Touch targets on drag handles are 48px at `@media (pointer: coarse)`
- [ ] All existing dashboard content (projects, crew, fleet, alerts) renders identically in widget form
- [ ] Map widget shows placeholder empty state
- [ ] `npm run build` passes with zero errors

### Design Reference
Match the widget system and edit mode in `design-preview-v3-customizable.html` (commit `ed22f60`). Drag animations from `design-preview-v5-microinteractions.html` (commit `2624063`): pointer-based drag, spring settling (`dropSettle` keyframes), elevated shadow on lift.

### Dependencies
- S10-1 must be complete (KPI drawer shares the left column, both use `uiStore`)

---

## S10-3: Micro-Interactions Polish Pass

### Goal
Add a comprehensive set of micro-interactions across the app: skeleton loading states, KPI count-up animations, toast notifications, button feedback, status badge transitions, and contextual animations. These use CSS keyframes defined in `src/index.css` and applied via utility classes.

### Files to create/modify
- **Modify:** `src/index.css` — Add all `@keyframes` definitions and utility classes
- **Modify:** `src/pages/Dashboard.tsx` — Add skeleton loading, KPI count-up animation
- **Modify:** `src/components/shared/Badge.tsx` — Add status-aware pulse animations for stock/cert badges
- **Create:** `src/components/shared/Toast.tsx` — Toast notification component with auto-dismiss
- **Create:** `src/components/shared/Skeleton.tsx` — Reusable skeleton loading placeholder
- **Create:** `src/hooks/useCountUp.ts` — Animated number counter hook
- **Create:** `src/hooks/useToast.ts` — Toast notification state management hook
- **Modify:** `src/components/layout/AppLayout.tsx` — Add toast container region
- **Modify:** `src/components/dashboard/WidgetCard.tsx` — Add `cardBirth` animation on mount
- **Modify:** `src/components/ui/Button.tsx` — Add completion pulse, loading state, error shake

### Implementation Details

#### Keyframe Definitions (add to `src/index.css`)

Add these inside the `@layer utilities` block or after the Tailwind directives:

```css
/* ── Micro-interaction keyframes ─────────────────────────────────── */

@keyframes completionPulse {
  0% { box-shadow: 0 0 0 0 rgba(45,106,79,0.5); }
  70% { box-shadow: 0 0 0 8px rgba(45,106,79,0); }
  100% { box-shadow: 0 0 0 0 rgba(45,106,79,0); }
}

@keyframes shimmerSweep {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes cardBirth {
  0% { opacity: 0; transform: translateY(12px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes dropSettle {
  0% { transform: scale(1.03) translateY(-4px); }
  50% { transform: scale(0.99) translateY(1px); }
  100% { transform: scale(1) translateY(0); }
}

@keyframes placeholderPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

@keyframes skeletonShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes breathe {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes btnPulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.97); }
  100% { transform: scale(1); }
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

@keyframes bellRing {
  0% { transform: rotate(0deg); }
  15% { transform: rotate(14deg); }
  30% { transform: rotate(-12deg); }
  45% { transform: rotate(8deg); }
  60% { transform: rotate(-4deg); }
  75% { transform: rotate(2deg); }
  100% { transform: rotate(0deg); }
}

@keyframes stockPulseLow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,146,60,0.4); }
  50% { box-shadow: 0 0 0 4px rgba(251,146,60,0); }
}

@keyframes stockPulseOut {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
  50% { box-shadow: 0 0 0 4px rgba(220,38,38,0); }
}

@keyframes inkDrop {
  0% { transform: scale(0); opacity: 0.4; }
  100% { transform: scale(2.5); opacity: 0; }
}

@keyframes toastSlideIn {
  0% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes toastSlideOut {
  0% { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
```

#### Utility Classes (add to `src/index.css`)

```css
.animate-completion-pulse { animation: completionPulse 0.6s ease-out; }
.animate-card-birth { animation: cardBirth 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-drop-settle { animation: dropSettle 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.animate-placeholder-pulse { animation: placeholderPulse 1.5s ease-in-out infinite; }
.animate-breathe { animation: breathe 2s ease-in-out infinite; }
.animate-btn-pulse { animation: btnPulse 0.15s ease; }
.animate-error-shake { animation: errorShake 0.4s ease; }
.animate-bell-ring { animation: bellRing 0.6s ease; }
.animate-stock-pulse-low { animation: stockPulseLow 2s ease-in-out infinite; }
.animate-stock-pulse-out { animation: stockPulseOut 1.5s ease-in-out infinite; }
.animate-toast-in { animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.animate-toast-out { animation: toastSlideOut 0.2s ease-out forwards; }

.skeleton-shimmer {
  background: linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-active) 50%, var(--surface-hover) 75%);
  background-size: 200% 100%;
  animation: skeletonShimmer 1.5s ease-in-out infinite;
}
```

#### Skeleton Component (`src/components/shared/Skeleton.tsx`)

```typescript
interface SkeletonProps {
  width?: string;       // CSS width (default '100%')
  height?: string;      // CSS height (default '16px')
  rounded?: string;     // border-radius (default '6px')
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%', height = '16px', rounded = '6px', className = ''
}) => (
  <div
    className={`skeleton-shimmer ${className}`}
    style={{ width, height, borderRadius: rounded }}
    aria-hidden="true"
  />
);
```

Also export preset patterns:
```typescript
export const SkeletonKPI: React.FC = () => (
  <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[10px] p-[16px]">
    <Skeleton width="80px" height="10px" className="mb-[10px]" />
    <Skeleton width="60px" height="28px" />
    <Skeleton width="100px" height="10px" className="mt-[6px]" />
  </div>
);

export const SkeletonWidget: React.FC = () => (
  <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[10px] p-[16px]">
    <Skeleton width="140px" height="14px" className="mb-[16px]" />
    <div className="space-y-[8px]">
      <Skeleton height="40px" />
      <Skeleton height="40px" />
      <Skeleton height="40px" />
    </div>
  </div>
);
```

#### useCountUp Hook (`src/hooks/useCountUp.ts`)

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number;     // ms, default 600
  prefix?: string;       // e.g. '$'
  suffix?: string;       // e.g. 'k'
  decimals?: number;     // default 0
}

export function useCountUp({ end, duration = 600, prefix = '', suffix = '', decimals = 0 }: UseCountUpOptions): string {
  const [display, setDisplay] = useState(`${prefix}0${suffix}`);
  const prevEnd = useRef(end);
  const rafId = useRef<number>();

  useEffect(() => {
    const startVal = prevEnd.current;
    prevEnd.current = end;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (end - startVal) * eased;
      setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    }
    rafId.current = requestAnimationFrame(tick);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [end, duration, prefix, suffix, decimals]);

  return display;
}
```

Apply to KPI values in Dashboard.tsx:
```typescript
const activeCountUp = useCountUp({ end: activeProjects });
const valueCountUp = useCountUp({ end: totalProjectValue / 1000, prefix: '$', suffix: 'k', decimals: 1 });
```

#### Toast Component (`src/components/shared/Toast.tsx`)

```typescript
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;  // ms, default 4000
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}
```

Appearance:
- Container: `position: fixed; bottom: 24px; right: 24px; z-index: 60; display: flex; flex-direction: column-reverse; gap: 8px`
- Each toast: `min-width: 300px; max-width: 400px; padding: 14px 16px; border-radius: 10px; box-shadow: var(--shadow-lg)`
- Success: `border-left: 4px solid var(--status-success); background: var(--surface-card)`
- Error: `border-left: 4px solid var(--status-error)` — add `animate-error-shake` class on mount
- Info: `border-left: 4px solid var(--status-info)`
- Warning: `border-left: 4px solid var(--status-warning)`
- Title: 13px, font-weight 600, `var(--text-primary)`
- Message: 12px, `var(--text-secondary)`
- Close button: × in top-right, 44px touch target
- Enter: `animate-toast-in`
- Auto-dismiss after `duration` ms with `animate-toast-out`, then remove from DOM after 200ms

#### useToast Hook (`src/hooks/useToast.ts`)

```typescript
interface ToastStore {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}
```

Use a **non-persisted Zustand store** (no `persist` middleware — toasts are ephemeral). Expose `toast.success(title, message?)`, `toast.error(title, message?)`, `toast.info(title, message?)`, `toast.warning(title, message?)`.

**Integration points** — wire up toast calls in these locations:
- S10-1 KPI drawer: call `toast.success('KPIs updated')` when selection is saved
- S10-2 Widget reorder: call `toast.info('Dashboard layout saved')` on debounced Supabase write success
- Button error states: existing error handlers should call `toast.error(title, message)` when Supabase operations fail

#### Button.tsx Enhancements

Add to existing Button component:
- On click (non-disabled): add `animate-btn-pulse` class, remove after 150ms
- Loading state: render a spinner (rotating `⟳` or CSS spinner) instead of children when `loading` prop is true
- Error state: when `error` prop transitions to true, add `animate-error-shake`, remove after 400ms
- Success state: when `success` prop transitions to true, add `animate-completion-pulse`, remove after 600ms

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  // existing props preserved
}
```

#### Badge.tsx Enhancements

For stock-related badges in the material library:
- "Low Stock" badge: add `animate-stock-pulse-low` class
- "Out of Stock" badge: add `animate-stock-pulse-out` class
- These should be conditionally applied based on a `pulse` prop or based on variant name

```typescript
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  pulse?: boolean;  // enables pulsing animation for stock alerts
}
```

#### Dashboard Loading State

Replace the current spinner (lines 17-26 in Dashboard.tsx) with skeleton loading:

```tsx
if (isLoading) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-[16px] items-start">
      <div className="flex flex-col gap-[8px]">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      <div className="flex flex-col gap-[12px]">
        <SkeletonWidget />
        <div className="grid grid-cols-2 gap-[12px]">
          <SkeletonWidget />
          <SkeletonWidget />
        </div>
      </div>
    </div>
  );
}
```

#### Reduced Motion

Wrap all animation utility classes with a `prefers-reduced-motion` check:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-completion-pulse,
  .animate-card-birth,
  .animate-drop-settle,
  .animate-placeholder-pulse,
  .animate-breathe,
  .animate-btn-pulse,
  .animate-error-shake,
  .animate-bell-ring,
  .animate-stock-pulse-low,
  .animate-stock-pulse-out,
  .animate-toast-in,
  .animate-toast-out,
  .skeleton-shimmer {
    animation: none !important;
    transition: none !important;
  }
}
```

### Acceptance Criteria
- [ ] All 14 `@keyframes` defined in `src/index.css`
- [ ] All utility classes (`.animate-*`, `.skeleton-shimmer`) defined
- [ ] `prefers-reduced-motion: reduce` disables all animations
- [ ] Dashboard loading state uses `SkeletonKPI` and `SkeletonWidget` instead of spinner
- [ ] KPI numeric values animate with count-up on initial render and on data change
- [ ] Toast notifications appear bottom-right, slide in/out, auto-dismiss after 4s
- [ ] Error toasts shake on entry
- [ ] Button clicks produce a subtle pulse feedback (150ms)
- [ ] "Low Stock" and "Out of Stock" badges pulse with amber/red ring animation
- [ ] Widget cards animate in with `cardBirth` on first mount
- [ ] `npm run build` passes with zero errors

### Design Reference
All keyframe definitions and timing values from `design-preview-v5-microinteractions.html` (commit `2624063`). Motion system specs from `DESIGN_SYSTEM.md` (duration scale, easing tokens).

### Dependencies
- S10-1 and S10-2 must be complete (skeleton replaces Dashboard loading; toast used by KPI save confirmation; cardBirth applied to WidgetCard)

---

## S10-4: Mapbox Map Widget + Dashboard Update

### Goal
Implement the Map widget placeholder from S10-2 as a real Mapbox GL JS map showing project locations. Also update `PROJECT_DASHBOARD.html` with Sprint 10 completion status.

### Files to create/modify
- **Modify:** `src/components/dashboard/widgets/MapWidget.tsx` — Replace placeholder with Mapbox map
- **Create:** `src/hooks/useMapbox.ts` — Mapbox initialization and cleanup hook
- **Modify:** `src/types/index.ts` — Add `ProjectLocation` interface if not already present
- **Modify:** `package.json` — Add `mapbox-gl` dependency
- **Modify:** `PROJECT_DASHBOARD.html` — Update Sprint 10 task completion, move to `completedWork`

### Implementation Details

#### Mapbox Setup

Install: `npm install mapbox-gl @types/mapbox-gl`

The Mapbox access token should be read from `import.meta.env.VITE_MAPBOX_TOKEN`.

**Important:** The map must gracefully degrade when no token is set. Show the placeholder empty state from S10-2 with an additional note: "Add VITE_MAPBOX_TOKEN to .env.local to enable the map."

#### useMapbox Hook (`src/hooks/useMapbox.ts`)

```typescript
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface UseMapboxOptions {
  container: React.RefObject<HTMLDivElement>;
  center?: [number, number];      // [lng, lat], default [-98.5795, 39.8283] (US center)
  zoom?: number;                   // default 4
  style?: string;                  // default 'mapbox://styles/mapbox/light-v11'
  darkStyle?: string;              // default 'mapbox://styles/mapbox/dark-v11'
}

interface UseMapboxReturn {
  map: mapboxgl.Map | null;
  loaded: boolean;
  error: string | null;
}

export function useMapbox(options: UseMapboxOptions): UseMapboxReturn {
  // ...
}
```

The hook should:
1. Check for `VITE_MAPBOX_TOKEN` — if missing, set `error = 'VITE_MAPBOX_TOKEN is not set'` and return `{ map: null, loaded: false, error }` immediately (no Mapbox initialization)
2. Initialize the map with the container ref
3. Respect the current theme: read from `document.documentElement.dataset.theme` — use `light-v11` for light, `dark-v11` for dark
4. Listen for theme changes (observe `data-theme` attribute) and call `map.setStyle()` on change
5. Return cleanup in `useEffect` return (call `map.remove()`)
6. Set `loaded = true` on the map's `load` event

#### MapWidget.tsx Implementation

```typescript
interface MapWidgetProps {
  projects: Project[];
}
```

Layout:
- Map container: `width: 100%; height: 280px; border-radius: 8px; overflow: hidden`
- If no token: show the S10-2 placeholder empty state
- If loading: show skeleton shimmer in the map container area
- If loaded: render map with project markers

**MapWidget render logic:**
```typescript
const { map, loaded, error } = useMapbox({ container: mapRef, ... });
// If error (no token): show placeholder from S10-2 with extra note about VITE_MAPBOX_TOKEN
// If !loaded && !error: show <Skeleton height="280px" rounded="8px" />
// If loaded: render map with markers
```

Project markers — use **Mapbox custom DOM markers** (`new mapboxgl.Marker({ element })`) not symbol layers:
- Only projects with `lat` and `lng` fields (check if they exist on the Project type; if not, add optional `lat?: number; lng?: number` to the Project interface in `src/types/index.ts`)
- Custom marker element: Create a `div` element — `width: 32px; height: 32px; border-radius: 50%; background: var(--color-primary); border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: pointer;` — minimum 44px effective touch target with padding
- On hover: show a Mapbox `Popup` with project name and client (use `new mapboxgl.Popup({ offset: 12 })`)
- On click: navigate to project detail (call `setActiveProject(project.id)` and `navigate('/projects')`)
- When multiple projects have coordinates: call `map.fitBounds(bounds, { padding: 40, maxZoom: 12 })` to auto-zoom to show all markers

If no projects have coordinates, show the map zoomed to US center with an overlay text: "Add coordinates to your projects to see them on the map"

**Touch targets:** Marker elements must have min 44px effective target area. The 32px circle with padding gets there. At `@media (pointer: coarse)`, expand the circle to 40px.

**Accessibility:** Map pan/zoom animations should respect `prefers-reduced-motion: reduce`. Pass `{ animate: false }` to `map.fitBounds()` and `map.setStyle()` when reduced motion is preferred.

#### Theme Responsiveness

The map must respond to light/dark theme toggles (from S9-5 settings page):
```typescript
useEffect(() => {
  if (!map) return;
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-theme') {
        const theme = document.documentElement.dataset.theme;
        map.setStyle(theme === 'dark'
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/light-v11'
        );
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}, [map]);
```

#### Mapbox CSS Import

Add to the top of MapWidget.tsx or to `src/index.css`:
```css
@import 'mapbox-gl/dist/mapbox-gl.css';
```

Or in the component:
```typescript
import 'mapbox-gl/dist/mapbox-gl.css';
```

#### PROJECT_DASHBOARD.html Update

After all Sprint 10 tasks are complete, update `PROJECT_DASHBOARD.html`:
1. Move all S10-1 through S10-4 tasks from `currentSprint.tasks` to `completedWork`
2. Update `lastUpdated` to today's date
3. Update `currentSprint` to Sprint 11 (or a placeholder for Phase 2 planning)
4. Check the "Dashboard customization" Phase 1 gate criterion if applicable

### Acceptance Criteria
- [ ] `mapbox-gl` added to `package.json` dependencies
- [ ] Map renders in MapWidget when `VITE_MAPBOX_TOKEN` is set
- [ ] Map gracefully shows placeholder when token is missing (no errors, no blank white box)
- [ ] Map uses `light-v11` in light theme, `dark-v11` in dark theme
- [ ] Theme switch dynamically updates map style
- [ ] Project markers appear as green circles for projects with lat/lng coordinates
- [ ] Marker hover shows project name tooltip
- [ ] Marker click navigates to project detail
- [ ] Empty state shows when no projects have coordinates
- [ ] Map container is 280px tall with rounded corners
- [ ] `PROJECT_DASHBOARD.html` updated with Sprint 10 completion
- [ ] `npm run build` passes with zero errors
- [ ] No console errors when `VITE_MAPBOX_TOKEN` is undefined

### Design Reference
Map widget area from `design-preview-v3-customizable.html` (commit `ed22f60`). The map should fill the widget content area within the WidgetCard chrome from S10-2.

### Dependencies
- S10-2 must be complete (MapWidget renders inside WidgetCard)
- S10-3 must be complete (skeleton shimmer used for map loading state)

---

## Execution Notes

**Task order:** S10-1 → S10-2 → S10-3 → S10-4 (strictly sequential — each builds on the previous)

**CSS Custom Properties:** Sprint 9 (S9-1) migrates the design token system. All Sprint 10 code MUST use the new token names:
- `var(--surface-card)` not `var(--surface2)`
- `var(--text-primary)` not `var(--text)`
- `var(--border-default)` not `var(--border)`
- `var(--color-primary)` not `var(--green-l)`
- `var(--text-secondary)` not `var(--text-2)`
- `var(--text-tertiary)` not `var(--text-3)`
- `var(--surface-bg)` not `var(--surface)`
- `var(--surface-hover)` not `var(--surface3)`

**If S9-1 token migration didn't create exact aliases above**, use whatever the S9-1 task defined — check `src/index.css` at runtime. The S9-1 prompt includes legacy aliases, so both old and new names should work, but prefer the new semantic names.

**Pointer-based drag (NOT native HTML drag):** S10-2 MUST use `pointerdown`/`pointermove`/`pointerup` with `setPointerCapture`. Do NOT use `dragstart`/`dragover`/`drop`. This ensures consistent behavior on touch devices.

**Touch targets:** All interactive elements must be minimum 44px (48px on `@media (pointer: coarse)`).

**Reduced motion:** All animations in S10-3 must be disabled under `prefers-reduced-motion: reduce`.

**Supabase writes:** KPI selection (S10-1) and widget layout (S10-2) both write to `user_preferences`. Use the preferences service created in S9-2. If it doesn't exist, create `src/services/preferences.ts` following the `supabaseData.ts` pattern.
