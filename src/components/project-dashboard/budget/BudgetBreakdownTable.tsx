import React from 'react';
import type { ProjectTask, ProjectSubcontractor } from '@/types';

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';
const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[13px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface Financials {
  labor: number;
  materials: number;
  equipment: number;
  equipCost: number;
  disposal: number;
  subs: number;
  permitFees: number;
  subtotal: number;
  overhead: number;
  overheadPct: number;
  totalCost: number;
  quote: number;
  profit: number;
  marginPct: number;
}

export interface EditState {
  clientQuote: number;
  overheadPct: number;
  laborBudget: number;
  materialsBudget: number;
  equipmentBudget: number;
  subcontractorBudget: number;
  disposalCost: number;
  equipmentCost: number;
}

export interface BudgetBreakdownTableProps {
  financials: Financials;
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  editing: boolean;
  editValues: EditState;
  onFieldChange: (field: keyof EditState, value: string) => void;
}

export const BudgetBreakdownTable: React.FC<BudgetBreakdownTableProps> = ({
  financials,
  tasks,
  subcontractors,
  editing,
  editValues,
  onFieldChange,
}) => {
  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);

  return (
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
                onChange={(e) => onFieldChange('laborBudget', e.target.value)}
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
                onChange={(e) => onFieldChange('materialsBudget', e.target.value)}
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

        {/* Equipment Budget */}
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-[var(--text)]">Equipment Budget</span>
          {editing ? (
            <input
              type="number"
              className={inputClass}
              style={{ borderColor: 'var(--border)', width: '120px' }}
              value={editValues.equipmentBudget || ''}
              onChange={(e) => onFieldChange('equipmentBudget', e.target.value)}
              placeholder="0"
            />
          ) : (
            <span className="text-[var(--text)] font-[600]">{fmt(financials.equipment)}</span>
          )}
        </div>

        {/* Equipment Cost */}
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-[var(--text)]">Equipment Cost</span>
          {editing ? (
            <input
              type="number"
              className={inputClass}
              style={{ borderColor: 'var(--border)', width: '120px' }}
              value={editValues.equipmentCost || ''}
              onChange={(e) => onFieldChange('equipmentCost', e.target.value)}
              placeholder="0"
            />
          ) : (
            <span className="text-[var(--text)] font-[600]">{fmt(financials.equipCost)}</span>
          )}
        </div>

        {/* Disposal Cost */}
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-[var(--text)]">Disposal Cost</span>
          {editing ? (
            <input
              type="number"
              className={inputClass}
              style={{ borderColor: 'var(--border)', width: '120px' }}
              value={editValues.disposalCost || ''}
              onChange={(e) => onFieldChange('disposalCost', e.target.value)}
              placeholder="0"
            />
          ) : (
            <span className="text-[var(--text)] font-[600]">{fmt(financials.disposal)}</span>
          )}
        </div>

        {/* Subcontractors */}
        <div>
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-[var(--text)]">Subcontractors</span>
            {editing ? (
              <input
                type="number"
                className={inputClass}
                style={{ borderColor: 'var(--border)', width: '120px' }}
                value={editValues.subcontractorBudget || ''}
                onChange={(e) => onFieldChange('subcontractorBudget', e.target.value)}
                placeholder="0"
              />
            ) : (
              <span className="text-[var(--text)] font-[600]">{fmt(financials.subs)}</span>
            )}
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
                  onChange={(e) => onFieldChange('overheadPct', e.target.value)}
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
  );
};
