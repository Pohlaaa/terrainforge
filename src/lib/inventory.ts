/**
 * Inventory Management
 */

import type { Material, Project, ProjectMaterial } from '@/types';
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

/**
 * Calculate inventory decrements for a project's materials.
 * Returns a list of decrements showing material ID, name, quantity to decrement,
 * current stock, and projected new stock after allocation.
 * Only includes materials that exist in the library (have a materialId match).
 */
export function calculateInventoryDecrements(
  projectMaterials: ProjectMaterial[],
  libraryMaterials: Material[],
): { materialId: string; name: string; decrement: number; currentStock: number; newStock: number }[] {
  return projectMaterials
    .filter(pm => pm.materialId && libraryMaterials.some(m => m.id === pm.materialId))
    .map(pm => {
      const libMat = libraryMaterials.find(m => m.id === pm.materialId)!;
      return {
        materialId: pm.materialId,
        name: pm.name,
        decrement: pm.quantity,
        currentStock: libMat.qtyOnHand,
        newStock: Math.max(0, libMat.qtyOnHand - pm.quantity),
      };
    });
}
