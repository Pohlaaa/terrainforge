import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { KPICard } from '@/components/shared/KPICard';
import { Badge } from '@/components/shared/Badge';
import { toast } from '@/hooks/useToast';
import type { Project, ProjectListItem } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getProjectExpenses(p: Project): number {
  return (
    (p.laborBudget ?? 0) +
    (p.materialsBudget ?? 0) +
    (p.equipmentBudget ?? 0) +
    (p.subcontractorBudget ?? 0) +
    (p.disposalCost ?? 0) +
    (p.equipmentCost ?? 0)
  );
}

function getChecklistCompletion(p: Project): number {
  const c = p.checklist;
  if (!c) return 0;
  const keys = Object.keys(c) as (keyof typeof c)[];
  const done = keys.filter((k) => c[k]).length;
  return keys.length > 0 ? Math.round((done / keys.length) * 100) : 0;
}

function getProjectStatus(p: Project): { label: string; variant: 'green' | 'blue' | 'red' | 'purple' | 'amber' } {
  const now = new Date();
  const start = p.startDate ? new Date(p.startDate) : null;
  const target = p.targetDate ? new Date(p.targetDate) : null;
  if (!start) return { label: 'Planning', variant: 'purple' };
  if (start > now) return { label: 'Scheduled', variant: 'blue' };
  if (target && target < now) return { label: 'Overdue', variant: 'red' };
  return { label: 'Active', variant: 'green' };
}

// ── Month grouping for charts ────────────────────────────────────────────────

function getLast6Months(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    months.push({ key, label });
  }
  return months;
}

function projectMonth(p: Project): string | null {
  if (!p.startDate) return null;
  const d = new Date(p.startDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Chart colors ─────────────────────────────────────────────────────────────

const EXPENSE_COLORS = [
  'var(--status-blue)',    // Labor
  'var(--status-green)',   // Materials
  'var(--status-amber)',   // Equipment
  'var(--status-gray)',    // Disposal
  'var(--brand-secondary)', // Subcontractor
];

const EXPENSE_LABELS = ['Labor', 'Materials', 'Equipment', 'Disposal', 'Subcontractor'];

// ── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'clientName' | 'budget' | 'spent' | 'remaining' | 'completion' | 'status';

// ── Component ────────────────────────────────────────────────────────────────

const BudgetHub: React.FC = () => {
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjectStore();
  const { org } = useOrgStore();
  const orgId = org?.id;

  // Rate settings state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [laborRate, setLaborRate] = useState<string>('');
  const [equipRate, setEquipRate] = useState<string>('');
  const [disposalEntries, setDisposalEntries] = useState<{ category: string; rate: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('remaining');
  const [sortAsc, setSortAsc] = useState(false);

  // Load data
  useEffect(() => {
    if (orgId) fetchProjects(orgId);
  }, [orgId, fetchProjects]);

  // Sync rate settings from org
  useEffect(() => {
    if (org) {
      setLaborRate(org.defaultLaborRate != null ? String(org.defaultLaborRate) : '');
      setEquipRate(org.defaultEquipmentRate != null ? String(org.defaultEquipmentRate) : '');
      const entries = Object.entries(org.disposalRates || {}).map(([category, rate]) => ({
        category,
        rate: String(rate),
      }));
      setDisposalEntries(entries.length > 0 ? entries : []);
    }
  }, [org]);

  // ── KPI computations ────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalExpenses = projects.reduce((sum, p) => sum + getProjectExpenses(p), 0);
    const netProfit = totalRevenue - totalExpenses;
    const outstanding = projects
      .filter((p) => getProjectStatus(p).label !== 'Completed')
      .reduce((sum, p) => sum + (p.budget || 0), 0);
    return { totalRevenue, totalExpenses, netProfit, outstanding };
  }, [projects]);

  // ── Chart data ──────────────────────────────────────────────────────────────

  const lineData = useMemo(() => {
    const months = getLast6Months();
    const monthMap: Record<string, { revenue: number; expenses: number }> = {};
    months.forEach((m) => (monthMap[m.key] = { revenue: 0, expenses: 0 }));
    projects.forEach((p) => {
      const mk = projectMonth(p);
      if (mk && monthMap[mk]) {
        monthMap[mk].revenue += p.budget || 0;
        monthMap[mk].expenses += getProjectExpenses(p);
      }
    });
    return months.map((m) => ({
      name: m.label,
      Revenue: monthMap[m.key].revenue,
      Expenses: monthMap[m.key].expenses,
    }));
  }, [projects]);

  const donutData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0]; // Labor, Materials, Equipment, Disposal, Subcontractor
    projects.forEach((p) => {
      totals[0] += p.laborBudget ?? 0;
      totals[1] += p.materialsBudget ?? 0;
      totals[2] += (p.equipmentBudget ?? 0) + (p.equipmentCost ?? 0);
      totals[3] += p.disposalCost ?? 0;
      totals[4] += p.subcontractorBudget ?? 0;
    });
    return EXPENSE_LABELS.map((label, i) => ({
      name: label,
      value: totals[i],
    })).filter((d) => d.value > 0);
  }, [projects]);

  const totalDonutExpenses = donutData.reduce((s, d) => s + d.value, 0);

  // ── Table data ──────────────────────────────────────────────────────────────

  const tableData = useMemo(() => {
    const rows = projects.map((p) => {
      const spent = getProjectExpenses(p);
      const remaining = (p.budget || 0) - spent;
      const completion = getChecklistCompletion(p);
      const status = getProjectStatus(p);
      return { ...p, spent, remaining, completion, statusInfo: status };
    });

    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'clientName': cmp = (a.clientName || '').localeCompare(b.clientName || ''); break;
        case 'budget': cmp = (a.budget || 0) - (b.budget || 0); break;
        case 'spent': cmp = a.spent - b.spent; break;
        case 'remaining': cmp = a.remaining - b.remaining; break;
        case 'completion': cmp = a.completion - b.completion; break;
        case 'status': cmp = a.statusInfo.label.localeCompare(b.statusInfo.label); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [projects, sortKey, sortAsc]);

  // ── Sort handler ────────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  // ── Save settings ───────────────────────────────────────────────────────────

  async function handleSaveSettings() {
    setSaving(true);
    const disposalRates: Record<string, number> = {};
    disposalEntries.forEach((e) => {
      if (e.category.trim()) {
        disposalRates[e.category.trim()] = parseFloat(e.rate) || 0;
      }
    });
    await useOrgStore.getState().updateOrgSettings({
      defaultLaborRate: laborRate ? parseFloat(laborRate) : null,
      defaultEquipmentRate: equipRate ? parseFloat(equipRate) : null,
      disposalRates,
    });
    setSaving(false);
    toast.success('Settings saved');
  }

  // ── Tooltip styling ─────────────────────────────────────────────────────────

  const tooltipStyle = {
    backgroundColor: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-panel)',
    color: 'var(--text-primary)',
    fontSize: '13px',
  };

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (projects.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        {/* KPI cards - empty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard label="Total Revenue" value="$0" />
          <KPICard label="Total Expenses" value="$0" />
          <KPICard label="Net Profit" value="$0" />
          <KPICard label="Outstanding" value="$0" />
        </div>
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="text-4xl mb-4" style={{ color: 'var(--text-tertiary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No project data yet
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Create a project with budget details to see financial data here.
          </p>
          <button
            onClick={() => navigate('/projects/new')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            + New Project
          </button>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={fmt(kpis.totalRevenue)} />
        <KPICard label="Total Expenses" value={fmt(kpis.totalExpenses)} />
        <KPICard
          label="Net Profit"
          value={fmt(kpis.netProfit)}
          subtitle={kpis.totalRevenue > 0
            ? `${((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1)}% margin`
            : undefined}
        />
        <KPICard label="Outstanding" value={fmt(kpis.outstanding)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Line Chart */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Revenue vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                stroke="var(--border-light)"
              />
              <YAxis
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                stroke="var(--border-light)"
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => fmt(Number(value ?? 0))}
              />
              <Line
                type="monotone"
                dataKey="Revenue"
                stroke="var(--status-green)"
                strokeWidth={2}
                dot={{ fill: 'var(--status-green)', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="Expenses"
                stroke="var(--status-red)"
                strokeWidth={2}
                dot={{ fill: 'var(--status-red)', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Donut Chart */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Expense Breakdown
          </h3>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {donutData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={EXPENSE_COLORS[EXPENSE_LABELS.indexOf(entry.name)] || EXPENSE_COLORS[0]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => fmt(Number(value ?? 0))}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string, entry: any) => {
                    const item = donutData.find((d) => d.name === value);
                    const pct = item && totalDonutExpenses > 0
                      ? ((item.value / totalDonutExpenses) * 100).toFixed(1)
                      : '0';
                    return (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {value}: {item ? fmt(item.value) : '$0'} ({pct}%)
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px]" style={{ color: 'var(--text-tertiary)' }}>
              No expense data yet
            </div>
          )}
        </div>
      </div>

      {/* Project Budgets Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Project Budgets
          </h3>
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--surface-hover)' }}>
                {([
                  ['name', 'Project'],
                  ['clientName', 'Client'],
                  ['budget', 'Total Budget'],
                  ['spent', 'Spent'],
                  ['remaining', 'Remaining'],
                  ['completion', 'Completion'],
                  ['status', 'Status'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {label}
                    {sortKey === key && (
                      <span className="ml-1">{sortAsc ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/projects/${row.id}`)}
                  className="cursor-pointer transition-colors duration-100"
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--brand-primary)' }}>
                    {row.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {row.clientName || row.client || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                    {fmt(row.budget || 0)}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                    {fmt(row.spent)}
                  </td>
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: row.remaining >= 0 ? 'var(--status-green)' : 'var(--status-red)' }}
                  >
                    {fmt(row.remaining)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-16 h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'var(--surface-hover)' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${row.completion}%`,
                            background: 'var(--status-green)',
                          }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {row.completion}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={row.statusInfo.variant}>{row.statusInfo.label}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Org Rate Settings (collapsible) */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full px-5 py-4 flex items-center gap-2 text-left"
          style={{ color: 'var(--text-primary)' }}
        >
          {settingsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="text-sm font-semibold">Default Rate Settings</span>
        </button>

        {settingsOpen && (
          <div className="px-5 pb-5 space-y-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            {/* Labor + Equipment rates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Default Labor Rate ($/hr)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                  placeholder="e.g. 75"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'var(--surface-bg)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Default Equipment Rate ($/hr)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={equipRate}
                  onChange={(e) => setEquipRate(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'var(--surface-bg)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Disposal rates */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Disposal Rates
              </label>
              <div className="space-y-2">
                {disposalEntries.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={entry.category}
                      onChange={(e) => {
                        const next = [...disposalEntries];
                        next[i] = { ...next[i], category: e.target.value };
                        setDisposalEntries(next);
                      }}
                      placeholder="Category (e.g. Brush)"
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        background: 'var(--surface-bg)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.rate}
                      onChange={(e) => {
                        const next = [...disposalEntries];
                        next[i] = { ...next[i], rate: e.target.value };
                        setDisposalEntries(next);
                      }}
                      placeholder="0"
                      className="w-28 px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        background: 'var(--surface-bg)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      onClick={() => setDisposalEntries(disposalEntries.filter((_, j) => j !== i))}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setDisposalEntries([...disposalEntries, { category: '', rate: '' }])}
                className="mt-2 flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--brand-primary)' }}
              >
                <Plus size={12} /> Add Category
              </button>
            </div>

            {/* Save button */}
            <div className="pt-2">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetHub;
