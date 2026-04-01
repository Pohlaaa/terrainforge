/**
 * Billing Page — Plan selection and subscription management.
 *
 * Displays three pricing tier cards (Starter / Pro / Business), the user's
 * current plan and trial status, and upgrade / portal CTA buttons that call
 * the Stripe service layer.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgStore } from '@/stores/orgStore';
import { supabase } from '@/services/supabase';
import {
  createCheckoutSession,
  createPortalSession,
} from '@/services/stripe';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from '@/hooks/useToast';
import type { SubscriptionStatus, SubscriptionTier } from '@/types';

// ── Local types ───────────────────────────────────────────────────────────────

interface OrgBillingRow {
  subscription_status: string | null;
  subscription_tier: string | null;
  trial_ends_at: string | null;
}

interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: number;
  /** Stripe Price ID — set via VITE_STRIPE_PRICE_<TIER> env var */
  priceId: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}

// ── Pricing tier definitions ──────────────────────────────────────────────────

const TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER ?? '',
    tagline: 'For solo operators and small crews getting organised.',
    features: [
      '5 active projects',
      '1 user seat',
      'Material library & manifest engine',
      'Work orders & crew scheduling',
      'Equipment tracking',
      'PDF export (manifest + crew packet)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO ?? '',
    tagline: 'For growing companies managing multiple crews.',
    features: [
      '25 active projects',
      '5 user seats',
      'Everything in Starter',
      'AI-assisted price research',
      'Priority support',
      'Advanced reporting',
    ],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    priceId: import.meta.env.VITE_STRIPE_PRICE_BUSINESS ?? '',
    tagline: 'For established contractors running full operations.',
    features: [
      'Unlimited active projects',
      '15 user seats',
      'Everything in Pro',
      'Custom material categories',
      'API access',
      'Dedicated onboarding call',
    ],
  },
];

/** Numeric rank used to determine upgrade vs. downgrade direction. */
const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  pro: 1,
  business: 2,
};

// ── Component ─────────────────────────────────────────────────────────────────

const Billing: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetchOrg = useOrgStore((s) => s.fetchOrg);

  // Subscription data from the organizations table
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>('trialing');
  const [subTier, setSubTier] = useState<SubscriptionTier>('starter');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Per-button loading state
  const [checkingOut, setCheckingOut] = useState<SubscriptionTier | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  /**
   * Phase 1 MVP: user.id doubles as the org ID — every new sign-up creates
   * one org. Will be replaced with an explicit org lookup in Phase 3.
   */
  const orgId = user?.id ?? '';

  // Polling state for webhook processing
  const [pollingStatus, setPollingStatus] = useState(false);

  // ── Handle post-Stripe redirect ────────────────────────────────────────────

  useEffect(() => {
    const session = searchParams.get('session');
    if (!session) return;

    // Strip the param from the URL so a hard-refresh doesn't re-trigger
    setSearchParams({}, { replace: true });

    if (session === 'success') {
      setPollingStatus(true);
      // Poll for webhook to update subscription status (async, may take a few seconds)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (orgId) await fetchOrg(orgId);
        const currentStatus = useOrgStore.getState().org?.subscriptionStatus;
        if (currentStatus === 'active' || attempts >= 8) {
          clearInterval(poll);
          setPollingStatus(false);
          setCheckoutSuccess(true);
          toast.success('Welcome aboard!', 'Your subscription is active.');
        }
      }, 2000);
      return () => clearInterval(poll);
    }

    if (session === 'cancel') {
      toast.info('Checkout canceled', 'You can subscribe anytime from Settings → Billing.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync orgStore on mount (F-008: stale billing status fix) ───────────────

  useEffect(() => {
    if (orgId) fetchOrg(orgId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // ── Fetch billing data ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgId) {
      setLoadingData(false);
      return;
    }

    const fetchBilling = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('subscription_status, subscription_tier, trial_ends_at')
        .eq('id', orgId)
        .single();

      if (!error && data) {
        const row = data as OrgBillingRow;
        setSubStatus((row.subscription_status as SubscriptionStatus) ?? 'trialing');
        setSubTier((row.subscription_tier as SubscriptionTier) ?? 'starter');
        setTrialEndsAt(row.trial_ends_at ?? null);
      }
      // If no row found (PGRST116) or network error, keep defaults (trialing/starter)

      setLoadingData(false);
    };

    fetchBilling();
  }, [orgId]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const daysRemaining: number | null = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const trialActive = subStatus === 'trialing' && daysRemaining !== null && daysRemaining >= 0;
  const trialExpired = subStatus === 'trialing' && daysRemaining !== null && daysRemaining < 0;
  const showUrgentBanner = trialActive && daysRemaining !== null && daysRemaining <= 7;

  const isSubscribed = subStatus === 'active' || subStatus === 'past_due';

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSubscribe = async (tier: PricingTier) => {
    if (!tier.priceId) {
      setActionError(
        `Stripe price ID not configured. Set VITE_STRIPE_PRICE_${tier.id.toUpperCase()} in your environment variables.`
      );
      return;
    }
    setActionError(null);
    setCheckingOut(tier.id);
    try {
      await createCheckoutSession(tier.priceId, orgId);
      // createCheckoutSession redirects — if we reach here, something went wrong
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Checkout failed');
      setCheckingOut(null);
    }
  };

  const handleManageBilling = async () => {
    setActionError(null);
    setOpeningPortal(true);
    try {
      await createPortalSession(orgId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open billing portal');
      setOpeningPortal(false);
    }
  };

  // ── Card helpers ───────────────────────────────────────────────────────────

  const isCurrentPlan = (tier: PricingTier): boolean =>
    tier.id === subTier && isSubscribed;

  const isButtonDisabled = (tier: PricingTier): boolean =>
    isCurrentPlan(tier) || checkingOut !== null || openingPortal;

  const getButtonLabel = (tier: PricingTier): string => {
    if (checkingOut === tier.id) return 'Redirecting…';
    if (isSubscribed) {
      if (tier.id === subTier) return 'Current Plan';
      return TIER_RANK[tier.id] > TIER_RANK[subTier]
        ? `Upgrade to ${tier.name}`
        : `Downgrade to ${tier.name}`;
    }
    return `Subscribe — $${tier.price}/mo`;
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-[64px]">
        <div className="text-center">
          <div className="animate-spin inline-block text-[28px] mb-[10px]">⌛</div>
          <div className="text-[13px] text-[var(--text-3)]">Loading billing info…</div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-[960px]">
      <PageHeader
        title="Billing & Plan"
        subtitle="Choose the plan that fits your operation. Upgrade or downgrade any time."
      />

      {/* ── Banners ─────────────────────────────────────────────────────────── */}

      {/* Polling for webhook */}
      {pollingStatus && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[rgba(37,99,235,.08)] border border-[rgba(37,99,235,.3)] flex items-center gap-[12px]">
          <div className="animate-spin text-[18px] flex-shrink-0">⌛</div>
          <div className="text-[13px] font-[600] text-[var(--status-blue)]">
            Processing your subscription…
          </div>
        </div>
      )}

      {/* Checkout success */}
      {checkoutSuccess && !pollingStatus && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[rgba(116,198,157,.1)] border border-[rgba(116,198,157,.4)] flex items-center justify-between gap-[12px]">
          <div className="flex items-center gap-[12px]">
            <span className="text-[18px] flex-shrink-0">✅</span>
            <div>
              <div className="text-[13px] font-[600] text-[var(--green-l)]">Subscription activated!</div>
              <div className="text-[11px] text-[var(--text-3)] mt-[2px]">
                You now have full access. Your plan details are updated below.
              </div>
            </div>
          </div>
          <button
            onClick={() => setCheckoutSuccess(false)}
            aria-label="Dismiss"
            className="flex-shrink-0 text-[var(--green-l)] hover:text-[var(--text)] text-[16px] leading-none transition-colors bg-transparent border-none cursor-pointer p-[2px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Trial status — informational (> 7 days remaining) */}
      {trialActive && !showUrgentBanner && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[var(--status-blue-bg)] border border-[rgba(37,99,235,.3)] flex items-center gap-[12px]">
          <span className="text-[18px] flex-shrink-0">ℹ️</span>
          <div>
            <div className="text-[13px] font-[600] text-[var(--status-blue)]">
              You're on a <strong>14-day free trial</strong>{daysRemaining !== null ? ` — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining` : ''}
            </div>
            <div className="text-[11px] text-[var(--text-3)] mt-[2px]">
              Choose a plan below to continue after your trial ends.
            </div>
          </div>
        </div>
      )}

      {/* Trial ending soon (urgent) */}
      {showUrgentBanner && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[rgba(251,146,60,.1)] border border-[rgba(251,146,60,.4)] flex items-center gap-[12px]">
          <span className="text-[18px] flex-shrink-0">⚠️</span>
          <div>
            <div className="text-[13px] font-[600] text-[#FB923C]">
              Your trial ends in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] text-[var(--text-3)] mt-[2px]">
              Subscribe below to keep access to all your projects and data.
            </div>
          </div>
        </div>
      )}

      {/* Active subscription */}
      {subStatus === 'active' && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[var(--status-green-bg)] border border-[rgba(22,163,74,.3)] flex items-center gap-[12px]">
          <span className="text-[18px] flex-shrink-0">✅</span>
          <div className="text-[13px] font-[600] text-[var(--status-green)]">
            Your <strong className="capitalize">{subTier}</strong> plan is active.
          </div>
        </div>
      )}

      {/* Canceled */}
      {subStatus === 'canceled' && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[var(--status-amber-bg)] border border-[rgba(245,158,11,.3)] flex items-center gap-[12px]">
          <span className="text-[18px] flex-shrink-0">⚠️</span>
          <div className="text-[13px] font-[600] text-[var(--status-amber)]">
            Your subscription has been canceled. Choose a plan below to reactivate.
          </div>
        </div>
      )}

      {/* Trial expired */}
      {trialExpired && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.4)] flex items-center gap-[12px]">
          <span className="text-[18px] flex-shrink-0">🔒</span>
          <div>
            <div className="text-[13px] font-[600] text-[#DC2626]">Your free trial has ended</div>
            <div className="text-[11px] text-[var(--text-3)] mt-[2px]">
              Your data is preserved. Subscribe below to regain full access.
            </div>
          </div>
        </div>
      )}

      {/* Past due */}
      {subStatus === 'past_due' && (
        <div className="mb-[20px] px-[16px] py-[12px] rounded-[8px] bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.4)] flex items-center gap-[12px]">
          <span className="text-[18px] flex-shrink-0">💳</span>
          <div className="flex-1">
            <div className="text-[13px] font-[600] text-[#DC2626]">Payment failed</div>
            <div className="text-[11px] text-[var(--text-3)] mt-[2px]">
              Please update your payment method to keep your subscription active.
            </div>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={openingPortal}
            className="px-[12px] py-[7px] text-[12px] font-[600] bg-[#DC2626] text-white rounded-[8px] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {openingPortal ? 'Opening…' : 'Update Card'}
          </button>
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div className="mb-[20px] px-[16px] py-[10px] rounded-[8px] bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.3)] text-[12px] text-[#DC2626]">
          {actionError}
        </div>
      )}

      {/* ── Current plan status card ─────────────────────────────────────────── */}

      <div className="mb-[28px] bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] px-[20px] py-[16px] flex items-center justify-between gap-[16px]">
        <div>
          <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em] mb-[6px]">
            Current Plan
          </div>
          <div className="flex items-center gap-[10px] flex-wrap">
            <span className="font-serif text-[22px] text-[var(--text)] capitalize">{subTier}</span>
            <span
              className={`px-[8px] py-[2px] rounded-[4px] text-[10px] font-[700] uppercase tracking-[0.05em] ${
                subStatus === 'active'
                  ? 'bg-[rgba(116,198,157,.15)] text-[var(--green-l)]'
                  : subStatus === 'trialing'
                  ? 'bg-[rgba(251,146,60,.15)] text-[#FB923C]'
                  : subStatus === 'past_due'
                  ? 'bg-[rgba(220,38,38,.15)] text-[#DC2626]'
                  : subStatus === 'canceled'
                  ? 'bg-[var(--surface3)] text-[var(--text-3)]'
                  : 'bg-[var(--surface3)] text-[var(--text-4)]'
              }`}
            >
              {subStatus === 'trialing'
                ? trialActive && daysRemaining !== null
                  ? `Trial · ${daysRemaining}d left`
                  : 'Trial Expired'
                : subStatus === 'active'
                ? 'Active'
                : subStatus === 'past_due'
                ? 'Past Due'
                : subStatus === 'canceled'
                ? 'Canceled'
                : 'No Plan'}
            </span>
          </div>
          {subStatus === 'trialing' && trialActive && daysRemaining !== null && (
            <div className="text-[11px] text-[var(--text-4)] mt-[4px]">
              14-day free trial — no credit card required
            </div>
          )}
        </div>

        {isSubscribed && (
          <button
            onClick={handleManageBilling}
            disabled={openingPortal}
            className="flex-shrink-0 px-[14px] py-[8px] text-[12px] font-[600] bg-[var(--surface)] border border-[var(--border)] rounded-[8px] text-[var(--text-2)] hover:text-[var(--text)] hover:border-[var(--green-l)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {openingPortal ? 'Opening…' : 'Manage Billing →'}
          </button>
        )}
      </div>

      {/* ── Billing period note ──────────────────────────────────────────────── */}

      <div className="text-[11px] text-[var(--text-4)] mb-[16px]">
        All plans billed monthly · Annual pricing available (2 months free) ·{' '}
        <span className="text-[var(--green-l)] cursor-pointer hover:underline">
          Contact us for annual billing
        </span>
      </div>

      {/* ── Pricing cards grid ───────────────────────────────────────────────── */}

      <div className="grid grid-cols-3 gap-[16px]">
        {TIERS.map((tier) => {
          const current = isCurrentPlan(tier);
          const disabled = isButtonDisabled(tier);

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-[12px] border p-[24px] transition-colors ${
                current
                  ? 'bg-[rgba(45,106,79,.07)] border-[var(--green-l)]'
                  : tier.popular
                  ? 'bg-[var(--surface2)] border-[rgba(116,198,157,.35)]'
                  : 'bg-[var(--surface2)] border-[var(--border)]'
              }`}
            >
              {/* Floating badge: Current Plan or Most Popular */}
              {current && (
                <div className="absolute -top-[11px] left-1/2 -translate-x-1/2 px-[12px] py-[3px] rounded-full bg-[var(--green-l)] text-[var(--surface)] text-[10px] font-[700] uppercase tracking-[0.06em] whitespace-nowrap">
                  Current Plan
                </div>
              )}
              {!current && tier.popular && (
                <div className="absolute -top-[11px] left-1/2 -translate-x-1/2 px-[12px] py-[3px] rounded-full bg-[var(--green-l)] text-[var(--surface)] text-[10px] font-[700] uppercase tracking-[0.06em] whitespace-nowrap">
                  Most Popular
                </div>
              )}

              {/* Tier name */}
              <div className="font-serif text-[22px] text-[var(--text)] mb-[4px]">{tier.name}</div>
              <div className="text-[11px] text-[var(--text-3)] mb-[18px] leading-[1.55]">{tier.tagline}</div>

              {/* Price */}
              <div className="flex items-end gap-[3px] mb-[20px]">
                <span className="font-serif text-[44px] text-[var(--text)] leading-[1]">${tier.price}</span>
                <span className="text-[13px] text-[var(--text-4)] mb-[8px]">/mo</span>
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--border)] mb-[18px]" />

              {/* Feature list */}
              <ul className="flex-1 space-y-[9px] mb-[24px]">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-[8px] text-[12px] text-[var(--text-2)]">
                    <span
                      className="flex-shrink-0 mt-[1px] font-[700]"
                      style={{ color: 'var(--green-l)' }}
                    >
                      ✓
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                onClick={() => !disabled && handleSubscribe(tier)}
                disabled={disabled}
                className={`w-full py-[10px] rounded-[8px] text-[13px] font-[700] transition-all ${
                  current
                    ? 'bg-[rgba(116,198,157,.15)] text-[var(--green-l)] cursor-default'
                    : disabled
                    ? 'bg-[var(--green-l)] text-[var(--surface)] opacity-50 cursor-not-allowed'
                    : 'bg-[var(--green-l)] text-[var(--surface)] hover:brightness-110 cursor-pointer'
                }`}
              >
                {getButtonLabel(tier)}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────────── */}

      <div className="mt-[28px] px-[20px] py-[16px] bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] text-[11px] text-[var(--text-3)] leading-[1.75]">
        <span className="font-[600] text-[var(--text-2)]">Questions?</span>{' '}
        All plans start with a 14-day free trial — no credit card required. Payments are processed
        securely by Stripe. You can cancel at any time; your data is never deleted. For the Business
        tier onboarding call or custom annual pricing,{' '}
        <span className="text-[var(--green-l)] cursor-pointer hover:underline">contact us</span>.
      </div>
    </div>
  );
};

export default Billing;
