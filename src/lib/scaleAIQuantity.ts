/**
 * scaleAIQuantity — jbluhm-V6 fix.
 *
 * The AI returns `estimatedQuantity` based on the dimensions at the
 * moment it was called. When the contractor later edits the element's
 * dimensions, the displayed qty should track those edits without
 * burning another API call. This helper does proportional scaling on
 * area (sqft) for most units and on linearFt for linear units.
 *
 * Pure + dependency-free so the same function can be used by tests +
 * any future surface that wants live-quantity preview.
 */

export interface AIRecForScaling {
  estimatedQuantity: number
  unit: string
}

/**
 * Lower-cased unit strings that are treated as "linear" — quantity
 * scales with linearFt, not areaSqft. Anything else falls back to
 * area scaling.
 */
const LINEAR_UNITS = new Set(['lf', 'linear ft', 'linear-ft', 'linearft', 'ft', 'feet'])

export function scaleAIQuantityForDimensions(
  rec: AIRecForScaling,
  currentArea: number,
  currentLinear: number,
  baselineArea: number,
  baselineLinear: number,
): number {
  const u = rec.unit.toLowerCase().trim()
  const isLinear = LINEAR_UNITS.has(u)
  if (isLinear) {
    if (baselineLinear > 0 && currentLinear > 0) {
      return Math.round(rec.estimatedQuantity * (currentLinear / baselineLinear) * 10) / 10
    }
    return rec.estimatedQuantity
  }
  if (baselineArea > 0 && currentArea > 0) {
    return Math.round(rec.estimatedQuantity * (currentArea / baselineArea) * 10) / 10
  }
  return rec.estimatedQuantity
}
