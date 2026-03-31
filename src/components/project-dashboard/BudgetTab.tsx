import React, { useMemo } from 'react';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit } from '@/types';

interface Props {
  project: Project;
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
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

export const ProjectDashboardBudget: React.FC<Props> = ({
  project,
  tasks,
  subcontractors,
  permits,
}) => {
  const financials = useMemo(() => {
    const labor = project.laborBudget ?? 0;
    const materials = project.materialsBudget ?? 0;
    const equipment = project.equipmentBudget ?? 0;
    const subs = project.subcontractorBudget ?? 0;
    const permitFees = permits.reduce((sum, p) => sum + (p.fee ?? 0), 0);
    const subtotal = labor + materials + equipment + subs + permitFees;
    const overheadPct = project.overheadPct ?? 10;
    const overhead = subtotal * (overheadPct / 100);
    const totalCost = subtotal + overhead;
    const quote = project.clientQuote ?? project.budget ?? 0;
    const profit = quote - totalCost;
    const marginPct = quote > 0 ? (profit / quote) * 100 : 0;

    return { labor, materials, equipment, subs, permitFees, subtotal, overhead, overheadPct, totalCost, quote, profit, marginPct };
  }, [project, permits]);

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const subTotal = subcontractors.reduce((sum, s) => sum + (s.quotedCost ?? 0), 0);

  const marginColor =
    financials.profit > 0 ? 'var(--status-green)' : financials.profit < 0 ? 'var(--status-red)' : 'var(--text-3)';

  // Cost breakdown for the donut-style visual
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
          <div className="text-[20px] font-[700] text-[var(--text)]">{fmtShort(financials.quote)}</div>
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
              <div className="flex justify-between text-[13px] mb-[2px]">
                <span className="text-[var(--text)]">Labor</span>
                <span className="text-[var(--text)] font-[600]">{fmt(financials.labor)}</span>
              </div>
              {totalHours > 0 && (
                <div className="text-[11px] text-[var(--text-4)]">
                  {totalHours}h estimated across {tasks.length} tasks
                </div>
              )}
            </div>

            {/* Materials */}
            <div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text)]">Materials</span>
                <span className="text-[var(--text)] font-[600]">{fmt(financials.materials)}</span>
              </div>
              {financials.materials === 0 && (
                <div className="text-[11px] text-[var(--text-4)]">
                  Add materials via zones to track costs
                </div>
              )}
            </div>

            {/* Equipment */}
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text)]">Equipment</span>
              <span className="text-[var(--text)] font-[600]">{fmt(financials.equipment)}</span>
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
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-2)]">Overhead ({financials.overheadPct}%)</span>
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
