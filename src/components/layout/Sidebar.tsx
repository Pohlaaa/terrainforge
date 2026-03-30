import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

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
  { path: '/schedule', label: 'Schedule', icon: '📅', dotColor: '#818CF8' },
  { path: '/equipment', label: 'Equipment', icon: '⚙', dotColor: '#D97706' },
];

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, mobileOpen = false, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const { projects, activeProjectId, setProjects, setActiveProject } = useProjectStore();
  const { setMaterials } = useMaterialStore();
  const { setCrew } = useCrewStore();
  const { setEquipment } = useEquipmentStore();
  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;

  const hasDemoData = projects.some(p => p.isDemo === true);

  function handleClearDemoData() {
    setProjects(projects.filter(p => !p.isDemo));
    setActiveProject(null);
    setMaterials([]);
    setCrew([]);
    setEquipment([]);
    setShowClearConfirm(false);
    navigate('/');
  }

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

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const sidebarWidth = collapsed ? '56px' : '240px';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          flex flex-col sticky top-0 h-screen overflow-y-auto overflow-x-hidden
          border-r transition-all duration-200
          lg:relative lg:translate-x-0
          ${mobileOpen ? 'fixed left-0 top-0 z-30 w-[240px]' : 'hidden lg:flex'}
        `}
        style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--sidebar-border)', width: sidebarWidth, minWidth: sidebarWidth }}
      >
        {/* Brand */}
        <div
          className="px-[16px] py-[20px] flex items-center gap-[10px] flex-shrink-0"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <span className="text-[20px] flex-shrink-0" style={{ color: 'var(--green-l)' }}>⬡</span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-serif text-[16px]" style={{ color: 'var(--sidebar-text)' }}>TerrainForge</div>
              <div className="text-[9px] font-mono tracking-[0.05em]" style={{ color: 'var(--sidebar-text-4)' }}>
                PHASE 1 · MVP
              </div>
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto">
          {/* Overview group */}
          {!collapsed && (
            <div className="px-[12px] py-[14px] text-[9px] font-[700] uppercase tracking-[0.14em]" style={{ color: 'var(--sidebar-text-4)' }}>
              Overview
            </div>
          )}
          {collapsed && <div className="py-[10px]" />}
          <Link
            to="/"
            title="Dashboard"
            onClick={handleNavClick}
            className={`w-full text-left py-[9px] text-[13px] border-l-[3px] flex items-center gap-[10px] transition-all duration-180 block ${
              collapsed ? 'px-[14px] justify-center' : 'px-[14px]'
            } ${
              location.pathname === '/'
                ? 'border-l-[var(--green-l)] bg-[rgba(45,106,79,.2)]'
                : 'border-l-transparent hover:bg-[rgba(255,255,255,.06)]'
            }`}
            style={{ color: location.pathname === '/' ? 'var(--green-l)' : 'var(--sidebar-text-2)' }}
          >
            <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: '#E2E8D5' }}></span>
            {!collapsed && 'Dashboard'}
          </Link>

          {/* Workflow group */}
          {!collapsed && (
            <div className="px-[12px] py-[14px] mt-[4px] text-[9px] font-[700] uppercase tracking-[0.14em]" style={{ color: 'var(--sidebar-text-4)' }}>
              Workflow
            </div>
          )}
          {collapsed && <div className="py-[6px]" />}
          {navItems
            .filter((item) => item.path !== '/')
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                onClick={handleNavClick}
                className={`w-full text-left py-[9px] text-[13px] border-l-[3px] flex items-center gap-[10px] transition-all duration-180 block min-h-[44px] ${
                  collapsed ? 'px-[14px] justify-center' : 'px-[14px]'
                } ${
                  location.pathname === item.path
                    ? 'border-l-[var(--green-l)] bg-[rgba(45,106,79,.2)]'
                    : 'border-l-transparent hover:bg-[rgba(255,255,255,.06)]'
                }`}
                style={{ color: location.pathname === item.path ? 'var(--green-l)' : 'var(--sidebar-text-2)' }}
              >
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: item.dotColor }}></span>
                {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!collapsed && (item.path === '/projects' || item.path === '/work-orders') && activeProjectId && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--green-l)', flexShrink: 0,
                    marginLeft: 'auto',
                  }} />
                )}
              </Link>
            ))}
        </div>

        {/* Account group */}
        <div style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          {!collapsed && (
            <div className="px-[12px] py-[14px] text-[9px] font-[700] uppercase tracking-[0.14em]" style={{ color: 'var(--sidebar-text-4)' }}>
              Account
            </div>
          )}
          <Link
            to="/settings"
            title="Settings"
            onClick={handleNavClick}
            className={`w-full text-left py-[9px] text-[13px] border-l-[3px] flex items-center gap-[10px] transition-all duration-180 block min-h-[44px] ${
              collapsed ? 'px-[14px] justify-center' : 'px-[14px]'
            } ${
              location.pathname === '/settings'
                ? 'border-l-[var(--green-l)] bg-[rgba(45,106,79,.2)]'
                : 'border-l-transparent hover:bg-[rgba(255,255,255,.06)]'
            }`}
            style={{ color: location.pathname === '/settings' ? 'var(--green-l)' : 'var(--sidebar-text-2)' }}
          >
            <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: '#94A3B8' }}></span>
            {!collapsed && 'Settings'}
          </Link>
          <Link
            to="/billing"
            title="Billing"
            onClick={handleNavClick}
            className={`w-full text-left py-[9px] text-[13px] border-l-[3px] flex items-center gap-[10px] transition-all duration-180 block min-h-[44px] ${
              collapsed ? 'px-[14px] justify-center' : 'px-[14px]'
            } ${
              location.pathname === '/billing'
                ? 'border-l-[var(--green-l)] bg-[rgba(45,106,79,.2)]'
                : 'border-l-transparent hover:bg-[rgba(255,255,255,.06)]'
            }`}
            style={{ color: location.pathname === '/billing' ? 'var(--green-l)' : 'var(--sidebar-text-2)' }}
          >
            <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ backgroundColor: '#A78BFA' }}></span>
            {!collapsed && 'Billing'}
          </Link>
        </div>

        {/* User Section & Active Project — hidden when collapsed */}
        {!collapsed && (
          <div className="px-[16px] py-[16px] space-y-3 flex-shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
            {/* User Info */}
            {user && (
              <div className="rounded-[8px] px-[12px] py-[10px]" style={{ backgroundColor: 'var(--sidebar-surface2)', border: '1px solid var(--sidebar-border)' }}>
                <div className="text-[9px] font-mono tracking-[0.06em] mb-[4px]" style={{ color: 'var(--sidebar-text-4)' }}>
                  ACCOUNT
                </div>
                <div className="text-[11px] font-[500] truncate mb-2" style={{ color: 'var(--sidebar-text)' }}>
                  {user.email}
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full px-2 py-1 text-[11px] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,.1)]"
                  style={{ backgroundColor: 'var(--bg-sidebar)', border: '1px solid var(--sidebar-border)', color: 'var(--sidebar-text-2)' }}
                >
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            )}

            {/* Active Project Pill */}
            <div className="rounded-[8px] px-[12px] py-[10px]" style={{ backgroundColor: 'var(--sidebar-surface2)', border: '1px solid var(--sidebar-border)' }}>
              <div className="text-[9px] font-mono tracking-[0.06em] mb-[4px]" style={{ color: 'var(--sidebar-text-4)' }}>
                ACTIVE PROJECT
              </div>
              {activeProject ? (
                <>
                  <div className="text-[12px] font-[600] truncate leading-snug" style={{ color: 'var(--sidebar-text)' }}>
                    {activeProject.name}
                  </div>
                  <div className="text-[10px] truncate mt-[2px]" style={{ color: 'var(--sidebar-text-3)' }}>
                    {activeProject.client}
                  </div>
                </>
              ) : (
                <div className="text-[12px] font-[500]" style={{ color: 'var(--sidebar-text-4)' }}>None selected</div>
              )}
            </div>

            {/* Clear Demo Data */}
            {hasDemoData && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full text-left px-[12px] py-[9px] rounded-[8px] text-[11px] transition-colors cursor-pointer"
                style={{ color: '#FB923C', backgroundColor: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.2)' }}
              >
                ⚠ Clear Demo Data
              </button>
            )}
          </div>
        )}
      </aside>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Demo Data"
        message="This will remove all demo projects, materials, crew, and equipment. Your account settings and billing will not be affected. This cannot be undone."
        confirmText="Start Fresh"
        confirmVariant="danger"
        onConfirm={handleClearDemoData}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
};

export default Sidebar;
