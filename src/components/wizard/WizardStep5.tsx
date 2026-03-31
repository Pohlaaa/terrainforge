import React, { useMemo, useEffect } from 'react';
import type { WizardData } from '@/pages/ProjectWizard';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

const DEFAULT_HOURLY_RATE = 35;

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const WizardStep5: React.FC<Props> = ({ data, onChange }) => {
  // ── Auto-calculated values from earlier steps ──────────────────────────────

  // Labor: crew size × total task hours × hourly rate
  const taskHoursSum = useMemo(
    () => data.tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0),
    [data.tasks]
  );

  const calcLabor = useMemo(() => {
    const crew = data.crewSize ?? 1;
    // taskHoursSum is the total estimated task-hours for the whole project
    // Labor cost = total hours × rate (crew size is implicit in the hour estimates)
    return taskHoursSum * DEFAULT_HOURLY_RATE;
  }, [taskHoursSum, data.crewSize]);

  // Equipment: sum of (daily rate × duration days)
  const calcEquipment = useMemo(
    () => data.equipmentSelections.reduce((sum, e) => sum + e.dailyRate * e.durationDays, 0),
    [data.equipmentSelections]
  );

  // Subcontractors: sum of quoted costs
  const calcSubs = useMemo(
    () => data.subcontractors.reduce((sum, s) => sum + (s.quotedCost ?? 0), 0),
    [data.subcontractors]
  );

  // Permit fees from compliance step
  const totalPermitFees = useMemo(
    () => Object.values(data.permitFees).reduce((sum, v) => sum + v, 0),
    [data.permitFees]
  );

  // Pre-populate on mount if values are null (first visit to this step)
  useEffect(() => {
    const updates: Partial<WizardData> = {};
    if (data.laborBudget == null && calcLabor > 0) updates.laborBudget = calcLabor;
    if (data.equipmentBudget == null && calcEquipment > 0) updates.equipmentBudget = calcEquipment;
    if (data.subcontractorBudget == null && calcSubs > 0) updates.subcontractorBudget = calcSubs;
    if (data.estimatedHours == null && taskHoursSum > 0) updates.estimatedHours = taskHoursSum;
    if (Object.keys(updates).length > 0) onChange(updates);
  }, []); // only on mount

  // Computed financials
  const financials = useMemo(() => {
    const labor = data.laborBudget ?? 0;
    const materials = data.materialsBudget ?? 0;
    const equipment = data.equipmentBudget ?? 0;
    const subs = data.subcontractorBudget ?? 0;
    const permits = totalPermitFees;
    const subtotal = labor + materials + equipment + subs + permits;
    const overheadPct = data.overheadPct ?? 10;
    const overhead = subtotal * (overheadPct / 100);
    const totalCost = subtotal + overhead;
    const quote = data.clientQuote ?? 0;
    const profit = quote - totalCost;
    const marginPct = quote > 0 ? (profit / quote) * 100 : 0;

    return { subtotal, overhead, totalCost, profit, marginPct, permits };
  }, [data.laborBudget, data.materialsBudget, data.equipmentBudget, data.subcontractorBudget, data.overheadPct, data.clientQuote, totalPermitFees]);

  const marginColor =
    financials.profit > 0
      ? 'var(--status-green)'
      : financials.profit < 0
        ? 'var(--status-red)'
        : 'var(--text-3)';

  return (
    <div className="space-y-[24px]">
      {/* Timeline */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Timeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
          <div>
            <label className={labelClass}>Start Date</label>
            <input
              className={inputClass}
              type="date"
              value={data.startDate || ''}
              onChange={(e) => onChange({ startDate: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>Target Completion</label>
            <input
              className={inputClass}
              type="date"
              value={data.targetDate || ''}
              onChange={(e) => onChange({ targetDate: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>Estimated Total Hours</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g., 120"
              value={data.estimatedHours ?? ''}
              onChange={(e) =>
                onChange({ estimatedHours: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
            {taskHoursSum > 0 && data.estimatedHours !== taskHoursSum && (
              <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
                Task sum: {taskHoursSum}h
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Cost Breakdown
        </h3>
        <p className="text-[12px] text-[var(--text-4)] mb-[16px]">
          Pre-populated from earlier steps. All values are editable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div>
            <label className={labelClass}>Labor Cost</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={data.laborBudget ?? ''}
              onChange={(e) =>
                onChange({ laborBudget: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
            {taskHoursSum > 0 && (
              <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
                Calc: {taskHoursSum}h × ${DEFAULT_HOURLY_RATE}/hr = {fmt(calcLabor)}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Materials Cost</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={data.materialsBudget ?? ''}
              onChange={(e) =>
                onChange({ materialsBudget: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
            <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
              Add materials in the project dashboard after creation.
            </p>
          </div>
          <div>
            <label className={labelClass}>Equipment Rental</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={data.equipmentBudget ?? ''}
              onChange={(e) =>
                onChange({ equipmentBudget: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
            {data.equipmentSelections.length > 0 && (
              <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
                Calc: {data.equipmentSelections.map((e) =>
                  `${e.name} ${e.durationDays}d${e.dailyRate > 0 ? ` × $${e.dailyRate}` : ' (Rate TBD)'}`
                ).join(', ')} = {fmt(calcEquipment)}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Subcontractor Costs</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={data.subcontractorBudget ?? ''}
              onChange={(e) =>
                onChange({ subcontractorBudget: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
            {data.subcontractors.length > 0 && calcSubs > 0 && (
              <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
                From {data.subcontractors.length} sub{data.subcontractors.length > 1 ? 's' : ''}: {fmt(calcSubs)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overhead */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        <div>
          <label className={labelClass}>Overhead / Markup %</label>
          <input
            className={inputClass}
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder="10"
            value={data.overheadPct ?? ''}
            onChange={(e) =>
              onChange({ overheadPct: e.target.value ? parseFloat(e.target.value) : null })
            }
          />
        </div>
        <div>
          <label className={labelClass}>Client Quote</label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={data.clientQuote ?? ''}
            onChange={(e) =>
              onChange({ clientQuote: e.target.value ? parseFloat(e.target.value) : null })
            }
          />
          <p className="text-[11px] text-[var(--text-4)] mt-[4px]">What you're charging the client</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div
        className="rounded-[10px] border p-[20px]"
        style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <h4 className="text-[14px] font-[600] text-[var(--text)] mb-[14px]">
          Financial Summary
        </h4>
        <div className="space-y-[8px]">
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-2)]">Labor</span>
            <span className="text-[var(--text)] font-[500]">{fmt(data.laborBudget)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-2)]">Materials</span>
            <span className="text-[var(--text)] font-[500]">{fmt(data.materialsBudget)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-2)]">Equipment</span>
            <span className="text-[var(--text)] font-[500]">{fmt(data.equipmentBudget)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-2)]">Subcontractors</span>
            <span className="text-[var(--text)] font-[500]">{fmt(data.subcontractorBudget)}</span>
          </div>
          {financials.permits > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-2)]">Permit Fees</span>
              <span className="text-[var(--text)] font-[500]">{fmt(financials.permits)}</span>
            </div>
          )}
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-2)]">Overhead ({data.overheadPct ?? 10}%)</span>
            <span className="text-[var(--text)] font-[500]">{fmt(financials.overhead)}</span>
          </div>
          <div
            className="flex justify-between text-[13px] pt-[8px] border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[var(--text)] font-[600]">Total Project Cost</span>
            <span className="text-[var(--text)] font-[600]">{fmt(financials.totalCost)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-2)]">Client Quote</span>
            <span className="text-[var(--text)] font-[500]">{fmt(data.clientQuote)}</span>
          </div>
          <div
            className="flex justify-between text-[14px] pt-[8px] border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="font-[600]" style={{ color: marginColor }}>
              Profit
            </span>
            <span className="font-[700]" style={{ color: marginColor }}>
              {fmt(financials.profit)} ({financials.marginPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Margin guidance */}
        {(data.clientQuote ?? 0) > 0 && (
          <div
            className="mt-[14px] rounded-[6px] px-[12px] py-[8px] text-[12px]"
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
              ? 'Healthy margin. Most landscaping contractors target 25-40%.'
              : financials.marginPct >= 15
                ? 'Moderate margin. Consider reviewing material costs or adjusting the quote.'
                : financials.marginPct >= 0
                  ? 'Low margin. Review your costs — labor or materials may be too high for this quote.'
                  : 'Negative margin — you would lose money at this quote. Increase the quote or reduce costs.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardStep5;
