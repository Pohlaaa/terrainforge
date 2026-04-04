import React, { useMemo, useState } from 'react';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit } from '@/types';
import { useProjectStore } from '@/stores/projectStore';
import { BudgetBreakdownTable } from './budget/BudgetBreakdownTable';
import { CostSummaryCard } from './budget/CostSummaryCard';
import type { EditState } from './budget/BudgetBreakdownTable';

interface Props {
  project: Project;
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  onProjectUpdated?: (updates: Partial<Project>) => void;
}

function fmtShort(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[13px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

export const ProjectDashboardBudget: React.FC<Props> = ({
  project, tasks, subcontractors, permits, onProjectUpdated,
}) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<EditState>({
    clientQuote: 0, overheadPct: 0, laborBudget: 0, materialsBudget: 0,
    equipmentBudget: 0, subcontractorBudget: 0, disposalCost: 0, equipmentCost: 0,
  });

  const startEditing = () => {
    setEditValues({
      clientQuote: project.clientQuote ?? project.budget ?? 0,
      overheadPct: project.overheadPct ?? 10,
      laborBudget: project.laborBudget ?? 0,
      materialsBudget: project.materialsBudget ?? 0,
      equipmentBudget: project.equipmentBudget ?? 0,
      subcontractorBudget: project.subcontractorBudget ?? 0,
      disposalCost: project.disposalCost ?? 0,
      equipmentCost: project.equipmentCost ?? 0,
    });
    setEditing(true);
  };

  const cancelEditing = () => { setEditing(false); };

  const saveEdits = async () => {
    setSaving(true);
    const updates: Partial<Project> = {
      clientQuote: editValues.clientQuote || null,
      overheadPct: editValues.overheadPct,
      laborBudget: editValues.laborBudget || null,
      materialsBudget: editValues.materialsBudget || null,
      equipmentBudget: editValues.equipmentBudget || null,
      subcontractorBudget: editValues.subcontractorBudget || null,
      disposalCost: editValues.disposalCost || null,
      equipmentCost: editValues.equipmentCost || null,
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

  const labor = editing ? editValues.laborBudget : (project.laborBudget ?? 0);
  const materials = editing ? editValues.materialsBudget : (project.materialsBudget ?? 0);
  const equipment = editing ? editValues.equipmentBudget : (project.equipmentBudget ?? 0);
  const subsBudget = editing ? editValues.subcontractorBudget : (project.subcontractorBudget ?? 0);
  const disposal = editing ? editValues.disposalCost : (project.disposalCost ?? 0);
  const equipCost = editing ? editValues.equipmentCost : (project.equipmentCost ?? 0);
  const overheadPct = editing ? editValues.overheadPct : (project.overheadPct ?? 10);
  const quote = editing ? editValues.clientQuote : (project.clientQuote ?? project.budget ?? 0);

  const financials = useMemo(() => {
    const permitFees = permits.reduce((sum, p) => sum + (p.fee ?? 0), 0);
    const subtotal = labor + materials + equipment + equipCost + disposal + subsBudget + permitFees;
    const overhead = subtotal * (overheadPct / 100);
    const totalCost = subtotal + overhead;
    const profit = quote - totalCost;
    const marginPct = quote > 0 ? (profit / quote) * 100 : 0;
    return { labor, materials, equipment, equipCost, disposal, subs: subsBudget, permitFees, subtotal, overhead, overheadPct, totalCost, quote, profit, marginPct };
  }, [labor, materials, equipment, equipCost, disposal, subsBudget, overheadPct, quote, permits]);

  const marginColor = financials.profit > 0 ? 'var(--status-green)' : financials.profit < 0 ? 'var(--status-red)' : 'var(--text-3)';

  return (
    <div className="space-y-[16px]">
      {/* Edit button */}
      <div className="flex justify-end">
        {!editing ? (
          <button type="button" onClick={startEditing} className="flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] border text-[12px] font-[500] cursor-pointer bg-transparent transition-colors hover:bg-[var(--surface3)]" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit Budget
          </button>
        ) : (
          <div className="flex gap-[8px]">
            <button type="button" onClick={cancelEditing} className="px-[12px] py-[6px] rounded-[6px] border text-[12px] font-[500] cursor-pointer bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>Cancel</button>
            <button type="button" onClick={saveEdits} disabled={saving} className="px-[12px] py-[6px] rounded-[6px] text-[12px] font-[600] cursor-pointer border-none" style={{ backgroundColor: 'var(--green)', color: '#fff', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        )}
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        <div className="rounded-[8px] border p-[14px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Total Cost</div>
          <div className="text-[20px] font-[700] text-[var(--text)]">{fmtShort(financials.totalCost)}</div>
        </div>
        <div className="rounded-[8px] border p-[14px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Client Quote</div>
          {editing ? (
            <input type="number" className={inputClass} style={{ borderColor: 'var(--border)' }} value={editValues.clientQuote || ''} onChange={(e) => setField('clientQuote', e.target.value)} placeholder="0" />
          ) : (
            <div className="text-[20px] font-[700] text-[var(--text)]">{fmtShort(financials.quote)}</div>
          )}
        </div>
        <div className="rounded-[8px] border p-[14px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Profit</div>
          <div className="text-[20px] font-[700]" style={{ color: marginColor }}>{fmtShort(financials.profit)}</div>
        </div>
        <div className="rounded-[8px] border p-[14px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">Margin</div>
          <div className="text-[20px] font-[700]" style={{ color: marginColor }}>{financials.quote > 0 ? `${financials.marginPct.toFixed(1)}%` : '\u2014'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[16px] items-start">
        <BudgetBreakdownTable
          financials={financials}
          tasks={tasks}
          subcontractors={subcontractors}
          editing={editing}
          editValues={editValues}
          onFieldChange={setField}
        />
        <CostSummaryCard financials={financials} />
      </div>
    </div>
  );
};
