/**
 * Supabase Edge Function — stripe-webhook
 *
 * Handles inbound Stripe webhook events and keeps the `organizations` table
 * in sync with the customer's subscription state.
 *
 * P0 #2 split: business logic lives in `./handlers.ts` (unit tested via
 * vitest); this entrypoint only handles Deno-runtime concerns — secrets,
 * signature verification, dispatch.
 *
 * ── Deployment ─────────────────────────────────────────────────────────────
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook
 *
 * Register the webhook endpoint in the Stripe dashboard:
 *   URL:    https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 *   Events: checkout.session.completed
 *           customer.subscription.updated
 *           customer.subscription.deleted
 *           invoice.payment_failed
 *
 * Set required secrets (run once per environment):
 *   supabase secrets set \
 *     STRIPE_SECRET_KEY=sk_live_... \
 *     STRIPE_WEBHOOK_SECRET=whsec_... \
 *     STRIPE_PRICE_STARTER_MONTHLY=price_... \
 *     STRIPE_PRICE_PRO_MONTHLY=price_... \
 *     STRIPE_PRICE_BUSINESS_MONTHLY=price_...
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
 * the Supabase runtime — do not set these manually.
 *
 * ── Checkout session requirement ───────────────────────────────────────────
 *
 * The `create-checkout-session` Edge Function MUST set `metadata.org_id` on
 * the Checkout Session so this handler can look up the right org row when
 * `checkout.session.completed` fires.
 */

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildPriceToTierMap,
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
} from './handlers.ts';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Validate required secrets ────────────────────────────────────────────

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('stripe-webhook: missing required environment variables');
    return new Response('Server configuration error', { status: 500 });
  }

  // ── Verify webhook signature ─────────────────────────────────────────────

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing Stripe-Signature header', { status: 400 });
  }

  // Raw body must be read before any parsing — Stripe verifies against the
  // exact bytes sent on the wire.
  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('stripe-webhook: signature verification failed:', msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  // ── Build service clients ────────────────────────────────────────────────

  // Service-role client bypasses RLS — only used for system-level updates here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  }) as any;

  const priceToTier = buildPriceToTierMap({
    starter: Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY'),
    pro: Deno.env.get('STRIPE_PRICE_PRO_MONTHLY'),
    business: Deno.env.get('STRIPE_PRICE_BUSINESS_MONTHLY'),
  });

  console.log(`stripe-webhook: processing event ${event.type} [${event.id}]`);

  // ── Dispatch ─────────────────────────────────────────────────────────────

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stripe as any,
          supabase,
          priceToTier,
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabase,
          priceToTier,
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase,
        );
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabase,
        );
        break;

      default:
        // Acknowledge and ignore — Stripe only sends the events we registered
        // for, but unknown events should never cause a non-2xx response.
        console.log(`stripe-webhook: unhandled event type "${event.type}" — acknowledged`);
    }
  } catch (err) {
    // Log but still return 200. Stripe retries on non-2xx; retrying a handler
    // bug won't fix it. Fix the code and replay via the Stripe dashboard.
    console.error(`stripe-webhook: unhandled error in event handler for ${event.type}:`, err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
