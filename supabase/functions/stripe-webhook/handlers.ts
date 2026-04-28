/**
 * stripe-webhook handlers — extracted from index.ts for unit testing (P0 #2).
 *
 * The edge function entrypoint (`index.ts`) still owns:
 *   - Deno-specific imports (`npm:stripe@14`, `npm:@supabase/supabase-js@2`)
 *   - Webhook signature verification
 *   - Reading secrets from `Deno.env`
 *   - Dispatching by event.type
 *
 * This module owns the per-event business logic. Everything here uses
 * structural types so the file can be loaded by both Deno (via the import
 * in index.ts) and Node/Vitest (via handlers.test.ts) without any tooling
 * dependence on the Stripe or Supabase SDK packages.
 *
 * Adding a new event type? Add a handler here, export it, then wire the
 * dispatch in index.ts. Add a test in handlers.test.ts.
 */

// ── Public types (mirror src/types/index.ts) ────────────────────────────────

export type SubscriptionTier = 'starter' | 'pro' | 'business';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'none';

export interface OrgBillingUpdate {
  stripe_customer_id?: string;
  subscription_status?: SubscriptionStatus;
  subscription_tier?: SubscriptionTier;
  subscription_ends_at?: string | null;
}

// ── Structural types (Stripe/Supabase shape, no SDK import) ─────────────────

/** Minimal Stripe.Subscription shape that handlers actually read. */
export interface StripeSubscriptionLike {
  id: string;
  status: string;
  customer: string | { id: string } | null;
  current_period_end?: number | null;
  items: { data: Array<{ price?: { id?: string } }> };
}

/** Minimal Stripe.Checkout.Session shape that handlers actually read. */
export interface StripeCheckoutSessionLike {
  id: string;
  mode: string;
  metadata?: { org_id?: string } | null;
  customer: string | { id: string } | null;
  subscription: string | { id: string } | null;
}

/** Minimal Stripe.Invoice shape that handlers actually read. */
export interface StripeInvoiceLike {
  id?: string | null;
  customer: string | { id: string } | null;
}

/** Minimal Stripe client shape — only the methods handlers call. */
export interface StripeClientLike {
  subscriptions: {
    retrieve: (id: string) => Promise<StripeSubscriptionLike>;
  };
}

/**
 * Minimal Supabase update-chain shape. We only ever do
 *   .from('organizations').update(payload).eq(col, val)
 * so the surface needed in tests is small.
 */
export interface SupabaseClientLike {
  from: (table: string) => {
    update: (payload: OrgBillingUpdate) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/**
 * Extract a plain customer ID string from a Stripe field that may be a string,
 * an expanded Customer object, or a DeletedCustomer object.
 */
export function extractCustomerId(
  customer: string | { id: string } | null | undefined,
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
export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return 'none';
  }
}

/**
 * Build a Price ID → SubscriptionTier lookup from explicit price IDs.
 * Pulled out as a pure function so tests don't have to mock Deno.env.
 * The edge function entrypoint reads Deno.env and passes the values in.
 */
export function buildPriceToTierMap(opts: {
  starter?: string | null | undefined;
  pro?: string | null | undefined;
  business?: string | null | undefined;
}): Map<string, SubscriptionTier> {
  const map = new Map<string, SubscriptionTier>();
  if (opts.starter) map.set(opts.starter, 'starter');
  if (opts.pro) map.set(opts.pro, 'pro');
  if (opts.business) map.set(opts.business, 'business');
  return map;
}

// ── Event handlers ──────────────────────────────────────────────────────────

/**
 * checkout.session.completed
 *
 * - Reads org_id from session.metadata (set by create-checkout-session).
 * - Links the Stripe Customer ID to the org.
 * - Looks up the subscribed price to determine the tier.
 * - Sets subscription_status = 'active'.
 */
export async function handleCheckoutSessionCompleted(
  session: StripeCheckoutSessionLike,
  stripe: StripeClientLike,
  supabase: SupabaseClientLike,
  priceToTier: Map<string, SubscriptionTier>,
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
      { sessionId: session.id },
    );
    return;
  }

  const customerId = extractCustomerId(session.customer);
  if (!customerId) {
    console.error('checkout.session.completed: customer ID missing', { sessionId: session.id });
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!subscriptionId) {
    console.error('checkout.session.completed: subscription ID missing', {
      sessionId: session.id,
    });
    return;
  }

  // Retrieve the subscription to get the price ID (not in session payload)
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
    .eq('owner_id', orgId);

  if (error) {
    console.error('checkout.session.completed: DB update failed', error, { orgId });
  } else {
    console.log(`checkout.session.completed: activated org ${orgId}`, {
      tier: tier ?? 'unmapped',
      customerId,
    });
  }
}

/**
 * customer.subscription.updated
 *
 * Fires on any change to an existing subscription (upgrade, downgrade, plan
 * switch, renewal). Updates tier (if the price maps to one) and status.
 */
export async function handleSubscriptionUpdated(
  sub: StripeSubscriptionLike,
  supabase: SupabaseClientLike,
  priceToTier: Map<string, SubscriptionTier>,
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
    console.log(`customer.subscription.updated: customer ${customerId}`, {
      status,
      tier: tier ?? 'unchanged',
      priceId,
    });
  }
}

/**
 * customer.subscription.deleted
 *
 * Fully canceled subscription. Sets subscription_status = 'canceled' but
 * preserves the tier and customer ID so the customer can resubscribe
 * without losing context.
 */
export async function handleSubscriptionDeleted(
  sub: StripeSubscriptionLike,
  supabase: SupabaseClientLike,
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
    console.log(`customer.subscription.deleted: canceled customer ${customerId}`, { endsAt });
  }
}

/**
 * invoice.payment_failed
 *
 * Subscription renewal invoice failed to collect. Stripe will retry; we
 * mark the org past_due so the UI prompts the customer.
 */
export async function handleInvoicePaymentFailed(
  invoice: StripeInvoiceLike,
  supabase: SupabaseClientLike,
): Promise<void> {
  const customerId = extractCustomerId(invoice.customer);
  if (!customerId) {
    console.error('invoice.payment_failed: customer ID missing', { invoiceId: invoice.id });
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('invoice.payment_failed: DB update failed', error, { customerId });
  } else {
    console.log(`invoice.payment_failed: marked past_due for customer ${customerId}`);
  }
}
