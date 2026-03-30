import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navGroups, findGroupForPath } from '@/components/layout/navConfig';
import { NavIcon } from '@/components/layout/NavIcon';

interface IconRailProps {
  expanded?: boolean;
}

function isActivePath(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

export const IconRail: React.FC<IconRailProps> = ({ expanded = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeGroup = findGroupForPath(location.pathname);

  return (
    <aside
      className={`h-full flex flex-col flex-shrink-0 transition-all duration-150 ${expanded ? 'w-[220px]' : 'w-16'}`}
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

      {/* Navigation */}
      <nav className={`flex flex-col gap-0.5 overflow-y-auto flex-1 ${expanded ? 'px-2' : 'items-center'}`}>
        {navGroups.map((group) => {
          const active = activeGroup?.key === group.key;

          if (!expanded) {
            // Collapsed: icon only
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
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--sidebar-active)' : 'transparent'; }}
              >
                <NavIcon name={group.icon} />
              </button>
            );
          }

          // Expanded: show group + sub-items
          if (group.items.length === 0) {
            // Dashboard — single item
            return (
              <button
                key={group.key}
                onClick={() => navigate(group.defaultPath)}
                className="flex items-center gap-2.5 px-3 py-2 w-full text-left transition-all duration-100 cursor-pointer border-none"
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  color: active ? '#FFFFFF' : 'var(--sidebar-text-muted)',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? 'var(--sidebar-active)' : 'transparent'; }}
              >
                <NavIcon name={group.icon} />
                <span className="text-[13px] font-medium truncate">{group.label}</span>
              </button>
            );
          }

          // Group with sub-items
          return (
            <div key={group.key} className="mt-1">
              {/* Group header label */}
              <div
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider select-none"
                style={{ color: 'var(--sidebar-text-muted)', opacity: 0.6 }}
              >
                {group.label}
              </div>
              {/* Sub-items */}
              {group.items.map((item) => {
                const itemActive = isActivePath(item.path, location.pathname);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex items-center gap-2.5 px-3 py-1.5 w-full text-left transition-all duration-100 cursor-pointer border-none"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      background: itemActive ? 'var(--sidebar-active)' : 'transparent',
                      color: itemActive ? '#FFFFFF' : 'var(--sidebar-text-muted)',
                      paddingLeft: '16px',
                    }}
                    onMouseEnter={(e) => { if (!itemActive) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                    onMouseLeave={(e) => { if (!itemActive) e.currentTarget.style.background = itemActive ? 'var(--sidebar-active)' : 'transparent'; }}
                  >
                    <NavIcon name={item.icon} size={16} />
                    <span className="text-[13px] font-medium truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default IconRail;
