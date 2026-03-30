/**
 * AppLayout — canonical protected app shell (v7).
 *
 * Responsibilities:
 *  1. Render IconRail (desktop/tablet) + TopNav + scrollable main content.
 *  2. Fetch the org record from Supabase after auth resolves.
 *  3. Show a dismissible trial-expiry banner when <=7 days remain.
 *  4. Show a payment-failed banner when subscription is past_due.
 *  5. Manage mobile sidebar overlay state.
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconRail } from '@/components/layout/IconRail';
import { TopNav } from '@/components/layout/TopNav';
import { SubTabBar } from '@/components/layout/SubTabBar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgStore } from '@/stores/orgStore';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useBillingGate } from '@/hooks/useBillingGate';
import { ToastContainer } from '@/components/shared/Toast';

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

  // Mobile sidebar overlay state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Apply saved theme on app load
  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system' | null
    const theme = saved || 'light'
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [])

  // Fetch org data once the user is known, then fetch all domain data
  useEffect(() => {
    if (user?.id) {
      console.log('[TF-DEBUG] AppLayout useEffect, user.id:', user?.id)
      fetchOrg(user.id).then(() => {
        fetchProjects();
        fetchCrew();
        fetchMaterials();
        fetchEquipment();
      });
    }
  }, [user?.id, fetchOrg, fetchProjects, fetchCrew, fetchMaterials, fetchEquipment]);

  // Suppress banners on the billing page itself — user is already looking at it
  const isOnBillingPage = location.pathname === '/billing';

  const showTrial =
    showUrgentBanner && !trialBannerDismissed && !isOnBillingPage;

  const showPastDue =
    isPastDue && !pastDueBannerDismissed && !isOnBillingPage;

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Icon Rail — visible on desktop/tablet (lg+) */}
      <div className="hidden lg:block">
        <IconRail />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Slide-in panel */}
          <aside
            className="relative w-[240px] h-full z-50"
            style={{ background: 'var(--sidebar-bg)' }}
          >
            <MobileSidebar onClose={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Nav — always visible */}
        <TopNav
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          showMobileMenu={mobileSidebarOpen}
        />

        {/* Sub-tab bar for grouped pages */}
        <SubTabBar />

        {/* ── Trial ending soon banner ───────────────────────────────────── */}
        {showTrial && (
          <div className="flex-shrink-0 flex items-center justify-between gap-[12px] px-[20px] py-[9px] bg-[rgba(251,146,60,.1)] border-b border-[rgba(251,146,60,.3)]">
            <div className="flex items-center gap-[10px] text-[12px]">
              <span className="text-[#D97706] font-[700] flex-shrink-0">&#x26A0;</span>
              <span style={{ color: 'var(--text-2)' }}>
                Your free trial ends in{' '}
                <span className="font-[700] text-[#D97706]">
                  {daysLeft} day{daysLeft === 1 ? '' : 's'}
                </span>
                .
              </span>
              <Link
                to="/billing"
                className="font-[600] underline underline-offset-2 transition-colors flex-shrink-0 text-[#D97706] hover:text-[#B45309]"
              >
                Upgrade now &rarr;
              </Link>
            </div>
            <button
              onClick={() => setTrialBannerDismissed(true)}
              aria-label="Dismiss trial banner"
              className="flex-shrink-0 text-[16px] leading-none transition-colors bg-transparent border-none cursor-pointer p-[2px] text-[#D97706] hover:text-[#B45309]"
            >
              &#x2715;
            </button>
          </div>
        )}

        {/* ── Payment failed banner ──────────────────────────────────────── */}
        {showPastDue && (
          <div className="flex-shrink-0 flex items-center justify-between gap-[12px] px-[20px] py-[9px] bg-[rgba(220,38,38,.08)] border-b border-[rgba(220,38,38,.25)]">
            <div className="flex items-center gap-[10px] text-[12px]">
              <span className="text-[#DC2626] font-[700] flex-shrink-0">&#x1F4B3;</span>
              <span style={{ color: 'var(--text-2)' }}>
                Your last payment failed.
              </span>
              <Link
                to="/billing"
                className="font-[600] text-[#DC2626] hover:text-[#B91C1C] underline underline-offset-2 transition-colors flex-shrink-0"
              >
                Update payment method &rarr;
              </Link>
            </div>
            <button
              onClick={() => setPastDueBannerDismissed(true)}
              aria-label="Dismiss payment banner"
              className="flex-shrink-0 text-[#DC2626] hover:text-[#B91C1C] text-[16px] leading-none transition-colors bg-transparent border-none cursor-pointer p-[2px]"
            >
              &#x2715;
            </button>
          </div>
        )}

        {/* ── Page content ──────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
          {children}
        </main>
      </div>

      {/* ── Toast notification region ─────────────────────────────────── */}
      <ToastContainer />
    </div>
  );
};

export default AppLayout;
