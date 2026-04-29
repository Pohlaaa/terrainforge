import { describe, it, expect } from 'vitest';
import type { Material, ProjectElement, ProjectElementMaterial } from '@/types';
import { computeElementMaterial, generateEngineManifest } from './engine';

/**
 * Sprint U: Tests for the engine itself — every computation model on a
 * representative element + the manifest aggregator (waste-before-rounding,
 * dedup across elements, dependent suggestions).
 *
 * Fixtures are minimal: tests build only the fields each path touches.
 */

// ── Builders ────────────────────────────────────────────────────────────────

function makeElement(overrides: Partial<ProjectElement> = {}): ProjectElement {
  return {
    id: overrides.id ?? 'el-1',
    orgId: 'org-1',
    projectId: 'proj-1',
    name: overrides.name ?? 'Test Element',
    elementType: overrides.elementType ?? 'patio',
    shape: overrides.shape ?? 'rectangle',
    radiusFt: overrides.radiusFt ?? null,
    lengthFt: overrides.lengthFt ?? null,
    widthFt: overrides.widthFt ?? null,
    areaSqft: overrides.areaSqft ?? null,
    linearFt: overrides.linearFt ?? null,
    heightFt: overrides.heightFt ?? null,
    depthIn: overrides.depthIn ?? null,
    computedAreaSqft: overrides.computedAreaSqft ?? 0,
    notes: '',
    sequence: 0,
    createdAt: '2026-04-28T00:00:00Z',
    materials: overrides.materials ?? [],
  };
}

function makeElMat(overrides: Partial<ProjectElementMaterial> = {}): ProjectElementMaterial {
  return {
    id: overrides.id ?? 'em-1',
    orgId: 'org-1',
    elementId: overrides.elementId ?? 'el-1',
    // Use property-presence check so callers can pass materialId: null explicitly
    // (ad-hoc element materials with no library link).
    materialId: 'materialId' in overrides ? overrides.materialId! : 'mat-1',
    name: overrides.name ?? 'Test Material',
    category: overrides.category ?? 'gravel',
    quantity: overrides.quantity ?? 0,
    unit: overrides.unit ?? 'cubic_yard',
    unitCost: overrides.unitCost ?? 0,
    depthIn: overrides.depthIn ?? null,
    notes: '',
    createdAt: '2026-04-28T00:00:00Z',
    spacingOverrideInches: overrides.spacingOverrideInches,
    wasteFactorOverride: overrides.wasteFactorOverride,
    manualCount: overrides.manualCount,
    wallLengthFt: overrides.wallLengthFt,
    wallHeightFt: overrides.wallHeightFt,
    computationModel: overrides.computationModel,
  };
}

function makeMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: overrides.id ?? 'mat-1',
    name: overrides.name ?? 'Test Material',
    category: overrides.category ?? 'gravel',
    unit: overrides.unit ?? 'cubic_yard',
    cost: overrides.cost ?? 0,
    reserveOverride: overrides.reserveOverride ?? null,
    coverage: overrides.coverage ?? null,
    depthIn: overrides.depthIn ?? null,
    notes: '',
    qtyOnHand: 0,
    minStockLevel: 0,
    storageLocation: '',
    lastRestocked: '',
    computationModel: overrides.computationModel,
    computeParams: overrides.computeParams,
    purchaseUnit: overrides.purchaseUnit,
    qtyPerPurchaseUnit: overrides.qtyPerPurchaseUnit,
    costPerPurchaseUnit: overrides.costPerPurchaseUnit,
    defaultWasteFactor: overrides.defaultWasteFactor,
    dependentMaterialIds: overrides.dependentMaterialIds,
  };
}

// ── computeElementMaterial: model-by-model ──────────────────────────────────

describe('computeElementMaterial — circles (migration 033)', () => {
  it('AREA_COVERAGE on a 10-ft-radius circle uses π × r²', () => {
    // π × 10² = 314.159 sqft. × 6" depth = 157.08 cuft = 5.818 cuyd.
    const element = makeElement({ shape: 'circle', radiusFt: 10 });
    const elMat = makeElMat({ depthIn: 6, category: 'gravel' });
    const cat = makeMaterial({
      computationModel: 'AREA_COVERAGE',
      purchaseUnit: 'cubic_yard',
      computeParams: {},
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(
      (Math.PI * 100 * 0.5) / 27,
      4,
    );
  });

  it('LINEAR on a circular element uses circumference (2πr)', () => {
    // Round garden bed, 8 ft radius, 4-ft edging units → 2π×8 / 4 = ~12.57.
    const element = makeElement({ shape: 'circle', radiusFt: 8, linearFt: null });
    const elMat = makeElMat({ category: 'edging' });
    const cat = makeMaterial({
      computationModel: 'LINEAR',
      computeParams: { length_per_unit_ft: 4 },
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(
      (2 * Math.PI * 8) / 4,
      4,
    );
  });

  it('falls back to rectangle math when shape=circle but radius is missing', () => {
    // Defensive: an in-progress wizard row could land here mid-edit.
    const element = makeElement({
      shape: 'circle',
      radiusFt: null,
      lengthFt: 10,
      widthFt: 10,
      computedAreaSqft: 100,
    });
    const elMat = makeElMat({ depthIn: 6, category: 'gravel' });
    const cat = makeMaterial({
      computationModel: 'AREA_COVERAGE',
      purchaseUnit: 'cubic_yard',
      computeParams: {},
    });
    // 100 sqft × 6" / 27 ≈ 1.852
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(
      (100 * 0.5) / 27,
      4,
    );
  });

  it('rectangle math still works when shape is omitted (back-compat)', () => {
    const element = makeElement({
      // Note: no `shape` override — uses the builder default 'rectangle'.
      lengthFt: 24,
      widthFt: 18,
      computedAreaSqft: 432,
    });
    const elMat = makeElMat({ depthIn: 6, category: 'gravel' });
    const cat = makeMaterial({
      computationModel: 'AREA_COVERAGE',
      purchaseUnit: 'cubic_yard',
      computeParams: {},
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(8, 5);
  });
});

describe('computeElementMaterial — AREA_COVERAGE', () => {
  it('432-sqft patio × 6" gravel base → 8 cuyd raw', () => {
    const element = makeElement({ computedAreaSqft: 432 });
    const elMat = makeElMat({ depthIn: 6, unit: 'cubic_yard' });
    const cat = makeMaterial({
      computationModel: 'AREA_COVERAGE',
      purchaseUnit: 'cubic_yard',
      computeParams: {},
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(8, 5);
  });

  it('uses category min depth when none specified (gravel → 6")', () => {
    const element = makeElement({ computedAreaSqft: 324 });
    const elMat = makeElMat({ depthIn: null, category: 'gravel' });
    const cat = makeMaterial({
      computationModel: 'AREA_COVERAGE',
      purchaseUnit: 'cubic_yard',
      computeParams: {},
    });
    // 324 sqft × 6/12 ft / 27 = 6 cuyd
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(6, 5);
  });

  it('falls back to lengthFt × widthFt when computedAreaSqft is 0', () => {
    const element = makeElement({ lengthFt: 24, widthFt: 18, computedAreaSqft: 0 });
    const elMat = makeElMat({ depthIn: 6, category: 'gravel' });
    const cat = makeMaterial({
      computationModel: 'AREA_COVERAGE',
      purchaseUnit: 'cubic_yard',
      computeParams: {},
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(8, 5);
  });
});

describe('computeElementMaterial — UNIT_COVERAGE (pavers, sod)', () => {
  it('432-sqft patio with paver coverage 0.65 sqft/each → ~664', () => {
    const element = makeElement({ computedAreaSqft: 432 });
    const elMat = makeElMat({ category: 'paver' });
    const cat = makeMaterial({
      computationModel: 'UNIT_COVERAGE',
      purchaseUnit: 'each',
      computeParams: { coverage_sqft_per_unit: 0.65 },
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(664.6153, 2);
  });

  it('zero coverage returns 0 (defensive)', () => {
    const element = makeElement({ computedAreaSqft: 432 });
    const elMat = makeElMat();
    const cat = makeMaterial({
      computationModel: 'UNIT_COVERAGE',
      computeParams: { coverage_sqft_per_unit: 0 },
    });
    expect(computeElementMaterial(element, elMat, cat)).toBe(0);
  });
});

describe('computeElementMaterial — LINEAR (edging, border stone)', () => {
  it('100 ft of edging in 6-ft units → ~16.67 raw', () => {
    const element = makeElement({ linearFt: 100 });
    const elMat = makeElMat({ category: 'edging' });
    const cat = makeMaterial({
      computationModel: 'LINEAR',
      purchaseUnit: 'each',
      computeParams: { length_per_unit_ft: 6 },
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(100 / 6, 5);
  });

  it('falls back to perimeter (length×2 + width×2) when linearFt missing', () => {
    const element = makeElement({ linearFt: null, lengthFt: 10, widthFt: 5 });
    const elMat = makeElMat();
    const cat = makeMaterial({
      computationModel: 'LINEAR',
      computeParams: { length_per_unit_ft: 5 },
    });
    // perimeter = 30 ft / 5 = 6
    expect(computeElementMaterial(element, elMat, cat)).toBe(6);
  });
});

describe('computeElementMaterial — POINT_SPACING (plants)', () => {
  it('manual count overrides spacing math', () => {
    const element = makeElement({ computedAreaSqft: 200 });
    const elMat = makeElMat({ manualCount: 8 });
    const cat = makeMaterial({
      computationModel: 'POINT_SPACING',
      computeParams: { spacing_inches: 24 },
    });
    expect(computeElementMaterial(element, elMat, cat)).toBe(8);
  });

  it('falls back to grid spacing from catalog when no manual count', () => {
    const element = makeElement({ computedAreaSqft: 100 });
    const elMat = makeElMat();
    const cat = makeMaterial({
      computationModel: 'POINT_SPACING',
      computeParams: { spacing_inches: 24 },
    });
    // 100 sqft / 4 sqft per cell = 25
    expect(computeElementMaterial(element, elMat, cat)).toBe(25);
  });

  it('per-element spacing override wins over catalog default', () => {
    const element = makeElement({ computedAreaSqft: 100 });
    const elMat = makeElMat({ spacingOverrideInches: 36 });
    const cat = makeMaterial({
      computationModel: 'POINT_SPACING',
      computeParams: { spacing_inches: 24 },
    });
    // 100 sqft / 9 sqft per cell = 11.11 → ceil 12
    expect(computeElementMaterial(element, elMat, cat)).toBe(12);
  });
});

describe('computeElementMaterial — LINEAR_DEPTH (retaining wall)', () => {
  it('20 ft × 3 ft wall with 0.5 sqft block face → 120 blocks', () => {
    const element = makeElement({ linearFt: 20, heightFt: 3 });
    const elMat = makeElMat({ category: 'stone' });
    const cat = makeMaterial({
      computationModel: 'LINEAR_DEPTH',
      computeParams: { face_area_sqft_per_unit: 0.5 },
    });
    expect(computeElementMaterial(element, elMat, cat)).toBe(120);
  });

  it('per-element wall override wins over element dimensions', () => {
    const element = makeElement({ linearFt: 20, heightFt: 3 });
    const elMat = makeElMat({ wallLengthFt: 30, wallHeightFt: 4 });
    const cat = makeMaterial({
      computationModel: 'LINEAR_DEPTH',
      computeParams: { face_area_sqft_per_unit: 0.5 },
    });
    // 30 × 4 / 0.5 = 240
    expect(computeElementMaterial(element, elMat, cat)).toBe(240);
  });

  it('default wall height 2ft when neither element nor override supply one', () => {
    const element = makeElement({ linearFt: 10, heightFt: null });
    const elMat = makeElMat();
    const cat = makeMaterial({
      computationModel: 'LINEAR_DEPTH',
      computeParams: { face_area_sqft_per_unit: 0.5 },
    });
    // 10 × 2 / 0.5 = 40
    expect(computeElementMaterial(element, elMat, cat)).toBe(40);
  });
});

describe('computeElementMaterial — SUBSTRATE (landscape fabric)', () => {
  it('300-sqft area × 1.1 overlap / 300-sqft roll = 1.1 rolls raw', () => {
    const element = makeElement({ computedAreaSqft: 300 });
    const elMat = makeElMat({ category: 'misc' });
    const cat = makeMaterial({
      computationModel: 'SUBSTRATE',
      computeParams: { overlap_factor: 0.1, coverage_sqft_per_unit: 300 },
    });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(1.1, 5);
  });

  it('uses default 10% overlap and 300 sqft per roll when params absent', () => {
    const element = makeElement({ computedAreaSqft: 300 });
    const elMat = makeElMat();
    const cat = makeMaterial({ computationModel: 'SUBSTRATE', computeParams: {} });
    expect(computeElementMaterial(element, elMat, cat)).toBeCloseTo(1.1, 5);
  });
});

// ── generateEngineManifest: end-to-end ──────────────────────────────────────

describe('generateEngineManifest', () => {
  it('aggregates raw quantities BEFORE rounding (rule #1)', () => {
    // Two patio elements that each consume the same base rock material.
    // Per-element raw: 100 sqft × 6" / 27 = 1.851... cuyd each.
    // If we summed per-element rounded purchases, each would round to 2 cuyd
    // → 4 cuyd total. Correct behaviour: sum raw (3.703) → +5% waste (3.888)
    // → round to 4 cuyd. The test guards against the historical bug where
    // we double-bought because we rounded per-element.
    const elA = makeElement({
      id: 'el-A',
      computedAreaSqft: 100,
      materials: [
        makeElMat({
          id: 'em-A',
          elementId: 'el-A',
          materialId: 'mat-base',
          category: 'gravel',
          unit: 'cubic_yard',
          depthIn: 6,
        }),
      ],
    });
    const elB = makeElement({
      id: 'el-B',
      computedAreaSqft: 100,
      materials: [
        makeElMat({
          id: 'em-B',
          elementId: 'el-B',
          materialId: 'mat-base',
          category: 'gravel',
          unit: 'cubic_yard',
          depthIn: 6,
        }),
      ],
    });
    const cat = [
      makeMaterial({
        id: 'mat-base',
        name: 'Base Rock',
        category: 'gravel',
        computationModel: 'AREA_COVERAGE',
        purchaseUnit: 'cubic_yard',
        computeParams: {},
        defaultWasteFactor: 0.05,
        costPerPurchaseUnit: 50,
      }),
    ];
    const result = generateEngineManifest([elA, elB], cat);

    expect(result.purchaseList).toHaveLength(1);
    const line = result.purchaseList[0];
    expect(line.materialId).toBe('mat-base');
    // Total raw ≈ 3.7037, +5% = 3.888..., bulk rounds to nearest 0.5 → 4
    expect(line.totalRawQuantity).toBeCloseTo(2 * (100 * 0.5) / 27, 4);
    expect(line.purchaseQuantity).toBe(4);
    expect(line.totalCost).toBe(200);
  });

  it('per-element line items survive aggregation (still 2 line items, 1 purchase row)', () => {
    const elA = makeElement({
      id: 'el-A',
      computedAreaSqft: 100,
      materials: [makeElMat({ id: 'em-A', elementId: 'el-A', materialId: 'mat-1', category: 'gravel', depthIn: 6 })],
    });
    const elB = makeElement({
      id: 'el-B',
      computedAreaSqft: 100,
      materials: [makeElMat({ id: 'em-B', elementId: 'el-B', materialId: 'mat-1', category: 'gravel', depthIn: 6 })],
    });
    const cat = [
      makeMaterial({
        id: 'mat-1',
        computationModel: 'AREA_COVERAGE',
        purchaseUnit: 'cubic_yard',
        computeParams: {},
      }),
    ];
    const result = generateEngineManifest([elA, elB], cat);
    expect(result.lineItems).toHaveLength(2);
    expect(result.purchaseList).toHaveLength(1);
    expect(result.summary.elementCount).toBe(2);
    expect(result.summary.lineCount).toBe(2);
  });

  it('skips elements with no materials', () => {
    const empty = makeElement({ id: 'el-empty', computedAreaSqft: 100, materials: [] });
    const result = generateEngineManifest([empty], []);
    expect(result.lineItems).toHaveLength(0);
    expect(result.purchaseList).toHaveLength(0);
  });

  it('skips lines that compute to zero (e.g. zero coverage param)', () => {
    const el = makeElement({
      id: 'el-bad',
      computedAreaSqft: 100,
      materials: [makeElMat({ materialId: 'mat-bad', category: 'paver' })],
    });
    const cat = [
      makeMaterial({
        id: 'mat-bad',
        computationModel: 'UNIT_COVERAGE',
        purchaseUnit: 'each',
        computeParams: { coverage_sqft_per_unit: 0 }, // would yield 0
      }),
    ];
    const result = generateEngineManifest([el], cat);
    expect(result.lineItems).toHaveLength(0);
  });

  it('surfaces dependent material IDs that are NOT already in the project', () => {
    const el = makeElement({
      id: 'el-1',
      computedAreaSqft: 100,
      materials: [makeElMat({ materialId: 'mat-paver', category: 'paver' })],
    });
    const paver = makeMaterial({
      id: 'mat-paver',
      computationModel: 'UNIT_COVERAGE',
      purchaseUnit: 'each',
      computeParams: { coverage_sqft_per_unit: 1 },
      dependentMaterialIds: ['mat-sand', 'mat-base'],
    });
    const result = generateEngineManifest([el], [paver]);
    expect(result.suggestedDependents).toEqual(expect.arrayContaining(['mat-sand', 'mat-base']));
  });

  it('does NOT suggest dependents that are already in the project', () => {
    const el = makeElement({
      id: 'el-1',
      computedAreaSqft: 100,
      materials: [
        makeElMat({ id: 'em-1', materialId: 'mat-paver', category: 'paver' }),
        makeElMat({ id: 'em-2', materialId: 'mat-sand', category: 'sand', depthIn: 1 }),
      ],
    });
    const cat = [
      makeMaterial({
        id: 'mat-paver',
        computationModel: 'UNIT_COVERAGE',
        purchaseUnit: 'each',
        computeParams: { coverage_sqft_per_unit: 1 },
        dependentMaterialIds: ['mat-sand', 'mat-base'],
      }),
      makeMaterial({
        id: 'mat-sand',
        category: 'sand',
        computationModel: 'AREA_COVERAGE',
        purchaseUnit: 'cubic_yard',
        computeParams: {},
      }),
    ];
    const result = generateEngineManifest([el], cat);
    // mat-sand already linked → not suggested. mat-base has no dependent material in catalog,
    // but it should still be suggested because it's not in the project.
    expect(result.suggestedDependents).toContain('mat-base');
    expect(result.suggestedDependents).not.toContain('mat-sand');
  });

  it('per-element wasteFactorOverride wins over catalog defaultWasteFactor', () => {
    const el = makeElement({
      id: 'el-1',
      computedAreaSqft: 324, // → 6 cuyd raw at 6" depth
      materials: [
        makeElMat({
          materialId: 'mat-1',
          category: 'gravel',
          depthIn: 6,
          wasteFactorOverride: 0.2, // 20% — partner needs extra
        }),
      ],
    });
    const cat = [
      makeMaterial({
        id: 'mat-1',
        computationModel: 'AREA_COVERAGE',
        purchaseUnit: 'cubic_yard',
        computeParams: {},
        defaultWasteFactor: 0.05,
      }),
    ];
    const result = generateEngineManifest([el], cat);
    const line = result.lineItems[0];
    expect(line.wastePercent).toBe(20);
    expect(line.adjustedQuantity).toBeCloseTo(7.2, 5); // 6 × 1.2
    expect(line.purchaseQuantity).toBe(7.5); // bulk rounds to 0.5
  });

  it('falls back to elMat.id when materialId is null (ad-hoc element material)', () => {
    const el = makeElement({
      id: 'el-1',
      computedAreaSqft: 100,
      materials: [
        makeElMat({
          id: 'em-adhoc',
          materialId: null,
          name: 'Custom Aggregate',
          category: 'gravel',
          depthIn: 6,
          unit: 'cubic_yard',
          unitCost: 75,
        }),
      ],
    });
    // No catalog row — engine should still produce a line item via elMat fallbacks.
    const result = generateEngineManifest([el], []);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].materialId).toBe('em-adhoc');
    expect(result.lineItems[0].materialName).toBe('Custom Aggregate');
  });

  it('returns empty result for empty input', () => {
    const result = generateEngineManifest([], []);
    expect(result.lineItems).toHaveLength(0);
    expect(result.purchaseList).toHaveLength(0);
    expect(result.suggestedDependents).toHaveLength(0);
    expect(result.summary.totalCost).toBe(0);
    expect(result.summary.elementCount).toBe(0);
  });
});
