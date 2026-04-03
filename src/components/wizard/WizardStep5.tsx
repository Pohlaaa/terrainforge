import React, { useMemo, useEffect, useRef } from 'react';
import type { WizardData } from '@/pages/ProjectWizard';
import { useOrgStore } from '@/stores/orgStore';
import type { AIRecommendationSet } from '@/types';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
}

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

const DEFAULT_HOURLY_RATE = 35;

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const WizardStep5: React.FC<Props> = ({ data, onChange, recommendations }) => {
  // Track whether user has manually edited certain fields
  const laborManuallyEdited = useRef(false);
  const quoteManuallyEdited = useRef(false);
  const equipmentCostManuallyEdited = useRef(false);
  const aiBudgetApplied = useRef(false);

  // ── Auto-calculated values from earlier steps ──────────────────────────────

  // Labor: total task hours × hourly rate (crew count affects timeline, not cost)
  const taskHoursSum = useMemo(
    () => data.tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0),
    [data.tasks]
  );

  const crewCount = data.crewSelections?.length ?? 1;

  const org = useOrgStore((s) => s.org);
  const orgLaborRate = org?.defaultLaborRate ?? null;
  const effectiveRate = orgLaborRate ?? DEFAULT_HOURLY_RATE;

  const calcLabor = useMemo(() => {
    return taskHoursSum * effectiveRate;
  }, [taskHoursSum, effectiveRate]);

  const calendarDays = crewCount > 0
    ? Math.ceil(taskHoursSum / (8 * crewCount))
    : Math.ceil(taskHoursSum / 8);

  // Equipment: sum of (hours × hourly rate), fallback to org default rate
  const orgEquipmentRate = org?.defaultEquipmentRate ?? 0;

  const calcEquipment = useMemo(
    () => data.equipmentSelections.reduce((sum, e) => {
      const hourlyRate = (e.hourlyCost ?? 0) > 0 ? e.hourlyCost! : orgEquipmentRate;
      const hours = e.estimatedHours ?? (e.durationDays * 8);
      return sum + hourlyRate * hours;
    }, 0),
    [data.equipmentSelections, orgEquipmentRate]
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

  // Pre-populate from AI budget recommendations on mount
  useEffect(() => {
    if (aiBudgetApplied.current) return;
    const aiBudget = recommendations?.budget;
    if (aiBudget) {
      aiBudgetApplied.current = true;
      const updates: Partial<WizardData> = {};
      if (data.laborBudget == null && aiBudget.laborBudget > 0) updates.laborBudget = aiBudget.laborBudget;
      if (data.materialsBudget == null && aiBudget.materialsBudget > 0) updates.materialsBudget = aiBudget.materialsBudget;
      if (data.equipmentBudget == null && aiBudget.equipmentBudget > 0) updates.equipmentBudget = aiBudget.equipmentBudget;
      if (data.disposalCost == null && aiBudget.disposalCost > 0) updates.disposalCost = aiBudget.disposalCost;
      if (data.subcontractorBudget == null && aiBudget.subcontractorBudget > 0) updates.subcontractorBudget = aiBudget.subcontractorBudget;
      if (data.overheadPct == null) updates.overheadPct = aiBudget.overheadPct;
      if (data.estimatedHours == null && aiBudget.estimatedHours > 0) updates.estimatedHours = aiBudget.estimatedHours;
      if (Object.keys(updates).length > 0) onChange(updates);
      return;
    }
    // Fallback: pre-populate from earlier steps
    const updates: Partial<WizardData> = {};
    if (data.laborBudget == null && calcLabor > 0) updates.laborBudget = calcLabor;
    if (data.equipmentCost == null && calcEquipment > 0) updates.equipmentCost = calcEquipment;
    if (data.subcontractorBudget == null && calcSubs > 0) updates.subcontractorBudget = calcSubs;
    if (data.estimatedHours == null && taskHoursSum > 0) updates.estimatedHours = taskHoursSum;
    if (Object.keys(updates).length > 0) onChange(updates);
  }, []); // only on mount

  // Auto-calc labor cost when estimated hours change (unless manually overridden)
  useEffect(() => {
    if (
      data.estimatedHours &&
      data.estimatedHours > 0 &&
      !laborManuallyEdited.current
    ) {
      onChange({ laborBudget: data.estimatedHours * effectiveRate });
    }
  }, [data.estimatedHours, effectiveRate]);

  // Auto-calc equipment cost from equipment selections (unless manually overridden)
  useEffect(() => {
    if (calcEquipment > 0 && !equipmentCostManuallyEdited.current) {
      onChange({ equipmentCost: calcEquipment });
    }
  }, [calcEquipment]);

  // Auto-calculate client quote from overhead % (unless manually overridden)
  useEffect(() => {
    if (quoteManuallyEdited.current) return;
    const labor = data.laborBudget ?? 0;
    const materials = data.materialsBudget ?? 0;
    const equipment = data.equipmentBudget ?? 0;
    const subs = data.subcontractorBudget ?? 0;
    const disposal = data.disposalCost ?? 0;
    const equipCost = data.equipmentCost ?? 0;
    const permits = Object.values(data.permitFees).reduce((s, v) => s + v, 0);
    const directCosts = labor + materials + equipment + subs + disposal + equipCost + permits;
    const overheadPct = data.overheadPct ?? 10;
    const estimatedQuote = directCosts + directCosts * (overheadPct / 100);
    if (estimatedQuote > 0) {
      onChange({ clientQuote: Math.round(estimatedQuote) });
    }
  }, [data.laborBudget, data.materialsBudget, data.equipmentBudget, data.subcontractorBudget, data.disposalCost, data.equipmentCost, data.overheadPct, data.permitFees]);

  // Org disposal rates
  const disposalRates = org?.disposalRates ?? {};
  const hasDisposalRates = Object.keys(disposalRates).length > 0;

  // Computed financials — overhead % drives the quote
  const financials = useMemo(() => {
    const labor = data.laborBudget ?? 0;
    const materials = data.materialsBudget ?? 0;
    const equipment = data.equipmentBudget ?? 0;
    const subs = data.subcontractorBudget ?? 0;
    const disposal = data.disposalCost ?? 0;
    const equipCost = data.equipmentCost ?? 0;
    const permits = totalPermitFees;
    const directCosts = labor + materials + equipment + subs + disposal + equipCost + permits;
    const overheadPct = data.overheadPct ?? 10;
    const overheadAmount = directCosts * (overheadPct / 100);
    const quote = data.clientQuote ?? 0;
    const profit = quote - directCosts;
    const profitMargin = quote > 0 ? (profit / quote) * 100 : 0;

    return { directCosts, overheadAmount, quote, profit, profitMargin, permits };
  }, [data.laborBudget, data.materialsBudget, data.equipmentBudget, data.subcontractorBudget, data.disposalCost, data.equipmentCost, data.overheadPct, data.clientQuote, totalPermitFees]);

  // Margin color: green (>=20%), amber (10-20%), red (<10%)
  const marginColor = financials.profitMargin >= 20
    ? 'var(--status-green)'
    : financials.profitMargin >= 10
      ? 'var(--status-amber)'
      : 'var(--status-red)';

  return (
    <div className="space-y-[24px]">
      {/* Estimated Hours (kept in budget section) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
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

      {/* AI Budget Reasoning */}
      {recommendations?.budget?.reasoning && (
        <div
          className="rounded-[8px] border px-[14px] py-[10px] text-[12px]"
          style={{ backgroundColor: 'rgba(45,106,79,0.06)', borderColor: 'var(--green)', color: 'var(--green-l)' }}
        >
          <div className="flex items-center gap-[6px] mb-[4px]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L8.5 4.5L12.5 5L9.5 7.5L10.5 11.5L7 9.5L3.5 11.5L4.5 7.5L1.5 5L5.5 4.5L7 1Z" fill="currentColor" />
            </svg>
            <span className="font-[600]">AI Budget Estimate</span>
          </div>
          <p>{recommendations.budget.reasoning}</p>
          {recommendations.budget.clientQuoteRange.low > 0 && (
            <p className="mt-[4px] font-[500]">
              Suggested quote: ${recommendations.budget.clientQuoteRange.low.toLocaleString()} – ${recommendations.budget.clientQuoteRange.high.toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* AI Materials Summary */}
      {recommendations?.materials && recommendations.materials.length > 0 && (
        <div
          className="rounded-[8px] border px-[14px] py-[10px] text-[12px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <h4 className="text-[13px] font-[600] text-[var(--text-2)] mb-[6px]">
            AI Suggested Materials
          </h4>
          <div className="space-y-[4px]">
            {recommendations.materials.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-[var(--text-3)]">
                <span>
                  {m.materialName}
                  {!m.inLibrary && (
                    <span className="text-[10px] text-[var(--text-4)] ml-[6px]">(not in library)</span>
                  )}
                </span>
                <span className="text-[var(--text-2)]">
                  {m.estimatedQuantity} {m.unit} × ${m.unitCost} = ${(m.estimatedQuantity * m.unitCost).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Cost Breakdown
        </h3>
        <p className="text-[12px] text-[var(--text-4)] mb-[16px]">
          {recommendations?.budget ? 'Pre-populated from AI recommendations. All values are editable.' : 'Pre-populated from earlier steps. All values are editable.'}
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
              onChange={(e) => {
                laborManuallyEdited.current = true;
                onChange({ laborBudget: e.target.value ? parseFloat(e.target.value) : null });
              }}
            />
            {taskHoursSum > 0 && (
              <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
                {taskHoursSum} task hours × ${effectiveRate}/hr = {fmt(calcLabor)}
                {crewCount > 1 && ` · ${crewCount} crew × ${calendarDays} days`}
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
            <label className={labelClass}>Equipment Budget</label>
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
            <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
              Planned equipment allocation (rental, fuel, etc.)
            </p>
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
          <div>
            <label className={labelClass}>Disposal Cost</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={data.disposalCost ?? ''}
              onChange={(e) =>
                onChange({ disposalCost: e.target.value ? parseFloat(e.target.value) : null })
              }
            />
            {/* Org disposal rates reference */}
            {hasDisposalRates && (
              <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
                Org disposal rates: {Object.entries(disposalRates).map(([k, v]) => `${k} $${v}/load`).join(', ')}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Equipment Cost</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={data.equipmentCost ?? ''}
              onChange={(e) => {
                equipmentCostManuallyEdited.current = true;
                onChange({ equipmentCost: e.target.value ? parseFloat(e.target.value) : null });
              }}
            />
            {data.equipmentSelections.length > 0 && (
              <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
                {data.equipmentSelections.map((e) => {
                  const hr = (e.hourlyCost ?? 0) > 0 ? e.hourlyCost! : orgEquipmentRate;
                  const hrs = e.estimatedHours ?? (e.durationDays * 8);
                  return `${e.name} ${hrs}h × $${hr}/hr`;
                }).join(', ')} = {fmt(calcEquipment)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overhead + Quote */}
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
            onChange={(e) => {
              quoteManuallyEdited.current = false;
              onChange({ overheadPct: e.target.value ? parseFloat(e.target.value) : null });
            }}
          />
          <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
            Drives the client quote. Overhead = {fmt(financials.overheadAmount)}
          </p>
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
            onChange={(e) => {
              quoteManuallyEdited.current = true;
              onChange({ clientQuote: e.target.value ? parseFloat(e.target.value) : null });
            }}
          />
          <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
            {quoteManuallyEdited.current ? 'Manually set — change overhead % to reset' : 'Auto-calculated from direct costs + overhead'}
          </p>
          {recommendations?.budget?.clientQuoteRange && recommendations.budget.clientQuoteRange.low > 0 && (
            <p className="text-[11px] text-[var(--green-l)] mt-[2px]">
              AI suggests ${recommendations.budget.clientQuoteRange.low.toLocaleString()} – ${recommendations.budget.clientQuoteRange.high.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div
        className="rounded-[10px] border p-[20px]"
        style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <h4 className="text-[14px] font-[600] text-[var(--text)] mb-[14px]">
          Cost Breakdown
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
          {(data.disposalCost ?? 0) > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-2)]">Disposal</span>
              <span className="text-[var(--text)] font-[500]">{fmt(data.disposalCost)}</span>
            </div>
          )}
          {(data.equipmentCost ?? 0) > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-2)]">Equipment Cost</span>
              <span className="text-[var(--text)] font-[500]">{fmt(data.equipmentCost)}</span>
            </div>
          )}
          {financials.permits > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-2)]">Permit Fees</span>
              <span className="text-[var(--text)] font-[500]">{fmt(financials.permits)}</span>
            </div>
          )}
          <div
            className="flex justify-between text-[13px] pt-[8px] border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[var(--text)] font-[600]">Direct Costs</span>
            <span className="text-[var(--text)] font-[600]">{fmt(financials.directCosts)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-2)]">Overhead ({data.overheadPct ?? 10}%)</span>
            <span className="text-[var(--text)] font-[500]">{fmt(financials.overheadAmount)}</span>
          </div>

          <div
            className="flex justify-between text-[14px] pt-[8px] border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[var(--text)] font-[600]">Estimated Quote</span>
            <span className="text-[var(--text)] font-[600]">{fmt(data.clientQuote)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="font-[600]" style={{ color: marginColor }}>
              Profit Margin
            </span>
            <span className="font-[700]" style={{ color: marginColor }}>
              {fmt(financials.profit)} ({financials.profitMargin.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Margin guidance */}
        {(data.clientQuote ?? 0) > 0 && (
          <div
            className="mt-[14px] rounded-[6px] px-[12px] py-[8px] text-[12px]"
            style={{
              backgroundColor:
                financials.profitMargin >= 20
                  ? 'rgba(22,163,74,0.1)'
                  : financials.profitMargin >= 10
                    ? 'rgba(212,164,76,0.1)'
                    : 'rgba(224,92,92,0.1)',
              color: marginColor,
            }}
          >
            {financials.profitMargin >= 20
              ? 'Healthy margin. Most landscaping contractors target 20-40%.'
              : financials.profitMargin >= 10
                ? 'Moderate margin. Consider reviewing material costs or adjusting the quote.'
                : financials.profitMargin >= 0
                  ? 'Low margin. Review your costs — labor or materials may be too high for this quote.'
                  : 'Negative margin — you would lose money at this quote. Increase the quote or reduce costs.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default WizardStep5;
