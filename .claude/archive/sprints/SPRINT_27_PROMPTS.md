# Sprint 27 — Onboarding Polish & KPI Sync

> **Goal**: Close the remaining M2 gaps — sync onboarding KPI choices to the dashboard, add a welcome banner for first-time users, add field-level help to the New Project modal, and clean up debug console logs. After this sprint, a contractor should complete signup-to-first-project in under 5 minutes without external help.
>
> **Branch**: `sprint-27-onboarding-polish`
> **Design reference**: None (follows existing design system tokens)
> **SQL migrations**: None (no schema changes)
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-27-onboarding-polish --title "Sprint 27: Onboarding Polish & KPI Sync" --body "[summary]"`

---

## CRITICAL CONTEXT

> - Onboarding wizard saves `selectedKpis` to `user_preferences` table via `upsertUserPreferences()` in `src/services/preferences.ts`.
> - Dashboard reads KPIs from `useUIStore().selectedKpis`, which defaults to `DEFAULT_SELECTED_KPIS` and is NOT loaded from Supabase.
> - `fetchUserPreferences(userId)` exists in `src/services/preferences.ts` but is only called in `Onboarding.tsx` (to check if already completed).
> - The `useUIStore` is a Zustand store with `persist` middleware — it caches `selectedKpis` in localStorage.
> - `AppLayout.tsx` already fetches org, projects, crew, materials, equipment on auth. This is the right place to also load user preferences.
> - The `HelpIcon` component from Sprint 26 is available at `src/components/shared/Tooltip.tsx`.
> - `[TF-DEBUG]` console logs exist in: `preferences.ts`, `supabaseData.ts`, `projectStore.ts`, `orgStore.ts`.
> - The `Input` component at `src/components/ui/Input.tsx` accepts a `label` prop but no `hint` or `help` prop.

---

## S27-1: Load Onboarding KPI Selections into Dashboard

**Problem/Goal**: User picks KPI priorities during onboarding (Step 3+4), but the Dashboard ignores them and shows hardcoded defaults. Fix: load `selectedKpis` from `user_preferences` on app init and sync to the UI store.

**Files to modify**:
- `src/components/layout/AppLayout.tsx` — load preferences on auth, sync KPIs to uiStore
- `src/stores/uiStore.ts` — no changes needed (already has `setSelectedKpis`)

**Implementation details**:

In `AppLayout.tsx`, after the existing data-fetch block that runs on auth, add a preference-loading step:

1. Import `fetchUserPreferences` from `@/services/preferences`.
2. Import `useUIStore` (if not already imported).
3. After the user is authenticated and org is set, call `fetchUserPreferences(user.id)`.
4. If the result has `selectedKpis` (non-null, non-empty array), call `useUIStore.getState().setSelectedKpis(prefs.selectedKpis)`.
5. If the result has `widgetLayout` (non-null, non-empty array), call `useUIStore.getState().setWidgetLayout(...)` — but ONLY if the user hasn't already customized (check localStorage `tf-ui-store` for existing layout). Actually, skip widget layout sync for now — just KPIs.
6. Guard: only run once per session. Use a `useRef<boolean>(false)` to prevent re-fetching on every render.

**Key constraint**: The Zustand `persist` middleware will cache `selectedKpis` to localStorage. So after the first load from Supabase, subsequent visits will use the cached value — which is correct. The Supabase fetch only matters for the first visit after onboarding or when localStorage is cleared (incognito).

**Supabase considerations**: `user_preferences` table, `selected_kpis` column (JSONB array of strings). Read-only operation — no RLS issues for SELECT on own row.

**Acceptance criteria**:
- [ ] Complete onboarding with "Crew Management" + "Equipment Tracking" as priorities
- [ ] Dashboard KPI strip shows the matching KPIs (not hardcoded defaults)
- [ ] Subsequent visits (same browser) retain the KPI selection
- [ ] Incognito test: login → Dashboard loads saved KPIs from Supabase
- [ ] `npm run build` passes

---

## S27-2: Welcome Banner for First-Time Users

**Problem/Goal**: After onboarding, user lands on an empty Dashboard with no transition messaging. Add a one-time welcome banner that orients the new user.

**Files to modify**:
- `src/pages/Dashboard.tsx` — add welcome banner above SetupChecklist

**Implementation details**:

Add a dismissible welcome banner that appears **only** on the first 3 visits after onboarding (tracked via `localStorage['tf-welcome-count']`).

**Banner design**:
- Full-width card, `var(--surface2)` background, `var(--border)` border, `border-radius: var(--radius-lg, 12px)`.
- Left side: "Welcome to TerrainForge!" in `var(--text)` 16px font-weight 700. Below: "Start by creating your first project, or load sample data to explore. The setup checklist below will guide you." in `var(--text-2)` 13px.
- Right side: "✕" dismiss button (`var(--text-3)`, hover `var(--text)`).
- Padding: `20px 24px`. Margin-bottom: `12px`.
- Animation: `opacity 0→1, 200ms ease-out` on mount. Respect `prefers-reduced-motion`.

**Visibility logic**:
1. On mount, read `localStorage['tf-welcome-count']`. If null, set to `1`. If < 3, increment.
2. If count > 3 or `localStorage['tf-welcome-dismissed']` is set, don't show.
3. Clicking ✕ sets `localStorage['tf-welcome-dismissed'] = 'true'`.
4. Don't show if user already has projects (not a first-time user).

**Placement**: Between the greeting header and the SetupChecklist (above the `<SetupChecklist />` div).

**Supabase considerations**: None — localStorage only.

**Acceptance criteria**:
- [ ] Fresh user after onboarding sees welcome banner
- [ ] Banner shows on first 3 visits, then auto-hides
- [ ] Clicking ✕ dismisses permanently
- [ ] User with existing projects does NOT see the banner
- [ ] `npm run build` passes

---

## S27-3: Field Help in New Project Modal

**Problem/Goal**: First-time user creating a project doesn't know what "Budget" means (labor + materials? just materials?), or why "Total area" matters. Add inline help hints to the most confusing fields.

**Files to modify**:
- `src/components/ui/Input.tsx` — add optional `hint` prop
- `src/pages/Projects.tsx` — add hints to New Project modal fields

**Implementation details**:

### Input component enhancement

Add an optional `hint?: string` prop to the `Input` component. When provided, render a small help text below the label:

```
Label text
hint text here (12px, var(--text-3), margin-top: 2px)
[input field]
```

The hint renders between the label and the input, in `font-size: 12px`, `color: var(--text-3)`, `margin-top: 2px`, `margin-bottom: 4px`.

### New Project modal hints

Add `hint` props to these fields in the New Project modal:

| Field | Hint |
|-------|------|
| Project name | "A short name for this job — e.g., 'Smith Patio' or 'Oak Creek Phase 2'" |
| Client | "The customer or property manager for this job" |
| Budget | "Total project budget including materials and labor" |
| Total area (sqft) | "Combined area of all zones — used for material quantity estimates" |
| Description | (no hint — placeholder is sufficient) |

Do NOT add hints to Start date, Target date, or Address — those are self-explanatory.

### AI Quick Create section

Add a `HelpIcon` tooltip next to "Describe your project":
- Tooltip: "Type a natural language description and AI will pre-fill the form. You can edit any field after."
- Position: right.

**Supabase considerations**: None — frontend-only.

**Acceptance criteria**:
- [ ] Input component renders hint text when prop is provided
- [ ] New Project modal shows hints on 4 fields
- [ ] HelpIcon appears next to "Describe your project" with tooltip
- [ ] Hints don't break layout on mobile (text wraps)
- [ ] `npm run build` passes

---

## S27-4: Clean Up Debug Console Logs

**Problem/Goal**: Multiple `console.log('[TF-DEBUG]')` statements left in production code. These are noisy in DevTools and make the app look unpolished. Remove or downgrade them.

**Files to modify**:
- `src/services/preferences.ts` — remove `[TF-DEBUG]` console.log/error calls
- `src/services/supabaseData.ts` — remove `[TF-DEBUG]` console.log calls (keep the `[TF-SUPABASE]` error reporter — that's intentional)
- `src/stores/projectStore.ts` — remove `[TF-DEBUG]` console.log calls
- `src/stores/orgStore.ts` — remove debug console.log calls

**Implementation details**:

**Rules**:
- **KEEP** `[TF-SUPABASE]` error logs — these report real errors via the toast system and are useful for debugging.
- **REMOVE** `[TF-DEBUG]` console.log statements — these are development artifacts.
- **KEEP** `console.warn('[TF-DIAG]')` in `diagnoseUserRole()` — that's an intentional diagnostic tool.
- **DOWNGRADE** `console.error` in catch blocks to nothing (the error is already handled by returning null or the toast system).

**Specific changes**:

In `preferences.ts`:
- Remove `console.error('[TF-DEBUG] fetchUserPreferences error:', error)` (line ~32)
- Remove `console.log('[TF-DEBUG] upsertUserPreferences payload:', payload)` (line ~49)
- Remove `console.log('[TF-DEBUG] upsertUserPreferences response:', { data, error })` (line ~51)
- Remove `console.error('[TF-DEBUG] upsertUserPreferences error:', error)` (line ~53)
- Remove `console.log('[TF-DEBUG] hasCompletedOnboarding result:', { data, error })` (line ~98)
- Remove `console.log('[TF-DEBUG] hasCompletedOnboarding org membership check:', { memberData, memberError })` (line ~113)

In `supabaseData.ts`:
- Remove `console.log('[TF-DEBUG] createProject payload:', ...)` (line ~148)
- Remove `console.log('[TF-DEBUG] createProject response:', ...)` (line ~157)
- Remove `console.log('[TF-DEBUG] createProject lat/lng:', ...)` (line ~149)
- Remove `console.log('[TF-DEBUG] deleteMaterial:` lines (lines ~459, 468, 470)
- Keep ALL `onSupabaseError(...)` calls — these are the real error reporter.

In `projectStore.ts`:
- Remove `console.log('[TF-DEBUG] fetchProjects called')` (line ~205)
- Remove `console.log('[TF-DEBUG] fetchProjects returned', ...)` (line ~209)

In `orgStore.ts`:
- Scan for any `console.error('fetchOrg:...')` or debug logs and remove them. Keep `console.warn` for genuine warnings.

**Supabase considerations**: None — code cleanup only.

**Acceptance criteria**:
- [ ] No `[TF-DEBUG]` strings appear in codebase (verify with grep)
- [ ] `[TF-SUPABASE]` error reporter still works (intentional errors still show in console + toast)
- [ ] `[TF-DIAG]` diagnostic in `diagnoseUserRole()` is preserved
- [ ] `npm run build` passes

---

## S27-5: Billing Trial Banner Enhancement

**Problem/Goal**: First-time users don't realize they're on a trial until it expires. Make the trial status more visible on the Billing page.

**Files to modify**:
- `src/pages/Billing.tsx` — add trial status banner at top

**Implementation details**:

At the top of the Billing page (above the pricing tiers), add a contextual status banner:

**If `org.subscriptionStatus === 'trialing'`**:
- Banner: `var(--status-blue-bg)` background, `var(--status-blue)` text, `border-radius: var(--radius-md, 8px)`, padding `14px 18px`.
- Icon: "ℹ️" left-aligned.
- Text: "You're on a **14-day free trial**. Choose a plan below to continue after your trial ends." (bold "14-day free trial").
- If `org.trialEndsAt` is set, calculate days remaining and show: "**X days remaining** in your free trial."

**If `org.subscriptionStatus === 'active'`**:
- Banner: `var(--status-green-bg)` background, `var(--status-green)` text.
- Text: "Your **{tier}** plan is active." (capitalize tier name).

**If `org.subscriptionStatus === 'past_due'`**:
- Banner: `var(--status-red-bg)` background, `var(--status-red)` text.
- Text: "Your payment is past due. Please update your payment method to avoid service interruption."

**If `org.subscriptionStatus === 'canceled'`**:
- Banner: `var(--status-amber-bg)` background, `var(--status-amber)` text.
- Text: "Your subscription has been canceled. Choose a plan to reactivate."

**Supabase considerations**: Reads `org.subscriptionStatus`, `org.subscriptionTier`, `org.trialEndsAt` from orgStore — no additional queries.

**Acceptance criteria**:
- [ ] Trialing user sees blue "14-day free trial" banner with days remaining
- [ ] Active user sees green "plan is active" banner
- [ ] Past-due user sees red warning banner
- [ ] Canceled user sees amber reactivation banner
- [ ] Banner renders above pricing tiers
- [ ] `npm run build` passes

---

## Execution Order

1. **S27-1** — KPI sync (core onboarding-to-dashboard fix)
2. **S27-2** — Welcome banner (depends on Dashboard, quick after S27-1)
3. **S27-3** — Field help in New Project modal (standalone)
4. **S27-4** — Debug log cleanup (standalone, safe to do anytime)
5. **S27-5** — Billing trial banner (standalone)

---

## SQL Migrations Required

**None.** This sprint is entirely frontend.

---

## Post-Sprint Test Plan

> Open `http://localhost:3000` in **incognito** (clean localStorage). Create a new test account or use existing.

1. **KPI sync**: Complete onboarding, select "Crew Management" + "Equipment Tracking" as priorities. Land on Dashboard → verify KPI strip shows crew and equipment metrics (not defaults). Close incognito, reopen, login → verify KPIs persist.
2. **Welcome banner**: After onboarding, Dashboard shows "Welcome to TerrainForge!" banner. Visit Dashboard 3 times → banner auto-hides on 4th. Click ✕ → banner gone permanently. Existing user with projects → no banner.
3. **Field help**: Click "+ New Project" on Projects page. Verify hints appear under Project name, Client, Budget, Total area fields. Verify HelpIcon tooltip next to "Describe your project".
4. **Debug logs**: Open DevTools console. Navigate through all pages. Verify NO `[TF-DEBUG]` logs. Verify `[TF-SUPABASE]` errors still show when they should (e.g., trigger a known error).
5. **Billing banner**: Navigate to Billing page. Verify trial status banner appears at top with correct status and day count.
6. **Full flow**: signup → onboarding → dashboard (banner + checklist + KPIs) → create project (field hints) → view schedule → billing. Should feel guided and polished.
7. **Console check**: No unexpected errors throughout the full flow.
