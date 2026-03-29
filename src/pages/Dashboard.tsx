import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}

      {/* Greeting header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Good {greetingWord}{userName ? `, ${userName}` : ''}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
          {dateStr}
        </div>
        {projects.length > 0 && (
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{activeCount}</span> projects active
            {needingAttentionCount > 0 && (
              <>
                {' · '}
                <span style={{ fontWeight: 700, color: 'var(--status-amber)' }}>{needingAttentionCount}</span> needing attention
              </>
            )}
            {totalValueK > 0 && (
              <>
                {' · '}
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${totalValueK}K</span> total value
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-[16px] items-start">
        {/* LEFT COLUMN: KPIs + Customize */}
        <div className="flex flex-col gap-[12px]">
          {projects.length === 0 ? (
            <div
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--color-primary)',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⬡</div>
              <div
                className="font-serif"
                style={{
                  fontSize: '18px',
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Welcome to TerrainForge
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  marginBottom: '20px',
                  lineHeight: 1.5,
                }}
              >
                Manage projects, materials, crew, and equipment — all in one place. Start by
                creating your first project.
              </div>
              <Link
                to="/projects"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  textDecoration: 'none',
                }}
              >
                Create First Project
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {activeKpis.map((kpi, index) => {
                const result = kpi.compute(appState);
                const isDraggingThis = Boolean(
                  kpiDragState?.dragging && kpiDragState.dragIndex === index,
                );
                const kpiDelta = kpiDragState ? kpiDragState.currentY - kpiDragState.startY : 0;
                const kpiTargetIndex =
                  kpiDragState && kpiDragState.itemHeight > 0
                    ? Math.max(
                        0,
                        Math.min(
                          activeKpis.length - 1,
                          kpiDragState.dragIndex +
                            Math.round(kpiDelta / kpiDragState.itemHeight),
                        ),
                      )
                    : -1;
                const showKpiPlaceholder =
                  kpiDragState?.dragging &&
                  kpiDragState.dragIndex !== index &&
                  kpiTargetIndex === index &&
                  !prefersReducedMotion;

                return (
                  <div key={kpi.id}>
                    {showKpiPlaceholder && (
                      <div
                        className="animate-placeholder-pulse"
                        style={{
                          height: `${kpiDragState?.itemHeight ?? 80}px`,
                          background: 'var(--surface-hover)',
                          border: '2px dashed var(--border-default)',
                          borderRadius: '10px',
                          marginBottom: '8px',
                        }}
                      />
                    )}
                    <div
                      ref={(el) => { kpiRefs.current[index] = el; }}
                      onPointerDown={(e) => handleKpiPointerDown(e, index)}
                      onPointerMove={handleKpiPointerMove}
                      onPointerUp={handleKpiPointerUp}
                      style={{
                        transform: isDraggingThis && !prefersReducedMotion
                          ? `translateY(${kpiDelta}px) scale(1.02)`
                          : undefined,
                        zIndex: isDraggingThis ? 100 : undefined,
                        position: 'relative',
                        transition:
                          kpiDragState?.dragging && !isDraggingThis && !prefersReducedMotion
                            ? 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            : undefined,
                        cursor: editMode ? 'grab' : undefined,
                        touchAction: editMode ? 'none' : undefined,
                        userSelect: editMode ? 'none' : undefined,
                      }}
                    >
                      <KPICard
                        icon={kpi.icon}
                        label={kpi.label}
                        value={result.value}
                        subtitle={result.subtitle}
                        prefix={kpi.prefix}
                        suffix={kpi.suffix}
                        decimals={kpi.decimals}
                        editMode={editMode}
                        isDragging={isDraggingThis}
                        navigateTo={kpi.navigateTo}
                        navigateParams={kpi.navigateParams}
                      />
                    </div>
                  </div>
                );
              })}

              <button
                onClick={toggleKpiDrawer}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px dashed var(--border-default)',
                  background: 'transparent',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  minHeight: '44px',
                  transition: 'all 0.2s ease',
                }}
                className="hover:bg-[var(--surface-hover)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                ✎ Customize KPIs
              </button>
            </div>
          )}

          {kpiDrawerOpen && (
            <KPIDrawer
              open={kpiDrawerOpen}
              onClose={closeKpiDrawer}
              selectedKpis={selectedKpis ?? DEFAULT_SELECTED_KPIS}
              onSelectionChange={handleKpiChange}
            />
          )}
        </div>

        {/* RIGHT COLUMN: Widget Grid */}
        <div className="flex flex-col gap-[12px]">
          <div className="flex items-center justify-between">
            <div
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
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
                    borderRadius: '6px',
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
                  borderRadius: '6px',
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
    </div>
  );
};

export default Dashboard;
