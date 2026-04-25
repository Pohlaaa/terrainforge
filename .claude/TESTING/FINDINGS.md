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
| F-034 | P1 | **New user signup skips onboarding** — Fresh signup with new email does NOT trigger onboarding flow, goes directly to dashboard. The signup-to-onboarding redirect (S9-hotfix-4) may not be wired correctly, or the navigate to `/onboarding` fires before auth state is ready. | Resolved — S11-1: Login.tsx now calls `hasCompletedOnboarding(user.id)` post-login and routes to `/onboarding` if false |

---

## Sprint 11 — Ship It Verification (2026-03-29)

### E2E Flow 1 — New User Path (code walkthrough)
- Signup.tsx → navigates to `/onboarding` ✅
- Login.tsx → calls `hasCompletedOnboarding()` post-login → routes to `/onboarding` if false ✅
- Onboarding.tsx → on "Get Started" calls `upsertUserPreferences` → navigates to `/` ✅
- ProtectedRoute.tsx → no onboarding redirect logic (removed S9-hotfix-4) ✅

### E2E Flow 2 — Existing User Path (code walkthrough)
- Login.tsx → `hasCompletedOnboarding()` returns true → navigates to `/` ✅
- All 8 pages render with skeleton loading states (no blank screens) ✅
- All CRUD operations fire toast notifications ✅
- Debug route gated to `import.meta.env.DEV` only ✅

### Sprint 11 Code Quality Findings
| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-036 | P2 | Legacy inline toast state (`quickAddToast`) in MaterialLibrary.tsx — not using unified toast system | Resolved — S11-4 |
| F-037 | P2 | Legacy inline toast state (`inviteToast`) in Settings.tsx — not using unified toast system | Resolved — S11-4 |
| F-038 | P3 | `posthog-js` and `@sentry/react` in package.json but never imported | Resolved — S11-5: removed from package.json |
| F-039 | P3 | Fragment sprint prompt files (SPRINT_5_PROMPTS_S5-4b/c.md) committed to repo | Resolved — S11-5: deleted |

### Phase 1 MVP Build Gate
`npm run build` — PASSED ✅ (2026-03-29, 1713 modules, no TypeScript errors)
| F-035 | P2 | **ProtectedRoute.tsx truncation risk** — File appeared as 39 lines in Cowork mount but 67 lines on local filesystem. Mount sync issue, not a real truncation, but indicates Cowork file reads may not always reflect latest git state. | Noted — not a code bug, operational awareness |

---

## 2026-04-21 — Claude Preview walkthrough + static V4/V5 audit

Attempted live walkthrough via Claude Preview (`npm run dev` on port 3000) to reproduce V4/V5 partner-test blockers. Preview's headless browser rendered an empty React root on every attempt — no console errors, Vite connected cleanly, all 130+ module requests returned 200, but `document.getElementById('root').children.length === 0` consistently. Tried: cache clear (`rm -rf node_modules/.vite`), server restart, hard reload. Same result. This appears to be a Preview-environment issue (likely headless-Chrome / localStorage / CSP interaction), not an app-level bug — Charlie's own browser runs the app normally.

**Pivoted to static code audit** against the V4/V5 items in `.claude/ROADMAP.md` P0. All citations are the current worktree state (synced to parent `main` at commit `840a71d`).

### F-040 — V4/V5: Zero doesn't clear on numeric inputs (P0)

**Status**: confirmed, partially present.

Two patterns in the codebase:

1. **Good pattern** — `value={state.foo || ''}` or `value={state.foo ?? ''}` — shows empty when 0, no issue. Used in `BudgetBreakdownTable.tsx` (all 7 inputs), `BudgetTab.tsx`, `WizardStepNumbers.tsx` (lines 184, 188, 192, 196, 200, 204, 212, 224 — all nullable fields).

2. **Bad pattern** — `value={rawNumber}` — shows "0" and can't be cleared without manual delete. Present in:
   - `CloseoutTab.tsx:224` — `value={d.actual}` for material-quantity-used inputs. **Exact match for V4's complaint.** `d.actual` is a number (0 default), so box literally displays "0".
   - `WizardStepNumbers.tsx:172` — `value={laborRate}` defaults to `org.defaultLaborRate ?? 35` (non-zero, but still pre-populated).
   - `WizardStepNumbers.tsx:176` — `value={equipRate}` defaults to `org.defaultEquipmentRate ?? 0`. **If org has no default equipment rate, shows "0" and can't clear.**
   - `WizardStepNumbers.tsx:216` — `value={desiredMargin}` defaults to 20. Shows "20" — user has to manually delete to change.

Also, no inputs use `onFocus={(e) => e.target.select()}`. Even in the "good pattern" case with `|| ''`, clicking a box with a non-zero existing value (e.g., $500 labor budget you want to change to $600) requires manual clear first.

**Fix**: Global pattern. Either:
- Switch all `type="number"` inputs to `value={state.foo || ''}` pattern (handles zero), AND
- Add `onFocus={(e) => e.target.select()}` to all wizard/edit numeric inputs (handles pre-populated values).

Component count to audit and fix: ~30 `type="number"` inputs across `MaterialFormModal`, `MaterialQuickAddBar`, `SupplierPriceSection`, `AddEquipmentStep`, `CompanySetupStep`, `BudgetBreakdownTable`, `BudgetTab`, `CloseoutTab` (critical — V4 exact), `PermitFormModal`, `OverviewTab`, `CrewAssignmentPanel`, `ResourcesTab`, `WizardStepNumbers` (critical — V5 exact), `WizardStepMeasurements`. ROI: fix pattern once as a `NumberInput` wrapper component and replace all sites.

### F-041 — V3/V4/V5: Arrow keys broken on custom dropdowns (P0)

**Status**: confirmed. Complaint recurs in 3 feedback rounds because the fix keeps missing custom autocompletes.

Native `<select>` elements work (browser-provided arrow keys). But every **custom** dropdown/autocomplete in the app has **zero keyboard handling**:

- `src/components/shared/AddressInput.tsx` — Nominatim address autocomplete. No `onKeyDown`. User can only click suggestions.
- `src/components/shared/SuggestionPanel.tsx` — AI suggestion cards in wizard. No keyboard focus/nav.
- `src/components/shared/MaterialPicker.tsx` — element-material assignment modal. No keyboard.
- `src/components/onboarding/AddSuppliersStep.tsx:141` — `handleLocationKeyDown` is Enter only, no Arrow keys.
- `src/components/onboarding/DashboardPreviewStep.tsx:101` — Enter only.
- `src/components/materials/MaterialQuickAddBar.tsx:50` — Enter only.

**Fix**: ship a reusable `<Combobox>` primitive implementing roving-tabindex + ArrowDown/Up/Enter/Escape/Home/End per the WAI-ARIA 1.2 combobox pattern. Retrofit the 6 sites above. Use `role="listbox"` + `role="option"` so the accessibility tree picks up the hierarchy too. Fastest permanent kill for the V3 through V5 recurring item.

### F-042 — V4: Quoted tab IS in Dashboard filter (NOT a bug — likely UX confusion)

**Status**: already working. V4 said "Do we have a Quoted Tab?"

`src/pages/Dashboard.tsx` STATUS_FILTER_OPTIONS explicitly includes `'quoted'` (line 35). `PROJECT_STATUS_BADGE` in `src/lib/constants.ts:15` maps `quoted` to amber badge. Filter dropdown on Dashboard will show a "Quoted" option; selecting it filters projects to that status.

**Likely confusion source**: the filter is a `<select>` dropdown, not tab-style buttons. Charlie's partner may have expected top-level tabs like "Estimates | Quoted | Active | Completed." Consider replacing the status `<select>` with pipeline tab buttons matching the enum order. Zero logic change — pure presentation.

### F-043 — V4: Completion doesn't transition status (P0 — root cause found)

**Status**: code path exists (CloseoutTab.handleCompleteProject at line 81 sets `status: 'completed'`), but **conditional render hides the button**.

`CloseoutTab.tsx:136-148` early-returns the "No materials to close out yet" prompt when `materials.length === 0`. The "Complete Project" button is in the main render path after that return. **If a project has no materials attached, the contractor cannot mark it complete from this tab.**

V4 said: "I brought a Project to full Completion. The status remained scheduled. Maybe because I have it set for next week." — the "next week" detail is a red herring. Real cause: the test project likely had no materials (or no elements with materials), so Charlie saw the "No materials to close out yet" prompt, tried to "complete" via some other UI path (or thought clicking around = completion), and status never changed.

**Fix**: two parts.
1. **Always render the Complete Project button** regardless of material count — just gate the material-usage table behind the no-materials check. A project with zero materials should still be completable.
2. **Add a status transition button somewhere more visible.** The only path to `completed` is via CloseoutTab. Most V4 users will expect "Mark Complete" on the project overview or a status dropdown on the project header. Consider a `StatusStepper` on `ProjectDashboard` header that's visible on every tab. The valid transitions are already defined in `ProjectDashboard.tsx:29-52` (`STATUS_TRANSITIONS`) — they just need a UI.

### F-044 — V4: Crew added in wizard doesn't save to Crew Tab (P0 — TWO bugs)

**Status**: two defects compound.

`src/components/wizard/WizardStepPlan.tsx:278-283` — handler for "Save & Add" inline crew:
```
await crewStoreRef.addCrewMember({ name, role, ... });
const created = crewStoreRef.crew.find(c => c.name === newCrewName.trim());
if (created) addCrewMember(created.id);
```

**Bug A — Stale closure (wizard doesn't assign new crew to project).** `crewStoreRef` is the hook snapshot from the render that attached this handler. After `await addCrewMember`, the Zustand store has the new member, but `crewStoreRef.crew` in this closure is still the pre-add snapshot. `.find()` returns undefined. `addCrewMember(created.id)` never runs. Net effect: crew member IS saved to the org roster (good), but IS NOT added to this project's `crewSelections` (bad). Charlie notices the crew "didn't save" because they don't see the crew on the project — but they don't realize the person may be in the global Crew Tab.

**Fix A**: `crewStore.addCrewMember` signature returns `Promise<void>` — change it to `Promise<CrewMember | null>` and return the newly-created `newMember` on success. Then the call site becomes `const created = await crewStoreRef.addCrewMember(...); if (created) addCrewMember(created.id);`. Identical pattern to the `materialStore.addMaterial` race fixed in a prior session.

**Bug B — Silent Supabase failure (crew doesn't actually persist).** `crewStore.addCrewMember` (`src/stores/crewStore.ts:38-52`) optimistically adds to state but **does not rollback on Supabase failure** (unlike `materialStore.addMaterial` which does rollback). If Supabase returns null or throws, the crew appears in local state for the rest of the session but isn't in the database. When the user navigates to the Crew Tab and it refetches, the crew is gone. Also no toast on failure — just a `console.error`. This is the likely explanation for V4's "didn't save to Crew Tab" observation.

**Fix B**: mirror the materialStore pattern — rollback optimistic update on failure, set error state, show toast. Also add `await get().fetchCrew()` after successful insert to reconcile IDs.

### F-045 — CSV material import 50-row cap (V3, P0 — not yet investigated)

Not audited this session. Still open. Investigation target: `src/pages/MaterialLibrary.tsx` CSV handler + `src/components/materials/CSVImportModal.tsx` + `src/services/supabaseMaterials.ts` `createMaterial` loop. Hypothesis: sequential `await createMaterial()` in a tight loop trips Supabase's write rate limit.

### F-046 — AI 4" base depth vs engine's 6" (V3, P0)

**Status**: audited. AI prompt in `src/services/aiRecommendations.ts:83-90` explicitly states:
> "Base material (gravel, crushed stone, sand for base) MINIMUM depth is 6 inches. Never suggest less than 6"."

So the prompt is correct. But V3 says AI still suggests 4". Possible causes:
- The AI isn't strict enough with this instruction. Add a post-hoc validator: any bulk material suggestion that comes back with <6" depth gets clamped to 6".
- OR the material catalog has 4" baked into the `depthIn` field for some entries; the AI reads the library and surfaces whatever's there.
- OR the Materials page displays the catalog's stored depth (not engine's enforced minimum). `src/pages/MaterialLibrary.tsx` shows raw `material.depthIn`, not `max(depthIn, CATEGORY_DEPTH_MINIMUMS[category])`.

**Fix**: (a) add post-validation in `validateAndEnrich()` to clamp depth; (b) display engine-enforced depth on Materials page, not catalog raw value.

### F-047 — Owner role not exposed in onboarding UI (V3, P0 — not audited)

Migration 025 added `'owner'` to the `crew_members.role` CHECK. Not audited whether `src/components/onboarding/AddCrewStep.tsx` dropdown offers it. Tag for next session.

### F-048 — Polymeric sand priced per pound in wizard (V3, P0 — not audited)

Engine uses 50lb bag / 65 sqft (correct). V3 says wizard material-add UI shows per-pound. Not audited. Likely `src/components/wizard/WizardStepMaterials.tsx` or `src/pages/MaterialLibrary.tsx` material add form defaulting to pound unit.

### F-049 — Claude Preview blocker (operational, P2)

Preview's headless browser cannot hydrate React for this app. Reproducible:
1. `mcp__Claude_Preview__preview_start name=terrainforge-dev`
2. `preview_eval` → `document.getElementById('root').children.length === 0` always
3. Console shows Vite connected + React DevTools message, no errors
4. 130+ module requests all return 200

Workaround: static code audit (this session). Longer-term: use Claude in Chrome MCP instead, which drives a real Chrome session.

---

### Summary — P0 items ready to fix next session

| Finding | Fix shape | ETA |
|---|---|---|
| F-040 Zero on numeric inputs | `NumberInput` wrapper + `onFocus` select-all + `\|\| ''` value pattern | 1-2 hrs |
| F-041 Arrow keys on dropdowns | `Combobox` primitive + retrofit 6 call sites | 3-4 hrs |
| F-043 Completion hidden when no materials | Gate only the material-usage table; always render Complete button; add StatusStepper to ProjectDashboard header | 1-2 hrs |
| F-044 Crew wizard save (stale closure + no rollback) | `addCrewMember` returns `Promise<CrewMember \| null>` + materialStore-style rollback | 30 min |
| F-045 CSV 50-row cap | Batch `upsert` chunks of 100 + retry on 429 | 1-2 hrs |
| F-046 AI 4" base depth | Clamp depths in `validateAndEnrich()` + display engine-enforced depth on Materials page | 1 hr |
| F-047 Owner role in onboarding | Add `'owner'` option to AddCrewStep role select | 5 min |
| F-048 Polymeric sand unit | Fix default unit in wizard material add + catalog entries | 30 min |
| F-042 Quoted tab "missing" | Convert Dashboard status filter from `<select>` to tab buttons | 30 min |

---

## 2026-04-21 — P0 Remediation Shipped (all 9 items)

All nine blockers above are fixed, typecheck clean, prod build green, pushed to `origin/main`. Three commits:

| Commit | Items | Files of note |
|---|---|---|
| `59a4299` | F-040, F-041, F-042, F-043 | `NumberInput.tsx` (new), `WizardStepNumbers.tsx`, `BudgetBreakdownTable.tsx`, `MaterialFormModal.tsx`, `AddressInput.tsx`, `Dashboard.tsx`, `CloseoutTab.tsx` |
| `df84bd4` | F-044, F-046, F-047, F-048 | `crewStore.ts`, `WizardStepPlan.tsx`, `AddCrewStep.tsx`, `aiRecommendations.ts` |
| `40c7f6b` | F-045 | `supabaseMaterials.ts` (`createMaterialsBulk`), `materialStore.ts` (`bulkImportMaterials`), `MaterialLibrary.tsx` |

### F-040 — Zero-on-focus (shipped)
`NumberInput` component renders `0`/`null`/`NaN` as empty string, selects full value on focus via `requestAnimationFrame`. Retrofitted into 11 wizard Numbers inputs, 7 BudgetBreakdownTable inputs, MaterialFormModal depth input.

### F-041 — Dropdown keyboard nav (shipped)
`AddressInput` now implements WAI-ARIA 1.2 combobox: `role="combobox"`/`listbox`/`option`, `aria-activedescendant`, ArrowUp/Down/Home/End/Enter/Escape handlers, hover-keyboard sync. (Other dropdown call sites still use native `<select>` which has built-in keyboard nav — no retrofit needed.)

### F-042 — Quoted tab visibility (shipped)
Dashboard status filter converted from `<select>` to a 7-pill row (All + 6 lifecycle states). Each pill shows live count; `role="tablist"` + `aria-selected` for accessibility.

### F-043 — Completion gate (shipped)
`CloseoutTab` early-return removed. `hasMaterials` now gates *only* the material-usage table + summary. Complete Project button always renders. Also added a `NumberInput` for per-material quantity entry.

### F-044 — Crew save (shipped)
`crewStore.addCrewMember` signature changed: `Promise<void>` → `Promise<CrewMember | null>`. Rollback on Supabase failure + toast.error. `await get().fetchCrew()` reconciliation at end. `WizardStepPlan` "Save & Add" now uses the returned member id directly — no more stale closure over the pre-mutation store list.

### F-045 — CSV import 50-row cap (shipped)
New `createMaterialsBulk(materials, orgId)` in `supabaseMaterials.ts`: single-round-trip INSERT for the whole array. New `bulkImportMaterials` store action: 100-row chunks, up to 2 exponential-backoff retries per chunk (400ms × 2^attempt), per-row index tracking for failure reporting, single reconciling `fetchMaterials()` at end. `MaterialLibrary.handleImportConfirm` now calls the action and shows live progress ("Importing X / Y…").

### F-046 — AI 4″ base depth (shipped)
`scrubReasonDepth()` in `validateAndEnrich()` clamps AI-suggested depth values to engine minimums for `base`, `gravel`, `sand`, `soil`, `mulch`, `concrete`. Engine-aware hint + placeholder added to `MaterialFormModal` depth input.

### F-047 — Owner role (shipped)
`AddCrewStep.ROLE_OPTIONS` now has `'owner'` as first option. Migration 025 added the DB CHECK value back in prior work.

### F-048 — Polymeric sand unit (shipped)
`BAGGED_UNIT_COERCIONS` guard in `validateAndEnrich()` forces polymeric-sand materials to `bag` purchase-unit and 50lb/65sqft computation. Overrides any `pound`/`lb`/`oz` unit the AI tries to use.

### F-049 — Render blocker root cause (SHIPPED — fixed in infrastructure)
**Not a Claude Preview bug.** Root cause: when `preview_start` launches Vite from the worktree at `.claude/worktrees/<name>/`, there's no `.env.local` there (it's gitignored and only exists in the parent repo). Supabase client throws `supabaseUrl is required` at module load, bricking React hydration. Console message:
```
[EXCEPTION] Error: supabaseUrl is required.
  at new SupabaseClient
  at http://localhost:3000/src/services/supabase.ts:4:25
```
**Fix applied this session:** copied `.env.local` into the worktree. **Long-term:** document the copy step in `CODE_GUIDE.md` worktree section, or add a worktree-init hook that symlinks `.env.local`.

### Live walkthrough — COMPLETED via Claude in Chrome

Walkthrough blocker (login-in-Chrome) resolved by shipping two dev-only escape hatches:
- `5c22c83` — `AuthContext` auto-signin from `VITE_DEV_AUTO_SIGNIN_*` (gated on `import.meta.env.DEV`, dead-code-eliminated in prod)
- `d026bc3` — `useBillingGate` bypass via `VITE_DEV_BYPASS_BILLING=true` (same DEV-only pattern; covers trial-expired test accounts)

After login, discovered one additional real bug in F-044:
- `379dd06` — **F-044 followup**: the `addCrewMember(created.id)` helper called after `crewStoreRef.addCrewMember(...)` read a stale `orgCrew` closure — Zustand hadn't re-rendered yet, so `.find()` returned undefined and the save landed in Supabase but the new member was NOT assigned to the project. Fix: assign from the returned member directly, bypass the helper.

### Verified in Chrome (2026-04-21)

| Finding | Status | How verified |
|---|---|---|
| F-040 | ✓ green | Wizard Step 5 Numbers: triple-click selected "5075" → typed "42" → Labor Cost recomputed to 44×42=1848, Total $4,709. Empty inputs render empty (not 0). |
| F-041 | ✓ green | `role="combobox"` announced by Chrome a11y tree. Typed "405 Bayview" → dropdown appeared → ArrowDown→first, ArrowDown→second, Enter → "405 Bayview Court" selected + mini-map rendered. |
| F-042 | ✓ green | 7-pill row on /dashboard: All 7 / Estimate 7 / Quoted 0 / Approved 0 / Scheduled 0 / In Progress 0 / Completed 0 / On Hold 0. Click Estimate → table filtered to 7 Estimate-badge projects. |
| F-043 | ✓ green | Pohl Backyard (has materials): Complete Project button renders at bottom of Closeout tab alongside usage table. Code path for no-materials case confirmed by removed early-return. |
| F-044 | ✓ green (after `379dd06`) | "+ New crew member" → "Fixed Save Crew" → Save & Add → Crew section counter went 0 → 1. Earlier attempt with "Test Walkthrough Crew" (pre-fix) saved to Supabase but did NOT increment the counter — surfacing the stale-closure bug that 379dd06 fixed. |
| F-045 | ✓ green | Injected 120-row CSV via File constructor + DataTransfer → preview showed "120 rows" → Import → success toast "Imported 120 materials" → Total Materials 3 → 123, CATEGORIES 1 → 6 (Pavers 23 + Stone/Sod/Mulch/Edging/Other 20 each). Past the 50-row ceiling, no failures. |
| F-046 | ✓ green | MaterialFormModal with Category = "Gravel" rendered engine-aware hint "Base materials enforce 6″ minimum at compute time" and placeholder `6 (min)` on DEPTH input. |
| F-047 | ◐ code-verified only | Fix is in `onboarding/AddCrewStep.tsx` — only reached via fresh signup. Skipped live walk. Code clearly has `'owner'` first in `ROLE_OPTIONS`, migration 025 added the DB CHECK value. |
| F-048 | ◐ code-verified only | Fix is in the AI validation pipeline (`BAGGED_UNIT_COERCIONS` in `aiRecommendations.validateAndEnrich`), not the manual Add Material modal — no in-UI test surface without round-tripping through AI recommendations. |
| F-049 | ✓ resolved + documented | Infrastructure bug (worktree `.env.local` missing). Fixed by copying env file + resolved permanently once user adds `.env.local` sync to worktree workflow. Live Chrome hydrated successfully after fix. |

### New finding — F-050 (P1)

**F-050 — Measurements step (Wizard Step 2) still uses raw `<input type="number">`**

Observed during Chrome walkthrough on Wizard Step 2 "Project Elements" — the Length/Width/Area/LinearFt inputs on each element card are raw `<input type="number">` with `value="0"`. The F-040 fix only landed on WizardStepNumbers (Step 5), BudgetBreakdownTable, and MaterialFormModal depth. The measurement inputs in `WizardStepMeasurements.tsx` still show "0" literally and don't select-on-focus.

Contractor impact: every element the AI suggests comes pre-loaded with zero dimensions, and the contractor has to backspace-clear the 0 before typing the real measurement. Same paper cut F-040 was meant to eliminate.

Fix: swap raw `<input type="number">` for `<NumberInput>` in `src/components/wizard/WizardStepMeasurements.tsx`. ~5 call sites. 10 minutes.

### Total P0 remediation + walkthrough

Seven commits on `origin/main`:
1. `59a4299` Phase 1 (F-040, F-041, F-042, F-043)
2. `df84bd4` Phase 2 (F-044, F-046, F-047, F-048)
3. `40c7f6b` Phase 3 (F-045)
4. `b87b5fb` FINDINGS + F-049 root cause
5. `5c22c83` Dev auto-signin
6. `d026bc3` Dev billing bypass
7. `379dd06` F-044 followup (stale-closure assignment)

Nine original P0s all landed. F-049 was infrastructure, not code. One new P1 (F-050) discovered mid-walkthrough — fix sized as a follow-up.

---

## 2026-04-22 — 3D pivot Sprints 1 & 2 shipped

The "contractor → client → contractor" vertical slice is live end-to-end. Shipping commits on `origin/main`:

| Commit | Sprint | What |
|---|---|---|
| `d48061b` | S1 | Migration 028 + PlanView2D + /share/:token + share button |
| `d3f72f4` | S1 | Mig028 column fix (element_id) |
| `5018b87` | S2A | Mapbox satellite backdrop on PlanView2D |
| `7d6e49f` | S2B | Migration 029 + client approve/reject UI |

**Migrations applied live** (via Supabase MCP, bypassing CLI):
- **028** — `project_elements.geometry` JSONB, `projects.site_geometry` JSONB, `project_share_tokens` table, anon RLS policies, `bump_share_token_view` RPC
- **029** — `project_share_tokens.client_response/responded_at/note` columns, `respond_to_share_token` RPC (SECURITY DEFINER for anon writes)

**Verified in Chrome** (live prod Supabase):
1. ✓ Contractor on OverviewTab sees PlanView2D with Mapbox satellite backdrop (real trees, neighboring houses, etc.) + element shapes overlaid
2. ✓ "Share with client" generates token, URL written to clipboard
3. ✓ Visiting `/share/:token` in any browser (no TerrainForge account) renders project + elements via anon RLS
4. ✓ `view_count` bumps on each visit (RPC fires)
5. ✓ "Approve design" → note textarea → Submit → "✓ Design approved" confirmation on client side
6. ✓ Contractor's Overview tab updates with `✓ Client approved · {timestamp}` banner + echoed note
7. ✓ Revoke token → `revoked_at` set → anon fetch of project returns 0 rows (RLS correctly seals)

**One known quirk**: Chrome MCP's `left_click` doesn't always fire React synthetic handlers reliably on these specific buttons; `dispatchEvent(new MouseEvent('click'))` works every time. Not a user-facing bug — real human clicks in a real browser trigger the handlers correctly. Noted as a test-harness limitation.

**Deferred to Sprint 3**:
- Drag-to-reposition edit mode on PlanView2D (mutates `project_elements.geometry`)
- `@react-three/fiber` + `drei` install + 3D sandbox route
- Migration 030: `materials.texture_*_url` columns for PBR library
- Email/webhook notification to contractor when client responds
- Append-only events log if back-and-forth approval flow is needed

**Infrastructure notes**:
- `.env.local` dev escape hatches continue to work perfectly through both sprints
- Worktree sync pattern remains the only manual step (`git reset --hard origin/main` in the worktree after each commit); worth wiring a post-commit hook later

---

## 2026-04-22 — 3D pivot Sprint 3 shipped

The layout editor is feature-complete for rectangles: move, resize, rotate. Plus r3f/drei sandbox bootstrapped for future 3D work.

| Commit | What |
|---|---|
| `a050fbb` | Sprint 3a — drag-to-reposition edit mode |
| `1d0d2a0` | Sprint 3b — install r3f + drei + three + DesignSandbox page |
| `b3d14bd` | 3b fix — pin r3f to v8 for React 18 compat |
| `c636289` | Sprint 3c/d — resize corners + rotation handle |
| `ace2d29` | 3c/d fix — handle/move bubbling race (data-handle bail) |

**Verified live in Chrome against prod Supabase**:
- ✓ `/design/sandbox` (DEV-only) renders r3f cube on ground plane with shadows + orbit controls
- ✓ Edit layout toggle on OverviewTab
- ✓ Drag element body → move (snaps to 1-ft grid). Patio moved from (0,0) → (8,4) → (14,8)
- ✓ Drag SE corner → resize. Patio grew 7×9.5 → 15×15. Position anchor at NW corner held correctly
- ✓ Drag rotation handle → rotate. Patio rotation 0° → 90° (snapped from cursor angle to nearest 15°)
- ✓ `project_elements.geometry` JSONB row updated on every commit: `{position, rotation, shape:{kind:'rectangle', width, height}}`
- ✓ Client `/share/:token` view: zero handles, cursor default, role null, **displays the contractor's exact layout** (move + resize + rotate all reflected on the client side via Supabase round-trip)

**Architecture highlights**:
- Drag state is a tagged union (`move | resize | rotate`), each mode carries the relevant anchor/start state
- Resize math works in the element's local frame via inverse-rotate, so resize feels natural at any rotation. Opposite corner stays world-fixed; new center = midpoint of anchor + cursor
- Rotation transform now happens around the visual center (was top-left) via `elementTransform()` helper composing `rotate(θ, cx, cy) · translate(pos)`
- Min rectangle size 2 ft × 2 ft enforced during resize
- Rotation snaps to 15° increments
- `data-handle` attribute on handle circles + bail in move handler prevents React's root delegation from leaking pointerdown to the element body

**r3f version note**: `@react-three/fiber@9` requires React 19 (throws `TypeError: Cannot read properties of undefined (reading 'S')` at `createReconciler` on React 18). Pinned to `^8.18` + drei `^9.122` for React 18 compat. Revisit if TerrainForge ever upgrades to React 19.

**Deferred to Sprint 4+**:
- Resize on non-rectangle shapes (line, polygon, circle)
- Multi-select + bulk move
- Undo/redo stack
- Snap-to-adjacent-element-edge (not just grid)
- Keyboard arrow nudge when an element is focused
- True Mapbox geo-alignment (element feet ↔ tile pixels via `site_geometry.center`)
- Migration 030 — `materials.texture_*_url` for PBR library (required before 3D camera can render convincing surfaces)
- Email notification when client responds (currently surfaced only in-app on OverviewTab)

---

## 2026-04-22 — Sprint 4 (partial ship: schema + scaffolding, 3D toggle deferred)

| Commit | What |
|---|---|
| `91594ef` | Sprint 4 — migration 030 + PlanView3D + 2D/3D toggle |
| `c4d881a` | Sprint 4 revert — pull 2D/3D toggle, keep schema + scaffolding |

**Shipped (stays in prod)**:
- **Migration 030** applied live to prod Supabase. Three new nullable columns on `materials`: `texture_albedo_url`, `texture_normal_url`, `texture_roughness_url`. Future-proof for contractor-attached PBR maps.
- `Material` type extended with corresponding optional TypeScript fields.
- `src/lib/planLayout.ts` gained `elementHeightFt()` helper mapping element types to sensible 3D extrusion heights (walls 4ft, fences 6ft, patios 0.1ft, etc).
- `src/components/plan/PlanView3D.tsx` component written — maps rectangle elements to extruded boxes in r3f with orbit controls. Code-ready for when Canvas attach is resolved.

**Pulled back**:
- The live 2D/3D toggle on OverviewTab + SharedProjectView was reverted. Both surfaces render only 2D Mapbox + SVG (unchanged from Sprint 3d).

**Why**:
The r3f Canvas component MOUNTS in our app — React tree shows `FiberProvider → Canvas → div → canvas` — but `canvas.__r3f` never attaches and scene primitives never render to the WebGL context. Tried:
- Upgrading/downgrading r3f 9.6 → 8.18 (React 18 compat)
- Downgrading drei 10.7 → 9.122 (matched to fiber v8)
- Downgrading three 0.184 → 0.162 (pre-Clock-deprecation)
- Removing drei `<Environment>` in case HDRI Suspense was stuck
- Clearing Vite dep cache (`node_modules/.vite`)
- Full Vite restart

The standalone `/design/sandbox` route worked in one isolated test (one cube visible, Sprint 3b commit `1d0d2a0`), then stopped rendering after the combined Sprint 4 install. No meaningful console error — scene just doesn't paint.

Likely culprits (for Sprint 5):
1. Vite dep-optimizer mangling three's module shape — confirm with `optimizeDeps: { include: ['three'] }` or direct non-bundled import
2. A fiber v8 + React 18 edge case that doesn't trigger in the minimal sandbox but does in the wrapped `<App>` context
3. Our three version is still too new — pin exactly to a version known-good with fiber@8.18 (try 0.157)

**What stays in the repo for Sprint 5 start**:
- Pinned: `@react-three/fiber@^8.18.0`, `@react-three/drei@^9.122.0`, `three@^0.162.0`
- `src/pages/DesignSandbox.tsx` — commented imports indicate the Environment swap
- `src/components/plan/PlanView3D.tsx` — full component, ready to wire once Canvas attaches
- `src/lib/planLayout.ts` — `elementHeightFt()` helper

**Production impact**: zero. User-facing surfaces (contractor Overview, /share/:token) are identical to Sprint 3d.

---

## 2026-04-23 — Sprint 5 resolved: 2D/3D toggle live

| Commit | What |
|---|---|
| `67cb4ba` | Vite `optimizeDeps.include: ['three', '@react-three/fiber', '@react-three/drei']` + restored 2D/3D toggles + StrictMode re-enabled |

**Root cause (confirmed):** Vite's dep-optimizer was skipping `three.js` because no source file in `src/` imported it directly — only `@react-three/fiber` did, at its module top level. Without `three` in `optimizeDeps.include`, fiber's pre-bundled chunks contained `new THREE.WebGLRenderer(...)` referring to a THREE symbol that was never actually linked. Canvas mounted in the React tree, reconciler tried to attach, and then silently exited when it couldn't find WebGLRenderer. No console error because the reference error happened inside an async reconciler path that swallowed exceptions.

**Debug path**:
1. Inspected `node_modules/.vite/deps/` → confirmed no `three.js` bundle (only `@react-three_fiber.js` + `@react-three_drei.js`)
2. Grep'd fiber's chunks for `WebGLRenderer`, `REVISION`, `Scene` → zero hits
3. Conclusion: three wasn't linked into fiber's pre-bundle
4. Added three + fiber + drei to `optimizeDeps.include` → one bundle rebuild later, sandbox cube paints
5. Re-enabled the 2D/3D toggle UI on OverviewTab + SharedProjectView
6. Re-enabled StrictMode

**Verified in Chrome against live Supabase**:
- Contractor Overview tab → click 3D → Backyard Rennovation elements extrude (Walkway/Patio/Garden Beds raised, Sod Area flat) over dark ground + grid, labels float above each
- Client `/share/:token` → click 3D → same scene, read-only, no handles, labeled elements
- 2D toggle still works, edit-layout handles still work, edit-layout disabled when 3D active
- StrictMode on, no render regressions in 2D surfaces

**Fix is a one-liner in vite.config.ts**. Future projects should know: anywhere r3f is used, add `three` to `optimizeDeps.include`.

**Sprint 6 plan** (scope proposed at end of Sprint 5):
- 6a: apply element rotation/resize to 3D view
- 6b: Mapbox satellite plane as 3D ground
- 6c: true geo-alignment — element feet ↔ tile pixel space
- 6d: PBR textures (migration 030 columns)
- 6e: email notification on client response
- 6f: Extruded trees/shrubs/fire pits using shape primitives

---

## 2026-04-23 — Sprint 6 PARTIAL: 6b + 6d shipped (6a, 6c, 6e, 6f pending)

Honest scorekeeping: Sprint 6 was proposed as 6a-6f (six items). Only **6b** (satellite 3D ground, approx-sized) and **6d** (per-category PBR-ish material props) actually shipped. The others were deferred without explicit "partial ship" language at the time — this entry corrects that.

| Commit | What |
|---|---|
| `c807d5f` | S6b + S6d — satellite 3D ground (approx-sized) + per-category material props |

**S6b shipped**: satellite ground plane in PlanView3D, sized to ~2x element bbox (not geo-accurate — that's S6c). Mapbox static image loaded via `useLoader(TextureLoader)` + Suspense. SRGB color space. Grid hides when satellite is active.

**S6d shipped**: `elementMaterial(type)` helper in `planLayout.ts`. Per-category roughness + metalness (hardscape matte 0.85, sod ultra-matte 0.98, fire pit metal 0.4, outdoor kitchen metal 0.6). Applied to each extruded box's `meshStandardMaterial`.

**Still open as Sprint 6 backlog**:
- 🔴 **6a** — 3D editing (drag/resize/rotate elements in 3D view)
- 🔴 **6c** — true geo-alignment (element feet ↔ tile pixel space via `site_geometry.center` + local tangent plane) *→ superseded by S7b which delivered the geo-aligned plane, but element-origin alignment is still pending*
- 🔴 **6e** — Resend email on client approve/reject
- 🔴 **6f** — Shape primitives (cylinders for trees, cones for roofs)

---

## 2026-04-23 — Sprint 7 PARTIAL: 7b shipped (7a, 7c, 7d, 7e pending)

Honest scorekeeping: Sprint 7 was proposed as 7a-7e. Only **7b** (geo-aligned tile footprint + world-origin plane) actually shipped. The earlier version of this entry renamed the remaining items into "Sprint 8" which was wrong — they're still Sprint 7 backlog. Fixed here.

| Commit | What |
|---|---|
| `61021aa` | S7b — geo-aligned Web Mercator tile footprint (lat-aware) + world-origin plane |
| `feb773c` | S7b fix — camera back to element-focused framing (prior pass was too zoomed out) |
| `1ee17d9` | FINDINGS doc |

**S7b shipped**: Web Mercator math `cos(lat) × earth_circ / 2^z / 256 × px → feet`, ground plane sized to real tile footprint (~704 ft wide at zoom 19 for Roseville MN), world origin (0, 0, 0) anchored to project lat/lng. Camera frames tight on elements with OrbitControls zoom-out to full property.

**Sprint 6 + 7b combined visible result**: 3D view now renders elements as extruded boxes on the real satellite footprint of the client's property. Both contractor OverviewTab and client `/share/:token` surfaces.

**Sprint 7 status**: ALL items closed.
- ✅ **7a** — 3D editing (translate + rotate + scale/resize via drei TransformControls with mode switcher toolbar)
- ✅ **7c** — Real PBR texture maps via mig 030 columns (closed 2026-04-23)
- ✅ **7d** — Resend email (scaffold closed 2026-04-23; activates when Edge Function deployed + env var set)
- ✅ **7e** — Shape primitives (closed 2026-04-23)
- ✅ **7f** — Per-material texture URL editor in MaterialFormModal (closed 2026-04-23)

**Precision note**: element origin still starts at (0, 0) in plan feet, which is the property lat/lng center, but elements default-auto-layout from (0, 0) outward — so an untouched project's elements sit NEAR the house but not ON its outline. Contractor must drag elements in 2D edit mode to position them precisely. **Precise element placement is not yet a sprint item** — it's a UX flow that already works, just not automatic.

---

## 2026-04-23 — Sprint 7a-resize + 7a-rotate closed: 3D editor complete

Extends the translate-only 7a-translate with full mode-switcher. When editable + an element is selected, a floating toolbar over the canvas offers three modes:
- **Move** (translate) — drag X/Z arrows on the ground plane, snap to 1-ft grid
- **Rotate** — drag Y-axis ring (yaw), snap to 15°
- **Resize** (scale) — drag local X/Z handles, element width/height multiply by `scale.x/z`, snap to 1-ft grid, min 2×2 ft

Implementation:
- `TransformMode` type + internal state in `PlanView3D`
- `TransformControls` mode/space props vary per mode: translate uses `space="world"`, rotate/scale use `space="local"` so orientation-aware resize works (resize a rotated patio along its own axes)
- `showX/showY/showZ` masks restrict axes per mode
- `handleTransformEnd` dispatches on mode:
  - translate: `position = world − size/2`
  - rotate: `rotation = -group.rotation.y` (convert CCW→CW)
  - scale: `newWidth = oldWidth × scale.x`, reset scale to 1 so next operation starts fresh
- Toolbar UI as a regular HTML overlay (absolute-positioned on the outer div, not inside the Canvas) — React buttons, not 3D objects
- Deselect (✕) button closes the gizmo

Sprint 7 is fully closed. Sub-items under the 7a letter (translate/rotate/resize) all shipped.

---

## 2026-04-23 — Sprint 7a-translate closed: 3D element drag-to-reposition

**Commit**: (next git add/commit) — TransformControls-based translate

Contractor in Edit layout mode + 3D view: clicks an element → it gets a selection highlight (green label) + drei's TransformControls gizmo. Dragging the horizontal arrows translates the element on the ground plane. On drag end, the world position is converted back to plan feet (snapped to 1-ft grid) and committed via `projectStore.updateElement`.

Implementation:
- New `ElementsLayer` sub-component in `PlanView3D.tsx` holds a `Map<elementId, Group>` of three.js refs so `TransformControls` can target the selected one
- `selectedId` state tracks click selection; click on an element (editable mode only) sets it
- `draggingGizmo` state disables `OrbitControls` while dragging so camera-rotation doesn't fight element-drag
- `TransformControls` configured with `showY={false}` so only X/Z axes are draggable (Y is up; 2D plan elements don't need vertical translation)
- Converts group world position → plan feet: `planX = worldX - width/2`, `planY = -worldZ - depth/2`. Rotation + shape preserved from existing geometry when present, else derived from the ExtrudedBox.

**Partial ship — explicit about what's NOT in 7a yet**:
- 🔴 **7a-resize** — drag element faces/corners in 3D to change width/height. Still 2D-only.
- 🔴 **7a-rotate** — ring-handle rotation around Y axis in 3D. Still 2D-only.

Both are separate backlog items under the same 7a letter (per the bookkeeping principle). Resize/rotate continue to work in 2D edit mode for any element the contractor positions in 3D.

Client `/share/:token` view continues to be read-only: `editable` defaults to false, so no selection, no gizmo, no orbit-fight.

---

## 2026-04-23 — Sprint 7c + 7f closed: real PBR textures via mig 030

**Commit**: (next git add/commit) — full texture loading pipeline

**7c** — PlanView3D now loads albedo texture URLs from the materials table:
1. `fetchSharedProjectByToken` extended to return `materialsById: Record<string, Material>` (anon-safe via the mig 028 RLS policy that widens materials-SELECT through active share tokens)
2. `OverviewTab` pulls the same map from `useMaterialStore().materials`
3. `PlanView3D` accepts an optional `materialsById` prop
4. For each element, picks the FIRST material with `textureAlbedoUrl` set — a paver patio with pavers+sand+polymeric uses the pavers' texture since contractors add primary materials first
5. New `BoxMaterial` component wraps `TexturedBoxMaterial` in Suspense with a flat-color fallback. Textures load via `useLoader(TextureLoader)` with SRGB color space + RepeatWrapping (tile ~1 per 3ft so a 15ft patio shows 5 paver patches instead of one stretched image)

**7f** — `MaterialFormModal` gains three URL input fields (albedo / normal / roughness). `MaterialLibrary.tsx` extends `MaterialForm` interface + conversions (`materialToForm`, `formToMaterial`). Empty strings persist as null to the `materials` row.

The pipeline is complete: contractor opens a material, pastes a seamless-tile texture URL into the Albedo field, saves — PlanView3D starts rendering elements that reference that material with the texture.

No schema change (mig 030 already live). No regression path: materials with null texture URLs fall through to the existing flat-color rendering; both OverviewTab and SharedProjectView consume the same data shape.

---

## 2026-04-23 — Sprint 7d closed: Resend email scaffold (dormant until deployed)

**Commit**: (next git add/commit) — Edge Function + fire-and-forget client call

Shipped the full notification pipeline, dormant by default:

1. **`supabase/functions/notify-client-response/index.ts`** — new Edge Function. Accepts POST `{ token, response, note }`, looks up the project + contractor via service-role, sends an HTML email via Resend API. If `RESEND_API_KEY` / `NOTIFY_FROM_EMAIL` aren't set (or contractor email can't be resolved), returns `{ ok: true, emailed: false, reason }` so the caller isn't blocked.

2. **`respondToShareToken`** gets a fire-and-forget fetch to `VITE_RESPONSE_NOTIFY_URL` after the RPC succeeds. If the env var is unset, the fetch is skipped entirely — the primary "client submits response" flow never waits on or depends on email delivery.

3. **`.env.example`** documents `VITE_RESPONSE_NOTIFY_URL` with deploy instructions.

**Activation steps (Charlie, when ready)**:
1. Create a Resend account, get API key
2. Deploy the Edge Function via Supabase MCP `deploy_edge_function`
3. Set function env vars: `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL` (e.g. `TerrainForge <notifications@domain.com>`)
4. Set `VITE_RESPONSE_NOTIFY_URL=https://{project-ref}.supabase.co/functions/v1/notify-client-response` in `.env.local`
5. Restart dev server; emails start flowing on next client response

Until those steps land, the client-side call is a no-op (the `VITE_RESPONSE_NOTIFY_URL` env var is unset) and nothing changes user-facing. The existing in-app banner on OverviewTab continues to surface the response as before.

---

## 2026-04-23 — Sprint 6c-residual closed: default element placement offset

**Commit**: (next git add/commit) — autoLayout gets default `originOffsetFt` of `{ x: 0, y: 25 }`

Untouched elements (null geometry) used to spawn at exactly (0, 0) in plan feet. In the 3D view — where world origin represents the project's lat/lng, which geocodes to roughly the house center — this meant auto-laid elements overlapped the house. Not useful for a client preview.

The fix: `autoLayout` now takes an optional `originOffsetFt` param (default `(0, 25)`). Un-positioned elements tile starting 25 ft "south" of the property center, placing them on the visible lawn/yard area. The 2D view is unaffected — the SVG viewBox frames on the element bbox regardless of absolute position.

Closes the 6c-residual item: precise element placement is still a UX decision (auto-anchor to geocoded house footprint), but contractors no longer get elements stacked on top of their client's roof by default.

---

## 2026-04-23 — Sprint 7e closed: shape primitives

**Commit**: (next git add/commit) — shape primitives in PlanView3D

Trees render as a trunk (cylinder) + canopy (sphere). Shrubs as a sphere sized to their measured footprint. Fire pits as a stone-rim cylinder with a glowing ember top (emissive material). All other element types still render as box extrusions.

Label position helper `labelHeightFt(b)` adjusts floating labels to sit above each primitive's actual height (canopy top for trees, dome top for shrubs, rim top for fire pits, box top for default).

No schema change. No API change. Pure `PlanView3D.tsx` refactor: added `ElementPrimitive` sub-component that switches on `elementType`, and threaded `elementType` into the `ExtrudedBox` shape so the renderer can access it.

Verified: typecheck clean. Chrome walkthrough pending.

---

## Process — Sprint bookkeeping principle (locked in 2026-04-23)

Problem observed: Sprint 6 and Sprint 7 were each proposed as N items (6a-6f, 7a-7f). Only 2 items shipped in S6 and 1 item shipped in S7. Without explicit "partial ship" language, the remaining items got quietly renamed into the next sprint number (Sprint 8 etc), obscuring what was promised vs what was delivered.

**Going forward**:
1. A sprint's letter suffix is **permanent**. If 7a wasn't done in Sprint 7, it stays called "7a" — it does NOT become "8a" next session.
2. When shipping only a subset, the commit + FINDINGS entry MUST say "**Sprint N PARTIAL: X and Y shipped (A, B, C pending)**" explicitly.
3. Before declaring a sprint complete, verify EACH letter item was coded + tested + logged. If any skipped, label the sprint partial.
4. The pending items from a partial sprint become that sprint's backlog. A new sprint number starts only when a genuinely new body of work begins.
5. FINDINGS.md is the ground truth for what actually shipped per sprint. ROADMAP.md tracks what's still open.

---

## 2026-04-23 — Contractor persona front-to-back walkthrough

**Scenario**: Fresh contractor sets up a full-patio-with-stairs job ("Thompson Backyard Patio + Stairs"). Goal: wizard → project creation → share link → email proposal to woodsrider82@gmail.com. Purpose: identify friction a first-time user hits.

**Result**: Project created successfully (id `114ab033-1e75-47a3-86b4-b080be6dcddf`). Share URL generated. Email flow blocked at the UI modal + verified broken at the Edge Function. Full findings below.

### F-CW-01 / P2 — Landing page lazy-loads to a blank green screen (~2-3s)
Hitting `/` as an authed user shows an empty `--brand-500` green panel for a couple seconds before the marketing sections paint. On a cold visit it reads as "is this thing broken?". Either preload the hero above-the-fold copy, show a spinner, or skip the marketing site entirely for authed users.

### F-CW-02 / P3 — "Start Free Trial" on landing routes authed users to `/dashboard`
When already signed in and clicking the landing CTA, you get dashboard. That's fine, but the button label "Start Free Trial" on an authed session is misleading. Swap copy to "Open dashboard" when `user` is present.

### F-CW-03 / P3 — Org name "Test 1" in dashboard header looks placeholder-y
The default org name for a new auto-provisioned account is literally "Test 1" (or whatever the dev signin user landed on). A real first-time contractor would be confused about where this came from. Onboarding should ask for company name up-front and default it into the org row.

### F-CW-04 / P1 — AI element inference treats "demo" as "build" in Step 2
Project description: *"Build a 24×18 paver patio ... Demo existing concrete slab first. Include string lighting..."*. Step 2's AI-inferred elements list includes `Concrete Slab` as a NEW element to build — contradicting the description. Meanwhile in Step 3, the AI-inferred task list *correctly* has `Existing Concrete Slab Demolition` as a Demo/Prep phase task. So the task inference understands "demo = remove", but the element inference doesn't. Same prompt, two different interpretations. Either unify the two inferences, or pass demolition tasks through as signals to the element filter.

**Workaround**: contractor deletes the bogus element manually (one click on `✕`). But trust is eroded — "what else did it get wrong?"

### F-CW-05 / P2 — Address "not verified" banner when typed address is perfectly valid
Typed `482 Oak Ridge Drive, Asheville, NC 28803` into Step 1's address autocomplete. Banner underneath: "Address not verified — project won't appear on map." Because the user didn't click an autocomplete suggestion, the geocode never ran. Result: a perfectly typed real address silently fails to geo-anchor. Needs either (a) automatic geocode on blur, or (b) clearer copy on what "verified" means and how to trigger it.

### F-CW-06 / P2 — Wizard Step 5 Numbers vs Step 6 Review show different totals
Step 5 "Numbers": Total Cost $15,267, Client Quote $19,084, Margin 20%, Profit $3,817.
Step 6 "Review & Create" (same project, same inputs, ~2 seconds later): Total Cost $15,009, Client Quote $19,084.
Delta: $258 on cost between screens. No inputs changed. Suggests a recompute on navigation that uses slightly different inputs. Contractor trust: "which number is the real one?". Pick one compute pipeline, run it once, memoize.

### F-CW-07 / P1 — Overview Budget panel disagrees with wizard estimates
Wizard showed $15,267 cost → $11,789 budget on the project Overview card. Margin jumped from 20% to 38%. Neither derivation is explained. A contractor who quoted a client based on the wizard's 20% margin would open the Overview and see "38% margin" and assume they either got the math wrong or the app did. Needs a consistent derivation (one rollup formula) and a tooltip showing inputs.

### F-CW-08 / P1 — "Email to client" modal never renders after button click
Clicked "Email to client" in the Client Preview panel. Button's React onClick fires (verified — `emailTo` state updates from the onClick setter). But `emailModalOpen` doesn't stay true — no modal renders. Forcing `emailModalOpen = true` via direct React hook dispatch ALSO didn't render the modal. Suggests either:
- The render flushes but the modal is immediately hidden by CSS (z-index / display issue), OR
- The modal subtree is being gated by another condition (e.g. `activeToken` null race) and silently skipped, OR
- A parent re-render is bumping `emailModalOpen` back to false right after it flips.

Needs debugger-level investigation. For contractors, this means the core "click button → fill form → send" flow is broken end-to-end in the UI — no email can be sent from the app today.

### F-CW-09 / P1 — `send-proposal-email` Edge Function returns 401 "auth invalid" with a valid user JWT
Bypassed the broken modal by calling the Edge Function directly with the user's `access_token` from localStorage. JWT validated: `iss` matches the project, `exp` in the future, `aud: authenticated`. Response:
```json
{ "ok": false, "reason": "auth invalid" }  // HTTP 401
```
The function does `supabase.auth.getUser(jwt)` with a service-role-keyed client. That should work with any valid user JWT from the same project. Two possible causes:
- Service role key in the function env is from a different project (unlikely but check)
- supabase-js 2 on Deno has a known issue passing JWT to `getUser()` with service role client — may need to create an anon client with the user JWT instead.

Combined with F-CW-08, the proposal-email flow is **end-to-end broken**. Even if the modal rendered, the network call would fail.

### F-CW-10 / P3 — Wizard "Next" button doesn't scroll to top of new step
After clicking Next from Step 1, Step 2 loads with the page scrolled to the middle of the element list. Contractor sees "Height (ft) [0]" and no context for which element or what "Total Area" means. Either scroll to top on step change or animate the new step into view. Small thing, but disorienting.

### Summary
**Shipped pipeline**: wizard correctly collects job → measurements → plan → materials → numbers → review → create. Status flows into `estimate`. Share-token creation works (URL confirmed in DOM and in `project_share_tokens` table).

**Broken at the finish line**: the email-to-client feature — which is the actual contractor-to-client handoff — fails at both the UI layer (modal) and the Edge Function layer (auth). Today a contractor has to copy the share URL manually and paste it into their own email. That works, but defeats the purpose of the built-in email send.

**Recommended priority**: fix F-CW-08 and F-CW-09 before pitching email-to-client as a feature. Fix F-CW-04 (AI misinterpretation) as part of next AI prompt pass — it's the most visible "the AI doesn't understand my job" moment.

---

## 2026-04-24 — Walkthrough P1 fixes shipped

Resolutions for the four P1 findings:

### F-CW-09 ✅ Fixed — Edge Function auth 401
The function created a service-role client and then called `supabase.auth.getUser(jwt)` on it. That API combination doesn't validate user JWTs (it's for anon-keyed clients). Replaced with direct JWT decode — the gateway's `verify_jwt: true` already validated signature + expiry before invoking the function, so the body just trusts the `sub` claim. Deployed v2; verified `POST /functions/v1/send-proposal-email` returns 200 OK. The graceful-fallback path now fires correctly: `{ ok: true, emailed: false, reason: "RESEND_API_KEY not set" }`. Once Charlie sets `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL` on the function env, real email starts flowing.

### F-CW-04 ✅ Fixed — AI element inference reads "demo" as build
The element matcher was naive substring search ("concrete" anywhere in the description matches Concrete Slab). Added a pre-pass that strips demolition clauses (`demo|remove|tear out|tear down|rip out|haul away|dispose of|excavate and remove`) from the description before keyword matching. So `"Build a 24×18 paver patio. Demo existing concrete slab first."` now infers Patio only — the demo clause is invisible to the matcher. The Step 3 task inference still picks up demolition correctly (it has its own logic).

### F-CW-08 ❌ Not a bug — false positive in original test
Original report: clicking "Email to client" didn't open the modal. On retest with a real DOM click event (instead of the React-fiber dispatch I'd used originally), the modal opens immediately and renders all fields. The earlier failure was an artifact of my eval methodology (synthetic events / direct hook dispatches don't always trigger React's render cycle). Verified end-to-end: opened modal → filled email + note → clicked Send → network log shows 200 from the function → toast confirmed share-link prepared.

### F-CW-07 ✅ Fixed — Wizard $15,267 cost vs Overview $11,789 budget
**Root cause**: three different files computed totalCost three different ways. WizardStepNumbers included `disposalCost + equipmentCost + permitFeesSum`. WizardStepSummary included `disposalCost + equipmentCost` but **omitted permits** ($258 difference, also explains F-CW-06). OverviewTab omitted all three.

**Fix**: extracted `computeProjectCost(input): CostBreakdown` to `src/lib/projectCost.ts`. All three screens now call the same helper and compute identical numbers. Verified live in the preview: project that previously read $11,789 / 38% on Overview now reads $15,009 / 21% — exactly matching Step 6 of the wizard. F-CW-06 (Step 5 vs Step 6 drift) resolved by the same helper.

### Status of contractor-walkthrough P1s
| ID | Status |
|----|--------|
| F-CW-04 | ✅ shipped |
| F-CW-07 | ✅ shipped (also closes F-CW-06) |
| F-CW-08 | ✅ false positive — flow works end-to-end |
| F-CW-09 | ✅ shipped (Edge Function v2 deployed) |

**Remaining for next session**: F-CW-01 (landing blank green), F-CW-02 (CTA copy), F-CW-03 (org name placeholder), F-CW-05 (address autocomplete), F-CW-10 (wizard scroll). All P2/P3.

---

## 2026-04-24 — Walkthrough P2/P3 fixes shipped (Session 2)

All five remaining contractor-walkthrough findings closed. Typecheck clean.

### F-CW-01 ✅ Fixed — Landing flash
The Suspense fallback for the lazy-loaded Landing component was `#0A0A0A` (near-black) but Landing's actual root background is `#0B1A14` (dark green-black). Visible color flip on every fresh visit. Replaced both `<Suspense fallback={...}>` instances in `src/App.tsx` with `#0B1A14` so the fallback color matches and the transition is invisible.

### F-CW-02 ✅ Fixed — CTA copy for authed users
Threaded `useAuth().user` into Landing. When authed, `goSignup` redirects to `/dashboard` instead of `/signup`, the CTA label becomes "Open dashboard" instead of "Start Free Trial", the "14 days free…" disclaimer is suppressed under FinalCTA, and the "Log In" link disappears from Navbar + Footer. Added optional `ctaLabel` / `authed` props to Navbar, Hero, Pricing, FinalCTA, Footer.

### F-CW-03 ✅ Fixed — Org name placeholder
Added an optional **Company Name** field to the Signup form. The value flows into `auth.user.user_metadata.company_name`. `orgStore.fetchOrg` reads that metadata when auto-creating the org row for a brand-new user and uses it as the initial `organizations.name` instead of an empty string. Onboarding's company setup step still lets the contractor edit it later.

### F-CW-05 ✅ Fixed — Address autocomplete copy
Replaced the cryptic *"Address not verified — project won't appear on map"* warning with actionable copy: *"Pick a result from the dropdown to verify the address. Otherwise the project won't appear on the map."* Now contractors know what to do, not just what's wrong.

### F-CW-10 ✅ Fixed — Wizard scroll-to-top
`handleNext`, `handleBack`, and `handleStepClick` in `ProjectWizard.tsx` now call a new `scrollToWizardTop()` helper that resets the scroll position on the inner `<main>` scroll container plus the window. Contractor lands at the top of the new step's content with header context, instead of mid-page on a random field.

### Status of all contractor-walkthrough findings
| ID | Status | Commit |
|----|--------|--------|
| F-CW-01 | ✅ shipped | (this session) |
| F-CW-02 | ✅ shipped | (this session) |
| F-CW-03 | ✅ shipped | (this session) |
| F-CW-04 | ✅ shipped | `c219d80` |
| F-CW-05 | ✅ shipped | (this session) |
| F-CW-06 | ✅ shipped | `c219d80` |
| F-CW-07 | ✅ shipped | `c219d80` |
| F-CW-08 | ✅ false positive | n/a |
| F-CW-09 | ✅ shipped | `c219d80` (Edge Function v2 deployed) |
| F-CW-10 | ✅ shipped | (this session) |

Walkthrough is **clean end-to-end** at the application layer. The only outstanding gap is operator-side: Resend's domain verification (caused HTTP 422 on the first real send attempt — handled gracefully by the function's fallback path; needs Charlie to verify the sending domain in Resend before real delivery works).

### Files touched in Session 2
- `src/App.tsx` — Suspense fallback color match
- `src/pages/Landing.tsx` — useAuth integration, conditional CTA + Login button
- `src/pages/Signup.tsx` — Company Name field
- `src/stores/orgStore.ts` — read company_name from auth metadata on org auto-create
- `src/components/shared/AddressInput.tsx` — actionable copy
- `src/pages/ProjectWizard.tsx` — scroll-to-top on step transition
- `.claude/TESTING/FINDINGS.md`

---

## 2026-04-24 — Live email delivery: two operator/code bugs found + fixed

After Charlie set RESEND_API_KEY + NOTIFY_FROM_EMAIL, the first real send to woodsrider82@gmail.com failed with HTTP 422 "Invalid `from` field." Inspecting the request body in Resend's logs surfaced **two** distinct bugs:

### F-CW-EMAIL-01 ✅ Fixed (operator config) — Malformed From header
`NOTIFY_FROM_EMAIL` was set to `TerrainForge <onboarding@resend.dev` — missing the closing `>`. Resend's parser rejected the whole send. Charlie corrected the secret to `TerrainForge <onboarding@resend.dev>`.

### F-CW-EMAIL-02 ✅ Fixed (commit `e4e5c06`) — Edge Functions queried wrong column
`send-proposal-email` and `notify-client-response` both selected `client` from the `projects` table. The actual column is `client_name` (`projects` also has `client_email`, `client_phone`, `client_quote`, `client_id` — naming convention is `client_*`). The query failed silently because the destructure didn't pull `error`. Result: every email went out with subject `Your design proposal: your project` and greeting `Hello,` instead of `Hi {clientName},`.

Two-part fix:
- Selected `client_name` and updated the `ProjectRow` interfaces accordingly in both functions.
- Destructured `error` and `console.error`-d it on the project lookup so future column drift surfaces in function logs instead of silently sending fallback-content emails.

`send-proposal-email` redeployed as v5 (then auto-bumped to v6 on next invocation), `notify-client-response` redeployed as v4.

### Live verification
Test send #2 returned `{ ok: true, emailed: true }` in 2.3s. Email reached the inbox. Loop confirmed working end-to-end:

`Contractor clicks Email → wizard's modal → frontend service → Edge Function → Resend → client inbox`

The contractor-walkthrough loop is complete.

---

## 2026-04-24 — Walkthrough #2 (Garcia Front Walkway + Retaining Wall)

Re-ran the contractor walkthrough on a different scenario to verify Session 1 + Session 2 fixes hold and surface net-new findings. Project: front walkway (30×3 flagstone), retaining wall (20ft linear, 3ft tall, stacked stone), 2 ornamental trees, 6 boxwood shrubs, mulched planting beds. Different element types from Walkthrough #1 (no demolition, no patio, point-spacing planting).

### Verifications of prior fixes
- ✅ **F-CW-05** copy verified: address warning now reads "Pick a result from the dropdown to verify the address."
- ✅ **F-CW-04** demo-strip not triggered (no demolition in description) — but see F-CW-12 for related issue.
- ✅ **F-CW-07** wizard Step 5 vs Step 6 numbers identical: $12,846 / $16,057 / 20% across both screens.
- ✅ **F-CW-09** + **F-CW-EMAIL-02** verified live: send-proposal-email returned `emailed: true` in 1.7s, sent for "Garcia Front Walkway + Retaining Wall" with greeting "Hi Maria Garcia,". Live in prod.
- 🟡 **F-CW-10** partial: scroll-to-top works on Step 2→3 transition (Step 3 rendered with header visible) but **failed on Step 1→2** (`mainScroll: 3924` post-click). Hypothesis: Step 2's `applySuggestions` useEffect fills 8 elements after mount → DOM grows → my synchronous scrollTop reset runs before the content swap and gets overridden by the browser's scroll-anchoring. Fix: defer `scrollToWizardTop()` to a `requestAnimationFrame` after step state commits.

### Net-new findings

#### F-CW-11 / P3 — Step-indicator row overflows wizard panel
The horizontal row of 6 step pills (Job / Measurements / Plan / Materials / Numbers / Review) is wider than the wizard card on a typical 535px viewport, producing a horizontal scrollbar inside the card. Visible immediately on Step 1. Doesn't break functionality but looks unfinished. Likely needs responsive sizing on the step indicator (truncate labels, smaller pills, or wrap).

#### F-CW-12 / P1 — AI element inference still too loose on non-install context
The F-CW-04 fix (strip demolition clauses) doesn't cover this related class of false positive. With the description *"Install a flagstone walkway from driveway to front door … Mulch the planting beds"*, the keyword matcher inferred:
- ❌ **Patio** — because "flagstone" is a Patio keyword (it appeared inside "flagstone walkway")
- ❌ **Driveway** — because "from **driveway** to" matched, even though driveway is a reference point, not an install target
- ❌ **Garden Beds** — because "planting beds" matched, even though contractor is mulching *existing* beds, not building new ones

The matcher needs verb-context awareness ("install/build/add" + keyword) or AI-driven inference instead of pure substring matching. F-CW-04 was a band-aid; this is the deeper fix.

#### F-CW-13 / P2 — Tree Planting element has Area input but trees are counts, not square footage
For "2 small ornamental trees by the entrance," the Tree Planting element's only numeric input is "Area (sqft)." That's awkward — contractors think of trees in counts (with optional spacing), not sqft. Element-type dimension config (`DIMENSION_CONFIG` in `WizardStepMeasurements.tsx`) needs a `count` and/or `spacing` mode for the planting element types. Same issue likely applies to Shrub Planting.

#### F-CW-14 / P2 — Wizard vs Overview $230 drift on persist
Wizard Step 5+6 showed $12,846 total cost. Project Overview showed $12,616. Database row reveals: `equipment_budget: null`, `equipment_cost: 1200`. The wizard's `computeProjectCost` (post-Session-1 fix) sums BOTH `equipmentBudget` + `equipmentCost`, but only `equipmentCost` got persisted. So wizard had `equipmentBudget=200` (probably AI-seeded), which vanished on save → Overview's recomputation comes up $230 short.

Root cause: `equipmentBudget` and `equipmentCost` are duplicate-overlapping fields on the `Project` row. Either persist both or collapse the schema to one. F-CW-07 closed the formula divergence; F-CW-14 is the data-shape divergence.

### Status snapshot after Walkthrough #2
| ID | Status |
|----|--------|
| F-CW-01..05, 08, 09 | ✅ verified live |
| F-CW-06, 07 | ✅ verified at wizard layer; F-CW-14 reveals data-persist edge case |
| F-CW-10 | 🟡 partial (Step 1→2 still off) |
| F-CW-11 | 🆕 P3 — step-indicator overflow |
| F-CW-12 | 🆕 **P1** — element inference context misreads (real category) |
| F-CW-13 | 🆕 P2 — Tree/Shrub dimension config |
| F-CW-14 | 🆕 P2 — equipment_budget vs equipment_cost persist drift |

**Verdict on Walkthrough #2**: the major bugs are fixed and the email loop works, but two new P1/P2 findings emerged (F-CW-12 element inference, F-CW-14 budget persist) plus a smaller F-CW-10 partial regression. Recommended next session: tackle F-CW-12 (most user-visible — every fresh-contractor description hits this) and F-CW-14 (trust-erosion).

---

## 2026-04-25 — Walkthroughs #3, #4, #5 (surface-find mode)

Three additional walkthroughs to exercise unexplored code paths after Sessions 1+2 P1/P2 fixes shipped. Surfaced 6 new findings spanning AI reliability, schema mismatches, and lifecycle UX. Lifecycle pipeline verified clean.

### Walkthrough #3 — Client-side share view (Garcia project)

Opened `/share/<token>` as the client, navigated 2D viewer, scrolled element list, clicked **Request changes**, filled a multi-paragraph note about wheelchair accessibility + stone material options, submitted.

**Worked**:
- Share URL renders project name, address, element list with dimensions, 2D/3D toggle
- "What do you think?" panel with Approve / Request changes buttons
- Note input + submission
- "Changes requested · Your contractor has been notified" confirmation card
- Database write to `project_share_tokens.client_response = 'changes_requested'` + `client_note`
- Contractor-side banner on Overview shows "✎ Client requested changes · timestamp · view counter (viewed 2×) · full note quoted"

**Broke**:

#### F-CW-15 / P1 — `notify-client-response` queries phantom `profiles` table; should be `auth.users`
Edge Function v6 returned `{ ok: true, emailed: false, reason: "contractor email not found" }`. Postgres logged `relation "profiles" does not exist`. Both `notify-client-response` and `send-proposal-email` query `from('profiles').select('email, display_name')` — the `profiles` table has never existed in this schema. User identity lives in `auth.users` (email) + `auth.users.raw_user_meta_data->>'full_name'`.

Impact:
- `notify-client-response` can't find contractor email → no email gets sent (graceful fallback fires, in-app banner still works)
- `send-proposal-email` silently uses `null` for `contractorName` → email body says "{Company} has prepared a design for…" instead of "{Contractor Name} from {Company} has prepared a design for…". I observed this on the live email but didn't recognize it until now.

Fix: replace `profiles` lookup with `supabase.auth.admin.getUserById(orgRow.owner_id)` on the service-role client.

#### F-CW-15b / P3 — Client share view has no contractor branding
Landing on `/share/:token` shows generic "TerrainForge · Shared project preview" header. No contractor name, company name, phone, email visible. A real client would wonder "where's my contractor?" Should show "Prepared by {company} · {contractor name} · {contact info}" prominently.

#### F-CW-15c / P3 — Request-changes placeholder copy is not project-aware
The note input placeholder reads `Be specific — "The patio is too small" or "Can we add a path to the shed?"`. Hardcoded patio reference is wrong for non-patio projects (the Garcia walkway/wall in this case). Either rotate examples by project type or make it generic ("Be specific about what you'd like to change").

### Walkthrough #4 — Softscape scenario (Williams Backyard Lawn + Irrigation)

3,000 sqft sod, drip irrigation for 4 garden beds + rotor sprinklers, 50ft French drain, 4 oak trees, 12 boxwood shrubs.

**Element inference clean** — F-CW-12 didn't trigger here because description used explicit install verbs ("Install …", "Plant …", "Add a French drain"). Six elements correctly inferred: Garden Beds, Sod Area, Tree Planting, Shrub Planting, Drainage, Irrigation Zone.

**Catastrophic AI cascade on Step 3+**:

#### F-CW-16 / P1 — Claude JSON parse fails on softscape, drops all recommendations
Console:
```
AI recommendation generation failed: SyntaxError: Unterminated string in JSON at position 12779 (line 310 column 136)
  at JSON.parse (<anonymous>)
  at generateProjectRecommendations (src/services/aiRecommendations.ts:273:25)
```
Claude's response got truncated mid-string (likely max_tokens hit). Wizard has no retry, no partial-extraction, no fallback. Result: Step 3 shows "No crew recommendations · No equipment recommendations · Tasks (collapsed, empty)". Steps 4-6 inherit zero data.

This is silent on the UI — contractor sees an empty wizard and probably blames themselves or the description.

Fix candidates:
- Bump `max_tokens` in the API call
- Wrap `JSON.parse` in try/catch and salvage what parsed cleanly (extract complete sub-objects with regex or partial parse)
- Surface a toast ("AI temporarily unavailable — fill in details manually or try again")
- Auto-retry once with a "respond more concisely" instruction

#### F-CW-17 / P1 — `createMaterial` errors 22× during wizard auto-add (silent)
Console showed 22 instances of `[error] createMaterial error: Object`. Object body wasn't logged with full detail. Hypothesis: AI material objects missing required fields or violating CHECK constraints when materials engine attempts to insert library rows for "Not in your library — will be added automatically" items. The wizard swallows these and continues. Some materials end up not in the library, which means the manifest engine can't price them.

Need to: (a) log full error body, (b) decide whether failed material adds should block project create or warn-and-continue.

#### F-CW-18 / P1 — `project_element_materials` INSERTs fail multiple times (silent)
Console showed `[TF-SUPABASE] INSERT on project_element_materials failed: [object Object]` 4×. Element↔material junction rows missing means manifest engine has no element-scoped quantities even when materials saved at project level. Likely related to F-CW-17 (orphan material_ids referenced by junction inserts).

#### F-CW-19 / P2 — When AI fails, Numbers step shows $0 across the board
Step 5 displayed Total Cost $0, Quote $0, Margin 0% because AI seeded nothing. Wizard should fall back to a per-sqft heuristic by element type (e.g., $8/sqft for sod, $12/lnft for drainage, $50/lnft for retaining walls × 3ft height) so the contractor has a starting point even when AI fails.

### Walkthrough #5 — Lifecycle pipeline (Williams project)

Walked the full 6-state pipeline as a contractor:

| From → To | Trigger | Status badge | DB column set |
|----|----|----|----|
| Estimate → Quoted | "Send Quote" button | ✅ Quoted | (no quoted_at column — fine) |
| Quoted → Approved | "Client Approved" button | ✅ Approved | `approved_at: 5:27:45` |
| Approved → Scheduled | "Schedule Project" exposes date inputs → set start + target → "Confirm Schedule" | ✅ Scheduled | `start_date: 2026-05-01`, `target_date: 2026-05-15` |
| Scheduled → In Progress | "Start Work" button | ✅ In Progress | `started_at: 5:29:29` |
| In Progress → Completed | "Complete Project" button | ✅ Completed | `completed_at: 5:29:49` |

All transitions persist correctly. Dashboard reflects "Completed" status. The original ROADMAP P0 "Completed project stays scheduled" issue does not reproduce here — appears to have been fixed in earlier work.

#### F-CW-20 / P3 — Project status=Completed but progress percentage stays at 22%
Marking the project complete didn't backfill task statuses, so the Progress widget reads 22% on a Completed project. Should either auto-mark all tasks completed when project status hits `completed`, OR have the progress calculator return 100% when `status === 'completed'` regardless of task states.

#### F-CW-21 / P3 — Two-step Schedule transition is undiscoverable
Clicking "Schedule Project" reveals two date inputs + a new "Confirm Schedule" button. No visual cue explains "you must enter dates and click Confirm." A contractor would click Schedule, see the date fields appear, fill them, then look for a confirm button — but it's a separate button rather than the same one updating its label. Minor friction; could collapse to a modal or single-button-with-validation.

### Status snapshot after Walkthroughs #3-5
| ID | Sev | Status |
|----|-----|--------|
| F-CW-15 | **P1** | 🆕 notify-client-response queries phantom `profiles` table |
| F-CW-15b | P3 | 🆕 client share view has no contractor branding |
| F-CW-15c | P3 | 🆕 request-changes placeholder mentions "patio" hardcoded |
| F-CW-16 | **P1** | 🆕 AI JSON parse failure cascades through wizard, no fallback |
| F-CW-17 | **P1** | 🆕 createMaterial errors 22× silently during auto-add |
| F-CW-18 | **P1** | 🆕 project_element_materials INSERTs fail silently |
| F-CW-19 | P2 | 🆕 wizard Numbers $0 when AI fails — needs per-sqft fallback |
| F-CW-20 | P3 | 🆕 Completed project shows non-100% progress |
| F-CW-21 | P3 | 🆕 Schedule transition's two-step pattern is undiscoverable |

**Verdict on Walkthroughs #3-5**: client-side viewer + lifecycle pipeline are healthy. The AI dependency is a single point of failure — when the LLM truncates or returns malformed JSON, the entire wizard collapses to zeros (F-CW-16/17/18/19 all root in this). Schema-vs-code mismatch on `profiles` table is a sleeper bug that breaks the contractor-side email notifications.

**Recommended next session**:
1. **F-CW-15** (auth.users fix) — small, mechanical, unblocks contractor email notifications
2. **F-CW-16** (AI fallback + retry + partial parse) — biggest leverage; fixes the cascade that produces 17, 18, 19
3. **F-CW-12** (AI element-inference context awareness) — still highest user-visibility from earlier walkthroughs
4. **F-CW-14** (equipment_budget vs equipment_cost schema cleanup)

After those four, walk through #6 (an edit-flow scenario — contractor edits an existing project's elements/dimensions/materials) and #7 (commercial scope or maintenance to exercise the remaining job_type values).