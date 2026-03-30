import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navGroups, findGroupForPath } from '@/components/layout/navConfig';
import { NavIcon } from '@/components/layout/NavIcon';

export const IconRail: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeGroup = findGroupForPath(location.pathname);

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

      {/* Group icons */}
      <nav className="flex flex-col items-center gap-1">
        {navGroups.map((group) => {
          const active = activeGroup?.key === group.key;
          return (
            <button
              key={group.key}
              onClick={() => navigate(group.defaultPath)}
              title={group.label}
              className="w-10 h-10 flex items-center justify-center transition-all duration-100 cursor-pointer border-none"
              style={{
                borderRadius: 'var(--radius-md)',
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
              <NavIcon name={group.icon} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default IconRail;
