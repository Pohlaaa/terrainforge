import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavIcon } from '@/components/layout/NavIcon';
import { primaryTabs, secondaryPages, isActiveTab, isSecondaryPage } from '@/components/layout/navConfig';

interface TopNavProps {
  onMobileMenuToggle?: () => void;
  showMobileMenu?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ onMobileMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Sync theme state on mount
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    setIsDark(theme === 'dark');
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!userDropdownOpen && !moreDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (userDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (moreDropdownOpen && moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userDropdownOpen, moreDropdownOpen]);

  // Close dropdowns on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setMoreDropdownOpen(false);
  }, [location.pathname]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tf-theme', next);
    setIsDark(!isDark);
  }, [isDark]);

  const handleSignOut = useCallback(async () => {
    setUserDropdownOpen(false);
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const userInitial = user?.email ? user.email[0].toUpperCase() : '?';
  const moreIsActive = isSecondaryPage(location.pathname);

  return (
    <header
      className="sticky top-0 z-50 flex-shrink-0"
      style={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center justify-between px-4 lg:px-5" style={{ height: '56px' }}>
        {/* LEFT: Logo + tabs */}
        <div className="flex items-center gap-1">
          {/* Mobile hamburger */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden w-10 h-10 flex items-center justify-center cursor-pointer border-none bg-transparent"
            style={{ borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}
            aria-label="Open navigation"
          >
            <NavIcon name="menu" size={20} />
          </button>

          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-2 py-1 cursor-pointer border-none bg-transparent mr-2"
            style={{ borderRadius: 'var(--radius-md)' }}
            aria-label="Home"
          >
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-xs font-extrabold"
              style={{
                background: 'var(--brand-primary)',
                borderRadius: 'var(--radius-md)',
                color: '#FFFFFF',
              }}
            >
              TF
            </div>
            <span
              className="hidden sm:inline text-sm font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              TerrainForge
            </span>
          </button>

          {/* Tab links — hidden on mobile */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {primaryTabs.map((tab) => {
              const active = isActiveTab(tab.path, location.pathname);
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className="relative px-3 py-4 text-sm font-medium cursor-pointer border-none bg-transparent transition-colors duration-100"
                  style={{
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <span className="hidden xl:inline">{tab.label}</span>
                  <span className="xl:hidden">{tab.shortLabel}</span>
                  {/* Active underline */}
                  {active && (
                    <div
                      className="absolute bottom-0 left-3 right-3"
                      style={{
                        height: '2px',
                        background: 'var(--brand-primary)',
                        borderRadius: '1px',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* RIGHT: Bell + More + User */}
        <div className="flex items-center gap-1.5">
          {/* Alert bell */}
          <button
            onClick={() => navigate('/dashboard')}
            title="Alerts"
            className="w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-100"
            style={{
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <NavIcon name="bell" size={18} />
          </button>

          {/* More dropdown */}
          <div className="relative" ref={moreDropdownRef}>
            <button
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              title="More pages"
              className="hidden sm:flex h-9 items-center gap-1.5 px-3 cursor-pointer transition-all duration-100 text-sm font-medium"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: moreDropdownOpen || moreIsActive ? 'var(--surface-hover)' : 'var(--surface-card)',
                color: moreIsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
              onMouseLeave={(e) => {
                if (!moreDropdownOpen && !moreIsActive) e.currentTarget.style.background = 'var(--surface-card)';
              }}
            >
              More
              <NavIcon name="chevron-down" size={14} />
            </button>

            {moreDropdownOpen && (
              <div
                className="absolute right-0 mt-1 min-w-[200px] py-1 z-50"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-panel)',
                }}
              >
                {secondaryPages.map((page) => {
                  const active = location.pathname === page.path;
                  return (
                    <button
                      key={page.path}
                      onClick={() => {
                        setMoreDropdownOpen(false);
                        navigate(page.path);
                      }}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 cursor-pointer border-none bg-transparent transition-colors duration-100"
                      style={{
                        color: active ? 'var(--brand-primary)' : 'var(--text-primary)',
                        fontWeight: active ? 600 : 400,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <NavIcon name={page.icon} size={16} />
                      {page.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-100"
            style={{
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <NavIcon name={isDark ? 'sun' : 'moon'} size={16} />
          </button>

          {/* User menu */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              title={user?.email || 'Account'}
              className="w-10 h-10 flex items-center justify-center cursor-pointer transition-all duration-100 text-xs font-bold"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                background: userDropdownOpen ? 'var(--surface-hover)' : 'var(--surface-card)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
              onMouseLeave={(e) => {
                if (!userDropdownOpen) e.currentTarget.style.background = 'var(--surface-card)';
              }}
            >
              {userInitial}
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-1 min-w-[200px] py-1 z-50"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-panel)',
                }}
              >
                <div className="px-3 py-2 text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {user?.email}
                </div>
                <div className="my-1" style={{ height: '1px', background: 'var(--border-default)' }} />
                <button
                  onClick={() => { setUserDropdownOpen(false); window.open('/crew', '_blank'); }}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors duration-100"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <NavIcon name="external-link" size={14} />
                  Crew App
                </button>
                <div className="my-1" style={{ height: '1px', background: 'var(--border-default)' }} />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 cursor-pointer border-none bg-transparent transition-colors duration-100"
                  style={{ color: '#F87171' }}
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
