import type { AIMaterialRecommendation } from '../../src/types'
import type { Scenario, QuantityCheck } from './scenarios'

/**
 * Sprint M scoring rubric.
 *
 * For each scenario:
 *   - Required categories (`expectedCategories`): +1 per category present.
 *   - Forbidden categories (`forbiddenCategories`): −1 per category present.
 *     Forbidden hits are the loudest negative signal — they're the F-PHB-02
 *     "sod has gravel base" class of bug.
 *   - Quantity checks (`quantityChecks`): +1 per material whose quantity
 *     lands in the asserted range. Out-of-range is +0 (a soft fail surfaced
 *     in the per-scenario report).
 *
 * Score = (positives − forbidden penalties) / max-possible-positives
 *       — clamped to [0, 1] (forbidden hits can drive the raw score
 *         below 0; we report both raw and clamped).
 *
 * Suite score = mean of clamped per-scenario scores.
 *
 * The 80% threshold ROADMAP.md cites is a goal, not a hard gate. The
 * harness reports the number; iteration is human-driven.
 */

export interface MaterialMatch {
  category: string
  material: AIMaterialRecommendation | null
}

export interface QuantityResult {
  check: QuantityCheck
  matched: AIMaterialRecommendation | null
  inRange: boolean
}

export interface ScenarioReport {
  id: string
  tier: string
  notes: string
  /** Raw recs returned by Claude. */
  recs: AIMaterialRecommendation[]
  expectedFound: MaterialMatch[]
  expectedMissing: string[]
  forbiddenHits: { category: string; material: AIMaterialRecommendation }[]
  quantityResults: QuantityResult[]
  /** Sum of positive points (required categories present + qty checks passed). */
  positivePoints: number
  /** Number of forbidden hits (subtracted from positives). */
  forbiddenHitCount: number
  /** Maximum possible positives — denominator. */
  maxPositive: number
  /** Raw score (positives − forbidden) / maxPositive — can go negative. */
  rawScore: number
  /** Clamped to [0, 1] for averaging across scenarios. */
  clampedScore: number
  /** Free-text reasons surfaced for the markdown report. */
  reasons: string[]
}

export interface SuiteReport {
  generatedAt: string
  scenarioCount: number
  /** Mean clamped score across all scenarios — the headline metric. */
  meanScore: number
  /** Worst per-scenario clamped score — the "tail" of the distribution. */
  minScore: number
  /** Best per-scenario clamped score. */
  maxScore: number
  /** Total forbidden-category hits across all scenarios. Goal: 0. */
  forbiddenHitTotal: number
  /** Per-scenario breakdown. */
  scenarios: ScenarioReport[]
}

function categoryMatches(materialCategory: string, expected: string): boolean {
  const a = (materialCategory || '').toLowerCase().trim()
  const b = expected.toLowerCase().trim()
  // Allow loose match — e.g. "stone" matches "Stone (block)" via inclusion.
  return a === b || a.includes(b) || b.includes(a)
}

function findFirstByCategory(
  recs: AIMaterialRecommendation[],
  category: string,
): AIMaterialRecommendation | null {
  return recs.find((r) => categoryMatches(r.category, category)) ?? null
}

export function scoreScenario(
  scenario: Scenario,
  recs: AIMaterialRecommendation[],
): ScenarioReport {
  const reasons: string[] = []
  // ── Required categories ────────────────────────────────────────────
  const expectedFound: MaterialMatch[] = []
  const expectedMissing: string[] = []
  for (const cat of scenario.expectedCategories) {
    const m = findFirstByCategory(recs, cat)
    if (m) {
      expectedFound.push({ category: cat, material: m })
    } else {
      expectedMissing.push(cat)
      reasons.push(`MISSING required category "${cat}"`)
    }
  }

  // ── Forbidden categories ───────────────────────────────────────────
  const forbiddenHits: ScenarioReport['forbiddenHits'] = []
  for (const cat of scenario.forbiddenCategories) {
    const m = findFirstByCategory(recs, cat)
    if (m) {
      forbiddenHits.push({ category: cat, material: m })
      reasons.push(`FORBIDDEN category "${cat}" present (material: "${m.materialName}")`)
    }
  }

  // ── Quantity checks ────────────────────────────────────────────────
  const quantityResults: QuantityResult[] = []
  for (const check of scenario.quantityChecks) {
    const m = findFirstByCategory(recs, check.category)
    if (!m) {
      quantityResults.push({ check, matched: null, inRange: false })
      // Already flagged as a missing required category (typically),
      // skip the duplicate reason.
      continue
    }
    const inRange = m.estimatedQuantity >= check.min && m.estimatedQuantity <= check.max
    quantityResults.push({ check, matched: m, inRange })
    if (!inRange) {
      reasons.push(
        `QTY out-of-range: ${m.materialName} returned ${m.estimatedQuantity} ${m.unit}; expected [${check.min.toFixed(2)}, ${check.max.toFixed(2)}] ${check.unit} (${check.rationale})`,
      )
    }
  }

  // ── Score ──────────────────────────────────────────────────────────
  const requiredPoints = expectedFound.length
  const qtyInRangePoints = quantityResults.filter((q) => q.inRange).length
  const positivePoints = requiredPoints + qtyInRangePoints
  const maxPositive = scenario.expectedCategories.length + scenario.quantityChecks.length
  const forbiddenHitCount = forbiddenHits.length
  const rawScore = maxPositive === 0 ? 0 : (positivePoints - forbiddenHitCount) / maxPositive
  const clampedScore = Math.max(0, Math.min(1, rawScore))

  return {
    id: scenario.id,
    tier: scenario.tier,
    notes: scenario.notes,
    recs,
    expectedFound,
    expectedMissing,
    forbiddenHits,
    quantityResults,
    positivePoints,
    forbiddenHitCount,
    maxPositive,
    rawScore,
    clampedScore,
    reasons,
  }
}

export function summariseSuite(reports: ScenarioReport[]): SuiteReport {
  const scores = reports.map((r) => r.clampedScore)
  const meanScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const minScore = scores.length ? Math.min(...scores) : 0
  const maxScore = scores.length ? Math.max(...scores) : 0
  const forbiddenHitTotal = reports.reduce((sum, r) => sum + r.forbiddenHitCount, 0)
  return {
    generatedAt: new Date().toISOString(),
    scenarioCount: reports.length,
    meanScore,
    minScore,
    maxScore,
    forbiddenHitTotal,
    scenarios: reports,
  }
}

/**
 * Render the suite report as a markdown summary suitable for
 * .claude/TESTING/MATERIALS_ACCURACY.md. Headline metric at the top,
 * per-scenario breakdown below.
 */
export function renderMarkdown(suite: SuiteReport): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`
  const lines: string[] = []
  lines.push('# Materials engine accuracy harness — Sprint M')
  lines.push('')
  lines.push(`**Generated**: ${suite.generatedAt}`)
  lines.push('')
  lines.push('## Headline')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Scenarios run | ${suite.scenarioCount} |`)
  lines.push(`| Mean score | ${pct(suite.meanScore)} |`)
  lines.push(`| Worst-case score | ${pct(suite.minScore)} |`)
  lines.push(`| Best-case score | ${pct(suite.maxScore)} |`)
  lines.push(`| Forbidden-category hits (goal: 0) | ${suite.forbiddenHitTotal} |`)
  lines.push('')
  lines.push('Threshold per ROADMAP.md is ≥ 80% mean score. Forbidden hits — categories like "sod has crushed-stone base" — are the loudest signal that the prompt is leaking hardscape rules into softscape (or vice-versa).')
  lines.push('')
  lines.push('## Per-scenario breakdown')
  lines.push('')
  lines.push('| Scenario | Tier | Score | Required | Forbidden | Qty checks | Notes |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const r of suite.scenarios) {
    const required = `${r.expectedFound.length}/${r.expectedFound.length + r.expectedMissing.length}`
    const qty = `${r.quantityResults.filter((q) => q.inRange).length}/${r.quantityResults.length}`
    const forbidden = r.forbiddenHitCount > 0 ? `❌ ${r.forbiddenHitCount}` : '✓'
    lines.push(
      `| ${r.id} | ${r.tier} | ${pct(r.clampedScore)} | ${required} | ${forbidden} | ${qty} | ${r.notes} |`,
    )
  }
  lines.push('')
  // Surface scenarios that scored under 0.7 with their reasons
  const failures = suite.scenarios.filter((r) => r.clampedScore < 0.7)
  if (failures.length > 0) {
    lines.push('## Failure detail (score < 70%)')
    lines.push('')
    for (const r of failures) {
      lines.push(`### ${r.id} — ${pct(r.clampedScore)}`)
      lines.push('')
      if (r.reasons.length === 0) {
        lines.push('_No specific reasons surfaced (likely missing AI response)._')
      } else {
        for (const reason of r.reasons) lines.push(`- ${reason}`)
      }
      lines.push('')
      lines.push(`**Returned materials** (${r.recs.length}):`)
      for (const m of r.recs) {
        lines.push(`- ${m.materialName} (${m.category}) — ${m.estimatedQuantity} ${m.unit}`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}
