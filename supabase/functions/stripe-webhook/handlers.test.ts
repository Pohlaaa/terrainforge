import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPriceToTierMap,
  extractCustomerId,
  mapStripeStatus,
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  type StripeCheckoutSessionLike,
  type StripeSubscriptionLike,
  type StripeInvoiceLike,
  type StripeClientLike,
  type SupabaseClientLike,
  type OrgBillingUpdate,
  type SubscriptionTier,
} from './handlers';

/**
 * P0 #2: stripe-webhook handler contract tests.
 *
 * The handlers are payment-critical — a bug here means a paid contractor
 * gets locked out, or a canceled subscription stays "active" and we keep
 * giving away the product. These tests exercise every handler against
 * synthetic Stripe payloads (matching the shape of real webhook events)
 * with a recording supabase mock that captures the .update().eq() call.
 */

// ── Recording supabase mock ──────────────────────────────────────────────────

interface RecordedCall {
  table: string;
  payload: OrgBillingUpdate;
  filterCol: string;
  filterVal: string;
}

function makeSupabaseMock(opts: { failWith?: string } = {}): {
  client: SupabaseClientLike;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const client: SupabaseClientLike = {
    from: (table: string) => ({
      update: (payload: OrgBillingUpdate) => ({
        eq: async (col: string, val: string) => {
          calls.push({ table, payload, filterCol: col, filterVal: val });
          return {
            error: opts.failWith ? { message: opts.failWith } : null,
          };
        },
      }),
    }),
  };
  return { client, calls };
}

function makeStripeMock(retrievedSub: StripeSubscriptionLike | null): StripeClientLike {
  return {
    subscriptions: {
      retrieve: async (id: string) => {
        if (!retrievedSub) throw new Error('not found');
        return { ...retrievedSub, id };
      },
    },
  };
}

const PRICES = {
  starter: 'price_starter_test',
  pro: 'price_pro_test',
  business: 'price_business_test',
};

function makeTierMap(): Map<string, SubscriptionTier> {
  return buildPriceToTierMap({
    starter: PRICES.starter,
    pro: PRICES.pro,
    business: PRICES.business,
  });
}

// Silence the handlers' console.log/error noise in test output.
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ── Pure helpers ────────────────────────────────────────────────────────────

describe('extractCustomerId', () => {
  it('returns the string when given a string', () => {
    expect(extractCustomerId('cus_123')).toBe('cus_123');
  });
  it('returns the .id when given an object', () => {
    expect(extractCustomerId({ id: 'cus_456' })).toBe('cus_456');
  });
  it('returns null for null/undefined', () => {
    expect(extractCustomerId(null)).toBeNull();
    expect(extractCustomerId(undefined)).toBeNull();
  });
});

describe('mapStripeStatus', () => {
  it('maps the four paid-state Stripe statuses to internal equivalents', () => {
    expect(mapStripeStatus('active')).toBe('active');
    expect(mapStripeStatus('trialing')).toBe('trialing');
    expect(mapStripeStatus('past_due')).toBe('past_due');
    expect(mapStripeStatus('unpaid')).toBe('past_due');
  });
  it('maps canceled + incomplete_expired to canceled', () => {
    expect(mapStripeStatus('canceled')).toBe('canceled');
    expect(mapStripeStatus('incomplete_expired')).toBe('canceled');
  });
  it('falls through to "none" for incomplete / paused / unknown', () => {
    expect(mapStripeStatus('incomplete')).toBe('none');
    expect(mapStripeStatus('paused')).toBe('none');
    expect(mapStripeStatus('mystery_status')).toBe('none');
  });
});

describe('buildPriceToTierMap', () => {
  it('skips missing entries silently', () => {
    const map = buildPriceToTierMap({ starter: 'price_a', pro: undefined, business: null });
    expect(map.get('price_a')).toBe('starter');
    expect(map.size).toBe(1);
  });
  it('returns an empty map when all undefined', () => {
    expect(buildPriceToTierMap({}).size).toBe(0);
  });
});

// ── handleCheckoutSessionCompleted ──────────────────────────────────────────

describe('handleCheckoutSessionCompleted', () => {
  const baseSession: StripeCheckoutSessionLike = {
    id: 'cs_test_1',
    mode: 'subscription',
    metadata: { org_id: 'org-uuid-1' },
    customer: 'cus_paid_1',
    subscription: 'sub_paid_1',
  };

  it('activates the org with tier resolved from the price', async () => {
    const supabase = makeSupabaseMock();
    const stripe = makeStripeMock({
      id: 'sub_paid_1',
      status: 'active',
      customer: 'cus_paid_1',
      items: { data: [{ price: { id: PRICES.pro } }] },
    });

    await handleCheckoutSessionCompleted(baseSession, stripe, supabase.client, makeTierMap());

    expect(supabase.calls).toHaveLength(1);
    expect(supabase.calls[0]).toMatchObject({
      table: 'organizations',
      filterCol: 'owner_id',
      filterVal: 'org-uuid-1',
      payload: {
        stripe_customer_id: 'cus_paid_1',
        subscription_status: 'active',
        subscription_tier: 'pro',
      },
    });
  });

  it('skips non-subscription sessions (one-time payments etc.)', async () => {
    const supabase = makeSupabaseMock();
    const stripe = makeStripeMock(null);
    await handleCheckoutSessionCompleted(
      { ...baseSession, mode: 'payment' },
      stripe,
      supabase.client,
      makeTierMap(),
    );
    expect(supabase.calls).toHaveLength(0);
  });

  it('refuses to write if metadata.org_id is missing (no orphan updates)', async () => {
    const supabase = makeSupabaseMock();
    const stripe = makeStripeMock({
      id: 'sub_paid_1',
      status: 'active',
      customer: 'cus_paid_1',
      items: { data: [{ price: { id: PRICES.pro } }] },
    });
    await handleCheckoutSessionCompleted(
      { ...baseSession, metadata: {} },
      stripe,
      supabase.client,
      makeTierMap(),
    );
    expect(supabase.calls).toHaveLength(0);
  });

  it('still activates even if the price does not map to a known tier', async () => {
    // Stripe sends an unrecognized price (e.g. legacy plan); we should still
    // mark the customer active and link them, just without tier — billing
    // bug #1 risk is failing to link a paid customer at all.
    const supabase = makeSupabaseMock();
    const stripe = makeStripeMock({
      id: 'sub_paid_1',
      status: 'active',
      customer: 'cus_paid_1',
      items: { data: [{ price: { id: 'price_unknown_legacy' } }] },
    });
    await handleCheckoutSessionCompleted(baseSession, stripe, supabase.client, makeTierMap());

    expect(supabase.calls).toHaveLength(1);
    expect(supabase.calls[0].payload.subscription_status).toBe('active');
    expect(supabase.calls[0].payload.stripe_customer_id).toBe('cus_paid_1');
    // tier should be omitted, not set to null/'unmapped'
    expect(supabase.calls[0].payload.subscription_tier).toBeUndefined();
  });

  it('extracts customer ID from object form (defensive)', async () => {
    const supabase = makeSupabaseMock();
    const stripe = makeStripeMock({
      id: 'sub_paid_1',
      status: 'active',
      customer: { id: 'cus_obj_form' },
      items: { data: [{ price: { id: PRICES.starter } }] },
    });
    await handleCheckoutSessionCompleted(
      { ...baseSession, customer: { id: 'cus_obj_form' } },
      stripe,
      supabase.client,
      makeTierMap(),
    );
    expect(supabase.calls[0].payload.stripe_customer_id).toBe('cus_obj_form');
  });
});

// ── handleSubscriptionUpdated ───────────────────────────────────────────────

describe('handleSubscriptionUpdated', () => {
  it('upgrades tier on plan switch', async () => {
    const supabase = makeSupabaseMock();
    await handleSubscriptionUpdated(
      {
        id: 'sub_1',
        status: 'active',
        customer: 'cus_1',
        items: { data: [{ price: { id: PRICES.business } }] },
      },
      supabase.client,
      makeTierMap(),
    );
    expect(supabase.calls).toHaveLength(1);
    expect(supabase.calls[0]).toMatchObject({
      filterCol: 'stripe_customer_id',
      filterVal: 'cus_1',
      payload: { subscription_status: 'active', subscription_tier: 'business' },
    });
  });

  it('marks past_due when Stripe reports unpaid', async () => {
    const supabase = makeSupabaseMock();
    await handleSubscriptionUpdated(
      {
        id: 'sub_2',
        status: 'unpaid',
        customer: 'cus_2',
        items: { data: [{ price: { id: PRICES.pro } }] },
      },
      supabase.client,
      makeTierMap(),
    );
    expect(supabase.calls[0].payload.subscription_status).toBe('past_due');
  });

  it('preserves tier when the price does not map (does not clobber existing tier)', async () => {
    const supabase = makeSupabaseMock();
    await handleSubscriptionUpdated(
      {
        id: 'sub_3',
        status: 'active',
        customer: 'cus_3',
        items: { data: [{ price: { id: 'price_unknown' } }] },
      },
      supabase.client,
      makeTierMap(),
    );
    // payload should NOT include subscription_tier — that lets the existing
    // value on the org row stand.
    expect(supabase.calls[0].payload.subscription_tier).toBeUndefined();
    expect(supabase.calls[0].payload.subscription_status).toBe('active');
  });

  it('refuses to write if customer ID is missing', async () => {
    const supabase = makeSupabaseMock();
    await handleSubscriptionUpdated(
      {
        id: 'sub_4',
        status: 'active',
        customer: null,
        items: { data: [{ price: { id: PRICES.pro } }] },
      },
      supabase.client,
      makeTierMap(),
    );
    expect(supabase.calls).toHaveLength(0);
  });
});

// ── handleSubscriptionDeleted ───────────────────────────────────────────────

describe('handleSubscriptionDeleted', () => {
  it('marks canceled and stamps subscription_ends_at to period end', async () => {
    const supabase = makeSupabaseMock();
    const periodEndSec = 1_800_000_000; // 2027-01-15 UTC-ish, deterministic
    await handleSubscriptionDeleted(
      {
        id: 'sub_x',
        status: 'canceled',
        customer: 'cus_x',
        current_period_end: periodEndSec,
        items: { data: [{ price: { id: PRICES.pro } }] },
      },
      supabase.client,
    );
    expect(supabase.calls).toHaveLength(1);
    expect(supabase.calls[0].filterCol).toBe('stripe_customer_id');
    expect(supabase.calls[0].payload.subscription_status).toBe('canceled');
    expect(supabase.calls[0].payload.subscription_ends_at).toBe(
      new Date(periodEndSec * 1000).toISOString(),
    );
    // Importantly, tier and stripe_customer_id should NOT be cleared so the
    // contractor can resubscribe without us losing context.
    expect(supabase.calls[0].payload.subscription_tier).toBeUndefined();
    expect(supabase.calls[0].payload.stripe_customer_id).toBeUndefined();
  });

  it('handles missing current_period_end with null', async () => {
    const supabase = makeSupabaseMock();
    await handleSubscriptionDeleted(
      {
        id: 'sub_y',
        status: 'canceled',
        customer: 'cus_y',
        current_period_end: null,
        items: { data: [{ price: {} }] },
      },
      supabase.client,
    );
    expect(supabase.calls[0].payload.subscription_ends_at).toBeNull();
  });
});

// ── handleInvoicePaymentFailed ──────────────────────────────────────────────

describe('handleInvoicePaymentFailed', () => {
  it('marks past_due so the UI can prompt for a card update', async () => {
    const supabase = makeSupabaseMock();
    await handleInvoicePaymentFailed(
      { id: 'in_1', customer: 'cus_failed' },
      supabase.client,
    );
    expect(supabase.calls).toHaveLength(1);
    expect(supabase.calls[0]).toMatchObject({
      table: 'organizations',
      filterCol: 'stripe_customer_id',
      filterVal: 'cus_failed',
      payload: { subscription_status: 'past_due' },
    });
    // We do not touch tier or other columns on a failed invoice.
    expect(supabase.calls[0].payload.subscription_tier).toBeUndefined();
    expect(supabase.calls[0].payload.subscription_ends_at).toBeUndefined();
  });

  it('refuses to write if customer ID is missing', async () => {
    const supabase = makeSupabaseMock();
    await handleInvoicePaymentFailed(
      { id: 'in_2', customer: null } satisfies StripeInvoiceLike,
      supabase.client,
    );
    expect(supabase.calls).toHaveLength(0);
  });
});

// ── DB error handling ───────────────────────────────────────────────────────

describe('DB error paths', () => {
  it('handler returns normally even when supabase update fails (caller swallows)', async () => {
    // The dispatcher logs and returns 200 regardless — these unit tests just
    // need to confirm we don't throw on a DB error and that the call still
    // happens.
    const supabase = makeSupabaseMock({ failWith: 'simulated DB outage' });
    await expect(
      handleInvoicePaymentFailed({ id: 'in_err', customer: 'cus_err' }, supabase.client),
    ).resolves.toBeUndefined();
    expect(supabase.calls).toHaveLength(1);
  });
});
