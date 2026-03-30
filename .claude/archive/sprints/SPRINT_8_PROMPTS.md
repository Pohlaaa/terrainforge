# TerrainForge — Sprint 8 Prompts

## Sprint 8 — Polish, Settings & Phase 1 Closure
**Date range:** 2026-03-29 → 2026-04-05
**Goal:** Close remaining Phase 1 workflow gaps — account settings, project context UX on secondary pages, dashboard detail, and billing sync.
**Done when:** A contractor can view/edit their org name, switch projects from Work Orders and Manifest Engine directly, see project details on the dashboard, and get an up-to-date billing status without a hard refresh.
**Risk:** Settings page requires `updateOrg` action in orgStore and a Supabase UPDATE — test RLS (admin role required).

---

## S8-1: Settings Page

**Goal:** Add a `/settings` route with account and app preferences.

**Files to create:**
- `src/pages/Settings.tsx`

**Files to modify:**
- `src/App.tsx` — add `/settings` route
- `src/components/layout/Sidebar.tsx` — add Settings link in Account group (above Billing)
- `src/stores/orgStore.ts` — add `updateOrgName(name: string): Promise<void>` action

### Settings page layout

Two sections, styled like other pages (PageHeader + cards):

**Account section:**
- User email — read-only field with lock icon (from `useAuth().user.email`)
- Org / Company name — editable text input with a Save button. On save: call `updateOrgName(name)` → Supabase UPDATE `organizations SET name = $1 WHERE id = $orgId`. Show success toast ("Saved") or error message.
- Billing shortcut — "Manage Subscription →" link that navigates to `/billing`

**App section:**
- Clear Demo Data — show only if `hasDemoData` (same `isDemo` flag check as Sidebar). Button triggers same `handleClearDemoData` logic: filter out demo projects, clear crew/materials/equipment, navigate to `/`. Use a `ConfirmDialog`.
- A note: "Demo data was loaded automatically when you signed up. Clear it when you're ready to use your own data."

**`updateOrgName` in orgStore:**
```typescript
updateOrgName: async (name: string) => {
  const orgId = useOrgStore.getState().org?.id
  if (!orgId) return
  set((state) => ({ org: state.org ? { ...state.org, name } : null }))
  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', orgId)
  if (error) {
    console.error('[TF-DEBUG] updateOrgName failed', error)
  }
}
```

**Sidebar change:** In the Account group (above the Billing link), add:
```
{ path: '/settings', label: 'Settings', icon: '⚙', dotColor: '#94A3B8' }
```
Use the same nav link pattern as Billing.

**Validation gates:**
- `npm run build` must pass
- Org name field shows current `org.name` as default value
- Save button disabled while saving (local `isSaving` state)

---

## S8-2: Project Selector for Work Orders + Manifest Engine

**Goal:** Both Work Orders and Manifest Engine show an inline project picker if no active project is selected, and a "Switch Project" link in the header when one is. Eliminates the need to navigate to Projects to change context.

**Files to modify:**
- `src/pages/WorkOrders.tsx`
- `src/pages/ManifestEngine.tsx`

### Shared pattern (apply to both pages)

**When `activeProjectId` is null OR no matching project found:**

Show a full-page empty state card:
```
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="text-4xl mb-4">📋</div>
  <div className="text-lg font-semibold text-[var(--text)] mb-2">No project selected</div>
  <div className="text-sm text-[var(--text-3)] mb-6">Choose a project to view its work orders.</div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
    {projects.map(p => (
      <button key={p.id} onClick={() => setActiveProject(p.id)}
        className="text-left p-3 rounded-lg border border-[var(--border)] hover:border-[var(--color-primary)] bg-[var(--surface2)] transition-colors">
        <div className="font-medium text-sm text-[var(--text)]">{p.name}</div>
        <div className="text-xs text-[var(--text-3)] mt-0.5">{p.client}</div>
      </button>
    ))}
  </div>
</div>
```

**When a project IS selected (both pages, add to the page header area):**

Add a small "Switch project" chip next to the project name in the existing heading section:
```
<button onClick={() => setActiveProject(null)} className="text-xs text-[var(--text-3)] underline hover:text-[var(--color-primary)]">
  switch
</button>
```
This deselects the active project and shows the picker.

**In ManifestEngine.tsx:** The same pattern — when no project is active, show a project picker grid instead of the existing "no project selected" text. When one is active, show the "switch" link.

**Validation gates:**
- `npm run build` passes
- No prop type errors from `setActiveProject`

---

## S8-3: Dashboard Active Project Detail Cards

**Goal:** Replace the flat list of project names in the active projects widget with richer project cards that show useful at-a-glance detail.

**Files to modify:**
- `src/pages/Dashboard.tsx`

### Change the `activeProjectList` rendering

Current code renders a simple list with project name and checklist status. Replace with cards:

```tsx
// For each project in activeProjectList:
<div key={p.id} className="flex flex-col gap-1 p-3 rounded-lg bg-[var(--surface3)] border border-[var(--border)]">
  <div className="flex items-start justify-between gap-2">
    <div>
      <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
      <div className="text-xs text-[var(--text-3)]">{p.client}</div>
    </div>
    <Link to="/projects" onClick={() => setActiveProject(p.id)}
      className="text-xs text-[var(--color-primary)] hover:underline flex-shrink-0">
      View →
    </Link>
  </div>
  <div className="flex gap-3 text-xs text-[var(--text-3)] mt-1">
    <span>{p.zones.length} zone{p.zones.length !== 1 ? 's' : ''}</span>
    <span>${computeProjectCostRaw(p, materials).toLocaleString()} est.</span>
    <span>{Object.values(p.checklist).filter(Boolean).length}/{Object.values(p.checklist).length} checks</span>
  </div>
  {/* Checklist mini progress bar */}
  <div className="w-full h-1 rounded bg-[var(--border)] mt-1">
    <div className="h-1 rounded bg-[var(--color-primary)]"
      style={{ width: `${(Object.values(p.checklist).filter(Boolean).length / Object.values(p.checklist).length) * 100}%` }} />
  </div>
</div>
```

**Imports needed in Dashboard.tsx:** add `Link` from `react-router-dom`, `setActiveProject` from `useProjectStore`.

**Section title:** Change "Active Projects" header label to "Projects in Progress" for clarity.

**Validation gates:**
- `npm run build` passes
- No unused import warnings

---

## S8-4: Billing Page On-Mount Status Refetch (F-008)

**Goal:** Billing page always shows current subscription status — not cached/stale state from the last time the org was fetched.

**Files to modify:**
- `src/pages/Billing.tsx`

### Change

In `Billing.tsx`, the page already imports `useAuth` and `useOrgStore`. Add a `useEffect` that calls `fetchOrg` on mount:

```typescript
const { fetchOrg } = useOrgStore();

useEffect(() => {
  if (user?.id) {
    fetchOrg(user.id);
  }
}, [user?.id]);
```

This is idempotent — `fetchOrg` already handles errors gracefully. It ensures the subscription status shown is always fresh from Supabase rather than whatever was cached when the user last opened the app.

Also: update the `handleSuccess` / `handleCancelled` `useEffect` that fires on `?success=true` and `?cancelled=true` query params — after showing the toast, also call `fetchOrg(user.id)` so the status banner updates immediately after checkout redirect.

**Validation gates:**
- `npm run build` passes
- No duplicate `useEffect` (check existing effects before adding)

---

## S8-5: FINDINGS Update + PROJECT_DASHBOARD.html

**Goal:** Close out open findings addressed in Sprint 7+8 and update the project dashboard to Sprint 8.

**Files to modify:**
- `.claude/TESTING/FINDINGS.md`
- `PROJECT_DASHBOARD.html`
- `.claude/PROJECT_MANAGEMENT.md`

### FINDINGS.md changes

Add a Sprint 8 section and mark previously addressed items:

```markdown
## Sprint 8 Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-008 | P2 | Billing page stale subscription status on mount | Resolved — S8-4: fetchOrg called on Billing mount |
| F-014 | P2 | Clear Demo Data button gate broken (ID-based check) | Resolved — S5-2: isDemo flag approach replaced ID check. Button shows/hides correctly. |
| F-015 | P2 | Empty states untestable (blocked by F-014) | Resolved — Empty states work correctly after F-014 fix in S5-2 |
```

### PROJECT_DASHBOARD.html changes

1. Move Sprint 7 tasks to `completedWork`
2. Update `currentSprint` to Sprint 8 with all 5 tasks
3. Update `lastUpdated` to `"2026-03-29"`
4. In the Phase 1 gate checklist, check off the workflow completeness items that Sprint 7 addressed:
   - Material management loop ✓ (S7-5)
   - Crew assignment ✓ (S7-6)
   - Responsive layout ✓ (S7-2)
   - Professional UI ✓ (S7-1)
   - AI streamlining ✓ (S7-4)
   - Project CRUD complete ✓ (S7-3)

### PROJECT_MANAGEMENT.md changes

Add Sprint 7 and Sprint 8 to the sprint history section:
```
### Sprint 7 — Complete ✅
Goal: Professional tablet-friendly UI, AI smart project creation, material + crew assignment
All 6 tasks complete. Light theme, collapsible sidebar, clickable cards, AI project creation via Claude Haiku, per-project materials tab with CSV import, crew assignment tab. SQL migrations for project_materials and project_crew tables written.

### Sprint 8 — Active
Goal: Settings page, inline project picker for Work Orders/Manifest, Dashboard widget detail, billing sync
Tasks: S8-1 through S8-5
```

**Validation gates:**
- `npm run build` passes (this is a docs-only + HTML-only task, build should be trivially clean)
- PROJECT_DASHBOARD.html renders correctly in browser

---

## Execution Order

1. S8-1 (Settings) — new page + sidebar link + orgStore action
2. S8-2 (Project picker) — Work Orders + Manifest Engine inline picker
3. S8-3 (Dashboard cards) — richer project detail widget
4. S8-4 (Billing refetch) — on-mount fetchOrg
5. S8-5 (Docs + dashboard) — close findings, update dashboard

Each task: implement → `npm run build` → commit → PR → squash merge → next.
