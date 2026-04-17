/**
 * MaterialPicker — modal for assigning materials to a project element.
 * Shows catalog filtered by element type, live quantity preview, assign/remove.
 */
import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/shared/Modal';
import { useMaterialStore } from '@/stores/materialStore';
import { useOrgStore } from '@/stores/orgStore';
import { useProjectStore } from '@/stores/projectStore';
import { computeElementMaterial } from '@/materials-engine/engine';
import { applyWaste, roundToPurchaseUnit } from '@/materials-engine/unit-conversions';
import { getElementTypesForCategory } from '@/lib/elements';
import { getCategoryLabel } from '@/lib/categories';
import { normalizeCategory } from '@/lib/categories';
import type { ProjectElement, ProjectElementMaterial, Material } from '@/types';

interface Props {
  element: ProjectElement;
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialPicker: React.FC<Props> = ({ element, isOpen, onClose }) => {
  const { materials: catalog } = useMaterialStore();
  const orgId = useOrgStore((s) => s.org?.id);
  const { addElementMaterial, removeElementMaterial } = useProjectStore();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const assignedIds = new Set((element.materials || []).map(m => m.materialId));

  // Filter catalog: show materials whose category maps to this element type, plus search
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return catalog.filter(mat => {
      if (mat.isActive === false) return false;
      // Search filter
      if (searchLower && !mat.name.toLowerCase().includes(searchLower) && !mat.category.toLowerCase().includes(searchLower)) return false;
      // If no search, filter by element type compatibility
      if (!searchLower) {
        const targetTypes = getElementTypesForCategory(normalizeCategory(mat.category));
        if (targetTypes.length > 0 && !targetTypes.includes(element.elementType)) return false;
      }
      return true;
    });
  }, [catalog, search, element.elementType]);

  // Preview quantity for a catalog material on this element
  function previewQty(mat: Material): { qty: number; unit: string; cost: number } {
    const mockElMat: ProjectElementMaterial = {
      id: '', orgId: '', elementId: element.id, materialId: mat.id,
      name: mat.name, category: mat.category,
      quantity: 0, unit: mat.purchaseUnit || mat.unit, unitCost: mat.costPerPurchaseUnit || mat.cost,
      depthIn: null, notes: '', createdAt: '',
      computationModel: mat.computationModel,
    };
    const raw = computeElementMaterial(element, mockElMat, mat);
    const waste = mat.defaultWasteFactor ?? 0.05;
    const adjusted = applyWaste(raw, waste);
    const pu = mat.purchaseUnit || mat.unit;
    const purchase = roundToPurchaseUnit(adjusted, pu);
    const cost = purchase * (mat.costPerPurchaseUnit || mat.cost);
    return { qty: purchase, unit: pu, cost };
  }

  async function handleAssign(mat: Material) {
    if (!orgId || adding) return;
    setAdding(mat.id);
    const preview = previewQty(mat);
    await addElementMaterial(element.id, {
      orgId,
      elementId: element.id,
      materialId: mat.id,
      name: mat.name,
      category: normalizeCategory(mat.category),
      quantity: preview.qty,
      unit: preview.unit,
      unitCost: mat.costPerPurchaseUnit || mat.cost,
      depthIn: null,
      notes: '',
      computationModel: mat.computationModel,
    }, orgId);
    setAdding(null);
  }

  async function handleRemove(elMat: ProjectElementMaterial) {
    await removeElementMaterial(element.id, elMat.id);
  }

  const area = element.computedAreaSqft || (element.lengthFt && element.widthFt ? element.lengthFt * element.widthFt : element.areaSqft ?? 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Materials — ${element.name}`} maxWidth="640px">
      <div className="space-y-[12px]">
        {/* Element summary */}
        <div className="text-[12px] text-[var(--text-3)] flex gap-[12px]">
          <span>{element.elementType.replace(/_/g, ' ')}</span>
          {area > 0 && <span>{area.toLocaleString()} sqft</span>}
          {element.linearFt && <span>{element.linearFt} LF</span>}
        </div>

        {/* Currently assigned */}
        {(element.materials || []).length > 0 && (
          <div>
            <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[6px]">Assigned ({element.materials.length})</div>
            <div className="space-y-[4px]">
              {element.materials.map(m => (
                <div key={m.id} className="flex items-center gap-[6px] rounded-[6px] border px-[10px] py-[6px] text-[12px]" style={{ borderColor: 'var(--green)', backgroundColor: 'rgba(45,106,79,0.06)' }}>
                  <span className="text-[var(--green-l)]">✓</span>
                  <span className="text-[var(--text)] font-[500] flex-1">{m.name}</span>
                  <span className="text-[var(--text-3)]">{m.quantity} {m.unit}</span>
                  <span className="text-[var(--text-4)]">${(m.quantity * m.unitCost).toFixed(0)}</span>
                  <button type="button" onClick={() => handleRemove(m)} className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <input
          className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[8px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)]"
          placeholder="Search materials..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Available materials */}
        <div className="max-h-[300px] overflow-y-auto space-y-[3px]">
          {filtered.length === 0 && (
            <div className="text-[12px] text-[var(--text-4)] text-center py-[16px]">No matching materials found</div>
          )}
          {filtered.map(mat => {
            const isAssigned = assignedIds.has(mat.id);
            const preview = !isAssigned ? previewQty(mat) : null;
            return (
              <div key={mat.id}
                className="flex items-center gap-[8px] rounded-[6px] border px-[10px] py-[8px] text-[12px] transition-colors"
                style={{ borderColor: isAssigned ? 'var(--green)' : 'var(--border)', backgroundColor: isAssigned ? 'rgba(45,106,79,0.04)' : 'var(--surface2)', opacity: isAssigned ? 0.6 : 1 }}
              >
                <span className="px-[5px] py-[1px] rounded-[3px] text-[10px] font-[500] shrink-0" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}>
                  {getCategoryLabel(mat.category)}
                </span>
                <span className="text-[var(--text)] font-[500] flex-1">{mat.name}</span>
                {preview && preview.qty > 0 && (
                  <span className="text-[var(--text-4)] text-[11px] tabular-nums">{preview.qty} {preview.unit} · ${preview.cost.toFixed(0)}</span>
                )}
                {isAssigned ? (
                  <span className="text-[10px] text-[var(--green-l)]">assigned</span>
                ) : (
                  <button type="button" onClick={() => handleAssign(mat)} disabled={!!adding}
                    className="px-[8px] py-[3px] rounded-[4px] text-[11px] font-[500] cursor-pointer border-none"
                    style={{ backgroundColor: 'var(--green)', color: '#fff', opacity: adding === mat.id ? 0.5 : 1 }}>
                    {adding === mat.id ? '...' : 'Add'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
