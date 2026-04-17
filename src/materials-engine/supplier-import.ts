/**
 * Supplier Import — CSV parsing with computation model inference.
 * Reads supplier sheets, auto-detects models from product names,
 * infers purchase units, returns Material-compatible objects.
 */

import type { ComputationModel, Material } from '@/types';

export interface ImportedMaterial {
  name: string;
  category: string;
  subcategory: string;
  computationModel: ComputationModel;
  purchaseUnit: string;
  costPerPurchaseUnit: number;
  supplierSku: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  inferredFrom: string;
}

export interface ImportResult {
  materials: ImportedMaterial[];
  warnings: string[];
  errors: string[];
}

export interface MergeResult {
  added: number;
  updated: number;
  unchanged: number;
}

// ── Model Inference ─────────────────────────────────────────────────────────

const MODEL_KEYWORDS: { keywords: string[]; model: ComputationModel; category: string; subcategory: string; purchaseUnit: string }[] = [
  // Bulk
  { keywords: ['mulch', 'bark', 'wood chip'], model: 'AREA_COVERAGE', category: 'mulch', subcategory: 'Mulch', purchaseUnit: 'cubic_yard' },
  { keywords: ['topsoil', 'soil', 'compost', 'fill dirt'], model: 'AREA_COVERAGE', category: 'soil', subcategory: 'Soil', purchaseUnit: 'cubic_yard' },
  { keywords: ['gravel', 'stone', 'rock', 'aggregate', 'class 5', 'base rock', 'drainage'], model: 'AREA_COVERAGE', category: 'gravel', subcategory: 'Aggregate', purchaseUnit: 'cubic_yard' },
  { keywords: ['sand', 'concrete sand', 'mason sand'], model: 'AREA_COVERAGE', category: 'sand', subcategory: 'Sand', purchaseUnit: 'cubic_yard' },
  { keywords: ['decomposed granite', 'dg'], model: 'AREA_COVERAGE', category: 'gravel', subcategory: 'Decorative', purchaseUnit: 'cubic_yard' },
  // Hardscape
  { keywords: ['paver', 'brick paver', 'concrete paver'], model: 'UNIT_COVERAGE', category: 'paver', subcategory: 'Pavers', purchaseUnit: 'sqft' },
  { keywords: ['flagstone', 'slate', 'bluestone'], model: 'UNIT_COVERAGE', category: 'stone', subcategory: 'Natural Stone', purchaseUnit: 'sqft' },
  { keywords: ['polymeric sand', 'joint sand'], model: 'UNIT_COVERAGE', category: 'sand', subcategory: 'Joint Sand', purchaseUnit: 'bag' },
  { keywords: ['sod', 'turf'], model: 'UNIT_COVERAGE', category: 'sod', subcategory: 'Sod', purchaseUnit: 'roll' },
  // Edging
  { keywords: ['edging', 'border', 'curb'], model: 'LINEAR', category: 'edging', subcategory: 'Edging', purchaseUnit: 'each' },
  // Plants
  { keywords: ['shrub', 'bush', 'boxwood', 'holly', 'azalea'], model: 'POINT_SPACING', category: 'shrub', subcategory: 'Shrubs', purchaseUnit: 'each' },
  { keywords: ['perennial', 'flower', 'annual'], model: 'POINT_SPACING', category: 'plant', subcategory: 'Perennials', purchaseUnit: 'each' },
  { keywords: ['tree', 'maple', 'oak', 'pine', 'spruce'], model: 'POINT_SPACING', category: 'tree', subcategory: 'Trees', purchaseUnit: 'each' },
  { keywords: ['grass', 'ornamental grass', 'fountain grass'], model: 'POINT_SPACING', category: 'plant', subcategory: 'Grasses', purchaseUnit: 'each' },
  // Wall
  { keywords: ['wall block', 'retaining', 'block', 'wall cap'], model: 'LINEAR_DEPTH', category: 'brick', subcategory: 'Wall Block', purchaseUnit: 'each' },
  // Substrate
  { keywords: ['fabric', 'weed barrier', 'geotextile', 'landscape fabric'], model: 'SUBSTRATE', category: 'misc', subcategory: 'Fabric', purchaseUnit: 'roll' },
  // Lighting
  { keywords: ['light', 'spotlight', 'path light', 'led'], model: 'POINT_SPACING', category: 'lighting', subcategory: 'Lighting', purchaseUnit: 'each' },
  { keywords: ['wire', 'cable', 'low voltage'], model: 'LINEAR', category: 'lighting', subcategory: 'Wire', purchaseUnit: 'roll' },
  // Irrigation
  { keywords: ['drip', 'sprinkler', 'irrigation', 'emitter'], model: 'POINT_SPACING', category: 'irrigation', subcategory: 'Irrigation', purchaseUnit: 'each' },
];

/**
 * Infer computation model from a product name.
 */
export function inferModel(name: string): { model: ComputationModel; category: string; subcategory: string; purchaseUnit: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW' } {
  const lower = name.toLowerCase();

  for (const entry of MODEL_KEYWORDS) {
    const exactMatch = entry.keywords.some(kw => lower.includes(kw));
    if (exactMatch) {
      return { model: entry.model, category: entry.category, subcategory: entry.subcategory, purchaseUnit: entry.purchaseUnit, confidence: 'HIGH' };
    }
  }

  // Partial match — check individual words
  const words = lower.split(/\s+/);
  for (const entry of MODEL_KEYWORDS) {
    const partialMatch = entry.keywords.some(kw => words.some(w => kw.includes(w) || w.includes(kw)));
    if (partialMatch) {
      return { model: entry.model, category: entry.category, subcategory: entry.subcategory, purchaseUnit: entry.purchaseUnit, confidence: 'MEDIUM' };
    }
  }

  return { model: 'AREA_COVERAGE', category: 'misc', subcategory: 'Other', purchaseUnit: 'each', confidence: 'LOW' };
}

/**
 * Parse CSV text and infer material properties.
 */
export function importSupplierCSV(
  csvText: string,
  supplierName: string,
): ImportResult {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { materials: [], warnings: [], errors: ['CSV must have a header row and at least one data row'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameCol = headers.findIndex(h => h.includes('name') || h.includes('product') || h.includes('description') || h.includes('item'));
  const priceCol = headers.findIndex(h => h.includes('price') || h.includes('cost') || h.includes('rate'));
  const skuCol = headers.findIndex(h => h.includes('sku') || h.includes('code') || h.includes('number') || h.includes('#'));
  const unitCol = headers.findIndex(h => h.includes('unit') || h.includes('uom'));
  const catCol = headers.findIndex(h => h.includes('category') || h.includes('type') || h.includes('group'));

  if (nameCol === -1) return { materials: [], warnings: [], errors: ['Could not find a name/product column in the CSV header'] };

  const materials: ImportedMaterial[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const name = cols[nameCol];
    if (!name) { warnings.push(`Row ${i + 1}: Empty name, skipped`); continue; }

    const price = priceCol >= 0 ? parseFloat(cols[priceCol]?.replace(/[$,]/g, '')) : 0;
    if (isNaN(price)) { warnings.push(`Row ${i + 1}: Invalid price for "${name}"`); }

    const sku = skuCol >= 0 ? cols[skuCol] ?? '' : '';
    const inferred = inferModel(name);

    materials.push({
      name,
      category: catCol >= 0 && cols[catCol] ? cols[catCol].toLowerCase() : inferred.category,
      subcategory: inferred.subcategory,
      computationModel: inferred.model,
      purchaseUnit: unitCol >= 0 && cols[unitCol] ? cols[unitCol].toLowerCase() : inferred.purchaseUnit,
      costPerPurchaseUnit: price || 0,
      supplierSku: sku,
      confidence: inferred.confidence,
      inferredFrom: `keyword match on "${name}"`,
    });
  }

  return { materials, warnings, errors };
}

/**
 * Merge imported materials with existing catalog.
 * Matches by supplier SKU. Updates prices on matches, adds new otherwise.
 */
export function mergeSupplierMaterials(
  existing: Material[],
  imported: ImportedMaterial[],
): { toAdd: ImportedMaterial[]; toUpdate: { id: string; newCost: number }[]; unchanged: number } {
  const toAdd: ImportedMaterial[] = [];
  const toUpdate: { id: string; newCost: number }[] = [];
  let unchanged = 0;

  for (const imp of imported) {
    // Match by SKU first, then by name
    const match = imp.supplierSku
      ? existing.find(e => e.supplierSku === imp.supplierSku)
      : existing.find(e => e.name.toLowerCase() === imp.name.toLowerCase());

    if (match) {
      if (imp.costPerPurchaseUnit > 0 && imp.costPerPurchaseUnit !== match.costPerPurchaseUnit) {
        toUpdate.push({ id: match.id, newCost: imp.costPerPurchaseUnit });
      } else {
        unchanged++;
      }
    } else {
      toAdd.push(imp);
    }
  }

  return { toAdd, toUpdate, unchanged };
}
