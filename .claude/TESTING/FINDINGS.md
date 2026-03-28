# TerrainForge — Test Findings Log

Running log of bugs, friction points, and observations found during testing. Each entry includes the sprint it was found in, severity, status, and resolution.

## Severity Levels
- **P0** — Blocks core workflow entirely. Fix before any other work.
- **P1** — Significant friction or data loss risk. Fix within current sprint.
- **P2** — Noticeable UX issue but workaround exists. Schedule in next sprint.
- **P3** — Minor polish or edge case. Log for later.

---

## Sprint 1 Findings (resolved)

| ID | Severity | Finding | Resolution |
|----|----------|---------|------------|
| F-001 | P0 | Add Crew Member button non-functional | Fixed in S1-7 targeted fix |
| F-002 | P1 | `toggleChecklist` not calling `db.updateProject()` — checklist changes not persisting to Supabase | Fixed in S1-10 |
| F-003 | P1 | `!inner` join in zones query silently dropping zones with no materials | Fixed in S1-10 |
| F-004 | P1 | `!inner` join in crew query silently dropping crew with no certifications | Fixed in S1-10 |
| F-005 | P1 | `!inner` join in equipment query silently dropping equipment with no logs | Fixed in S1-10 |

---

## Sprint 2 Findings (resolved)

| ID | Severity | Finding | Resolution |
|----|----------|---------|------------|
| F-006 | P2 | PDF export download triggered blank tab on some browsers | Switched to `pdf().toBlob()` + anchor click pattern |

---

## Sprint 3 Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-007 | P1 | `create-checkout-session` and `create-portal-session` Edge Functions missing — billing flow had no entry point | Resolved during S3-6 |
| F-008 | P2 | Billing page does not refetch subscription status on mount — could show stale trial state | Open — low priority until pilot |
| F-009 | P2 | PriceResearch AI parsing fragile — accepts camelCase and snake_case field names but silent gaps possible | Open — monitor in production |
| F-010 | P3 | Materials query in PriceResearch caps at 5 items, silently drops rest | Open — acceptable for MVP |

---

## Sprint 4 Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-011 | P0 | **Cross-account data leak** — Signing into a new account in the same browser shows previous user's data. Root cause: Zustand stores persist to localStorage under fixed keys (`tf_projects`, `tf_crew`, etc.). `signOut` only clears `orgStore` — all other stores remain in localStorage. `fetchProjects` has a `if (projects.length > 0)` guard that prevents overwriting cached data when a new account has no Supabase records yet. New user sees old user's localStorage data immediately. | Open — P0, must fix before any pilot |
| F-012 | P1 | **Zone creation UI untestable** — All S4-1 tests returned N. Likely caused by F-011: new account's org_id isn't set up correctly, so zone writes are blocked by RLS. Cannot distinguish UI failure from auth/org failure until F-011 is resolved. Re-test S4-1 after fix. | Open — blocked by F-011 |
| F-013 | P1 | **Dashboard Active Projects widget not confirmed** — All S4-2 tests returned N. Testing environment compromised by data leak. Re-test after F-011 fix on a clean browser profile. | Open — blocked by F-011 |
| F-014 | P2 | **Clear Demo Data button never appears** — S4-4 button is gated on seed project IDs (`proj_001`, `proj_002`) being present. New Supabase accounts don't get these IDs — they get UUIDs from `DEFAULT_PROJECTS` baked into the store. Button works correctly but will never show for any real user. Needs rethink: either drop the ID-based gate and use a flag, or seed IDs into new accounts on signup. | Open — affects all new users |
| F-015 | P2 | **S4-5 empty states untestable** — Blocked by F-014 (can't clear data to reach empty state). Re-test after F-014 fix. | Open — blocked by F-014 |

---

## Known Gaps (not bugs — planned work)

| Gap | Planned Sprint |
|-----|---------------|
| Zone material assignment UI — can create zones but can't assign materials to them from Projects page | Sprint 5 |
| No onboarding wizard for first-time users | Sprint 5 |
| Mobile responsiveness untested | Sprint 5 |
| Seed data doesn't clear automatically on new account | Sprint 4 (S4-4) |
| Map widget placeholder on Dashboard | Sprint 4 (S4-2) |
