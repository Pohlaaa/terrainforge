/**
 * Stripe Service Layer
 *
 * Handles client-side Stripe integration:
 *  - Stripe.js initialisation (lazy singleton via stripePromise)
 *  - Checkout session creation via Supabase Edge Function
 *  - Subscription status reads from the organizations table
 *
 * NOTE: Secret-key Stripe operations (webhook handling, session creation)
 * live in the Supabase Edge Function `create-checkout-session`. This file
 * only holds what is safe to run in the browser.
 */

import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/services/supabase';
import type { SubscriptionStatus } from '@/types';

// ── Stripe.js singleton ───────────────────────────────────────────────────────

/**
 * Lazy Stripe.js instance. Resolves once the script has loaded.
 * All functions in this module that need Stripe await this promise.
 */
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK ?? '');

// ── Checkout ──────────────────────────────────────────────────────────────────

/**
 * Open a Stripe-hosted Checkout page for the given price.
 *
 * Flow:
 *  1. Calls the `create-checkout-session` Supabase Edge Function with the
 *     priceId and orgId.
 *  2. The Edge Function creates (or reuses) a Stripe Customer, attaches it to
 *     the org, creates a Checkout Session, and returns { url }.
 *  3. We redirect the browser to the returned URL.
 *
 * @param priceId  Stripe Price ID (e.g. "price_1Abc...") from the dashboard.
 * @param orgId    The org's UUID — passed to the Edge Function so it can look
 *                 up / create the Stripe Customer for this org.
 */
export async function createCheckoutSession(
  priceId: string,
  orgId: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'create-checkout-session',
    {
      body: {
        price_id: priceId,
        org_id: orgId,
        success_url: `${window.location.origin}/billing?session=success`,
        cancel_url: `${window.location.origin}/billing?session=cancel`,
      },
    }
  );

  if (error) {
    throw new Error(`Failed to create checkout session: ${error.message}`);
  }

  if (!data?.url) {
    throw new Error('No checkout URL returned from Edge Function');
  }

  window.location.href = data.url;
}

// ── Subscription status ───────────────────────────────────────────────────────

/**
 * Read the current subscription status for an organisation directly from the
 * `organizations` table. This value is kept up-to-date by the Stripe webhook
 * handler Edge Function.
 *
 * Returns `'none'` when the org row doesn't exist or the column is null so
 * callers always get a typed value — no null-checks required.
 *
 * @param orgId  The org's UUID.
 */
export async function getSubscriptionStatus(
  orgId: string
): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from('organizations')
    .select('subscription_status')
    .eq('id', orgId)
    .single();

  if (error || !data) return 'none';

  return (data.subscription_status as SubscriptionStatus) ?? 'none';
}
