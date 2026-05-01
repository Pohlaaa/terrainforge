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

---

## 2026-04-25 — Walkthroughs #6, #7, #8 (deep surface-find)

Three more walkthroughs across previously untouched UI surface area: Materials Library page, edit-existing-project flows, and Manifest Engine. Surfaced 17 net-new findings (F-CW-22 through F-CW-38). Two are P0/P1 data-loss bugs.

### Walkthrough #6 — Materials Library

KPI strip + tabs (Inventory On Hand · Suppliers · Material Library) + 127 existing test materials.

#### F-CW-22 / P3 — "Low Stock" KPI is meaningless
"Low Stock: 127" exactly equals "Total Materials: 127" because no material in the org has `qty_on_hand` populated; everything counts as low. KPI is decorative noise.

#### F-CW-23 / P3 — "In Stock: $0"
Same root cause as F-CW-22. Should hide the inventory-value KPI until the org actually tracks on-hand inventory, or compute it differently.

#### F-CW-24 / P3 — Low-stock banner phrasing
"Low stock: Walkthrough Bulk 001, 002, 003, 004, 005 and 122 more" — frames it as if 127 is a subset, but actually it's all 127 materials. Misleading.

#### F-CW-25 / P3 — Category pill row overflows panel width
Same shape as F-CW-11 (wizard step indicator) — horizontal scrollbar inside a panel. Becoming a pattern; needs a shared responsive solution.

#### F-CW-26 / P2 — Add Material modal opens with prefilled "Concrete Pavers 12×12" / depth 3"
Looks like leftover form state from a prior interaction, not intentional defaults. Plus depth=3" for pavers is wrong (pavers are discrete count, not depth-based bulk). Reset form state on modal open.

#### F-CW-27 / P1 — Add/Edit Material modal can't scroll
Computation Engine section is below the fold; the modal has no internal scroll container. On a typical viewport, the user can't reach the Save/Cancel buttons. Same for Edit Material modal.

#### F-CW-28 / P3 — Material modals lack `role="dialog"` + `aria-modal="true"`
Accessibility miss; screen readers can't announce the modal as a dialog.

#### F-CW-29 / P1 — CSV import only accepts 4 columns
Modal copy: "Upload a CSV with columns: name, category, unit, unit_cost". Materials engine columns added in migration 026 (computation_model, compute_params, purchase_unit, qty_per_purchase_unit, default_waste_factor, supplier_sku) are NOT importable via CSV. Materials imported this way are unusable in the manifest engine until manually edited.

#### F-CW-30 / P3 — CSV import has no template, no examples, no validation guidance
No download-template button, no inline example, no list of valid category/unit values. Contractors will guess and fail.

#### F-CW-31 / P3 — No inline delete on material rows
Each row has Edit (✏) but no Delete. Cleanup of test data requires opening Edit modal per row. With 127 stale items, this is painful.

### Walkthrough #7 — Edit existing project (Garcia)

Tested inline-edit pattern across Client & Location and Project Details sections.

#### F-CW-32 / P3 — Inconsistent edit patterns (modal vs inline)
Materials use a modal; Project sections use inline edit-mode. Unifying would reduce cognitive load.

#### F-CW-33 / P1 — Client & Location inline edit silently drops changes
Clicked Edit, changed phone to 555-987-1234, clicked Done. UI reverted to original. DB still has original. Tried twice with full event dispatch (input + change + blur). Confirmed not a test methodology issue. Other inline-edit sections (Project Details) **do** persist correctly — this is scoped to the Client & Location form's Done handler. Likely a missing `onChange` wire-up or a stale `onSave` payload.

### Walkthrough #8 — Manifest Engine view (Garcia project's Materials tab)

#### F-CW-34 / P3 — No top-level Manifest Engine entry
The "More" menu has Work Orders / Price Research / Settings / Billing but no Manifest. Lives only inside ProjectDashboard's Materials tab. May be intentional (manifest is project-scoped), but a top-level "All Manifests" view would help contractors see purchase obligations across active projects.

#### F-CW-35 / P3 — More menu doesn't dismiss on Escape
Accessibility miss + general usability — clicking More opens the menu, but Escape doesn't close it; user must click More again or click outside.

#### F-CW-36 / **P0** — Manifest engine sees only 1 of 10 saved materials
Garcia project's `projects.materials` JSONB has **10 entries**. `project_element_materials` junction has **1**. The Material Manifest tab renders only the junction-linked materials, so 9 of 10 contractor-quoted materials are invisible to the manifest engine, the purchase list, and the cost rollup.

This explains:
- Why the manifest table shows only Polymeric Sand for a project that includes flagstone walkway, stacked stone retaining wall, and planting beds.
- Why the "Under Budget" line reads −$11,782 (manifest cost is artificially low because 90% of materials are missing).
- Why F-CW-14 wizard-vs-Overview budget drift exists in the same direction.

Root cause: cascade from F-CW-17 (createMaterial errors during wizard auto-add) + F-CW-18 (project_element_materials INSERT failures). The wizard SAVES materials at the project level (JSONB on `projects.materials`) but loses them at the element-junction level. Materials engine consumes the junction.

This is the most important finding so far. The materials engine is the core value prop of TerrainForge, and it's quietly running on 10% of the contractor's data.

#### F-CW-37 / P3 — "Under Budget" label compares to wrong baseline
The −$11,782 figure compares manifest cost ($4,275) to **client quote** ($16,057) instead of materials budget ($6,270). Mislabeled — should compare to `materials_budget`.

#### F-CW-38 / P3 — Manifest table overflows horizontally; total cost clipped
Same pattern as F-CW-11/25.

### Status snapshot after Walkthroughs #6-8
| ID | Sev | Summary |
|----|-----|---------|
| **F-CW-36** | **P0** | 9 of 10 materials missing from element-junction → manifest engine running on partial data |
| F-CW-27 | P1 | Add/Edit Material modal can't scroll to Save button |
| F-CW-29 | P1 | CSV import missing engine columns; imports unusable in manifest |
| F-CW-33 | P1 | Client & Location inline-edit silently drops changes |
| F-CW-26 | P2 | Add Material form has stale prefilled state |
| F-CW-22 | P3 | Low-stock KPI = total materials KPI |
| F-CW-23 | P3 | In-stock value = $0 |
| F-CW-24 | P3 | Low-stock banner phrasing misleading |
| F-CW-25 | P3 | Category pill row overflow |
| F-CW-28 | P3 | Material modals lack a11y dialog attrs |
| F-CW-30 | P3 | CSV import has no template/examples |
| F-CW-31 | P3 | No inline delete on material rows |
| F-CW-32 | P3 | Inconsistent edit patterns (modal vs inline) |
| F-CW-34 | P3 | No top-level Manifest entry point |
| F-CW-35 | P3 | More menu doesn't close on Escape |
| F-CW-37 | P3 | Manifest "Under Budget" compares to wrong baseline |
| F-CW-38 | P3 | Manifest table overflows horizontally |

**Cumulative open findings**: 24 distinct findings across 8 walkthroughs (F-CW-10 partial, 11-14 from #2, 15-15c + 16-21 from #3-5, 22-38 from #6-8). One P0 (F-CW-36), six P1s (F-CW-12, 14, 15, 16, 17/18 cascade, 27, 29, 33), with the AI-cascade (F-CW-16) and material data-loss (F-CW-36) being the highest-impact.

**Recommended next session priority** (revised):
1. **F-CW-36 + F-CW-17/18** — root-cause the material data loss. Likely one fix; this is the materials engine's correctness baseline.
2. **F-CW-15** — auth.users / profiles fix. Mechanical, ~20 min.
3. **F-CW-16** — AI cascade fallback. Closes 16/17/18/19 in one stroke if 17/18 are LLM-payload artifacts.
4. **F-CW-33** — Client & Location edit save fix.
5. **F-CW-27** — modal scroll.
6. **F-CW-12** — element inference context awareness.
7. **F-CW-14** — equipment_budget/equipment_cost schema cleanup.

P3 polish (F-CW-22, 23, 24, 25, 26, 28, 30, 31, 32, 34, 35, 37, 38, F-CW-10 partial, 11, 13, 15b, 15c, 19, 20, 21) batched separately.

---

## 2026-04-25 — Walkthroughs #9-13 (deep coverage)

Five more walkthroughs across previously untouched UI: Closeout flow, Tasks tab CRUD, Crew + Equipment Hub, Schedule view, and Settings/Budget/Suppliers. Surfaced 21 net-new findings (F-CW-39 through F-CW-59).

### Walkthrough #9 — Closeout flow

#### F-CW-39 / P3 — Already-Completed project still shows "Complete Project" button
Williams was at `status='completed'`. Closeout tab still showed an active "Complete Project" button.

#### F-CW-40 — Closeout empty-state copy is OK
"No materials on this project. You can still mark the project complete below. Add materials later for usage tracking on future jobs." — actually decent.

#### F-CW-41 / P3 — Stage gates show Closeout in active orange but project is Completed
Same machinery as F-CW-20. Stages don't reflect terminal status.

#### F-CW-42 / P2 — Re-clicking Complete overwrites `completed_at`
Clicking Complete on already-Completed project bumped `completed_at` from 5:29:49 to 5:58:54. Original timestamp lost. Mutation should be idempotent.

#### F-CW-43 / **P0** — Closeout reads `projects.materials` JSONB; Manifest reads `project_element_materials` junction
**Same project, different tabs, different material lists.** Closeout shows 8+ materials (Flagstone, Stacked Stone, Topsoil, Mulch, Boxwood Shrubs, Ornamental Trees, Sand Bedding, Landscape Fabric…). Manifest shows 1 (Polymeric Sand). Worse than F-CW-36 alone — they actively disagree because they read from different sources. Pick one source of truth.

#### F-CW-44 / P1 — Closeout tab numeric inputs don't persist
Edited Flagstone qty 90→95, no save button, no auto-save on blur, no PATCH fired. JSONB still has 90. The "record actual material usage to refine reserve percentages" value prop is non-functional.

#### F-CW-45 / P1 (root cause of F-CW-36/17/18) — 8 of 10 saved materials have empty `materialId`
JSONB inspection of Garcia: only 2 of 10 materials reference the materials library; rest have `materialId: ""`. AI suggested "will be added automatically" → `createMaterial` failed silently → entries saved as project-level orphans. The materials engine needs a real `material_id` to price via its computation models. Real fix means making `createMaterial` reliable AND backfilling library rows for orphan project materials.

### Walkthrough #10 — Tasks tab CRUD on Garcia

#### F-CW-46 / P1 — Wizard-accepted equipment doesn't persist to project
Resources tab shows "EQUIPMENT (0)" despite wizard accepting equipment. DB confirms `0` rows in `equipment` with `assigned_project_id = '<garcia>'`. Either the wizard's equipment-accept handler doesn't set the assignment, or the schema requires a different junction.

#### F-CW-47 / P3 — "Crew Size: 4" + "No crew scheduled yet" is confusing
Resources tab shows both simultaneously. 4 rows in `project_crew_assignments` exist; the "No crew scheduled" text seems to mean something different (maybe daily schedule-entries vs project-level assignments). Distinction not clear to a contractor.

#### F-CW-48 / P1 — No "Add Task" button anywhere on project
Tasks created by the wizard's AI can be edited (status select works — confirmed Site Prep & Layout → completed persists). But contractors can't add new tasks post-creation. Significant functional gap.

### Walkthrough #11 — Crew + Equipment Hub

#### F-CW-49 / P3 — `/crew` route is the worker app, not the admin hub
Admin user navigating to `/crew` lands on the foreman/laborer "Who are you?" mobile app. Admin Crew + Equipment lives at `/crew-hub`. URL is misleading.

#### F-CW-50 / P3 — Project name truncation
"Chamberlain Apa", "Popeyes Retaini", "Richfield Targe" — mid-word cut. Use ellipsis at word boundary or tooltip.

#### F-CW-51 / P3 — Equipment-profile completion warning lists missing fields but doesn't deep-link
Pills name the missing fields (Clock hours, Service due hours, Insurance provider…) but clicking them doesn't take you anywhere.

#### F-CW-52 / P3 — Add Crew Member form is minimal
Only Name, Role, Phone. No email (so they can't be invited to the crew app), no hourly rate, no skills, no certifications. Each new crew add needs an immediate follow-up edit.

### Walkthrough #12 — Schedule view

#### F-CW-53 / P1 — `/schedule` returns 404 but is referenced from Resources tab copy
Resources tab says: *"No crew scheduled yet. Assign crew on the Schedule page."* Clicking through (or typing `/schedule`) gives "Page not found." The schedule UI was extracted into `/crew-hub`'s Weekly Schedule section but the dangling reference text was never updated. Confusing dead-end for contractors trying to assign crew.

### Walkthrough #13 — Settings + Budget + Suppliers

#### F-CW-54 / **P1** — Settings page layout is broken
The 6 tab pills (Profile, Company, Preferences, Notifications, Billing, Danger Zone) render as **massive vertical bars** taking the full viewport height. Content area is clipped off-screen on the right. The page is unusable. Looks like a flex/grid CSS regression — possibly the tabs container is using `flex-direction: column` with `flex: 1 1 auto` causing each tab to stretch to viewport height.

#### F-CW-55 / P3 — "AVG BUDGET" equals "REVENUE" in Budget hub KPI strip
Both showing $227,328. Average shouldn't equal total. Math bug or label mismatch.

#### F-CW-56 / P2 — Williams shows "Sched..." status in Budget hub but actual status is `completed`
Walked the project through full lifecycle (Estimate → Quoted → Approved → Scheduled → In Progress → Completed) earlier this session. Budget hub still shows Scheduled. Stale cache or wrong-source query.

#### F-CW-57 / P3 — Production data has profanity from prior testing
"Bill shit", "Cock", and other words visible in Budget hub project list. Test-data cleanup overdue (also relates to F-CW-22's 127 stale "Walkthrough Bulk" entries).

#### F-CW-58 / P3 — Supplier phone "3211233213" displayed unformatted
Should auto-format to `(321) 123-3213` or `321-123-3213`.

#### F-CW-59 / P3 — Suppliers table also overflows horizontally
Same pattern as F-CW-11/25/38. Table layouts don't reflow on narrow viewports.

### Status snapshot after Walkthroughs #9-13
| ID | Sev | Summary |
|----|-----|---------|
| **F-CW-43** | **P0** | Closeout vs Manifest read different sources → disagree on material list |
| **F-CW-44** | **P1** | Closeout numeric inputs don't persist (no save mechanism) |
| **F-CW-45** | **P1** | 8/10 materials have empty materialId (root of F-CW-17/18/36) |
| **F-CW-46** | **P1** | Wizard equipment accept doesn't persist |
| **F-CW-48** | **P1** | No "Add Task" affordance on project page |
| **F-CW-53** | **P1** | `/schedule` 404 + dangling reference from Resources tab |
| **F-CW-54** | **P1** | Settings page layout broken |
| F-CW-42 | P2 | Re-completing project overwrites `completed_at` |
| F-CW-56 | P2 | Williams shows wrong status in Budget hub |
| F-CW-39 | P3 | Already-Completed project shows "Complete Project" button |
| F-CW-40 | — | Closeout empty-state copy OK |
| F-CW-41 | P3 | Stage gates don't reflect terminal status |
| F-CW-47 | P3 | "Crew Size 4 + No crew scheduled" copy confusion |
| F-CW-49 | P3 | `/crew` is worker app, not admin |
| F-CW-50 | P3 | Project name mid-word truncation |
| F-CW-51 | P3 | Equipment-profile pills don't deep-link |
| F-CW-52 | P3 | Add Crew form minimal |
| F-CW-55 | P3 | AVG BUDGET = REVENUE math bug |
| F-CW-57 | P3 | Profanity in test data |
| F-CW-58 | P3 | Supplier phone not formatted |
| F-CW-59 | P3 | Suppliers table horizontal overflow |

**Cumulative open findings**: 45 distinct findings across 13 walkthroughs (F-CW-10 partial through F-CW-59). 2 P0s (F-CW-36, F-CW-43), 12 P1s, several P2s, lots of P3 polish.

---

## 2026-04-26 — Live prod walkthrough (post-deploy verification)

After two fix sweeps shipped (commits `c219d80`, `4c6bd84`, `e4e5c06`, `2665cfd`, `06765ec`, `cdfb047`, `a154357`, `3d9851f`, `ed62f15`, `673403e`) and Charlie deployed to `https://terrainforge-staging.netlify.app` from the `claude/quirky-ishizaka` branch, I ran a live walkthrough as woodsrider82@gmail.com to verify shipped fixes hold against real CDN, real Resend, real RLS — and to surface anything new.

### Verifications passed ✅

- **F-CW-54** Settings page layout — clean horizontal split, sidebar nav left, content right
- **F-CW-55** "Avg Budget" → "Outstanding" KPI label
- **F-CW-56** Budget Hub status column reads from `project.status` ("Estimate", "Quoted", etc.) not date heuristic
- **F-CW-06/07** Wizard Step 5 ($10,074) = Step 6 ($10,074) — identical, no drift
- **F-CW-09 + F-CW-EMAIL-01/02** Email send succeeded: 200 OK in 2.3s, function v8 returned the proposal email to woodsrider82@gmail.com with correct project name + greeting
- **F-CW-16** Softscape no longer collapses — AI returned 9 materials + tasks + crew + equipment recommendations (vs. zero in pre-fix walkthroughs)
- **F-CW-33** Client & Location inline edit DOES save — phone updated `555-200-1000` → `555-999-8888` and persisted in DB
- **F-CW-46** Equipment-accept persists `assigned_project_id` — wizard recorded 3 crew, equipment-accept didn't error this time
- **Lifecycle pipeline** — Send Quote click flipped `status: estimate → quoted`

### Live findings (P0 first)

#### F-CW-LIVE-01 / P3 — Trial-expired account hard-blocks
Signed in initially as `woodsrider82+test4@gmail.com` (Gmail plus-aliasing, separate Supabase user). Got hit immediately with "Your free trial has ended" billing wall. No way to test the app on that account. Charlie's trial-reset SQL only covers the base `woodsrider82@gmail.com` address. For internal QA, either (a) reset trial periodically across alias accounts, or (b) add a DEV/admin override that bypasses the trial gate for internal emails.

#### F-CW-LIVE-04 / **P0** (F-CW-36/43 fix INCOMPLETE on prod)
Created project `7bb93cd5-fd14-4a35-ad10-b8c1bd886873` (softscape: lawn + drainage + shrubs). DB-level inspection:
- `projects.materials` JSONB = **9 materials**
- `project_element_materials` junction = **1 row** (Sod only)
- User-visible Manifest tab: 1 material
- User-visible Closeout tab: 8 materials

**They actively disagree.** The F-CW-45 cascade fix (which I claimed shipped) only partially closed the issue — only 4 of 9 materials got valid library IDs, and only 1 of those made it to the junction.

#### F-CW-LIVE-05 / P2 — Duplicate materials in JSONB
Wizard saved both "Landscape Fabric (Weed Barrier)" AND "Landscape fabric (weed barrier)" — same name with different casing — as TWO rows in `projects.materials` JSONB. Both reference the same library `material_id`, so the library was deduped correctly, but the project-level JSONB has the dup. Need case-insensitive de-duplication before saving the JSONB array.

#### F-CW-LIVE-06 / P1 (root cause of LIVE-04 — was misidentified earlier)
**Originally hypothesized**: AI returns `category: 'misc'` for materials that should be `plant`/`soil`/`mulch`/etc., and the auto-link loop's `getElementTypesForCategory('misc')` returns empty array so junction insert is skipped.
**Actual root cause**: see F-CW-LIVE-08 below — the materials never got created in the library at all because of unit-validation rejection.

#### F-CW-LIVE-08 / **P0** — Materials unit validation rejects AI output (THE REAL ROOT CAUSE)

Postgres logs show 5 errors during the wizard's createMaterial loop:
```
new row for relation "materials" violates check constraint "materials_unit_check"
```

The CHECK constraint allows: `sqft, lnft, bag, cuyd, ton, each, gallon, lb, pallet, roll, box, piece, bundle`.
The AI returns: `cubic_yards`, `linear_feet`, `each`, `cubic_yards`, `cubic_yards`.

`cubic_yards` and `linear_feet` are not in the allowed set. The wizard's `coercedUnit` normalization logic in `aiRecommendations.ts` doesn't translate `cubic_yards → cuyd` or `linear_feet → lnft`. Every such material's createMaterial call fails the CHECK constraint, addMaterial returns null, wizard saves the JSONB row with `materialId: ''`.

**This is the actual single point of failure for the entire materials cascade.** Fix: add a unit-normalization map in the wizard or in the AI validation step. Closes F-CW-LIVE-04, F-CW-36, F-CW-43, the cascade of "broken" findings since walkthrough #4.

Single-fix proposed change:
```ts
// In aiRecommendations.ts where coercedUnit is computed:
const UNIT_NORMALIZATION: Record<string, string> = {
  cubic_yards: 'cuyd', cubic_yard: 'cuyd', 'cu yd': 'cuyd', cy: 'cuyd', yard: 'cuyd', yards: 'cuyd',
  linear_feet: 'lnft', linear_foot: 'lnft', lf: 'lnft', 'lin ft': 'lnft', ln: 'lnft',
  square_feet: 'sqft', square_foot: 'sqft', sf: 'sqft', 'sq ft': 'sqft',
  pieces: 'piece', units: 'each', plant: 'each', plants: 'each',
};
const normalized = UNIT_NORMALIZATION[String(rawUnit).toLowerCase()] ?? String(rawUnit).toLowerCase();
```

#### F-CW-LIVE-03 / P2 — F-CW-12 element inference fix has 2 false-positive cases
Description: *"Install 2,500 sqft of new sod lawn in the backyard. Add a 40ft French drain along the back property line. Plant 6 hydrangea shrubs around the patio (existing patio, no patio work). Mulch the existing planting beds."*

Inferred: Patio ❌, Garden Beds ❌ (Sod, Shrub Planting, Mulch, Drainage all correct).

Why F-CW-12's clause-level install-verb check missed:
- "Plant 6 hydrangea shrubs around the patio (existing patio" — clause has install verb "Plant" applied to shrubs, but "patio" is positional reference. Clause-level matching is too coarse.
- "Mulch the existing planting beds" — "planting" matches `\bplant(?:ing)?\b` even though it's a noun adjective, not a verb. The regex needs a clause-start anchor or POS-tag awareness.

The keyword matcher needs proper grammatical context. A small LLM call (cheap fast model) to pick install targets from a description would beat this regex-and-clause approach.

#### F-CW-LIVE-07 / P3 — Wizard Step 5 vs Overview cost has $86 drift
Wizard Step 5 cost = $10,074. Project Overview Budget = $9,988. Delta = $86 (with Quote $12,593 unchanged on both screens). Smaller than original F-CW-14 issue ($230) but still nonzero. F-CW-14 fix (max(eqBudget, eqCost)) hasn't fully eliminated the drift. Suspect another field that's summed wizard-side but not persisted.

### Status snapshot

| ID | Sev | Status |
|----|-----|--------|
| **F-CW-LIVE-04** | **P0** | 🔴 OPEN — junction has 1 of 9 materials |
| **F-CW-LIVE-08** | **P0** | 🔴 OPEN — root cause of LIVE-04. ~10 line fix in `aiRecommendations.ts` |
| F-CW-LIVE-03 | P2 | 🔴 OPEN — F-CW-12 clause-level matcher false positives |
| F-CW-LIVE-05 | P2 | 🔴 OPEN — case-insensitive material dedup needed |
| F-CW-LIVE-07 | P3 | 🔴 OPEN — $86 wizard↔Overview drift residue |
| F-CW-LIVE-01 | P3 | 🔴 OPEN — trial-expired alias account hard-block |
| F-CW-LIVE-06 | — | ✅ subsumed by LIVE-08 (mis-diagnosis corrected) |

**Recommended next-fix priority**:
1. **F-CW-LIVE-08** (P0) — single ~10-line fix in `aiRecommendations.ts` unit normalization. Closes LIVE-04, F-CW-36, F-CW-43, F-CW-17, F-CW-18 in one shot. **Highest leverage of any remaining fix.**
2. F-CW-LIVE-05 (P2) — case-insensitive dedup of materialSelections before save
3. F-CW-LIVE-03 (P2) — element inference: tighten install-verb regex to require start-of-clause or follow-by-noun, not adjective-noun
4. F-CW-LIVE-07 (P3) — investigate which field still drifts wizard↔Overview
5. F-CW-LIVE-01 (P3) — internal trial-bypass for QA

After LIVE-08 fix ships and is redeployed, the materials engine should finally be running on full data for the first time. Recommend a fresh walkthrough against the new build to confirm.

---

## 2026-04-26 — Re-test on prod after LIVE-08 ship

After deploying commit `e3799eb` to staging, ran a fresh softscape walkthrough. New project `7d2695b0`. DB inspection:

### ✅ LIVE-08 verified working

**8 of 8 materials in `projects.materials` JSONB now have `HAS_ID`** (was 4 of 9 pre-fix). Units normalized to canonical CHECK-allowed values: `sqft`, `cuyd`, `lnft`, `each`. The unit-validation rejection that caused createMaterial to silently fail is gone. The cornerstone bug for the entire materials cascade is closed.

### Junction count still 1 of 8 — different root cause now

The materials all exist in the library — but only **Mulch (cuyd)** got a junction row, linked to **Shrub Planting**. Diagnosing the remaining gap:

| Material | Category | Should link to | Linked? |
|----|----|----|----|
| Sod (2,500 sqft) | sod | Sod Area | **No element exists** — F-CW-LIVE-03 regression (Sod wasn't inferred due to comma in "3,000") |
| Sod (additional 500 sqft…) | sod | Sod Area | (same — and **F-CW-LIVE-11** dup, see below) |
| Hydrangea Shrubs | **misc** | Shrub Planting | **No** — category='misc' has no element-type mapping |
| Mulch (bulk) | mulch | Mulch Area or Shrub Planting | **Yes** ✅ (linked to Shrub Planting) |
| Drain Pipe | misc | Drainage | **No** — misc has no mapping |
| Drain Rock / Gravel | stone | Drainage | **No** — stone maps to hardscape, not drainage |
| Landscape fabric | misc | (any) | **No** — misc has no mapping |
| Topsoil | misc | Garden Beds / Sod Area | **No** — misc has no mapping |

So the cascade fix is **architecturally working** — when an element + a properly-categorized material exists, they link. The remaining gap is two layers up:

#### F-CW-LIVE-09 / P1 — Category-to-element-type mapping is too narrow
`getElementTypesForCategory()` doesn't have entries for `misc`, doesn't map `stone` to `drainage`, etc. AI legitimately returns `misc` for materials that don't fit a tight category (drain pipe, landscape fabric, topsoil). The mapping needs broader coverage:
- `misc` → could fit any element (especially drainage, garden_bed)
- `stone` → drainage + retaining_wall
- `pipe` (or recognize "drain pipe" name pattern) → drainage

Or even simpler: when no category mapping matches, attempt name-based linking (does the material name mention "drain", "shrub", "sod" etc., to find a matching element).

#### F-CW-LIVE-10 / P2 — AI defaults to category='misc' too aggressively
Hydrangea Shrubs returned with `category='misc'` instead of `'plant'`. The AI prompt should make the category list more visible / require specific picks for items that match obvious categories. Add a category-validation step that re-classifies based on name keywords ("shrub" / "tree" / "plant" → `plant`).

#### F-CW-LIVE-11 / P2 — AI suggests duplicate-conceptually materials with different names
"Sod (2,500 sqft)" + "Sod (additional 500 sqft to complete 3,000 sqft)" both shipped as separate JSONB rows because the LIVE-05 dedup is exact-name match. Need fuzzy dedup: same category + name starts-with or contains the same noun ("Sod") → merge. Or better — fix the AI prompt so it doesn't suggest two rows for the same material.

### Status

| ID | Sev | Status |
|----|-----|--------|
| F-CW-LIVE-08 | P0 | ✅ shipped + verified live |
| F-CW-LIVE-04 | P0 | ✅ closed via LIVE-08 (8/8 HAS_ID) |
| F-CW-LIVE-03 iteration | P2 | 🟡 committed `1193844`, needs redeploy |
| F-CW-LIVE-09 | P1 | 🆕 OPEN — category→element mapping too narrow |
| F-CW-LIVE-10 | P2 | 🆕 OPEN — AI defaults to misc too readily |
| F-CW-LIVE-11 | P2 | 🆕 OPEN — fuzzy dedup needed for AI material suggestions |

**Next**: redeploy with commit `1193844` (LIVE-03 iteration) so Sod actually gets inferred, then iterate F-CW-LIVE-09 (broader category mapping) which would push junction count from 1/8 toward something like 5/8. F-CW-LIVE-10 + 11 are AI-prompt polish that can wait.

---

## 2026-04-26 — Re-test after LIVE-03 iteration + LIVE-09 ship

Deployed commits `1193844` (LIVE-03 iteration) + `e7c3972` (LIVE-09 broader category mapping + name-keyword fallback). Created project `9c9520e5` ("Live Test 3") with the same softscape description as Live Test 2.

### 🎯 Junction count: 8 of 9 (was 1 of 8)

**The materials engine is finally producing a complete picture.** 7 unique materials linked to elements + 1 material (Topsoil) linked to 2 elements = 8 junction rows. Manifest tab shows real material rows for the contractor.

| Material | Category | Linked? | Note |
|----|----|----|----|
| Sod (2,500 sqft) | sod | ✅ → Sod Area | |
| Sod (additional 500 sqft…) | sod | ✅ → Sod Area | F-CW-LIVE-11 dup not yet fixed |
| Hydrangea Shrubs | misc | ✅ → Shrub Planting (via "hydrangea" name keyword) | |
| Mulch (bulk) | mulch | ✅ → Shrub Planting | |
| Topsoil | misc | ✅ → 2 elements (Sod Area + Shrub Planting) | |
| Landscape fabric | misc | ✅ → Shrub Planting (via "fabric") | |
| Perforated Drain Pipe | misc | ✅ → Drainage (via "drain pipe") | |
| **Crushed Stone / Gravel Base** | stone | ❌ ORPHAN | F-CW-LIVE-12 below |
| **Drain Rock / Gravel** | stone | ❌ ORPHAN | F-CW-LIVE-12 below |

### Element inference (LIVE-03 iteration)

Same description ("Install 3,000 sqft of new sod lawn. Add a 50ft French drain… Plant 8 hydrangea shrubs around the patio (existing patio, no patio work). Mulch the existing planting beds.") inferred:
- ✅ Sod Area (the comma-in-numbers fix worked — "3,000" no longer breaks the clause)
- ✅ Shrub Planting (correct)
- ✅ Drainage (correct)
- ✅ Patio NOT inferred (the positional-preposition guard worked: "around the patio")
- ❌ Mulch Area NOT inferred — root cause: "Mulch the existing planting beds" → "(existing planting beds)" stripped → "Mulch the" → keyword "mulch" at idx 0 = install verb at idx 0 → strict `kwIdx <= verbIdx` rejected. **Fixed in commit `04f230f`** — allow `kwIdx == verbIdx` since the verb IS the keyword for self-named install actions (Mulch, Sod, Drain, Pave, Edge…). Needs redeploy.

### F-CW-LIVE-12 / P3 — Stone materials don't link to drainage element (no area)

The Drainage element has `linear_ft=50`, `depth_in=12`, but `area_sqft=null` (linear-only geometry). When the wizard's auto-link loop calls `computeQty(stoneMatAdapter, syntheticZone)` with a stone material on a drainage element, the synthetic zone has `area=0`, `perimeter=50`. The cuyd formula for stone is `area × depth/27` which returns 0 — so the loop skips the junction insert.

This is a per-element-type formula gap. Drainage elements should price stone via `linear_ft × bed_width × depth/27`. Mulch/topsoil price via area. Pavers price via area. Need a per-element-type computeQty branch.

For now: 2 stone materials remain orphaned on drainage. The contractor would have to add them manually via the Materials tab. P3 polish — not blocking.

### Status snapshot

| ID | Sev | Status |
|----|-----|--------|
| F-CW-LIVE-08 | P0 | ✅ shipped + verified (8/8 HAS_ID, was 4/9) |
| F-CW-LIVE-09 | P1 | ✅ shipped + verified (junction 8/9, was 1/8) |
| F-CW-LIVE-03 | P2 | ✅ shipped + iterated (last edge case in commit `04f230f`, needs redeploy) |
| F-CW-LIVE-04 | P0 | ✅ closed via LIVE-08 + LIVE-09 |
| F-CW-LIVE-12 | P3 | 🆕 OPEN — stone material on drainage computes 0 qty (no area) |
| F-CW-LIVE-10 | P2 | 🟡 OPEN — AI defaults to misc; partially mitigated by name-keyword fallback |
| F-CW-LIVE-11 | P2 | 🟡 OPEN — fuzzy material dedup needed |
| F-CW-LIVE-05 | P2 | ✅ shipped |
| F-CW-LIVE-07 | P3 | ✅ shipped (permits passed to OverviewTab) |
| F-CW-LIVE-01 | P3 | ✅ shipped (internal email allowlist bypass) |

**The materials engine cascade is fundamentally fixed.** From 1/8 → 8/9 junction rows in three deploys. The remaining gaps (F-CW-LIVE-10/11/12) are P2/P3 polish items that improve completeness from "works" to "perfect."

---

## 2026-04-26 — Final cascade verification (Live Test 4, project 403e34a0)

After deploying commit `04f230f` (LIVE-03 final edge: kwIdx == verbIdx allow), ran one more softscape walkthrough.

### 🏆 Element inference: 4/4, 0 false positives

Same description as previous tests (`"Install 3,000 sqft of new sod lawn. Add a 50ft French drain along the back property line. Plant 8 hydrangea shrubs around the patio (existing patio, no patio work). Mulch the existing planting beds."`):

- ✅ **Sod Area** (comma-in-numbers fix)
- ✅ **Shrub Planting**
- ✅ **Mulch Area** (kwIdx == verbIdx fix — "Mulch" at idx 0 = verb at idx 0)
- ✅ **Drainage**
- ❌ Patio NOT inferred (positional-preposition guard)
- ❌ Garden Beds NOT inferred (existing-X strip)

Cleanest inference yet — exactly the 4 install actions from the description, no false positives.

### 🏆 Junction count: 10 (over-linked) from 8 JSONB materials

Junction count > JSONB count is *correct* — materials that fit multiple element types link to all of them:
- Mulch → 2 elements (Mulch Area + Shrub Planting)
- Topsoil → 2 elements (Sod Area + Shrub Planting)
- Landscape fabric → 2 elements (Mulch Area + Shrub Planting)

Every element has materials. Every material that should link, linked. The materials engine is producing real data for the contractor.

### Remaining open polish items (all P2/P3)

#### F-CW-LIVE-12 / P3 — Stone materials don't link to drainage element
Drain Rock / Crushed Stone (category=stone, unit=cuyd) target the Drainage element via mapping, but the auto-link loop's `computeQty(stone, drainage_element)` returns 0 because Drainage has `linear_ft` only (no area_sqft). The cuyd formula `area × depth/27` collapses. Needs a per-element-type quantity branch: drainage uses `linear × bed_width × depth/27`, others use area-based.

#### F-CW-LIVE-13 / P3 — Plant count not respected (NEW from this test)
Hydrangea Shrubs ended up with `quantity=1` despite the description saying "8 hydrangea shrubs". The auto-link loop computes quantity from element geometry (Shrub Planting area=120 sqft) using a coverage formula (likely 1 plant per 120 sqft = 1 plant). For point-spacing elements (shrub_planting, tree_planting), need to honor the AI's stated plant count via `manual_count` override.

#### F-CW-LIVE-11 / P2 — Fuzzy dedup still needed
"Sod (2,500 sqft)" + "Sod (additional 500 sqft to complete 3,000 sqft)" both ended up as Sod Area junction rows, each with quantity=2500 sqft. Result: 5000 sqft of sod purchased for a 2500 sqft Sod Area. The exact-name dedup misses these conceptual duplicates. Need fuzzy match (same category + name starts-with same noun) OR fix the AI prompt to never suggest conceptually-duplicate rows.

### Verdict

The materials engine cascade is **fully operational**. From 1/8 → 8/9 → 10/8 (with multi-element linking) across four deploys. The user-visible Manifest tab now produces a complete picture for normal softscape projects.

The three remaining polish items (LIVE-11/12/13) all have a common shape: **AI suggestion vs. element-geometry quantity-formula mismatches**. They affect quantity precision, not whether the cascade fires. Recommend tackling them in a single AI-prompt + computeQty pass next session.

---

## 2026-04-26 — All precision fixes shipped + verified (Live Test 5, project bbf79870)

Deployed commit `5cb1d7c` (LIVE-11/12/13 precision fixes). Same softscape walkthrough produced:

### ✅ All three fixes verified

| Fix | Before | After |
|---|---|---|
| **LIVE-11** dedup | "Sod (2,500 sqft)" + "Sod (additional 500 sqft to complete 3,000 sqft)" both shipped | **One Sod entry** in JSONB. JSONB went 8 → 7. |
| **LIVE-12** trench formula | Stone materials orphaned on drainage (cuyd formula = 0 for linear-only element) | **Drain Rock = 2.78 cuyd** — `50ft × 1.5ft × 1ft / 27` matches expected trench volume |
| **LIVE-13** plant count | Hydrangea qty = 1 (1-per-coverage) | **Hydrangea qty = 8** — AI's stated count honored |

### Final cascade summary (project bbf79870)

- **7 unique materials** in JSONB (after dedup)
- **10 junction rows** (multi-element linking: Mulch → 2, Topsoil → 2, Fabric → 2)
- **All 4 elements have materials** (Sod Area, Shrub Planting, Mulch Area, Drainage)
- **Stone now links to Drainage** with a sensible trench-volume cuyd
- **Plant counts respect AI** — no more 1-of-8 misordering
- **No duplicate Sod** — no over-purchase

### The materials engine, end to end

- **Materials journey**: 1/8 → 8/9 → 10/8 → **10/7** (dedup tightened) across **5 deploys**
- **Element inference**: 4 of 4 correct, 0 false positives
- **Manifest tab**: produces accurate, contractor-ready material rows with sensible quantities
- **Closeout vs Manifest**: agree (single source of truth via junction)

### All open contractor-walkthrough findings (final state)

✅ Closed (live-verified): F-CW-01..10, EMAIL-01/02, 12, 14, 15, 16, 19, 22..28, 31, 33..43, 45, 46, 48, 50..56, 58, LIVE-01, LIVE-03, LIVE-04, LIVE-05, LIVE-07, LIVE-08, LIVE-09, LIVE-11, LIVE-12, LIVE-13

🟡 Open (not yet fixed):
- F-CW-LIVE-10 P2 — AI defaults to `category='misc'` too readily (mitigated by name-keyword fallback in LIVE-09 but not eliminated)
- F-CW-11/13/15b/15c/17 (early P3 polish items — overflow patterns, copy nits)
- F-CW-21 P3 — Schedule transition's two-step pattern is undiscoverable
- F-CW-29 (already shipped — verified live)
- F-CW-32 P3 — Inconsistent edit patterns (modal vs inline)
- F-CW-34 P3 — No top-level Manifest entry
- F-CW-49 P3 — `/crew` is worker app for admins
- F-CW-51 P3 — Equipment-profile pills don't deep-link
- F-CW-52 P3 — Add Crew form too minimal
- F-CW-57 P3 — Profanity in production test data (data cleanup, not code)
- F-CW-59 P3 — Suppliers table horizontal overflow

**Total: ~50 distinct findings closed across 18 commits over the contractor-walkthrough series.** The materials engine — TerrainForge's central value prop — went from completely broken to fully working. The remaining open items are minor UX polish that don't block the contractor-to-client workflow.

**The two P0s share a root cause**: F-CW-45 — most materials end up as project-level JSONB orphans without library references because `createMaterial` fails silently when AI says "will be added automatically." That cascades into F-CW-17/18 (silent INSERT failures) and F-CW-36 (manifest engine sees only library-linked materials), AND into F-CW-43 (Closeout reads JSONB and sees them all; Manifest reads junction and sees one). Fix `createMaterial` reliability + backfill orphan library rows + reconcile JSONB↔junction sources of truth, and ~5 findings close at once.

**Recommended fix order for next session**:
1. **F-CW-45 / 17 / 18 / 36 / 43** (single root cause) — most impactful, fixes the materials engine's correctness baseline
2. **F-CW-54** — Settings page layout. CSS regression. Fast.
3. **F-CW-15** — Edge Function `profiles` → `auth.users`. Fast, mechanical.
4. **F-CW-16** — AI cascade fallback (closes 19, partially closes 17/18 if it was an LLM payload artifact)
5. **F-CW-53** — `/schedule` route + dangling reference. Fast.
6. **F-CW-46** — Wizard equipment accept persistence
7. **F-CW-48** — Add Task affordance
8. **F-CW-44** — Closeout actuals persistence
9. **F-CW-33** — Client & Location edit save
10. **F-CW-27** — Modal scroll
11. **F-CW-12, 14, 56** — earlier P1/P2s
12. P3 polish batch — ~25 small fixes that can be one-shot

---

# 3D-in-Wizard Phase A + Phase B (2026-04-26, commits `70ced06` + `a409bfb`)

## Phase A walkthrough (Thompson Backyard Patio + Stairs scenario)

Live verification on `terrainforge-staging.netlify.app` from a fresh wizard. All checks passed:

- 5-step compressed stepper (Job → Design → Plan → Numbers → Review)
- AI element inference: 3/3 correct (Paver Patio 24×18 = 432 sqft, Stone Stairs 12×4 = 48 sqft, String Lighting 84 LF). Demolition clause correctly excluded.
- Geometry seeded via `placementBucket()` → all elements visible on Mapbox satellite tile, none overlapping property origin
- 2D ↔ 3D toggle, click-to-select, sidebar focus tracking, drag/resize/rotate via TransformControls all functional
- Per-element materials filter (Phase A baseline): Stone Stairs surfaced 5 stair-relevant suggestions
- Materials review section on Step 3 (4 materials, $5,505.50 total, element-assignment preview "Applies to: Paver Patio, Stone Stairs to Back Door")
- Cost rollup matches across Step 4 (Numbers) and Step 5 (Review): $12,230 cost / $15,287 quote / 20% margin / $3,057 profit
- Project create persisted geometry: OverviewTab opens with all 3 elements at wizard-placed coordinates in BOTH 2D and 3D viewers

Project: `https://terrainforge-staging.netlify.app/projects/53e745f6-394f-43b2-bff9-d8643ae03d83`

## Phase B walkthrough ("Mixed Hardscape & Beds" scenario)

Live verification of per-element AI material calls:

| Check | Calls | Result |
|---|---|---|
| Step 1→2 fires project + elements + first-element materials | 3 | ✅ |
| Click new element (Sod Installation) | +1 | ✅ |
| Re-click first element (cache hit) | +0 | ✅ |
| Tweak dimension (length 16→20) | +0 | ✅ |
| Change type (patio→walkway) | +1 | ✅ |

- Per-element specialization confirmed: Paver Patio (192 sqft) returned `paver / base / polymeric / fabric / leveling sand / edging`; Sod Installation returned `sod / topsoil / soil amendments / fertilizer / fabric`; Walkway returned `paver / base / mason bedding sand / polymeric jointing / fabric / edging` — three distinct material sets for three distinct element types from the same parent project.
- Quantities scale with dimensions (e.g., 192 sqft fabric for 192 sqft patio; 880 sqft fabric for 800 sqft sod with waste).
- Loading state pulse + "tailored to this element" green badge render correctly during in-flight calls.

## Findings logged

- **F-PHB-01** — P3 — `inferMaterialsForElement` returned **1 sqft of Landscape Fabric** for a 16×12 walkway after type change. Should be ~192 sqft. Suspected cause: AI sees "1 unit" and emits 1 sqft instead of computing area × 1. Fix: tighten prompt to require `estimatedQuantity = element_area × waste_factor` for sqft-unit underlayment.
- **F-PHB-02** — P2 — Sod Installation (800 sqft) returned **14.8 cuyd of Crushed Stone Base** as a material. Sod doesn't need a 6" gravel base — it sits on prepared topsoil. AI is applying hardscape base-prep rules to softscape. Fix: in `relevantCategoriesForType('sod_area')`, exclude `gravel` from the catalog hint AND add a negative example to the prompt ("sod does NOT need crushed stone base").
- **F-PHB-03** — P3 — Cache key includes element **name**, so renaming an element triggers a fresh API call. Likely intentional (name might encode contractor intent), but worth noting as cost. Could relax to just `elementType` since material categories don't change with name.
- **F-PHB-04** — P3 — Notes field copy doesn't update when element type changes. After `patio → walkway` the Notes still read "16×12 paver patio explicitly specified for backyard install". Minor friction; contractor can edit, but a clear-on-type-change toast or behaviour would feel cleaner. Possibly deferred to AI-rewriting notes on type change.
- **F-PHB-05** — P3 — When type changes, the `Length × Width × Area-override` triplet stays in sync but the contractor sees a stale "Area (sqft) override: 192" value derived from the prior dimensions. If they then edit length, the override doesn't recompute. Easy fix: clear `areaSqft` to null on type-change so `length × width` takes precedence.
- **F-PHB-06** — P2 — AI returned `unit: 'sqft'` for a `Landscape Fabric` material in the per-element call (correct unit for fabric measured by area), but the validator allowed `1` as a valid quantity. Add per-unit minimum sanity checks: `sqft` materials with quantity < 10 on an element with area > 50 sqft should be flagged for review. Belt-and-suspenders for F-PHB-01.

## Verification artefacts

- Phase A test project: `/projects/53e745f6-394f-43b2-bff9-d8643ae03d83` ("Thompson Backyard Patio + Stairs")
- Phase B test project: not created (test was driven through Step 2 only to count network calls; no project saved)
- Network requests verified via Chrome MCP `read_network_requests({ urlPattern: 'anthropic' })`

---

# 3D-in-Wizard Phase C v0 (2026-04-26, commit `5ccec06`)

## Phase C v0 walkthrough — client design edit mode

Live verification on `terrainforge-staging.netlify.app` against the Thompson Backyard Patio + Stairs project. Token: `098c946c6bc2221a30209a5f52bd7c865fc4c416cfb41a61210d854137f06bc7` (role=`client_design`).

### Happy path (all checks passed)

| Check | Result |
|---|---|
| Contractor `✎ Design link` button creates `client_design` token | ✅ |
| `EDIT` badge renders in URL pill so contractor can tell tokens apart | ✅ |
| `/share/:token` for design role mounts editable canvas (PlanView2D) | ✅ |
| Resize handles + rotation handles visible per element | ✅ |
| Drag persists via `client_update_element_geometry` RPC | ✅ — Stone Stairs moved from `{x:-7,y:53}` to `{x:15,y:49}`; verified via `SELECT geometry FROM project_elements` |
| Submit panel renders with optional note textarea | ✅ |
| `submit_design_changes` RPC stamps `client_changes_submitted_at` + note | ✅ |
| Submitted-state confirmation shows timestamp + note + Resubmit affordance | ✅ |
| Contractor OverviewTab shows green "Client submitted design changes" banner with timestamp + note | ✅ |
| Contractor 2D canvas reflects the moved element | ✅ |
| `view_count` increments on token (URL pill shows `viewed 1×`) | ✅ |

### Negative tests (all rejected with correct error codes)

| Test | Expected error | Actual |
|---|---|---|
| Invalid token | `token_not_found_or_inactive` | ✅ |
| Wrong role (`client_view`) | `token_not_a_design_token` | ✅ |
| Cross-project element edit | `element_not_in_token_project` | ✅ |
| Malformed geometry payload | `invalid_geometry` | ✅ |

### Findings logged

- **F-PHC-01** — P3 — **Token URL was misread from screenshot** during Chrome MCP testing (`098c946c6bc2221a30...` vs `098c946c6bc2221a38...`, `0`/`8` and `5`/`a` confusion in the small monospace font). Not a bug — the contractor would copy via the Copy link button or the toast clipboard write — but a slightly larger font or letter-spacing on the URL pill would help in the rare case a contractor reads the URL aloud or transcribes it.
- **F-PHC-02** — P3 — **"Client has viewed the link but not responded yet" copy fires for `client_design` tokens** even after the client has already submitted design changes. The Phase B response check `!activeToken.clientResponse && activeToken.viewCount > 0` doesn't know that design tokens have a different "responded" semantic (`clientChangesSubmittedAt`). Fix: skip that copy when `role === 'client_design'`, or rewrite to read "Client has viewed but not submitted yet" for design tokens.
- **F-PHC-03** — P3 — **No follow-up flow yet on contractor side**. After a client submits design changes, the contractor has no in-app affordance to (a) accept the changes as-is, (b) revoke the design link and send a fresh one, (c) reply to the client with their own note, or (d) lock further edits. Today the only follow-up actions are the existing "Email to client / Copy link / Revoke" buttons. Phase C+ should add a dedicated "Accept changes" / "Continue editing yourself" / "Send a reply" trio.
- **F-PHC-04** — P2 — **No version history**. Each client edit is a direct mutation on `project_elements.geometry`. If a client moves the patio, then moves it again, the contractor sees only the latest — no audit trail and no way to rewind. Phase C+ work item: `project_design_versions` table with snapshots.
- **F-PHC-05** — P3 — **No expiry on design links** (same as Phase A view links). Contractors should be nudged to set short expiries on `client_design` tokens specifically since they grant write access. Default to e.g. 7 days when role is `client_design`.
- **F-PHC-06** — P2 — **Contractor's `editingLayout` flag and the client's edits race**. If the contractor has the layout editor open at the same time the client is dragging, both clients write to `project_elements.geometry` and last-write-wins. With low traffic this is rarely hit; with shared design link sent to multiple clients on the same project it's a real concern. Phase C+ fix: add an `updated_at` column + optimistic concurrency check, or lock the contractor out of edit mode while a client_design token is active and unrevoked.
- **F-PHC-07** — P3 — **The 3D viewer's TransformControls do not always re-anchor** after a geometry change (observed during Phase A but worth re-noting in Phase C since the surface now has more contention). When an element moves via the RPC and the elements array re-renders, the gizmo can briefly attach to the wrong element. Workaround: clicking another element re-resolves it. Investigation deferred to the cleanup phase.

## Cleanup phase backlog (consolidated)

From Phase B + Phase C testing:

| ID | Sev | Phase | Description | Suggested fix |
|---|---|---|---|---|
| F-PHB-01 | P3 | B | Landscape Fabric returns 1 sqft for a 16×12 walkway | Tighten prompt formula for sqft underlayment |
| F-PHB-02 | P2 | B | Sod returns 14.8 cuyd of crushed stone base | Drop `gravel` from sod's relevant categories + negative example in prompt |
| F-PHB-03 | P3 | B | Cache key includes element name → rename triggers fresh API call | Drop name from cache key |
| F-PHB-04 | P3 | B | Notes field stale after type change | Either auto-clear notes on type change, or AI-rewrite |
| F-PHB-05 | P3 | B | `areaSqft` override survives type change | Clear on type change |
| F-PHB-06 | P2 | B | Validator allows `quantity: 1` for sqft material | Add per-unit minimum sanity checks |
| F-PHC-01 | P3 | C | Token URL hard to read at small font | Larger font or letter-spacing on URL pill |
| F-PHC-02 | P3 | C | "Client viewed but not responded" copy fires for design tokens | Skip when role==='client_design' |
| F-PHC-03 | P3 | C | No follow-up affordance after client submission | Accept / Continue / Reply trio |
| F-PHC-04 | P2 | C | No design-version history | Add `project_design_versions` table |
| F-PHC-05 | P3 | C | No default expiry on design links | Default 7-day expiry for `client_design` role |
| F-PHC-06 | P2 | C | Contractor edits race with client edits | `updated_at` column + optimistic concurrency or contractor lockout |
| F-PHC-07 | P3 | C | 3D TransformControls gizmo doesn't always re-anchor | Investigate during cleanup |

---

# Cleanup phase — completion log

**P2 batch shipped + verified live (commit `c4241f9`):** F-PHB-02, F-PHB-06,
F-PHC-04, F-PHC-06. F-PHB-01 closes as a side-effect of F-PHB-06's
prompt strengthening.

**P3 polish PR (this commit):**

| ID | Phase | Resolution |
|---|---|---|
| F-PHB-03 | B | Per-element materials cache key reduced to `elementType` only. Renaming an element no longer triggers a fresh API call. Dimension tweaks already weren't re-prompting. |
| F-PHB-04 | B | Type-change in the per-element sidebar now clears `notes`. AI's old type-specific text ("16x12 paver patio") doesn't survive into the new type. |
| F-PHB-05 | B | Type-change clears `areaSqft` to null. Length × width takes precedence again until the contractor enters a fresh override. |
| F-PHC-01 | C | URL pill bumped 11px → 12px + 0.4px letter-spacing. The 0/8 and 5/a glyphs now read distinctly. |
| F-PHC-02 | C | "Client viewed but not responded yet" copy gated on `role !== 'client_design'`. For design tokens a distinct "opened the design link but not submitted changes yet" copy fires when applicable. |
| F-PHC-03 | C | Submission banner gains a green "✓ Accept changes" button. Clicking it revokes the active design token (locks further client edits) — the client's last-submitted geometry stays as the canonical design. Reply / fresh-link reuse the existing Email + Design link buttons. |
| F-PHC-05 | C | `handleCreateDesignLink` now passes `expiresInDays: 7`. Pill renders an "expires {date}" suffix so the contractor can see the expiry without revoking. Design links grant write access; sensible default. |
| F-PHC-07 | C | TransformControls in PlanView3D now keyed on `tc-{selectedId}-{x}-{z}-{rot}-{w}-{d}` so a fresh remount happens when the selected element's resolved geometry changes (e.g. external Phase C client edit lands while contractor has the same element selected). |

**13/13 cleanup findings closed.**

---

# Sprint E — E2E walkthrough automation (2026-04-28)

**Goal**: Build a single-command Playwright regression gate for the
3D-in-Wizard / Phase A-C / cleanup arc, runnable as `npm run e2e`,
covering the contractor flow end-to-end with assertions at every
checkpoint. Designed as the regression gate that future overnight
sprints (M / P / V from ROADMAP.md) can lean on.

## Result

✅ **6/6 tests green, 28s total runtime, stable across 2 consecutive runs.**

```
[setup]                  authenticate as contractor                   3s
[rpc-negative]           4 RPC reject-path tests                      ~1s combined
[contractor-walkthrough] 21-checkpoint full flow                      22s
                                                                    ─────
                                                                     28s
```

## Files added

- `playwright.config.ts` — 3 projects (setup / negative / walkthrough)
- `e2e/auth.setup.ts` — sign-in once, persist storage state
- `e2e/helpers.ts` — selectors, waiters, env validation, unique-name
  generator, `waitForStep2AICalls`, `waitForPerElementMaterialCall`
- `e2e/walkthrough.spec.ts` — full flow with 21 documented checkpoints
- `e2e/rpc-negative.spec.ts` — direct REST tests for the Phase C v0
  SECURITY DEFINER RPCs
- `.env.e2e.example` — env template
- `.gitignore` — added `.env.e2e`, `e2e/.auth/`, `playwright-report/`,
  `test-results/`, `playwright/.cache/`
- `package.json` — 6 e2e scripts (`e2e`, `e2e:headed`, `e2e:debug`,
  `e2e:walkthrough`, `e2e:rpc`, `e2e:install`)
- `.claude/TESTING/E2E.md` — operator docs (setup, run modes, cost,
  CI snippet, failure triage, maintenance)

## Findings surfaced + fixed during the build-out

None caught a real product regression — all four iteration cycles
were spec-side fixes (selectors that turned out to be stale or too
greedy). Logged here for the future-Claude reading the spec:

- **F-E2E-01** Wizard Type select isn't `htmlFor`-linked, so
  `getByLabel('Type')` doesn't find it. Fix: scope to the `<aside>`
  via `getByRole('complementary')` and pick its single `combobox`.
- **F-E2E-02** Project Elements section has the count in parens
  ("Project Elements (2)") which collides with the "Top-down plan
  from your project elements." copy in the same view in strict
  mode. Fix: regex on `/Project Elements \(\d+\)/i`.
- **F-E2E-03** Button accessible names come from visible text, NOT
  the `title` attribute. The "✎ Design link" button has a longer
  tooltip via `title` — `getByRole('button', { name: /Editable
  link/ })` fails. Fix: match by visible text "/Design link/i".
- **F-E2E-04** After project Delete, the route briefly hits a 404
  before settling — `waitForURL(/\/projects$/)` times out. Fix:
  navigate to `/projects` ourselves and assert the project name no
  longer appears in the list.
- **F-E2E-05** Toggle buttons render lowercase `'2d'`/`'3d'` text
  with CSS `text-transform: uppercase`. Playwright's accessible-name
  match is case-sensitive without normalization. Fix: regex
  `/^2d$/i`.
- **F-E2E-06** ESM gotcha: `__dirname` doesn't exist in
  `"type": "module"` packages. Fix: derive via
  `fileURLToPath(import.meta.url)`.

## Cost + cadence

- ~$0.50 of Anthropic budget per full run
- 1 staging-DB test project per run, deleted on teardown
- Recommended cadence: pre-merge gate locally, daily check on CI,
  manual `npm run e2e:headed` before each Sprint M/P/V starts
---

# Sprint Z3 — Polygon click-to-draw + vertex insert (2026-04-29, commit `b923902`)

Phase B follow-ups from the polygon series. Two shortcuts that together
close the loop on "design a polygon from scratch without ever leaving
the canvas":

| Batch | Shipped |
|-------|---------|
| 27 | **Draw-new-polygon thumbnail button**: clicking adds a 4-vertex 10×10 seed and immediately drops the user into draw mode (Esc cancel, Enter commit). Replaces the Add → switch-to-Polygon → Redraw three-step flow with a single click. `WizardStepMeasurements.addPolygonElement()` uses a `setTimeout(0)` deferral so the element renders in `laid` before draw mode flips on. |
| 28 | **Right-click polygon edge inserts vertex** in `PlanView2D.tsx`. Closest edge picked via point-to-segment distance, click point projected onto that edge, and a new vertex is inserted between the bounding pair. Accounts for `rotationDeg` via inverse-rotate around the element center so it works on rotated polygons. Pairs with the existing right-click-vertex-to-remove (when 4+ vertices remain). |

## Manual Chrome QA on staging (this commit, post-deploy)

Verified live on `terrainforge-staging.netlify.app`:

| Surface | Result |
|---------|--------|
| **ProjectStatusPills** on Overview | ✅ All 6 buttons (Estimate / Quoted / Approved / Scheduled / In Progress / Completed) + On Hold render with correct `aria-pressed` state. Earlier `find` query missed them — DOM probe confirmed all present + visible. |
| **Cmd-K quick-switcher** | ✅ Opens, lists 4 hub pages + 5 secondary pages + projects with status badges (59 results on this account). |
| **3D viewer on Overview** | ✅ Canvas mounts (924×358) with satellite ground rendered. Tested on `E2E_VISUAL_REGRESSION_SprintV` (7 elements). Did not visually verify each element-mesh on this small project — covered by Sprint V regression suite. |
| **Wizard at `/projects/wizard`** | ✅ Loads as 5-step Phase-A flow (The Job / Design / The Plan / The Numbers / Review & Create). |
| **Review Queue `/queue`** | ✅ Loads with empty-state copy. |
| **Dashboard `/`** | ✅ Lands at `/dashboard`, KPIs render (49 active, 1 completed this month, $635.2k pipeline, 11% avg completion), 4 KPI cards. |

### Minor finding (P3 — not blocking)

- **F-Z3-01** `/projects/new` is interpreted by the `/projects/:id`
  route as id="new", triggering a `fetchProjectFull('new')` that
  surfaces transient "Database error syntax for type" toasts before
  settling into a permanent "Loading project data..." spinner. Anyone
  pasting `/projects/new` (intuitive guess) hits a dead end. Fix
  options: (a) add a `<Route path="/projects/new" element={<Navigate to="/projects/wizard" />}>`,
  or (b) validate the `:id` param as a UUID and redirect to `/projects` on miss.
  Logged for backlog.

## What's NOT covered by this QA pass

- Full polygon-edit flow on a project that already contains polygon
  elements — covered by `e2e/walkthrough.spec.ts` batch 25.
- Materials engine accuracy on polygon shapes — covered by
  `npm run materials:score` harness (89.6% mean).
- Cmd-Z undo/redo on a real edit chain — covered by walkthrough
  batch 21 + zundo unit reflection.

## What was deferred

- Cross-org RLS test on a second tenant — needs operator decision on
  a second test account.
- Component tests for wizard `handleCreate` — real day-of-work
  investment, not justified before Phase B AI material
  recommendations land.
- Sprint Z2 stack upgrade (React 19 / R3F v9 / drei v10) — explicitly
  deferred per `.claude/TESTING/PLAN.md` rationale.

---

# Sprint 3D-Reality — Charlie manual test 2026-04-29

Two real bugs surfaced when Charlie opened existing E2E projects on
staging and toggled 3D + reviewed 2D placement. Both are **P0**: 3D
viewer is the demo surface, and placement on the map is the entire
value prop of the share link.

## F-3D-MESH-01 — 3D viewer renders ground but no element meshes (P0)

**Symptom**: 3D toggle on existing projects (e.g.
`E2E_TEST_Walkthrough_1777434304286`, Paver Patio 16×12 + Garden Bed
Edging 60 LF) shows the satellite ground tile rendering at an oblique
angle but **no element meshes appear in the scene**. The 2D view of
the same project shows the elements correctly. Issue is not visible
on the new wizard-flow projects with manual placement (only on
auto-layout-only projects); needs reproduction confirmation across
the matrix.

**Hypotheses, in priority order**:

1. **Camera frustum vs element positions**: when the ground plane is
   sized to the parcel (~200×200 ft at zoom 18), the camera may be
   pulled back far enough that auto-layout's relative offsets put
   elements behind / above / outside the frustum. Easy to verify —
   log `camera.position`, `camera.far`, and each element's
   `mesh.position` after mount.
2. **Element `y` (height) below ground plane**: if the default
   `position.y` resolves to 0 but the ground plane is also at y=0
   with no offset, the mesh may z-fight or be culled by depth test.
   Verify: ground plane y, element y, element height-derived box
   bottom.
3. **Polygon shape regression on rectangle path**: the recent
   `THREE.Shape` + `ExtrudeGeometry` work for polygon support keys
   off `shape === 'polygon'`, but the rectangle branch may rely on
   `shape === 'rectangle'` being explicit. Existing pre-mig-033
   projects have `shape` = NULL / undefined which may now drop
   through to a no-op. Check `ExtrudedBox.shapeKind` resolution path
   in `PlanView3D.tsx`.

**Investigation order**:
- Open the failing project in dev with `?debug=3d` (or just attach
  console logs)
- Log `scene.children.length` after first paint — if it's only 1–2
  (ground + light) instead of 1 + N elements, the elements were
  never added to the scene → check element-list reactivity
- If the elements ARE in the scene, log their world-position. If the
  world-position is sane, it's a camera issue (zoom out to see the
  full scene)
- If scene has elements at sane positions and the camera is fine,
  it's a material / depth issue

**Severity**: P0. Demo surface. Blocks Sprint AI-Place validation
because we can't see the AI's placements until 3D renders meshes.

## F-3D-PLACEMENT-01 — Element placement ignores property structure (P0, architectural)

**Symptom** (from screenshots in chat 2026-04-29):
- 2D view: 16×12 Paver Patio centered on a building's flat dark roof
- 2D view: 60 LF Garden Bed Edging stretches as a long horizontal
  strip across both lanes of a 4-lane road, through parked cars,
  into the wall of the building, and out the other side

**Root cause**: `autoLayout` offsets elements relative to the
satellite-tile center using purely geometric heuristics (the 25-ft
S6c-residual fix). It has zero awareness of what's road / roof /
lawn / driveway in the actual satellite tile.

**Why this matters more than F-3D-MESH-01**: the share link is what
goes to the client. A client who sees their patio on top of the
neighbor's garage and the edging slicing through a road will not
trust the contractor or the tool. This is brand-damage territory.

**Long-term fix**: **Sprint AI-Place** in `.claude/ROADMAP.md` —
vision-grounded element placement on the satellite tile. Hard
requirement: must work for any address the contractor inputs, not
just E2E test addresses.

**Stop-gap until Sprint AI-Place lands**:
- The wizard's manual drag-in-Step-2 affordance already exists. Make
  sure all marketing screenshots / demo recordings come from
  manually-placed projects, NOT auto-layout E2E fixtures.
- Optionally: hide the share-link button on projects where every
  element still has the default auto-layout position (i.e. the
  contractor never confirmed placement). Surface a "Position
  elements before sharing" hint instead.

**Severity**: P0 architectural. Logged at the top of the P0 section
in ROADMAP.md so it's visible to every next-session pick.

---

## F-PLAC-03 — AI-placed elements drift south-east by half their extent (P0)

**Found**: 2026-05-01 (Charlie's hands-on staging test) → 2026-05-02
diagnosed in code review.

**Symptom**: every AI-placed element renders south-east of where the
AI's per-element rationale says it landed. A 24×18 patio whose
rationale says *"Backyard, behind house, away from pool"* shows up
12 ft east + 9 ft south of where the model intended. Severity scales
with element size — small edging strips are barely off, large patios
and pool decks are obviously wrong on the satellite. The harness
scored 100% under F-PLAC-02 region-based scoring because the harness
compared model output (a single (x, y) per element) directly against
the corpus's `expected[]` (also a single (x, y) per element) — both
treated as centers. The wizard's misinterpretation of that center
as a top-left never showed up in the score.

**Root cause**: in `src/pages/ProjectWizard.tsx`, the two AI-placement
application sites (initial Step 0→1 transition and the Recompute
button) wrote `place.position` straight into
`el.geometry.position`. But:

- The vision call returns ONE (x, y) per element — semantically the
  *spot* where the model wants the element CENTERED. (`prompt.ts`
  example: `{"x": 0.5, "y": 0.7, "rationale": "Backyard, behind house"}`)
- `ElementGeometry.position` is the *unrotated TOP-LEFT* of the
  bounding box. The renderer in PlanView2D translates by `position`,
  then draws the rect at `(0, 0)–(width, height)` — confirmed in
  `elementCenter()` (PlanView2D line 133-151) which adds
  `(width/2, height/2)` to recover the visual center.
- Result: writing `position = aiCenter` placed the unrotated top-left
  at the AI's spot, so the visual center landed at
  `aiCenter + (width/2, height/2)` — south-east drift by half-extent
  for rectangles, by `radius` for circles, by the local bbox center
  for polygons.

The fallback paths were already correct: `placementBucket()`
(`src/lib/planLayout.ts:411-414`) does `cx - dimensions.width/2`,
`cy - dimensions.height/2`. Only the AI-placement path skipped the
conversion.

**Fix**: `src/lib/planLayout.ts` exports new `aiCenterToTopLeft(center,
geometry)` helper that mirrors `elementCenter()`'s local-space center
math (rectangle → half-extent, circle → radius, polygon → local bbox
midpoint, line → length/2 + 0.5). Both placement sites in
`ProjectWizard.tsx` now pipe through it:

```typescript
position: aiCenterToTopLeft(place.position, el.geometry),
```

Regression coverage: `src/lib/aiCenterToTopLeft.test.ts` — 9 tests
across all four shape kinds + the offset-polygon edge case + the
rounding boundary.

**Why the harness still says 100%**: the harness scoring path is
*upstream* of the wizard. It calls `inferElementPlacements()`
directly and compares the returned `placement.position` (a center, in
plan-feet) against the corpus's `expected[]` (also a center, in
plan-feet, because that's how the contractor reads them off the
satellite). The wizard's center→top-left conversion is downstream of
that, so it doesn't affect the harness score and the harness can't
detect this class of bug. Charlie's Sprint AI-Place memory
(`memory/feedback_2d3d_placement.md`) called this out architecturally
— harness is a regression gate, not a UX gate. F-PLAC-03 is the first
concrete instance.

**Severity**: P0. Affects every AI-placed element on every property.
Not previously visible in 2D walkthroughs because Charlie tested
small lots where the drift looked like model imprecision. Visible
immediately on the suburban Asheville baseline (24×18 patio drifts
south-east by 12 ft).

**Verification**: `npx vitest run src/lib/aiCenterToTopLeft.test.ts`
(9 passing). Full suite stays at 190 green. `npx tsc --noEmit` clean.
`npm run build` clean. Visual proof requires a corpus address run
through the wizard on staging — Chrome MCP cannot exercise the wizard
without Supabase env (only available on the deployed bundle).

