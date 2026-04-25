/**
 * Step 5: "Review & Create" — Clean summary of all wizard data.
 */
import React, { useMemo } from 'react';
import type { WizardData } from '@/pages/ProjectWizard';
import { getCategoryLabel } from '@/lib/categories';
import { ELEMENT_TYPE_LABELS } from '@/lib/elements';
import { computeProjectCost } from '@/lib/projectCost';

interface Props {
  data: WizardData;
}

const PHASES: Record<string, string> = {
  demo_prep: 'Demo / Prep', rough_grade: 'Rough Grade', hardscape: 'Hardscape',
  softscape: 'Softscape', irrigation: 'Irrigation', lighting: 'Lighting',
  cleanup_punchlist: 'Cleanup / Punchlist', custom: 'Custom',
};

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const cardClass = 'rounded-[8px] border p-[14px]';

export const WizardStepSummary: React.FC<Props> = ({ data }) => {
  const totalManHours = data.tasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0);
  const totalMatCost = data.materialSelections.reduce((s, m) => s + m.quantity * m.unitCost, 0);
  // F-CW-06 + F-CW-07 fix: shared rollup. Step 6 was previously omitting
  // permit fees from directCosts (Step 5 included them) — that was the
  // $258 drift between screens.
  const { totalCost: total, profit, marginPct: margin } = computeProjectCost({
    laborBudget: data.laborBudget,
    materialsBudget: data.materialsBudget,
    equipmentBudget: data.equipmentBudget,
    subcontractorBudget: data.subcontractorBudget,
    disposalCost: data.disposalCost,
    equipmentCost: data.equipmentCost,
    overheadPct: data.overheadPct,
    clientQuote: data.clientQuote,
    permitFees: data.permitFees,
  });
  const quote = data.clientQuote ?? 0;
  const marginColor = margin >= 20 ? 'var(--status-green)' : margin >= 10 ? 'var(--status-amber)' : 'var(--status-red)';

  const totalArea = useMemo(() => data.elements.reduce((s, el) => {
    const a = (el.lengthFt && el.widthFt) ? el.lengthFt * el.widthFt : (el.areaSqft ?? 0);
    return s + a;
  }, 0), [data.elements]);

  return (
    <div className="space-y-[16px]">
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">Review & Create</h3>
        <p className="text-[12px] text-[var(--text-4)]">Everything looks good? Hit create to start this project as an estimate.</p>
      </div>

      {/* Financial Summary Banner */}
      <div className="rounded-[10px] border p-[16px] grid grid-cols-2 md:grid-cols-4 gap-[12px]" style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Total Cost</div>
          <div className="text-[20px] font-[700] text-[var(--text)]">{fmt(total)}</div>
        </div>
        <div>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Client Quote</div>
          <div className="text-[20px] font-[700] text-[var(--green-l)]">{fmt(quote)}</div>
        </div>
        <div>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Profit</div>
          <div className="text-[20px] font-[700]" style={{ color: marginColor }}>{fmt(profit)}</div>
        </div>
        <div>
          <div className="text-[10px] font-[600] uppercase text-[var(--text-4)]">Margin</div>
          <div className="text-[20px] font-[700]" style={{ color: marginColor }}>{margin.toFixed(0)}%</div>
        </div>
      </div>

      {/* The Job */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="text-[12px] font-[600] uppercase text-[var(--text-3)] mb-[8px]">The Job</div>
        <div className="grid grid-cols-2 gap-[8px] text-[12px]">
          <div><span className="text-[var(--text-4)]">Project:</span> <span className="text-[var(--text)] font-[500]">{data.name || '—'}</span></div>
          <div><span className="text-[var(--text-4)]">Type:</span> <span className="text-[var(--text)]">{data.projectType || '—'}</span></div>
          <div><span className="text-[var(--text-4)]">Client:</span> <span className="text-[var(--text)]">{data.clientName || '—'}</span></div>
          <div><span className="text-[var(--text-4)]">Address:</span> <span className="text-[var(--text)]">{data.address || '—'}</span></div>
          {data.description && <div className="col-span-2"><span className="text-[var(--text-4)]">Description:</span> <span className="text-[var(--text)]">{data.description}</span></div>}
        </div>
      </div>

      {/* Measurements */}
      {data.elements.length > 0 && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[12px] font-[600] uppercase text-[var(--text-3)] mb-[8px]">Measurements ({totalArea.toLocaleString()} sqft total)</div>
          <div className="space-y-[3px]">
            {data.elements.map((el, i) => {
              const area = (el.lengthFt && el.widthFt) ? el.lengthFt * el.widthFt : (el.areaSqft ?? 0);
              return (
                <div key={i} className="flex items-center gap-[6px] text-[12px]">
                  <span className="text-[var(--text)] font-[500]">{el.name || ELEMENT_TYPE_LABELS[el.elementType]}</span>
                  <span className="text-[var(--text-4)]">
                    {el.lengthFt && el.widthFt ? `${el.lengthFt} × ${el.widthFt} ft = ` : ''}
                    {area > 0 ? `${area} sqft` : el.linearFt ? `${el.linearFt} LF` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks */}
      {data.tasks.length > 0 && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[12px] font-[600] uppercase text-[var(--text-3)] mb-[8px]">Tasks ({data.tasks.length}) · {totalManHours} man hrs</div>
          <div className="space-y-[3px]">
            {data.tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-[6px] text-[12px]">
                <span className="text-[var(--text)] font-[500]">{t.name}</span>
                <span className="text-[var(--text-4)]">{PHASES[t.phase] || t.phase}</span>
                {t.estimatedHours != null && <span className="text-[var(--text-4)]">{t.estimatedHours}h</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crew */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="text-[12px] font-[600] uppercase text-[var(--text-3)] mb-[8px]">Crew ({data.crewSelections.length})</div>
        {data.crewSelections.length === 0 ? (
          <div className="text-[12px] text-[var(--text-4)]">None selected</div>
        ) : (
          <div className="space-y-[3px]">
            {data.crewSelections.map((c, i) => (
              <div key={i} className="flex items-center gap-[6px] text-[12px]">
                <span className="text-[var(--text)] font-[500]">{c.name}</span>
                <span className="text-[var(--text-4)]">{c.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Equipment */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="text-[12px] font-[600] uppercase text-[var(--text-3)] mb-[8px]">Equipment ({data.equipmentSelections.length})</div>
        {data.equipmentSelections.length === 0 ? (
          <div className="text-[12px] text-[var(--text-4)]">None selected</div>
        ) : (
          <div className="space-y-[3px]">
            {data.equipmentSelections.map((e, i) => (
              <div key={i} className="flex items-center gap-[6px] text-[12px]">
                <span className="text-[var(--text)] font-[500]">{e.name}</span>
                <span className="text-[var(--text-4)]">{e.durationDays} days · ${e.dailyRate}/day</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Materials */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="text-[12px] font-[600] uppercase text-[var(--text-3)] mb-[8px]">Materials ({data.materialSelections.length})</div>
        {data.materialSelections.length === 0 ? (
          <div className="text-[12px] text-[var(--text-4)]">None selected</div>
        ) : (
          <div className="space-y-[3px]">
            {data.materialSelections.map((m, i) => (
              <div key={i} className="flex items-center gap-[6px] text-[12px]">
                <span className="text-[var(--text)] font-[500]">{m.materialName}</span>
                <span className="text-[var(--text-4)]">{m.quantity} {m.unit} · ${m.unitCost}/{m.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permits */}
      {(data.permitChecklist || []).length > 0 && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className="text-[12px] font-[600] uppercase text-[var(--text-3)] mb-[8px]">Permits</div>
          <div className="flex gap-[6px] flex-wrap">
            {(data.permitChecklist || []).map(p => (
              <span key={p} className="px-[8px] py-[3px] rounded-[4px] text-[11px]" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}>
                {p.replace(/_/g, ' ')}{data.permitFees[p] ? ` — $${data.permitFees[p]}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WizardStepSummary;
