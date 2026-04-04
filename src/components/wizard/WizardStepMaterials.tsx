import React, { useMemo } from 'react';
import { SuggestionPanel } from '@/components/shared/SuggestionPanel';
import type { SuggestionItem } from '@/components/shared/SuggestionPanel';
import type { WizardData, WizardMaterial } from '@/pages/ProjectWizard';
import type { AIRecommendationSet } from '@/types';
import { getCategoryLabel } from '@/lib/categories';

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

      {/* AI Suggestions */}
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
      />

      {/* Accepted materials — editable quantities */}
      {materialSelections.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-[10px]">
            <h4 className="text-[13px] font-[600] text-[var(--text)]">
              Accepted Materials ({materialSelections.length})
            </h4>
            {notInLibraryCount > 0 && (
              <span className="text-[11px] text-[var(--status-amber)]">
                {notInLibraryCount} will be added to your library
              </span>
            )}
          </div>

          <div className="space-y-[6px]">
            {materialSelections.map((mat) => (
              <div
                key={mat.tempId}
                className="rounded-[8px] border p-[12px] flex items-center gap-[10px]"
                style={{
                  backgroundColor: 'var(--surface2)',
                  borderColor: mat.inLibrary ? 'var(--border)' : 'var(--status-amber)',
                }}
              >
                {/* Category badge */}
                <span
                  className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[500] shrink-0"
                  style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}
                >
                  {getCategoryLabel(mat.category)}
                </span>

                {/* Name */}
                <span className="flex-1 text-[13px] font-[500] text-[var(--text)] min-w-0 truncate">
                  {mat.materialName}
                  {!mat.inLibrary && (
                    <span className="text-[10px] text-[var(--status-amber)] ml-[6px]">+ new</span>
                  )}
                </span>

                {/* Quantity input */}
                <input
                  className="w-[70px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
                  type="number"
                  min="0"
                  step="1"
                  value={mat.quantity}
                  onChange={(e) =>
                    updateQuantity(mat.tempId, parseFloat(e.target.value) || 0)
                  }
                />

                {/* Unit */}
                <span className="text-[11px] text-[var(--text-3)] w-[40px]">{mat.unit}</span>

                {/* Unit cost */}
                <span className="text-[12px] text-[var(--text-3)] w-[60px] text-right">
                  @ {fmt(mat.unitCost)}
                </span>

                {/* Subtotal */}
                <span className="text-[13px] font-[600] text-[var(--text)] w-[80px] text-right tabular-nums">
                  {fmt(mat.quantity * mat.unitCost)}
                </span>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeMaterial(mat.tempId)}
                  className="w-[24px] h-[24px] rounded-[4px] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--text)] hover:bg-[var(--surface)] cursor-pointer bg-transparent border-none transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            className="flex items-center justify-between mt-[12px] pt-[12px] border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[13px] font-[600] text-[var(--text)]">
              Estimated Material Cost
            </span>
            <span className="text-[16px] font-[700] text-[var(--green-l)] tabular-nums">
              {fmt(totalMaterialsCost)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WizardStepMaterials;
