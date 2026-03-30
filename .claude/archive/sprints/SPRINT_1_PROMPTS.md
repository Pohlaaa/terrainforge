# Sprint 1 — Claude Code Prompts

Copy each prompt in order into the Code tab. Complete one before starting the next.
S1-1 and S1-2 are already done. Start at S1-3.

---

## S1-3 — Wire Projects Page

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-3. S1-1 and S1-2 are complete.

**Task: Wire `src/pages/Projects.tsx` to `useProjectStore`**

Required functionality: list all projects with status badges, client name, value, and progress; create a new project via modal; select a project to view its zones and checklist; update project status; delete with confirmation dialog.

Before writing anything, read these files:
1. `src/pages/Projects.tsx`
2. `src/stores/projectStore.ts`
3. `src/types/index.ts`
4. `src/components/shared/Modal.tsx`
5. `src/components/shared/Badge.tsx`
6. `src/components/shared/ConfirmDialog.tsx`

Then make the changes. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-4 — Wire Material Library

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-4.

**Task: Wire `src/pages/MaterialLibrary.tsx` to `useMaterialStore`**

Required functionality: list materials with current stock, unit, and cost; search and filter by category; add, edit, and delete a material via modal; manually adjust stock quantity.

Before writing anything, read these files:
1. `src/pages/MaterialLibrary.tsx`
2. `src/stores/materialStore.ts`
3. `src/types/index.ts`
4. `src/lib/constants.ts`
5. `src/components/shared/Modal.tsx`
6. `src/components/shared/SearchFilter.tsx`

Then make the changes. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-5 — Wire Manifest Engine

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-5. This is the most important page in the product.

**Task: Wire `src/pages/ManifestEngine.tsx` to `useProjectStore` and `useMaterialStore`**

Required functionality: project selector dropdown; once a project is selected, display its zones; call `generateManifest()` from `src/lib/manifest.ts` using the project zones and material store to produce the full material list; display quantities, reserve amounts, unit costs, and totals per zone; show a project cost rollup at the bottom using `computeProjectCostFormatted()`.

Before writing anything, read these files:
1. `src/pages/ManifestEngine.tsx`
2. `src/stores/projectStore.ts`
3. `src/stores/materialStore.ts`
4. `src/lib/manifest.ts`
5. `src/lib/constants.ts`
6. `src/types/index.ts`

Then make the changes. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-6 — Wire Work Orders

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-6.

**Task: Wire `src/pages/WorkOrders.tsx` to `useProjectStore`**

Required functionality: project selector dropdown; once a project is selected, call the work order generation logic from `src/lib/workorders.ts` to build installation steps per zone; display steps grouped by zone; allow each step to be marked complete.

Before writing anything, read these files:
1. `src/pages/WorkOrders.tsx`
2. `src/stores/projectStore.ts`
3. `src/lib/workorders.ts`
4. `src/types/index.ts`
5. `src/components/shared/Badge.tsx`

Then make the changes. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-7 — Wire Crew Manager

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-7.

**Task: Wire `src/pages/CrewManager.tsx` to `useCrewStore`**

Required functionality: list all crew members with role, skills, and availability status; add a new crew member via modal; edit an existing crew member; delete with confirmation; toggle availability.

Before writing anything, read these files:
1. `src/pages/CrewManager.tsx`
2. `src/stores/crewStore.ts`
3. `src/types/index.ts`
4. `src/lib/constants.ts`
5. `src/components/shared/Modal.tsx`
6. `src/components/shared/Badge.tsx`

Then make the changes. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-8 — Wire Equipment Manager

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-8.

**Task: Wire `src/pages/EquipmentManager.tsx` to `useEquipmentStore`**

Required functionality: list equipment with status, type, and certification expiry dates; surface overdue maintenance and expired cert alerts using badge colors; add, edit, and delete equipment via modal; add a maintenance log entry to an existing piece of equipment.

Before writing anything, read these files:
1. `src/pages/EquipmentManager.tsx`
2. `src/stores/equipmentStore.ts`
3. `src/types/index.ts`
4. `src/lib/constants.ts`
5. `src/components/shared/Modal.tsx`
6. `src/components/shared/Badge.tsx`

Then make the changes. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-9 — Wire Price Research Shell

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-9. This page gets AI wiring in Sprint 3 — today we're just connecting the UI shell.

**Task: Wire `src/pages/PriceResearch.tsx` UI shell to `useProjectStore`**

Required functionality: project selector dropdown from `useProjectStore`; material type input field; location input field; a Search button that is visible but does nothing yet (shows a "Coming soon" or empty results state); the page should not be broken or blank.

Before writing anything, read these files:
1. `src/pages/PriceResearch.tsx`
2. `src/stores/projectStore.ts`
3. `src/types/index.ts`

Then make the changes. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-10 — End-to-End Persistence Test

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-10. All 8 pages are now wired to their stores. Now verify that data actually persists to Supabase.

**Task: Audit and fix end-to-end Supabase data persistence**

For each store (project, material, crew, equipment), check that the async sync functions in `src/services/supabaseData.ts` are being called correctly after local state mutations. Trace the flow: store action → optimistic local update → supabaseData service call → DB write. Fix any store actions that update local state but never call the Supabase sync.

Before writing anything, read these files:
1. `src/services/supabaseData.ts`
2. `src/stores/projectStore.ts`
3. `src/stores/materialStore.ts`
4. `src/stores/crewStore.ts`
5. `src/stores/equipmentStore.ts`
6. `src/services/supabase.ts`

Then make any fixes needed. Run `npm run build` when done to confirm no TypeScript errors.

---

## S1-11 — Error Boundaries + Loading States

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

We're on Sprint 1, task S1-11 — the final task.

**Task: Add error boundaries and loading states across all 8 pages**

Each page should: show a skeleton or spinner while its store's `isLoading` is true; show an error message via `AlertBanner` if the store's `error` field is set; be wrapped in a React `ErrorBoundary` that catches unexpected render errors gracefully. Create a reusable `ErrorBoundary` class component in `src/components/shared/ErrorBoundary.tsx` if one doesn't already exist.

Before writing anything, read these files:
1. `src/components/shared/AlertBanner.tsx`
2. `src/stores/projectStore.ts` (check the isLoading and error field shapes)
3. `src/pages/Dashboard.tsx` (use as the reference for the pattern, then apply to remaining pages)
4. `src/types/index.ts`

Apply the pattern consistently across all 8 pages. Run `npm run build` when done to confirm no TypeScript errors.
