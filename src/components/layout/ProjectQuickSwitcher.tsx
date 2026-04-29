/**
 * ProjectQuickSwitcher (Cmd-K) — global project + page jumper.
 *
 * Mounts in AppLayout, listens for Cmd/Ctrl-K (also Cmd-P for VSCode
 * users) anywhere in the app. Modal opens with autofocus on a search
 * input. Up/Down arrows + Enter navigate the filtered project list;
 * each result is a project plus optional shortcut targets (Materials,
 * Crew, etc.) so contractors can hop between hubs without two clicks.
 *
 * Selectors mirror MaterialPicker's X-6 keyboard nav so the muscle
 * memory transfers.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { Badge } from '@/components/shared/Badge';
import { getProjectStatusBadge } from '@/lib/constants';

interface QuickItem {
  id: string;
  label: string;
  sublabel?: string;
  type: 'project' | 'page';
  to: string;
  status?: string;
}

const STATIC_PAGES: QuickItem[] = [
  { id: 'page-dashboard', label: 'Projects', sublabel: 'Hub · /dashboard', type: 'page', to: '/dashboard' },
  { id: 'page-budget', label: 'Budget & Finance', sublabel: 'Hub · /budget', type: 'page', to: '/budget' },
  { id: 'page-materials', label: 'Materials', sublabel: 'Hub · /materials', type: 'page', to: '/materials' },
  { id: 'page-crew', label: 'Crew & Equipment', sublabel: 'Hub · /crew-hub', type: 'page', to: '/crew-hub' },
  { id: 'page-queue', label: 'Review Queue', sublabel: 'Page · /queue', type: 'page', to: '/queue' },
  { id: 'page-work-orders', label: 'Work Orders', sublabel: 'Page · /work-orders', type: 'page', to: '/work-orders' },
  { id: 'page-price-research', label: 'Price Research', sublabel: 'Page · /price-research', type: 'page', to: '/price-research' },
  { id: 'page-settings', label: 'Settings', sublabel: 'Page · /settings', type: 'page', to: '/settings' },
  { id: 'page-billing', label: 'Billing', sublabel: 'Page · /billing', type: 'page', to: '/billing' },
];

interface ProjectQuickSwitcherProps {
  open: boolean;
  onClose: () => void;
}

export const ProjectQuickSwitcher: React.FC<ProjectQuickSwitcherProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build flattened searchable list: pages first, then projects sorted by
  // most-recently-updated (proxy: createdAt desc when updatedAt absent).
  const items = useMemo<QuickItem[]>(() => {
    const projectItems: QuickItem[] = projects
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((p) => ({
        id: `project-${p.id}`,
        label: p.name || 'Untitled project',
        sublabel:
          [p.clientName, p.address].filter(Boolean).join(' · ') || 'Project',
        type: 'project' as const,
        to: `/projects/${p.id}`,
        status: p.status,
      }));
    return [...STATIC_PAGES, ...projectItems];
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.sublabel && item.sublabel.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [items, query]);

  // Reset state on open. Don't blow it away on close — keeps the query
  // sticky if the contractor reopens immediately.
  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      // setTimeout 0 = let the modal mount before focusing
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Esc closes from anywhere — the modal grabs focus on open but not
  // every browser fires keydown there reliably (Safari quirk), so a
  // window-level listener is the robust path.
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll the highlighted row into view as the user arrows.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-quick-row="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const select = useCallback(
    (item: QuickItem) => {
      onClose();
      navigate(item.to);
    },
    [navigate, onClose],
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item) select(item);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(filtered.length - 1);
      }
    },
    [filtered, activeIndex, select],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center"
      style={{ zIndex: 80, background: 'rgba(0, 0, 0, 0.5)', padding: '15vh 16px 16px' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Quick switcher"
    >
      <div
        className="rounded-[12px] overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '60vh',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Search projects + pages… (↑↓ to navigate, Enter to open, Esc to close)"
          aria-label="Quick switcher search"
          aria-controls="quick-switcher-list"
          aria-activedescendant={
            filtered[activeIndex] ? `quick-row-${activeIndex}` : undefined
          }
          className="bg-transparent text-[14px] focus:outline-none border-b"
          style={{
            color: 'var(--text-primary)',
            borderColor: 'var(--border-default)',
            padding: '14px 16px',
          }}
        />
        <div
          ref={listRef}
          id="quick-switcher-list"
          role="listbox"
          className="overflow-y-auto"
          style={{ flex: 1 }}
        >
          {filtered.length === 0 ? (
            <div
              className="text-center text-[12px]"
              style={{ color: 'var(--text-tertiary)', padding: '24px' }}
            >
              No matches.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  id={`quick-row-${idx}`}
                  data-quick-row={idx}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => select(item)}
                  className="w-full text-left flex items-center gap-[10px] cursor-pointer border-none bg-transparent transition-colors"
                  style={{
                    padding: '10px 16px',
                    background: isActive ? 'var(--surface-hover)' : 'transparent',
                    borderLeft: isActive
                      ? '3px solid var(--brand-primary)'
                      : '3px solid transparent',
                  }}
                >
                  <span
                    className="text-[10px] font-[600] uppercase shrink-0"
                    style={{
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.04em',
                      width: '60px',
                    }}
                  >
                    {item.type === 'page' ? 'Page' : 'Project'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="text-[13px] font-[500] block truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span
                        className="text-[11px] block truncate"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {item.sublabel}
                      </span>
                    )}
                  </span>
                  {item.status && (
                    <Badge variant={getProjectStatusBadge(item.status).variant}>
                      {getProjectStatusBadge(item.status).label}
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div
          className="text-[10px] flex items-center gap-[12px]"
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-default)',
            color: 'var(--text-tertiary)',
            background: 'var(--surface-hover)',
          }}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectQuickSwitcher;
