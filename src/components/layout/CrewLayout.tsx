/**
 * CrewLayout — App shell for the crew-facing companion app.
 *
 * Mobile-first, no sidebar. Shows a minimal top bar with crew member name
 * and sign-out. Loads org + project + crew data on mount.
 *
 * Crew member identity is stored in localStorage (tf_crew_member_id).
 * If not set, the child pages handle showing a crew member picker.
 */

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgStore } from '@/stores/orgStore';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { ToastContainer } from '@/components/shared/Toast';

interface CrewLayoutProps {
  children: React.ReactNode;
}

export const CrewLayout: React.FC<CrewLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const { crew } = useCrewStore();
  const fetchOrg = useOrgStore((s) => s.fetchOrg);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const fetchCrew = useCrewStore((s) => s.fetchCrew);
  const fetchEquipment = useEquipmentStore((s) => s.fetchEquipment);

  const crewMemberId = typeof window !== 'undefined'
    ? localStorage.getItem('tf_crew_member_id')
    : null;
  const crewMember = crew.find(c => c.id === crewMemberId) || null;

  // Apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system' | null;
    const theme = saved || 'light';
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, []);

  // Fetch org data, then domain data
  useEffect(() => {
    if (user?.id) {
      fetchOrg(user.id).then(() => {
        fetchProjects();
        fetchCrew();
        fetchEquipment();
      });
    }
  }, [user?.id, fetchOrg, fetchProjects, fetchCrew, fetchEquipment]);

  const [signingOut, setSigningOut] = React.useState(false);
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-[16px] flex-shrink-0"
        style={{
          height: '56px',
          backgroundColor: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        <span className="font-serif text-[16px]" style={{ color: 'var(--sidebar-text)' }}>
          TerrainForge
        </span>

        <span className="text-[13px] font-[600] truncate max-w-[140px]" style={{ color: 'var(--sidebar-text)' }}>
          {crewMember?.name || ''}
        </span>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="text-[12px] bg-transparent border-none cursor-pointer min-h-[44px] px-[12px] py-[8px] transition-colors"
          style={{ color: 'var(--sidebar-text-2, var(--text-3))' }}
        >
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto px-[16px] py-[16px]">
        {children}
      </main>

      <ToastContainer />
    </div>
  );
};

export default CrewLayout;
