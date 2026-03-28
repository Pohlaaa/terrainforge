# Sprint 5 — Test Cases

Run these after each S5 task is merged. Use an incognito window for all multi-account tests to avoid localStorage bleed.

---

## S5-1b: Data Isolation Fix

**Use incognito for this entire section.**

- [ ] Sign in as original (User A) account — data loads correctly from Supabase
- [ ] Add a new project as User A — it appears in the projects list
- [ ] Sign out — projects list clears immediately (no lingering data visible)
- [ ] Sign in as test (User B) account — zero projects visible, not User A's data
- [ ] Navigate to Crew, Materials, Equipment pages — all show empty, not User A's data
- [ ] Sign out of User B
- [ ] Sign back in as User A — original project reloads from Supabase correctly
- [ ] No console errors during any of the above steps

**Regression check:** Normal usage unaffected
- [ ] Sign in as User A in a regular browser window — data loads on every page as expected
- [ ] Sign out and sign back in — data reloads without a page refresh

---

## S5-2: Demo Data Detection + Empty States

- [ ] Sign into a fresh account (User B) — "Clear Demo Data" button visible in sidebar
- [ ] Clicking it shows confirmation dialog with warning text
- [ ] Cancelling does nothing — demo data remains
- [ ] Confirming removes demo projects, button disappears from sidebar
- [ ] After clearing: Dashboard shows welcome card / onboarding prompt
- [ ] After clearing: Projects page shows empty state with "Create your first project" prompt
- [ ] After clearing: Crew, Materials, Equipment pages show empty states (not blank/broken)
- [ ] App does not crash or show errors after clearing

---

## S5-3: Retest of Blocked Sprint 4 Features

### S4-1 Re-test: Zone Creation UI
*(Requires an existing project — create one fresh if needed)*

- [ ] Open a project — "Add Zone" button visible in the zones panel
- [ ] Click Add Zone — form modal opens with fields: name, area (sqft), perimeter (ft), notes
- [ ] Submit with valid data — zone appears in list immediately
- [ ] Submit with missing name — validation error shown, zone not created
- [ ] Click Edit on a zone — form pre-filled with existing values
- [ ] Edit zone name → save — name updates in list
- [ ] Click Delete on a zone — confirmation dialog appears
- [ ] Confirm delete — zone removed from list
- [ ] Cancel delete — zone remains
- [ ] Navigate to Manifest Engine with zones — zones appear in selector
- [ ] Navigate to Work Orders — steps generated for zones

### S4-2 Re-test: Active Projects Dashboard Widget

- [ ] Dashboard loads — no grey "Map placeholder" box visible
- [ ] Active Projects widget appears in its place
- [ ] Widget shows project name, client, checklist progress
- [ ] "View all projects" link navigates to /projects
- [ ] With projects: widget shows up to 5 projects
- [ ] With no projects (after clearing demo data): widget shows "No active projects" with create prompt

### S4-4 Re-test: Seed Data Reset
*(Covered by S5-2 tests above — mark complete if S5-2 passes)*

- [ ] See S5-2 tests

### S4-5 Re-test: First-Login Empty States
*(Covered by S5-2 tests above — mark complete if S5-2 passes)*

- [ ] See S5-2 tests

---

## S5-4: Production Build Prep

- [ ] `npm run build` passes locally with zero errors and zero warnings
- [ ] `netlify.toml` exists with correct build command (`npm run build`) and publish dir (`dist`)
- [ ] `.env.example` documents all `VITE_` environment variables
- [ ] No hardcoded `localhost` references in production code paths
- [ ] No `console.log` statements remaining in production code

---

## S5-5: Phase 1 Gate Review (Cowork session)

| Criterion | Status |
|-----------|--------|
| Auth working (signup, login, logout, session persistence) | ✅ Sprint 1 |
| All 8 pages wired to real Supabase data | ✅ Sprint 1 |
| PDF export functional (Manifest + Crew Packet) | ✅ Sprint 2 |
| Stripe billing live (checkout, portal, webhook) | ✅ Sprint 3 |
| Multi-tenancy: data isolated between orgs | 🔄 Retest after S5-1b |
| Pilot user can complete full workflow unassisted | 🔄 After staging deploy |

Phase 1 is complete when all 6 are checked.
