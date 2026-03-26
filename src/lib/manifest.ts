/**
 * Manifest Engine - Core calculation logic
 */

import type { Material, Zone, Project, ManifestItem } from '@/types';
import { RESERVE } from './constants';

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

export function generateManifest(project: Project, materials: Material[]): ManifestItem[] {
  const lineItems: ManifestItem[] = [];
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

  Object.values(matMap).forEach(({ mat, computed, zones }) => {
    const reservePct = getReservePct(mat);
    const reserveQty = computed * reservePct;
    const totalOrder = Math.ceil(computed + reserveQty);
    const subtotal = totalOrder * mat.cost;

    lineItems.push({
      materialId: mat.id,
      materialName: mat.name,
      zoneName: zones.join(', '),
      zoneId: '',
      qtyNeeded: computed,
      reserveQty: reserveQty,
      totalOrder: totalOrder,
      unitCost: mat.cost,
      subtotal: subtotal,
      unit: mat.unit,
    });
  });

  return lineItems;
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
