import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectStore } from '@/stores/projectStore';
import { NavIcon } from '@/components/layout/NavIcon';

interface TopNavProps {
  onMobileMenuToggle?: () => void;
  showMobileMenu?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const projects = useProjectStore((s) => s.projects);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = activeProjectId
    ? projects.find((p) => p.id === activeProjectId)
    : null;

  // Sync theme state on mount
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setIsDark(theme === 'dark');
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tf-theme', next);
    setIsDark(!isDark);
  }, [isDark]);

  const handleSignOut = useCallback(async () => {
    setDropdownOpen(false);
    await signOut();
  }, [signOut]);

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <header
      className="sticky top-0 z-50 flex-shrink-0"
      style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center justify-between px-4 lg:px-5" style={{ height: '52px' }}>
        {/* LEFT section */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden w-10 h-10 flex items-center justify-center cursor-pointer border-none bg-transparent"
            style={{
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Open navigation"
          >
            <NavIcon name="menu" size={20} />
          </button>

          {/* Active project or logo */}
          <div className="flex items-center gap-2">
            {activeProject ? (
              <span
                className="text-sm font-semibold truncate max-w-[200px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {activeProject.name}
              </span>
            ) : (
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                TerrainForge
              </span>
            )}
          </div>
        </div>

        {/* RIGHT section */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-100"
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--surface-card)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-card)';
            }}
          >
            <NavIcon name={isDark ? 'sun' : 'moon'} size={16} />
          </button>

          {/* User menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title={user?.email || 'Account'}
              className="w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-100 text-xs font-bold"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: dropdownOpen ? 'var(--surface-hover)' : 'var(--surface-card)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-hover)';
              }}
              onMouseLeave={(e) => {
                if (!dropdownOpen) {
                  e.currentTarget.style.background = 'var(--surface-card)';
                }
              }}
            >
              {userInitial}
            </button>

            {/* Dropdown */}
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-1 min-w-[200px] py-1 z-50"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-panel)',
                }}
              >
                {/* User email */}
                <div
                  className="px-3 py-2 text-xs truncate"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {user?.email}
                </div>

                <div
                  className="my-1"
                  style={{ height: '1px', background: 'var(--border-default)' }}
                />

                {/* Navigation items */}
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/billing'); }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors duration-100"
                  style={{ color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <NavIcon name="credit-card" size={14} />
                  Billing
                </button>

                <button
                  onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors duration-100"
                  style={{ color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <NavIcon name="settings" size={14} />
                  Settings
                </button>

                <div
                  className="my-1"
                  style={{ height: '1px', background: 'var(--border-default)' }}
                />

                <button
                  onClick={() => { setDropdownOpen(false); window.open('/crew', '_blank'); }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors duration-100"
                  style={{ color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <NavIcon name="external-link" size={14} />
                  Crew App
                </button>

                <div
                  className="my-1"
                  style={{ height: '1px', background: 'var(--border-default)' }}
                />

                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors duration-100"
                  style={{ color: '#F87171', borderRadius: 'var(--radius-sm)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <NavIcon name="log-out" size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
