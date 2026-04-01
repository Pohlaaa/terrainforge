# Sprint 40 — Launch Readiness & Signup Polish

> **Goal**: Final production polish before going live. Fix the signup flow to connect to the trial system, add success/cancel handling for Stripe checkout returns, verify all environment variables are documented, and ensure the landing page → signup → trial → app flow works end-to-end. After this sprint, TerrainForge is ready for its first paying customers.
>
> **Last sprint in batch**: Sprints 38-40. After this sprint, create the PR, update CONTEXT.md, and archive all sprint prompts.
> **Design reference**: `.claude/DESIGN_SYSTEM.md` — brand colors, typography
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head batch-sprint-38-to-40 --title "Batch: Sprints 38-40 — Subscription, Trial, Launch Readiness" --body "S38: Bug fixes + subscription enforcement + billing UI. S39: 14-day trial experience. S40: Signup polish + checkout returns + deploy checklist."`

---

## CRITICAL CONTEXT

> - Sprint 37: Landing page + Netlify config (marketing entry point)
> - Sprint 38: Subscription enforcement + billing UI (paywall, plan cards)
> - Sprint 39: Trial experience (14-day trial, banner, read-only downgrade)
> - This sprint connects all the pieces and polishes the end-to-end flow
> - The signup flow currently creates an auth user + organization but does NOT set trial columns (Sprint 39's DB trigger handles trial_starts_at/trial_ends_at automatically on org INSERT)
> - Stripe checkout returns to `/billing?session=success` or `/billing?session=cancel` — these URL params need to be handled
> - Netlify site ID: `d8efdf00-91f7-4717-aacd-d1c65372a634`
> - React 18 + Vite + TypeScript + Tailwind CSS
> - Brand color: `#2D6A4F` (green). Dark theme is primary.

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] `/login` page still renders and login works
> - [ ] `/signup` page still renders and creates account
> - [ ] Landing page renders at `/` for unauthenticated users
> - [ ] Authenticated users see Dashboard at `/`
> - [ ] Project wizard at `/projects/wizard` still loads
> - [ ] Crew app at `/crew/login` still loads
> - [ ] Settings page at `/settings` still loads
> - [ ] Trial banner shows for trialing users
> - [ ] SubscriptionGuard works for all states

---

## S40-1: Signup Flow → Trial Connection

**Problem/Goal**: When a new user signs up from the landing page, the experience should be seamless: sign up → onboarding → app with trial banner. Currently signup creates an auth user and org, but the trial messaging in the UI needs to match.

**Current state**: The signup page creates an auth user and an organization row. Sprint 39's DB trigger automatically sets `trial_starts_at`, `trial_ends_at`, and `subscription_status = 'trialing'` on org INSERT. The signup page itself doesn't mention the trial.

**Files to modify**:
- `src/pages/Signup.tsx` — add trial messaging
- `src/pages/Login.tsx` — add "Start your free trial" link to landing page

**Implementation details**:

### Signup Page Enhancements
1. Add below the signup form: "Start your 14-day free trial. No credit card required." — `rgba(255,255,255,0.4)`, 14px, centered
2. Change the submit button text from "Sign Up" (or whatever it says) to "Start Free Trial"
3. After successful signup + email confirmation, the user goes through onboarding → Dashboard → sees trial banner. No additional code needed here — just verify the flow makes sense.
4. Add "Already have an account? Log in" link if not already present

### Login Page Enhancements
1. Below the login form, add: "Don't have an account? Start your free trial" — link to `/signup`
2. If there's already a signup link, update its text to mention "free trial"

### Landing Page → Signup Connection
Verify that the "Start Free Trial" buttons on the landing page (from Sprint 37) navigate to `/signup`. They should already — this is a verification step, not new code.

**Supabase considerations**: None — trial columns are set by the DB trigger from Sprint 39's migration.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Signup page mentions "14-day free trial"
- [ ] Login page has link to signup mentioning trial
- [ ] Landing page CTAs still navigate to `/signup`

---

## S40-2: Stripe Checkout Return Handling

**Problem/Goal**: After a user completes Stripe Checkout (subscribes), they return to `/billing?session=success`. After canceling checkout, they return to `/billing?session=cancel`. These URL parameters need to trigger appropriate UI feedback.

**Current state**: `stripe.ts` sets `success_url` to `/billing?session=success` and `cancel_url` to `/billing?session=cancel`. But the billing page doesn't read these params or show feedback.

**Files to modify**:
- The billing component (wherever the billing UI lives from Sprint 38 — likely in Settings or a dedicated component)

**Implementation details**:

### Success Handling
When URL has `?session=success`:
1. Show a success toast/banner: "Welcome aboard! Your subscription is active." — green background, white text
2. Clear the `?session=success` param from the URL (use `window.history.replaceState` to clean it up)
3. Refetch subscription status (the webhook may take a few seconds — add a small delay or poll)
4. The billing section should now show the active plan

**Polling for webhook**: After Stripe Checkout completes, the webhook fires asynchronously. The org's subscription_status may not update instantly. Implement a simple poll:
- On `?session=success`, start polling `getSubscriptionStatus()` every 2 seconds
- Stop when status changes from current value (e.g., 'trialing' → 'active') or after 15 seconds (show "Processing your subscription..." while polling)
- Once status updates, show the success message and refresh the billing UI

### Cancel Handling
When URL has `?session=cancel`:
1. Show an info toast: "Checkout canceled. You can subscribe anytime from Settings → Billing."
2. Clear the URL param
3. No other action needed

### Toast Component
If the app doesn't already have a toast/notification system, create a simple one:
- Fixed position bottom-right, z-index above content
- Auto-dismiss after 5 seconds
- Green for success, blue for info
- If a toast system already exists (check for Sonner, react-hot-toast, or custom), use it

**Supabase considerations**: `getSubscriptionStatus()` reads from organizations table.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Billing page reads URL params `session=success` and `session=cancel`
- [ ] Success param triggers polling for subscription status update
- [ ] URL params are cleaned after processing
- [ ] Toast/feedback renders correctly

---

## S40-3: Environment Variable Documentation & Production Checklist

**Problem/Goal**: Document all required environment variables and create a production deploy checklist so Charlie knows exactly what to configure in Netlify and Supabase before going live.

**Current state**: Environment variables are scattered across code. No single document lists what's needed for production.

**Files to create**:
- `.claude/DEPLOY_CHECKLIST.md` — **NEW FILE** — production deployment guide

**Files to modify**:
- `README.md` or `.env.example` — add/update env var listing (if these files exist, read them first)

**Implementation details**:

### Environment Variable Audit
Search the codebase for all `import.meta.env.VITE_*` and `Deno.env.get()` references. Compile into a complete list.

**Expected frontend env vars** (Netlify → Site → Environment Variables):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key
- `VITE_STRIPE_PK` — Stripe publishable key (pk_live_...)
- `VITE_STRIPE_PRICE_STARTER` — Stripe Price ID for Starter plan
- `VITE_STRIPE_PRICE_PRO` — Stripe Price ID for Pro plan
- `VITE_STRIPE_PRICE_BUSINESS` — Stripe Price ID for Business plan
- `VITE_MAPBOX_TOKEN` — Mapbox access token (if used)
- Any others found in the codebase

**Expected Supabase Edge Function secrets** (already set, just document):
- `STRIPE_SECRET_KEY` — Stripe secret key (sk_live_...)
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret (whsec_...)
- `STRIPE_PRICE_STARTER_MONTHLY` — Price ID (used by webhook to map tier)
- `STRIPE_PRICE_PRO_MONTHLY` — Price ID
- `STRIPE_PRICE_BUSINESS_MONTHLY` — Price ID

### DEPLOY_CHECKLIST.md Content

```markdown
# TerrainForge — Production Deploy Checklist

## Pre-Deploy (one-time setup)

### Stripe Dashboard
- [ ] Create 3 Products: Starter, Pro, Business
- [ ] Create Monthly Price for each: $49, $99, $199
- [ ] Copy Price IDs for environment variables
- [ ] Set up Webhook endpoint: https://<supabase-ref>.supabase.co/functions/v1/stripe-webhook
- [ ] Register events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
- [ ] Copy Webhook Signing Secret

### Supabase
- [ ] Deploy Edge Functions: create-checkout-session, create-portal-session, stripe-webhook
- [ ] Set secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*_MONTHLY
- [ ] Run all migrations (001-012)
- [ ] Verify RLS policies are active

### Netlify
- [ ] Set environment variables (all VITE_* vars)
- [ ] Verify build command: npm run build
- [ ] Verify publish directory: dist
- [ ] Custom domain (if applicable)

## Deploy
- [ ] Push to main (Netlify deploys from main when auto-deploy is ON)
- [ ] OR manual deploy via Netlify CLI / dashboard

## Post-Deploy Verification
- [ ] Landing page loads at root URL
- [ ] Signup creates account with trial
- [ ] Login works
- [ ] Dashboard loads for authenticated users
- [ ] Stripe checkout flow works (use test mode first)
- [ ] Webhook receives events (check Stripe dashboard logs)
- [ ] Trial banner appears
- [ ] Billing page shows current plan
```

### .env.example
Create or update `.env.example` at project root with all required variables (values as placeholders):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PK=pk_test_...
VITE_STRIPE_PRICE_STARTER=price_...
VITE_STRIPE_PRICE_PRO=price_...
VITE_STRIPE_PRICE_BUSINESS=price_...
VITE_MAPBOX_TOKEN=pk.your-token
```

**Supabase considerations**: None — documentation only.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] DEPLOY_CHECKLIST.md is complete and accurate
- [ ] .env.example lists all required variables
- [ ] No actual secrets or keys are in any committed file

---

## Execution Order

1. **S40-1** — Signup flow polish (quick, standalone)
2. **S40-2** — Checkout return handling (depends on Sprint 38 billing page existing)
3. **S40-3** — Env var docs + deploy checklist (standalone, can be done in any order)

---

## SQL Migrations Required

**None.** All required columns exist from migrations 001-012.

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] Signup page mentions free trial
- [ ] Login page links to signup with trial mention
- [ ] Checkout success/cancel URL params are handled in billing page
- [ ] Subscription status polling works on checkout return
- [ ] DEPLOY_CHECKLIST.md exists and is comprehensive
- [ ] .env.example lists all VITE_* variables
- [ ] No secrets or real keys in any committed file
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] No console.log debug statements left

### Charlie's Test Plan (after merge):
1. Open signup page — should mention "14-day free trial"
2. Open login page — should have "Start your free trial" link
3. Create a new account (incognito) — should flow through onboarding → Dashboard with trial banner
4. Navigate to Settings → Billing — should show trial status and plan cards
5. Check DEPLOY_CHECKLIST.md — verify it matches your actual setup
6. Check .env.example — verify all variables are listed
7. (If Stripe test mode is configured): Test the checkout flow end-to-end
8. Console check: no errors on any page

### Batch Wrap-Up (this is the LAST sprint in the batch):
> **NOW create the PR** using the PR command at the top of this file.
> Code: update CONTEXT.md with results from ALL three sprints (38, 39, 40)
> Code: archive ALL sprint prompts:
>   `git mv .claude/SPRINT_38_PROMPTS.md .claude/archive/sprints/`
>   `git mv .claude/SPRINT_39_PROMPTS.md .claude/archive/sprints/`
>   `git mv .claude/SPRINT_40_PROMPTS.md .claude/archive/sprints/`
> Code: commit wrap-up: `Batch 38-40: CONTEXT update + archive sprint prompts`
> Code: push and create PR
>
> Charlie (after merge): update SPRINT_LOG.md for sprints 38, 39, 40
> Charlie: M3 "First Revenue" milestone review — verify all acceptance criteria met
