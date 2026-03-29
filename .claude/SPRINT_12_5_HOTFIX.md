# Sprint 12.5 — Consolidated Bug Fixes

> **Goal**: Fix all outstanding bugs from Sprint 12 in one pass. No new features — only fixes.
> Single branch `sprint-12.5-fixes`, one commit per task, single PR to main.

---

## S12.5-1: Fix Mapbox GL CSS not loaded (map pins invisible)

**Problem**: Map markers are being created and added to the map correctly (confirmed via console: "5 projects with coords: 5"), but they're invisible because `mapbox-gl.css` is not imported. The console explicitly warns: "This page appears to be missing CSS declarations for Mapbox GL JS."

**Files to modify**:
- `src/hooks/useMapbox.ts`

**Fix**:
Add the Mapbox GL CSS import at the top of the file:
```typescript
import 'mapbox-gl/dist/mapbox-gl.css';
```

This single import loads the stylesheet that gives markers, popups, and map controls their default dimensions and positioning. Without it, marker elements are 0x0px and invisible.

**Also check**: `src/components/shared/AddressInput.tsx` — if it uses Mapbox for the mini-map preview, ensure it also imports the CSS (or relies on useMapbox which will now have it).

**Acceptance criteria**:
- [ ] Map pins are visible on the dashboard map widget
- [ ] Pin colors match project status (green/blue/amber/red/gray)
- [ ] Clicking a pin shows a popup with project details
- [ ] Mini-map in address input shows a pin at the verified address
- [ ] `npm run build` passes

---

## S12.5-2: Fix zones not persisting on project creation

**Problem**: When creating a project with zones, the zones are passed to `addProject` in the store, which calls `createProject` in supabaseData.ts. But `createProject` destructures zones OUT of the data (line 116: `const { zones, ...projectData } = project`) and never writes them to the `zones` table. The `createZone()` function exists but is never called during project creation.

**Files to modify**:
- `src/services/supabaseData.ts`

**Fix**:
In the `createProject` function, after the project is successfully inserted into the `projects` table (after the `if (error) throw error` on line 137), add zone creation:

```typescript
// Write zones to the zones table
if (zones && zones.length > 0) {
  for (const zone of zones) {
    const zoneToCreate = {
      ...zone,
      projectId: id,
    };
    // Remove fields that createZone doesn't expect
    delete (zoneToCreate as any).id;
    delete (zoneToCreate as any).createdAt;
    await createZone(zoneToCreate);
  }
}
```

Place this BEFORE the return statement. Note: `createZone` handles its own field mapping (area → area_sqft, perimeter → perimeter_lnft, etc.) so just pass the zone object with projectId set.

**Acceptance criteria**:
- [ ] Create a project with 2 zones → zones appear when viewing the project
- [ ] Zone names, area, and other fields persist correctly
- [ ] Zones show up after page refresh (data is in Supabase, not just local state)
- [ ] `npm run build` passes

---

## S12.5-3: Fix AI-suggested materials not persisting to project

**Problem**: The AI quick-create generates material suggestions and they can now be clicked to "add" them, but they don't actually persist to the project. The materials need to be written to the project via `addProjectMaterial` after the project is created.

**Files to modify**:
- `src/pages/Projects.tsx`

**Fix**:
In the `handleCreate` function, after `addProject()` succeeds and the project is in the store, check if there are AI-suggested materials that the user accepted. For each accepted material:

1. Find the newly created project in the store (it was just added)
2. Call `addProjectMaterial(newProjectId, { materialId, quantity, unit })` for each material

The exact implementation depends on how the "Add" button state is tracked. If materials are marked as "added" via local state, iterate through the added ones and call the store method.

If the current implementation doesn't track which AI materials were accepted, add a local state array `acceptedMaterials` that gets populated when the user clicks "+" on a suggested material, then use that array after project creation.

**Acceptance criteria**:
- [ ] Use AI quick-create → click "+" on suggested materials → create project → materials are associated with the project
- [ ] Materials appear in the project detail view after creation
- [ ] Materials persist after page refresh
- [ ] `npm run build` passes

---

## S12.5-4: Fix zones added manually in project form not persisting

**Problem**: Even without AI, manually adding zones in the new project form doesn't persist them. This is the same root cause as S12.5-2 (zones stripped in createProject), but verify the manual zone builder UI correctly passes zone data to addProject.

**Files to check/modify**:
- `src/pages/Projects.tsx` — verify the zone builder's `newProjectZones` state is correctly formatted and passed to `addProject` with all required fields

**Fix**:
After fixing S12.5-2, test manual zone creation. If zones still don't persist, the issue is likely in how `newProjectZones` are formatted. Ensure each zone object has:
- `name` (string, required)
- `area` (number)
- `perimeter` (number, default 0)
- `sequence` (number)
- `crew` (string, default '')
- `dependencies` (string[], default [])
- `notes` (string, default '')
- `materials` (array, default [])
- `equipment` (array, default [])

If the zone builder UI is missing any of these fields, provide defaults.

**Acceptance criteria**:
- [ ] Add 2 zones manually in new project form → create project → zones appear in project detail
- [ ] Zone data persists after page refresh
- [ ] `npm run build` passes

---

## Execution Notes

- Branch: `sprint-12.5-fixes`
- One commit per task
- After all tasks, create PR: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-12.5-fixes --title "Sprint 12.5: Map pins, zones, materials persistence fixes" --body "Fix Mapbox CSS, zone persistence, AI material persistence"`
- **Test after each commit**: Run `npm run build` to verify no regressions
- Push: `git push origin sprint-12.5-fixes`
