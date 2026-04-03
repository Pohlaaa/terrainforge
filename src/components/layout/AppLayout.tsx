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
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { TrialBanner } from '@/components/TrialBanner';
import { ToastContainer } from '@/components/shared/Toast';
import { useUIStore } from '@/stores/uiStore';
import { fetchUserPreferences, hasCompletedOnboarding } from '@/services/preferences';
import { KPI_LIBRARY, DEFAULT_SELECTED_KPIS } from '@/lib/kpiCompute';

// Map onboarding priority labels → KPI library IDs
const PRIORITY_TO_KPI: Record<string, string> = {
  'Project Tracking': 'active_projects',
  'Budget & Estimates': 'pipeline_value',
  'Crew Management': 'crew_available',
  'Material Inventory': 'low_stock_alerts',
  'Equipment Tracking': 'fleet_available',
  'Client Comms': 'active_projects', // no direct match, fallback
  'Invoicing': 'pipeline_value',     // no direct match, fallback
  'Weather Planning': 'active_projects', // no direct match, fallback
};

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
  const { isTrial, daysLeft, isPastDue, isExpiredTrial } = useBillingGate();
  const location = useLocation();

  // Past-due banner dismissal resets on page reload (session-level)
  const [pastDueBannerDismissed, setPastDueBannerDismissed] = useState(false);
  // Expired trial overlay dismissal (session-level — user clicked "View Your Data")
  const [expiredOverlayDismissed, setExpiredOverlayDismissed] = useState(false);

  // Mobile sidebar overlay state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Responsive sidebar: expanded (with labels) on xl+, icon-only on lg, hidden on mobile
  const [sidebarExpanded, setSidebarExpanded] = useState(() => window.innerWidth >= 1280);
  useEffect(() => {
    function handleResize() {
      setSidebarExpanded(window.innerWidth >= 1280);
    }
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
      fetchOrg(user.id).then(() => {
        fetchProjects();
        fetchCrew();
        fetchMaterials();
        fetchEquipment();
      });
    }
  }, [user?.id, fetchOrg, fetchProjects, fetchCrew, fetchMaterials, fetchEquipment]);

  // Load user preferences (KPI selections from onboarding) once per session.
  // Also redirect genuinely new users to onboarding (catches email-confirm redirects
  // that bypass Login.tsx's hasCompletedOnboarding check).
  const navigate = useNavigate();
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    if (!user?.id || prefsLoaded) return;
    fetchUserPreferences(user.id).then(async (prefs) => {
      if (prefs?.selectedKpis && prefs.selectedKpis.length > 0) {
        const validKpiIds = new Set(KPI_LIBRARY.map(k => k.id));
        // Translate onboarding priority labels to KPI IDs, pass through valid IDs
        const resolved = prefs.selectedKpis
          .map(k => validKpiIds.has(k) ? k : PRIORITY_TO_KPI[k])
          .filter((k): k is string => k !== undefined);
        // Deduplicate and ensure we have at least some KPIs
        const unique = [...new Set(resolved)];
        useUIStore.getState().setSelectedKpis(unique.length > 0 ? unique : DEFAULT_SELECTED_KPIS);
      } else if (!prefs?.onboardingCompletedAt) {
        // No prefs row or no onboarding timestamp — check if this is a
        // genuinely new user vs an existing user from before onboarding existed.
        // hasCompletedOnboarding checks org membership + projects as fallback.
        const done = await hasCompletedOnboarding(user!.id);
        if (!done) {
          navigate('/onboarding', { replace: true });
          return;
        }
      }
      setPrefsLoaded(true);
    });
  }, [user?.id, prefsLoaded, navigate]);

  // Suppress banners on the billing page itself — user is already looking at it
  const isOnBillingPage = location.pathname === '/billing';

  const showTrialBanner =
    isTrial && daysLeft !== null && !isOnBillingPage;

  const showPastDue =
    isPastDue && !pastDueBannerDismissed && !isOnBillingPage;

  const showExpiredOverlay =
    isExpiredTrial && !expiredOverlayDismissed;

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar — expanded on xl+, icon-only on lg, hidden on mobile */}
      <div className="hidden lg:block">
        <IconRail expanded={sidebarExpanded} />
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

        {/* ── Trial banner (all trial days, escalating urgency) ──────────── */}
        {showTrialBanner && daysLeft !== null && (
          <TrialBanner daysRemaining={daysLeft} />
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

      {/* ── Expired trial overlay ─────────────────────────────────────── */}
      {showExpiredOverlay && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 50, background: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div
            className="text-center"
            style={{
              maxWidth: '480px',
              width: '90%',
              background: '#1A1A1A',
              borderRadius: '16px',
              padding: '40px',
            }}
          >
            <h2 className="text-[28px] font-bold text-white mb-3">
              Your trial has ended
            </h2>
            <p className="text-[16px] mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Your projects and data are still here. Subscribe to pick up where you left off.
            </p>
            <Link
              to="/billing"
              className="block w-full py-3 rounded-lg text-[15px] font-semibold text-white text-center no-underline transition-colors mb-3"
              style={{ background: '#2D6A4F' }}
            >
              Choose a Plan
            </Link>
            <button
              onClick={() => setExpiredOverlayDismissed(true)}
              className="w-full py-3 rounded-lg text-[14px] font-medium bg-transparent cursor-pointer transition-colors"
              style={{
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              View Your Data (Read Only)
            </button>
          </div>
        </div>
      )}

      {/* ── Toast notification region ─────────────────────────────────── */}
      <ToastContainer />
    </div>
  );
};

export default AppLayout;
