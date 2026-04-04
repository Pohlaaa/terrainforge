/**
 * Manifest Engine - Core calculation logic
 *
 * Supports two material sources:
 * 1. Project-level materials (project.materials JSONB) — primary, used by wizard-created projects
 * 2. Zone-level materials (project.zones[].materials[]) — legacy, computed from zone geometry
 *
 * If project.materials has entries, those are used directly (quantities are already known).
 * Otherwise falls back to zone-based calculation for backward compatibility.
 */

import type { Material, Zone, Project, ManifestItem, SupplierPrice } from '@/types';
import { RESERVE } from './constants';
import { normalizeCategory } from './categories';

export function computeQty(mat: Material, zone: Zone): number {
  const area = zone.area;
  const perim = zone.perimeter || 0;

  if (mat.unit === 'sqft') return area;
  if (mat.unit === 'sqyd') return area / 9;
  if (mat.unit === 'lnft') return perim;

  if (mat.unit === 'each') {
    if (mat.coverage && mat.coverage > 0) return Math.ceil(area / mat.coverage);
    return 1;
  }

  if (mat.unit === 'bag') {
    if (mat.depthIn) {
      const cuft = area * (mat.depthIn / 12);
      const cuftPerBag = mat.coverage || 2;
      return Math.ceil(cuft / cuftPerBag);
    }
    const cov = mat.coverage || 50;
    return Math.ceil(area / cov);
  }

  if (mat.unit === 'cuyd') {
    const depth = mat.depthIn || 3;
    return (area * (depth / 12)) / 27;
  }

  if (mat.unit === 'ton') {
    const depth = mat.depthIn || 3;
    const cuyd = (area * (depth / 12)) / 27;
    const density = mat.coverage || 1.5;
    return cuyd * density;
  }

  return 0;
}

export function getReservePct(mat: Material): number {
  if (mat.reserveOverride !== null && mat.reserveOverride !== undefined) return mat.reserveOverride;
  const categoryReserve = RESERVE[mat.category as keyof typeof RESERVE];
  return categoryReserve ?? 0.1;
}

/**
 * Generate a manifest from project-level materials (JSONB).
 * Quantities come directly from the stored entries. Reserve % is applied
 * using the library material's category if found, otherwise defaults to 10%.
 */
function generateFromProjectMaterials(
  project: Project,
  libraryMaterials: Material[],
  supplierPrices?: SupplierPrice[]
): ManifestItem[] {
  return project.materials.map((pm) => {
    // Try to find the library material for reserve % and supplier pricing
    const libMat = libraryMaterials.find((m) => m.id === pm.materialId);
    const reservePct = libMat ? getReservePct(libMat) : 0.10;
    const reserveQty = pm.quantity * reservePct;
    const totalOrder = Math.ceil(pm.quantity + reserveQty);

    // Resolve unit cost: preferred supplier → project entry cost → library cost
    const preferredPrice = supplierPrices?.find(
      (sp) => sp.materialId === pm.materialId && sp.isPreferred
    );
    const unitCost = preferredPrice?.unitCost ?? pm.unitCost;
    const subtotal = totalOrder * unitCost;

    return {
      materialId: pm.materialId,
      materialName: pm.name,
      zoneName: 'Project',
      zoneId: '',
      qtyNeeded: pm.quantity,
      reserveQty,
      totalOrder,
      unitCost,
      subtotal,
      unit: pm.unit,
      category: normalizeCategory(pm.category),
      supplierId: preferredPrice?.supplierId ?? null,
      supplierName: preferredPrice?.supplierName ?? null,
    };
  });
}

/**
 * @deprecated Generate manifest from zone-level materials (legacy path).
 * Quantities are computed from zone geometry.
 * Kept for backward compat with pre-wizard projects. New projects use project.materials (JSONB).
 */
function generateFromZoneMaterials(
  project: Project,
  materials: Material[],
  supplierPrices?: SupplierPrice[]
): ManifestItem[] {
  const matMap: Record<string, { mat: Material; computed: number; zones: string[] }> = {};

  project.zones.forEach((zone) => {
    zone.materials.forEach((zm) => {
      const mat = materials.find((m) => m.id === zm.materialId);
      if (!mat) return;

      if (!matMap[mat.id]) {
        matMap[mat.id] = { mat, computed: 0, zones: [] };
      }

      const qty = computeQty(mat, zone);
      matMap[mat.id].computed += qty;
      matMap[mat.id].zones.push(zone.name);
    });
  });

  return Object.values(matMap).map(({ mat, computed, zones }) => {
    const reservePct = getReservePct(mat);
    const reserveQty = computed * reservePct;
    const totalOrder = Math.ceil(computed + reserveQty);

    const preferredPrice = supplierPrices?.find(
      (sp) => sp.materialId === mat.id && sp.isPreferred
    );
    const unitCost = preferredPrice?.unitCost ?? mat.cost;
    const subtotal = totalOrder * unitCost;

    return {
      materialId: mat.id,
      materialName: mat.name,
      zoneName: zones.join(', '),
      zoneId: '',
      qtyNeeded: computed,
      reserveQty,
      totalOrder,
      unitCost,
      subtotal,
      unit: mat.unit,
      category: normalizeCategory(mat.category),
      supplierId: preferredPrice?.supplierId ?? null,
      supplierName: preferredPrice?.supplierName ?? null,
    };
  });
}

export function generateManifest(
  project: Project,
  materials: Material[],
  supplierPrices?: SupplierPrice[]
): ManifestItem[] {
  // Primary path: project-level materials (wizard-created projects)
  if (project.materials && project.materials.length > 0) {
    return generateFromProjectMaterials(project, materials, supplierPrices);
  }

  // Legacy path: zone-based calculation
  return generateFromZoneMaterials(project, materials, supplierPrices);
}

export function computeProjectCostRaw(project: Project, materials: Material[]): number {
  let total = 0;
  const manifest = generateManifest(project, materials);
  manifest.forEach((item) => {
    total += item.subtotal || 0;
  });
  return total;
}

export function computeProjectCostFormatted(project: Project, materials: Material[]): string {
  const total = computeProjectCostRaw(project, materials);
  if (total === 0) return '—';
  return '$' + total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
