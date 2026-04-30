/**
 * elementOverlap — post-process AI-placed elements so axis-aligned
 * bounding boxes don't overlap.
 *
 * Sprint AI-Buildable Phase 2 follow-up. The vision-LLM places each
 * element independently, so two backyard patios easily land at the
 * same (or near-same) coords. This pure helper detects overlapping
 * AABBs and nudges later elements out of the way along the axis with
 * the smallest required separation. The function is intentionally
 * dumb — it doesn't try to find optimal arrangements, just gets
 * elements to no-overlap with minimal movement.
 *
 * Caller patterns:
 *   - Wizard: after `inferElementPlacements` resolves, call this to
 *     dedup overlaps before setData.
 *   - Manual placement: not used; contractors are responsible for
 *     their own drags.
 *
 * Pure: no React, no I/O. Vitest-tested.
 */

export interface ElementBox {
  /** Stable identity. Wizard tempId or DB id. */
  key: string
  /** Top-left in plan-feet (matches ProjectElement.geometry.position). */
  x: number
  y: number
  /** Width in plan-feet (lengthFt for rectangles, 2*radius for circles). */
  w: number
  /** Height in plan-feet (widthFt for rectangles, 2*radius for circles). */
  h: number
}

export interface NudgeResult {
  /** Updated positions, keyed by `key`. */
  positions: Map<string, { x: number; y: number }>
  /** True if any element was moved. */
  changed: boolean
  /** Iteration count before convergence (or hitting max). For debug + tests. */
  iterations: number
}

/** Margin in feet between adjacent element AABBs after nudging. Small
 *  enough that elements don't visibly drift apart, large enough that
 *  contractors can grab handles without them overlapping. */
const SEPARATION_MARGIN_FT = 1

/** Cap on the iteration loop. Pathological inputs (10+ elements
 *  stacked perfectly) shouldn't take more than ~5 passes; 20 is safe. */
const MAX_ITERATIONS = 20

/**
 * Detect overlap between two AABBs (with margin).
 */
function aabbOverlap(a: ElementBox, b: ElementBox): boolean {
  return (
    a.x < b.x + b.w + SEPARATION_MARGIN_FT &&
    a.x + a.w + SEPARATION_MARGIN_FT > b.x &&
    a.y < b.y + b.h + SEPARATION_MARGIN_FT &&
    a.y + a.h + SEPARATION_MARGIN_FT > b.y
  )
}

/**
 * Nudge `b` out of `a`'s AABB along the axis with smaller required
 * displacement. `a` is treated as the "anchor" (won't move).
 *
 * Returns the new top-left position for `b`.
 */
function pushOut(a: ElementBox, b: ElementBox): { x: number; y: number } {
  // How much would b need to move on each axis to clear a?
  // Right of a: b.x = a.x + a.w + margin
  // Left of a:  b.x = a.x - b.w - margin
  // Below a:   b.y = a.y + a.h + margin
  // Above a:   b.y = a.y - b.h - margin
  const right = a.x + a.w + SEPARATION_MARGIN_FT
  const left = a.x - b.w - SEPARATION_MARGIN_FT
  const below = a.y + a.h + SEPARATION_MARGIN_FT
  const above = a.y - b.h - SEPARATION_MARGIN_FT

  // Pick the axis + direction with smallest delta from current b position.
  const dRight = Math.abs(right - b.x)
  const dLeft = Math.abs(left - b.x)
  const dBelow = Math.abs(below - b.y)
  const dAbove = Math.abs(above - b.y)

  const minD = Math.min(dRight, dLeft, dBelow, dAbove)

  if (minD === dRight) return { x: right, y: b.y }
  if (minD === dLeft) return { x: left, y: b.y }
  if (minD === dBelow) return { x: b.x, y: below }
  return { x: b.x, y: above }
}

/**
 * Iterate over the input list, nudging overlapping elements apart
 * until none remain (or the iteration cap is hit). The first element
 * in `boxes` is treated as the highest priority (the AI's most-
 * confident placement); later elements move first when conflicts
 * exist.
 *
 * Stable: equal positions in the input produce equal positions in the
 * output (no random tie-breaking).
 */
export function nudgeOverlaps(boxes: ElementBox[]): NudgeResult {
  // Work on copies so the input is never mutated.
  const work = boxes.map((b) => ({ ...b }))
  const positions = new Map<string, { x: number; y: number }>()
  let changed = false
  let iterations = 0

  for (; iterations < MAX_ITERATIONS; iterations++) {
    let anyOverlap = false
    for (let i = 0; i < work.length; i++) {
      for (let j = i + 1; j < work.length; j++) {
        if (aabbOverlap(work[i], work[j])) {
          const newPos = pushOut(work[i], work[j])
          work[j] = { ...work[j], x: newPos.x, y: newPos.y }
          positions.set(work[j].key, newPos)
          changed = true
          anyOverlap = true
        }
      }
    }
    if (!anyOverlap) break
  }

  return { positions, changed, iterations }
}
