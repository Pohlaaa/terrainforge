# TerrainForge — Production Deploy Checklist

## Pre-Deploy (one-time setup)

### Stripe Dashboard
- [ ] Create 3 Products: Starter ($49/mo), Pro ($99/mo), Business ($199/mo)
- [ ] Create Monthly Price for each product
- [ ] Copy Price IDs → used in both Netlify env vars and Supabase Edge Function secrets
- [ ] Set up Webhook endpoint: `https://<supabase-ref>.supabase.co/functions/v1/stripe-webhook`
- [ ] Register webhook events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- [ ] Copy Webhook Signing Secret (whsec_...)

### Supabase

#### Edge Functions (deploy via Supabase CLI or Dashboard)
- [ ] `create-checkout-session` — creates Stripe Checkout sessions
- [ ] `create-portal-session` — opens Stripe Billing Portal
- [ ] `stripe-webhook` — handles Stripe webhook events

#### Edge Function Secrets (set via `supabase secrets set`)
| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (whsec_...) |
| `STRIPE_PRICE_STARTER_MONTHLY` | Stripe Price ID for Starter plan |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_BUSINESS_MONTHLY` | Stripe Price ID for Business plan |
| `SITE_URL` | Production URL (e.g., https://terrainforge.app) — used for Stripe return URLs |

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase.

#### Database
- [ ] Run all migrations (001 through 012) in order
- [ ] Verify RLS policies are active on all tables
- [ ] Confirm `set_trial_defaults` trigger exists on `organizations`

### Netlify

#### Environment Variables (Site → Environment Variables)
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_STRIPE_PK` | Stripe publishable key (pk_live_...) |
| `VITE_STRIPE_PRICE_STARTER` | Stripe Price ID for Starter plan |
| `VITE_STRIPE_PRICE_PRO` | Stripe Price ID for Pro plan |
| `VITE_STRIPE_PRICE_BUSINESS` | Stripe Price ID for Business plan |
| `VITE_ANTHROPIC_API_KEY` | Claude API key (for AI features) |
| `VITE_MAPBOX_TOKEN` | Mapbox access token (for maps + address autocomplete) |

#### Build Settings
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Node version: 18+ (set in `.nvmrc` or Netlify environment)

#### Netlify Site
- Site ID: `d8efdf00-91f7-4717-aacd-d1c65372a634`
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled
- [ ] `_redirects` or `netlify.toml` has SPA redirect (`/* /index.html 200`)

## Deploy

- [ ] Push to `main` (Netlify auto-deploys from `main` when enabled)
- [ ] OR manual deploy: `netlify deploy --prod`

## Post-Deploy Verification

- [ ] Landing page loads at root URL (unauthenticated)
- [ ] Signup creates account → trial starts → onboarding flow
- [ ] Login works for existing accounts
- [ ] Dashboard loads for authenticated users
- [ ] Trial banner shows for trialing users
- [ ] Billing page shows current plan and pricing cards
- [ ] Stripe checkout flow completes (test with Stripe test card `4242 4242 4242 4242`)
- [ ] Webhook receives events (check Stripe Dashboard → Developers → Webhooks → Logs)
- [ ] Subscription status updates after successful checkout
- [ ] All pages load without console errors: Dashboard, Projects, Materials, Crew, Equipment, Schedule, Settings
- [ ] PDF export works (manifest + crew packet)
- [ ] Map widget loads (requires valid Mapbox token)
- [ ] AI features work (price research, project wizard AI) — requires valid Anthropic key

## Rollback

If critical issues are found post-deploy:
1. Revert to previous deploy in Netlify Dashboard → Deploys → click previous deploy → "Publish deploy"
2. Or: `git revert HEAD && git push origin main`
