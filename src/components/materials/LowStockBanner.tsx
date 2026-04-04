import React from 'react';
import type { Material } from '@/types';

interface LowStockBannerProps {
  lowStockItems: Material[];
}

export const LowStockBanner: React.FC<LowStockBannerProps> = ({ lowStockItems }) => {
  if (lowStockItems.length === 0) return null;

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
