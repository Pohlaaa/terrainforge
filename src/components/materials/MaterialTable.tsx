import React from 'react';
import { toast } from '@/hooks/useToast';
import { EmptyState, MaterialsIcon } from '@/components/shared/EmptyState';
import { CAT_LABELS } from '@/lib/constants';
import type { Material, MaterialCategory } from '@/types';

function getStockStatus(m: Material): 'in' | 'low' | 'out' {
  if (m.qtyOnHand <= 0) return 'out';
  if (m.qtyOnHand <= m.minStockLevel) return 'low';
  return 'in';
}

interface MaterialTableProps {
  displayMaterials: Material[];
  allMaterialsCount: number;
  activeCategory: string;
  activeCatLabel: string;
  openEditModal: (material: Material) => void;
  openAddModal: () => void;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
  displayMaterials,
  allMaterialsCount,
  activeCategory,
  activeCatLabel,
  openEditModal,
  openAddModal,
}) => {
  if (displayMaterials.length === 0) {
    if (allMaterialsCount === 0) {
      return (
        <EmptyState
          icon={<MaterialsIcon />}
          title="Stock your material library"
          description="Add materials to track inventory and costs across projects."
          actionLabel="Add Material"
          onAction={openAddModal}
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-[14px] text-[var(--text-secondary)] mb-2">
          No {activeCategory === 'all' ? '' : activeCatLabel + ' '}materials match your filters
        </div>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-[var(--border-default)] text-[11px] font-[600] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
          <th className="text-left px-4 py-3">Name</th>
          <th className="text-left px-4 py-3">Category</th>
          <th className="text-right px-4 py-3">Unit</th>
          <th className="text-right px-4 py-3">Cost</th>
          <th className="text-right px-4 py-3">On Hand</th>
          <th className="text-left px-4 py-3">Status</th>
          <th className="text-left px-4 py-3">Supplier</th>
          <th className="text-right px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {displayMaterials.map(material => {
          const status = getStockStatus(material);
          return (
            <tr key={material.id} className="border-b border-[var(--border-light)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors">
              <td className="px-4 py-3 text-[14px] font-[500] text-[var(--text-primary)]">{material.name}</td>
              <td className="px-4 py-3">
                <span className="text-[12px] px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] font-[500] capitalize">
                  {CAT_LABELS[material.category as MaterialCategory] ?? material.category}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-[14px] text-[var(--text-secondary)]">{material.unit}</td>
              <td className="px-4 py-3 text-right text-[14px] font-[500] text-[var(--text-primary)]">${material.cost.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-[14px] text-[var(--text-primary)]">{material.qtyOnHand}</td>
              <td className="px-4 py-3">
                {status === 'in' && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-green-bg)] text-[var(--status-green)]">● In Stock</span>
                )}
                {status === 'low' && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-amber-bg)] text-[var(--status-amber)]">● Low Stock</span>
                )}
                {status === 'out' && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-red-bg)] text-[var(--status-red)]">● Out</span>
                )}
              </td>
              <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{material.supplier_name || '—'}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={() => openEditModal(material)}
                    className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                    title="Edit"
                  >✏️</button>
                  <button
                    onClick={() => toast.info('Material ordering coming in Phase 2')}
                    className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                    title="Order"
                  >📦</button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
