import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  dotColor: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '📊', dotColor: '#E2E8D5' },
  { path: '/projects', label: 'Projects', icon: '⊞', dotColor: '#74C69D' },
  { path: '/materials', label: 'Material Library', icon: '📦', dotColor: '#60A5FA' },
  { path: '/manifest', label: 'Manifest Engine', icon: '📋', dotColor: '#FCD34D' },
  { path: '/work-orders', label: 'Work Orders', icon: '✓', dotColor: '#A78BFA' },
  { path: '/price-research', label: 'Price Research', icon: '💰', dotColor: '#5EEAD4' },
  { path: '/crew', label: 'Crew Manager', icon: '👥', dotColor: '#F87171' },
  { path: '/equipment', label: 'Equipment', icon: '⚙', dotColor: '#D97706' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setSigningOut(false);
    }
  };

  return (
    <aside className="bg-[var(--surface)] border-r border-[var(--border)] flex flex-col sticky top-0 h-screen overflow-y-auto w-[240px]">
      {/* Brand */}
      <div className="px-[16px] py-[20px] border-b border-[var(--border)] flex items-center gap-[10px]">
        <span className="text-[20px] text-[var(--green-l)]">⬡</span>
        <div>
          <div className="font-serif text-[16px] text-[var(--text)]">TerrainForge</div>
          <div className="text-[9px] text-[var(--text-4)] font-mono tracking-[0.05em]">
            PHASE 1 · MVP
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1">
        {/* Overview group */}
        <div className="px-[12px] py-[14px] text-[9px] font-[700] uppercase tracking-[0.14em] text-[var(--text-4)]">
          Overview
        </div>
        <Link
          to="/"
          className={`w-full text-left px-[14px] py-[9px] text-[13px] border-l-[3px] flex items-center gap-[10px] transition-all duration-180 block ${
            location.pathname === '/'
              ? 'text-[var(--green-l)] bg-[rgba(45,106,79,.15)] border-l-[var(--green-l)]'
              : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(45,106,79,.1)] border-l-transparent'
          }`}
        >
          <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: '#E2E8D5' }}></span>
          Dashboard
        </Link>

        {/* Workflow group */}
        <div className="px-[12px] py-[14px] mt-[4px] text-[9px] font-[700] uppercase tracking-[0.14em] text-[var(--text-4)]">
          Workflow
        </div>
        {navItems
          .filter((item) => item.path !== '/')
          .map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full text-left px-[14px] py-[9px] text-[13px] border-l-[3px] flex items-center gap-[10px] transition-all duration-180 block ${
                location.pathname === item.path
                  ? 'text-[var(--green-l)] bg-[rgba(45,106,79,.15)] border-l-[var(--green-l)]'
                  : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(45,106,79,.1)] border-l-transparent'
              }`}
            >
              <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: item.dotColor }}></span>
              {item.label}
            </Link>
          ))}
      </div>

      {/* User Section & Active Project */}
      <div className="px-[16px] py-[16px] border-t border-[var(--border)] space-y-3">
        {/* User Info */}
        {user && (
          <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px]">
            <div className="text-[9px] text-[var(--text-4)] font-mono tracking-[0.06em] mb-[4px]">
              ACCOUNT
            </div>
            <div className="text-[11px] text-[var(--text)] font-[500] truncate mb-2">
              {user.email}
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full px-2 py-1 text-[11px] bg-[var(--surface)] hover:bg-[rgba(45,106,79,.2)] border border-[var(--border)] rounded text-[var(--text-2)] hover:text-[var(--text)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        )}

        {/* Active Project Pill */}
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px]">
          <div className="text-[9px] text-[var(--text-4)] font-mono tracking-[0.06em] mb-[4px]">
            ACTIVE PROJECT
          </div>
          <div className="text-[13px] text-[var(--text)] font-[600]">None selected</div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
