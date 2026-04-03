import React, { useMemo, useState } from 'react';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit } from '@/types';
import { useProjectStore } from '@/stores/projectStore';

interface Props {
  project: Project;
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  onProjectUpdated?: (updates: Partial<Project>) => void;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';
const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[13px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

interface EditState {
  clientQuote: number;
  overheadPct: number;
  laborBudget: number;
  materialsBudget: number;
  equipmentBudget: number;
}

export const ProjectDashboardBudget: React.FC<Props> = ({
  project,
  tasks,
  subcontractors,
  permits,
  onProjectUpdated,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<EditState>({
    clientQuote: 0,
    overheadPct: 0,
    laborBudget: 0,
    materialsBudget: 0,
    equipmentBudget: 0,
  });

  const startEditing = () => {
    setEditValues({
      clientQuote: project.clientQuote ?? project.budget ?? 0,
      overheadPct: project.overheadPct ?? 10,
      laborBudget: project.laborBudget ?? 0,
      materialsBudget: project.materialsBudget ?? 0,
      equipmentBudget: project.equipmentBudget ?? 0,
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveEdits = async () => {
    setSaving(true);
    const updates: Partial<Project> = {
      clientQuote: editValues.clientQuote || null,
      overheadPct: editValues.overheadPct,
      laborBudget: editValues.laborBudget || null,
      materialsBudget: editValues.materialsBudget || null,
      equipmentBudget: editValues.equipmentBudget || null,
    };
    await useProjectStore.getState().updateProject(project.id, updates);
    setSaving(false);
    onProjectUpdated?.(updates);
    setEditing(false);
  };

  const setField = (field: keyof EditState, value: string) => {
    const num = parseFloat(value) || 0;
    setEditValues((prev) => ({ ...prev, [field]: num }));
  };

  // Use edit values when editing, project values otherwise
  const labor = editing ? editValues.laborBudget : (project.laborBudget ?? 0);
  const materials = editing ? editValues.materialsBudget : (project.materialsBudget ?? 0);
  const equipment = editing ? editValues.equipmentBudget : (project.equipmentBudget ?? 0);
  const overheadPct = editing ? editValues.overheadPct : (project.overheadPct ?? 10);
  const quote = editing ? editValues.clientQuote : (project.clientQuote ?? project.budget ?? 0);

  const financials = useMemo(() => {
    const subs = project.subcontractorBudget ?? 0;
    const permitFees = permits.reduce((sum, p) => sum + (p.fee ?? 0), 0);
    const subtotal = labor + materials + equipment + subs + permitFees;
    const overhead = subtotal * (overheadPct / 100);
    const totalCost = subtotal + overhead;
    const profit = quote - totalCost;
    const marginPct = quote > 0 ? (profit / quote) * 100 : 0;

    return { labor, materials, equipment, subs, permitFees, subtotal, overhead, overheadPct, totalCost, quote, profit, marginPct };
  }, [labor, materials, equipment, overheadPct, quote, project.subcontractorBudget, permits]);

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);

  const marginColor =
    financials.profit > 0 ? 'var(--status-green)' : financials.profit < 0 ? 'var(--status-red)' : 'var(--text-3)';

  const costItems = [
    { label: 'Labor', value: financials.labor, color: '#2D6A4F' },
    { label: 'Materials', value: financials.materials, color: '#52B788' },
    { label: 'Equipment', value: financials.equipment, color: '#74C69D' },
    { label: 'Subcontractors', value: financials.subs, color: '#95D5B2' },
    { label: 'Permit Fees', value: financials.permitFees, color: '#B7E4C7' },
    { label: 'Overhead', value: financials.overhead, color: '#D8F3DC' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-[16px]">
      {/* Edit button */}
      <div className="flex justify-end">
        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] border text-[12px] font-[500] cursor-pointer bg-transparent transition-colors hover:bg-[var(--surface3)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Budget
          </button>
        ) : (
          <div className="flex gap-[8px]">
            <button
              type="button"
              onClick={cancelEditing}
              className="px-[12px] py-[6px] rounded-[6px] border text-[12px] font-[500] cursor-pointer bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdits}
              disabled={saving}
              className="px-[12px] py-[6px] rounded-[6px] text-[12px] font-[600] cursor-pointer border-none"
              style={{ backgroundColor: 'var(--green)', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* ── Top KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Total Cost</div>
          <div className="text-[20px] font-[700] text-[var(--text)]">{fmtShort(financials.totalCost)}</div>
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Client Quote</div>
          {editing ? (
            <input
              type="number"
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
              value={editValues.clientQuote || ''}
              onChange={(e) => setField('clientQuote', e.target.value)}
              placeholder="0"
            />
          ) : (
            <div className="text-[20px] font-[700] text-[var(--text)]">{fmtShort(financials.quote)}</div>
          )}
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Profit</div>
          <div className="text-[20px] font-[700]" style={{ color: marginColor }}>{fmtShort(financials.profit)}</div>
        </div>
        <div
          className="rounded-[8px] border p-[14px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Margin</div>
          <div className="text-[20px] font-[700]" style={{ color: marginColor }}>
            {financials.quote > 0 ? `${financials.marginPct.toFixed(1)}%` : '—'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[16px] items-start">
        {/* ── Cost Breakdown ───────────────────────────────────────────────────── */}
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Cost Breakdown</div>
          <div className="space-y-[10px]">
            {/* Labor */}
            <div>
              <div className="flex justify-between items-center text-[13px] mb-[2px]">
                <span className="text-[var(--text)]">Labor</span>
                {editing ? (
                  <input
                    type="number"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)', width: '120px' }}
                    value={editValues.laborBudget || ''}
                    onChange={(e) => setField('laborBudget', e.target.value)}
                    placeholder="0"
                  />
                ) : (
                  <span className="text-[var(--text)] font-[600]">{fmt(financials.labor)}</span>
                )}
              </div>
              {totalHours > 0 && (
                <div className="text-[11px] text-[var(--text-4)]">
                  {totalHours}h estimated across {tasks.length} tasks
                </div>
              )}
            </div>

            {/* Materials */}
            <div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-[var(--text)]">Materials</span>
                {editing ? (
                  <input
                    type="number"
                    className={inputClass}
                    style={{ borderColor: 'var(--border)', width: '120px' }}
                    value={editValues.materialsBudget || ''}
                    onChange={(e) => setField('materialsBudget', e.target.value)}
                    placeholder="0"
                  />
                ) : (
                  <span className="text-[var(--text)] font-[600]">{fmt(financials.materials)}</span>
                )}
              </div>
              {!editing && financials.materials === 0 && (
                <div className="text-[11px] text-[var(--text-4)]">
                  Add materials via zones to track costs
                </div>
              )}
            </div>

            {/* Equipment */}
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--text)]">Equipment</span>
              {editing ? (
                <input
                  type="number"
                  className={inputClass}
                  style={{ borderColor: 'var(--border)', width: '120px' }}
                  value={editValues.equipmentBudget || ''}
                  onChange={(e) => setField('equipmentBudget', e.target.value)}
                  placeholder="0"
                />
              ) : (
                <span className="text-[var(--text)] font-[600]">{fmt(financials.equipment)}</span>
              )}
            </div>

            {/* Subcontractors */}
            <div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text)]">Subcontractors</span>
                <span className="text-[var(--text)] font-[600]">{fmt(financials.subs)}</span>
              </div>
              {subcontractors.length > 0 && (
                <div className="text-[11px] text-[var(--text-4)]">
                  {subcontractors.length} sub{subcontractors.length > 1 ? 's' : ''}: {subcontractors.map((s) => s.companyName).join(', ')}
                </div>
              )}
            </div>

            {/* Permit Fees */}
            {financials.permitFees > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text)]">Permit Fees</span>
                <span className="text-[var(--text)] font-[600]">{fmt(financials.permitFees)}</span>
              </div>
            )}

            {/* Subtotal line */}
            <div
              className="flex justify-between text-[13px] pt-[8px] border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-[var(--text-2)]">Direct Costs</span>
              <span className="text-[var(--text)] font-[500]">{fmt(financials.subtotal)}</span>
            </div>

            {/* Overhead */}
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-[var(--text-2)]">
                Overhead{' '}
                {editing ? (
                  <span className="inline-flex items-center gap-[2px]">
                    (
                    <input
                      type="number"
                      className={inputClass}
                      style={{ borderColor: 'var(--border)', width: '50px', display: 'inline' }}
                      value={editValues.overheadPct || ''}
                      onChange={(e) => setField('overheadPct', e.target.value)}
                      min={0}
                      max={100}
                      placeholder="10"
                    />
                    %)
                  </span>
                ) : (
                  `(${financials.overheadPct}%)`
                )}
              </span>
              <span className="text-[var(--text)] font-[500]">{fmt(financials.overhead)}</span>
            </div>

            {/* Total */}
            <div
              className="flex justify-between text-[14px] font-[700] pt-[8px] border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-[var(--text)]">Total Project Cost</span>
              <span className="text-[var(--text)]">{fmt(financials.totalCost)}</span>
            </div>
          </div>
        </div>

        {/* ── Right column: Quote & Margin ─────────────────────────────────────── */}
        <div className="space-y-[12px]">
          {/* Quote vs Cost visual */}
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Quote vs Cost</div>

            {/* Bar comparison */}
            <div className="space-y-[8px] mb-[16px]">
              <div>
                <div className="flex justify-between text-[11px] mb-[3px]">
                  <span className="text-[var(--text-3)]">Cost</span>
                  <span className="text-[var(--text)]">{fmtShort(financials.totalCost)}</span>
                </div>
                <div className="h-[10px] rounded-[5px] bg-[var(--surface3)]">
                  <div
                    className="h-full rounded-[5px]"
                    style={{
                      width: `${financials.quote > 0 ? Math.min((financials.totalCost / financials.quote) * 100, 100) : 0}%`,
                      backgroundColor: 'var(--status-amber)',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-[3px]">
                  <span className="text-[var(--text-3)]">Quote</span>
                  <span className="text-[var(--text)]">{fmtShort(financials.quote)}</span>
                </div>
                <div className="h-[10px] rounded-[5px] bg-[var(--surface3)]">
                  <div
                    className="h-full rounded-[5px]"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--green)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Margin guidance */}
            {financials.quote > 0 && (
              <div
                className="rounded-[6px] px-[12px] py-[8px] text-[12px]"
                style={{
                  backgroundColor:
                    financials.marginPct >= 25
                      ? 'rgba(22,163,74,0.1)'
                      : financials.marginPct >= 15
                        ? 'rgba(212,164,76,0.1)'
                        : 'rgba(224,92,92,0.1)',
                  color:
                    financials.marginPct >= 25
                      ? 'var(--status-green)'
                      : financials.marginPct >= 15
                        ? 'var(--status-amber)'
                        : 'var(--status-red)',
                }}
              >
                {financials.marginPct >= 25
                  ? 'Healthy margin (25%+ target).'
                  : financials.marginPct >= 15
                    ? 'Moderate margin. Review costs.'
                    : financials.marginPct >= 0
                      ? 'Low margin. Consider adjusting.'
                      : 'Negative margin — losing money.'}
              </div>
            )}
          </div>

          {/* Cost distribution */}
          {costItems.length > 0 && (
            <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
              <div className={cardHead}>Cost Distribution</div>
              <div className="space-y-[6px]">
                {costItems.map((item) => {
                  const pct = financials.totalCost > 0 ? (item.value / financials.totalCost) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-[11px] mb-[2px]">
                        <span className="text-[var(--text-2)]">{item.label}</span>
                        <span className="text-[var(--text-3)]">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-[6px] rounded-[3px] bg-[var(--surface3)]">
                        <div
                          className="h-full rounded-[3px]"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
