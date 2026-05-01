/**
 * Material Defaults — Settings sub-section (Sprint Materials Settings).
 *
 * Closes jbluhm V6: contractor sets a fixed-rate per category once
 * ("Class 5 base from supplier X at $Y/cuyd") and named disposal-fee
 * categories (Brush, Concrete, Soil, Fill, Rock). AI prompt + engine
 * cost fallback consume these defaults on every project.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useOrgStore } from '@/stores/orgStore';
import { useSupplierStore } from '@/stores/supplierStore';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from './SectionHeading';
import { toast } from '@/hooks/useToast';
import type { CategoryRate, DisposalRateRule, MaterialCategory } from '@/types';

interface MaterialDefaultsSectionProps {
  readOnly?: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────

// Material categories the engine knows about. Mirror of the type union in types/index.ts
// — only the categories a contractor would set a default for. Skip irrigation/lumber
// /lighting unless the contractor explicitly asks; keep the list short to reduce friction.
const CATEGORY_CHOICES: { value: MaterialCategory; label: string }[] = [
  { value: 'gravel', label: 'Gravel / base rock' },
  { value: 'sand', label: 'Sand' },
  { value: 'soil', label: 'Topsoil' },
  { value: 'mulch', label: 'Mulch' },
  { value: 'paver', label: 'Pavers' },
  { value: 'stone', label: 'Stone / flagstone' },
  { value: 'tile', label: 'Tile' },
  { value: 'brick', label: 'Brick' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'sod', label: 'Sod' },
  { value: 'seed', label: 'Seed' },
  { value: 'edging', label: 'Edging' },
  { value: 'plant', label: 'Plant' },
  { value: 'shrub', label: 'Shrub' },
  { value: 'tree', label: 'Tree' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'lumber', label: 'Lumber' },
  { value: 'misc', label: 'Other / misc' },
];

const PURCHASE_UNIT_CHOICES = ['cuyd', 'ton', 'bag', 'sqft', 'lnft', 'each', 'pallet', 'roll', 'piece', 'box', 'bundle', 'lb', 'gallon'];

const DISPOSAL_TYPE_PRESETS = ['Brush', 'Concrete', 'Soil', 'Fill', 'Rock', 'Sod', 'Asphalt', 'Mixed debris'];

// ── Component ───────────────────────────────────────────────────────────────

export const MaterialDefaultsSection: React.FC<MaterialDefaultsSectionProps> = ({ readOnly }) => {
  const org = useOrgStore((s) => s.org);
  const updateMaterialDefaults = useOrgStore((s) => s.updateMaterialDefaults);
  const suppliers = useSupplierStore((s) => s.suppliers);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);

  // Local working copies (committed on Save)
  const initialCat = org?.materialDefaults?.categoryRates ?? [];
  const initialDisp = org?.materialDefaults?.disposalRates ?? [];
  const [categoryRates, setCategoryRates] = useState<CategoryRate[]>(initialCat);
  const [disposalRates, setDisposalRates] = useState<DisposalRateRule[]>(initialDisp);
  const [saving, setSaving] = useState(false);

  // Sync from store when org changes (e.g. after fetch)
  useEffect(() => {
    setCategoryRates(org?.materialDefaults?.categoryRates ?? []);
    setDisposalRates(org?.materialDefaults?.disposalRates ?? []);
  }, [org?.id, org?.materialDefaults]);

  useEffect(() => {
    if (!suppliers.length) fetchSuppliers();
  }, [suppliers.length, fetchSuppliers]);

  const dirty = useMemo(() => {
    return JSON.stringify({ categoryRates, disposalRates }) !==
      JSON.stringify({ categoryRates: initialCat, disposalRates: initialDisp });
  }, [categoryRates, disposalRates, initialCat, initialDisp]);

  // ── Category-rate handlers ───────────────────────────────────────────────

  function addCategoryRate() {
    setCategoryRates((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: '',
        category: 'gravel',
        supplierId: null,
        unitCost: 0,
        unit: 'cuyd',
      },
    ]);
  }

  function updateCategoryRate(id: string, updates: Partial<CategoryRate>) {
    setCategoryRates((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function deleteCategoryRate(id: string) {
    setCategoryRates((prev) => prev.filter((r) => r.id !== id));
  }

  // ── Disposal-rate handlers ───────────────────────────────────────────────

  function addDisposalRate() {
    setDisposalRates((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: '', unitCost: 0, unit: 'cuyd' },
    ]);
  }

  function updateDisposalRate(id: string, updates: Partial<DisposalRateRule>) {
    setDisposalRates((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function deleteDisposalRate(id: string) {
    setDisposalRates((prev) => prev.filter((r) => r.id !== id));
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (saving || readOnly) return;
    // Basic validation: drop rows with empty label / type
    const cleanedCats = categoryRates.filter((r) => r.label.trim());
    const cleanedDisp = disposalRates.filter((r) => r.type.trim());
    setSaving(true);
    try {
      await updateMaterialDefaults({
        categoryRates: cleanedCats,
        disposalRates: cleanedDisp,
      });
      // Reflect cleaned local state
      setCategoryRates(cleanedCats);
      setDisposalRates(cleanedDisp);
      toast.success('Material defaults saved');
    } catch {
      toast.error('Failed to save material defaults');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <SectionHeading
        title="Material Defaults"
        subtitle="Set fixed rates the AI and engine reuse on every project. Edit per-project if needed."
      />

      {/* ── Category rates ──────────────────────────────────────────────── */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)]">Category rates</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
              "I always buy gravel from this supplier at this price." Used as the default unit cost
              when the catalog has no price set.
            </div>
          </div>
          {!readOnly && (
            <Button variant="secondary" onClick={addCategoryRate}>+ Add rate</Button>
          )}
        </div>

        {categoryRates.length === 0 ? (
          <div className="text-[12px] text-[var(--text-tertiary)] py-3 italic">
            No category rates yet. Add one to start.
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {categoryRates.map((rate) => (
              <div
                key={rate.id}
                className="rounded-lg p-3 grid grid-cols-12 gap-2 items-center"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
              >
                <input
                  type="text"
                  placeholder="Label (e.g. Class 5 base)"
                  value={rate.label}
                  onChange={(e) => updateCategoryRate(rate.id, { label: e.target.value })}
                  disabled={readOnly}
                  className="col-span-3 px-2 py-1.5 text-[13px] rounded-md disabled:opacity-60"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
                <select
                  value={rate.category}
                  onChange={(e) => updateCategoryRate(rate.id, { category: e.target.value as MaterialCategory })}
                  disabled={readOnly}
                  className="col-span-2 px-2 py-1.5 text-[13px] rounded-md cursor-pointer disabled:opacity-60"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {CATEGORY_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <select
                  value={rate.supplierId ?? ''}
                  onChange={(e) => updateCategoryRate(rate.id, { supplierId: e.target.value || null })}
                  disabled={readOnly}
                  className="col-span-3 px-2 py-1.5 text-[13px] rounded-md cursor-pointer disabled:opacity-60"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  <option value="">No preference</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="col-span-2 flex items-center gap-1">
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={Number.isFinite(rate.unitCost) ? rate.unitCost : 0}
                    onChange={(e) => updateCategoryRate(rate.id, { unitCost: parseFloat(e.target.value) || 0 })}
                    disabled={readOnly}
                    className="flex-1 px-2 py-1.5 text-[13px] rounded-md disabled:opacity-60"
                    style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                </div>
                <select
                  value={rate.unit}
                  onChange={(e) => updateCategoryRate(rate.id, { unit: e.target.value })}
                  disabled={readOnly}
                  className="col-span-1 px-2 py-1.5 text-[13px] rounded-md cursor-pointer disabled:opacity-60"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {PURCHASE_UNIT_CHOICES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {!readOnly && (
                  <button
                    onClick={() => deleteCategoryRate(rate.id)}
                    title="Remove"
                    className="col-span-1 text-[16px] cursor-pointer border-none bg-transparent p-1 rounded-md hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Disposal rates ──────────────────────────────────────────────── */}
      <div className="py-4 border-b border-[var(--border-light)]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[14px] font-[500] text-[var(--text-primary)]">Disposal rates</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
              Per-category disposal fees. Common types: Brush, Concrete, Soil, Fill, Rock.
            </div>
          </div>
          {!readOnly && (
            <Button variant="secondary" onClick={addDisposalRate}>+ Add rate</Button>
          )}
        </div>

        {disposalRates.length === 0 ? (
          <div className="text-[12px] text-[var(--text-tertiary)] py-3 italic">
            No disposal rates yet. Add one to start.
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {disposalRates.map((rate) => (
              <div
                key={rate.id}
                className="rounded-lg p-3 grid grid-cols-12 gap-2 items-center"
                style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-default)' }}
              >
                <input
                  type="text"
                  placeholder="Type (e.g. Concrete)"
                  list={`disposal-presets-${rate.id}`}
                  value={rate.type}
                  onChange={(e) => updateDisposalRate(rate.id, { type: e.target.value })}
                  disabled={readOnly}
                  className="col-span-5 px-2 py-1.5 text-[13px] rounded-md disabled:opacity-60"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
                <datalist id={`disposal-presets-${rate.id}`}>
                  {DISPOSAL_TYPE_PRESETS.map((t) => <option key={t} value={t} />)}
                </datalist>
                <div className="col-span-3 flex items-center gap-1">
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={Number.isFinite(rate.unitCost) ? rate.unitCost : 0}
                    onChange={(e) => updateDisposalRate(rate.id, { unitCost: parseFloat(e.target.value) || 0 })}
                    disabled={readOnly}
                    className="flex-1 px-2 py-1.5 text-[13px] rounded-md disabled:opacity-60"
                    style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                  />
                </div>
                <select
                  value={rate.unit}
                  onChange={(e) => updateDisposalRate(rate.id, { unit: e.target.value })}
                  disabled={readOnly}
                  className="col-span-3 px-2 py-1.5 text-[13px] rounded-md cursor-pointer disabled:opacity-60"
                  style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {PURCHASE_UNIT_CHOICES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {!readOnly && (
                  <button
                    onClick={() => deleteDisposalRate(rate.id)}
                    title="Remove"
                    className="col-span-1 text-[16px] cursor-pointer border-none bg-transparent p-1 rounded-md hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Save ────────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="mt-6 flex items-center gap-3">
          <Button variant="primary" loading={saving} disabled={!dirty} onClick={handleSave}>
            Save Material Defaults
          </Button>
          {dirty && (
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              Unsaved changes
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default MaterialDefaultsSection;
