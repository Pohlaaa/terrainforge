# Sprint 4 — Test Cases

Run these after each S4 task is merged. Check the box when confirmed working.

---

## S4-1: Zone Creation UI

- [N] Open an existing project — "Add Zone" button visible in the zones panel
- [N] Click Add Zone — form modal opens with fields: name, area (sqft), perimeter (ft), notes
- [N] Submit with valid data — zone appears in list immediately
- [N] Submit with missing name — validation error shown, zone not created
- [N] Click Edit on a zone — form pre-filled with existing values
- [N] Edit zone name → save — name updates in list
- [N] Click Delete on a zone — confirmation dialog appears
- [N] Confirm delete — zone removed from list
- [N] Cancel delete — zone remains
- [N] Create a new project from scratch, add 2 zones — both appear
- [N] Navigate to Manifest Engine with new project — both zones appear in selector
- [N] Navigate to Work Orders — steps generated for new zones

**Regression check:** Seed data zones (Henderson, Oakwood) still display correctly after this change.

---

## S4-2: Map Placeholder Replaced

- [N] Dashboard loads — no grey "Map placeholder" box visible
- [N] Active Projects widget appears in its place
- [N] Widget shows project name, client, checklist progress
- [N] "View all projects" link navigates to /projects
- [N] If projects exist: widget shows up to 5 projects
- [N] If no projects exist: widget shows "No active projects" with create prompt

---

## S4-3: Dev Artifact Cleanup

- [Y] `src/components/pdf/TestPDF.tsx` does not exist
- [Y] `npm run build` passes with no errors after removal
- [ ] Leaflet and react-leaflet are NOT in package.json dependencies
- [ ] `npm run build` passes with no errors after Leaflet removal
- [ ] No console errors about missing leaflet imports on any page

---

## S4-4: Seed Data Reset

- [N] "Clear Demo Data" / "Start Fresh" option is visible (sidebar, settings, or dashboard banner)
- [N] Clicking it shows a confirmation dialog with clear warning text
- [N] Cancelling does nothing — data remains
- [N] Confirming clears all projects, materials, crew, equipment from the view
- [N] After clearing: Dashboard shows empty state (or S4-5 guided prompt)
- [N] After clearing: Projects page shows empty state
- [N] After clearing: app does not crash or show errors
- [ ] Billing status and account info are unaffected by the reset

---

## S4-5: First-Login Empty State

- [N] Clear all demo data (use S4-4) → Dashboard shows welcome/onboarding prompt
- [ ] Prompt includes a "Create Project" CTA button
- [ ] Clicking CTA navigates to /projects or opens new project modal
- [ ] Projects page with no data shows empty state with "Create your first project" button
- [ ] Clicking button opens new project modal directly
- [ ] After creating first project: empty states disappear, normal UI resumes

---

## S4-6: Full End-to-End Self-Test

Run the full Tier 1 Core Workflow from PROTOCOL.md using only your own data.
Log any friction or failures as new entries in FINDINGS.md with severity P0–P3.

**The test passes when:**
- [ ] Full workflow completed start-to-finish with zero seed data
- [ ] Both PDFs exported and look professional
- [ ] Price Research returns AI results
- [ ] No P0 or P1 issues found (or all found issues are fixed before closing sprint)
