import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/Textarea';
import { useSupplierStore } from '@/stores/supplierStore';
import { useQuoteStore } from '@/stores/quoteStore';
import { useOrgStore } from '@/stores/orgStore';
import { toast } from '@/hooks/useToast';
import { CATEGORY_GROUPS, type CategoryGroupKey, type CategoryGroupDef, type SupplierMatchScore, scoreSuppliersForGroup } from '@/lib/categories';
import type { ManifestItem } from '@/types';

interface QuoteRequestModalProps {
  isOpen: boolean;
  projectId: string;
  manifestItems: ManifestItem[];
  onClose: () => void;
  onCreated?: () => void;
}

interface CategoryGroup {
  key: CategoryGroupKey;
  label: string;
  items: ManifestItem[];
  selectedSupplierId: string | null;
}

export const QuoteRequestModal: React.FC<QuoteRequestModalProps> = ({
  isOpen,
  projectId,
  manifestItems,
  onClose,
  onCreated,
}) => {
  const { suppliers, fetchSuppliers } = useSupplierStore();
  const { createQuoteRequest } = useQuoteStore();
  const { org } = useOrgStore();

  const initSelectedSuppliers = (): Record<CategoryGroupKey, string | null> => {
    const init = {} as Record<CategoryGroupKey, string | null>;
    for (const key of Object.keys(CATEGORY_GROUPS) as CategoryGroupKey[]) {
      init[key] = null;
    }
    return init;
  };

  const [selectedSuppliers, setSelectedSuppliers] = useState<Record<CategoryGroupKey, string | null>>(
    initSelectedSuppliers()
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (suppliers.length === 0) fetchSuppliers();
      setSelectedSuppliers(initSelectedSuppliers());
      setNotes('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Group manifest items by category
  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const groups: CategoryGroup[] = [];

    for (const [key, group] of Object.entries(CATEGORY_GROUPS)) {
      const groupKey = key as CategoryGroupKey;
      const items = manifestItems.filter((mi) =>
        group.categories.includes(mi.category as never)
      );

      if (items.length > 0) {
        groups.push({
          key: groupKey,
          label: group.label,
          items,
          selectedSupplierId: selectedSuppliers[groupKey] ?? null,
        });
      }
    }

    return groups;
  }, [manifestItems, selectedSuppliers]);

  // Get matched and scored suppliers for a category group
  const getMatchedSuppliers = (groupKey: CategoryGroupKey): SupplierMatchScore[] => {
    // For now, pass empty quoteHistory — will be populated from quoteStore in future
    return scoreSuppliersForGroup(groupKey, suppliers, []);
  };

  // Calculate estimated total
  const estimatedTotal = useMemo(() => {
    return categoryGroups.reduce((sum, group) => {
      return sum + group.items.reduce((groupSum, item) => groupSum + item.subtotal, 0);
    }, 0);
  }, [categoryGroups]);

  // Count how many quotes will be created
  const quotesToCreate = categoryGroups.filter((g) => g.selectedSupplierId).length;

  async function handleCreate() {
    if (quotesToCreate === 0) return;
    setSubmitting(true);
    try {
      let successCount = 0;
      const errors: string[] = [];

      for (const group of categoryGroups) {
        if (!group.selectedSupplierId) continue;

        const result = await createQuoteRequest(
          projectId,
          group.selectedSupplierId,
          group.items
        );

        if (result) {
          successCount++;
        } else {
          const supplier = suppliers.find((s) => s.id === group.selectedSupplierId);
          errors.push(supplier?.name ?? 'Unknown supplier');
        }
      }

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? 'Quote request created'
            : `${successCount} quote requests created`
        );
        onCreated?.();
        onClose();
      }

      if (errors.length > 0) {
        toast.error(`Failed to create quotes for: ${errors.join(', ')}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      title="Request Quotes"
      onClose={onClose}
      onConfirm={handleCreate}
      confirmText={
        submitting
          ? 'Creating...'
          : quotesToCreate === 0
            ? 'Select Suppliers'
            : `Create ${quotesToCreate} Quote${quotesToCreate !== 1 ? 's' : ''}`
      }
      confirmDisabled={quotesToCreate === 0 || submitting}
      maxWidth="720px"
    >
      <div className="flex flex-col gap-[18px]">
        {/* Instructions */}
        <div className="text-[13px] text-[var(--text-3)]">
          Select suppliers for each material category
        </div>

        {/* Category groups */}
        <div className="space-y-[12px] max-h-[380px] overflow-y-auto">
          {categoryGroups.map((group) => {
            const matchedSuppliers = getMatchedSuppliers(group.key);
            const groupTotal = group.items.reduce((sum, mi) => sum + mi.subtotal, 0);

            return (
              <div
                key={group.key}
                className="border rounded-[8px] p-[14px]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface2)' }}
              >
                {/* Group header with item summary */}
                <div className="mb-[12px]">
                  <h4 className="text-[13px] font-[600] text-[var(--text)]">
                    {group.label} ({group.items.length} item{group.items.length !== 1 ? 's' : ''})
                  </h4>
                  <div className="text-[12px] text-[var(--text-4)] mt-[4px]">
                    {group.items.map((mi) => mi.materialName).join(', ')}
                  </div>
                </div>

                {/* Supplier selection */}
                {matchedSuppliers.length > 0 ? (
                  <div className="flex items-end gap-[10px]">
                    <div className="flex-1">
                      <label className="block text-[11px] font-[600] text-[var(--text-3)] uppercase mb-[6px]">
                        Supplier
                      </label>
                      <select
                        value={group.selectedSupplierId ?? ''}
                        onChange={(e) => {
                          setSelectedSuppliers((prev) => ({
                            ...prev,
                            [group.key]: e.target.value || null,
                          }));
                        }}
                        className="w-full px-[10px] py-[8px] rounded-[6px] border text-[13px] bg-[var(--surface)] text-[var(--text)]"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <option value="">Select supplier...</option>
                        {matchedSuppliers.map((s) => {
                          const label = s.quoteCount > 0 ? `${s.supplierName} (${s.quoteCount} past quote${s.quoteCount !== 1 ? 's' : ''})` : s.supplierName;
                          return (
                            <option key={s.supplierId} value={s.supplierId}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="text-[13px] font-[600] text-[var(--green-l)] whitespace-nowrap">
                      ${groupTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[12px] text-[var(--text-4)] italic">
                    No matching suppliers — add one in Material Library
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes */}
        <TextArea
          label="Notes for All Suppliers"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery requirements, timeline, special instructions..."
        />

        {/* Summary */}
        <div
          className="rounded-[8px] border p-[12px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <div className="text-[12px] text-[var(--text-3)] mb-[6px]">
            {quotesToCreate > 0 ? (
              <span>
                {quotesToCreate} quote request{quotesToCreate !== 1 ? 's' : ''} to{' '}
                {new Set(
                  categoryGroups
                    .filter((g) => g.selectedSupplierId)
                    .map((g) => g.selectedSupplierId)
                ).size}{' '}
                supplier{new Set(categoryGroups.filter((g) => g.selectedSupplierId).map((g) => g.selectedSupplierId)).size !== 1 ? 's' : ''}
              </span>
            ) : (
              <span>Select suppliers to create quotes</span>
            )}
          </div>
          <div className="text-[14px] font-[600] text-[var(--text)]">
            Estimated total:{' '}
            <span className="text-[var(--green-l)]">
              ${estimatedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
