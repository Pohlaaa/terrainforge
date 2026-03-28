# Sprint 3 — Claude Code Prompts

**Goal:** Stripe billing live and Claude API wired for Price Research.
**Done when:** A contractor can sign up, select a plan, pay via Stripe, and the Price Research page returns real AI-powered pricing data.

Copy each prompt in order into the Code tab. Complete one before starting the next.

---

## S3-1 — Set Up Stripe Products and Service Layer

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 3, task S3-1. Sprints 1 and 2 are complete — all 8 pages wired, Supabase persisting, PDF export working.

**Task: Create the Stripe service layer and configure Products/Prices.**

Install the Stripe JS library: `npm install @stripe/stripe-js`. Then create `src/services/stripe.ts` with:
- `loadStripe()` initialized with `VITE_STRIPE_PK`
- `createCheckoutSession(priceId: string, orgId: string): Promise<void>` — calls a Supabase Edge Function to create a Stripe Checkout Session and redirects the user to the hosted checkout page
- `getSubscriptionStatus(orgId: string): Promise<SubscriptionStatus>` — reads subscription status from the `organizations` table in Supabase (which will be updated by webhook)

Add the following fields to the `organizations` table via a new migration at `supabase/migrations/002_stripe_billing.sql`:
```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
```

Add `SubscriptionStatus` type to `src/types/index.ts`:
```typescript
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';
export type SubscriptionTier = 'starter' | 'pro' | 'business';
```

Before writing anything, read these files:
1. `src/types/index.ts`
2. `src/services/supabase.ts`
3. `package.json`

Run `npm run build` when done to confirm no TypeScript errors.

---

## S3-2 — Build Billing/Pricing Page

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 3, task S3-2. Stripe service layer is created.

**Task: Build `src/pages/Billing.tsx` — the plan selection and subscription management page.**

The page should:
- Display the three pricing tiers in a side-by-side card layout: Starter ($49/mo), Pro ($99/mo), Business ($199/mo)
- Show what's included in each tier (see `.claude/BUSINESS.md` for limits)
- Show the user's current plan and trial status (days remaining if in trial)
- "Upgrade" or "Subscribe" button on each plan card that calls `createCheckoutSession()` from `src/services/stripe.ts`
- If the user is already on a plan, show "Current Plan" badge and a "Manage Billing" button (links to Stripe Customer Portal)
- Show a banner at the top if trial ends within 7 days

Add the route `/billing` to `src/App.tsx` and a "Billing" link to the sidebar navigation (bottom section, near settings).

The pricing card layout should use the existing CSS custom properties and match the app's dark green aesthetic. Reference `src/components/shared/KPICard.tsx` for card styling patterns.

Before writing anything, read these files:
1. `src/pages/Dashboard.tsx` (reference for page layout pattern)
2. `src/services/stripe.ts`
3. `src/components/shared/KPICard.tsx`
4. `src/types/index.ts`
5. `src/App.tsx`

Run `npm run build` when done to confirm no TypeScript errors.

---

## S3-3 — Wire Stripe Webhooks via Supabase Edge Function

Read `CLAUDE.md`, `.claude/DEVELOPMENT.md`, and `.claude/DEPLOYMENT.md`.

Sprint 3, task S3-3. Billing page is built. Now we need to handle Stripe webhook events so the database reflects subscription changes.

**Task: Create a Supabase Edge Function to handle Stripe webhooks.**

Create `supabase/functions/stripe-webhook/index.ts`. This Edge Function should:
- Verify the Stripe webhook signature using `STRIPE_WEBHOOK_SECRET` (env var set in Supabase dashboard)
- Handle these events:
  - `checkout.session.completed` → update `organizations` table: set `stripe_customer_id`, `subscription_status = 'active'`, `subscription_tier` based on the price_id
  - `customer.subscription.deleted` → set `subscription_status = 'canceled'`
  - `invoice.payment_failed` → set `subscription_status = 'past_due'`
  - `customer.subscription.updated` → update tier if plan changed

Use the Supabase service role key (not the anon key) inside the Edge Function to bypass RLS for these system-level updates. The service role key is available in the Edge Function environment as `SUPABASE_SERVICE_ROLE_KEY`.

Map Stripe Price IDs to tiers using environment variables:
- `STRIPE_PRICE_STARTER_MONTHLY`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_BUSINESS_MONTHLY`

After writing the function, document the deployment steps in a comment at the top of the file:
```
// Deploy: supabase functions deploy stripe-webhook
// Set webhook URL in Stripe dashboard: https://[project].supabase.co/functions/v1/stripe-webhook
// Set secrets: supabase secrets set STRIPE_WEBHOOK_SECRET=... STRIPE_PRICE_STARTER_MONTHLY=...
```

Before writing anything, read these files:
1. `src/services/stripe.ts`
2. `src/types/index.ts`
3. `supabase/migrations/002_stripe_billing.sql`

Run `npm run build` when done to confirm no TypeScript errors. (Edge Function TypeScript is separate — run `deno check` if Deno is available, otherwise note it in the PR.)

---

## S3-4 — Wire Claude API to Price Research Page

Read `CLAUDE.md`, `.claude/DEVELOPMENT.md`, and `.claude/AI_PRODUCT.md`.

Sprint 3, task S3-4. Billing is wired. Now wire the Claude API to the Price Research page.

**Task: Replace the Price Research placeholder with a real Claude API integration.**

Update `src/pages/PriceResearch.tsx` to:
- Call `src/services/anthropic.ts`'s `callClaude()` function when the user clicks Search
- Pass the material type and location from the form fields into the prompt
- Parse the Claude response (JSON) into a structured results table showing: supplier type, unit, price range (low/high), notes
- Show a loading spinner while the API call is in progress
- Show an error state if the API call fails (with a retry button)
- Cache results in `localStorage` for 24 hours per `{material}:{location}` key — don't re-call the API for the same query
- Show a "Results may vary — verify with local suppliers" disclaimer below results

Use this prompt pattern (already specified in `.claude/AI_PRODUCT.md`):
```
You are a materials cost estimator for landscaping projects in [location].
Research current retail and wholesale prices for [material]. Return a JSON array of:
[{ "supplierType": string, "unit": string, "priceLow": number, "priceHigh": number, "notes": string }]
Return ONLY the JSON array with no additional text.
```

Use `claude-haiku-4-5-20251001` for this feature (fast, low cost per query).

Before writing anything, read these files:
1. `src/pages/PriceResearch.tsx`
2. `src/services/anthropic.ts`
3. `src/types/index.ts`
4. `src/components/shared/AlertBanner.tsx`

Run `npm run build` when done to confirm no TypeScript errors.

---

## S3-5 — Add Trial Banner and Billing Gate

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 3, task S3-5. Price Research is wired.

**Task: Add a trial expiry banner and basic billing gate to the app.**

1. **Trial banner:** In `src/components/layout/AppLayout.tsx` (or the main layout), check if the current user's org is in trial status with ≤7 days remaining. If so, show a dismissible yellow banner at the top: "Your free trial ends in X days. [Upgrade now →]" linking to `/billing`.

2. **Billing gate:** After the trial ends (subscription_status = 'canceled' or trial_ends_at has passed without active subscription), redirect users to `/billing` if they try to access any page other than `/billing` and `/logout`. Allow read-only views — don't delete data, just prevent new creates.

   Implement this as a hook `src/hooks/useBillingGate.ts` that reads org subscription status and returns `{ isGated: boolean, daysLeft: number }`. Call this hook from `ProtectedRoute` or `AppLayout`.

3. **Org store:** Create `src/stores/orgStore.ts` to hold the current user's org data including subscription info. Load it on app init after auth. Shape:
   ```typescript
   { org: Organization | null, isLoading: boolean, error: string | null, fetchOrg: (orgId: string) => Promise<void> }
   ```

Before writing anything, read these files:
1. `src/components/layout/AppLayout.tsx`
2. `src/services/supabase.ts`
3. `src/types/index.ts`
4. `src/stores/projectStore.ts` (reference for store pattern)
5. `src/App.tsx`

Run `npm run build` when done to confirm no TypeScript errors.

---

## S3-6 — End-to-End Billing Smoke Test

Read `CLAUDE.md` and `.claude/DEVELOPMENT.md`.

Sprint 3, task S3-6. All billing and AI wiring is complete.

**Task: Run a full end-to-end billing and AI smoke test.**

Test the following flows and document any issues found:

**Billing flow:**
1. Sign up as a new user → confirm 14-day trial banner appears
2. Navigate to `/billing` → confirm all 3 plan cards render correctly with prices
3. Click "Subscribe" on Pro plan → confirm Stripe Checkout opens (use Stripe test card: `4242 4242 4242 4242`)
4. Complete checkout → confirm redirect back to app, subscription_status = 'active' in Supabase
5. Check the org's `stripe_customer_id` is populated in the `organizations` table

**Trial expiry flow:**
6. Manually set `trial_ends_at` to a past date in Supabase for a test org
7. Confirm billing gate activates and non-billing pages are blocked
8. Subscribe → confirm access is restored

**Price Research flow:**
9. Navigate to Price Research → select a project and enter "mulch" + "Phoenix, AZ"
10. Click Search → confirm results return (may take 5-10 seconds for Claude API)
11. Confirm results table renders with supplier type, unit, price range, notes
12. Repeat the same search → confirm results load from cache instantly (no API call)

Document every issue found. Fix in priority order: billing correctness first, UX second.

Run `npm run build` after all fixes to confirm no TypeScript errors.
