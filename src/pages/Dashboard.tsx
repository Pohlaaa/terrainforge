import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { AlertBanner } from '@/components/shared/AlertBanner';
import { SkeletonKPI, SkeletonWidget } from '@/components/shared/Skeleton';
import { KPIDrawer } from '@/components/dashboard/KPIDrawer';
import { WidgetGrid } from '@/components/dashboard/WidgetGrid';
import { useCountUp } from '@/hooks/useCountUp';
import { toast } from '@/hooks/useToast';
import { KPI_LIBRARY, DEFAULT_SELECTED_KPIS } from '@/lib/kpiDefinitions';
import { updateSelectedKpis, updateWidgetLayout } from '@/services/preferences';
import { EmptyState, ProjectsIcon } from '@/components/shared/EmptyState';
import type { AppState } from '@/types';

// Debounce helper for Supabase layout writes
function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
): (...args: T) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  return useCallback(
    (...args: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay],
  );
}

// Generate mock sparkline data (7 points, slight upward trend)
function getMockSparklinePoints(width = 100, height = 32): string {
  const pts = [0.6, 0.5, 0.65, 0.55, 0.7, 0.62, 0.75];
  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * width;
    const y = height - v * height * 0.85 - height * 0.075;
    return `${x},${y}`;
  });
  return coords.join(' ');
}

function Sparkline({ editMode }: { editMode?: boolean }) {
  if (editMode) return null;
  const pts = getMockSparklinePoints(100, 32);
  const polyPts = `0,32 ${pts} 100,32`;
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height: '32px', marginTop: '8px' }}
      aria-hidden="true"
    >
      <polygon
        points={polyPts}
        fill="var(--brand-primary)"
        fillOpacity="0.15"
      />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Single KPI card with count-up animation
interface KPICardProps {
  icon: string;
  label: string;
  value: number;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  editMode?: boolean;
  isDragging?: boolean;
  navigateTo?: string;
  navigateParams?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  icon,
  label,
  value,
  subtitle,
  prefix = '',
  suffix = '',
  decimals = 0,
  editMode = false,
  isDragging = false,
  navigateTo,
  navigateParams,
}) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const display = useCountUp({ end: value, prefix, suffix, decimals });

  const handleClick = () => {
    if (!editMode && navigateTo) {
      navigate(navigateTo + (navigateParams ?? ''));
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface-card)',
        border: editMode ? '2px dashed var(--color-primary)' : '1px solid var(--border-default)',
        borderLeft: editMode ? '2px dashed var(--color-primary)' : '4px solid var(--brand-primary)',
        borderRadius: '10px',
        padding: '16px 16px 0 14px',
        boxShadow: isDragging
          ? '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)'
          : hovered && !editMode
          ? 'var(--shadow-hover)'
          : undefined,
        transform: hovered && !editMode && !isDragging ? 'translateY(-1px)' : undefined,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        cursor: navigateTo && !editMode ? 'pointer' : undefined,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '0 0 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
            }}
          >
            {icon} {label}
          </div>
          {navigateTo && !editMode && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{
                color: 'var(--text-tertiary)',
                opacity: hovered ? 1 : 0.5,
                transition: 'opacity 0.15s ease',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div
          className="font-serif"
          style={{
            fontSize: '28px',
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {display}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              marginTop: '4px',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <Sparkline editMode={editMode} />
    </div>
  );
};

interface KpiDragState {
  dragging: boolean;
  dragIndex: number;
  startY: number;
  currentY: number;
  itemHeight: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  const [kpiDragState, setKpiDragState] = useState<KpiDragState | null>(null);
  const kpiRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { projects, isLoading, error } = useProjectStore();

  useEffect(() => {
    if (error) toast.error('Failed to load dashboard data');
  }, [error]);
  const { crew } = useCrewStore();
  const { equipment } = useEquipmentStore();
  const { materials } = useMaterialStore();
  const { user } = useAuth();

  const {
    kpiDrawerOpen,
    closeKpiDrawer,
    toggleKpiDrawer,
    selectedKpis,
    setSelectedKpis,
    editMode,
    widgetLayout,
    toggleEditMode,
    reorderWidgets,
    toggleWidgetVisibility,
    toggleWidgetCollapsed,
  } = useUIStore();

  const appState: AppState = { projects, crew, equipment, materials };

  // Debounced Supabase layout write
  const debouncedSaveLayout = useDebouncedCallback(
    async (userId: string, layout: typeof widgetLayout) => {
      const serialized = layout.map((w) => ({
        widgetId: w.id,
        type: w.type,
        position: w.order,
      }));
      try {
        await updateWidgetLayout(userId, serialized);
        toast.success('Dashboard layout saved');
      } catch {
        // silently ignore
      }
    },
    1000,
  );

  const handleReorder = (fromIndex: number, toIndex: number) => {
    reorderWidgets(fromIndex, toIndex);
    if (user?.id) {
      debouncedSaveLayout(user.id, widgetLayout);
    }
  };

  const handleVisibilityToggle = (widgetId: string) => {
    const widget = widgetLayout.find((w) => w.id === widgetId);
    const isCurrentlyVisible = widget?.visible ?? false;
    toggleWidgetVisibility(widgetId);
    if (isCurrentlyVisible) {
      toast.info('Widget hidden — use Edit Layout to restore');
    } else {
      toast.success('Widget restored');
    }
    if (user?.id) {
      debouncedSaveLayout(user.id, widgetLayout);
    }
  };

  const handleKpiChange = async (ids: string[]) => {
    setSelectedKpis(ids);
    if (user?.id) {
      try {
        await updateSelectedKpis(user.id, ids);
        toast.success('KPIs updated');
      } catch {
        toast.error('Failed to save KPI preferences');
      }
    }
  };

  const activeKpis = (selectedKpis ?? DEFAULT_SELECTED_KPIS)
    .map((id) => KPI_LIBRARY.find((k) => k.id === id))
    .filter((k): k is NonNullable<typeof k> => Boolean(k));

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleKpiPointerDown = (e: React.PointerEvent, index: number) => {
    if (!editMode) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rect = kpiRefs.current[index]?.getBoundingClientRect();
    setKpiDragState({
      dragging: true,
      dragIndex: index,
      startY: e.clientY,
      currentY: e.clientY,
      itemHeight: rect?.height ?? 80,
    });
  };

  const handleKpiPointerMove = (e: React.PointerEvent) => {
    if (!kpiDragState?.dragging) return;
    setKpiDragState((prev) => (prev ? { ...prev, currentY: e.clientY } : null));
  };

  const handleKpiPointerUp = async (e: React.PointerEvent) => {
    if (!kpiDragState) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    const delta = kpiDragState.currentY - kpiDragState.startY;
    const indexOffset = Math.round(delta / kpiDragState.itemHeight);
    const toIndex = Math.max(
      0,
      Math.min(activeKpis.length - 1, kpiDragState.dragIndex + indexOffset),
    );
    if (toIndex !== kpiDragState.dragIndex) {
      const newOrder = [...(selectedKpis ?? DEFAULT_SELECTED_KPIS)];
      const [moved] = newOrder.splice(kpiDragState.dragIndex, 1);
      newOrder.splice(toIndex, 0, moved);
      setSelectedKpis(newOrder);
      if (user?.id) {
        try {
          await updateSelectedKpis(user.id, newOrder);
          toast.success('KPI layout saved');
        } catch {
          toast.error('Failed to save KPI order');
        }
      }
    }
    setKpiDragState(null);
  };

  const hiddenWidgets = widgetLayout.filter((w) => !w.visible);

  if (isLoading || initialLoad) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-[16px] items-start">
        <div className="flex flex-col gap-[8px]">
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
          <SkeletonKPI />
        </div>
        <div className="flex flex-col gap-[12px]">
          <SkeletonWidget />
          <div className="grid grid-cols-2 gap-[12px]">
            <SkeletonWidget />
            <SkeletonWidget />
          </div>
        </div>
      </div>
    );
  }

  // Greeting header data
  const greetingHour = new Date().getHours();
  const greetingWord = greetingHour < 12 ? 'morning' : greetingHour < 17 ? 'afternoon' : 'evening';
  const userName = (() => {
    if (user?.user_metadata?.full_name) return (user.user_metadata.full_name as string).split(' ')[0];
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return '';
  })();
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const activeCount = projects.filter((p) => {
    const checks = Object.values(p.checklist);
    return checks.filter(Boolean).length < checks.length;
  }).length;
  const today = new Date().toISOString().split('T')[0];
  const needingAttentionCount = projects.filter((p) => {
    const checks = Object.values(p.checklist);
    const pct = checks.length > 0 ? checks.filter(Boolean).length / checks.length : 0;
    return pct < 1 && p.targetDate && p.targetDate < today;
  }).length;
  const totalValueK = Math.round(
    projects.reduce((s, p) => s + (p.budget ?? 0), 0) / 1000,
  );

  return (
    <div>
      {/* ── Compact Greeting (v7) ────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between gap-3 -mx-3 -mt-2 sm:-mx-4 sm:-mt-3 lg:-mx-6 lg:-mt-4 px-4 lg:px-6"
        style={{
          paddingTop: '14px',
          paddingBottom: '14px',
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Good {greetingWord}{userName ? `, ${userName}` : ''}
          </h2>
          {projects.length > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              <strong style={{ color: 'var(--brand-primary)' }}>{activeCount}</strong> projects
              {' · '}
              <strong style={{ color: 'var(--brand-primary)' }}>${totalValueK}K</strong> value
              {needingAttentionCount > 0 && (
                <>
                  {' · '}
                  <strong style={{ color: 'var(--status-amber)' }}>{needingAttentionCount}</strong> need attention
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 mb-2">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}

      {/* ── KPI Strip (v7 inline compact) ────────────────────────────────── */}
      {projects.length === 0 ? (
        <div className="mt-4 card-shadow" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: '10px' }}>
          <EmptyState
            icon={<ProjectsIcon />}
            title="Welcome to TerrainForge"
            description="Create your first project to see your dashboard come alive with KPIs, maps, and insights."
            actionLabel="Create Project"
            onAction={() => navigate('/projects')}
          />
        </div>
      ) : (
        <>
          <div
            className="flex -mx-3 sm:-mx-4 lg:-mx-6"
            style={{ background: 'var(--border-default)', gap: '1px', borderBottom: '1px solid var(--border-default)' }}
          >
            {activeKpis.slice(0, 4).map((kpi) => {
              const result = kpi.compute(appState);
              const display = `${kpi.prefix ?? ''}${
                kpi.decimals ? result.value.toFixed(kpi.decimals) : Math.round(result.value)
              }${kpi.suffix ?? ''}`;
              return (
                <div
                  key={kpi.id}
                  onClick={() => kpi.navigateTo && navigate(kpi.navigateTo + (kpi.navigateParams ?? ''))}
                  className="flex-1 min-w-0 transition-colors duration-100"
                  style={{
                    background: 'var(--surface-card)',
                    padding: '10px 12px',
                    cursor: kpi.navigateTo ? 'pointer' : undefined,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-card)'; }}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                      {display}
                    </span>
                    <span className="truncate" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                      {kpi.label}
                    </span>
                  </div>
                  {result.subtitle && (
                    <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {result.subtitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Customize KPIs link */}
          <div className="flex items-center justify-between mt-3 mb-1">
            <button
              onClick={toggleKpiDrawer}
              className="text-[11px] font-semibold bg-transparent border-none cursor-pointer transition-colors"
              style={{ color: 'var(--brand-primary)', padding: '4px 0' }}
            >
              Customize KPIs
            </button>
          </div>
        </>
      )}

      {kpiDrawerOpen && (
        <KPIDrawer
          open={kpiDrawerOpen}
          onClose={closeKpiDrawer}
          selectedKpis={selectedKpis ?? DEFAULT_SELECTED_KPIS}
          onSelectionChange={handleKpiChange}
        />
      )}

      {/* ── Widget Grid (full width, v7) ─────────────────────────────────── */}
      <div className="flex flex-col gap-[12px] mt-2">
        <div className="flex items-center justify-between">
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Your Dashboard
          </div>
            <div className="flex items-center gap-[8px]">
              {editMode && hiddenWidgets.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleVisibilityToggle(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    minHeight: '44px',
                  }}
                  defaultValue=""
                  aria-label="Add widget"
                >
                  <option value="" disabled>
                    + Add Widget
                  </option>
                  {hiddenWidgets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={toggleEditMode}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  minHeight: '44px',
                  cursor: 'pointer',
                  border: editMode ? 'none' : '1px solid var(--border-default)',
                  background: editMode ? 'var(--color-primary)' : 'var(--surface-card)',
                  color: editMode ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                {editMode ? '✓ Done' : '✎ Edit Dashboard'}
              </button>
            </div>
          </div>

          <WidgetGrid
            widgets={widgetLayout}
            editMode={editMode}
            appState={appState}
            onReorder={handleReorder}
            onToggleCollapsed={toggleWidgetCollapsed}
            onToggleVisibility={handleVisibilityToggle}
          />
        </div>
    </div>
  );
};

export default Dashboard;
