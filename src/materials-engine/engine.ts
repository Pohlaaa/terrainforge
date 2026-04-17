/**
 * Materials Engine — Core computation with 6 models.
 *
 * Pure functions: no side effects, no Supabase calls.
 * Input: elements + materials catalog → Output: manifest
 */

import type { Material, ProjectElement, ProjectElementMaterial, ComputationModel } from '@/types';
import {
  areaToCuyd, cuydToTons, applyWaste, roundToPurchaseUnit,
  gridCount, wallBlockCount, getEffectiveDepth,
} from './unit-conversions';

// ── Result Types ────────────────────────────────────────────────────────────

export interface LineItem {
  elementId: string;
  elementName: string;
  materialId: string;
  materialName: string;
  category: string;
  computationModel: string;
  rawQuantity: number;
  wastePercent: number;
  adjustedQuantity: number;
  purchaseQuantity: number;
  purchaseUnit: string;
  unitCost: number;
  lineCost: number;
}

export interface PurchaseLine {
  materialId: string;
  materialName: string;
  category: string;
  totalRawQuantity: number;
  totalAdjustedQuantity: number;
  purchaseQuantity: number;
  purchaseUnit: string;
  unitCost: number;
  totalCost: number;
}

export interface ManifestResult {
  lineItems: LineItem[];
  purchaseList: PurchaseLine[];
  suggestedDependents: string[];
  summary: {
    totalCost: number;
    lineCount: number;
    elementCount: number;
    generatedAt: string;
  };
}

// ── Single Material Computation ─────────────────────────────────────────────

/**
 * Compute raw quantity for one material on one element.
 * Uses the material's computation model to pick the right formula.
 */
export function computeElementMaterial(
  element: ProjectElement,
  elMat: ProjectElementMaterial,
  catalogMat: Material | undefined,
): number {
  const model: ComputationModel = (elMat.computationModel || catalogMat?.computationModel || 'AREA_COVERAGE') as ComputationModel;
  const params = catalogMat?.computeParams ?? {};
  const area = element.computedAreaSqft || (element.lengthFt && element.widthFt ? element.lengthFt * element.widthFt : element.areaSqft ?? 0);
  const linearFt = element.linearFt ?? 0;

  switch (model) {
    case 'AREA_COVERAGE': {
      // area × depth → volume (cuyd or tons)
      const depth = elMat.depthIn ?? params.depth_inches ?? getEffectiveDepth(catalogMat?.depthIn, elMat.category);
      const cuyd = areaToCuyd(area, depth);
      const pu = catalogMat?.purchaseUnit ?? elMat.unit;
      if (pu === 'ton') return cuydToTons(cuyd, params.coverage_sqft_per_unit ?? 1.5);
      return cuyd;
    }

    case 'UNIT_COVERAGE': {
      // area / coverage_per_unit
      const coverage = params.coverage_sqft_per_unit ?? catalogMat?.coverage ?? 1;
      if (coverage <= 0) return 0;
      return area / coverage;
    }

    case 'LINEAR': {
      // linear_ft / length_per_unit
      const lengthPerUnit = params.length_per_unit_ft ?? 1;
      const lin = linearFt || (element.lengthFt ? element.lengthFt * 2 + (element.widthFt ?? 0) * 2 : 0);
      if (lengthPerUnit <= 0) return 0;
      return lin / lengthPerUnit;
    }

    case 'POINT_SPACING': {
      // manual count OR grid spacing
      if (elMat.manualCount && elMat.manualCount > 0) return elMat.manualCount;
      const spacing = elMat.spacingOverrideInches ?? params.spacing_inches ?? 36;
      return gridCount(area, spacing);
    }

    case 'LINEAR_DEPTH': {
      // wall: length × height / face_area_per_unit
      const wallLen = elMat.wallLengthFt ?? (linearFt || element.lengthFt || 0);
      const wallH = elMat.wallHeightFt ?? (element.heightFt || 2);
      const faceArea = params.face_area_sqft_per_unit ?? 0.5;
      return wallBlockCount(wallLen, wallH, faceArea);
    }

    case 'SUBSTRATE': {
      // area × (1 + overlap) / coverage_per_roll
      const overlap = params.overlap_factor ?? 0.1;
      const coveragePerRoll = params.coverage_sqft_per_unit ?? 300;
      return (area * (1 + overlap)) / coveragePerRoll;
    }

    default:
      return 0;
  }
}

// ── Full Manifest Generation ────────────────────────────────────────────────

/**
 * Generate a complete manifest from project elements and material catalog.
 * Computes per-element line items, then aggregates into a purchase list.
 */
export function generateEngineManifest(
  elements: ProjectElement[],
  catalog: Material[],
): ManifestResult {
  const lineItems: LineItem[] = [];
  const dependentIds = new Set<string>();

  for (const element of elements) {
    if (!element.materials?.length) continue;

    for (const elMat of element.materials) {
      const catalogMat = catalog.find(m => m.id === elMat.materialId);
      const model = elMat.computationModel || catalogMat?.computationModel || 'AREA_COVERAGE';
      const wasteFactor = elMat.wasteFactorOverride ?? catalogMat?.defaultWasteFactor ?? catalogMat?.reserveOverride ?? 0.05;
      const unitCost = catalogMat?.costPerPurchaseUnit ?? elMat.unitCost ?? catalogMat?.cost ?? 0;
      const purchaseUnit = catalogMat?.purchaseUnit ?? elMat.unit ?? 'each';

      const rawQty = computeElementMaterial(element, elMat, catalogMat);
      if (rawQty <= 0) continue;

      const adjustedQty = applyWaste(rawQty, wasteFactor);
      const purchaseQty = roundToPurchaseUnit(adjustedQty, purchaseUnit);
      const lineCost = purchaseQty * unitCost;

      lineItems.push({
        elementId: element.id,
        elementName: element.name,
        materialId: elMat.materialId,
        materialName: elMat.name,
        category: elMat.category,
        computationModel: model,
        rawQuantity: rawQty,
        wastePercent: wasteFactor * 100,
        adjustedQuantity: adjustedQty,
        purchaseQuantity: purchaseQty,
        purchaseUnit,
        unitCost,
        lineCost,
      });

      // Collect dependent material suggestions
      if (catalogMat?.dependentMaterialIds?.length) {
        for (const depId of catalogMat.dependentMaterialIds) {
          dependentIds.add(depId);
        }
      }
    }
  }

  // Aggregate purchase list — re-compute from combined raw totals (not summing rounded values)
  const purchaseMap = new Map<string, { raw: number; waste: number; matName: string; cat: string; pu: string; cost: number }>();
  for (const item of lineItems) {
    const key = item.materialId;
    const existing = purchaseMap.get(key);
    if (existing) {
      existing.raw += item.rawQuantity;
    } else {
      purchaseMap.set(key, {
        raw: item.rawQuantity,
        waste: item.wastePercent / 100,
        matName: item.materialName,
        cat: item.category,
        pu: item.purchaseUnit,
        cost: item.unitCost,
      });
    }
  }

  const purchaseList: PurchaseLine[] = [...purchaseMap.entries()].map(([matId, data]) => {
    const adjusted = applyWaste(data.raw, data.waste);
    const purchaseQty = roundToPurchaseUnit(adjusted, data.pu);
    return {
      materialId: matId,
      materialName: data.matName,
      category: data.cat,
      totalRawQuantity: data.raw,
      totalAdjustedQuantity: adjusted,
      purchaseQuantity: purchaseQty,
      purchaseUnit: data.pu,
      unitCost: data.cost,
      totalCost: purchaseQty * data.cost,
    };
  });

  const totalCost = purchaseList.reduce((s, p) => s + p.totalCost, 0);
  const elementCount = new Set(lineItems.map(i => i.elementId)).size;

  // Remove materials already in the project from suggested dependents
  const existingMatIds = new Set(lineItems.map(i => i.materialId));
  const suggestedDependents = [...dependentIds].filter(id => !existingMatIds.has(id));

  return {
    lineItems,
    purchaseList,
    suggestedDependents,
    summary: {
      totalCost,
      lineCount: lineItems.length,
      elementCount,
      generatedAt: new Date().toISOString(),
    },
  };
}
