import React from 'react';
import type { Material } from '@/types';

interface LowStockBannerProps {
  lowStockItems: Material[];
  /** F-CW-24: total material count, so we can hide the banner entirely
      when 100% of materials are "low stock" — that signals the org isn't
      tracking on-hand inventory rather than an actual restock alert. */
  totalCount?: number;
}

export const LowStockBanner: React.FC<LowStockBannerProps> = ({ lowStockItems, totalCount }) => {
  if (lowStockItems.length === 0) return null;
  // F-CW-24: when every material in the library is "low" (because none have
  // qty_on_hand populated), the banner is noise, not a useful warning. Hide
  // it. Once at least one material has stock tracked, the banner becomes
  // meaningful again.
  if (totalCount && lowStockItems.length >= totalCount) return null;

  return (
    <div
      className="flex items-start gap-2.5 rounded-lg px-4 py-3"
      style={{ background: 'var(--status-amber-bg)', borderLeft: '4px solid var(--status-amber)' }}
    >
      <span className="text-base flex-shrink-0">⚠</span>
      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
        <span className="font-semibold">Low stock: </span>
        {lowStockItems.slice(0, 5).map((m, i) => (
          <span key={m.id}>
            {m.name} ({m.qtyOnHand} {m.unit})
            {i < Math.min(lowStockItems.length, 5) - 1 ? ', ' : ''}
          </span>
        ))}
        {lowStockItems.length > 5 && <span> and {lowStockItems.length - 5} more</span>}
      </div>
    </div>
  );
};
