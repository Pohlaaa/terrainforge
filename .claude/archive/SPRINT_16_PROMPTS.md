# Sprint 16 — Fix + Polish (Manager App Cleanup)

> **Branch**: `sprint-16-fix-polish`
> **Base**: `main`
> **Milestone**: M1 "Worth the Demo"
> **Scope**: 7 tasks — bug fixes, scheduling enhancements, active project UX, Debug page removal

---

## Context Files to Read First

1. `CLAUDE.md` (project root) — architecture rules, naming conventions
2. `.claude/CODE_GUIDE.md` — execution workflow, git, build commands
3. This file — all 7 tasks below

---

## Task 1 (S16-1): Fix fetchMaterials missing org_id filter

**Problem**: `fetchMaterials()` in `src/services/supabaseData.ts` runs a bare `SELECT *` on the `materials` table without filtering by `org_id`. RLS policies block the read, causing an empty result and triggering the error reporter → in-app error toast when adding or loading materials.

**File**: `src/services/supabaseData.ts`

**Find the `fetchMaterials` function** (starts around line 387):
```typescript
export async function fetchMaterials(): Promise<Material[]> {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
```

**Change to**:
```typescript
export async function fetchMaterials(orgId: string): Promise<Material[]> {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('org_id', orgId)
```

**Then update all callers** — search for `fetchMaterials()` in `src/stores/materialStore.ts`. Each call must now pass `orgId`:
```typescript
const orgId = useOrgStore.getState().org?.id;
if (!orgId) return;
const materials = await db.fetchMaterials(orgId);
```

Import `useOrgStore` if not already imported:
```typescript
import { useOrgStore } from './orgStore'
```

**Acceptance criteria**: `npm run build` passes. Materials page loads without error toast. Adding a material works and the list refreshes.

---

## Task 2 (S16-2): Fix fetchEquipment missing org_id filter

**Problem**: Identical to Task 1. `fetchEquipment()` in `src/services/supabaseData.ts` runs `SELECT *` on `equipment` without `org_id` filter.

**File**: `src/services/supabaseData.ts`

**Find the `fetchEquipment` function** (starts around line 648):
```typescript
export async function fetchEquipment(): Promise<Equipment[]> {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        maintenance_log (...)
      `)
```

**Change to**:
```typescript
export async function fetchEquipment(orgId: string): Promise<Equipment[]> {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        maintenance_log (...)
      `)
      .eq('org_id', orgId)
```

**Then update all callers** in `src/stores/equipmentStore.ts` — same pattern as Task 1. Pass `orgId` from `useOrgStore.getState().org?.id`.

**Acceptance criteria**: `npm run build` passes. Equipment page loads without error toast. Adding equipment works and the list refreshes.

---

## Task 3 (S16-3): Audit and fix all remaining fetch functions missing org_id

**Problem**: The same pattern (missing `org_id` filter) may exist on other fetch functions. Do a full audit.

**File**: `src/services/supabaseData.ts`

**Audit every function** that does `.from('table_name').select(...)`. For each one, check whether it filters by `org_id`. If not, add `.eq('org_id', orgId)` and update the function signature to accept `orgId: string`.

**Known tables that require org_id filtering**:
- `projects` (check `fetchProjects`)
- `materials` (fixed in Task 1)
- `equipment` (fixed in Task 2)
- `crew_members` (check `fetchCrewMembers`)
- `schedule_entries` (already has org_id filter — verify)
- `work_orders` (check if this table exists and has a fetch function)
- `zones`, `zone_materials` — these are fetched via project joins, verify they don't need separate fixes

**For each function missing the filter**:
1. Add `orgId: string` parameter
2. Add `.eq('org_id', orgId)` to the query
3. Update all callers in the corresponding store to pass `orgId` from `useOrgStore`
4. Add early return `if (!orgId) return []` guard

**Acceptance criteria**: `npm run build` passes. Every page that loads data works without error toasts. Work Orders page works with an active project selected.

---

## Task 4 (S16-4): Add edit modal for existing schedule entries

**Problem**: Users can create and delete schedule entries, but can't edit them (change project, time, notes, or status). The only way to "move" an entry is drag-and-drop.

**File**: `src/pages/Schedule.tsx`

**Implementation**:

1. Add an `editEntry` state variable alongside `modalTarget`:
```typescript
const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
```

2. When clicking an existing chip (not the "✕" button), open the modal in edit mode:
```typescript
onClick={(e) => {
  e.stopPropagation();
  setEditEntry(entry);
  setModalTarget({ crewMemberId: entry.crewMemberId, date: entry.scheduledDate });
}}
```

3. Modify `AssignModal` to accept an optional `existingEntry` prop:
```typescript
interface AssignModalProps {
  crewMemberId: string;
  date: string;
  existingEntry?: ScheduleEntry | null;
  onClose: () => void;
}
```

4. When `existingEntry` is provided, pre-fill the form fields:
```typescript
const [projectId, setProjectId] = useState(existingEntry?.projectId ?? '');
const [startTime, setStartTime] = useState(existingEntry?.startTime ?? '');
const [endTime, setEndTime] = useState(existingEntry?.endTime ?? '');
const [notes, setNotes] = useState(existingEntry?.notes ?? '');
const [status, setStatus] = useState<ScheduleEntryStatus>(existingEntry?.status ?? 'scheduled');
```

5. Add a status dropdown (only visible in edit mode):
```typescript
{existingEntry && (
  <div>
    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
      Status
    </label>
    <select
      value={status}
      onChange={e => setStatus(e.target.value as ScheduleEntryStatus)}
      style={{
        width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
      }}
    >
      <option value="scheduled">Scheduled</option>
      <option value="in_progress">In Progress</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </select>
  </div>
)}
```

6. Change the submit handler to call `updateEntry` when editing:
```typescript
async function handleSubmit() {
  if (!projectId) return;
  setSubmitting(true);
  if (existingEntry) {
    await updateEntry(existingEntry.id, {
      projectId,
      startTime: startTime || null,
      endTime: endTime || null,
      notes,
      status,
    });
  } else {
    await addEntry({ ... });
  }
  setSubmitting(false);
  onClose();
}
```

7. Update the modal title and button text:
```typescript
<div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
  {existingEntry ? 'Edit Assignment' : 'Assign to Schedule'}
</div>
```
```typescript
{submitting ? (existingEntry ? 'Saving…' : 'Assigning…') : (existingEntry ? 'Save' : 'Assign')}
```

8. Pass `editEntry` to the modal and clear both states on close:
```typescript
{modalTarget && (
  <AssignModal
    crewMemberId={modalTarget.crewMemberId}
    date={modalTarget.date}
    existingEntry={editEntry}
    onClose={() => { setModalTarget(null); setEditEntry(null); }}
  />
)}
```

**Import needed**: Add `ScheduleEntryStatus` to the import from `@/types` if not already imported.

**Acceptance criteria**: `npm run build` passes. Clicking a schedule chip opens the edit modal with pre-filled values. Changing status/notes/time and clicking Save updates the entry. Creating new entries still works via empty cell click.

---

## Task 5 (S16-5): Add equipment assignment to schedule entries

**Problem**: The schedule entry type has an `equipmentId` field but the UI ignores it. Contractors need to assign equipment (trucks, excavators, etc.) to schedule entries.

**File**: `src/pages/Schedule.tsx`

**Implementation**:

1. Import the equipment store at the top of Schedule.tsx:
```typescript
import { useEquipmentStore } from '@/stores/equipmentStore';
```

2. In the main `Schedule` component, pull equipment data:
```typescript
const { equipment } = useEquipmentStore();
```

3. In the `AssignModal` component, add `equipment` as a prop or import the store directly. Add an equipment dropdown below the project dropdown:
```typescript
<div>
  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
    Equipment (optional)
  </label>
  <select
    value={equipmentId}
    onChange={e => setEquipmentId(e.target.value || null)}
    style={{
      width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: '8px', color: 'var(--text)', padding: '9px 12px', fontSize: '13px', outline: 'none',
    }}
  >
    <option value="">— None —</option>
    {equipment.filter(eq => eq.status === 'available' || eq.id === existingEntry?.equipmentId).map(eq => (
      <option key={eq.id} value={eq.id}>{eq.name} ({eq.type})</option>
    ))}
  </select>
</div>
```

4. Add `equipmentId` state:
```typescript
const [equipmentId, setEquipmentId] = useState<string | null>(existingEntry?.equipmentId ?? null);
```

5. Include `equipmentId` in both the create and update calls.

6. Show equipment name on the chip tooltip (update the `title` attribute):
```typescript
const equipName = equipmentId ? equipmentMap[entry.equipmentId ?? ''] : '';
title={`${projName}${equipName ? ' · ' + equipName : ''}${entry.startTime ? ' · ' + entry.startTime : ''}${entry.notes ? '\n' + entry.notes : ''}`}
```

7. Build an `equipmentMap` alongside `projectMap`:
```typescript
const equipmentMap = useMemo(
  () => Object.fromEntries(equipment.map(eq => [eq.id, eq.name])),
  [equipment]
);
```

**Acceptance criteria**: `npm run build` passes. Equipment dropdown appears in both create and edit modals. Selected equipment shows in chip tooltip. Only available equipment (or already-assigned) shows in the dropdown.

---

## Task 6 (S16-6): Improve active project indicator in sidebar

**Problem**: The sidebar has an "ACTIVE PROJECT" pill at the bottom, but the main navigation items don't visually indicate that a project is active. Users don't notice the bottom pill.

**File**: `src/components/layout/Sidebar.tsx`

**Implementation**:

1. Find the "Projects" navigation item rendering (inside the `navItems.map` block). When `activeProjectId` is not null, add a small indicator dot next to the Projects label:

After the label `<span>` for the Projects nav item (path === '/projects'), add:
```typescript
{item.path === '/projects' && activeProjectId && (
  <span style={{
    width: '6px', height: '6px', borderRadius: '50%',
    background: 'var(--green-l)', flexShrink: 0,
    marginLeft: 'auto',
  }} />
)}
```

2. Also add the same indicator to Work Orders (path === '/work-orders') since it's the other page that uses activeProjectId:
```typescript
{item.path === '/work-orders' && activeProjectId && (
  <span style={{
    width: '6px', height: '6px', borderRadius: '50%',
    background: 'var(--green-l)', flexShrink: 0,
    marginLeft: 'auto',
  }} />
)}
```

3. In the Projects page (`src/pages/Projects.tsx`), add a visual highlight to the currently active project card. Find the project card render (the main list items). Add a left border accent when the card is the active project:
```typescript
style={{
  ...existingStyles,
  borderLeft: project.id === activeProjectId ? '3px solid var(--green-l)' : '3px solid transparent',
}}
```

**Acceptance criteria**: `npm run build` passes. When a project is active, a green dot appears next to "Projects" and "Work Orders" in the sidebar. The active project card has a green left border in the project list.

---

## Task 7 (S16-7): Remove Debug page from production routing

**Problem**: The Debug page is gated by `import.meta.env.DEV` in `src/App.tsx`, which means it's already hidden in production builds. However, the import still exists and adds to the bundle size. Clean it up properly.

**File**: `src/App.tsx`

**Find** (around line 58):
```typescript
{import.meta.env.DEV && <Route path="/debug" element={<Debug />} />}
```

**This is already correct** — the route only renders in dev mode. However, the `import Debug from '@/pages/Debug'` at the top still bundles the Debug component in production.

**Fix**: Convert to a lazy import so it's only loaded in dev:
```typescript
// At the top, replace the static import:
// import Debug from '@/pages/Debug'  ← REMOVE this line

// Add lazy import:
const Debug = import.meta.env.DEV
  ? React.lazy(() => import('@/pages/Debug'))
  : () => null;
```

Also wrap the route in Suspense for the lazy load:
```typescript
{import.meta.env.DEV && (
  <Route path="/debug" element={
    <React.Suspense fallback={<div>Loading...</div>}>
      <Debug />
    </React.Suspense>
  } />
)}
```

Make sure `React` is imported (it should already be via JSX usage).

**Acceptance criteria**: `npm run build` passes. Debug page still accessible at `/debug` in dev mode. Production bundle no longer includes Debug page code (verify by checking the build output size is slightly smaller).

---

## Post-Sprint: What to Test

### Bug Fixes (Tasks 1-3)
1. Navigate to /materials → page loads without error toast
2. Add a new material → saves successfully, appears in list
3. Navigate to /equipment → page loads without error toast
4. Add new equipment → saves successfully, appears in list
5. Navigate to /work-orders with an active project → page loads, shows work orders for that project
6. Navigate to /work-orders without an active project → shows empty state with project selector

### Schedule Enhancements (Tasks 4-5)
7. Click an existing schedule chip → edit modal opens with pre-filled values
8. Change the status to "In Progress" → save → status badge updates
9. Change the notes → save → tooltip reflects new notes
10. In the edit/create modal, equipment dropdown appears
11. Assign equipment to an entry → tooltip shows equipment name
12. Only available equipment shows in the dropdown (plus already-assigned)

### Active Project UX (Task 6)
13. Select a project → green dot appears next to "Projects" and "Work Orders" in sidebar
14. Deselect project → green dots disappear
15. Active project card in the project list has a green left border

### Debug Page (Task 7)
16. In dev mode (`npm run dev`), navigate to /debug → page loads
17. `npm run build` succeeds

### Regression Checks
18. Dashboard loads and all widgets render
19. Schedule page: create, edit, delete, drag-drop all work
20. Crew Manager: add/edit/delete crew members
21. PDF export still works (manifest + crew packet)
22. Login/logout cycle works

---

## Commit Format

One commit per task:
- `S16-1: Fix fetchMaterials missing org_id filter`
- `S16-2: Fix fetchEquipment missing org_id filter`
- `S16-3: Audit and fix all fetch functions missing org_id filter`
- `S16-4: Add edit modal for existing schedule entries`
- `S16-5: Add equipment assignment to schedule entries`
- `S16-6: Improve active project indicator in sidebar`
- `S16-7: Lazy-load Debug page to exclude from production bundle`

## PR

```
"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --title "Sprint 16: Fix + Polish — bug fixes, schedule enhancements, active project UX" --body "7 tasks:
- Fix 3 pre-existing Supabase fetch bugs (missing org_id filters)
- Add edit modal for schedule entries with status workflow
- Add equipment assignment to schedule entries
- Improve active project indicator in sidebar navigation
- Lazy-load Debug page for production bundle optimization"
```
