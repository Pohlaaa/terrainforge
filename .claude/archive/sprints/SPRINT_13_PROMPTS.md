# Sprint 13 — Full-Stack Persistence & Display Fixes

> **Goal**: Fix all outstanding bugs from Sprints 12/12.5 that involve Supabase persistence, RLS, CHECK constraints, and the Mapbox CSS import. This sprint treats the full stack as one unit — frontend, Zustand store, Supabase service layer, and database schema.
>
> **Workflow**: Single branch `sprint-13-fixes`, one commit per task, single PR to main.
> **Execution**: Follow `.claude/SPRINT_EXECUTION.md` — implement → build → commit → next task.
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-13-fixes --title "Sprint 13: Full-stack persistence and display fixes" --body "Fix Mapbox CSS, zone CHECK constraints, material persistence, error visibility"`

---

## CRITICAL CONTEXT — Read Before Starting

### Supabase RLS Role Hierarchy
The `user_has_role(org_id, role)` function (in `supabase/migrations/001_initial_schema.sql` line 468) returns `true` if the user has the specified role **OR** is `admin`. So `admin` role passes ALL policy checks.

**Role requirements by table:**
- `projects` INSERT/UPDATE: requires `designer` or `admin`
- `zones` INSERT/UPDATE: requires `foreman` or `admin`
- `zone_materials` INSERT/UPDATE: requires `foreman` or `admin`
- `materials` INSERT/UPDATE: requires `designer` or `admin`

### Database CHECK Constraints That Cause Silent Failures
- `zones.area_sqft CHECK (area_sqft > 0)` — rejects 0 or NULL
- `zones.perimeter_lnft CHECK (perimeter_lnft > 0)` — rejects 0 or NULL
- `zone_materials.quantity CHECK (quantity > 0)` — rejects 0

When a CHECK constraint fails, Supabase returns an error object, but our `createZone()` catches it with `console.error` and returns `null`. The calling code in `createProject()` doesn't check the return value. **The user sees nothing.**

### Material Storage Architecture
- `zone_materials` table exists: junction of `zones` ↔ `materials` (requires both FK UUIDs)
- There is **NO `project_materials` table** in the database schema
- `addProjectMaterial` in `projectStore.ts` (line 372) is **purely local Zustand state** — it writes NOTHING to Supabase
- AI-suggested materials are project-level, not zone-level, so they need a new table or a different approach

---

## S13-1: Fix Mapbox GL CSS Import (Map Pins Invisible)

**Problem**: `import 'mapbox-gl/dist/mapbox-gl.css'` is completely missing from the codebase. Console warns: "This page appears to be missing CSS declarations for Mapbox GL JS." Markers are created and added to the map correctly (confirmed: "5 projects with coords: 5") but are invisible because marker elements are 0×0px without the stylesheet.

**File to modify**: `src/hooks/useMapbox.ts`

**Fix**: Add this import at the very top of the file, before any other imports:
```typescript
import 'mapbox-gl/dist/mapbox-gl.css';
```

Place it as the FIRST import line (before `import { useEffect, useRef, useState } from 'react'`).

**Also check**: `src/components/shared/AddressInput.tsx` — if it creates its own Mapbox map instance (for the mini-map preview), it also needs this CSS import. If it uses `useMapbox` hook, the hook's import covers it.

**Verification**:
1. `npm run build` passes
2. Grep the built output to confirm the CSS is bundled: the dist folder should reference mapbox-gl styles

**Acceptance criteria**:
- [ ] Map pins are visible on the dashboard map widget
- [ ] Pin colors match project status (green/blue/amber/red/gray)
- [ ] Clicking a pin shows a popup with project details
- [ ] Mini-map in AddressInput shows a pin at the verified address
- [ ] `npm run build` passes

---

## S13-2: Fix Zone CHECK Constraint Failures (area_sqft > 0, perimeter_lnft > 0)

**Problem**: The zone builder in `Projects.tsx` creates zones with default values. When `area` is 0 or `perimeter` is 0, the Supabase INSERT fails silently because of CHECK constraints on `zones.area_sqft` and `zones.perimeter_lnft` that require values > 0.

**Current zone creation code** (Projects.tsx ~line 233-247):
```typescript
const builtZones = newProjectZones.map((z, i) => ({
    name: z.name || `Zone ${i + 1}`,
    area: parseFloat(z.area as any) || 0,   // ← 0 violates CHECK
    perimeter: 0,                             // ← 0 violates CHECK
    sequence: i + 1,
    crew: '',
    dependencies: [] as string[],
    notes: '',
    materials: [],
    equipment: [],
    createdAt: new Date().toISOString(),
}));
```

**Files to modify**:
- `src/services/supabaseData.ts` — make `createZone` handle 0/null values by sending NULL to Supabase (CHECK allows NULL, only rejects explicit 0... actually CHECK rejects NULL too if `> 0`. We need to pass NULL so the column is omitted, OR change the approach)

**Wait — re-read the constraint**: `CHECK (area_sqft > 0)` — in PostgreSQL, `NULL > 0` evaluates to `NULL`, and CHECK constraints pass on NULL (only reject when the expression is FALSE, not NULL). So the fix is to send `NULL` instead of `0`.

**Fix in `src/services/supabaseData.ts`**, in `createZone()` function, after the field fixups (after line 219):
```typescript
// Ensure area/perimeter are NULL (not 0) when unset — CHECK constraints reject 0 but allow NULL
if (!snakeData.area_sqft || snakeData.area_sqft <= 0) snakeData.area_sqft = null;
if (!snakeData.perimeter_lnft || snakeData.perimeter_lnft <= 0) snakeData.perimeter_lnft = null;
```

Place this AFTER lines that set `snakeData.area_sqft` and `snakeData.perimeter_lnft` (after line 218-219).

**Also fix in `src/pages/Projects.tsx`**: When building zones from the zone builder, pass `null` instead of `0` for area and perimeter when the user hasn't entered a value:
```typescript
area: parseFloat(z.area as any) || null,
perimeter: parseFloat(z.perimeter as any) || null,
```

**Acceptance criteria**:
- [ ] Create a project with 2 zones (no area/perimeter entered) → zones persist to Supabase
- [ ] Create a project with zones that HAVE area values → area persists correctly
- [ ] Zone names and sequence numbers persist
- [ ] Zones appear after page refresh (data is in Supabase, not just local state)
- [ ] `npm run build` passes

---

## S13-3: Add Error Visibility for Supabase Operations

**Problem**: Every Supabase operation in `supabaseData.ts` catches errors with `console.error` and returns `null` or `false`. The user never sees what went wrong. RLS violations, CHECK failures, and FK violations all fail silently. This makes debugging impossible for the end user and for us.

**Files to modify**:
- `src/services/supabaseData.ts`

**Fix**: Add structured error logging that's visible in the browser console AND shows a toast to the user. Since the service layer shouldn't import UI libraries directly, use a callback pattern:

1. At the top of `supabaseData.ts`, add an error reporter:
```typescript
type ErrorReporter = (operation: string, table: string, error: any) => void;
let onSupabaseError: ErrorReporter = (op, table, err) => {
  console.error(`[TF-SUPABASE] ${op} on ${table} failed:`, err?.message || err, err?.details || '', err?.hint || '');
};

export function setSupabaseErrorReporter(reporter: ErrorReporter) {
  onSupabaseError = reporter;
}
```

2. In every catch block, replace `console.error('createZone error:', err.message)` with:
```typescript
onSupabaseError('INSERT', 'zones', err);
```

Do this for: `createProject`, `updateProject`, `deleteProject`, `createZone`, `updateZone`, `deleteZone`, and any other CRUD functions.

3. In `src/stores/projectStore.ts` (or wherever the store initializes), wire up the reporter to show toasts:
```typescript
import { setSupabaseErrorReporter } from '@/services/supabaseData';
import toast from 'react-hot-toast';

setSupabaseErrorReporter((operation, table, error) => {
  console.error(`[TF-SUPABASE] ${operation} on ${table} failed:`, error);
  toast.error(`Database error: ${error?.message || 'Unknown error'}. Check console for details.`);
});
```

**Also**: In `createProject()`, check the return value of `createZone()` calls (lines 141-145). Currently it fires and forgets. Log failures:
```typescript
if (zones && zones.length > 0) {
  for (const { id: _zoneId, createdAt: _createdAt, ...zoneData } of zones) {
    const result = await createZone(id, zoneData, orgId);
    if (!result) {
      console.warn(`[TF-SUPABASE] Zone "${zoneData.name}" failed to persist for project ${id}`);
    }
  }
}
```

**Acceptance criteria**:
- [ ] When a Supabase operation fails, a toast notification appears with the error message
- [ ] Console shows structured error logs with operation, table, and error details
- [ ] `createProject` logs which zones failed to persist (if any)
- [ ] `npm run build` passes

---

## S13-4: Fix Project-Level Material Persistence

**Problem**: `addProjectMaterial` in `projectStore.ts` (line 372) only updates local Zustand state. There is NO `project_materials` table in the Supabase schema. AI-suggested materials that the user accepts are lost on page refresh.

**Architecture decision**: Since there's no `project_materials` table and creating one requires a SQL migration (which we do outside of Code), we'll persist project-level materials as a JSONB field on the `projects` table. The `projects` table already stores `checklist` as JSONB — we'll use the same pattern for materials.

**BUT FIRST** — check if the `projects` table has a column we can use. It doesn't have a `materials` JSONB column. Two options:

**Option A (no migration needed)**: Store accepted materials in the project's `notes` field as a structured JSON block. This is hacky and we should NOT do this.

**Option B (preferred, requires SQL)**: Write a SQL migration to add a `materials` JSONB column to `projects`. Since Charlie runs SQL manually in Supabase, create the migration file and flag it.

**Fix**:

1. **Create migration file** `supabase/migrations/004_project_materials_jsonb.sql`:
```sql
-- Add materials JSONB column to projects table
-- Stores project-level material entries (from AI suggestions, etc.)
-- Format: [{ "name": "...", "quantity": 10, "unit": "cuyd", "unitCost": 0 }, ...]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
```

2. **Update `src/services/supabaseData.ts`**:
   - In `createProject()`, include `materials` in the payload if present:
     ```typescript
     // After existing field fixups, before the insert:
     if (project.materials) {
       snakeData.materials = JSON.stringify(project.materials);
     }
     ```
   - Actually wait — `zones` is already destructured out at line 116. We need to also capture `materials`:
     ```typescript
     const { zones, materials: projectMaterials, ...projectData } = project;
     ```
     Then after the project insert succeeds and zones are handled:
     ```typescript
     // Persist project-level materials if any
     if (projectMaterials && projectMaterials.length > 0) {
       await supabase
         .from('projects')
         .update({ materials: projectMaterials })
         .eq('id', id);
     }
     ```

3. **Update `addProjectMaterial` in `projectStore.ts`** to also write to Supabase:
   ```typescript
   addProjectMaterial: async (projectId, entry) => {
     const newEntry: ProjectMaterialEntry = { ...entry, id: crypto.randomUUID() };
     // Update local state immediately
     set((state) => ({
       projectMaterials: {
         ...state.projectMaterials,
         [projectId]: [...(state.projectMaterials[projectId] ?? []), newEntry],
       },
     }));
     // Persist to Supabase
     const allEntries = get().projectMaterials[projectId] ?? [];
     await supabase
       .from('projects')
       .update({ materials: allEntries })
       .eq('id', projectId);
   },
   ```

4. **Update `fetchProjects`** to read back the materials JSONB:
   In the project mapping (around line 88-107), add:
   ```typescript
   // Parse materials from JSONB
   if (camelProject.materials && typeof camelProject.materials === 'string') {
     camelProject.materials = JSON.parse(camelProject.materials);
   }
   ```
   And populate the `projectMaterials` map in the store when fetching.

**IMPORTANT**: This task requires Charlie to run the SQL migration FIRST. Add a comment at the top of the migration file:
```sql
-- ⚠️  RUN THIS IN SUPABASE SQL EDITOR BEFORE DEPLOYING SPRINT 13
```

**Acceptance criteria**:
- [ ] Migration file `004_project_materials_jsonb.sql` is created
- [ ] After migration is run: AI-suggested materials persist to the project
- [ ] Materials appear after page refresh
- [ ] Materials are stored as JSONB on the projects row
- [ ] `npm run build` passes

---

## S13-5: Verify RLS Role Configuration

**Problem**: We need to confirm that the logged-in user has the `admin` role in their organization. If they only have `designer`, zone inserts will fail because `zones_create` requires `foreman` or `admin`. This can't be fixed in code — it's a data issue — but we CAN add a diagnostic check.

**File to modify**: `src/services/supabaseData.ts`

**Fix**: Add a one-time diagnostic function that Code can call during app init to verify the user's role:

```typescript
export async function diagnosUserRole(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[TF-DIAG] No authenticated user');
      return;
    }

    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id);

    if (error) {
      console.warn('[TF-DIAG] Could not fetch memberships:', error.message);
      return;
    }

    console.log('[TF-DIAG] User roles:', memberships);

    if (memberships && memberships.length > 0) {
      const hasAdmin = memberships.some(m => m.role === 'admin');
      const hasForeman = memberships.some(m => m.role === 'foreman');
      const hasDesigner = memberships.some(m => m.role === 'designer');

      if (!hasAdmin && !hasForeman) {
        console.warn('[TF-DIAG] ⚠️  User has no admin or foreman role. Zone and crew operations will be blocked by RLS.');
        console.warn('[TF-DIAG] Current roles:', memberships.map(m => m.role).join(', '));
        console.warn('[TF-DIAG] Fix: Run in Supabase SQL Editor:');
        console.warn(`[TF-DIAG]   UPDATE organization_members SET role = 'admin' WHERE user_id = '${user.id}';`);
      }
    } else {
      console.warn('[TF-DIAG] ⚠️  User has NO organization memberships. All RLS checks will fail.');
    }
  } catch (err: any) {
    console.warn('[TF-DIAG] Role check failed:', err.message);
  }
}
```

Call this function from the app initialization (e.g., in `useAuth.ts` or wherever the auth state is set up, right after successful login).

**Also**: In `fetchOrg()` or wherever the org is loaded, log the user's role so it appears in every session's console output.

**Acceptance criteria**:
- [ ] On app load, console shows `[TF-DIAG] User roles: [{ org_id: ..., role: ... }]`
- [ ] If user lacks admin/foreman role, console shows a warning with the exact SQL to fix it
- [ ] `npm run build` passes

---

## Execution Order

1. **S13-1** (Mapbox CSS) — standalone, no dependencies
2. **S13-2** (Zone CHECK constraints) — standalone
3. **S13-3** (Error visibility) — standalone, but helpful for debugging the rest
4. **S13-4** (Material persistence) — requires SQL migration `004_project_materials_jsonb.sql` to be run by Charlie
5. **S13-5** (Role diagnostic) — standalone

Recommended: Do S13-3 first (error visibility), then S13-1 and S13-2, then S13-5, then S13-4.

---

## SQL Migration Required (Charlie Must Run)

**File**: `supabase/migrations/004_project_materials_jsonb.sql`

Charlie: Run this in the Supabase SQL Editor BEFORE testing S13-4:
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
```

**Also verify user role**: Open Supabase SQL Editor and run:
```sql
SELECT om.user_id, om.role, o.name as org_name
FROM organization_members om
JOIN organizations o ON o.id = om.org_id
LIMIT 10;
```

If your user's role is `designer` (not `admin`), run:
```sql
UPDATE organization_members SET role = 'admin' WHERE user_id = 'YOUR_USER_ID_HERE';
```

---

## Post-Sprint Verification

After all tasks complete and the PR is merged:
1. `npm run dev` — test locally on localhost:5173
2. Open browser console — look for `[TF-DIAG]` messages confirming admin role
3. Create a project with zones → check console for errors → verify zones persist after refresh
4. Use AI quick-create → add suggested materials → verify they persist after refresh
5. Check dashboard map — pins should be visible with status colors
6. Click a pin — popup should appear
7. If all pass: deploy to prod via `git push origin HEAD:main` or Netlify CLI
