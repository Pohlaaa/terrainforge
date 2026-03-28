/**
 * Organisation store
 *
 * Holds the current user's org record, including subscription / billing state.
 * Loaded once on app init (after auth), then used by useBillingGate and
 * AppLayout to drive the trial banner and billing gate.
 *
 * Phase 1 MVP: user.id === org.id (1-to-1 sign-up flow). Phase 3 will
 * introduce a proper org_members lookup.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/services/supabase';
import type { Organization, SubscriptionStatus, SubscriptionTier } from '@/types';

// ── Store interface ───────────────────────────────────────────────────────────

interface OrgStore {
  org: Organization | null;
  isLoading: boolean;
  error: string | null;
  /** Fetch the org row for the given org/user ID and update store state. */
  fetchOrg: (orgId: string) => Promise<void>;
  /** Clear org data on sign-out. */
  clearOrg: () => void;
}

// ── DB row type (snake_case from Supabase) ────────────────────────────────────

interface OrgRow {
  id: string;
  name: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  stripe_customer_id: string | null;
}

// ── Mapping helper ────────────────────────────────────────────────────────────

function mapOrgRow(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name ?? '',
    subscriptionStatus: (row.subscription_status as SubscriptionStatus) ?? 'trialing',
    subscriptionTier: (row.subscription_tier as SubscriptionTier) ?? 'starter',
    trialEndsAt: row.trial_ends_at ?? null,
    subscriptionEndsAt: row.subscription_ends_at ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
  };
}

/**
 * Default org used when no row exists yet (e.g., new sign-up before the
 * Supabase trigger has created the org, or no DB connection).
 * We default to trialing/starter so the app is fully usable in offline mode.
 */
function makeDefaultOrg(orgId: string): Organization {
  return {
    id: orgId,
    name: '',
    subscriptionStatus: 'trialing',
    subscriptionTier: 'starter',
    trialEndsAt: null, // unknown — don't gate when we can't confirm
    subscriptionEndsAt: null,
    stripeCustomerId: null,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useOrgStore = create<OrgStore>()(
  persist(
    (set) => ({
      org: null,
      isLoading: false,
      error: null,

      fetchOrg: async (orgId: string) => {
        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase
            .from('organizations')
            .select(
              'id, name, subscription_status, subscription_tier, trial_ends_at, subscription_ends_at, stripe_customer_id'
            )
            .eq('id', orgId)
            .single();

          if (error) {
            // PGRST116 = row not found — use safe defaults, don't surface as error
            if (error.code === 'PGRST116') {
              set({ org: makeDefaultOrg(orgId), isLoading: false });
            } else {
              // Network or other error — keep any cached org, surface error
              set({ isLoading: false, error: error.message });
            }
            return;
          }

          set({ org: mapOrgRow(data as OrgRow), isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to load org data',
          });
        }
      },

      clearOrg: () => set({ org: null, error: null, isLoading: false }),
    }),
    { name: 'tf_org' }
  )
);
