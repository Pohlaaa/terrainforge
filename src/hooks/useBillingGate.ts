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
import { useAuth } from '@/contexts/AuthContext';

/**
 * F-CW-LIVE-01: emails that bypass the billing gate even on prod.
 * Used for internal QA / contractor-walkthrough testing where the trial-
 * expired billing wall would otherwise block the entire app surface. The
 * match is case-insensitive and tolerates Gmail plus-aliasing
 * (woodsrider82+anything@gmail.com → all bypass). Keep this short and
 * audit-friendly.
 */
const INTERNAL_BYPASS_EMAILS = new Set<string>([
  'woodsrider82@gmail.com',
]);
function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Strip Gmail plus-alias for matching (foo+anything@gmail.com → foo@gmail.com)
  const normalized = email.toLowerCase().replace(/^([^+@]+)\+[^@]*@/, '$1@');
  return INTERNAL_BYPASS_EMAILS.has(normalized);
}

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
   * True when a trial is active (status = 'trialing' and daysLeft >= 0).
   * Drives the TrialBanner in AppLayout for ALL trial users.
   */
  isTrial: boolean;

  /**
   * True when a trial is active with 7 or fewer days remaining.
   * Drives the yellow "trial ending soon" banner in AppLayout.
   */
  showUrgentBanner: boolean;

  /**
   * True when the user had a trial that has expired and never subscribed.
   * Drives the TrialExpiredOverlay read-only mode.
   */
  isExpiredTrial: boolean;

  /**
   * True when subscriptionStatus is 'past_due'.
   * Drives a separate "payment failed" banner in AppLayout.
   */
  isPastDue: boolean;

  /**
   * True when the user should be in read-only mode (expired trial).
   * Components should disable write actions when this is true.
   */
  readOnly: boolean;
}

export function useBillingGate(): BillingGateResult {
  const org = useOrgStore((s) => s.org);
  const { user } = useAuth();

  return useMemo((): BillingGateResult => {
    // Dev escape hatch — lets solo developers (or Claude) walk through a
    // trial-expired account without subscribing. Gated on import.meta.env.DEV
    // so the entire branch dead-code-eliminates from prod builds, plus an
    // explicit VITE_DEV_BYPASS_BILLING opt-in so devs who want to test the
    // gate itself can leave it enabled.
    if (import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_BILLING === 'true') {
      return { isGated: false, daysLeft: null, isTrial: false, showUrgentBanner: false, isExpiredTrial: false, isPastDue: false, readOnly: false };
    }

    // F-CW-LIVE-01: internal QA email allowlist bypass — works in any env
    // including prod. Without this, alias accounts (woodsrider82+test4@gmail.com)
    // hit the trial-expired wall on staging and can't exercise the app.
    if (isInternalEmail(user?.email)) {
      return { isGated: false, daysLeft: null, isTrial: false, showUrgentBanner: false, isExpiredTrial: false, isPastDue: false, readOnly: false };
    }

    // No org data yet — don't gate to avoid a flash redirect on first load
    if (!org) {
      return { isGated: false, daysLeft: null, isTrial: false, showUrgentBanner: false, isExpiredTrial: false, isPastDue: false, readOnly: false };
    }

    const { subscriptionStatus, trialEndsAt } = org;

    // ── Trial days remaining ───────────────────────────────────────────────
    let daysLeft: number | null = null;
    if (trialEndsAt) {
      daysLeft = Math.ceil(
        (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
    }

    // ── Trial state ────────────────────────────────────────────────────────
    const isTrial =
      subscriptionStatus === 'trialing' && daysLeft !== null && daysLeft >= 0;

    // Expired trial: had a trial (trialEndsAt exists), it expired, never subscribed
    const isExpiredTrial =
      subscriptionStatus === 'none' && trialEndsAt !== null && daysLeft !== null && daysLeft < 0;

    // ── Gate logic ─────────────────────────────────────────────────────────
    const isGated =
      subscriptionStatus === 'canceled' ||
      (subscriptionStatus === 'none' && !isExpiredTrial) ||
      (subscriptionStatus === 'trialing' && daysLeft !== null && daysLeft < 0);

    // ── Banner signals ─────────────────────────────────────────────────────
    const showUrgentBanner =
      subscriptionStatus === 'trialing' &&
      daysLeft !== null &&
      daysLeft >= 0 &&
      daysLeft <= 7;

    const isPastDue = subscriptionStatus === 'past_due';

    return { isGated, daysLeft, isTrial, showUrgentBanner, isExpiredTrial, isPastDue, readOnly: isExpiredTrial };
  }, [org, user?.email]);
}
