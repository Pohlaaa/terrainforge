# Sprint 4 — Claude Code Prompts

**Goal:** Close the workflow gaps so Charlie can complete a full end-to-end flow with his own data.
**Done when:** A brand new project can be created, zones added, manifest generated, and PDF exported — all with custom data, no seed data required.

Copy each prompt in order into a new Code session. Complete and merge one before starting the next.

---

## S4-1 — Zone Creation + Editing UI in Projects Page

Read `CLAUDE.md`, `.claude/DEVELOPMENT.md`, and `.claude/CODEBASE_MANAGEMENT.md`.

Sprint 4, task S4-1. Sprints 1–3 are complete. The app has a fully wired Projects page, but there is no UI to create or edit zones on a project. Zones exist in the seed data, but a real user cannot add their own. This is the single biggest workflow blocker — without zones, the manifest engine generates nothing.

**Task: Add zone creation, editing, and deletion to the Projects page.**

The zone data shape already exists in `src/types/index.ts`. The `projectStore.ts` likely has `updateProject()` which can be used to add zones to an existing project's `zones` array. Read both before writing anything.

Build a zone management UI within the existing Projects page detail view:
- "Add Zone" button visible when a project is selected
- Modal or inline form to create a zone with fields: name (required), area_sqft (number), perimeter_ft (number), and notes (optional)
- Existing zones listed with an Edit button (opens the same form pre-filled) and a Delete button (with confirmation)
- Zone list shows: zone name, area, perimeter, and how many materials are assigned
- After adding a zone, the manifest engine should immediately reflect it

Do not build material assignment within this task — that is separate. Focus on zone CRUD only.

Before writing anything, read these files in full:
1. `src/types/index.ts` — find the Zone and Project interfaces
2. `src/stores/projectStore.ts` — find how updateProject works
3. `src/pages/Projects.tsx` — understand the existing detail view structure
4. `src/components/shared/Modal.tsx` — use the existing Modal component

Run `npm run build` when done. Confirm no TypeScript errors.

---

## S4-2 — Replace Map Placeholder with Active Projects Widget

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 4, task S4-2. Zone creation is complete.

**Task: Replace the "Map placeholder" grey box on the Dashboard with a useful active projects summary widget.**

The Dashboard currently has a map widget placeholder — a grey box that shows "Map placeholder" or similar. Remove it entirely and replace it with an **Active Projects Summary** widget that shows:
- List of the top 3–5 active projects (status = 'active' or 'in_progress')
- For each project: name, client name, budget, and checklist progress (X/8 items complete)
- A "View all projects" link that navigates to `/projects`
- If no active projects exist, show "No active projects — create your first project" with a link to `/projects`

The widget should match the existing KPI card style — dark surface, green accents, consistent with the rest of the dashboard.

Before writing anything, read:
1. `src/pages/Dashboard.tsx` — find the map placeholder section
2. `src/stores/projectStore.ts` — understand the project shape
3. `src/components/shared/KPICard.tsx` — reference for card styling

Run `npm run build` when done. No TypeScript errors.

---

## S4-3 — Dev Cleanup: Remove TestPDF and Leaflet

Read `CLAUDE.md` and `.claude/CODEBASE_MANAGEMENT.md`.

Sprint 4, task S4-3. Dashboard widget is complete.

**Task: Remove two dev artifacts that should not be in production.**

**1. Remove TestPDF.tsx:**
- Delete `src/components/pdf/TestPDF.tsx`
- Search the entire codebase for any imports of TestPDF and remove them
- Run `npm run build` to confirm nothing breaks

**2. Remove Leaflet and react-leaflet:**
- Remove `leaflet` and `react-leaflet` from `package.json` dependencies
- Run `npm uninstall leaflet react-leaflet`
- Search the codebase for any imports of leaflet or react-leaflet and remove them (there should be none in active use)
- Remove any `@types/leaflet` if present
- Run `npm run build` to confirm clean build

Both of these are dead weight. Leaflet is a medium-sized mapping library — removing it reduces the bundle and removes a dependency that isn't being used.

Run `npm run build` after each removal to confirm no errors before proceeding to the next.

---

## S4-4 — Seed Data Reset Option

Read `CLAUDE.md`, `.claude/DEVELOPMENT.md`, and `.claude/CODEBASE_MANAGEMENT.md`.

Sprint 4, task S4-4. Dev cleanup is complete.

**Task: Add a "Start Fresh" option that clears all seed/demo data so a real contractor can begin with a clean slate.**

The app currently loads with hardcoded seed data: Henderson Backyard project, 15 materials, 5 crew members, 10 equipment items. A real contractor signing up will see this demo data and have no obvious way to remove it.

Build a "Start Fresh" flow:
- Add a "Clear Demo Data" button in the app — either in the sidebar footer or in a Settings page (if one exists) or as a banner on the Dashboard for new users
- Clicking it shows a confirmation dialog: "This will remove all demo projects, materials, crew, and equipment. Your account settings and billing will not be affected. This cannot be undone."
- On confirm: clear the Zustand stores (`projectStore`, `materialStore`, `crewStore`, `equipmentStore`) to empty arrays and persist to localStorage
- Do NOT delete data from Supabase — only clear the local store state
- After clearing, redirect to the Dashboard which should now show the empty state (from S4-5 if complete, or the standard empty view)

The button should only be visible when the app contains seed/demo data. A simple heuristic: check if any project has the id matching the known seed project ids, or check if `projects.length > 0 && !hasUserCreatedData`. Read the store to understand the seed data shape.

Before writing anything, read:
1. `src/stores/projectStore.ts` — understand seed data and how to clear it
2. `src/stores/materialStore.ts`
3. `src/stores/crewStore.ts`
4. `src/stores/equipmentStore.ts`
5. `src/components/shared/ConfirmDialog.tsx`

Run `npm run build` when done. No TypeScript errors.

---

## S4-5 — First-Login Empty State

Read `CLAUDE.md` and `.claude/DESIGN.md`.

Sprint 4, task S4-5. Seed data reset is complete.

**Task: Add meaningful empty states to the Dashboard and Projects page for when no data exists.**

When a new user signs up (or clears demo data), they see blank KPI widgets and empty project lists with no guidance. This is the worst possible first impression. Replace empty states with helpful prompts.

**Dashboard empty state:**
- When `projects.length === 0`, replace the KPI widgets with a single centered "welcome" card
- Content: "Welcome to TerrainForge. Start by creating your first project." with a prominent "Create Project" button that navigates to `/projects`
- Keep the alerts widget visible (it may show certification reminders even with no projects)

**Projects page empty state:**
- When `projects.length === 0`, show a centered empty state instead of an empty grid
- Content: a brief description of what projects are, and a large "Create your first project" button that opens the new project modal directly
- Style it to feel welcoming, not broken — use the green brand color on the CTA

These states should disappear automatically once the first project is created. No new stores or API calls needed — this is pure UI logic based on existing store data.

Before writing anything, read:
1. `src/pages/Dashboard.tsx`
2. `src/pages/Projects.tsx`
3. `src/components/shared/KPICard.tsx`

Run `npm run build` when done. No TypeScript errors.

---

## S4-6 — Sprint 4 Self-Test

This task is for Charlie, not Code.

With all 5 code tasks complete, run through the following workflow yourself:

1. Open the app at `localhost:5173` (or your Netlify staging URL)
2. Click "Clear Demo Data" if the option is visible — confirm seed data is gone
3. Confirm the Dashboard empty state appears with a "Create Project" prompt
4. Create a brand new project with your own name, client, and address
5. Open the project, add at least 2 zones with real dimensions
6. Navigate to Manifest Engine — confirm your project and zones appear
7. Generate the manifest — confirm materials calculate correctly
8. Export the manifest as a PDF — open and verify it looks professional
9. Navigate to Price Research — search for a material type + location, confirm AI results return
10. Check the Billing page — confirm it shows trial status correctly

Note every moment of friction, confusion, or missing functionality. Bring that list back to Cowork — it becomes the Sprint 5 input.
