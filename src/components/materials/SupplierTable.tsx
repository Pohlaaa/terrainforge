import React from 'react';
import { EmptyState, MaterialsIcon } from '@/components/shared/EmptyState';
import { getCategoryLabel } from '@/lib/categories';
import { formatPhone } from '@/utils/phone';
import type { Supplier } from '@/types';

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onAdd: () => void;
  onDelete: (supplierId: string) => void;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  suppliers,
  onEdit,
  onAdd,
  onDelete,
}) => {
  if (suppliers.length === 0) {
    return (
      <EmptyState
        icon={<MaterialsIcon />}
        title="No suppliers yet"
        description="Add your local suppliers to track pricing and send quote requests."
        actionLabel="Add Supplier"
        onAction={onAdd}
      />
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-[var(--border-default)] text-[11px] font-[600] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
          <th className="text-left px-4 py-3">Supplier</th>
          <th className="text-left px-4 py-3">Contact</th>
          <th className="text-left px-4 py-3">Phone</th>
          <th className="text-left px-4 py-3">Email</th>
          <th className="text-left px-4 py-3">Categories</th>
          <th className="text-center px-4 py-3">Status</th>
          <th className="text-right px-4 py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {suppliers.map((supplier) => (
          <tr
            key={supplier.id}
            className="border-b border-[var(--border-light)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
            onClick={() => onEdit(supplier)}
          >
            <td className="px-4 py-3">
              <div className="text-[14px] font-[500] text-[var(--text-primary)]">{supplier.name}</div>
              {supplier.address && (
                <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate max-w-[200px]">{supplier.address}</div>
              )}
            </td>
            <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
              {supplier.contactName || '—'}
            </td>
            <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
              {supplier.phone ? formatPhone(supplier.phone) : '—'}
            </td>
            <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
              {supplier.email ? (
                <a
                  href={`mailto:${supplier.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[var(--brand-primary)] hover:underline"
                >
                  {supplier.email}
                </a>
              ) : '—'}
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {supplier.categories.length > 0 ? (
                  supplier.categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] font-[500] capitalize"
                    >
                      {getCategoryLabel(cat)}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-[var(--text-tertiary)]">—</span>
                )}
                {supplier.categories.length > 3 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-tertiary)] font-[500]">
                    +{supplier.categories.length - 3}
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3 text-center">
              {supplier.isActive ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-green-bg)] text-[var(--status-green)]">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-tertiary)]">
                  Inactive
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit(supplier)}
                  className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors"
                  title="Edit supplier"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(supplier.id)}
                  className="w-8 h-8 rounded-lg hover:bg-[var(--status-red-bg)] flex items-center justify-center transition-colors"
                  title="Delete supplier"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
