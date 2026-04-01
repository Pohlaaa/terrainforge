# Sprint 38 — S37 Bug Fixes + Subscription Enforcement & Billing UI

> **Goal**: Fix three bugs from Sprint 37 testing (lost data on login, sign-out routing, onboarding escape), then wire the existing Stripe backend to the frontend so the app enforces subscription status, shows plan info on the Billing page, and gates features for unpaid users.
>
> **Part of batch**: Sprints 38-40. Do NOT create a PR after this sprint. Continue to SPRINT_39_PROMPTS.md.
> **Design reference**: `.claude/DESIGN_SYSTEM.md` — brand colors, typography
> **SQL migrations**: None for this sprint. NOTE: Sprint 39 requires `supabase/migrations/012_trial_columns.sql` — Charlie runs it in Pre-Flight before the batch starts.

---

## CRITICAL CONTEXT

> - Stripe backend is COMPLETE: `supabase/functions/stripe-webhook/index.ts` handles 4 event types
> - `supabase/functions/create-checkout-session/index.ts` creates Checkout Sessions with `metadata.org_id`
> - `supabase/functions/create-portal-session/index.ts` opens the Billing Portal
> - `src/services/stripe.ts` has `createCheckoutSession()`, `createPortalSession()`, `getSubscriptionStatus()`
> - The `organizations` table columns: `stripe_customer_id`, `subscription_status` (TEXT), `subscription_tier` (TEXT), `subscription_ends_at` (TIMESTAMPTZ)
> - Valid subscription_status values: `'trialing' | 'active' | 'past_due' | 'canceled' | 'none'`
> - Valid subscription_tier values: `'starter' | 'pro' | 'business'`
> - `SubscriptionStatus` type is imported from `@/types` in stripe.ts — verify it exists there, add if missing
> - Pricing: Starter $49/mo, Pro $99/mo, Business $199/mo
> - Tier limits: Starter = 5 projects / 1 user, Pro = 25 projects / 5 users, Business = unlimited / 15 users
> - The app uses React 18 + Vite + TypeScript + Tailwind CSS + Zustand for state
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
> - [ ] Existing Stripe functions (`createCheckoutSession`, `createPortalSession`, `getSubscriptionStatus`) still work without errors

---

## S38-0: Sprint 37 Bug Fixes (P0)

**Problem/Goal**: Three issues found during Sprint 37 testing that must be fixed before continuing.

**Current state**: Landing page works, but three bugs affect the login/logout/onboarding flow.

**Bug 1 — Existing accounts lose data on login**:
Some existing accounts that previously had data saved do not load their data after signing in. Some accounts are unexpectedly routed into the onboarding workflow even though they already completed it.

**Investigation steps**:
1. Read the auth flow: how does the app decide whether to show Dashboard vs. onboarding? Look for the onboarding check logic (likely checks a flag on the org or user profile, or checks whether setup checklist items are complete).
2. The landing page changes in Sprint 37 modified the root `/` route. Verify the auth redirect logic still correctly passes the user to Dashboard when they have an existing org.
3. Check if the onboarding check depends on data that the landing page route change may have disrupted (e.g., loading org data before the redirect happens).

**Fix approach**: The root cause is likely one of:
- The auth state isn't fully loaded before the routing decision is made (race condition)
- The onboarding completion flag isn't being checked correctly after the Sprint 37 route changes
- The org data fetch that determines "has data" runs after the route redirect

**Bug 2 — Sign-out goes to `/login` instead of landing page**:
After signing out, the user should see the landing page (unauthenticated `/`), not `/login`.

**Fix**: Find the sign-out handler (likely in a header/sidebar component or auth service). Change the post-logout redirect from `/login` to `/`. Since Sprint 37 set up unauthenticated `/` to show the landing page, this should work automatically.

**Bug 3 — No way to exit onboarding without signing out**:
Once the onboarding workflow begins, there's no way for the user to back out or skip it.

**Fix**: Add a "Skip" or "Set up later" link to the onboarding page. This should:
- Mark onboarding as dismissed (so the user isn't redirected back)
- Navigate to Dashboard `/`
- Place the link at the top-right or bottom of the onboarding component
- Style: subtle text link, not a button (e.g., `rgba(255,255,255,0.5)`, 14px, "Skip for now →")

**Files to modify**: Read and investigate first — the exact files depend on how auth routing and onboarding are structured. Likely candidates:
- `src/App.tsx` (routing)
- `src/pages/Onboarding.tsx` or similar
- Auth service or auth context/hook
- Sidebar or header component (sign-out handler)

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Sign-out redirects to `/` (landing page), not `/login`
- [ ] Onboarding page has a skip/exit option
- [ ] Auth routing logic handles existing users with data (no regression to onboarding)

---

## S38-1: Subscription Types & Store

**Problem/Goal**: The app needs frontend types for subscription state and a way to access the current org's subscription status globally. Currently `SubscriptionStatus` may or may not exist in `src/types/index.ts` and there is no Zustand store or context for subscription data.

**Current state**: `stripe.ts` imports `SubscriptionStatus` from `@/types` but the type may not be defined there (it's defined locally in the webhook handler). No `SubscriptionTier` type exists on the frontend. No global state for subscription info.

**Files to modify**:
- `src/types/index.ts` — add subscription types if missing
- `src/stores/` or `src/hooks/` — new hook or store for subscription state

**Implementation details**:

### Types (src/types/index.ts)
Add these if not already present:
```typescript
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';
export type SubscriptionTier = 'starter' | 'pro' | 'business' | null;

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  endsAt: string | null;  // ISO timestamp
}
```

### Subscription Hook (src/hooks/useSubscription.ts) — NEW FILE
Create a React hook that:
1. Fetches subscription status from the organizations table on mount (use existing `getSubscriptionStatus` pattern)
2. Also fetches `subscription_tier` and `subscription_ends_at`
3. Returns `{ status, tier, endsAt, isActive, isTrial, isPastDue, isCanceled, isFreeTier, loading }`
4. Computed booleans:
   - `isActive` = status is `'active'` or `'trialing'`
   - `isTrial` = status is `'trialing'`
   - `isPastDue` = status is `'past_due'`
   - `isCanceled` = status is `'canceled'`
   - `isFreeTier` = status is `'none'` (never subscribed)
5. Cache in a simple React context or local state — doesn't need Zustand for this
6. Refetch on window focus (in case user just completed checkout in another tab)

**Supabase considerations**: Read from `organizations` table filtered by `owner_id`. RLS allows org members to read their own org.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Types are exported from `@/types`
- [ ] No duplicate type definitions (check stripe.ts import still resolves)
- [ ] Hook returns all documented fields

---

## S38-2: Subscription Guard Component

**Problem/Goal**: Certain routes should be gated based on subscription status. A canceled or `none` user should see a paywall, not the full app. A `past_due` user should see a warning banner but still have access temporarily.

**Current state**: No subscription enforcement exists. All authenticated users can access all features regardless of payment status.

**Files to create**:
- `src/components/SubscriptionGuard.tsx` — **NEW FILE**

**Files to modify**:
- `src/App.tsx` — wrap protected routes with SubscriptionGuard

**Implementation details**:

### SubscriptionGuard Component
A wrapper component that checks subscription status:

**Allowed statuses** (full access): `'active'`, `'trialing'`
**Warning statuses** (access + banner): `'past_due'`
**Blocked statuses** (redirect to billing): `'canceled'`, `'none'`

```
<SubscriptionGuard>
  <AppLayout>
    {/* all manager app routes */}
  </AppLayout>
</SubscriptionGuard>
```

Behavior:
- `active` or `trialing` → render children normally
- `past_due` → render children + show a persistent top banner: "Your payment failed. Please update your payment method to avoid losing access." with a "Update Payment" button that calls `createPortalSession()`
- `canceled` or `none` → redirect to `/billing` (or show inline paywall if `/billing` doesn't exist as standalone route)

**IMPORTANT**: Do NOT gate these routes behind SubscriptionGuard:
- `/login`, `/signup`, `/forgot-password` (already public)
- `/landing` (public marketing page)
- `/crew/*` (crew app has separate auth)
- `/onboarding` (needs to be accessible for new signups before they subscribe)
- `/billing` or `/settings` (user needs access to manage subscription)

### Past Due Banner Styling
- Background: `#7C2D12` (dark orange/red), white text
- Full width, fixed at top of page (below nav), 48px height
- "Update Payment" button: white border, white text, ghost style
- Z-index above content but below modals

**Supabase considerations**: None — uses the useSubscription hook from S38-1.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] SubscriptionGuard wraps the correct routes in App.tsx
- [ ] Public routes are NOT wrapped
- [ ] Component handles all 5 status values

---

## S38-3: Billing Page Redesign

**Problem/Goal**: The existing Billing page (in Settings, or standalone) needs to show the current plan, subscription status, and allow plan changes. Currently it may just have a "Manage Billing" button that opens Stripe Portal.

**Current state**: There is a Billing section in Settings (`/settings`). It likely has basic Stripe Portal integration but doesn't show plan details or subscription state.

**Files to modify**:
- Find the existing Billing component (likely `src/pages/Settings.tsx` or a sub-component) — read it first
- May need to create `src/components/billing/PlanCard.tsx` — **NEW FILE if needed**

**Implementation details**:

### Billing Section Content
The billing section (whether in Settings or standalone) should show:

**1. Current Plan Card**:
- Plan name (Starter / Pro / Business) with tier badge
- Price per month
- Status badge: "Active" (green), "Trial" (blue), "Past Due" (orange), "Canceled" (red), "No Plan" (gray)
- If trialing: "Your trial ends on [date]" with days remaining
- If canceled: "Access until [subscription_ends_at]" if date is in future
- "Change Plan" button → opens Stripe Portal
- "Cancel Subscription" button → opens Stripe Portal (only if active)

**2. Plan Comparison** (if no active subscription):
Show the 3 pricing tiers (same data as landing page):
- Starter ($49/mo): 5 active projects, 1 user
- Pro ($99/mo): 25 active projects, 5 users — "Most Popular" badge
- Business ($199/mo): Unlimited projects, 15 users
- Each with "Subscribe" button that calls `createCheckoutSession(priceId, orgId)`

**3. Payment Method**:
- "Manage Payment Method" button → opens Stripe Portal

### Price IDs
The Price IDs come from environment variables (set in Netlify):
- `VITE_STRIPE_PRICE_STARTER`: Stripe Price ID for Starter plan
- `VITE_STRIPE_PRICE_PRO`: Stripe Price ID for Pro plan
- `VITE_STRIPE_PRICE_BUSINESS`: Stripe Price ID for Business plan

Read these via `import.meta.env.VITE_STRIPE_PRICE_STARTER` etc.

### Styling
- Use existing Settings page styling patterns (card backgrounds, borders)
- Status badges: use CSS custom properties for colors
- Plan cards: same style as landing page pricing cards (dark cards, green highlight on Pro)

**Supabase considerations**: Uses `useSubscription()` hook. Checkout calls go through existing Edge Functions.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Billing section shows current plan status
- [ ] Subscribe buttons call createCheckoutSession with correct Price IDs
- [ ] Portal buttons call createPortalSession
- [ ] Handles all subscription states gracefully (no crashes on 'none')

---

## Execution Order

1. **S38-0** — Sprint 37 bug fixes (P0 — fix before building on top)
2. **S38-1** — Types and hook (foundation — everything else depends on this)
3. **S38-2** — Subscription guard (uses hook)
4. **S38-3** — Billing page (uses hook + checkout functions)

---

## SQL Migrations Required

**None.** The `organizations` table already has all required columns (`stripe_customer_id`, `subscription_status`, `subscription_tier`, `subscription_ends_at`).

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] All subscription types exported from `@/types`
- [ ] useSubscription hook compiles and returns correct shape
- [ ] SubscriptionGuard wraps manager routes but not public/crew/settings routes
- [ ] Billing section renders for all 5 subscription states without errors
- [ ] Past due banner only appears when status is 'past_due'
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] No `console.log` debug statements left

### Charlie's Test Plan (after merge):
1. Open app in incognito, sign in — should load Dashboard (subscription status is 'none' initially)
2. Navigate to Settings → Billing — should see plan comparison cards
3. Check that "Subscribe" buttons are wired (they won't work without live Stripe keys, but should not crash)
4. Check DevTools console — no errors
5. Verify all other pages still load (Dashboard, Projects, Materials, Crew, Equipment, Settings)

### Batch Continuation:
> **Do NOT create a PR. Do NOT stop. Continue immediately to SPRINT_39_PROMPTS.md.**
