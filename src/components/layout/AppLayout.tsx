/**
 * AppLayout — canonical protected app shell.
 *
 * Responsibilities:
 *  1. Render <Sidebar /> + scrollable main content column.
 *  2. Fetch the org record from Supabase after auth resolves.
 *  3. Show a dismissible trial-expiry banner when ≤7 days remain.
 *  4. Show a payment-failed banner when subscription is past_due.
 *  5. Manage sidebar collapsed/mobile state for responsive layout.
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

  // Sidebar state — collapsed (icon-only) on tablet, hidden/shown on mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auto-collapse sidebar on tablet viewport
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < 640) {
        setSidebarCollapsed(false); // mobile uses overlay, not collapse
      } else if (w < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Mobile header bar ──────────────────────────────────────────── */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--sidebar-border)' }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--sidebar-text-2)' }}
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 5h16M2 10h16M2 15h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
          <span className="font-serif text-[16px]" style={{ color: 'var(--sidebar-text)' }}>TerrainForge</span>
        </div>

        {/* ── Trial ending soon banner ───────────────────────────────────── */}
        {showTrial && (
          <div className="flex-shrink-0 flex items-center justify-between gap-[12px] px-[20px] py-[9px] bg-[rgba(251,146,60,.1)] border-b border-[rgba(251,146,60,.3)]">
            <div className="flex items-center gap-[10px] text-[12px]">
              <span className="text-[#D97706] font-[700] flex-shrink-0">⚠</span>
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
                Upgrade now →
              </Link>
            </div>
            <button
              onClick={() => setTrialBannerDismissed(true)}
              aria-label="Dismiss trial banner"
              className="flex-shrink-0 text-[16px] leading-none transition-colors bg-transparent border-none cursor-pointer p-[2px] text-[#D97706] hover:text-[#B45309]"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Payment failed banner ──────────────────────────────────────── */}
        {showPastDue && (
          <div className="flex-shrink-0 flex items-center justify-between gap-[12px] px-[20px] py-[9px] bg-[rgba(220,38,38,.08)] border-b border-[rgba(220,38,38,.25)]">
            <div className="flex items-center gap-[10px] text-[12px]">
              <span className="text-[#DC2626] font-[700] flex-shrink-0">💳</span>
              <span style={{ color: 'var(--text-2)' }}>
                Your last payment failed.
              </span>
              <Link
                to="/billing"
                className="font-[600] text-[#DC2626] hover:text-[#B91C1C] underline underline-offset-2 transition-colors flex-shrink-0"
              >
                Update payment method →
              </Link>
            </div>
            <button
              onClick={() => setPastDueBannerDismissed(true)}
              aria-label="Dismiss payment banner"
              className="flex-shrink-0 text-[#DC2626] hover:text-[#B91C1C] text-[16px] leading-none transition-colors bg-transparent border-none cursor-pointer p-[2px]"
            >
              ✕
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
