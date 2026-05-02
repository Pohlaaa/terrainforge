/**
 * WizardElementEditSheet — wizard-side adapter for the touch-first
 * ElementEditSheet.
 *
 * Maps `WizardElement` + `WizardData.materialSelections` + the AI
 * per-element material cache into the generic `SheetElement` shape.
 * Materials accepted via the sheet's "+ Add material" button push to
 * `materialSelections`; removals pull. Cost is computed per-element
 * via the materials engine using a synthetic `ProjectElement`.
 *
 * Renders only on mobile (`md:hidden`) — desktop continues to use the
 * existing inline `ElementSidebar`. Keeps both surfaces in sync via
 * the same `updateElement` / `removeElement` callbacks.
 */

import React, { useMemo } from 'react'
import { ElementEditSheet, type SheetElement, type SheetMaterial, type SheetAddableMaterial } from '@/components/shared/ElementEditSheet'
import { useMaterialStore } from '@/stores/materialStore'
import { generateEngineManifest } from '@/materials-engine/engine'
import { getElementTypesForMaterial } from '@/lib/elements'
import type { WizardData, WizardElement, WizardMaterial } from '@/pages/ProjectWizard'
import type { AIMaterialRecommendation, ProjectElement, ProjectElementMaterial } from '@/types'

interface Props {
  selected: WizardElement | null
  data: WizardData
  onClose: () => void
  onUpdate: (updates: Partial<WizardElement>) => void
  onRemove: () => void
  /** AI recommendations for THIS element type, if cached. */
  perElementRecs: AIMaterialRecommendation[] | null
  onChange: (updates: Partial<WizardData>) => void
}

export const WizardElementEditSheet: React.FC<Props> = ({
  selected,
  data,
  onClose,
  onUpdate,
  onRemove,
  perElementRecs,
  onChange,
}) => {
  const orgCatalog = useMaterialStore((s) => s.materials)

  // Build the SheetElement view of the selected wizard element.
  const sheetElement = useMemo<SheetElement | null>(() => {
    if (!selected) return null

    // Materials linked to this element via the category + name-keyword
    // mapping (same routing the manifest engine uses at create time).
    const ownMaterials = data.materialSelections.filter((m) => {
      const types = getElementTypesForMaterial(m.category, m.materialName)
      return types.includes(selected.elementType)
    })

    // Compute per-element cost via the engine. We synthesize a minimal
    // ProjectElement from the wizard element so the engine can apply
    // its formula (sqft × depth, etc.) instead of just raw qty × cost.
    const synth: ProjectElement = {
      id: selected.tempId,
      orgId: '',
      projectId: '',
      name: selected.name,
      elementType: selected.elementType,
      shape: selected.shape ?? 'rectangle',
      radiusFt: selected.radiusFt ?? null,
      lengthFt: selected.lengthFt,
      widthFt: selected.widthFt,
      areaSqft: selected.areaSqft,
      linearFt: selected.linearFt,
      heightFt: selected.heightFt,
      depthIn: selected.depthIn,
      computedAreaSqft: 0,
      notes: selected.notes,
      sequence: 0,
      createdAt: '',
      materials: ownMaterials.map(toProjectElementMaterial),
      geometry: selected.geometry ?? null,
    }
    const manifest = generateEngineManifest([synth], orgCatalog)
    const lineByMaterial = new Map(manifest.lineItems.map((li) => [li.materialId, li]))

    const materials: SheetMaterial[] = ownMaterials.map((m) => {
      const li = lineByMaterial.get(m.materialId ?? m.tempId)
      return {
        id: m.tempId,
        name: m.materialName,
        category: m.category,
        // Prefer engine-derived qty (uses element dims + waste) over the
        // wizard's prior-stored qty so the value always matches the
        // current dimensions.
        quantity: li?.purchaseQuantity ?? m.quantity,
        unit: li?.purchaseUnit ?? m.unit,
        unitCost: li?.unitCost ?? m.unitCost,
        lineCost: li?.lineCost ?? m.quantity * m.unitCost,
      }
    })

    const estimatedCost = manifest.summary.totalCost

    return {
      id: selected.tempId,
      name: selected.name,
      elementType: selected.elementType,
      lengthFt: selected.lengthFt,
      widthFt: selected.widthFt,
      linearFt: selected.linearFt,
      heightFt: selected.heightFt,
      depthIn: selected.depthIn,
      materials,
      estimatedCost,
    }
  }, [selected, data.materialSelections, orgCatalog])

  // Build the addable-materials list. Order: AI suggestions first
  // (most relevant), then the org library filtered by element category.
  const addableMaterials = useMemo<SheetAddableMaterial[]>(() => {
    if (!selected) return []
    const alreadyAdded = new Set(
      data.materialSelections.map((m) => (m.materialId ?? m.materialName).toLowerCase()),
    )

    const aiOptions: SheetAddableMaterial[] = (perElementRecs ?? [])
      .filter((r) => !alreadyAdded.has((r.materialId ?? r.materialName).toLowerCase()))
      .slice(0, 8)
      .map((r) => ({
        id: r.materialId ?? `ai-${r.materialName}`,
        name: r.materialName,
        category: r.category,
        unit: r.unit,
        unitCost: r.unitCost,
        source: 'ai' as const,
      }))

    const libOptions: SheetAddableMaterial[] = orgCatalog
      .filter((m) => getElementTypesForMaterial(m.category, m.name).includes(selected.elementType))
      .filter((m) => !alreadyAdded.has(m.id.toLowerCase()))
      .slice(0, 30)
      .map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        unitCost: m.cost,
        source: 'library' as const,
      }))

    return [...aiOptions, ...libOptions]
  }, [selected, data.materialSelections, perElementRecs, orgCatalog])

  if (!sheetElement) return null

  function handleAddMaterial(m: SheetAddableMaterial) {
    if (!selected) return
    const next: WizardMaterial = {
      tempId: crypto.randomUUID(),
      materialId: m.source === 'library' ? m.id : null,
      materialName: m.name,
      category: m.category,
      quantity: 1,
      unit: m.unit,
      unitCost: m.unitCost,
      inLibrary: m.source === 'library',
    }
    onChange({ materialSelections: [...data.materialSelections, next] })
  }

  function handleRemoveMaterial(tempId: string) {
    onChange({
      materialSelections: data.materialSelections.filter((m) => m.tempId !== tempId),
    })
  }

  function handleSheetUpdate(updates: Partial<SheetElement>) {
    if (!selected) return
    const out: Partial<WizardElement> = {}
    if (updates.name !== undefined) out.name = updates.name
    if (updates.elementType !== undefined) out.elementType = updates.elementType
    if (updates.lengthFt !== undefined) out.lengthFt = updates.lengthFt
    if (updates.widthFt !== undefined) out.widthFt = updates.widthFt
    if (updates.linearFt !== undefined) out.linearFt = updates.linearFt
    if (updates.heightFt !== undefined) out.heightFt = updates.heightFt
    if (updates.depthIn !== undefined) out.depthIn = updates.depthIn
    onUpdate(out)
  }

  return (
    <ElementEditSheet
      element={sheetElement}
      onClose={onClose}
      onUpdate={handleSheetUpdate}
      onRemove={onRemove}
      onAddMaterial={handleAddMaterial}
      onRemoveMaterial={handleRemoveMaterial}
      addableMaterials={addableMaterials}
    />
  )
}

export default WizardElementEditSheet

// ── Helpers ────────────────────────────────────────────────────────────

function toProjectElementMaterial(m: WizardMaterial): ProjectElementMaterial {
  return {
    id: m.tempId,
    orgId: '',
    elementId: '',
    materialId: m.materialId,
    name: m.materialName,
    category: m.category,
    quantity: m.quantity,
    unit: m.unit,
    unitCost: m.unitCost,
    depthIn: null,
    notes: '',
    createdAt: '',
  }
}
