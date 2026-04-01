# Sprint 39 — Trial Experience & Conversion Flow

> **Goal**: Build the 14-day free trial experience. New signups get a trial automatically. The app shows trial status, countdown, and nudges at Day 7 and Day 13. On Day 14, the account downgrades to read-only. After this sprint, the complete trial-to-paid pipeline works end-to-end.
>
> **Part of batch**: Sprints 38-40. Do NOT create a PR after this sprint. Continue to SPRINT_40_PROMPTS.md.
> **Design reference**: `.claude/DESIGN_SYSTEM.md` — brand colors, typography
> **SQL migrations**: `supabase/migrations/012_trial_columns.sql` — file already exists, Charlie already ran it in Pre-Flight. Code does NOT need to create or modify this file.

---

## CRITICAL CONTEXT

> - Sprint 38 adds `useSubscription()` hook, `SubscriptionGuard`, and billing UI — this sprint depends on those
> - The organizations table has `subscription_status` (TEXT) — values: `trialing`, `active`, `past_due`, `canceled`, `none`
> - The app does NOT use Stripe's built-in trial (Stripe trial_period_days). Instead, we track the trial locally:
>   - `trial_starts_at` — set on org creation (signup)
>   - `trial_ends_at` — 14 days after trial_starts_at
>   - `subscription_status` = `'trialing'` during trial, `'none'` after expiry (if they didn't subscribe)
> - Why local trial tracking (not Stripe): Users don't enter a credit card to start the trial. Stripe trials require a payment method. Our trial is pre-Stripe.
> - After trial expires, the user sees a paywall / read-only state until they subscribe
> - Pricing: Starter $49/mo, Pro $99/mo, Business $199/mo
> - React 18 + Vite + TypeScript + Tailwind CSS
> - Brand color: `#2D6A4F` (green). Dark theme is primary.

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] `/login` page still renders and login works
> - [ ] `/signup` page still renders
> - [ ] Authenticated users can still access `/` (Dashboard)
> - [ ] Project wizard at `/projects/wizard` still loads
> - [ ] Crew app at `/crew/login` still loads
> - [ ] Settings page at `/settings` still loads
> - [ ] SubscriptionGuard from Sprint 38 still works
> - [ ] Billing page still shows plan cards

---

## S39-1: Trial Tracking Migration

**Problem/Goal**: The organizations table needs columns to track trial start/end dates independently of Stripe, since the trial is pre-payment.

**Current state**: Migration `012_trial_columns.sql` already exists at `supabase/migrations/012_trial_columns.sql` and Charlie has already run it in Supabase SQL Editor. The organizations table now has `trial_starts_at` (TIMESTAMPTZ) and `trial_ends_at` (TIMESTAMPTZ) columns. A BEFORE INSERT trigger (`set_trial_defaults`) automatically sets these columns + `subscription_status = 'trialing'` for new orgs. Existing orgs were backfilled with a 14-day trial.

**Files to create**: None — migration file already exists.

**Implementation details**: This task is already complete. Verify the migration file exists at `supabase/migrations/012_trial_columns.sql` and move on.

**Self-verification**:
- [ ] File exists at `supabase/migrations/012_trial_columns.sql`

---

## S39-2: Trial Banner Component

**Problem/Goal**: Trialing users need to see how many days remain in their trial, with escalating urgency as expiry approaches. This is the primary conversion driver.

**Current state**: No trial awareness in the UI. The `useSubscription()` hook from Sprint 38 knows `status = 'trialing'` but doesn't expose trial dates or days remaining.

**Files to create**:
- `src/components/TrialBanner.tsx` — **NEW FILE**

**Files to modify**:
- `src/hooks/useSubscription.ts` — extend to include trial dates and days remaining
- `src/components/SubscriptionGuard.tsx` — integrate TrialBanner for trialing users

**Implementation details**:

### useSubscription Extension
Add to the hook's return value:
- `trialEndsAt: string | null` — ISO timestamp
- `trialDaysRemaining: number | null` — computed from trialEndsAt vs now
- Fetch `trial_starts_at` and `trial_ends_at` from organizations table alongside existing fields

### TrialBanner Component
A persistent banner shown to trialing users inside the app layout (below the nav bar).

**Visual states by days remaining**:

**Days 14-8** (relaxed):
- Background: `var(--brand-primary)` (#2D6A4F) at 15% opacity
- Text: "You're on a 14-day free trial. [X] days remaining."
- Right side: "Choose a Plan" link → navigates to `/settings` (billing section)
- Height: 40px, small text (14px)

**Days 7-3** (nudge):
- Background: `#92400E` at 20% opacity (amber)
- Text: "Your free trial ends in [X] days. Subscribe now to keep your projects."
- Right side: "View Plans" button (small, outlined, amber)
- Height: 44px

**Days 2-1** (urgent):
- Background: `#991B1B` at 20% opacity (red)
- Text: "Your trial ends tomorrow!" or "Your trial ends today! Subscribe now to keep full access."
- Right side: "Subscribe Now" button (solid red/orange)
- Height: 48px

**Day 0 / Expired**:
- This state should not show the banner — the SubscriptionGuard handles expired trials (status changes to 'none' or 'canceled')

### Dismiss Behavior
- The relaxed banner (Days 14-8) can be dismissed for the session (use React state, not localStorage)
- The nudge and urgent banners CANNOT be dismissed

### TrialBanner Integration
In `SubscriptionGuard.tsx`, when status is `'trialing'`:
- Render `<TrialBanner daysRemaining={trialDaysRemaining} />` above the children
- The banner sits between the nav bar and the page content

**Supabase considerations**: Read `trial_ends_at` from organizations table. Same query as useSubscription, just adding the column.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] TrialBanner renders for all day ranges (14-8, 7-3, 2-1)
- [ ] useSubscription returns trialDaysRemaining as a number
- [ ] Banner does not render for non-trialing users
- [ ] No hardcoded dates — all computed from trial_ends_at

---

## S39-3: Trial Expiry & Read-Only Downgrade

**Problem/Goal**: When the 14-day trial expires without a subscription, the user loses write access. They can still view their data but can't create or edit projects, materials, etc. This creates urgency to subscribe.

**Current state**: The SubscriptionGuard from Sprint 38 blocks `'none'` and `'canceled'` users entirely. We need a softer "read-only" mode for expired trials so users can still see their data (and feel the loss).

**Files to create**:
- `src/components/TrialExpiredOverlay.tsx` — **NEW FILE**

**Files to modify**:
- `src/components/SubscriptionGuard.tsx` — add expired-trial handling (read-only mode)
- `src/hooks/useSubscription.ts` — add `isExpiredTrial` boolean

**Implementation details**:

### useSubscription: isExpiredTrial
Add a computed boolean:
- `isExpiredTrial`: true when `subscription_status` is `'none'` AND `trial_ends_at` is in the past AND `trial_starts_at` is not null (meaning they HAD a trial, it expired, and they never subscribed)
- This distinguishes "expired trial" from "never had an account" (though in practice, the trigger from S39-1 means all orgs get a trial)

### SubscriptionGuard: Read-Only Mode
Update the guard to handle expired trials differently:

- **`'active'` or `'trialing'`** → full access (unchanged)
- **`'past_due'`** → full access + warning banner (unchanged)
- **Expired trial (`isExpiredTrial = true`)** → NEW: render children (read-only) + TrialExpiredOverlay
- **`'canceled'` (was paying, now canceled)** → redirect to billing (unchanged)
- **`'none'` (no trial history)** → redirect to billing (unchanged — but this case shouldn't happen with the S39-1 trigger)

### TrialExpiredOverlay Component
A semi-transparent overlay that sits on top of the app content:

**Design**:
- Full viewport overlay, z-index above content but below nav
- Semi-transparent black backdrop: `rgba(0, 0, 0, 0.6)`
- Centered card (max-width 480px):
  - Background: `#1A1A1A`, border-radius 16px, padding 40px
  - Headline: "Your trial has ended" — white, 28px, bold
  - Body: "Your projects and data are still here. Subscribe to pick up where you left off." — `rgba(255,255,255,0.7)`, 16px
  - Primary CTA: "Choose a Plan" — green button (#2D6A4F), full width, navigates to `/settings` (billing section)
  - Secondary: "View Your Data (Read Only)" — ghost button, dismisses overlay for this session
- When dismissed, the user can browse but all "Add", "Edit", "Delete" buttons should be visually disabled

### Disabling Write Actions
When `isExpiredTrial` is true, the following should be disabled:
- "Add Project" / "New Project" buttons
- Inline edit forms (task CRUD, budget editing, material editing)
- Project wizard access (redirect back with toast message)
- Equipment/Crew/Materials "Add" buttons

**Implementation approach**: Add a `readOnly` prop to the `useSubscription` hook context. Components that perform write actions should check `readOnly` and disable the action (gray out button + show tooltip "Subscribe to edit").

**IMPORTANT**: Do NOT disable navigation or data viewing. The user must be able to:
- View all their projects, dashboards, materials, etc.
- Access Settings and Billing (to subscribe)
- View the landing page
- Log out

**Supabase considerations**: None — all enforcement is frontend. Supabase RLS still allows reads regardless of subscription status.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] isExpiredTrial returns true when trial_ends_at is past and status is 'none'
- [ ] TrialExpiredOverlay renders with correct content
- [ ] Overlay can be dismissed
- [ ] Write action buttons check readOnly state
- [ ] Navigation and data viewing still work in read-only mode
- [ ] Settings/Billing remain accessible

---

## Execution Order

1. **S39-1** — Verify migration file exists (quick check, then move on)
2. **S39-2** — Trial banner (extends useSubscription, adds banner component)
3. **S39-3** — Trial expiry & read-only downgrade (depends on S39-2's hook extensions)

---

## SQL Migrations Required

**`012_trial_columns.sql`** — File already exists at `supabase/migrations/012_trial_columns.sql`. Charlie ran this during batch Pre-Flight. No action needed.

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] Migration file exists at `supabase/migrations/012_trial_columns.sql`
- [ ] useSubscription hook returns trial fields (trialEndsAt, trialDaysRemaining, isExpiredTrial)
- [ ] TrialBanner renders correctly for days 14-8, 7-3, 2-1
- [ ] TrialExpiredOverlay blocks write actions but allows navigation
- [ ] SubscriptionGuard handles all subscription states (active, trialing, past_due, expired trial, canceled, none)
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] No console.log debug statements left

### Charlie's Test Plan (after batch merge):
1. Verify migration 012 was run in Pre-Flight
2. Open app in incognito, sign in — should see trial banner (backfill gave your account a trial)
3. Check trial banner shows correct days remaining
4. Navigate to Settings → Billing — should show current trial status
5. To test expiry: temporarily update your org's `trial_ends_at` to a past date in Supabase, refresh app
6. Should see TrialExpiredOverlay — dismiss it, verify read-only mode (buttons disabled)
7. Reset `trial_ends_at` to future date, refresh — should be back to normal
8. Verify all pages still load, no console errors

### Batch Continuation:
> **Do NOT create a PR. Do NOT stop. Continue immediately to SPRINT_40_PROMPTS.md.**
