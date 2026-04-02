# Sprint 44.5 — Hotfix: Manifest Navigation + Widget Persistence (2 Remaining Failures)

> **Goal**: Fix the last 2 blockers before production deploy. Both have failed in previous sprints — Code must investigate root causes thoroughly before writing fixes.
>
> **Single sprint** (not a batch). Create a PR when done.
> **Branch**: `sprint-44-5-hotfix`
> **Design reference**: None
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-44-5-hotfix --title "Sprint 44.5: Manifest nav + widget persistence hotfix" --body "Fixes last 2 Sprint 43/44 failures: ManifestEngine back navigation and dashboard widget layout persistence."`

---

## CRITICAL CONTEXT

> **These two bugs have now failed testing TWICE.** Previous fix attempts patched symptoms without finding root causes. This sprint requires a different approach: READ FIRST, understand the full flow, THEN fix.
>
> **Manifest back navigation history**:
> - Sprint 43: Added "Back to Manifest Projects" button → testing showed it navigated to Dashboard (`/`)
> - Sprint 44: Changed to use local `selectedProjectId` state → testing showed it navigated to Schedule page
> - The fact that it went to TWO DIFFERENT wrong destinations means the back button Code added may not be the one the user is clicking, OR there's a competing navigation action
>
> **Widget layout persistence history**:
> - Sprint 43: Added `setWidgetLayout` to uiStore, load from `user_preferences` on login → custom layout not preserved
> - Sprint 44: Fixed stale closure in `debouncedSaveLayout` → custom layout STILL not preserved
> - Default layout correctly loads for new accounts (this works). Only the "save custom layout" → "reload on login" round-trip is broken.
>
> **General context**:
> - React 18 + Vite + TypeScript + Zustand + Supabase
> - ManifestEngine is at `/manifest` route, component at `src/pages/ManifestEngine.tsx`
> - Widget/layout state in `src/stores/uiStore.ts`
> - User preferences stored in Supabase `user_preferences` table
> - RLS requires `org_id` — violations return 0 rows silently

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] Dashboard loads for authenticated users
> - [ ] Sample data load completes without console errors
> - [ ] Project cards show correct task completion counts
> - [ ] Materials tab in sample project shows zone-grouped materials
> - [ ] Resources tab shows crew and equipment
> - [ ] Schedule page shows sample entries
> - [ ] clearSampleData removes all data
> - [ ] `npm run build` passes

---

## S44.5-1: Fix ManifestEngine Back Navigation (P0) — THIRD ATTEMPT

**Problem**: After clicking a project card in ManifestEngine and viewing its manifest details, clicking "back" navigates AWAY from `/manifest` instead of returning to the ManifestEngine project card list.

**History of failures**:
- S43: Back went to Dashboard (`/`)
- S44: Back went to Schedule page
- The destination changes each time, which strongly suggests `navigate(-1)` (browser history back) is being used somewhere — the destination depends on what page the user visited before `/manifest`

**MANDATORY INVESTIGATION (do ALL of these before writing ANY code)**:

1. **Read `src/pages/ManifestEngine.tsx` completely** — understand its full structure. Document:
   - Does it use internal state to toggle between "project list" and "project detail" views?
   - Does clicking a project card navigate to a different route (e.g., `/projects/:id`)?
   - How many "back" or "return" buttons/links exist in the component?

2. **Search the ENTIRE codebase** for navigation calls that could fire from ManifestEngine:
   - `grep -r "navigate(" src/pages/ManifestEngine.tsx` — find ALL navigate calls in the file
   - `grep -r "navigate(-1)" src/` — find any browser-history-back usage anywhere
   - `grep -r "navigate('/')" src/pages/ManifestEngine.tsx` — find any home navigation
   - Check if ManifestEngine imports or uses a shared component (like PageHeader) that has its own back button with `navigate(-1)` or `navigate('/')`

3. **Trace the user flow step by step**:
   - User is on `/manifest` → sees project cards
   - User clicks a project card → what happens? (state change? route change? both?)
   - User sees manifest details → where is the "back" button? Which component renders it?
   - User clicks "back" → what function fires? trace it to the actual `navigate()` call

4. **Check for competing navigation**:
   - Does ManifestEngine use a `PageHeader` with a back button?
   - Does the project detail view have its own back button?
   - Is there a breadcrumb component with navigation?
   - Could two back buttons be stacked (one visible, one hidden but clickable)?

**Fix requirements**:
- The back action from manifest project detail view MUST use `navigate('/manifest')` (explicit path) — NOT `navigate(-1)` (browser history)
- If ManifestEngine uses internal state (`selectedProjectId`), the back action should clear that state AND stay on `/manifest`
- Remove or override ANY `navigate(-1)` call in the manifest back-navigation path
- If a shared component (PageHeader, breadcrumb) adds a `navigate(-1)` back button, override it for ManifestEngine specifically

**Self-verification**:
- [ ] `npm run build` passes
- [ ] List ALL `navigate()` calls in ManifestEngine.tsx — document each one in the commit message
- [ ] The back/return button from manifest project detail uses `navigate('/manifest')` or clears `selectedProjectId` while staying on `/manifest`
- [ ] NO `navigate(-1)` exists in the ManifestEngine back-navigation path
- [ ] NO `navigate('/')` exists in the ManifestEngine back-navigation path
- [ ] If PageHeader has a back button, confirm it's overridden or hidden in ManifestEngine

**Acceptance criteria** (Charlie verifies):
- [ ] Go to Manifest → click a project → see manifest details → click back → return to ManifestEngine project card list
- [ ] URL stays `/manifest` throughout (or returns to `/manifest` after back)

---

## S44.5-2: Fix Widget Layout Persistence (P1) — THIRD ATTEMPT

**Problem**: When a user rearranges dashboard widgets, signs out, and signs back in, the custom layout is gone — default layout loads instead. This has failed two previous fix attempts.

**History of failures**:
- S43: Added `setWidgetLayout` + load from `user_preferences` → not preserved
- S44: Fixed stale closure in debounced save → STILL not preserved
- Meanwhile: default layout correctly loads for new accounts (no cross-account bleed) — this means the READ path from `user_preferences` works for defaults but doesn't carry saved custom layouts

**MANDATORY INVESTIGATION (do ALL of these before writing ANY code)**:

**Part A — Trace the SAVE path (what happens when user rearranges widgets)**:

1. Read `src/stores/uiStore.ts` completely — find:
   - The widget layout state shape (what does it look like?)
   - The `setWidgetLayout` action — what does it do?
   - Any debounced save function — what does it call?
   - Any `persist` middleware config — what key does it use?

2. Find the widget rearrange handler — search for:
   - `grep -r "setWidgetLayout" src/` — where is it called from?
   - `grep -r "onLayoutChange" src/` or `grep -r "onDragEnd" src/` or similar drag handlers
   - The Dashboard component that renders widgets — find the drag/resize handler

3. Trace the save chain:
   - User drags widget → handler fires → does it call `setWidgetLayout()`?
   - `setWidgetLayout()` → does it call a Supabase save function?
   - The Supabase save function → does it actually fire? Does it succeed?
   - **Add a temporary `console.log('[WIDGET-DEBUG] saving layout:', layout)` at the Supabase save call site** to confirm it fires

4. Check the Supabase save:
   - What column in `user_preferences` stores the layout? (e.g., `widget_layout`, `preferences`, `layout_json`)
   - Is it a JSONB column? Does the save use `.upsert()` or `.update()`?
   - Does it include the user ID and org_id in the query?
   - Could RLS be blocking the UPDATE/UPSERT silently?

**Part B — Trace the LOAD path (what happens when user signs in)**:

5. Find where widget layout is loaded on sign-in:
   - `grep -r "user_preferences" src/` — find all reads
   - `grep -r "widget_layout\|widgetLayout\|widget_config" src/` — find the specific field
   - When auth completes, does the app fetch user_preferences?
   - Does it call `setWidgetLayout()` with the fetched data?

6. **Check for initialization race condition**:
   - Does Zustand's `persist` middleware hydrate from localStorage BEFORE the Supabase fetch completes?
   - If so: localStorage has the default layout → Zustand hydrates with default → Supabase fetch returns saved layout → but does anything call `setWidgetLayout()` with it?
   - Or: Supabase fetch completes → `setWidgetLayout()` called → but then Zustand persist hydrates from localStorage and OVERWRITES the Supabase data?

7. **Check the persist middleware merge strategy**:
   - Does uiStore use `persist` with `merge` or `partialize`?
   - Is the widget layout included in the persisted state?
   - On sign-out, is the localStorage entry cleared?

**Part C — Verify the round-trip**:

8. After understanding both paths, add these temporary debug logs:
   ```typescript
   // In the save function:
   console.log('[WIDGET-SAVE] Saving to Supabase:', JSON.stringify(layout));
   
   // In the load function:
   console.log('[WIDGET-LOAD] Loaded from Supabase:', JSON.stringify(result));
   
   // In setWidgetLayout:
   console.log('[WIDGET-SET] Setting layout:', JSON.stringify(layout));
   ```
   
   These logs will prove whether save fires, whether load returns the saved data, and whether setWidgetLayout receives it. **Remove all debug logs before committing.**

**Fix requirements** (based on what the investigation reveals):

The full round-trip must work:
1. **SAVE**: Widget rearrange → uiStore updates → Supabase `user_preferences` row updated with new layout (verify the upsert/update actually succeeds — log the Supabase response)
2. **LOAD**: User signs in → `user_preferences` fetched → layout extracted → `setWidgetLayout()` called → Dashboard renders with saved layout
3. **No race condition**: Supabase fetch result must win over localStorage/default hydration. If Zustand persist hydrates first, the Supabase load must overwrite it.
4. **Sign-out cleanup**: On sign out, clear the widget layout from localStorage so the next user gets defaults (this part already works — don't break it)

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Traced the SAVE path: widget rearrange → Supabase save (confirm it fires and succeeds)
- [ ] Traced the LOAD path: sign-in → Supabase fetch → `setWidgetLayout()` (confirm it fires with saved data)
- [ ] No race condition between Zustand persist hydration and Supabase load
- [ ] All temporary debug `console.log` statements removed before commit
- [ ] Sign out clears widget state (default loads for new account)

**Acceptance criteria** (Charlie verifies):
- [ ] Rearrange widgets → sign out → sign in → custom layout is preserved
- [ ] Sign in with different account → default layout (no bleed)
- [ ] New account → default layout

---

## Execution Order

1. **S44.5-1** — Manifest navigation (P0, quick once root cause found)
2. **S44.5-2** — Widget persistence (P1, more investigation needed)

---

## SQL Migrations Required

**None.**

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] Manifest: project card → manifest detail → back → returns to `/manifest` project cards
- [ ] Widget: rearrange → sign out → sign in → custom layout preserved
- [ ] Widget: new account → default layout
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] **No `console.log` debug statements left** — search for `WIDGET-DEBUG`, `WIDGET-SAVE`, `WIDGET-LOAD`, `WIDGET-SET`
- [ ] `git diff --stat` — only expected files modified

### Charlie's Test Plan (after merge):
> Open `http://localhost:3000` in **incognito** (clean localStorage).

1. Load sample data on a fresh account (regression — should still work)
2. Dashboard — default widget layout
3. **Manifest → click project → view manifest → click back → /manifest project cards** (NOT Dashboard, NOT Schedule)
4. **Rearrange dashboard widgets → sign out → sign in same account → custom layout preserved**
5. Sign in different account → default layout (no bleed)
6. Resources tab still shows crew + equipment (regression)
7. Schedule page still shows sample entries (regression)
8. Clear sample data → all removed (regression)
9. Console check: no errors, no debug logs

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
