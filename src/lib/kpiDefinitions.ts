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
    compute: ({ projects }) => ({
      value: projects.filter(p => p.zones?.length > 0).length,
    }),
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
      value: projects.filter(p => !p.zones || p.zones.length === 0).length,
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
    navigateTo: '/crew',
  },
  {
    id: 'crew_utilization',
    label: 'Crew Utilization',
    category: 'crew',
    icon: '📈',
    compute: ({ crew, projects }) => {
      const teamSize = crew.length;
      if (teamSize === 0) return { value: 0 };
      const assignedIds = new Set(
        projects.flatMap(p => p.zones.map(z => z.crew)).filter(Boolean),
      );
      return { value: Math.round((assignedIds.size / teamSize) * 100) };
    },
    colorVar: '--status-info',
    suffix: '%',
    navigateTo: '/crew',
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
    navigateTo: '/equipment',
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
    navigateTo: '/equipment',
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
        const checks = Object.values(p.checklist);
        return checks.filter(Boolean).length < checks.length;
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
  { id: 'widget-alerts', type: 'alerts', title: 'Alerts', visible: true, collapsed: false, order: 0 },
  { id: 'widget-projects', type: 'projects', title: 'Projects in Progress', visible: true, collapsed: false, order: 1 },
  { id: 'widget-crew', type: 'crew', title: 'Crew Utilization', visible: true, collapsed: false, order: 2 },
  { id: 'widget-fleet', type: 'fleet', title: 'Fleet Status', visible: true, collapsed: false, order: 3 },
  { id: 'widget-map', type: 'map', title: 'Project Map', visible: false, collapsed: false, order: 4 },
];
