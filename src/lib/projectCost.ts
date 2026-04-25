/**
 * Project cost rollup — single source of truth.
 *
 * Lifted out of WizardStepNumbers + OverviewTab so both screens compute the
 * exact same numbers from the same project state. Was the cause of F-CW-07
 * (wizard $15,267 cost vs Overview $11,789 budget — Overview was missing
 * disposalCost, equipmentCost, and permit fees).
 *
 * Inputs: any object with the project's budget fields. Permit fees come
 * separately because the wizard tracks them in component state but the
 * persisted project may store them on `permitFees` (when present).
 */

export interface CostInputs {
  laborBudget?: number | null;
  materialsBudget?: number | null;
  equipmentBudget?: number | null;
  subcontractorBudget?: number | null;
  disposalCost?: number | null;
  equipmentCost?: number | null;
  overheadPct?: number | null;
  clientQuote?: number | null;
  budget?: number | null; // legacy fallback for clientQuote
  permitFees?: Record<string, number> | null;
}

export interface CostBreakdown {
  /** labor + materials + equipment + subs + disposal + equipmentCost + permits. Pre-overhead. */
  directCosts: number;
  /** directCosts × (overheadPct / 100). Defaults to 10% when overheadPct is null. */
  overhead: number;
  /** directCosts + overhead. The "Total Cost" / "Budget" figure. */
  totalCost: number;
  /** clientQuote ?? budget ?? 0 */
  quote: number;
  /** quote − totalCost. Negative when underwater. */
  profit: number;
  /** profit / quote × 100. Zero when no quote set. */
  marginPct: number;
}

export function computeProjectCost(input: CostInputs): CostBreakdown {
  const labor = input.laborBudget ?? 0;
  const materials = input.materialsBudget ?? 0;
  const equipmentBudget = input.equipmentBudget ?? 0;
  const subs = input.subcontractorBudget ?? 0;
  const disposal = input.disposalCost ?? 0;
  const equipmentCost = input.equipmentCost ?? 0;
  const permitFeesSum = input.permitFees
    ? Object.values(input.permitFees).reduce((s, v) => s + (v ?? 0), 0)
    : 0;

  const directCosts =
    labor + materials + equipmentBudget + subs + disposal + equipmentCost + permitFeesSum;
  const overheadPct = input.overheadPct ?? 10;
  const overhead = directCosts * (overheadPct / 100);
  const totalCost = directCosts + overhead;
  const quote = input.clientQuote ?? input.budget ?? 0;
  const profit = quote - totalCost;
  const marginPct = quote > 0 ? (profit / quote) * 100 : 0;

  return { directCosts, overhead, totalCost, quote, profit, marginPct };
}
