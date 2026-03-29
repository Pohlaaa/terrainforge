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
| F-016 | P0 | **Supabase writes silently failing since Sprint 1** — `org_id` never included in create operations (project, crew, material, equipment). RLS requires `org_id` on every insert; without it inserts are rejected and the error is swallowed silently. App has been running on in-memory + localStorage state only — no data was ever persisting to Supabase. Also: local UUID from optimistic update never passed to Supabase, so IDs mismatch on fetch. Additionally, `makeDefaultOrg` creates an in-memory org but does not insert a row into the Supabase `organizations` table — new users have no real org_id, guaranteeing all writes fail. | Open — P0, must fix before pilot |
| F-011b | — | **F-011 fully resolved by S5-1b** — Data leak between accounts confirmed fixed. New account sees zero data. Empty states and dashboard widget confirmed working. | Resolved — S5-1b |

---

## Sprint 5 — Staging Deploy Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-019 | P0 | **fetchOrg INSERT fallback missing `slug`** — When signup trigger doesn't fire or user has no org, `orgStore.fetchOrg` tries to INSERT a new org but omits the `slug` column (NOT NULL UNIQUE). INSERT always fails, org store stays null, all subsequent Supabase writes silently fail because `addProject` checks for org_id. | Resolved — S5-4b: added slug generation to fallback INSERT |
| F-020 | P0 | **fetchOrg INSERT doesn't create `organization_members` row** — Even when the org INSERT succeeds, no membership row is created. All RLS policies check `organization_members` for access. Without a membership row, every SELECT/INSERT on projects/crew/materials/equipment is blocked by RLS. | Resolved — S5-4b: fallback now inserts org_members row with admin role |
| F-021 | P1 | **fetchOrg query ambiguous with multiple orgs per user** — `.eq('owner_id', orgId).single()` fails with a non-PGRST116 error when multiple orgs exist for the same owner_id. The code only handles PGRST116 (no rows), not the "multiple rows" error, so org store stays null. Fix: query by `id` instead of `owner_id` since canonical orgs have `id = user_id`. | Resolved — S5-4b: changed query to `.eq('id', orgId)`, cleaned up duplicates |
| F-022 | P1 | **Empty date strings rejected by Postgres** — `createProject` sends `""` for `start_date`/`target_date` when user doesn't set dates. Postgres rejects empty strings for date columns. Fix: coerce to null. | Resolved — S5-4b: added null coercion in createProject |
| F-023 | P2 | **Silent error swallowing across entire write chain** — orgStore, projectStore, crewStore, materialStore, equipmentStore all catch errors and log only `err.message`. No structured logging, no breadcrumbs. Makes staging debugging nearly impossible. | Resolved — S5-4c: added [TF-DEBUG] instrumentation across persistence chain |
| F-024 | P0 | **Missing RLS INSERT policy on `organizations` table** — RLS is enabled but no INSERT policy exists. The `fetchOrg` fallback tries to INSERT a new org from the frontend client, but it's silently blocked by RLS. The signup trigger uses SECURITY DEFINER (bypasses RLS), but users created via Supabase Auth dashboard or whose trigger failed have no org and no way to create one from the frontend. | Resolved — S5-4c: added `org_insert_own` RLS policy (auth.uid() = owner_id) |
| F-025 | P0 | **Missing RLS self-INSERT policy on `organization_members`** — The only INSERT policy is `org_members_insert` which requires `user_is_admin(org_id)`. A new user with no existing membership can never satisfy this, creating a chicken-and-egg problem. The signup trigger bypasses this, but the frontend fallback cannot. | Resolved — S5-4c: added `org_members_insert_self` RLS policy (auth.uid() = user_id) |
| F-026 | P0 | **`projects_create` policy may silently reject inserts** — The `projects_create` RLS policy requires `user_has_role(org_id, 'designer')` which queries `organization_members`. If the org_members row doesn't exist or the org_members_view policy blocks the read, the project INSERT is silently rejected. The optimistic UI update shows the project, but Supabase never stores it. Page refresh reloads from Supabase → project is gone. | Resolved — root cause was F-024/F-025. With RLS INSERT policies in place, org + membership rows are created, and projects_create succeeds. |

---

## Sprint 5 Retrospective — RLS Persistence Debugging

**Root cause chain:** Supabase RLS policies were incomplete. The original migration (001) defined SELECT/UPDATE/DELETE policies but missed INSERT policies for `organizations` and `organization_members`. The signup trigger (`handle_new_user`, SECURITY DEFINER) bypassed RLS, masking the gap. When the trigger didn't fire or users were created manually, the frontend fallback path hit a wall: no INSERT policy → silent rejection → org store null → org_id missing → all downstream writes rejected → optimistic UI showed data but Supabase stored nothing → page refresh cleared it.

**What made this hard to diagnose:**
1. RLS rejections are silent by design — no error thrown, just zero rows affected
2. Optimistic UI hid the problem by showing locally-created data
3. Multiple layered issues (missing slug, missing org_members row, missing RLS policies) each individually looked like THE bug
4. Error handlers caught and logged `.message` only, discarding Postgres error codes
5. The signup trigger success path worked perfectly, so the happy path was fine — only edge cases failed

**Lessons to carry forward:**
- Always define INSERT policies when enabling RLS — don't rely solely on SECURITY DEFINER triggers
- Test the frontend client path AND the trigger path independently
- Log full error objects, not just `.message`
- Add structured `[TF-DEBUG]` logging for any Supabase write chain
- Verify RLS policies with a direct Supabase client query (not just through the app) before considering a write path complete

---

## Sprint 5 — Pilot Demo Findings (post-demo with real user)

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-027 | P0 | **Persistence regression on delete + create cycle** — Projects persist across single refresh, but after deleting a project and creating new ones, data doesn't survive refresh. Same issue observed with equipment and materials. Root cause: optimistic deletes removed from state before Supabase confirmation; failed deletes left orphaned DB records. Additional DB issues: `total_area_sqft` CHECK constraint rejected 0, `target_date`/`start_date` NOT NULL rejected empty dates. | Resolved — S6-1 (confirm-first deletes, create rollback, post-mutation refetch) + DB constraint fixes |
| F-028 | P1 | **Signup allows non-existent email addresses** — No email verification step. Users can register with any string that passes format validation. Need Supabase email confirmation flow or at minimum a verification email. | Resolved — S6-4: enabled Supabase email confirmation + frontend messaging |
| F-029 | P2 | **Dates in the past are allowed without confirmation** — Project start/target dates accept past dates with no warning. Should show "Are you sure you want to backdate?" confirmation dialog. | Resolved — S6-3: backdate warning added to project create/edit forms |
| F-030 | P1 | **Poor text readability across site** — Text is hard to read in multiple areas, particularly dropdown menus where text renders as white on light backgrounds in some browsers. Likely CSS custom property or theme inheritance issue with select/dropdown elements. | Resolved — S6-2: explicit dark theme styling on select/option elements |
| F-031 | P2 | **Recommend Crew button non-functional** — Button exists but clicking does nothing. Either the handler is missing or the AI integration isn't wired. | Deferred — marked "coming soon", will wire to AI in Phase 2 |

### Pilot User Feedback

**Strategic feedback:** "Why does this have to be specific to landscaping? I could use this to help me remodel my bathroom." — User sees the project management workflow as applicable beyond landscaping. This validates the core UX but suggests the landscaping-specific branding may be limiting perceived value. Consider: is TerrainForge a landscaping tool, or a contractor project management tool with landscaping as the first vertical?

**Feature requests from demo:**

| ID | Request | Priority | Sprint |
|----|---------|----------|--------|
| FR-001 | AI autofill for project creation form | P2 | Phase 2 |
| FR-002 | Edit overall project details after creation | P1 | Sprint 6 |
| FR-003 | Prompt user to add materials during project creation flow | P2 | Sprint 6 |
| FR-004 | Pre-project checklist should require proof/material before items can be checked off (e.g., can't check "Permit" without uploading a permit, can't check "Deposit" without recording payment) | P2 | Phase 2 |
| FR-005 | Import material list (CSV/spreadsheet upload) | P2 | Phase 2 |
| FR-006 | Add suppliers to materials (supplier management) | P2 | Phase 2 |

---

---

## Sprint 7 — Feature Findings (all resolved)

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| FR-001 | P2 | AI autofill for project creation form (pilot request) | Resolved — S7-4: AI project creation via Claude Haiku, describe job → pre-filled form |
| FR-002 | P1 | Edit overall project details after creation | Resolved — S6-3 |

---

## Sprint 9 Findings

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-032 | P1 | **Onboarding redirect loop** — After completing onboarding wizard, ProtectedRoute re-checked `hasCompletedOnboarding()` on every navigation, resetting state to `null` and redirecting back to `/onboarding`. Root cause: `location.pathname` in useEffect dependency array + state reset on every path change. | Resolved — S9-hotfix-3: check once per session, cache result |
| F-033 | P1 | **Existing users forced into onboarding** — Users who signed up before Sprint 9 (no `user_preferences` row) were redirected to onboarding on every login. ProtectedRoute treated missing row as "not onboarded". | Resolved — S9-hotfix-4: moved onboarding gate to signup flow only. Onboarding only triggers from Signup page, not ProtectedRoute |
| F-034 | P1 | **New user signup skips onboarding** — Fresh signup with new email does NOT trigger onboarding flow, goes directly to dashboard. The signup-to-onboarding redirect (S9-hotfix-4) may not be wired correctly, or the navigate to `/onboarding` fires before auth state is ready. | Open — deferred to Sprint 11 |
| F-035 | P2 | **ProtectedRoute.tsx truncation risk** — File appeared as 39 lines in Cowork mount but 67 lines on local filesystem. Mount sync issue, not a real truncation, but indicates Cowork file reads may not always reflect latest git state. | Noted — not a code bug, operational awareness |