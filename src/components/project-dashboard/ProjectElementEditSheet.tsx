/**
 * ProjectElementEditSheet — project-dashboard adapter for the touch-first
 * ElementEditSheet.
 *
 * Counterpart to `WizardElementEditSheet`: maps the post-create
 * `ProjectElement` shape into the generic `SheetElement`. Persists
 * changes via `projectStore.updateElement` (dimensions/name) +
 * `addElementMaterial` / `removeElementMaterial` (materials). Per-
 * element cost computed via the materials engine using the actual
 * `ProjectElement` (no synthesis needed).
 *
 * Mobile-only render (`md:hidden` in the sheet itself); desktop keeps
 * the existing OverviewTab inline editor + MaterialPicker modal.
 */

import React, { useMemo } from 'react'
import {
  ElementEditSheet,
  type SheetElement,
  type SheetMaterial,
  type SheetAddableMaterial,
} from '@/components/shared/ElementEditSheet'
import { useMaterialStore } from '@/stores/materialStore'
import { useProjectStore } from '@/stores/projectStore'
import { generateEngineManifest } from '@/materials-engine/engine'
import { getElementTypesForMaterial } from '@/lib/elements'
import { applyDimensionEditToGeometry } from '@/lib/planLayout'
import type { ProjectElement, ProjectElementMaterial, MaterialCategory } from '@/types'

interface Props {
  element: ProjectElement | null
  orgId: string
  onClose: () => void
}

export const ProjectElementEditSheet: React.FC<Props> = ({ element, orgId, onClose }) => {
  const orgCatalog = useMaterialStore((s) => s.materials)
  const updateElement = useProjectStore((s) => s.updateElement)
  const deleteElement = useProjectStore((s) => s.deleteElement)
  const addElementMaterial = useProjectStore((s) => s.addElementMaterial)
  const removeElementMaterial = useProjectStore((s) => s.removeElementMaterial)

  const sheetElement = useMemo<SheetElement | null>(() => {
    if (!element) return null

    const manifest = generateEngineManifest([element], orgCatalog)
    const lineByMaterial = new Map(manifest.lineItems.map((li) => [li.materialId, li]))

    const materials: SheetMaterial[] = element.materials.map((m) => {
      const li = lineByMaterial.get(m.materialId ?? m.id)
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        quantity: li?.purchaseQuantity ?? m.quantity,
        unit: li?.purchaseUnit ?? m.unit,
        unitCost: li?.unitCost ?? m.unitCost,
        lineCost: li?.lineCost ?? m.quantity * m.unitCost,
      }
    })

    return {
      id: element.id,
      name: element.name,
      elementType: element.elementType,
      lengthFt: element.lengthFt,
      widthFt: element.widthFt,
      linearFt: element.linearFt,
      heightFt: element.heightFt,
      depthIn: element.depthIn,
      materials,
      estimatedCost: manifest.summary.totalCost,
    }
  }, [element, orgCatalog])

  const addableMaterials = useMemo<SheetAddableMaterial[]>(() => {
    if (!element) return []
    const alreadyAdded = new Set(
      element.materials.map((m) => (m.materialId ?? m.name).toLowerCase()),
    )
    return orgCatalog
      .filter((m) => getElementTypesForMaterial(m.category, m.name).includes(element.elementType))
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
  }, [element, orgCatalog])

  if (!sheetElement || !element) return null

  function handleSheetUpdate(updates: Partial<SheetElement>) {
    if (!element) return
    const out: Partial<ProjectElement> = {}
    if (updates.name !== undefined) out.name = updates.name
    if (updates.elementType !== undefined) out.elementType = updates.elementType
    if (updates.lengthFt !== undefined) out.lengthFt = updates.lengthFt
    if (updates.widthFt !== undefined) out.widthFt = updates.widthFt
    if (updates.linearFt !== undefined) out.linearFt = updates.linearFt
    if (updates.heightFt !== undefined) out.heightFt = updates.heightFt
    if (updates.depthIn !== undefined) out.depthIn = updates.depthIn

    // F-PLAC-04: dimension edits via the sheet must propagate to
    // geometry.shape so the 2D + 3D canvas re-renders at the new size,
    // re-anchored at the visual center so resizing doesn't drift SE.
    const recentered = applyDimensionEditToGeometry(
      element.geometry,
      {
        lengthFt: element.lengthFt,
        widthFt: element.widthFt,
        linearFt: element.linearFt,
      },
      {
        lengthFt: updates.lengthFt,
        widthFt: updates.widthFt,
        linearFt: updates.linearFt,
      },
    )
    if (recentered) out.geometry = recentered

    updateElement(element.id, out)
  }

  function handleAddMaterial(m: SheetAddableMaterial) {
    if (!element || !orgId) return
    const elMat: Omit<ProjectElementMaterial, 'id' | 'createdAt'> = {
      orgId,
      elementId: element.id,
      materialId: m.source === 'library' ? m.id : null,
      name: m.name,
      category: m.category as MaterialCategory,
      quantity: 1,
      unit: m.unit,
      unitCost: m.unitCost,
      depthIn: null,
      notes: '',
    }
    addElementMaterial(element.id, elMat, orgId)
  }

  async function handleRemoveMaterial(materialId: string) {
    if (!element) return
    await removeElementMaterial(element.id, materialId)
  }

  function handleRemoveElement() {
    if (!element) return
    deleteElement(element.id)
    onClose()
  }

  return (
    <ElementEditSheet
      element={sheetElement}
      onClose={onClose}
      onUpdate={handleSheetUpdate}
      onRemove={handleRemoveElement}
      onAddMaterial={handleAddMaterial}
      onRemoveMaterial={handleRemoveMaterial}
      addableMaterials={addableMaterials}
    />
  )
}

export default ProjectElementEditSheet
