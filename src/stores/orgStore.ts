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
  /** Update the org's display name. */
  updateOrgName: (name: string) => Promise<void>;
  /** Update org rate settings (labor rate, equipment rate, disposal rates). */
  updateOrgSettings: (settings: {
    defaultLaborRate?: number | null;
    defaultEquipmentRate?: number | null;
    disposalRates?: Record<string, number>;
  }) => Promise<void>;
  /** Clear org data on sign-out. */
  clearOrg: () => void;
}

// ── DB row type (snake_case from Supabase) ────────────────────────────────────

interface OrgRow {
  id: string;
  name: string | null;
  shortcode: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  stripe_customer_id: string | null;
  default_labor_rate: number | null;
  default_equipment_rate: number | null;
  disposal_rates: Record<string, number> | null;
}

// ── Mapping helper ────────────────────────────────────────────────────────────

function mapOrgRow(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name ?? '',
    shortcode: row.shortcode ?? null,
    subscriptionStatus: (row.subscription_status as SubscriptionStatus) ?? 'trialing',
    subscriptionTier: (row.subscription_tier as SubscriptionTier) ?? 'starter',
    trialEndsAt: row.trial_ends_at ?? null,
    subscriptionEndsAt: row.subscription_ends_at ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    defaultLaborRate: row.default_labor_rate ?? null,
    defaultEquipmentRate: row.default_equipment_rate ?? null,
    disposalRates: row.disposal_rates ?? {},
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
    shortcode: null,
    subscriptionStatus: 'trialing',
    subscriptionTier: 'starter',
    trialEndsAt: null, // unknown — don't gate when we can't confirm
    subscriptionEndsAt: null,
    stripeCustomerId: null,
    defaultLaborRate: null,
    defaultEquipmentRate: null,
    disposalRates: {},
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
          // Bug 5 fix: query by id (canonical — signup trigger sets id = auth.uid())
          const { data, error } = await supabase
            .from('organizations')
            .select(
              'id, name, shortcode, subscription_status, subscription_tier, trial_ends_at, subscription_ends_at, stripe_customer_id, default_labor_rate, default_equipment_rate, disposal_rates'
            )
            .eq('id', orgId)
            .single();


          if (error) {
            if (error.code === 'PGRST116') {
              // New user — create org + membership so all RLS-protected writes succeed
              const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
              // Bug 1 fix: include slug (NOT NULL UNIQUE constraint)
              const slug = 'org-' + orgId.replace(/-/g, '').slice(0, 8) + '-' + Date.now()
              const { data: newOrg, error: insertError } = await supabase
                .from('organizations')
                .insert([{
                  id: orgId,
                  owner_id: orgId,
                  name: '',
                  slug,
                  subscription_status: 'trialing',
                  subscription_tier: 'starter',
                  trial_ends_at: trialEndsAt,
                }])
                .select('id, name, shortcode, subscription_status, subscription_tier, trial_ends_at, subscription_ends_at, stripe_customer_id, default_labor_rate, default_equipment_rate, disposal_rates')
                .single()

              if (insertError) {
                // Row may have been created by a concurrent trigger — fall back to safe defaults
                console.error('fetchOrg: org INSERT failed', insertError)
                set({ org: makeDefaultOrg(orgId), isLoading: false })
              } else {
                // Bug 2 fix: create organization_members row so RLS policies pass
                const { error: memberError } = await supabase
                  .from('organization_members')
                  .insert([{ org_id: orgId, user_id: orgId, role: 'admin' }])
                if (memberError) {
                  console.error('fetchOrg: organization_members INSERT failed', memberError)
                }
                set({ org: mapOrgRow(newOrg as OrgRow), isLoading: false })
              }
            } else {
              // Network or other error — keep any cached org, surface error
              console.error('fetchOrg: SELECT failed', error)
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

      updateOrgName: async (name: string) => {
        const orgId = useOrgStore.getState().org?.id
        if (!orgId) return
        set((state) => ({ org: state.org ? { ...state.org, name } : null }))
        const { error } = await supabase
          .from('organizations')
          .update({ name })
          .eq('id', orgId)
        if (error) {
        }
      },

      updateOrgSettings: async (settings) => {
        const org = useOrgStore.getState().org
        if (!org) return
        // Optimistic update
        const previous = { ...org }
        set({
          org: {
            ...org,
            ...(settings.defaultLaborRate !== undefined && { defaultLaborRate: settings.defaultLaborRate }),
            ...(settings.defaultEquipmentRate !== undefined && { defaultEquipmentRate: settings.defaultEquipmentRate }),
            ...(settings.disposalRates !== undefined && { disposalRates: settings.disposalRates }),
          },
        })
        const dbUpdate: Record<string, unknown> = {}
        if (settings.defaultLaborRate !== undefined) dbUpdate.default_labor_rate = settings.defaultLaborRate
        if (settings.defaultEquipmentRate !== undefined) dbUpdate.default_equipment_rate = settings.defaultEquipmentRate
        if (settings.disposalRates !== undefined) dbUpdate.disposal_rates = settings.disposalRates
        const { error } = await supabase
          .from('organizations')
          .update(dbUpdate)
          .eq('id', org.id)
        if (error) {
          console.error('updateOrgSettings failed', error)
          set({ org: previous })
        }
      },

      clearOrg: () => set({ org: null, error: null, isLoading: false }),
    }),
    { name: 'tf_org' }
  )
);
