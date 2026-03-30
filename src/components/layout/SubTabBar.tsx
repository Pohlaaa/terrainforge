import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { findGroupForPath } from '@/components/layout/navConfig';
import { NavIcon } from '@/components/layout/NavIcon';

function isActiveTab(itemPath: string, currentPath: string): boolean {
  if (itemPath === currentPath) return true;
  return currentPath.startsWith(itemPath + '/');
}

export const SubTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeGroup = findGroupForPath(location.pathname);

  // Don't render for groups with 0 or 1 items
  if (!activeGroup || activeGroup.items.length < 2) return null;

  return (
    <nav
      className="flex items-center gap-0.5 px-4 flex-shrink-0 overflow-x-auto"
      style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-default)',
        scrollbarWidth: 'none',
      }}
    >
      {activeGroup.items.map((item) => {
        const active = isActiveTab(item.path, location.pathname);
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-1.5 whitespace-nowrap transition-all duration-100 cursor-pointer bg-transparent border border-transparent"
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              minHeight: '40px',
              borderRadius: active ? 'var(--radius-md)' : 'var(--radius-md)',
              background: active ? 'var(--brand-primary-bg)' : 'transparent',
              color: active ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              borderColor: active ? 'var(--brand-primary)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'var(--surface-hover)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }
            }}
          >
            <NavIcon name={item.icon} size={14} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};

export default SubTabBar;
