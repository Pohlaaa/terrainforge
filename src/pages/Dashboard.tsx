import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, BarChart3, Users } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useMaterialStore } from '@/stores/materialStore';
import { KPICard } from '@/components/shared/KPICard';
import { HubHeader } from '@/components/shared/HubHeader';
import { Badge } from '@/components/shared/Badge';
import { MapWidget } from '@/components/dashboard/widgets/MapWidget';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ProjectListItem } from '@/types';
import { getProjectStatusBadge } from '@/lib/constants';
import { computeProjectProgress } from '@/lib/projectProgress';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getChecklistPct(project: ProjectListItem): number {
  return computeProjectProgress(project).percentage;
}

function getStatusBadge(project: ProjectListItem) {
  return getProjectStatusBadge(project.status);
}

function formatBudget(value: number | undefined | null): string {
  if (!value) return '$0';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'estimate', label: 'Estimate' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

// ── Component ────────────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const crew = useCrewStore((s) => s.crew);
  const equipment = useEquipmentStore((s) => s.equipment);
  const materials = useMaterialStore((s) => s.materials);
  const isLoading = useProjectStore((s) => s.loading);

  // View toggle: chart vs map
  const [viewMode, setViewMode] = useState<'chart' | 'map'>(() => {
    return (localStorage.getItem('tf-projects-view') as 'chart' | 'map') || 'chart';
  });

  // Table search & filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<'name' | 'progress' | 'budget'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleView = (mode: 'chart' | 'map') => {
    setViewMode(mode);
    localStorage.setItem('tf-projects-view', mode);
  };

  // ── KPI computations ────────────────────────────────────────────────────

  const activeProjects = useMemo(() => {
    return projects.filter(p => (p.status ?? 'estimate') !== 'completed');
  }, [projects]);

  const completedThisMonth = useMemo(() => {
    return projects.filter(p => p.status === 'completed').length;
  }, [projects]);

  const pipelineValue = useMemo(() => {
    return activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  }, [activeProjects]);

  const avgCompletion = useMemo(() => {
    if (activeProjects.length === 0) return 0;
    const total = activeProjects.reduce((sum, p) => sum + getChecklistPct(p), 0);
    return Math.round(total / activeProjects.length);
  }, [activeProjects]);

  // ── Chart data ──────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    return activeProjects.slice(0, 12).map(p => ({
      name: p.name.length > 35 ? p.name.slice(0, 35) + '...' : p.name,
      completion: getChecklistPct(p),
      id: p.id,
    }));
  }, [activeProjects]);

  // ── Filtered & sorted table data ────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.clientName || p.client || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter(p => (p.status ?? 'estimate') === statusFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'progress') cmp = getChecklistPct(a) - getChecklistPct(b);
      else if (sortKey === 'budget') cmp = (a.budget || 0) - (b.budget || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [projects, search, statusFilter, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (isLoading && projects.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="skeleton-shimmer rounded-lg h-24 w-full max-w-3xl mx-auto mb-4" />
        <div className="skeleton-shimmer rounded-lg h-64 w-full max-w-3xl mx-auto mb-4" />
        <div className="skeleton-shimmer rounded-lg h-48 w-full max-w-3xl mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HubHeader />

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Active Projects"
          value={activeProjects.length}
          subtext={`of ${projects.length} total`}
          icon={<TrendingUp size={20} />}
          iconVariant="green"
        />
        <KPICard
          label="Completed This Month"
          value={completedThisMonth}
          icon={<Calendar size={20} />}
          iconVariant="blue"
        />
        <KPICard
          label="Pipeline Value"
          value={formatBudget(pipelineValue)}
          subtext="active project budgets"
          icon={<BarChart3 size={20} />}
          iconVariant="orange"
        />
        <KPICard
          label="Average Completion"
          value={`${avgCompletion}%`}
          subtext="across active projects"
          icon={<Users size={20} />}
          iconVariant="purple"
        />
      </div>

      {/* ── Visualization ──────────────────────────────────────────────────── */}
      <div className="rounded-xl p-4 bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">
              Project Progress Overview
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-primary-bg)] text-[var(--brand-primary)]">
              {activeProjects.length} active
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Chart / Map toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleView('chart')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-[var(--brand-primary-bg)] text-[var(--brand-primary)]'
                    : 'bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => toggleView('map')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors ${
                  viewMode === 'map'
                    ? 'bg-[var(--brand-primary-bg)] text-[var(--brand-primary)]'
                    : 'bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Map
              </button>
            </div>
            <button
              onClick={() => navigate('/projects/wizard')}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg cursor-pointer border-none btn-primary btn-primary-gold"
            >
              + New Project
            </button>
          </div>
        </div>

        {viewMode === 'chart' ? (
          <div className="h-[300px] md:h-[380px]" style={{ minWidth: '100px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" horizontal vertical={false} />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={220} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Completion']}
                    contentStyle={{
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-panel)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}
                    itemStyle={{ color: 'var(--text-secondary)', padding: '2px 0' }}
                    cursor={{ fill: 'var(--surface-hover)' }}
                  />
                  <Bar dataKey="completion" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.completion >= 100 ? 'var(--status-green)' : 'var(--brand-primary)'}
                        cursor="pointer"
                        onClick={() => navigate(`/projects/${entry.id}`)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-25 text-[var(--text-tertiary)]">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <p className="text-sm mb-3 text-[var(--text-tertiary)]">No active projects to chart</p>
                  <button
                    onClick={() => navigate('/projects/wizard')}
                    className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer border-none btn-primary"
                  >
                    + Create Project
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-[300px] md:h-[380px]">
            <MapWidget projects={projects} />
          </div>
        )}
      </div>

      {/* ── Projects Table ─────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
        {/* F-042: Pipeline status pills — lifecycle order + per-status counts.
            Clicking "All" clears the filter; clicking a status toggles it. */}
        <div className="flex items-center gap-1.5 p-3 flex-wrap" role="tablist" aria-label="Filter projects by status">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === ''}
            onClick={() => setStatusFilter('')}
            className="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer"
            style={{
              background: statusFilter === '' ? 'var(--brand-primary-bg)' : 'transparent',
              color: statusFilter === '' ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderColor: statusFilter === '' ? 'var(--brand-primary)' : 'var(--border-default)',
            }}
          >
            All <span className="opacity-70 ml-1">{projects.length}</span>
          </button>
          {STATUS_FILTER_OPTIONS.map((opt) => {
            const count = projects.filter((p) => (p.status ?? 'estimate') === opt.value).length;
            const selected = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setStatusFilter(selected ? '' : opt.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer"
                style={{
                  background: selected ? 'var(--brand-primary-bg)' : 'transparent',
                  color: selected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  borderColor: selected ? 'var(--brand-primary)' : 'var(--border-default)',
                }}
              >
                {opt.label} <span className="opacity-70 ml-1">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="flex items-center justify-between gap-3 px-3 pb-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="px-3 py-2 text-sm rounded-md outline-none min-w-[200px] bg-[var(--surface-bg)] border border-[var(--border-default)] text-[var(--text-primary)]"
          />
          <div className="text-xs text-[var(--text-tertiary)]">
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] cursor-pointer select-none"
                  onClick={() => handleSort('name')}
                >
                  Project {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)]">Client</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)]">Status</th>
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] cursor-pointer select-none"
                  onClick={() => handleSort('progress')}
                >
                  Progress {sortKey === 'progress' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] cursor-pointer select-none hidden md:table-cell"
                  onClick={() => handleSort('budget')}
                >
                  Budget {sortKey === 'budget' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-default)] hidden lg:table-cell">Crew</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-tertiary)]">
                    {projects.length === 0 ? 'No projects yet. Create your first project to get started.' : 'No projects match your search.'}
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => {
                  const pct = getChecklistPct(project);
                  const status = getStatusBadge(project);
                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="border-b border-[var(--border-light)] cursor-pointer transition-colors duration-100 hover:bg-[var(--surface-hover)]"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-[var(--text-primary)]">{project.name}</div>
                        <div className="text-xs mt-0.5 truncate max-w-[320px] text-[var(--text-tertiary)]">{project.address}</div>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)]">
                        {project.clientName || project.client || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-hover)] max-w-[80px]">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? 'var(--status-green)' : 'var(--brand-primary)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-[var(--text-secondary)]">
                        {formatBudget(project.budget)}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-[var(--text-secondary)]">
                        {project.crewCount || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
