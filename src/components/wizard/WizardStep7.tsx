import React, { useMemo } from 'react';
import type { WizardData } from '@/pages/ProjectWizard';

interface Props {
  data: WizardData;
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  full_install: 'Full Install',
  renovation: 'Renovation',
  hardscape: 'Hardscape',
  softscape: 'Softscape',
  drainage: 'Drainage',
  irrigation: 'Irrigation',
  maintenance: 'Maintenance',
  mixed: 'Mixed',
};

const PHASE_LABELS: Record<string, string> = {
  demo_prep: 'Demo / Prep',
  rough_grade: 'Rough Grade',
  hardscape: 'Hardscape',
  softscape: 'Softscape',
  irrigation: 'Irrigation',
  lighting: 'Lighting',
  cleanup_punchlist: 'Cleanup / Punchlist',
  custom: 'Custom',
};

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const sectionClass =
  'rounded-[8px] border p-[16px]';

const sectionHeadClass = 'text-[13px] font-[600] text-[var(--text)] mb-[10px]';

const rowClass = 'flex justify-between text-[12px] py-[3px]';

const labelSpan = 'text-[var(--text-3)]';
const valueSpan = 'text-[var(--text)] font-[500]';

export const WizardStep7: React.FC<Props> = ({ data }) => {
  const financials = useMemo(() => {
    const labor = data.laborBudget ?? 0;
    const materials = data.materialsBudget ?? 0;
    const equipment = data.equipmentBudget ?? 0;
    const subs = data.subcontractorBudget ?? 0;
    const subtotal = labor + materials + equipment + subs;
    const overheadPct = data.overheadPct ?? 10;
    const overhead = subtotal * (overheadPct / 100);
    const totalCost = subtotal + overhead;
    const quote = data.clientQuote ?? 0;
    const profit = quote - totalCost;
    const marginPct = quote > 0 ? (profit / quote) * 100 : 0;
    return { subtotal, overhead, totalCost, profit, marginPct };
  }, [data.laborBudget, data.materialsBudget, data.equipmentBudget, data.subcontractorBudget, data.overheadPct, data.clientQuote]);

  const marginColor =
    financials.profit > 0 ? 'var(--status-green)' : financials.profit < 0 ? 'var(--status-red)' : 'var(--text-3)';

  // Count populated fields for a completeness indicator
  const sections = [
    { label: 'Job Description', filled: !!data.name.trim() },
    { label: 'Site Intelligence', filled: !!data.address.trim() },
    { label: 'Scope & Tasks', filled: data.tasks.length > 0 },
    { label: 'Resources', filled: (data.crewSelections?.length ?? 0) > 0 || data.subcontractors.length > 0 || data.equipmentSelections.length > 0 },
    { label: 'Compliance', filled: data.permitChecklist.length > 0 || !!data.complianceNotes },
    { label: 'Budget', filled: (data.clientQuote ?? 0) > 0 },
  ];
  const filledCount = sections.filter((s) => s.filled).length;

  return (
    <div className="space-y-[16px]">
      <div className="flex items-center justify-between mb-[8px]">
        <h3 className="text-[16px] font-[600] text-[var(--text)]">
          Review & Create
        </h3>
        <span className="text-[12px] text-[var(--text-3)]">
          {filledCount} of {sections.length} sections filled
        </span>
      </div>

      {/* Progress chips */}
      <div className="flex gap-[6px] flex-wrap mb-[8px]">
        {sections.map((s) => (
          <span
            key={s.label}
            className="px-[8px] py-[3px] rounded-[5px] text-[11px] font-[500]"
            style={{
              backgroundColor: s.filled ? 'rgba(45,106,79,0.12)' : 'var(--surface3)',
              color: s.filled ? 'var(--green-l)' : 'var(--text-4)',
            }}
          >
            {s.filled ? '✓' : '○'} {s.label}
          </span>
        ))}
      </div>

      {/* Step 1: Job Description */}
      <div className={sectionClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <h4 className={sectionHeadClass}>Job Description</h4>
        <div className={rowClass}>
          <span className={labelSpan}>Project Name</span>
          <span className={valueSpan}>{data.name || '—'}</span>
        </div>
        <div className={rowClass}>
          <span className={labelSpan}>Type</span>
          <span className={valueSpan}>{data.projectType ? PROJECT_TYPE_LABELS[data.projectType] || data.projectType : '—'}</span>
        </div>
        <div className={rowClass}>
          <span className={labelSpan}>Scope</span>
          <span className={valueSpan}>{data.scopeSize || '—'}</span>
        </div>
        {data.clientName && (
          <div className={rowClass}>
            <span className={labelSpan}>Client</span>
            <span className={valueSpan}>{data.clientName}{data.clientPhone ? ` · ${data.clientPhone}` : ''}</span>
          </div>
        )}
        {(data.startDate || data.targetDate) && (
          <div className={rowClass}>
            <span className={labelSpan}>Timeline</span>
            <span className={valueSpan}>
              {data.startDate || '?'} → {data.targetDate || '?'}
            </span>
          </div>
        )}
        {data.description && (
          <p className="text-[12px] text-[var(--text-3)] mt-[6px] italic">{data.description}</p>
        )}
      </div>

      {/* Step 2: Site */}
      <div className={sectionClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <h4 className={sectionHeadClass}>Site Intelligence</h4>
        <div className={rowClass}>
          <span className={labelSpan}>Address</span>
          <span className={valueSpan}>{data.address || '—'}</span>
        </div>
        {data.slopeGrade && <div className={rowClass}><span className={labelSpan}>Slope</span><span className={valueSpan}>{data.slopeGrade}</span></div>}
        {data.soilType && <div className={rowClass}><span className={labelSpan}>Soil</span><span className={valueSpan}>{data.soilType}</span></div>}
        {data.sunExposure && <div className={rowClass}><span className={labelSpan}>Sun</span><span className={valueSpan}>{data.sunExposure.replace('_', ' ')}</span></div>}
        {data.hoaFlag && <div className={rowClass}><span className={labelSpan}>HOA</span><span className={valueSpan}>Yes</span></div>}
      </div>

      {/* Step 3: Tasks */}
      {data.tasks.length > 0 && (
        <div className={sectionClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <h4 className={sectionHeadClass}>Scope & Tasks ({data.tasks.length})</h4>
          <div className="space-y-[4px]">
            {data.tasks.map((task, i) => (
              <div key={task.tempId} className="flex items-center gap-[8px] text-[12px]">
                <span className="text-[var(--text-4)] w-[20px] text-right shrink-0">{i + 1}.</span>
                <span className="text-[var(--text)]">{task.name || '(untitled)'}</span>
                <span className="text-[var(--text-4)] text-[11px]">
                  {PHASE_LABELS[task.phase] || task.phase}
                </span>
                {task.estimatedHours != null && (
                  <span className="text-[var(--text-4)] text-[11px]">{task.estimatedHours}h</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Resources */}
      {((data.crewSelections?.length ?? 0) > 0 || data.subcontractors.length > 0 || data.equipmentSelections.length > 0 || data.equipmentNotes) && (
        <div className={sectionClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <h4 className={sectionHeadClass}>Resources</h4>
          {data.crewSelections && data.crewSelections.length > 0 && (
            <div className="mb-[6px]">
              <span className="text-[11px] text-[var(--text-3)]">Crew ({data.crewSelections.length}):</span>
              {data.crewSelections.map((c) => (
                <div key={c.crewMemberId} className={rowClass}>
                  <span className={labelSpan}>{c.name}</span>
                  <span className={valueSpan}>{c.role}</span>
                </div>
              ))}
            </div>
          )}
          {data.equipmentSelections.length > 0 && (
            <div className="mt-[4px]">
              <span className="text-[11px] text-[var(--text-3)]">Equipment:</span>
              {data.equipmentSelections.map((equip) => (
                <div key={equip.equipmentId} className={rowClass}>
                  <span className={labelSpan}>{equip.name} ({equip.durationDays}d)</span>
                  <span className={valueSpan}>
                    {equip.dailyRate > 0 ? fmt(equip.dailyRate * equip.durationDays) : 'Rate TBD'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {data.equipmentNotes && (
            <div className={rowClass}>
              <span className={labelSpan}>Equipment Notes</span>
              <span className={`${valueSpan} max-w-[300px] text-right`}>{data.equipmentNotes}</span>
            </div>
          )}
          {data.subcontractors.length > 0 && (
            <div className="mt-[6px]">
              <span className="text-[11px] text-[var(--text-3)]">Subcontractors:</span>
              {data.subcontractors.map((sub) => (
                <div key={sub.tempId} className={rowClass}>
                  <span className={labelSpan}>{sub.companyName || '(unnamed)'}{sub.trade ? ` — ${sub.trade}` : ''}</span>
                  <span className={valueSpan}>{sub.quotedCost != null ? fmt(sub.quotedCost) : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Compliance */}
      {(data.permitChecklist.length > 0 || data.complianceNotes) && (
        <div className={sectionClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <h4 className={sectionHeadClass}>Compliance</h4>
          {data.permitChecklist.length > 0 && (
            <div className="flex gap-[4px] flex-wrap mb-[6px]">
              {data.permitChecklist.map((key) => (
                <span
                  key={key}
                  className="px-[8px] py-[2px] rounded-[4px] text-[11px] font-[500]"
                  style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}
                >
                  {key.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          {data.complianceNotes && (
            <p className="text-[12px] text-[var(--text-3)] italic">{data.complianceNotes}</p>
          )}
        </div>
      )}

      {/* Step 6: Financial Summary */}
      <div className={sectionClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <h4 className={sectionHeadClass}>Budget</h4>
        <div className={rowClass}>
          <span className={labelSpan}>Total Cost</span>
          <span className={valueSpan}>{fmt(financials.totalCost)}</span>
        </div>
        <div className={rowClass}>
          <span className={labelSpan}>Client Quote</span>
          <span className={valueSpan}>{fmt(data.clientQuote)}</span>
        </div>
        <div className={rowClass}>
          <span className={labelSpan}>Profit</span>
          <span className="font-[600]" style={{ color: marginColor }}>
            {fmt(financials.profit)} ({financials.marginPct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};

export default WizardStep7;
