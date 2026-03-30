# Sprint 2 — Claude Code Prompts

**Goal:** PDF manifest export working, app stable enough for a real contractor pilot.
**Done when:** A contractor can create a project, build a manifest, and export a professional PDF.

Copy each prompt in order into the Code tab.

---

## S2-1 — Install and Configure @react-pdf/renderer

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 2, task S2-1. Sprint 1 is complete — all 8 pages wired, Supabase persisting correctly.

**Task: Install @react-pdf/renderer and verify it builds cleanly.**

Run `npm install @react-pdf/renderer` and confirm the package installs without errors. Then create a minimal test component at `src/components/pdf/TestPDF.tsx` that renders a simple one-page PDF with the text "TerrainForge" to verify the library works in this Vite environment. Run `npm run build` — if there are any Vite/bundler compatibility issues with the PDF library, resolve them before proceeding.

Before writing anything, read these files:
1. `package.json`
2. `vite.config.ts`
3. `src/types/index.ts`

Run `npm run build` when done to confirm no errors.

---

## S2-2 — Build PDF Manifest Template

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 2, task S2-2. @react-pdf/renderer is installed and verified.

**Task: Build a professional PDF manifest template at `src/components/pdf/ManifestPDF.tsx`.**

The PDF should accept a project and its computed manifest as props and render:
- Branded header: TerrainForge logo text, company name placeholder, date generated
- Project summary: name, client, address, total estimated cost vs budget
- Per-zone sections: zone name, area, perimeter, materials table (name, qty, unit, reserve, unit cost, total)
- Consolidated materials summary at the bottom: all materials across all zones aggregated
- Footer with page numbers

Use the green brand color (`#2D6A4F`) for headers and accents. Keep it clean and professional — this is what a contractor hands to a client or supplier.

Before writing anything, read these files:
1. `src/lib/manifest.ts`
2. `src/types/index.ts`
3. `src/pages/ManifestEngine.tsx` (reference the data structure it uses)
4. `src/components/pdf/TestPDF.tsx`

Run `npm run build` when done to confirm no TypeScript errors.

---

## S2-3 — Build PDF Crew Packet Template

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 2, task S2-3.

**Task: Build a PDF crew packet template at `src/components/pdf/CrewPacketPDF.tsx`.**

The PDF should accept a project, its work order steps, and crew assignments as props and render:
- Cover page: project name, client, address, start date, foreman name
- One section per zone: zone name, list of installation steps with checkboxes, assigned crew members, required equipment
- Footer with page numbers

This is the document a foreman takes to the job site. Keep it practical — large text, clear checkboxes, room to write notes.

Before writing anything, read these files:
1. `src/lib/workorders.ts`
2. `src/types/index.ts`
3. `src/stores/crewStore.ts`
4. `src/stores/equipmentStore.ts`
5. `src/components/pdf/ManifestPDF.tsx` (match the styling conventions)

Run `npm run build` when done to confirm no TypeScript errors.

---

## S2-4 — Add Export Buttons to ManifestEngine and WorkOrders

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 2, task S2-4.

**Task: Wire PDF export buttons to the ManifestEngine and WorkOrders pages.**

On `src/pages/ManifestEngine.tsx`: add an "Export PDF" button that triggers client-side PDF generation using `ManifestPDF.tsx` and downloads the file as `[project-name]-manifest.pdf`.

On `src/pages/WorkOrders.tsx`: add an "Export Crew Packet" button that triggers client-side PDF generation using `CrewPacketPDF.tsx` and downloads as `[project-name]-crew-packet.pdf`.

Use `@react-pdf/renderer`'s `pdf()` function with `saveAs` or `PDFDownloadLink` — whichever produces a cleaner UX (no blank tab, direct download). Show a brief loading state while the PDF generates.

Before writing anything, read these files:
1. `src/pages/ManifestEngine.tsx`
2. `src/pages/WorkOrders.tsx`
3. `src/components/pdf/ManifestPDF.tsx`
4. `src/components/pdf/CrewPacketPDF.tsx`
5. `src/stores/projectStore.ts`

Run `npm run build` when done to confirm no TypeScript errors.

---

## S2-5 — Full End-to-End Smoke Test

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 2, task S2-5. PDF export is built and wired.

**Task: Run a full end-to-end smoke test of the complete user workflow.**

Trace the entire contractor workflow and identify any broken steps, missing data, or UI gaps:

1. Sign up as a new user → confirm org is created in Supabase
2. Create a new project with client info, budget, and target date
3. Add 2 zones to the project with area, perimeter, and materials
4. Open ManifestEngine → select the project → verify manifest generates correctly with quantities and costs
5. Export the manifest PDF → verify it downloads and renders correctly
6. Open WorkOrders → select the project → verify steps generate per zone
7. Export crew packet PDF → verify it downloads and renders correctly
8. Add a crew member → assign them to the project
9. Add a material to the library → verify it appears in the manifest
10. Check the Dashboard → verify KPIs reflect the new project

Document every issue found — broken buttons, missing data, wrong calculations, UI errors. Do not fix them yet; list them all first, then fix in priority order (data correctness first, UI polish second).

Run `npm run build` after all fixes to confirm no TypeScript errors.

---

## S2-6 — Fix Smoke Test Bugs

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 2, task S2-6. Smoke test is complete and bugs are documented.

**Task: Fix all bugs identified in the S2-5 smoke test.**

Work through the bug list in this order:
1. Data correctness issues (wrong calculations, missing records, broken persistence)
2. Broken interactions (buttons that don't work, forms that don't submit)
3. UI gaps (missing empty states, broken layouts, confusing flows)

For each fix, explain what was wrong and what you changed. Run `npm run build` after all fixes to confirm no TypeScript errors.
