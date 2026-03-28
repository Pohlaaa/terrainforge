/**
 * useBillingGate
 *
 * Reads the current org's subscription state and returns gating signals used
 * by ProtectedRoute (redirect) and AppLayout (trial banner).
 *
 * Gate conditions (isGated = true):
 *  - subscriptionStatus === 'canceled'
 *  - subscriptionStatus === 'none'
 *  - subscriptionStatus === 'trialing' AND trialEndsAt has passed
 *
 * Intentionally NOT gated:
 *  - subscriptionStatus === 'active'
 *  - subscriptionStatus === 'past_due'  (grace period — show banner, allow access)
 *  - org is null / still loading       (avoid flash-redirect on initial load)
 */

import { useMemo } from 'react';
import { useOrgStore } from '@/stores/orgStore';

export interface BillingGateResult {
  /**
   * True when the user's access should be restricted to the /billing page.
   * Safe default is false (don't gate while org is loading).
   */
  isGated: boolean;

  /**
   * Days remaining in the free trial.
   * null  → not in a trialing state, or trialEndsAt is unknown.
   * < 0   → trial has expired.
   */
  daysLeft: number | null;

  /**
   * True when a trial is active with 7 or fewer days remaining.
   * Drives the yellow "trial ending soon" banner in AppLayout.
   */
  showUrgentBanner: boolean;

  /**
   * True when subscriptionStatus is 'past_due'.
   * Drives a separate "payment failed" banner in AppLayout.
   */
  isPastDue: boolean;
}

export function useBillingGate(): BillingGateResult {
  const org = useOrgStore((s) => s.org);

  return useMemo((): BillingGateResult => {
    // No org data yet — don't gate to avoid a flash redirect on first load
    if (!org) {
      return { isGated: false, daysLeft: null, showUrgentBanner: false, isPastDue: false };
    }

    const { subscriptionStatus, trialEndsAt } = org;

    // ── Trial days remaining ───────────────────────────────────────────────
    let daysLeft: number | null = null;
    if (subscriptionStatus === 'trialing' && trialEndsAt) {
      daysLeft = Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }

    // ── Gate logic ─────────────────────────────────────────────────────────
    const isGated =
      subscriptionStatus === 'canceled' ||
      subscriptionStatus === 'none' ||
      (subscriptionStatus === 'trialing' && daysLeft !== null && daysLeft < 0);

    // ── Banner signals ─────────────────────────────────────────────────────
    const showUrgentBanner =
      subscriptionStatus === 'trialing' &&
      daysLeft !== null &&
      daysLeft >= 0 &&
      daysLeft <= 7;

    const isPastDue = subscriptionStatus === 'past_due';

    return { isGated, daysLeft, showUrgentBanner, isPastDue };
  }, [org]);
}
