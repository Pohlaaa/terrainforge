/**
 * AppLayout — canonical protected app shell (hub rebuild).
 *
 * Responsibilities:
 *  1. Render TopNav (4 tabs + More dropdown) + scrollable main content. No sidebar.
 *  2. Fetch the org record from Supabase after auth resolves.
 *  3. Show a dismissible trial-expiry banner when <=7 days remain.
 *  4. Show a payment-failed banner when subscription is past_due.
 *  5. Manage mobile sidebar overlay state.
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TopNav } from '@/components/layout/TopNav';
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
  'Client Comms': 'active_projects',
  'Invoicing': 'pipeline_value',
  'Weather Planning': 'active_projects',
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

  const [pastDueBannerDismissed, setPastDueBannerDismissed] = useState(false);
  const [expiredOverlayDismissed, setExpiredOverlayDismissed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Apply saved theme on app load
  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'light' | 'dark' | null;
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

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
  const navigate = useNavigate();
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    if (!user?.id || prefsLoaded) return;
    fetchUserPreferences(user.id).then(async (prefs) => {
      if (prefs?.selectedKpis && prefs.selectedKpis.length > 0) {
        const validKpiIds = new Set(KPI_LIBRARY.map(k => k.id));
        const resolved = prefs.selectedKpis
          .map(k => validKpiIds.has(k) ? k : PRIORITY_TO_KPI[k])
          .filter((k): k is string => k !== undefined);
        const unique = [...new Set(resolved)];
        useUIStore.getState().setSelectedKpis(unique.length > 0 ? unique : DEFAULT_SELECTED_KPIS);
      } else if (!prefs?.onboardingCompletedAt) {
        const done = await hasCompletedOnboarding(user!.id);
        if (!done) {
          navigate('/onboarding', { replace: true });
          return;
        }
      }
      setPrefsLoaded(true);
    });
  }, [user?.id, prefsLoaded, navigate]);

  const isOnBillingPage = location.pathname === '/billing';
  const showTrialBanner = isTrial && daysLeft !== null && !isOnBillingPage;
  const showPastDue = isPastDue && !pastDueBannerDismissed && !isOnBillingPage;
  const showExpiredOverlay = isExpiredTrial && !expiredOverlayDismissed;

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--surface-bg)' }}>
      {/* TopNav — always visible */}
      <TopNav
        onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        showMobileMenu={mobileSidebarOpen}
      />

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside
            className="relative w-[260px] h-full z-50"
            style={{ background: 'var(--sidebar-bg)' }}
          >
            <MobileSidebar onClose={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Trial banner */}
      {showTrialBanner && daysLeft !== null && (
        <TrialBanner daysRemaining={daysLeft} />
      )}

      {/* Payment failed banner */}
      {showPastDue && (
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 py-2 bg-[rgba(220,38,38,.08)] border-b border-[rgba(220,38,38,.25)]">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-[#DC2626] font-bold flex-shrink-0">&#x1F4B3;</span>
            <span style={{ color: 'var(--text-secondary)' }}>Your last payment failed.</span>
            <Link
              to="/billing"
              className="font-semibold text-[#DC2626] hover:text-[#B91C1C] underline underline-offset-2 transition-colors flex-shrink-0"
            >
              Update payment method &rarr;
            </Link>
          </div>
          <button
            onClick={() => setPastDueBannerDismissed(true)}
            aria-label="Dismiss payment banner"
            className="flex-shrink-0 text-[#DC2626] hover:text-[#B91C1C] text-base leading-none transition-colors bg-transparent border-none cursor-pointer p-0.5"
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* Page content — full width */}
      <main className="flex-1 overflow-auto px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4">
        {children}
      </main>

      {/* Expired trial overlay */}
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
            <h2 className="text-[28px] font-bold text-white mb-3">Your trial has ended</h2>
            <p className="text-base mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
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
              className="w-full py-3 rounded-lg text-sm font-medium bg-transparent cursor-pointer transition-colors"
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

      {/* Toast notification region */}
      <ToastContainer />
    </div>
  );
};

export default AppLayout;
