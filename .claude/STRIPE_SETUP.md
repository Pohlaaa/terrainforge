# Stripe Setup — Step by Step

> Quick-reference for Charlie. Do this after Sprint 41 hotfix is merged and before first production deploy.
> Estimated time: 20-30 minutes.

---

## Step 1: Create Stripe Products (Stripe Dashboard)

Go to **dashboard.stripe.com → Products → + Add product**

Create three products:

| Product Name | Monthly Price | Description |
|-------------|--------------|-------------|
| TerrainForge Starter | $49.00 | 5 active projects, 1 user |
| TerrainForge Pro | $99.00 | 25 active projects, 5 users |
| TerrainForge Business | $199.00 | Unlimited projects, 15 users |

For each: set billing period to "Monthly", currency USD.

After creating each product, click into it and copy the **Price ID** (starts with `price_`). You need all three.

---

## Step 2: Set Up Webhook (Stripe Dashboard)

Go to **Developers → Webhooks → + Add endpoint**

- **Endpoint URL**: `https://<your-supabase-ref>.supabase.co/functions/v1/stripe-webhook`
  - Find your Supabase ref at: supabase.com → your project → Settings → API → Project URL
  - Example: `https://abcdefghij.supabase.co/functions/v1/stripe-webhook`
- **Events to send** (select these four):
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

After creating, click into the webhook and copy the **Signing secret** (starts with `whsec_`).

---

## Step 3: Deploy Edge Functions (Supabase CLI)

If you haven't installed the Supabase CLI:
```
npm install -g supabase
supabase login
```

Then from the `terrainforge/` project root:
```
supabase link --project-ref <your-project-ref>
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

---

## Step 4: Set Supabase Secrets

From the `terrainforge/` project root:
```
supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
supabase secrets set STRIPE_PRICE_STARTER_MONTHLY=price_YOUR_STARTER_PRICE_ID
supabase secrets set STRIPE_PRICE_PRO_MONTHLY=price_YOUR_PRO_PRICE_ID
supabase secrets set STRIPE_PRICE_BUSINESS_MONTHLY=price_YOUR_BUSINESS_PRICE_ID
```

---

## Step 5: Set Netlify Environment Variables

Go to **app.netlify.com → your site → Site configuration → Environment variables**

Add these (in addition to any already set):

| Key | Value |
|-----|-------|
| `VITE_STRIPE_PK` | Your Stripe **publishable** key (starts with `pk_live_` or `pk_test_`) |
| `VITE_STRIPE_PRICE_STARTER` | Same Price ID as STRIPE_PRICE_STARTER_MONTHLY above |
| `VITE_STRIPE_PRICE_PRO` | Same Price ID as STRIPE_PRICE_PRO_MONTHLY above |
| `VITE_STRIPE_PRICE_BUSINESS` | Same Price ID as STRIPE_PRICE_BUSINESS_MONTHLY above |

---

## Step 6: Test with Stripe Test Mode

Before going live, do everything above using **test mode keys** (toggle "Test mode" in Stripe Dashboard).

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

Verification:
1. Sign up for a new account → see trial banner
2. Go to Settings → Billing → click "Subscribe" on a plan
3. Should redirect to Stripe Checkout → use test card
4. After checkout, should return to `/billing?session=success`
5. Subscription status should update (may take a few seconds for webhook)
6. Check Stripe Dashboard → Developers → Webhooks → recent deliveries (should show 200 OK)

---

## When Ready for Live

1. Switch Stripe Dashboard out of test mode
2. Create live Products + Prices (same as Step 1 but in live mode)
3. Create live Webhook endpoint (same as Step 2 but in live mode)
4. Update all secrets and env vars with live keys
5. Redeploy Edge Functions (they read secrets at runtime, so just updating secrets may suffice)
6. Trigger a new Netlify deploy so the build picks up the new VITE_ env vars
