import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { primaryTabs, secondaryPages, isActiveTab } from '@/components/layout/navConfig';
import { NavIcon } from '@/components/layout/NavIcon';

interface MobileSidebarProps {
  onClose: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate('/');
  };

  return (
    <div className="h-full flex flex-col" style={{ color: 'var(--sidebar-text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 flex items-center justify-center"
            style={{
              background: 'var(--sidebar-active)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--sidebar-accent)',
              fontSize: '14px',
              fontWeight: 800,
            }}
          >
            TF
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--sidebar-text)' }}>
            TerrainForge
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center cursor-pointer border-none bg-transparent transition-all duration-100"
          style={{ borderRadius: 'var(--radius-md)', color: 'var(--sidebar-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Close navigation"
        >
          <NavIcon name="x" size={18} />
        </button>
      </div>

      {/* Primary tabs */}
      <nav className="flex flex-col px-2 pt-2 overflow-y-auto flex-1">
        <div
          className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider select-none"
          style={{ color: 'var(--sidebar-text-muted)', opacity: 0.7 }}
        >
          Hub
        </div>
        {primaryTabs.map((tab) => {
          const active = isActiveTab(tab.path, location.pathname);
          return (
            <button
              key={tab.path}
              onClick={() => handleNav(tab.path)}
              className="flex items-center gap-3 py-2.5 text-sm font-medium cursor-pointer border-none bg-transparent transition-all duration-100 w-full text-left px-3"
              style={{
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--sidebar-active)' : 'transparent',
                color: active ? '#FFFFFF' : 'var(--sidebar-text-muted)',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--sidebar-active)' : 'transparent'; }}
            >
              <NavIcon name={tab.icon} size={18} />
              {tab.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="mx-2 my-1.5" style={{ height: '1px', background: 'var(--sidebar-border)' }} />

        <div
          className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider select-none"
          style={{ color: 'var(--sidebar-text-muted)', opacity: 0.7 }}
        >
          More
        </div>
        {secondaryPages.map((page) => {
          const active = location.pathname === page.path;
          return (
            <button
              key={page.path}
              onClick={() => handleNav(page.path)}
              className="flex items-center gap-3 py-2.5 text-sm font-medium cursor-pointer border-none bg-transparent transition-all duration-100 w-full text-left px-3"
              style={{
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--sidebar-active)' : 'transparent',
                color: active ? '#FFFFFF' : 'var(--sidebar-text-muted)',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--sidebar-active)' : 'transparent'; }}
            >
              <NavIcon name={page.icon} size={18} />
              {page.label}
            </button>
          );
        })}

        {/* Crew App */}
        <div className="mx-2 my-1.5" style={{ height: '1px', background: 'var(--sidebar-border)' }} />
        <button
          onClick={() => { onClose(); window.open('/crew', '_blank'); }}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer border-none bg-transparent transition-all duration-100 w-full text-left"
          style={{ borderRadius: 'var(--radius-md)', color: 'var(--sidebar-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <NavIcon name="external-link" size={18} />
          Crew App
        </button>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 flex-shrink-0">
        <div className="text-xs truncate mb-2" style={{ color: 'var(--sidebar-text-muted)' }}>
          {user?.email}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm cursor-pointer border-none bg-transparent transition-colors duration-100"
          style={{ color: '#F87171' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#FCA5A5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#F87171'; }}
        >
          <NavIcon name="log-out" size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default MobileSidebar;
