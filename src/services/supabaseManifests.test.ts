import { describe, it, expect } from 'vitest';
import { buildManifestInsert } from './supabaseManifests';
import type { ManifestResult } from '@/materials-engine/engine';

/**
 * supabaseManifests — pure builder tests.
 *
 * The Supabase-touching functions (snapshotManifestForProject,
 * fetchManifestsForProject, nextManifestVersion) are integration-level and
 * exercised by the contractor-walkthrough E2E. Here we just lock in the
 * shape of the row payload — column names match migration 026, JSONB
 * fields are arrays/objects (not stringified), version increments correctly.
 */

const sampleResult: ManifestResult = {
  lineItems: [
    {
      elementId: 'el-1',
      elementName: 'Patio',
      materialId: 'mat-1',
      materialName: 'Base Rock',
      category: 'gravel',
      computationModel: 'AREA_COVERAGE',
      rawQuantity: 8,
      wastePercent: 5,
      adjustedQuantity: 8.4,
      purchaseQuantity: 8.5,
      purchaseUnit: 'cubic_yard',
      unitCost: 50,
      lineCost: 425,
    },
  ],
  purchaseList: [
    {
      materialId: 'mat-1',
      materialName: 'Base Rock',
      category: 'gravel',
      totalRawQuantity: 8,
      totalAdjustedQuantity: 8.4,
      purchaseQuantity: 8.5,
      purchaseUnit: 'cubic_yard',
      unitCost: 50,
      totalCost: 425,
    },
  ],
  suggestedDependents: [],
  summary: {
    totalCost: 425,
    lineCount: 1,
    elementCount: 1,
    generatedAt: '2026-04-28T00:00:00.000Z',
  },
};

describe('buildManifestInsert', () => {
  it('produces a snake_case row payload matching the manifests migration schema', () => {
    const payload = buildManifestInsert({
      projectId: 'proj-uuid',
      orgId: 'org-uuid',
      version: 1,
      result: sampleResult,
      generatedBy: 'user-uuid',
    });

    // Column names from migration 026
    expect(payload).toMatchObject({
      project_id: 'proj-uuid',
      org_id: 'org-uuid',
      version: 1,
      generated_by: 'user-uuid',
    });
    // JSONB columns must be array/object — never stringified
    expect(Array.isArray(payload.line_items)).toBe(true);
    expect(Array.isArray(payload.purchase_list)).toBe(true);
    expect(typeof payload.summary).toBe('object');
    expect(payload.summary).not.toBeNull();
  });

  it('defaults generated_by to null when not supplied', () => {
    const payload = buildManifestInsert({
      projectId: 'proj-uuid',
      orgId: 'org-uuid',
      version: 1,
      result: sampleResult,
    });
    expect(payload.generated_by).toBeNull();
  });

  it('preserves the engine output verbatim — no quantity rounding or transformation', () => {
    const payload = buildManifestInsert({
      projectId: 'proj-uuid',
      orgId: 'org-uuid',
      version: 1,
      result: sampleResult,
    });
    // The whole point of a snapshot is the exact engine output frozen in
    // place; if we ever transform the data here, the audit trail breaks.
    expect(payload.line_items).toEqual(sampleResult.lineItems);
    expect(payload.purchase_list).toEqual(sampleResult.purchaseList);
    expect(payload.summary).toEqual(sampleResult.summary);
  });

  it('accepts arbitrary version numbers (caller computes via nextManifestVersion)', () => {
    expect(buildManifestInsert({
      projectId: 'p', orgId: 'o', version: 7, result: sampleResult,
    }).version).toBe(7);
    expect(buildManifestInsert({
      projectId: 'p', orgId: 'o', version: 100, result: sampleResult,
    }).version).toBe(100);
  });
});
