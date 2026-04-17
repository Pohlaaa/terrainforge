/**
 * Materials Engine — Public API
 */

// Core engine
export { computeElementMaterial, generateEngineManifest } from './engine';
export type { LineItem, PurchaseLine, ManifestResult } from './engine';

// Unit conversions
export {
  areaToCuyd, cuydToTons, applyWaste, roundToPurchaseUnit,
  gridCount, wallBlockCount, getEffectiveDepth,
  DEPTH_MINIMUMS, DEFAULT_DEPTH_INCHES,
} from './unit-conversions';

// Catalog
export { STARTER_CATALOG } from './catalog';
export type { CatalogEntry } from './catalog';

// Supplier import
export { inferModel, importSupplierCSV, mergeSupplierMaterials } from './supplier-import';
export type { ImportedMaterial, ImportResult, MergeResult } from './supplier-import';
