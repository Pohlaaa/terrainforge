import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useMaterialStore } from '@/stores/materialStore';
import { KPICard } from '@/components/shared/KPICard';
import { Badge } from '@/components/shared/Badge';
import { MapWidget } from '@/components/dashboard/widgets/MapWidget';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ProjectListItem } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getChecklistPct(project: ProjectListItem): number {
  if (!project.checklist) return 0;
  const checks = Object.values(project.checklist);
  if (checks.length === 0) return 0;
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getStatusBadge(project: ProjectListItem): { label: string; variant: 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal' } {
  const pct = getChecklistPct(project);
  if (pct >= 100) return { label: 'Completed', variant: 'green' };
  if (pct > 0) return { label: 'In Progress', variant: 'blue' };
  return { label: 'Planning', variant: 'amber' };
}

function formatBudget(value: number | undefined | null): string {
  if (!value) return '$0';
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'planning', label: 'Planning' },
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
    return projects.filter(p => getChecklistPct(p) < 100);
  }, [projects]);

  const completedThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return projects.filter(p => getChecklistPct(p) >= 100).length; // simplified — no completedAt field
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
      name: p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name,
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
      result = result.filter(p => {
        const pct = getChecklistPct(p);
        if (statusFilter === 'completed') return pct >= 100;
        if (statusFilter === 'active') return pct > 0 && pct < 100;
        if (statusFilter === 'planning') return pct === 0;
        return true;
      });
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
      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Active Projects</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{activeProjects.length}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>of {projects.length} total</div>
        </div>
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Completed This Month</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{completedThisMonth}</div>
        </div>
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Pipeline Value</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{formatBudget(pipelineValue)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>active project budgets</div>
        </div>
        <div className="kpi-card-accent rounded-lg p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Average Completion</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{avgCompletion}%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>across active projects</div>
        </div>
      </div>

      {/* ── Visualization ──────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {/* Chart / Map toggle */}
            <button
              onClick={() => toggleView('chart')}
              className="px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors"
              style={{
                background: viewMode === 'chart' ? 'var(--brand-primary-bg)' : 'transparent',
                color: viewMode === 'chart' ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              }}
            >
              Chart
            </button>
            <button
              onClick={() => toggleView('map')}
              className="px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer border-none transition-colors"
              style={{
                background: viewMode === 'map' ? 'var(--brand-primary-bg)' : 'transparent',
                color: viewMode === 'map' ? 'var(--brand-primary)' : 'var(--text-tertiary)',
              }}
            >
              Map
            </button>
          </div>
          <button
            onClick={() => navigate('/projects/wizard')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg cursor-pointer border-none transition-colors"
            style={{ background: 'var(--brand-primary)', color: '#FFFFFF' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-primary-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand-primary)'; }}
          >
            + New Project
          </button>
        </div>

        {viewMode === 'chart' ? (
          <div style={{ height: '280px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Completion']}
                    contentStyle={{
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-panel)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
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
                  <div className="text-3xl mb-2 opacity-30">📊</div>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No active projects to chart</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ height: '280px' }}>
            <MapWidget projects={projects} />
          </div>
        )}
      </div>

      {/* ── Projects Table ─────────────────────────────────────────────────── */}
      <div
        className="rounded-xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}
      >
        {/* Search & filter bar */}
        <div className="flex items-center justify-between gap-3 p-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="px-3 py-2 text-sm rounded-md outline-none min-w-[200px]"
              style={{
                background: 'var(--surface-bg)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-md cursor-pointer outline-none"
              style={{
                background: 'var(--surface-bg)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All Status</option>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-hover)' }}>
                <th
                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => handleSort('name')}
                >
                  Project {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Client</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                <th
                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => handleSort('progress')}
                >
                  Progress {sortKey === 'progress' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none hidden md:table-cell"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => handleSort('budget')}
                >
                  Budget {sortKey === 'budget' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-tertiary)' }}>Crew</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
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
                      className="border-t cursor-pointer transition-colors duration-100"
                      style={{ borderColor: 'var(--border-default)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{project.name}</div>
                        <div className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>{project.address}</div>
                      </td>
                      <td className="px-3 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {project.clientName || project.client || '—'}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--surface-hover)', maxWidth: '80px' }}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? 'var(--status-green)' : 'var(--brand-primary)',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {formatBudget(project.budget)}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
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
