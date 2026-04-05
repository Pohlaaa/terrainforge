/**
 * Manifest Engine - Core calculation logic
 *
 * Supports three material sources (checked in priority order):
 * 1. Element-based materials (project.elements[].materials[]) — measurement-driven, quantities computed from contractor dimensions
 * 2. Project-level materials (project.materials JSONB) — wizard-created projects with known quantities
 * 3. Zone-level materials (project.zones[].materials[]) — legacy, computed from zone geometry
 *
 * The element path is the core of the measurement-driven architecture:
 * Contractor Measurement → Element Dimension → Formula Calculation → Material Quantity
 */

import type { Material, Zone, Project, ManifestItem, SupplierPrice, ProjectElement, ProjectElementMaterial } from '@/types';
import type { MaterialCategory } from '@/types';
import { RESERVE } from './constants';
import { normalizeCategory } from './categories';

// ── Industry-Standard Depth Minimums (inches) ──────────────────────────────
// Base materials require minimum 6″ depth per industry standard.
// Topsoil/mulch for garden beds have lower minimums.
// These are NOT configurable preferences — they're field-tested standards.
const CATEGORY_DEPTH_MINIMUMS: Partial<Record<MaterialCategory, number>> = {
  gravel: 6,     // base material — 6″ industry minimum
  sand: 6,       // sand bed / base — 6″ minimum (sand bed for pavers is typically 1″, but base sand is 6″)
  soil: 3,       // topsoil — 3″ minimum for garden beds
  mulch: 2,      // mulch — 2″ minimum for weed suppression
  concrete: 4,   // concrete slab — 4″ minimum
};

// Default depth when no depth is specified and no category minimum applies
const DEFAULT_DEPTH_IN = 3;

/**
 * Get the effective depth for a material, enforcing category minimums.
 * If the material has an explicit depth, use it (but enforce minimum).
 * If no depth specified, use the category minimum or default.
 */
function getEffectiveDepth(mat: Material): number {
  const catMin = CATEGORY_DEPTH_MINIMUMS[mat.category as MaterialCategory] ?? DEFAULT_DEPTH_IN;
  const specified = mat.depthIn || catMin;
  return Math.max(specified, catMin);
}

/**
 * Compute material quantity from zone geometry.
 *
 * ── Industry Formula Reference ──────────────────────────────────────────
 * Bulk materials (cuyd):  sqft / 324 × depth_inches
 *   This is equivalent to: (area × (depthIn / 12)) / 27
 *   Because 324 = 12 × 27. Contractors know it as "divide by 324, multiply by depth."
 *
 * Tons:  cubic_yards × density (typically 1.4–1.5 for gravel/stone)
 *
 * Polymeric sand:  50lb bag covers ~65 sqft of pavers (industry standard)
 *
 * Bags (depth-based):  cubic_feet / cuft_per_bag
 *   where cubic_feet = sqft × (depthIn / 12)
 *
 * NOTE: The contractor confirmed that additional formulas may be needed for
 * specific bulk materials (e.g., decomposed granite). The current cuyd formula
 * is the standard baseline. Future: support per-material formula overrides.
 * ─────────────────────────────────────────────────────────────────────────
 */
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
      // Depth-based bag calc: cuft / cuft_per_bag
      const cuft = area * (mat.depthIn / 12);
      const cuftPerBag = mat.coverage || 2;
      return Math.ceil(cuft / cuftPerBag);
    }
    // Coverage-based bag calc (e.g., polymeric sand: 65 sqft per bag)
    const cov = mat.coverage || 50;
    return Math.ceil(area / cov);
  }

  if (mat.unit === 'cuyd') {
    // Industry formula: sqft / 324 × depth_inches
    // Equivalent to: (area × (depthIn / 12)) / 27
    const depth = getEffectiveDepth(mat);
    return (area * (depth / 12)) / 27;
  }

  if (mat.unit === 'ton') {
    // Cubic yards × density (default 1.5 tons/cuyd for gravel/stone)
    const depth = getEffectiveDepth(mat);
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
  project: Project & { elements?: ProjectElement[] },
  materials: Material[],
  supplierPrices?: SupplierPrice[]
): ManifestItem[] {
  // Priority 1: element-based materials (measurement-driven)
  if (project.elements?.some(el => el.materials?.length > 0)) {
    return generateFromElementMaterials(project as Project & { elements: ProjectElement[] }, materials, supplierPrices);
  }

  // Priority 2: project-level materials (wizard-created projects)
  if (project.materials && project.materials.length > 0) {
    return generateFromProjectMaterials(project, materials, supplierPrices);
  }

  // Priority 3: zone-based calculation (legacy)
  return generateFromZoneMaterials(project, materials, supplierPrices);
}

// ── Element-based manifest generation (measurement-driven architecture) ─────

/**
 * Resolve the effective area for a project element.
 * Priority: computedAreaSqft → length × width → areaSqft manual override → 0
 */
function resolveElementArea(el: ProjectElement): number {
  if (el.computedAreaSqft && el.computedAreaSqft > 0) return el.computedAreaSqft;
  if (el.lengthFt && el.widthFt) return el.lengthFt * el.widthFt;
  if (el.areaSqft && el.areaSqft > 0) return el.areaSqft;
  return 0;
}

/**
 * Build a Material-like adapter from an element material + library material defaults.
 * Element-level depth overrides library depth (contractor measurement wins).
 */
function buildMaterialAdapter(
  elMat: ProjectElementMaterial,
  libMat: Material | undefined,
  elementDepthIn: number | null
): Material {
  return {
    id: elMat.materialId,
    name: elMat.name,
    category: elMat.category,
    unit: elMat.unit,
    cost: elMat.unitCost,
    reserveOverride: libMat?.reserveOverride ?? null,
    coverage: libMat?.coverage ?? null,
    depthIn: elementDepthIn ?? libMat?.depthIn ?? null,
    notes: '',
    qtyOnHand: 0,
    minStockLevel: 0,
    storageLocation: '',
    lastRestocked: '',
  };
}

/**
 * Generate manifest from project elements (measurement-driven path).
 * Each element's real dimensions drive material quantity calculations.
 * This is the preferred path when elements exist with materials attached.
 */
function generateFromElementMaterials(
  project: Project & { elements: ProjectElement[] },
  libraryMaterials: Material[],
  supplierPrices?: SupplierPrice[]
): ManifestItem[] {
  const items: ManifestItem[] = [];

  for (const element of project.elements) {
    if (!element.materials?.length) continue;

    const area = resolveElementArea(element);
    const perimeter = element.linearFt || 0;

    // Build a synthetic zone from element dimensions
    const syntheticZone: Zone = {
      id: element.id,
      name: element.name,
      area,
      perimeter,
      sequence: element.sequence,
      crew: '',
      dependencies: [],
      notes: element.notes || '',
      materials: [],
      equipment: [],
      createdAt: element.createdAt,
    };

    for (const elMat of element.materials) {
      const libMat = libraryMaterials.find(m => m.id === elMat.materialId);
      const matAdapter = buildMaterialAdapter(elMat, libMat, element.depthIn);

      const qty = computeQty(matAdapter, syntheticZone);
      const reservePct = getReservePct(matAdapter);
      const reserveQty = qty * reservePct;
      const totalOrder = Math.ceil(qty + reserveQty);

      // Resolve unit cost: preferred supplier → element material cost → library cost
      const preferredPrice = supplierPrices?.find(
        sp => sp.materialId === elMat.materialId && sp.isPreferred
      );
      const unitCost = preferredPrice?.unitCost ?? elMat.unitCost;
      const subtotal = totalOrder * unitCost;

      items.push({
        materialId: elMat.materialId,
        materialName: elMat.name,
        zoneName: element.name,
        zoneId: element.id,
        qtyNeeded: qty,
        reserveQty,
        totalOrder,
        unitCost,
        subtotal,
        unit: elMat.unit,
        category: normalizeCategory(elMat.category),
        supplierId: preferredPrice?.supplierId ?? null,
        supplierName: preferredPrice?.supplierName ?? null,
      });
    }
  }

  return items;
}

/**
 * Compute material quantities for a single project element.
 * Pure function for wizard live previews — shows quantities updating
 * as the contractor enters/changes dimensions.
 */
export function computeElementQuantities(
  element: ProjectElement,
  libraryMaterials: Material[]
): { materialId: string; materialName: string; quantity: number; unit: string }[] {
  if (!element.materials?.length) return [];

  const area = resolveElementArea(element);
  const perimeter = element.linearFt || 0;

  const syntheticZone: Zone = {
    id: element.id,
    name: element.name,
    area,
    perimeter,
    sequence: 0,
    crew: '',
    dependencies: [],
    notes: '',
    materials: [],
    equipment: [],
    createdAt: '',
  };

  return element.materials.map(elMat => {
    const libMat = libraryMaterials.find(m => m.id === elMat.materialId);
    const matAdapter = buildMaterialAdapter(elMat, libMat, element.depthIn);
    const quantity = computeQty(matAdapter, syntheticZone);

    return {
      materialId: elMat.materialId,
      materialName: elMat.name,
      quantity,
      unit: elMat.unit,
    };
  });
}

// ── Cost rollup functions ───────────────────────────────────────────────────

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