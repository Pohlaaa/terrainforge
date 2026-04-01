import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { navGroups } from '@/components/layout/navConfig';
import { NavIcon } from '@/components/layout/NavIcon';

interface MobileSidebarProps {
  onClose: () => void;
}

function isActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
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

  const renderNavButton = (path: string, icon: string, label: string, indented: boolean) => {
    const active = isActive(path, location.pathname);
    return (
      <button
        key={path}
        onClick={() => handleNav(path)}
        className="flex items-center gap-3 py-2.5 text-sm font-medium cursor-pointer border-none bg-transparent transition-all duration-100 w-full text-left"
        style={{
          borderRadius: 'var(--radius-md)',
          paddingLeft: indented ? '32px' : '12px',
          paddingRight: '12px',
          background: active ? 'var(--sidebar-active)' : 'transparent',
          color: active ? '#FFFFFF' : 'var(--sidebar-text-muted)',
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)';
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent';
        }}
      >
        <NavIcon name={icon} size={18} />
        {label}
      </button>
    );
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
          style={{
            borderRadius: 'var(--radius-md)',
            color: 'var(--sidebar-text-muted)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Close navigation"
        >
          <NavIcon name="x" size={18} />
        </button>
      </div>

      {/* Grouped navigation */}
      <nav className="flex flex-col px-2 pt-2 overflow-y-auto flex-1">
        {navGroups.map((group, idx) => (
          <React.Fragment key={group.key}>
            {/* Divider between groups (skip before first) */}
            {idx > 0 && (
              <div className="mx-2 my-1.5" style={{ height: '1px', background: 'var(--sidebar-border)' }} />
            )}

            {group.items.length === 0 ? (
              // Single-page group (Dashboard) — render as clickable item
              renderNavButton(group.defaultPath, group.icon, group.label, false)
            ) : (
              <>
                {/* Section header */}
                <div
                  className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider select-none"
                  style={{ color: 'var(--sidebar-text-muted)', opacity: 0.7 }}
                >
                  {group.label}
                </div>
                {/* Sub-items */}
                {group.items.map((item) =>
                  renderNavButton(item.path, item.icon, item.label, true)
                )}
              </>
            )}
          </React.Fragment>
        ))}

        {/* Divider before Crew App */}
        <div className="mx-2 my-1.5" style={{ height: '1px', background: 'var(--sidebar-border)' }} />

        {/* Crew App — opens in new tab */}
        <button
          onClick={() => { onClose(); window.open('/crew', '_blank'); }}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium cursor-pointer border-none bg-transparent transition-all duration-100 w-full text-left"
          style={{
            borderRadius: 'var(--radius-md)',
            color: 'var(--sidebar-text-muted)',
          }}
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
