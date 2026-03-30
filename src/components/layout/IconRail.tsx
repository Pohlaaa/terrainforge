import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navGroups, findGroupForPath } from '@/components/layout/navConfig';
import { NavIcon } from '@/components/layout/NavIcon';

interface IconRailProps {
  expanded?: boolean;
}

export const IconRail: React.FC<IconRailProps> = ({ expanded = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeGroup = findGroupForPath(location.pathname);

  return (
    <aside
      className={`h-full flex flex-col flex-shrink-0 transition-all duration-150 ${expanded ? 'w-[200px]' : 'w-16'}`}
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo mark — click to go home */}
      <div className={`flex items-center gap-2.5 ${expanded ? 'px-4 py-3' : 'justify-center py-3'}`}>
        <button
          onClick={() => navigate('/')}
          title="Dashboard"
          className="w-8 h-8 flex items-center justify-center border-none cursor-pointer transition-opacity duration-100 hover:opacity-80 flex-shrink-0"
          style={{
            background: 'var(--sidebar-active)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--sidebar-accent)',
            fontSize: '14px',
            fontWeight: 800,
          }}
        >
          TF
        </button>
        {expanded && (
          <span className="text-sm font-bold truncate" style={{ color: 'var(--sidebar-text)' }}>
            TerrainForge
          </span>
        )}
      </div>

      {/* Group icons */}
      <nav className={`flex flex-col gap-1 ${expanded ? 'px-2' : 'items-center'}`}>
        {navGroups.map((group) => {
          const active = activeGroup?.key === group.key;
          return (
            <button
              key={group.key}
              onClick={() => navigate(group.defaultPath)}
              title={expanded ? undefined : group.label}
              className={`flex items-center transition-all duration-100 cursor-pointer border-none ${
                expanded ? 'gap-2.5 px-3 py-2 w-full text-left' : 'w-10 h-10 justify-center'
              }`}
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
              {expanded && (
                <span className="text-[13px] font-medium truncate">{group.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default IconRail;
