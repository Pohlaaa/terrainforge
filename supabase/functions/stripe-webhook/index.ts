/**
 * Supabase Edge Function — stripe-webhook
 *
 * Handles inbound Stripe webhook events and keeps the `organizations` table
 * in sync with the customer's subscription state.
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
 * `checkout.session.completed` fires:
 *
 *   await stripe.checkout.sessions.create({
 *     ...
 *     metadata: { org_id: orgId },
 *   });
 *
 * ── How it works ───────────────────────────────────────────────────────────
 *
 * 1. Verify the Stripe-Signature header to reject forged requests.
 * 2. Dispatch on event.type to the appropriate handler.
 * 3. Use the Supabase service-role client (bypasses RLS) to update the
 *    `organizations` table.
 * 4. Always return 200 — Stripe retries on non-2xx, but handler-side bugs
 *    won't be fixed by retrying. Use the Stripe dashboard to replay events
 *    after deploying a fix.
 */

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

// ── Local types ───────────────────────────────────────────────────────────────

/** Mirrors the SubscriptionTier type in src/types/index.ts */
type SubscriptionTier = 'starter' | 'pro' | 'business';

/** Mirrors the SubscriptionStatus type in src/types/index.ts */
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

/** Columns we write to on the organizations table. */
interface OrgBillingUpdate {
  stripe_customer_id?: string;
  subscription_status?: SubscriptionStatus;
  subscription_tier?: SubscriptionTier;
  subscription_ends_at?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a Price ID → SubscriptionTier lookup from environment variables.
 * Missing env vars are silently ignored (the price just won't map to a tier).
 */
function buildPriceToTierMap(): Map<string, SubscriptionTier> {
  const map = new Map<string, SubscriptionTier>();

  const starter = Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY');
  const pro = Deno.env.get('STRIPE_PRICE_PRO_MONTHLY');
  const business = Deno.env.get('STRIPE_PRICE_BUSINESS_MONTHLY');

  if (starter) map.set(starter, 'starter');
  if (pro) map.set(pro, 'pro');
  if (business) map.set(business, 'business');

  return map;
}

/**
 * Extract a plain customer ID string from a Stripe field that may be a string,
 * an expanded Customer object, or a DeletedCustomer object.
 */
function extractCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}

/**
 * Map a Stripe subscription status to our internal SubscriptionStatus enum.
 *
 * Stripe statuses: active | past_due | unpaid | canceled | incomplete |
 *                  incomplete_expired | trialing | paused
 */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':  return 'active';
    case 'trialing': return 'trialing';
    case 'past_due':
    case 'unpaid':   return 'past_due';
    case 'canceled':
    case 'incomplete_expired': return 'canceled';
    default: return 'none';
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 *
 * Fires when a customer completes a Stripe Checkout flow. At this point the
 * subscription is active. We:
 *  - Read org_id from session.metadata (set by create-checkout-session).
 *  - Link the Stripe Customer ID to the org.
 *  - Look up the subscribed price to determine the tier.
 *  - Set subscription_status = 'active'.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  priceToTier: Map<string, SubscriptionTier>
): Promise<void> {
  if (session.mode !== 'subscription') {
    console.log('checkout.session.completed: not a subscription session, skipping');
    return;
  }

  const orgId = session.metadata?.org_id;
  if (!orgId) {
    console.error(
      'checkout.session.completed: org_id missing from session metadata — ' +
      'ensure create-checkout-session sets metadata.org_id',
      { sessionId: session.id }
    );
    return;
  }

  const customerId = extractCustomerId(session.customer);
  if (!customerId) {
    console.error('checkout.session.completed: customer ID missing', { sessionId: session.id });
    return;
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id ?? null;

  if (!subscriptionId) {
    console.error('checkout.session.completed: subscription ID missing', { sessionId: session.id });
    return;
  }

  // Retrieve the subscription to get the price ID (not included in session payload)
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price?.id ?? '';
  const tier = priceToTier.get(priceId) ?? null;

  const update: OrgBillingUpdate = {
    stripe_customer_id: customerId,
    subscription_status: 'active',
  };
  if (tier) update.subscription_tier = tier;

  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', orgId);

  if (error) {
    console.error('checkout.session.completed: DB update failed', error, { orgId });
  } else {
    console.log(
      `checkout.session.completed: activated org ${orgId}`,
      { tier: tier ?? 'unmapped', customerId }
    );
  }
}

/**
 * customer.subscription.updated
 *
 * Fires on any change to an existing subscription (upgrade, downgrade, plan
 * switch, renewal). We update the tier (if the price maps to one) and the
 * status.
 */
async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
  priceToTier: Map<string, SubscriptionTier>
): Promise<void> {
  const customerId = extractCustomerId(sub.customer);
  if (!customerId) {
    console.error('customer.subscription.updated: customer ID missing', { subId: sub.id });
    return;
  }

  const priceId = sub.items.data[0]?.price?.id ?? '';
  const tier = priceToTier.get(priceId) ?? null;
  const status = mapStripeStatus(sub.status);

  const update: OrgBillingUpdate = { subscription_status: status };
  if (tier) update.subscription_tier = tier;

  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('customer.subscription.updated: DB update failed', error, { customerId });
  } else {
    console.log(
      `customer.subscription.updated: customer ${customerId}`,
      { status, tier: tier ?? 'unchanged', priceId }
    );
  }
}

/**
 * customer.subscription.deleted
 *
 * Fires when a subscription is fully canceled (not just scheduled to cancel).
 * We set subscription_status = 'canceled' but preserve the tier and customer
 * ID so the customer can resubscribe without losing context.
 */
async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const customerId = extractCustomerId(sub.customer);
  if (!customerId) {
    console.error('customer.subscription.deleted: customer ID missing', { subId: sub.id });
    return;
  }

  // Record when access should expire (end of the billing period already paid)
  const endsAt = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const update: OrgBillingUpdate = {
    subscription_status: 'canceled',
    subscription_ends_at: endsAt,
  };

  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('customer.subscription.deleted: DB update failed', error, { customerId });
  } else {
    console.log(
      `customer.subscription.deleted: canceled customer ${customerId}`,
      { endsAt }
    );
  }
}

/**
 * invoice.payment_failed
 *
 * Fires when a subscription renewal invoice fails to collect. Stripe will
 * retry automatically; we mark the org past_due so the UI can prompt the
 * customer to update their payment method.
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) {
    console.error('invoice.payment_failed: customer ID missing', { invoiceId: invoice.id });
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: 'past_due' } satisfies OrgBillingUpdate)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('invoice.payment_failed: DB update failed', error, { customerId });
  } else {
    console.log(`invoice.payment_failed: marked past_due for customer ${customerId}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

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
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const priceToTier = buildPriceToTierMap();

  console.log(`stripe-webhook: processing event ${event.type} [${event.id}]`);

  // ── Dispatch ─────────────────────────────────────────────────────────────

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          stripe,
          supabase,
          priceToTier
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabase,
          priceToTier
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabase
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
