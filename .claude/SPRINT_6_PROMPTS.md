# Sprint 6 Prompts — Persistence Fix + Demo Polish

**Goal:** Fix the delete+create persistence regression (P0), resolve readability/UX bugs from pilot demo, add project editing. Get the app to a state where a contractor can use it without hitting data loss.

Each prompt is designed to be run by Claude Code. After each task, run `git pull origin main` in PowerShell, then push triggers Netlify redeploy automatically.

---

## S6-1: Fix Delete + Create Persistence Regression (P0 — F-027)

**Context:** Projects, materials, and equipment disappear on refresh after a cycle of deleting and creating items. Root cause analysis identified three interlocking issues:

1. All delete functions use optimistic deletion — they remove from Zustand state BEFORE confirming Supabase delete succeeded. If the Supabase delete fails (e.g., RLS rejection), the item is gone locally but still exists in the DB. On next fetch, the "deleted" item reappears alongside newly created ones, confusing the state.
2. The return value from `db.deleteProject()`, `db.deleteMaterial()`, `db.deleteEquipment()` (boolean) is never checked.
3. RLS DELETE policies require `user_is_admin(org_id)`. If the user's role in `organization_members` is not 'admin', deletes are silently rejected.

Additionally, after a failed delete + successful create, the Zustand persist middleware writes the inconsistent state to localStorage. On refresh, Supabase fetch returns different data than localStorage had, causing visual inconsistency.

**Changes required:**

### Phase 1: Fix delete operations to confirm before removing from state

**`src/stores/projectStore.ts` — `deleteProject` action**
Replace the current optimistic delete pattern with a confirm-first pattern:
```typescript
deleteProject: async (id) => {
  try {
    const success = await db.deleteProject(id)
    if (!success) {
      console.error('[TF-DEBUG] deleteProject: Supabase delete failed for', id)
      set((state) => ({ error: 'Failed to delete project. Please try again.' }))
      return
    }
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    }))
  } catch (err: any) {
    console.error('[TF-DEBUG] deleteProject error:', err)
    set((state) => ({ error: err.message }))
  }
},
```

**`src/stores/materialStore.ts` — `deleteMaterial` action**
Same pattern — wait for Supabase confirmation before removing from state:
```typescript
deleteMaterial: async (id) => {
  try {
    const success = await db.deleteMaterial(id)
    if (!success) {
      console.error('[TF-DEBUG] deleteMaterial: Supabase delete failed for', id)
      set((state) => ({ error: 'Failed to delete material. Please try again.' }))
      return
    }
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }))
  } catch (err: any) {
    console.error('[TF-DEBUG] deleteMaterial error:', err)
    set((state) => ({ error: err.message }))
  }
},
```

**`src/stores/equipmentStore.ts` — `deleteEquipment` action**
Same pattern:
```typescript
deleteEquipment: async (id) => {
  try {
    const success = await db.deleteEquipment(id)
    if (!success) {
      console.error('[TF-DEBUG] deleteEquipment: Supabase delete failed for', id)
      set((state) => ({ error: 'Failed to delete equipment. Please try again.' }))
      return
    }
    set((state) => ({
      equipment: state.equipment.filter((e) => e.id !== id),
    }))
  } catch (err: any) {
    console.error('[TF-DEBUG] deleteEquipment error:', err)
    set((state) => ({ error: err.message }))
  }
},
```

### Phase 2: Fix create operations to sync local ID with Supabase

**`src/stores/projectStore.ts` — `addProject` action**
After the Supabase write succeeds, update the local project's ID to match what Supabase returned (in case Supabase generated a different ID or the write used the local UUID). Add a refetch after create to ensure local and remote state are in sync:
- After `await db.createProject(...)` succeeds, call `get().fetchProjects()` to resync from Supabase. This ensures the local state matches the DB exactly.
- If `db.createProject()` returns null (write failed), remove the optimistically-added project from state and set an error.

```typescript
addProject: async (projectData) => {
  const orgId = useOrgStore.getState().org?.id
  if (!orgId) {
    console.error('[TF-DEBUG] addProject: no org_id available')
    return
  }
  const newProject: Project = {
    ...projectData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    zones: []
  }
  // Optimistic add
  set((state) => ({ projects: [...state.projects, newProject] }))
  try {
    const result = await db.createProject(projectData, newProject.id, orgId)
    if (!result) {
      console.error('[TF-DEBUG] addProject: Supabase write failed, rolling back')
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== newProject.id),
        error: 'Failed to save project. Please try again.'
      }))
      return
    }
    // Resync from Supabase to ensure consistency
    await get().fetchProjects()
  } catch (err: any) {
    console.error('[TF-DEBUG] addProject error:', err)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== newProject.id),
      error: err.message
    }))
  }
},
```

Apply the same resync-after-create pattern to `addMaterial` in materialStore.ts and `addEquipment` in equipmentStore.ts. Each should:
1. Do the optimistic add (existing behavior)
2. Await the Supabase write
3. If write fails: rollback optimistic add + set error
4. If write succeeds: call the store's fetch function to resync

### Phase 3: Verify Supabase delete functions return meaningful results

**`src/services/supabaseData.ts`**
Check the three delete functions (`deleteProject`, `deleteMaterial`, `deleteEquipment`). Each should:
- Log `[TF-DEBUG] deleteX: attempting delete for id`, the id
- After the `.delete().eq('id', id)` call, check for errors
- Log `[TF-DEBUG] deleteX: success` or `[TF-DEBUG] deleteX: failed — ` + full error
- Return `true` only if no error occurred

### Phase 4: Add refetch-after-delete safety net

After a successful delete in each store, call the store's fetch function to resync:
- `deleteProject`: after removing from state, call `get().fetchProjects()`
- `deleteMaterial`: after removing from state, call `get().fetchMaterials()`
- `deleteEquipment`: after removing from state, call `get().fetchEquipment()`

This is a belt-and-suspenders approach — the state mutation handles the UI immediately, and the refetch ensures DB consistency.

**Validation:** `npm run build` must pass with zero TypeScript errors.

```bash
git add -A
git commit -m "S6-1: Fix delete+create persistence regression (F-027)

Root cause: optimistic deletes removed items from state before confirming
Supabase delete succeeded. Failed deletes left orphaned DB records that
reappeared on refresh. Fix: confirm-first delete pattern, rollback on
failed creates, refetch after all mutations to ensure state consistency."
gh pr create --title "S6-1: Fix delete+create persistence" --body "Fixes F-027. Confirm-first deletes, create rollback, post-mutation refetch." --base main
gh pr merge --squash --auto
```

---

## S6-2: Fix Text Readability / Dropdown Styling (P1 — F-030)

**Context:** Pilot user reported text is hard to read across the site, particularly in dropdown menus where text renders as white on light backgrounds in some browsers. The app uses a dark theme with CSS custom properties. The likely issue is that `<select>` elements and dropdown options inherit the dark theme text color but browsers render the dropdown options panel with their native (light) background.

**Changes required:**

**Global fix for select elements — find the CSS file (likely `src/index.css` or `src/App.css` or a global styles file)**
Add explicit styling for select elements and their options:
```css
select,
select option {
  background-color: var(--surface-dark, #1a1a2e);
  color: var(--text-primary, #e0e0e0);
}
```

**Audit all `<select>` elements across the codebase:**
Search for `<select` in all `.tsx` files. For each one, ensure it has explicit `className` with background and text color classes. If using Tailwind: `bg-gray-800 text-gray-100`. If using CSS custom properties: ensure `background-color` and `color` are set.

**Also check:**
- Input fields (`<input>`) — ensure placeholder text is visible against dark backgrounds
- Any component using `react-select` or custom dropdowns — ensure the dropdown menu panel has a dark background
- Modal or dialog overlays — ensure text contrast meets WCAG AA (4.5:1 ratio minimum)

**Validation:**
- `npm run build` must pass
- Visually check dropdowns in the browser — option text must be readable on both Chrome and Firefox

```bash
git add -A
git commit -m "S6-2: Fix dropdown and text readability across dark theme (F-030)

Select elements and dropdown options were inheriting text color but not
background color from the dark theme, causing white-on-white text in
some browsers. Fix: explicit background + color on all select/option elements."
gh pr create --title "S6-2: Fix text readability in dark theme" --body "Fixes F-030. Explicit dark theme styling on select/option elements." --base main
gh pr merge --squash --auto
```

---

## S6-3: Add Project Edit Capability (P1 — FR-002)

**Context:** Currently users can create projects but cannot edit the overall project details (name, description, dates, status) after creation. The pilot user flagged this as a critical gap — real workflows require changing project details constantly.

**Changes required:**

**`src/stores/projectStore.ts`**
Verify that `updateProject` action exists and works. It should:
1. Accept `(id: string, updates: Partial<Project>)`
2. Optimistically update local state
3. Call `db.updateProject(id, updates)`
4. If Supabase write fails, rollback and set error
5. On success, refetch to resync

**`src/services/supabaseData.ts`**
Verify `updateProject` function exists. If not, add one:
- Takes `id: string` and a partial update object
- Converts to snake_case
- Calls `.update(snakeData).eq('id', id)`
- Returns the updated record or null on failure

**`src/components/` or `src/pages/` — Projects page**
Find the Projects page component. Add an "Edit Project" UI:
- When viewing a project, show an "Edit" button (pencil icon from lucide-react)
- Clicking opens a modal or inline edit form pre-populated with current values
- Form fields: name, description, status (dropdown), start_date, target_date, budget
- Save calls `updateProject(id, formData)`
- Cancel discards changes

**Date validation (F-029):**
In the project form (both create and edit), if the user selects a `start_date` in the past:
- Show a confirmation: "This date is in the past. Are you sure you want to backdate this project?"
- Use a simple `window.confirm()` or a styled modal — keep it lightweight

**Validation:** `npm run build` must pass.

```bash
git add -A
git commit -m "S6-3: Add project edit capability + backdate warning (FR-002, F-029)

Users can now edit project name, description, status, dates, and budget
after creation. Backdate confirmation shown when start_date is in the past."
gh pr create --title "S6-3: Project edit + backdate warning" --body "Adds FR-002 and fixes F-029." --base main
gh pr merge --squash --auto
```

---

## S6-4: Fix Signup Email Validation + Crew Recommend Button (P1 — F-028, P2 — F-031)

**Context:** Two smaller bugs from the pilot demo.

### Fix 1: Email validation on signup (F-028)
Supabase Auth allows signup with any valid email format, even non-existent addresses. The proper fix is enabling Supabase's email confirmation flow.

**Supabase Dashboard change (manual — not code):**
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Go to Authentication → Providers → Email
3. Enable "Confirm email" toggle
4. Customize the confirmation email template if desired

**Frontend change — `src/contexts/AuthContext.tsx` or signup component:**
After `supabase.auth.signUp()` returns successfully, check if `data.user?.identities?.length === 0` (indicates email already in use) or if `data.user?.confirmed_at` is null (needs confirmation). Show a message: "Check your email to confirm your account before signing in."

### Fix 2: Crew Recommend button (F-031)
**Find the Recommend Crew button** — search for "recommend" or "Recommend" in .tsx files. Either:
- Wire it to the existing AI integration (if a crew recommendation function exists in AI_PRODUCT.md plans)
- Or remove/disable the button with a "Coming soon" tooltip if the feature isn't built yet

If wiring to AI: the recommendation should look at project zone requirements and suggest crew members with matching skills/certifications from the crew store.

If deferring: replace the button with a disabled state + tooltip "AI crew recommendations coming soon".

**Validation:** `npm run build` must pass.

```bash
git add -A
git commit -m "S6-4: Enable email confirmation + fix crew recommend button (F-028, F-031)

Signup now requires email confirmation. Crew recommend button disabled
with 'coming soon' indicator until AI integration is complete."
gh pr create --title "S6-4: Email confirmation + crew button fix" --body "Fixes F-028 and F-031." --base main
gh pr merge --squash --auto
```

---

## S6-5: Smoke Test + Phase 1 Gate Review

**This is a manual task — not a Code prompt.**

After S6-1 through S6-4 are deployed to staging:

1. Create a new account on staging (use a real email since confirmation is now required)
2. Create 3 projects with different names and dates
3. Delete 1 project
4. Create 2 more projects
5. Refresh the page — all 4 remaining projects should persist
6. Sign out and back in — same 4 projects should be there
7. Add materials and equipment, delete some, refresh — verify persistence
8. Test dropdowns — text should be readable
9. Edit a project — change name, dates, status. Refresh. Changes persist.
10. Try backdating a project — confirmation dialog should appear

**Phase 1 Gate Check:**
- [x] All 8 pages pulling live data
- [x] Supabase data persisting end-to-end (verify with this smoke test)
- [x] PDF manifest export working
- [x] Stripe billing collecting payments
- [ ] At least 1 real contractor using the app (pilot user — in progress)
- [x] Auth + multi-tenancy tested with 2+ accounts

If persistence passes, we're at 5/6 with pilot user as the only remaining gate.
