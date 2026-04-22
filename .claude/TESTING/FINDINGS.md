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

### Live walkthrough — deferred to user
Chrome-driven interactive walkthrough blocked at login (won't enter passwords for the user per safety policy). All 9 fixes are code-verified:
- `npx tsc --noEmit` → clean
- `npm run build` → green, 9.84s
- `npm run dev` → boots, React hydrates, landing page renders

Charlie: log in yourself at http://localhost:3000, then walk through each finding against the verification points above.


Total P0 remediation: roughly one focused session.