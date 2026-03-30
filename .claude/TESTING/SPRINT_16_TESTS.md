# Sprint 16 Test Cases — Fix + Polish

Run `npm run dev` and open `http://localhost:3000`. Log in with your test account.

## Pre-Flight

- [y] Build passes: `npm run build` (zero errors)
- [y] Dev server starts: `npm run dev` (no console errors on load)

---

## 1. Material Library Bug Fix (S16-1) - TEST RESULTS: ALL FAIL with ⚠Load error: Failed to save material. Please try again.Console output: 

[TF-DEBUG] fetchProjects query response: 
Object { data: 5, error: null }
supabaseData.ts:83:13
[TF-DEBUG] fetchProjects returned 5 projects projectStore.ts:209:19
[TF-DEBUG] useMapbox: projects received 5 with coords: 4 
Array(5) [ {…}, {…}, {…}, {…}, {…} ]
useMapbox.ts:122:13
Content-Security-Policy: The page’s settings blocked an inline script (script-src-elem) from being executed because it violates the following directive: “script-src https://m.stripe.network 'sha256-e357n1PxCJ8d03/QCSKaHFmHF1JADyvSHdSfshxM494=' 'sha256-5DA+a07wxWmEka9IdoWjSPVHb17Cp5284/lJzfbl8KA=' 'sha256-/5Guo2nzv5n/w6ukZpOBZOtTJBJPSkJ6mhHpnBgm3Ls='”. Consider using a hash ('sha256-YiC5bd+aSY6gJKgwwD9kRRZCdn/qi++mRW6ERR4uZ3c=') or a nonce. inpage.js:1:557775
Cookie warnings 3
[TF-DEBUG] useMapbox: projects received 5 with coords: 4 
Array(5) [ {…}, {…}, {…}, {…}, {…} ]
useMapbox.ts:122:13
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://events.mapbox.com/events/v2?access_token=pk.eyJ1IjoicG9obGEiLCJhIjoiY21uYzd2Y2FzMTJzbzJxcHJxc3JiajV6ayJ9.ygDOds3CGrw_jFwJfFnTiQ. (Reason: CORS request did not succeed). Status code: (null). 4
WebGL context was lost. map.ts:4952:34
createMaterial error: 
Object { code: "22P02", details: null, hint: null, message: 'invalid input value for enum material_category: "seed"' }
supabaseData.ts:429:13
[TF-DEBUG] addMaterial: Supabase write failed, rolling back materialStore.ts:411:21

- [ ] Navigate to /materials — page loads without error toast
- [ ] All three tabs load content (Inventory, Suppliers, Library)
- [ ] Add a new material → saves successfully, appears in list
- [ ] Edit an existing material → saves correctly
- [ ] Delete a material → removes from list

## 2. Equipment Manager Bug Fix (S16-2) - TEST RESULTS: ALL FAIL with ⚠Load error: Failed to save material. Please try again.Console output:

[TF-DEBUG] fetchProjects query response: 
Object { data: 5, error: null }
supabaseData.ts:83:13
[TF-DEBUG] fetchProjects returned 5 projects projectStore.ts:209:19
[TF-DEBUG] useMapbox: projects received 5 with coords: 4 
Array(5) [ {…}, {…}, {…}, {…}, {…} ]
useMapbox.ts:122:13
Content-Security-Policy: The page’s settings blocked an inline script (script-src-elem) from being executed because it violates the following directive: “script-src https://m.stripe.network 'sha256-e357n1PxCJ8d03/QCSKaHFmHF1JADyvSHdSfshxM494=' 'sha256-5DA+a07wxWmEka9IdoWjSPVHb17Cp5284/lJzfbl8KA=' 'sha256-/5Guo2nzv5n/w6ukZpOBZOtTJBJPSkJ6mhHpnBgm3Ls='”. Consider using a hash ('sha256-YiC5bd+aSY6gJKgwwD9kRRZCdn/qi++mRW6ERR4uZ3c=') or a nonce. inpage.js:1:557775
Cookie warnings 4
[TF-DEBUG] useMapbox: projects received 5 with coords: 4 
Array(5) [ {…}, {…}, {…}, {…}, {…} ]
useMapbox.ts:122:13
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://events.mapbox.com/events/v2?access_token=pk.eyJ1IjoicG9obGEiLCJhIjoiY21uYzd2Y2FzMTJzbzJxcHJxc3JiajV6ayJ9.ygDOds3CGrw_jFwJfFnTiQ. (Reason: CORS request did not succeed). Status code: (null). 4
WebGL context was lost. map.ts:4952:34
createMaterial error: 
Object { code: "22P02", details: null, hint: null, message: 'invalid input value for enum material_category: "seed"' }
supabaseData.ts:429:13
[TF-DEBUG] addMaterial: Supabase write failed, rolling back materialStore.ts:411:21
createEquipment error: 
Object { code: "22007", details: null, hint: null, message: 'invalid input syntax for type date: ""' }
supabaseData.ts:745:13
[TF-DEBUG] addEquipment: Supabase write failed, rolling back equipmentStore.ts:287:21

- [ ] Navigate to /equipment — page loads without error toast
- [ ] Equipment list populates
- [ ] Add new equipment → saves successfully, appears in list
- [ ] Edit existing equipment → saves correctly

## 3. Remaining Fetch Audit (S16-3) - TEST RESULTS: ALL FAIL with ⚠ Something went wrong
Rendered more hooks than during the previous render.

- [ ] Navigate to /work-orders with an active project → page loads, shows work orders
- [ ] Navigate to /work-orders without active project → shows empty state with project selector
- [ ] All pages load without console errors or error toasts
- [ ] Crew Manager loads crew list correctly

## 4. Schedule Edit Modal (S16-4)

- [y] Click an existing schedule chip → edit modal opens
- [y] Modal shows pre-filled values (project, time, notes)
- [y] Status dropdown appears (Scheduled, In Progress, Completed, Cancelled)
- [y] Change status to "In Progress" → save → status badge updates on chip
- [y] Change notes → save → tooltip reflects new notes
- [y] Change project → save → chip color changes to match new project
- [y] Cancel without saving → no changes
- [y] Creating new entries via empty cell click still works

## 5. Equipment Assignment on Schedule (S16-5)

- [y] In create modal: equipment dropdown appears below project dropdown
- [x] In edit modal: equipment dropdown shows current assignment - testing note: can't test because I have no equipment. 
- [x] Assign equipment to entry → tooltip shows equipment name - testing note: can't test because I have no equipment. 
- [x] Only available equipment (or already-assigned) shows in dropdown - testing note: can't test because I have no equipment. 
- [y] Entries without equipment show no equipment in tooltip 

## 6. Active Project Sidebar Indicator (S16-6)

- [y] Select a project → green dot appears next to "Projects" in sidebar
- [y] Green dot also appears next to "Work Orders" in sidebar
- [y] Deselect project (clear active project) → green dots disappear
- [n] Active project card in project list has green left border accent
- [y] Non-active project cards have no border accent

## 7. Debug Page Lazy Load (S16-7) - TESTING NOTE: Unsure how to test in devmode

- [ ] In dev mode: navigate to /debug → page loads normally
- [ ] `npm run build` succeeds
- [ ] Build output size is same or slightly smaller than before

---

## Regression Checks

- [y] Dashboard loads, all widgets render (including schedule widget)
- [y] Schedule page: create, delete, drag-drop all work
- [y] Projects page: list view, detail panel, zones work
- [y] Crew Manager: add/edit/delete works
- [x] PDF export works (manifest + crew packet) - TESTING NOTE: works on manifest engine, not work orders
- [N] Login/logout cycle works - TESTING NOTE: Tried with 3 logins, all previously saved data is gone
- [X] Browser refresh preserves state (localStorage persistence) - TESTING NOTE: This was working until the sign in / sign out cycle

---

## Status After Testing

- Sprint 16 tested by: _________________
- Date: _________________
- Result: [ ] PASS / [ ] FAIL
- Notes: _________________
