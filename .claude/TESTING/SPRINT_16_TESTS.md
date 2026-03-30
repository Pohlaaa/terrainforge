# Sprint 16 Test Cases — Fix + Polish

Run `npm run dev` and open `http://localhost:5173`. Log in with your test account.

## Pre-Flight

- [ ] Build passes: `npm run build` (zero errors)
- [ ] Dev server starts: `npm run dev` (no console errors on load)

---

## 1. Material Library Bug Fix (S16-1)

- [ ] Navigate to /materials — page loads without error toast
- [ ] All three tabs load content (Inventory, Suppliers, Library)
- [ ] Add a new material → saves successfully, appears in list
- [ ] Edit an existing material → saves correctly
- [ ] Delete a material → removes from list

## 2. Equipment Manager Bug Fix (S16-2)

- [ ] Navigate to /equipment — page loads without error toast
- [ ] Equipment list populates
- [ ] Add new equipment → saves successfully, appears in list
- [ ] Edit existing equipment → saves correctly

## 3. Remaining Fetch Audit (S16-3)

- [ ] Navigate to /work-orders with an active project → page loads, shows work orders
- [ ] Navigate to /work-orders without active project → shows empty state with project selector
- [ ] All pages load without console errors or error toasts
- [ ] Crew Manager loads crew list correctly

## 4. Schedule Edit Modal (S16-4)

- [ ] Click an existing schedule chip → edit modal opens
- [ ] Modal shows pre-filled values (project, time, notes)
- [ ] Status dropdown appears (Scheduled, In Progress, Completed, Cancelled)
- [ ] Change status to "In Progress" → save → status badge updates on chip
- [ ] Change notes → save → tooltip reflects new notes
- [ ] Change project → save → chip color changes to match new project
- [ ] Cancel without saving → no changes
- [ ] Creating new entries via empty cell click still works

## 5. Equipment Assignment on Schedule (S16-5)

- [ ] In create modal: equipment dropdown appears below project dropdown
- [ ] In edit modal: equipment dropdown shows current assignment
- [ ] Assign equipment to entry → tooltip shows equipment name
- [ ] Only available equipment (or already-assigned) shows in dropdown
- [ ] Entries without equipment show no equipment in tooltip

## 6. Active Project Sidebar Indicator (S16-6)

- [ ] Select a project → green dot appears next to "Projects" in sidebar
- [ ] Green dot also appears next to "Work Orders" in sidebar
- [ ] Deselect project (clear active project) → green dots disappear
- [ ] Active project card in project list has green left border accent
- [ ] Non-active project cards have no border accent

## 7. Debug Page Lazy Load (S16-7)

- [ ] In dev mode: navigate to /debug → page loads normally
- [ ] `npm run build` succeeds
- [ ] Build output size is same or slightly smaller than before

---

## Regression Checks

- [ ] Dashboard loads, all widgets render (including schedule widget)
- [ ] Schedule page: create, delete, drag-drop all work
- [ ] Projects page: list view, detail panel, zones work
- [ ] Crew Manager: add/edit/delete works
- [ ] PDF export works (manifest + crew packet)
- [ ] Login/logout cycle works
- [ ] Browser refresh preserves state (localStorage persistence)

---

## Status After Testing

- Sprint 16 tested by: _________________
- Date: _________________
- Result: [ ] PASS / [ ] FAIL
- Notes: _________________
