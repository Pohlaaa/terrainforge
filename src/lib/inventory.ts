/**
 * Inventory Management
 */

import type { Material, Project } from '@/types';
import { generateManifest } from './manifest';

export function getMatAllocated(materialId: string, projects: Project[]): number {
  let total = 0;

  (projects || []).forEach((p) => {
    const manifest = generateManifest(p, []);
    const item = manifest.find((i) => i.materialId === materialId);
    if (item) total += item.totalOrder || 0;
  });

  return total;
}

export function getAvailable(material: Material, projects: Project[]): number | null {
  if (material.qtyOnHand === undefined) return null;
  const allocated = getMatAllocated(material.id, projects);
  return material.qtyOnHand - allocated;
}

export function isLowStock(material: Material): boolean {
  if (material.qtyOnHand === undefined) return false;
  if (material.minStockLevel === undefined) return false;
  return material.qtyOnHand <= material.minStockLevel;
}

export function hasShortfall(material: Material, projects: Project[]): boolean {
  const available = getAvailable(material, projects);
  return available !== null && available < 0;
}
