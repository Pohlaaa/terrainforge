/**
 * AppLayout — canonical protected app shell.
 *
 * Responsibilities:
 *  1. Render <Sidebar /> + scrollable main content column.
 *  2. Fetch the org record from Supabase after auth resolves.
 *  3. Show a dismissible trial-expiry banner when ≤7 days remain.
 *  4. Show a payment-failed banner when subscription is past_due.
 *
 * The billing gate redirect lives in ProtectedRoute (a parent) so it can
 * intercept navigation before this shell even renders.
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgStore } from '@/stores/orgStore';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useBillingGate } from '@/hooks/useBillingGate';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const fetchOrg = useOrgStore((s) => s.fetchOrg);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const fetchCrew = useCrewStore((s) => s.fetchCrew);
  const fetchMaterials = useMaterialStore((s) => s.fetchMaterials);
  const fetchEquipment = useEquipmentStore((s) => s.fetchEquipment);
  const { showUrgentBanner, daysLeft, isPastDue } = useBillingGate();
  const location = useLocation();

  // Dismissal state resets on page reload (session-level pressure on trial users)
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  const [pastDueBannerDismissed, setPastDueBannerDismissed] = useState(false);

  // Fetch org data once the user is known — re-runs if user changes (e.g. after
  // a sign-in without a full page reload).
  useEffect(() => {
    if (user?.id) {
      fetchOrg(user.id);
      fetchProjects();
      fetchCrew();
      fetchMaterials();
      fetchEquipment();
    }
  }, [user?.id, fetchOrg, fetchProjects, fetchCrew, fetchMaterials, fetchEquipment]);

  // Suppress banners on the billing page itself — user is already looking at it
  const isOnBillingPage = location.pathname === '/billing';

  const showTrial =
    showUrgentBanner && !trialBannerDismissed && !isOnBillingPage;

  const showPastDue =
    isPastDue && !pastDueBannerDismissed && !isOnBillingPage;

  return (
    <div className="flex h-screen bg-[var(--surface)]">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Trial ending soon banner ───────────────────────────────────── */}
        {showTrial && (
          <div className="flex-shrink-0 flex items-center justify-between gap-[12px] px-[20px] py-[9px] bg-[rgba(251,146,60,.12)] border-b border-[rgba(251,146,60,.35)]">
            <div className="flex items-center gap-[10px] text-[12px]">
              <span className="text-[#FB923C] font-[700] flex-shrink-0">⚠</span>
              <span className="text-[var(--text-2)]">
                Your free trial ends in{' '}
                <span className="font-[700] text-[#FB923C]">
                  {daysLeft} day{daysLeft === 1 ? '' : 's'}
                </span>
                .
              </span>
              <Link
                to="/billing"
                className="font-[600] text-[#FB923C] hover:text-[var(--text)] underline underline-offset-2 transition-colors flex-shrink-0"
              >
                Upgrade now →
              </Link>
            </div>
            <button
              onClick={() => setTrialBannerDismissed(true)}
              aria-label="Dismiss trial banner"
              className="flex-shrink-0 text-[#FB923C] hover:text-[var(--text)] text-[16px] leading-none transition-colors bg-transparent border-none cursor-pointer p-[2px]"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Payment failed banner ──────────────────────────────────────── */}
        {showPastDue && (
          <div className="flex-shrink-0 flex items-center justify-between gap-[12px] px-[20px] py-[9px] bg-[rgba(220,38,38,.1)] border-b border-[rgba(220,38,38,.3)]">
            <div className="flex items-center gap-[10px] text-[12px]">
              <span className="text-[#F87171] font-[700] flex-shrink-0">💳</span>
              <span className="text-[var(--text-2)]">
                Your last payment failed.
              </span>
              <Link
                to="/billing"
                className="font-[600] text-[#F87171] hover:text-[var(--text)] underline underline-offset-2 transition-colors flex-shrink-0"
              >
                Update payment method →
              </Link>
            </div>
            <button
              onClick={() => setPastDueBannerDismissed(true)}
              aria-label="Dismiss payment banner"
              className="flex-shrink-0 text-[#F87171] hover:text-[var(--text)] text-[16px] leading-none transition-colors bg-transparent border-none cursor-pointer p-[2px]"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Page content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>

      </div>
    </div>
  );
};

export default AppLayout;
