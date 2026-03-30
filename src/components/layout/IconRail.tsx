import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navConfig } from '@/components/layout/navConfig';
import { NavIcon } from '@/components/layout/NavIcon';

function isActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  return currentPath.startsWith(itemPath);
}

export const IconRail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside
      className="w-16 h-full flex flex-col items-center py-3 flex-shrink-0"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo mark */}
      <div
        className="w-8 h-8 flex items-center justify-center mb-3"
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

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-1">
        {navConfig.map((item) => {
          const active = isActive(item.path, location.pathname);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={item.label}
              className="w-10 h-10 flex items-center justify-center transition-all duration-100 cursor-pointer border-none"
              style={{
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--sidebar-active)' : 'transparent',
                color: active ? '#FFFFFF' : 'var(--sidebar-text-muted)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--sidebar-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <NavIcon name={item.icon} />
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings icon at bottom */}
      <button
        onClick={() => navigate('/settings')}
        title="Settings"
        className="w-10 h-10 flex items-center justify-center transition-all duration-100 cursor-pointer border-none"
        style={{
          borderRadius: 'var(--radius-md)',
          background: isActive('/settings', location.pathname) ? 'var(--sidebar-active)' : 'transparent',
          color: isActive('/settings', location.pathname) ? '#FFFFFF' : 'var(--sidebar-text-muted)',
        }}
        onMouseEnter={(e) => {
          if (!isActive('/settings', location.pathname)) {
            e.currentTarget.style.background = 'var(--sidebar-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive('/settings', location.pathname)) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <NavIcon name="settings" />
      </button>
    </aside>
  );
};

export default IconRail;
