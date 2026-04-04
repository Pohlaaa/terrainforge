import React from 'react';
import type { Financials } from './BudgetBreakdownTable';

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';

function fmtShort(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export interface CostSummaryCardProps {
  financials: Financials;
}

export const CostSummaryCard: React.FC<CostSummaryCardProps> = ({ financials }) => {
  const costItems = [
    { label: 'Labor', value: financials.labor, color: 'var(--brand-primary)' },
    { label: 'Materials', value: financials.materials, color: '#52B788' },
    { label: 'Equipment Budget', value: financials.equipment, color: '#74C69D' },
    { label: 'Equipment Cost', value: financials.equipCost, color: '#40916C' },
    { label: 'Disposal', value: financials.disposal, color: '#B7E4C7' },
    { label: 'Subcontractors', value: financials.subs, color: '#95D5B2' },
    { label: 'Permit Fees', value: financials.permitFees, color: '#D8F3DC' },
    { label: 'Overhead', value: financials.overhead, color: '#1B4332' },
  ].filter((item) => item.value > 0);

  return (
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
                  : 'Negative margin \u2014 losing money.'}
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
  );
};
