import type { KPIDefinition, WidgetConfig } from '@/types';
import { computeProjectCostRaw } from './manifest';

export const DEFAULT_SELECTED_KPIS = [
  'active_projects',
  'pipeline_value',
  'crew_available',
  'fleet_available',
];

export const KPI_LIBRARY: KPIDefinition[] = [
  {
    id: 'active_projects',
    label: 'Active Projects',
    category: 'projects',
    icon: '📋',
    compute: ({ projects }) => {
      const active = projects.filter(p =>
        p.status === 'in_progress' || p.status === 'scheduled'
      );
      return { value: active.length, subtitle: `of ${projects.length} total` };
    },
    colorVar: '--color-primary',
    navigateTo: '/projects',
    navigateParams: '?status=active',
  },
  {
    id: 'planning_projects',
    label: 'In Planning',
    category: 'projects',
    icon: '📐',
    compute: ({ projects }) => ({
      value: projects.filter(p => p.status === 'estimate').length,
    }),
    colorVar: '--color-primary',
    navigateTo: '/projects',
  },
  {
    id: 'pipeline_value',
    label: 'Pipeline Value',
    category: 'financial',
    icon: '💰',
    compute: ({ projects, materials }) => {
      const total = projects.reduce((s, p) => s + computeProjectCostRaw(p, materials), 0);
      return { value: total / 1000, subtitle: 'in active estimates' };
    },
    colorVar: '--color-primary',
    prefix: '$',
    suffix: 'k',
    decimals: 1,
    navigateTo: '/projects',
    navigateParams: '?sort=value',
  },
  {
    id: 'avg_project_value',
    label: 'Avg Project Value',
    category: 'financial',
    icon: '📊',
    compute: ({ projects, materials }) => {
      if (projects.length === 0) return { value: 0 };
      const total = projects.reduce((s, p) => s + computeProjectCostRaw(p, materials), 0);
      return { value: total / projects.length / 1000 };
    },
    colorVar: '--color-primary',
    prefix: '$',
    suffix: 'k',
    decimals: 1,
    navigateTo: '/projects',
  },
  {
    id: 'crew_available',
    label: 'Crew Available',
    category: 'crew',
    icon: '👷',
    compute: ({ crew }) => {
      const todayISO = new Date().toISOString().split('T')[0];
      const dayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getDay()];
      const available = crew.filter(
        m => m.availability[dayKey] && !(m.bookedDates ?? []).includes(todayISO),
      );
      return { value: available.length, subtitle: `of ${crew.length} total` };
    },
    colorVar: '--status-info',
    navigateTo: '/crew-hub',
  },
  {
    id: 'crew_utilization',
    label: 'Crew Utilization',
    category: 'crew',
    icon: '📈',
    compute: ({ crew }) => {
      const teamSize = crew.length;
      if (teamSize === 0) return { value: 0 };
      // Count crew members available today (rough utilization proxy)
      const dayKey = (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[new Date().getDay()];
      const availableToday = crew.filter(m => m.availability[dayKey]).length;
      const pct = Math.round((availableToday / teamSize) * 100);
      return { value: pct, subtitle: `${availableToday} of ${teamSize} available` };
    },
    colorVar: '--status-info',
    suffix: '%',
    navigateTo: '/crew-hub',
  },
  {
    id: 'fleet_available',
    label: 'Fleet Available',
    category: 'equipment',
    icon: '🚜',
    compute: ({ equipment }) => ({
      value: equipment.filter(e => e.status === 'available').length,
    }),
    colorVar: '--status-warning',
    navigateTo: '/crew-hub',
  },
  {
    id: 'fleet_in_service',
    label: 'In Service',
    category: 'equipment',
    icon: '🔧',
    compute: ({ equipment }) => ({
      value: equipment.filter(e => e.status === 'maintenance').length,
    }),
    colorVar: '--status-warning',
    navigateTo: '/crew-hub',
  },
  {
    id: 'low_stock_alerts',
    label: 'Low Stock Items',
    category: 'materials',
    icon: '⚠️',
    compute: ({ materials }) => ({
      value: materials.filter(m => m.qtyOnHand < m.minStockLevel).length,
    }),
    colorVar: '--status-error',
    navigateTo: '/materials',
  },
  {
    id: 'total_materials',
    label: 'Material Types',
    category: 'materials',
    icon: '🧱',
    compute: ({ materials }) => ({ value: materials.length }),
    colorVar: '--color-primary',
    navigateTo: '/materials',
  },
  {
    id: 'overdue_projects',
    label: 'Overdue',
    category: 'projects',
    icon: '🚨',
    compute: ({ projects }) => {
      const today = new Date().toISOString().split('T')[0];
      const overdue = projects.filter(p => {
        if (!p.targetDate || p.targetDate >= today) return false;
        return p.status !== 'completed' && p.status !== 'estimate' && p.status !== 'quoted';
      });
      return { value: overdue.length };
    },
    colorVar: '--color-primary',
    navigateTo: '/projects',
    navigateParams: '?status=overdue',
  },
  {
    id: 'cert_expiring',
    label: 'Certs Expiring',
    category: 'crew',
    icon: '📜',
    compute: ({ crew }) => {
      const today = new Date().toISOString().split('T')[0];
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      const soonISO = soon.toISOString().split('T')[0];
      const count = crew.filter(m =>
        (m.certs ?? []).some(c => c.expiry && c.expiry >= today && c.expiry <= soonISO),
      ).length;
      return { value: count, subtitle: 'within 30 days' };
    },
    colorVar: '--status-info',
    navigateTo: '/crew',
  },
];

export const DEFAULT_WIDGET_LAYOUT: WidgetConfig[] = [
  { id: 'widget-map', type: 'map', title: 'Project Map', visible: true, collapsed: false, order: 0, size: 'full' },
  { id: 'widget-alerts', type: 'alerts', title: 'Alerts', visible: true, collapsed: false, order: 1, size: 'half' },
  { id: 'widget-projects', type: 'projects', title: 'Projects in Progress', visible: true, collapsed: false, order: 2, size: 'half' },
  { id: 'widget-crew', type: 'crew', title: 'Crew Utilization', visible: true, collapsed: false, order: 3, size: 'half' },
  { id: 'widget-fleet', type: 'fleet', title: 'Fleet Status', visible: true, collapsed: false, order: 4, size: 'half' },
  { id: 'widget-schedule', type: 'schedule', title: "Today's Schedule", visible: true, collapsed: false, order: 5, size: 'full' },
];
