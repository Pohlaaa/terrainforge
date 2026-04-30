/**
 * Starter Catalog — 35+ real landscaping materials with computation models.
 * Seeded into the materials table when a new org is created.
 */

import type { ComputationModel, ComputeParams } from '@/types';

export interface CatalogEntry {
  name: string;
  category: string;
  subcategory: string;
  computationModel: ComputationModel;
  computeParams: ComputeParams;
  purchaseUnit: string;
  qtyPerPurchaseUnit: number;
  costPerPurchaseUnit: number;
  defaultWasteFactor: number;
  dependentMaterialIds: string[];
  unit: string; // legacy compat
}

export const STARTER_CATALOG: CatalogEntry[] = [
  // ── Bulk Materials (AREA_COVERAGE) ──────────────────────────────────────
  {
    name: 'Premium Hardwood Mulch', category: 'mulch', subcategory: 'Mulch',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 3 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 45,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'Cedar Mulch', category: 'mulch', subcategory: 'Mulch',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 3 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 55,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'Class 5 Gravel (Base)', category: 'gravel', subcategory: 'Base Rock',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 6 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 35,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'Pea Gravel', category: 'gravel', subcategory: 'Decorative',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 3 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 42,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'River Rock (1-3")', category: 'gravel', subcategory: 'Decorative',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 3 },
    purchaseUnit: 'ton', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 85,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'ton',
  },
  {
    name: 'Screened Topsoil', category: 'soil', subcategory: 'Soil',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 4 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 32,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'Compost Blend', category: 'soil', subcategory: 'Soil',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 2 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 38,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'Concrete Sand', category: 'sand', subcategory: 'Sand',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 1 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 28,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'Decomposed Granite', category: 'gravel', subcategory: 'Decorative',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 3 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 48,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },
  {
    name: 'Drainage Gravel (#57 Stone)', category: 'gravel', subcategory: 'Drainage',
    computationModel: 'AREA_COVERAGE', computeParams: { depth_inches: 6 },
    purchaseUnit: 'cubic_yard', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 40,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'cuyd',
  },

  // ── Hardscape (UNIT_COVERAGE) ──────────────────────────────────────────
  {
    name: 'Belgard Cambridge Pavers', category: 'paver', subcategory: 'Pavers',
    computationModel: 'UNIT_COVERAGE', computeParams: { coverage_sqft_per_unit: 1 },
    purchaseUnit: 'sqft', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 4.80,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'sqft',
  },
  {
    name: 'Flagstone (Irregular)', category: 'stone', subcategory: 'Natural Stone',
    computationModel: 'UNIT_COVERAGE', computeParams: { coverage_sqft_per_unit: 1 },
    purchaseUnit: 'sqft', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 8.50,
    defaultWasteFactor: 0.12, dependentMaterialIds: [], unit: 'sqft',
  },
  {
    name: 'Concrete Pavers (Standard)', category: 'paver', subcategory: 'Pavers',
    computationModel: 'UNIT_COVERAGE', computeParams: { coverage_sqft_per_unit: 1 },
    purchaseUnit: 'sqft', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 3.50,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'sqft',
  },
  {
    name: 'Polymeric Sand (50 lb bag)', category: 'sand', subcategory: 'Joint Sand',
    computationModel: 'UNIT_COVERAGE', computeParams: { coverage_sqft_per_unit: 65 },
    purchaseUnit: 'bag', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 28,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'bag',
  },

  // ── Sod (UNIT_COVERAGE) ────────────────────────────────────────────────
  {
    name: 'Kentucky Bluegrass Sod', category: 'sod', subcategory: 'Sod',
    computationModel: 'UNIT_COVERAGE', computeParams: { coverage_sqft_per_unit: 10 },
    purchaseUnit: 'roll', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 5.50,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'sqft',
  },
  {
    name: 'Bermuda Sod', category: 'sod', subcategory: 'Sod',
    computationModel: 'UNIT_COVERAGE', computeParams: { coverage_sqft_per_unit: 10 },
    purchaseUnit: 'roll', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 4.80,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'sqft',
  },

  // ── Edging (LINEAR) ────────────────────────────────────────────────────
  {
    name: 'Steel Edging (4")', category: 'edging', subcategory: 'Steel',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 16 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 32,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'lnft',
  },
  {
    name: 'Aluminum Edging', category: 'edging', subcategory: 'Aluminum',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 16 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 28,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'lnft',
  },
  {
    name: 'Plastic Edging', category: 'edging', subcategory: 'Plastic',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 20 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 18,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'lnft',
  },
  {
    name: 'Belgian Block Border', category: 'edging', subcategory: 'Stone',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 0.5 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 4.50,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'each',
  },

  // ── Consumables / fasteners (LINEAR, jbluhm-V6) ────────────────────────
  // jbluhm: "The material engine needs to be able to calculate ideally
  // all the way out to how many Edging spikes & pave edge spikes
  // needed on a project. Those small materials all add up and can
  // make or break an estimate."
  //
  // length_per_unit_ft is set so 1 purchase unit covers the run of
  // edging it would naturally fasten. A box of 50 steel spikes at 1
  // spike per 2 ft covers 100 ft → length_per_unit_ft = 100, qty = 50.
  {
    // Used with steel / aluminum edging. ~1 spike every 2 ft.
    name: 'Steel Edging Spikes (10")', category: 'edging', subcategory: 'Fastener',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 100 },
    purchaseUnit: 'box', qtyPerPurchaseUnit: 50, costPerPurchaseUnit: 18,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'box',
  },
  {
    // Used with plastic edging. Tighter spacing (~1 stake every 18 in).
    name: 'Plastic Edging Stakes (8")', category: 'edging', subcategory: 'Fastener',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 75 },
    purchaseUnit: 'bag', qtyPerPurchaseUnit: 50, costPerPurchaseUnit: 12,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'bag',
  },
  {
    // Used with paver edge restraint (e.g. Pave Edge, Snap Edge). One
    // spike every 12 in is typical. Box of 50 → 50 ft of restraint.
    name: 'Paver Edge Restraint Spikes (10")', category: 'edging', subcategory: 'Fastener',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 50 },
    purchaseUnit: 'box', qtyPerPurchaseUnit: 50, costPerPurchaseUnit: 22,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'box',
  },
  {
    // The plastic / poly edge restraint that the spikes hold in
    // place. Sold in 6 ft sections; pairs naturally with the
    // Paver Edge Restraint Spikes above.
    name: 'Paver Edge Restraint (6 ft)', category: 'edging', subcategory: 'Paver Edge',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 6 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 11,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'lnft',
  },
  {
    // Landscape staples for fabric / drip line. Tight spacing.
    name: 'Landscape Fabric Staples (6")', category: 'edging', subcategory: 'Fastener',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 50 },
    purchaseUnit: 'box', qtyPerPurchaseUnit: 100, costPerPurchaseUnit: 14,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'box',
  },

  // ── Plants (POINT_SPACING) ─────────────────────────────────────────────
  {
    name: 'Assorted Shrubs (3 gal)', category: 'shrub', subcategory: 'Shrubs',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 48 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 35,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'each',
  },
  {
    name: 'Perennials (1 gal)', category: 'plant', subcategory: 'Perennials',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 18 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 12,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'each',
  },
  {
    name: 'Ornamental Grasses (1 gal)', category: 'plant', subcategory: 'Grasses',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 24 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 15,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'each',
  },
  {
    name: 'Shade Tree (2" cal)', category: 'tree', subcategory: 'Trees',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 240 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 350,
    defaultWasteFactor: 0.0, dependentMaterialIds: [], unit: 'each',
  },
  {
    name: 'Ornamental Tree (1.5" cal)', category: 'tree', subcategory: 'Trees',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 180 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 250,
    defaultWasteFactor: 0.0, dependentMaterialIds: [], unit: 'each',
  },

  // ── Wall Materials (LINEAR_DEPTH) ──────────────────────────────────────
  {
    name: 'Retaining Wall Block (Standard)', category: 'brick', subcategory: 'Wall Block',
    computationModel: 'LINEAR_DEPTH', computeParams: { face_area_sqft_per_unit: 0.5 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 5.50,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'each',
  },
  {
    name: 'Wall Cap', category: 'brick', subcategory: 'Wall Cap',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 1 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 8,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'each',
  },

  // ── Substrate (SUBSTRATE) ──────────────────────────────────────────────
  {
    name: 'Landscape Fabric (3\' × 100\')', category: 'misc', subcategory: 'Fabric',
    computationModel: 'SUBSTRATE', computeParams: { coverage_sqft_per_unit: 300, overlap_factor: 0.10 },
    purchaseUnit: 'roll', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 45,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'roll',
  },
  {
    name: 'Geotextile Fabric (6\' × 100\')', category: 'misc', subcategory: 'Fabric',
    computationModel: 'SUBSTRATE', computeParams: { coverage_sqft_per_unit: 600, overlap_factor: 0.10 },
    purchaseUnit: 'roll', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 85,
    defaultWasteFactor: 0.10, dependentMaterialIds: [], unit: 'roll',
  },

  // ── Lighting (POINT_SPACING) ───────────────────────────────────────────
  {
    name: 'Path Light (LED)', category: 'lighting', subcategory: 'Path',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 96 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 85,
    defaultWasteFactor: 0.0, dependentMaterialIds: [], unit: 'each',
  },
  {
    name: 'Spot Light (LED)', category: 'lighting', subcategory: 'Accent',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 120 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 120,
    defaultWasteFactor: 0.0, dependentMaterialIds: [], unit: 'each',
  },
  {
    name: 'Low Voltage Wire (12/2)', category: 'lighting', subcategory: 'Wire',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 100 },
    purchaseUnit: 'roll', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 45,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'lnft',
  },

  // ── Irrigation (LINEAR) ────────────────────────────────────────────────
  {
    name: 'Drip Line (1/2")', category: 'irrigation', subcategory: 'Drip',
    computationModel: 'LINEAR', computeParams: { length_per_unit_ft: 100 },
    purchaseUnit: 'roll', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 35,
    defaultWasteFactor: 0.05, dependentMaterialIds: [], unit: 'lnft',
  },
  {
    name: 'Sprinkler Head (Pop-up)', category: 'irrigation', subcategory: 'Sprinkler',
    computationModel: 'POINT_SPACING', computeParams: { spacing_inches: 144 },
    purchaseUnit: 'each', qtyPerPurchaseUnit: 1, costPerPurchaseUnit: 18,
    defaultWasteFactor: 0.0, dependentMaterialIds: [], unit: 'each',
  },
];
