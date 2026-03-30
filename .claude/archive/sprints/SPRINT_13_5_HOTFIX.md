# Sprint 13.5 — Hotfix: Pin Hover + Material Persistence

> **Branch**: `sprint-13.5-hotfix` off `main`
> **PR**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-13.5-hotfix --title "Sprint 13.5: Fix pin hover jump and material persistence" --body "Two targeted fixes for test failures from Sprint 13"`

---

## S13.5-1: Fix Map Pin Jumping to Upper-Left on Hover

**Problem**: When hovering over a map pin, it jumps to the upper-left corner of the map. After zooming out, pins return to correct positions. Pins also lag ~0.5s behind map panning.

**Root cause**: The custom marker element uses `transform: scale(1.15)` on hover (line 160 of `useMapbox.ts`), which conflicts with Mapbox GL's own CSS transform-based positioning (`.mapboxgl-marker { position: absolute; transform: translate(-50%, -50%) ... }`). When our mouseenter handler sets `el.style.transform = 'scale(1.15)'`, it OVERWRITES Mapbox's positioning transform, snapping the pin to (0,0).

**File**: `src/hooks/useMapbox.ts`

**Fix**: Replace the `transform`-based hover with a non-transform approach. Change lines 160-161:

REMOVE:
```typescript
el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
```

REPLACE WITH:
```typescript
el.addEventListener('mouseenter', () => {
  el.style.width = '38px';
  el.style.height = '38px';
  el.style.marginLeft = '-3px';
  el.style.marginTop = '-3px';
});
el.addEventListener('mouseleave', () => {
  el.style.width = '32px';
  el.style.height = '32px';
  el.style.marginLeft = '0';
  el.style.marginTop = '0';
});
```

Also add `transition: width 0.15s ease, height 0.15s ease, margin 0.15s ease` to the el.style.cssText (replace the existing `transition:transform 0.15s ease` on line 154).

**Acceptance criteria**:
- [ ] Hovering a pin makes it grow slightly without jumping position
- [ ] Pins stay in correct geographic position during hover
- [ ] Pins track smoothly with map panning (no excessive lag)
- [ ] Clicking a pin still opens the popup
- [ ] `npm run build` passes

---

## S13.5-2: Fix Material Persistence After Project Creation

**Problem**: AI-suggested materials that the user accepts (clicks "+") don't persist. The `addProjectMaterial` calls never fire because the project lookup fails.

**Root cause**: In `src/pages/Projects.tsx` lines 264-267:
```typescript
const newProject = useProjectStore.getState().projects.find(
  (p) => p.name === form.name.trim() && p.client === form.client.trim()
);
```

This lookup fails because:
1. `addProject` (in projectStore.ts line 246) calls `await fetchProjects()` which re-fetches all projects from Supabase
2. The `client` field is stripped before Supabase insert (supabaseData.ts line 122: `delete snakeData.client`)
3. When projects come back from Supabase, `client` is `null`
4. `p.client === form.client.trim()` → `null === "John Smith"` → false
5. `newProject` is undefined, so the materials block never executes

**File**: `src/pages/Projects.tsx`

**Fix**: The project ID is already known — `addProject` in the store creates it with `crypto.randomUUID()` on line 229. We need `addProject` to return the ID so Projects.tsx can use it directly.

**Step 1** — In `src/stores/projectStore.ts`, change `addProject` to return the project ID:

Change the type signature (around line 29-30, wherever `addProject` is defined in the interface):
```typescript
addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<string | null>
```

In the implementation (line 220+), add `return newProject.id` on success and `return null` on failure:
- After `await get().fetchProjects()` (line 246), add: `return newProject.id`
- In the catch block and the `if (!result)` block, add: `return null`
- At the very end of the function if somehow nothing returned: `return null`

**Step 2** — In `src/pages/Projects.tsx`, capture the returned ID and use it:

Change the material persistence block (around lines 248-280). Replace:
```typescript
await addProject({
  name: form.name.trim(),
  // ... all the fields
  zones: builtZones,
});

// Persist only the AI-suggested materials the user staged (clicked "+")
if (aiSuggestion?.suggestedMaterials?.length && addedMaterialIndices.size > 0) {
  const newProject = useProjectStore.getState().projects.find(
    (p) => p.name === form.name.trim() && p.client === form.client.trim()
  );
  if (newProject) {
```

WITH:
```typescript
const newProjectId = await addProject({
  name: form.name.trim(),
  // ... all the fields (keep exactly as-is)
  zones: builtZones,
});

// Persist only the AI-suggested materials the user staged (clicked "+")
if (newProjectId && aiSuggestion?.suggestedMaterials?.length && addedMaterialIndices.size > 0) {
```

And replace `newProject.id` with `newProjectId` on line 271:
```typescript
addProjectMaterial(newProjectId, {
```

Remove the entire `.find()` block (lines 265-267) and the closing `}` for `if (newProject)`.

**Also fix the duplicate entry bug in `addProjectMaterial`** (projectStore.ts line 396):

Current code (line 396):
```typescript
const allEntries = [...(get().projectMaterials[projectId] ?? []), newEntry]
```

This reads the store AFTER `set()` already added `newEntry`, then adds it AGAIN. Fix:
```typescript
const allEntries = get().projectMaterials[projectId] ?? []
```

The `set()` on lines 389-394 already added `newEntry` to the store. Reading `get().projectMaterials[projectId]` after set returns the array WITH `newEntry` included. Just use that directly.

**Acceptance criteria**:
- [ ] Create a project with AI suggestions → click "+" on 2-3 materials → save
- [ ] Materials appear in the project view immediately
- [ ] Hard refresh → materials still present (persisted to Supabase)
- [ ] No duplicate materials in the array
- [ ] Console shows no errors during this flow
- [ ] `npm run build` passes

---

## IMPORTANT: File Integrity Check

Before starting ANY edits, verify `src/hooks/useMapbox.ts` is 215 lines:
```bash
wc -l src/hooks/useMapbox.ts
```
If it shows 139 lines, the file is truncated. Restore it first:
```bash
git checkout main -- src/hooks/useMapbox.ts
```
Then proceed with the S13.5-1 edits on the restored 215-line file.
