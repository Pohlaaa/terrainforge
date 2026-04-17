/**
 * Unit Conversions — centralized math for material quantity computation.
 * No magic numbers anywhere else in the engine.
 */

// ── Volume Conversions ──────────────────────────────────────────────────────

/** Convert cubic feet to cubic yards */
export const cuftToCuyd = (cuft: number): number => cuft / 27;

/** Convert area (sqft) + depth (inches) to cubic feet */
export const areaToCuft = (areaSqft: number, depthInches: number): number =>
  areaSqft * (depthInches / 12);

/** Convert area (sqft) + depth (inches) to cubic yards */
export const areaToCuyd = (areaSqft: number, depthInches: number): number =>
  cuftToCuyd(areaToCuft(areaSqft, depthInches));

/** Convert cubic yards to tons (using material density) */
export const cuydToTons = (cuyd: number, density: number = 1.5): number =>
  cuyd * density;

// ── Purchase Rounding ───────────────────────────────────────────────────────

/**
 * Round up to nearest purchasable unit.
 * Bulk materials (cubic_yard, ton) round to nearest 0.5.
 * Everything else rounds to nearest whole number.
 */
export function roundToPurchaseUnit(quantity: number, purchaseUnit: string): number {
  if (quantity <= 0) return 0;
  if (purchaseUnit === 'cubic_yard' || purchaseUnit === 'cuyd' || purchaseUnit === 'ton') {
    return Math.ceil(quantity * 2) / 2; // nearest 0.5
  }
  return Math.ceil(quantity);
}

// ── Waste Factor ────────────────────────────────────────────────────────────

/**
 * Apply waste factor to raw quantity.
 * Waste is applied BEFORE purchase rounding (not after).
 */
export function applyWaste(rawQty: number, wasteFactor: number): number {
  return rawQty * (1 + wasteFactor);
}

// ── Grid Spacing ────────────────────────────────────────────────────────────

/** Compute count of items placed in a grid pattern across an area */
export function gridCount(areaSqft: number, spacingInches: number): number {
  if (spacingInches <= 0) return 0;
  const spacingFt = spacingInches / 12;
  return Math.ceil(areaSqft / (spacingFt * spacingFt));
}

// ── Wall Calculation ────────────────────────────────────────────────────────

/** Compute block count for a wall from dimensions and face area per unit */
export function wallBlockCount(lengthFt: number, heightFt: number, faceAreaSqftPerUnit: number): number {
  if (faceAreaSqftPerUnit <= 0) return 0;
  const wallFaceArea = lengthFt * heightFt;
  return Math.ceil(wallFaceArea / faceAreaSqftPerUnit);
}

// ── Category Depth Minimums ─────────────────────────────────────────────────

export const DEPTH_MINIMUMS: Record<string, number> = {
  gravel: 6,
  sand: 6,
  soil: 3,
  mulch: 2,
  concrete: 4,
};

export const DEFAULT_DEPTH_INCHES = 3;

/** Get effective depth enforcing category minimums */
export function getEffectiveDepth(depthIn: number | null | undefined, category: string): number {
  const catMin = DEPTH_MINIMUMS[category.toLowerCase()] ?? DEFAULT_DEPTH_INCHES;
  const specified = depthIn || catMin;
  return Math.max(specified, catMin);
}
