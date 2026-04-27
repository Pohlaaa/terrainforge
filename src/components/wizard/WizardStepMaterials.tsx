import React, { useMemo } from 'react';
import { SuggestionPanel } from '@/components/shared/SuggestionPanel';
import type { SuggestionItem } from '@/components/shared/SuggestionPanel';
import type { WizardData, WizardMaterial } from '@/pages/ProjectWizard';
import type { AIRecommendationSet } from '@/types';
import { getCategoryLabel, normalizeCategory } from '@/lib/categories';
import { getElementTypesForMaterial, ELEMENT_TYPE_LABELS } from '@/lib/elements';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
  aiLoading: boolean;
  acceptedIds: Set<string>;
  dismissedIds: Set<string>;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcceptAll: (ids: string[]) => void;
  onDismissAll: (ids: string[]) => void;
  onReset: () => void;
}

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const WizardStepMaterials: React.FC<Props> = ({
  data,
  onChange,
  recommendations,
  aiLoading,
  acceptedIds,
  dismissedIds,
  onAccept,
  onDismiss,
  onAcceptAll,
  onDismissAll,
  onReset,
}) => {
  const materialSelections = data.materialSelections;

  // Map AI material recommendations to SuggestionItems
  const materialSuggestions: SuggestionItem[] = useMemo(
    () =>
      (recommendations?.materials || []).map((m, i) => ({
        id: `mat-${i}`,
        title: m.materialName,
        subtitle: getCategoryLabel(m.category),
        reason: m.reason,
        warning: !m.inLibrary ? 'Not in your library — will be added automatically' : undefined,
        metadata: {
          Qty: `${m.estimatedQuantity} ${m.unit}`,
          'Unit Cost': `$${m.unitCost.toFixed(2)}`,
          Est: `$${(m.estimatedQuantity * m.unitCost).toLocaleString()}`,
        },
      })),
    [recommendations?.materials]
  );

  // When a material is accepted, add it to materialSelections
  const handleAcceptMaterial = (id: string) => {
    onAccept(id);
    const idx = parseInt(id.replace('mat-', ''));
    const rec = recommendations?.materials[idx];
    if (!rec) return;
    // Don't add duplicate
    if (materialSelections.some((m) => m.materialName === rec.materialName)) return;
    const newMat: WizardMaterial = {
      tempId: crypto.randomUUID(),
      materialId: rec.materialId,
      materialName: rec.materialName,
      category: rec.category,
      quantity: rec.estimatedQuantity,
      unit: rec.unit,
      unitCost: rec.unitCost,
      inLibrary: rec.inLibrary,
    };
    onChange({ materialSelections: [...materialSelections, newMat] });
  };

  const handleAcceptAllMaterials = () => {
    const ids = materialSuggestions
      .filter((s) => !acceptedIds.has(s.id) && !dismissedIds.has(s.id))
      .map((s) => s.id);
    onAcceptAll(ids);
    const newMats: WizardMaterial[] = [];
    ids.forEach((id) => {
      const idx = parseInt(id.replace('mat-', ''));
      const rec = recommendations?.materials[idx];
      if (!rec) return;
      if (materialSelections.some((m) => m.materialName === rec.materialName)) return;
      newMats.push({
        tempId: crypto.randomUUID(),
        materialId: rec.materialId,
        materialName: rec.materialName,
        category: rec.category,
        quantity: rec.estimatedQuantity,
        unit: rec.unit,
        unitCost: rec.unitCost,
        inLibrary: rec.inLibrary,
      });
    });
    if (newMats.length > 0) onChange({ materialSelections: [...materialSelections, ...newMats] });
  };

  const handleDismissAllMaterials = () => {
    const ids = materialSuggestions
      .filter((s) => !acceptedIds.has(s.id) && !dismissedIds.has(s.id))
      .map((s) => s.id);
    onDismissAll(ids);
  };

  // Update quantity for an accepted material
  const updateQuantity = (tempId: string, qty: number) => {
    onChange({
      materialSelections: materialSelections.map((m) =>
        m.tempId === tempId ? { ...m, quantity: qty } : m
      ),
    });
  };

  // Remove an accepted material
  const removeMaterial = (tempId: string) => {
    onChange({
      materialSelections: materialSelections.filter((m) => m.tempId !== tempId),
    });
  };

  // Totals
  const totalMaterialsCost = useMemo(
    () => materialSelections.reduce((sum, m) => sum + m.quantity * m.unitCost, 0),
    [materialSelections]
  );

  const notInLibraryCount = materialSelections.filter((m) => !m.inLibrary).length;

  // Compute element assignments for each material (preview of auto-assignment)
  const getElementAssignments = (mat: WizardMaterial) => {
    const category = normalizeCategory(mat.category);
    // F-CW-LIVE-09: same logic as the wizard's auto-link loop — fall back
    // to name-keyword matching when category yields no element types so the
    // preview doesn't lie ("category=misc → no assignment" was misleading).
    const targetTypes = getElementTypesForMaterial(category, mat.materialName);
    if (!data.elements || data.elements.length === 0 || targetTypes.length === 0) return [];
    const matching = data.elements.filter(el => targetTypes.includes(el.elementType));
    if (matching.length === 0) return [];
    return matching.map(el => {
      const area = (el.lengthFt && el.widthFt) ? el.lengthFt * el.widthFt : (el.areaSqft ?? 0);
      return {
        name: el.name || ELEMENT_TYPE_LABELS[el.elementType] || el.elementType,
        area,
        linearFt: el.linearFt,
        elementType: el.elementType,
      };
    });
  };

  return (
    <div className="space-y-[24px]">
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Project Materials
        </h3>
        <p className="text-[12px] text-[var(--text-4)]">
          Review AI-suggested materials for this project. Accepted materials will be saved
          to the project and auto-added to your Material Library if needed.
        </p>
      </div>

      {/* AI Suggestions — accepted items render inline with editable fields */}
      <SuggestionPanel
        title="AI Material Recommendations"
        items={materialSuggestions}
        onAccept={handleAcceptMaterial}
        onDismiss={(id) => onDismiss(id)}
        onAcceptAll={handleAcceptAllMaterials}
        onDismissAll={handleDismissAllMaterials}
        acceptedIds={acceptedIds}
        dismissedIds={dismissedIds}
        isLoading={aiLoading}
        emptyMessage="No material recommendations — add project details in earlier steps for AI suggestions."
        renderAccepted={(item) => {
          // Find the corresponding WizardMaterial by matching the suggestion title
          const idx = parseInt(item.id.replace('mat-', ''));
          const rec = recommendations?.materials[idx];
          const mat = materialSelections.find(
            (m) => m.materialName === rec?.materialName || m.materialName === item.title
          );
          if (!mat) {
            return (
              <div className="rounded-[8px] border px-[12px] py-[8px] flex items-center gap-[8px]" style={{ backgroundColor: 'rgba(45,106,79,0.08)', borderColor: 'var(--green)' }}>
                <span className="text-[var(--green-l)] text-[14px]">&#10003;</span>
                <span className="text-[12px] text-[var(--text-2)] flex-1">{item.title}</span>
              </div>
            );
          }
          const assignments = getElementAssignments(mat);
          return (
            <div
              className="rounded-[8px] border p-[12px]"
              style={{ backgroundColor: 'rgba(45,106,79,0.08)', borderColor: 'var(--green)' }}
            >
              {/* Top row: name + editable fields */}
              <div className="flex items-center gap-[10px] flex-wrap">
                <span className="text-[var(--green-l)] text-[14px] shrink-0">&#10003;</span>
                <span
                  className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[500] shrink-0"
                  style={{ backgroundColor: 'rgba(45,106,79,0.15)', color: 'var(--green-l)' }}
                >
                  {getCategoryLabel(mat.category)}
                </span>
                <span className="text-[13px] font-[500] text-[var(--text)] min-w-0 truncate flex-1">
                  {mat.materialName}
                  {!mat.inLibrary && (
                    <span className="text-[10px] text-[var(--status-amber)] ml-[6px]">+ new</span>
                  )}
                </span>
                <input
                  className="w-[70px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
                  type="number"
                  min="0"
                  step="1"
                  value={mat.quantity}
                  onChange={(e) => updateQuantity(mat.tempId, parseFloat(e.target.value) || 0)}
                />
                <span className="text-[11px] text-[var(--text-3)] w-[40px]">{mat.unit}</span>
                <span className="text-[12px] text-[var(--text-3)] w-[60px] text-right">@ {fmt(mat.unitCost)}</span>
                <span className="text-[13px] font-[600] text-[var(--text)] w-[80px] text-right tabular-nums">{fmt(mat.quantity * mat.unitCost)}</span>
                <button
                  type="button"
                  onClick={() => removeMaterial(mat.tempId)}
                  className="w-[24px] h-[24px] rounded-[4px] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--text)] hover:bg-[var(--surface)] cursor-pointer bg-transparent border-none transition-colors"
                >
                  ✕
                </button>
              </div>
              {/* Element assignment line */}
              {assignments.length > 0 && (
                <div className="mt-[6px] ml-[24px] pl-[6px] border-l-2" style={{ borderColor: 'var(--green)' }}>
                  <span className="text-[10px] text-[var(--text-4)]">Applies to: </span>
                  {assignments.map((a, i) => (
                    <span key={i} className="text-[10px] text-[var(--text-3)]">
                      {a.name} ({a.area > 0 ? `${a.area} sqft` : `${a.linearFt ?? 0} lnft`})
                      {i < assignments.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        }}
      />

      {/* Total (outside panel) */}
      {materialSelections.length > 0 && (
        <div
          className="flex items-center justify-between pt-[12px] border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-[13px] font-[600] text-[var(--text)]">
            Estimated Material Cost ({materialSelections.length} material{materialSelections.length !== 1 ? 's' : ''})
            {notInLibraryCount > 0 && (
              <span className="text-[11px] text-[var(--status-amber)] ml-[8px] font-[400]">
                {notInLibraryCount} will be added to your library
              </span>
            )}
          </span>
          <span className="text-[16px] font-[700] text-[var(--green-l)] tabular-nums">
            {fmt(totalMaterialsCost)}
          </span>
        </div>
      )}
    </div>
  );
};

export default WizardStepMaterials;
