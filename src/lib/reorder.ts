/**
 * Reorder Suggestion Engine
 * Generates pre-filled RFQ suggestions when materials hit low stock.
 */

import type { Material, Supplier, ManifestItem } from '@/types';
import { normalizeCategory, scoreSuppliersForGroup, getCategoryGroup } from './categories';
import type { MaterialCategory } from '@/types';

export interface ReorderSuggestion {
  material: Material;
  currentStock: number;
  minLevel: number;
  suggestedOrderQty: number; // enough to get back to 2x minLevel
  category: MaterialCategory;
  groupKey: string;
  topSupplier: { id: string; name: string; score: number } | null;
}

/**
 * Generate reorder suggestions for materials below their minimum stock level.
 * Suggests ordering enough to reach 2x the minimum level (buffer for next project).
 * Matches each material to the highest-scored supplier for its category.
 */
export function generateReorderSuggestions(
  materials: Material[],
  suppliers: Supplier[],
): ReorderSuggestion[] {
  return materials
    .filter(m => m.minStockLevel > 0 && m.qtyOnHand <= m.minStockLevel)
    .map(m => {
      const category = normalizeCategory(m.category) as MaterialCategory;
      const groupKey = getCategoryGroup(category);
      const targetStock = m.minStockLevel * 2;
      const suggestedOrderQty = Math.max(0, Math.ceil(targetStock - m.qtyOnHand));

      // Find best supplier for this category
      const scored = scoreSuppliersForGroup(groupKey as any, suppliers as any, []);
      const topSupplier = scored.length > 0
        ? { id: scored[0].supplierId, name: scored[0].supplierName, score: scored[0].score }
        : null;

      return {
        material: m,
        currentStock: m.qtyOnHand,
        minLevel: m.minStockLevel,
        suggestedOrderQty,
        category,
        groupKey,
        topSupplier,
      };
    })
    .sort((a, b) => {
      // Most critical first (lowest stock ratio)
      const ratioA = a.currentStock / a.minLevel;
      const ratioB = b.currentStock / b.minLevel;
      return ratioA - ratioB;
    });
}

/**
 * Convert reorder suggestions into ManifestItem-shaped objects
 * that can be passed directly to the QuoteRequestModal.
 */
export function suggestionsToManifestItems(suggestions: ReorderSuggestion[]): ManifestItem[] {
  return suggestions.map(s => ({
    materialId: s.material.id,
    materialName: s.material.name,
    zoneName: 'Reorder',
    zoneId: '',
    qtyNeeded: s.suggestedOrderQty,
    reserveQty: 0,
    totalOrder: s.suggestedOrderQty,
    unitCost: s.material.cost,
    subtotal: s.suggestedOrderQty * s.material.cost,
    unit: s.material.unit,
    category: s.category,
    supplierId: s.topSupplier?.id ?? null,
    supplierName: s.topSupplier?.name ?? null,
  }));
}
