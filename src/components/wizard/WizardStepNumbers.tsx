/**
 * Step 4: "The Numbers" — Budget breakdown + permits.
 * Auto-fills from plan selections. Contractor can override any field.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { WizardData } from '@/pages/ProjectWizard';
import { useOrgStore } from '@/stores/orgStore';
import type { AIRecommendationSet } from '@/types';
import { NumberInput } from '@/components/ui/NumberInput';
import { computeProjectCost } from '@/lib/projectCost';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
}

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';
const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';
const DEFAULT_HOURLY_RATE = 35;

const PERMIT_OPTIONS = [
  { key: 'grading', label: 'Grading Permit' },
  { key: 'building', label: 'Building Permit' },
  { key: 'electrical', label: 'Electrical Permit' },
  { key: 'plumbing', label: 'Plumbing Permit' },
  { key: 'stormwater', label: 'Stormwater / Drainage' },
  { key: 'tree_removal', label: 'Tree Removal' },
  { key: 'fence', label: 'Fence Permit' },
  { key: 'hoa_approval', label: 'HOA Approval' },
];

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export const WizardStepNumbers: React.FC<Props> = ({ data, onChange, recommendations }) => {
  const laborEdited = useRef(false);
  const quoteEdited = useRef(false);
  const equipCostEdited = useRef(false);
  const budgetInitialized = useRef(false);

  const org = useOrgStore((s) => s.org);
  const [laborRate, setLaborRate] = useState(org?.defaultLaborRate ?? DEFAULT_HOURLY_RATE);
  const [equipRate, setEquipRate] = useState(org?.defaultEquipmentRate ?? 0);
  const [desiredMargin, setDesiredMargin] = useState(20); // 20% = green threshold
  const effectiveRate = laborRate;

  const taskHoursSum = useMemo(() => data.tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0), [data.tasks]);
  const matCostSum = useMemo(() => data.materialSelections.reduce((s, m) => s + m.quantity * m.unitCost, 0), [data.materialSelections]);
  const equipCostSum = useMemo(() => {
    return data.equipmentSelections.reduce((s, e) => {
      const rate = (e.hourlyCost ?? 0) > 0 ? e.hourlyCost! : equipRate;
      return s + rate * (e.estimatedHours ?? e.durationDays * 8);
    }, 0);
  }, [data.equipmentSelections, equipRate]);
  const subsCostSum = useMemo(() => data.subcontractors.reduce((s, sub) => s + (sub.quotedCost ?? 0), 0), [data.subcontractors]);
  const permitFeesSum = useMemo(() => Object.values(data.permitFees).reduce((s, v) => s + v, 0), [data.permitFees]);

  // F-CW-19: when AI fails (or returns empty) the wizard previously dropped
  // contractors at $0 across every budget field. Fall back to a per-sqft /
  // per-element heuristic so they have a starting point. Industry averages
  // (rough) for residential landscaping in the US Southeast as of 2025:
  //   - hardscape (patio, walkway, retaining wall, driveway, pool deck):
  //       ~$18/sqft materials + ~$15/sqft labor
  //   - softscape (sod, garden bed, mulch, gravel):
  //       ~$3/sqft materials + ~$4/sqft labor
  //   - drainage (linear): ~$25/lnft (split 60% materials, 40% labor)
  //   - point items (trees, fire pits, steps): ~$200/each (60% mat, 40% lab)
  const heuristicBudget = useMemo(() => {
    const HARDSCAPE_TYPES = new Set(['patio', 'walkway', 'driveway', 'retaining_wall', 'wall', 'pool_deck', 'concrete_slab', 'parking_lot', 'edging', 'curbing', 'steps_stairs']);
    const SOFTSCAPE_TYPES = new Set(['sod_area', 'garden_bed', 'mulch_area', 'gravel_area']);
    const POINT_TYPES = new Set(['fire_pit', 'tree_planting', 'shrub_planting', 'outdoor_kitchen', 'pergola']);
    let materials = 0;
    let labor = 0;
    for (const el of data.elements) {
      const area = el.areaSqft ?? ((el.lengthFt ?? 0) * (el.widthFt ?? 0));
      const linear = el.linearFt ?? 0;
      if (HARDSCAPE_TYPES.has(el.elementType)) {
        materials += area * 18;
        labor += area * 15;
      } else if (SOFTSCAPE_TYPES.has(el.elementType)) {
        materials += area * 3;
        labor += area * 4;
      } else if (el.elementType === 'drainage' || el.elementType === 'irrigation_zone') {
        materials += linear * 15;
        labor += linear * 10;
      } else if (POINT_TYPES.has(el.elementType)) {
        // Approximate count: 1 point per element. Won't be exact but better than 0.
        materials += 120;
        labor += 80;
      } else {
        // Unknown / "other" — middle ground
        materials += area * 8;
        labor += area * 6;
      }
    }
    return { materials: Math.round(materials), labor: Math.round(labor) };
  }, [data.elements]);

  // Pre-populate on mount from AI or step calculations
  useEffect(() => {
    if (budgetInitialized.current) return;
    budgetInitialized.current = true;
    const ai = recommendations?.budget;
    const updates: Partial<WizardData> = {};
    // For each field: prefer AI > step-derived sum > heuristic > 0.
    if (data.estimatedHours == null) {
      updates.estimatedHours = (ai?.estimatedHours ?? taskHoursSum) || (heuristicBudget.labor / effectiveRate) || null;
    }
    if (data.laborBudget == null) {
      updates.laborBudget = (ai?.laborBudget ?? (taskHoursSum * effectiveRate)) || heuristicBudget.labor || null;
    }
    if (data.materialsBudget == null) {
      updates.materialsBudget = (ai?.materialsBudget ?? matCostSum) || heuristicBudget.materials || null;
    }
    if (data.equipmentCost == null) updates.equipmentCost = (ai?.equipmentBudget ?? equipCostSum) || null;
    if (data.subcontractorBudget == null) updates.subcontractorBudget = (ai?.subcontractorBudget ?? subsCostSum) || null;
    if (data.disposalCost == null && ai?.disposalCost) updates.disposalCost = ai.disposalCost;
    if (data.overheadPct == null) updates.overheadPct = ai?.overheadPct ?? 10;
    if (Object.keys(updates).length > 0) onChange(updates);
  }, []);

  // Auto-calc labor when hours change
  useEffect(() => {
    if (data.estimatedHours && !laborEdited.current) onChange({ laborBudget: data.estimatedHours * effectiveRate });
  }, [data.estimatedHours, effectiveRate]);

  // Auto-calc equipment
  useEffect(() => {
    if (equipCostSum > 0 && !equipCostEdited.current) onChange({ equipmentCost: equipCostSum });
  }, [equipCostSum]);

  // F-CW-07 fix: use shared computeProjectCost so this matches OverviewTab.
  // permitFeesSum lives in component state (not data.permitFees yet at the
  // time this runs), so we pass it via the optional permitFees field below.
  const costInputs = {
    laborBudget: data.laborBudget,
    materialsBudget: data.materialsBudget,
    equipmentBudget: data.equipmentBudget,
    subcontractorBudget: data.subcontractorBudget,
    disposalCost: data.disposalCost,
    equipmentCost: data.equipmentCost,
    overheadPct: data.overheadPct,
    clientQuote: data.clientQuote,
    permitFees: data.permitFees,
  };

  // Auto-calc quote from total cost + desired margin %
  useEffect(() => {
    if (quoteEdited.current) return;
    const { totalCost: cost } = computeProjectCost(costInputs);
    // quote = cost / (1 - margin/100) to achieve desired margin %
    const marginFrac = desiredMargin / 100;
    const quote = marginFrac >= 1 ? cost * 10 : cost / (1 - marginFrac);
    if (quote > 0) onChange({ clientQuote: Math.round(quote) });
  }, [data.laborBudget, data.materialsBudget, data.equipmentBudget, data.subcontractorBudget, data.disposalCost, data.equipmentCost, data.overheadPct, permitFeesSum, desiredMargin]);

  // Computed financials — same helper, ensures Step 5 / Step 6 / Overview agree.
  const { totalCost, profit, marginPct: margin } = computeProjectCost(costInputs);
  const quote = data.clientQuote ?? 0;
  const marginColor = margin >= 20 ? 'var(--status-green)' : margin >= 10 ? 'var(--status-amber)' : 'var(--status-red)';

  const togglePermit = (key: string) => {
    const current = data.permitChecklist || [];
    const fees = { ...data.permitFees };
    if (current.includes(key)) {
      delete fees[key];
      onChange({ permitChecklist: current.filter(k => k !== key), permitFees: fees });
    } else {
      onChange({ permitChecklist: [...current, key] });
    }
  };

  const setPermitFee = (key: string, fee: number) => {
    onChange({ permitFees: { ...data.permitFees, [key]: fee } });
  };

  // Auto-populate AI-recommended permits on mount
  const permitsInitialized = useRef(false);
  useEffect(() => {
    if (permitsInitialized.current) return;
    permitsInitialized.current = true;
    const aiPermits = recommendations?.permits;
    if (aiPermits && aiPermits.length > 0 && (data.permitChecklist || []).length === 0) {
      const checklist: string[] = [];
      const fees: Record<string, number> = {};
      for (const p of aiPermits) {
        const key = p.permitType.toLowerCase().replace(/\s+/g, '_');
        const matchKey = PERMIT_OPTIONS.find(po => key.includes(po.key) || po.key.includes(key))?.key;
        if (matchKey) {
          checklist.push(matchKey);
          if (p.estimatedFee) fees[matchKey] = p.estimatedFee;
        }
      }
      if (checklist.length > 0) {
        onChange({ permitChecklist: checklist, permitFees: fees });
      }
    }
  }, []);

  return (
    <div className="space-y-[24px]">
      {/* Summary bar */}
      <div className="rounded-[10px] border p-[16px] grid grid-cols-3 gap-[12px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="text-center">
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Total Cost</div>
          <div className="text-[22px] font-[700] text-[var(--text)] tabular-nums">{fmt(totalCost)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Client Quote</div>
          <div className="text-[22px] font-[700] text-[var(--green-l)] tabular-nums">{fmt(quote)}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Margin</div>
          <div className="text-[22px] font-[700] tabular-nums" style={{ color: marginColor }}>{margin.toFixed(0)}%</div>
          <div className="text-[11px] text-[var(--text-4)]">{fmt(profit)} profit</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="rounded-[10px] border p-[16px] space-y-[12px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="text-[12px] font-[600] uppercase text-[var(--text-3)]">Cost Breakdown</div>

        {/* Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
          <div>
            <label className={labelClass}>Labor Rate ($/hr)</label>
            <NumberInput className={inputClass} min={0} step={0.5} value={laborRate === 0 ? null : laborRate} onChange={(v) => { const r = v ?? 0; setLaborRate(r); if (!laborEdited.current) onChange({ laborBudget: (data.estimatedHours ?? taskHoursSum) * r }); }} />
          </div>
          <div>
            <label className={labelClass}>Equipment Rate ($/hr)</label>
            <NumberInput className={inputClass} min={0} step={0.5} value={equipRate === 0 ? null : equipRate} onChange={(v) => setEquipRate(v ?? 0)} />
          </div>
        </div>

        {/* Cost line items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
          <div>
            <label className={labelClass}>Man Hours ({taskHoursSum}h from tasks)</label>
            <NumberInput className={inputClass} min={0} value={data.estimatedHours} onChange={(v) => onChange({ estimatedHours: v })} />
          </div>
          <div>
            <label className={labelClass}>Labor Cost ({data.estimatedHours ?? taskHoursSum}h × ${laborRate}/hr)</label>
            <NumberInput className={inputClass} min={0} value={data.laborBudget} onChange={(v) => { laborEdited.current = true; onChange({ laborBudget: v }); }} />
          </div>
          <div>
            <label className={labelClass}>Materials Cost</label>
            <NumberInput className={inputClass} min={0} value={data.materialsBudget} onChange={(v) => onChange({ materialsBudget: v })} placeholder={matCostSum > 0 ? `${matCostSum} from selections` : ''} />
          </div>
          <div>
            <label className={labelClass}>Equipment Cost</label>
            <NumberInput className={inputClass} min={0} value={data.equipmentCost} onChange={(v) => { equipCostEdited.current = true; onChange({ equipmentCost: v }); }} />
          </div>
          <div>
            <label className={labelClass}>Subcontractor Costs</label>
            <NumberInput className={inputClass} min={0} value={data.subcontractorBudget} onChange={(v) => onChange({ subcontractorBudget: v })} placeholder={subsCostSum > 0 ? `${subsCostSum} from subs` : ''} />
          </div>
          <div>
            <label className={labelClass}>Disposal Cost</label>
            <NumberInput className={inputClass} min={0} value={data.disposalCost} onChange={(v) => onChange({ disposalCost: v })} placeholder="0" />
          </div>
        </div>

        {/* Overhead + Profit + Quote */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px] pt-[12px] border-t" style={{ borderColor: 'var(--border)' }}>
          <div>
            <label className={labelClass}>Overhead %</label>
            <NumberInput className={inputClass} min={0} max={100} value={data.overheadPct} onChange={(v) => onChange({ overheadPct: v })} />
          </div>
          <div>
            <label className={labelClass}>Desired Profit %</label>
            <NumberInput className={inputClass} min={0} max={100} step={1} value={desiredMargin === 0 ? null : desiredMargin} onChange={(v) => { setDesiredMargin(v ?? 0); quoteEdited.current = false; }} />
          </div>
          <div>
            <label className={labelClass}>Client Quote (override)</label>
            <NumberInput className={inputClass} min={0} value={data.clientQuote} onChange={(v) => { quoteEdited.current = true; onChange({ clientQuote: v }); }} />
          </div>
        </div>
      </div>

      {/* Permits */}
      <div className="rounded-[10px] border p-[16px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-[12px]">
          <div className="text-[12px] font-[600] uppercase text-[var(--text-3)]">Permits</div>
          <label className="flex items-center gap-[6px] cursor-pointer">
            <input type="checkbox" checked={data.noPermitsRequired ?? false} onChange={(e) => {
              if (e.target.checked) {
                onChange({ noPermitsRequired: true, permitChecklist: [], permitFees: {}, permitStatus: 'not_required' });
              } else {
                onChange({ noPermitsRequired: false, permitStatus: 'not_started' });
              }
            }} />
            <span className="text-[12px] text-[var(--text-3)]">No permits needed</span>
          </label>
        </div>

        {!data.noPermitsRequired && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[6px]">
            {PERMIT_OPTIONS.map(p => {
              const checked = (data.permitChecklist || []).includes(p.key);
              // Find AI-suggested fee for this permit type
              const aiPermit = recommendations?.permits?.find(rp => rp.permitType.toLowerCase().replace(/\s+/g, '_') === p.key || rp.permitType.toLowerCase().includes(p.key.replace(/_/g, ' ')));
              const aiEstFee = aiPermit?.estimatedFee ?? null;
              return (
                <div key={p.key} className="flex items-center gap-[8px] rounded-[6px] px-[10px] py-[6px]" style={{ backgroundColor: checked ? 'rgba(45,106,79,0.06)' : 'transparent' }}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    togglePermit(p.key);
                    // Auto-fill AI estimated fee when checking
                    if (!checked && aiEstFee && !data.permitFees[p.key]) {
                      setPermitFee(p.key, aiEstFee);
                    }
                  }} />
                  <span className="text-[12px] text-[var(--text)] flex-1">
                    {p.label}
                    {aiEstFee != null && !checked && <span className="text-[10px] text-[var(--text-4)] ml-[4px]">~{fmt(aiEstFee)}</span>}
                  </span>
                  {checked && (
                    <input
                      className="w-[80px] bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[6px] py-[3px] text-[11px] text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
                      type="number" min="0" placeholder={aiEstFee ? `~$${aiEstFee}` : 'Fee $'}
                      value={data.permitFees[p.key] ?? ''}
                      onChange={(e) => setPermitFee(p.key, parseFloat(e.target.value) || 0)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {permitFeesSum > 0 && (
          <div className="text-[11px] text-[var(--text-4)] mt-[8px]">Total permit fees: {fmt(permitFeesSum)}</div>
        )}
      </div>

      {/* AI budget reasoning */}
      {recommendations?.budget?.reasoning && (
        <div className="rounded-[8px] px-[14px] py-[10px]" style={{ backgroundColor: 'rgba(45,106,79,0.04)' }}>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">AI Estimate Reasoning</div>
          <p className="text-[12px] text-[var(--text-3)] leading-[1.5]">{recommendations.budget.reasoning}</p>
        </div>
      )}
    </div>
  );
};

export default WizardStepNumbers;
