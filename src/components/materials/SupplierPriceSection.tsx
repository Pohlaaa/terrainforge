import React, { useState, useEffect } from 'react';
import { useSupplierStore } from '@/stores/supplierStore';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PriceHistoryChart } from './PriceHistoryChart';
import type { SupplierPrice } from '@/types';

interface SupplierPriceSectionProps {
  materialId: string;
  materialName: string;
}

interface PriceForm {
  supplierId: string;
  unitCost: string;
  sku: string;
  leadTimeDays: string;
  minOrderQty: string;
  notes: string;
  isPreferred: boolean;
}

const EMPTY_PRICE_FORM: PriceForm = {
  supplierId: '',
  unitCost: '',
  sku: '',
  leadTimeDays: '',
  minOrderQty: '',
  notes: '',
  isPreferred: false,
};

export const SupplierPriceSection: React.FC<SupplierPriceSectionProps> = ({
  materialId,
  materialName,
}) => {
  const {
    suppliers,
    fetchSuppliers,
    fetchSupplierPrices,
    getPricesForMaterial,
    upsertSupplierPrice,
    deleteSupplierPrice,
  } = useSupplierStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<PriceForm>(EMPTY_PRICE_FORM);

  useEffect(() => {
    if (suppliers.length === 0) fetchSuppliers();
    fetchSupplierPrices(materialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  const prices = getPricesForMaterial(materialId);

  // Suppliers not yet linked to this material
  const availableSuppliers = suppliers.filter(
    (s) => s.isActive && !prices.some((p) => p.supplierId === s.id)
  );

  function setField<K extends keyof PriceForm>(key: K, value: PriceForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAddPrice() {
    if (!form.supplierId || !form.unitCost) return;
    await upsertSupplierPrice({
      materialId,
      supplierId: form.supplierId,
      unitCost: parseFloat(form.unitCost) || 0,
      sku: form.sku.trim(),
      leadTimeDays: form.leadTimeDays ? parseInt(form.leadTimeDays) : null,
      minOrderQty: form.minOrderQty ? parseFloat(form.minOrderQty) : null,
      notes: form.notes.trim(),
      isPreferred: form.isPreferred,
    });
    setForm(EMPTY_PRICE_FORM);
    setShowAddForm(false);
  }

  async function handleSetPreferred(priceId: string) {
    // Clear all preferred for this material, then set the selected one
    for (const p of prices) {
      if (p.isPreferred && p.id !== priceId) {
        await upsertSupplierPrice({ ...p, isPreferred: false });
      }
    }
    const target = prices.find((p) => p.id === priceId);
    if (target) {
      await upsertSupplierPrice({ ...target, isPreferred: !target.isPreferred });
    }
  }

  const supplierOptions = availableSuppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-[10px]">
        <div className="text-[10px] font-[700] text-[var(--text-4)] uppercase tracking-[0.06em]">
          Supplier Pricing
        </div>
        {!showAddForm && availableSuppliers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-[12px] font-[500] text-[var(--brand-primary)] hover:underline cursor-pointer"
          >
            + Add supplier price
          </button>
        )}
      </div>

      {/* Existing prices */}
      {prices.length > 0 ? (
        <div className="flex flex-col gap-2 mb-3">
          {prices.map((price) => (
            <div key={price.id}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  price.isPreferred
                    ? 'border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]'
                    : 'border-[var(--border-default)] bg-[var(--surface-card)]'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-[500] text-[var(--text-primary)]">
                      {price.supplierName ?? 'Unknown'}
                    </span>
                    {price.isPreferred && (
                      <span className="text-[10px] font-[600] px-2 py-0.5 rounded-full bg-[var(--brand-primary)] text-white uppercase">
                        Preferred
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                    {price.sku && <span>SKU: {price.sku} · </span>}
                    {price.leadTimeDays !== null && <span>{price.leadTimeDays}d lead · </span>}
                    {price.minOrderQty !== null && <span>Min: {price.minOrderQty} · </span>}
                    <span>Quoted {new Date(price.quotedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-[16px] font-[600] text-[var(--text-primary)] tabular-nums">
                  ${price.unitCost.toFixed(2)}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetPreferred(price.id)}
                    className="w-7 h-7 rounded-md hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors text-[14px]"
                    title={price.isPreferred ? 'Remove preferred' : 'Set as preferred'}
                  >
                    {price.isPreferred ? '⭐' : '☆'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSupplierPrice(price.id)}
                    className="w-7 h-7 rounded-md hover:bg-[var(--status-red-bg)] flex items-center justify-center transition-colors text-[13px]"
                    title="Remove price"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <PriceHistoryChart materialId={materialId} supplierId={price.supplierId} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-[var(--text-tertiary)] py-3 px-3 bg-[var(--surface-hover)] rounded-lg mb-3">
          No supplier prices linked. Add one to enable supplier cost tracking.
        </div>
      )}

      {/* Add price form */}
      {showAddForm && (
        <div className="border border-[var(--border-default)] rounded-lg p-3 bg-[var(--surface-card)]">
          <div className="flex flex-col gap-[10px]">
            <Select
              label="Supplier"
              required
              value={form.supplierId}
              options={[{ value: '', label: 'Select supplier...' }, ...supplierOptions]}
              onChange={(e) => setField('supplierId', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-[10px]">
              <Input
                label="Unit Cost ($)"
                required
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => setField('unitCost', e.target.value)}
                placeholder="4.50"
              />
              <Input
                label="SKU"
                value={form.sku}
                onChange={(e) => setField('sku', e.target.value)}
                placeholder="ABC-1234"
              />
              <Input
                label="Lead Time (days)"
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={(e) => setField('leadTimeDays', e.target.value)}
                placeholder="3"
              />
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <Input
                label="Min Order Qty"
                type="number"
                min="0"
                value={form.minOrderQty}
                onChange={(e) => setField('minOrderQty', e.target.value)}
              />
              <label className="flex items-center gap-2 cursor-pointer self-end pb-1">
                <input
                  type="checkbox"
                  checked={form.isPreferred}
                  onChange={(e) => setField('isPreferred', e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)]"
                />
                <span className="text-[13px] text-[var(--text-primary)]">Preferred supplier</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setForm(EMPTY_PRICE_FORM); }}
                className="px-3 py-1.5 text-[12px] font-[500] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPrice}
                disabled={!form.supplierId || !form.unitCost}
                className="px-4 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-[12px] font-[500] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                Add Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
