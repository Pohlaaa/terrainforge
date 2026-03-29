import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

// Single KPI card with count-up animation
interface KPICardProps {
  icon: string;
  label: string;
  value: number;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const KPICard: React.FC<KPICardProps> = ({
  icon,
  label,
  value,
  subtitle,
  prefix = '',
  suffix = '',
  decimals = 0,
}) => {
  const display = useCountUp({ end: value, prefix, suffix, decimals });
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '10px',
        padding: '16px',
      }}
    >
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
  );
};

export const Dashboard: React.FC = () => {
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoad(false), 600);
    return () => clearTimeout(t);
  }, []);

  const { projects, isLoading, error } = useProjectStore();
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
        toast.info('Dashboard layout saved');
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
    toggleWidgetVisibility(widgetId);
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

  return (
    <div>
      {error && (
        <div className="mb-[16px]">
          <AlertBanner alert={{ level: 'red', title: 'Load error', msg: error }} />
        </div>
      )}

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
              {activeKpis.map((kpi) => {
                const result = kpi.compute(appState);
                return (
                  <KPICard
                    key={kpi.id}
                    icon={kpi.icon}
                    label={kpi.label}
                    value={result.value}
                    subtitle={result.subtitle}
                    prefix={kpi.prefix}
                    suffix={kpi.suffix}
                    decimals={kpi.decimals}
                  />
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
