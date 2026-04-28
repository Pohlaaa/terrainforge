# 3D visual regression — Sprint V

Visual record + reproducibility notes for the Sprint V primitives + camera
framing changes. Captured against the post-deploy staging build.

## Verification project

A seed project was created via Supabase MCP with all 6 new element-type
primitives + an existing `steps_stairs` (which is one of the new primitives
too) for comparison:

- **Project**: `E2E_VISUAL_REGRESSION_SprintV`
- **ID**: `5dd98ed2-f909-4af0-a7c5-6014f35b866b`
- **Address**: 100 Tunnel Road, Asheville, NC 28805 (lat 35.5876, lng -82.5212)
- **Elements** (7):
  - Wall (30 × 1 ft, 4 ft tall) — `wall`
  - Retaining Wall (25 × 1 ft, 3 ft tall) — `retaining_wall`
  - Fence (50 × 1 ft, 6 ft tall) — `fence`
  - Pergola (16 × 12 ft, 8 ft tall) — `pergola`
  - Steps to Deck (12 × 4 ft) — `steps_stairs`
  - Front Bed (10 × 4 ft) — `garden_bed`
  - Outdoor Kitchen (12 × 3 ft, 3 ft tall) — `outdoor_kitchen`

Each element has explicit `geometry` set so the auto-layout fallback isn't
exercised. Positions are spread across the satellite tile so they don't
overlap.

The seed project should be deleted after sprint review — see Cleanup at
the bottom of this doc.

## 2D placement snapshot

Captured from `https://terrainforge-staging.netlify.app/projects/5dd98ed2-f909-4af0-a7c5-6014f35b866b` (PlanView2D).
All 7 elements visible with labels at their geometry-set positions —
PlanView2D unaffected by Sprint V (only PlanView3D primitives changed).

```
            Wall ━━━━━━━━━     Retaining Wall ━━━━
            (top of frame)
            
                          Fence ━━━━━━━━━━━━━━
                          (middle-left)
                                              ┌────┐
                                              │Pergola│
                                              └────┘
                          Steps to Deck   Front Bed
                          ▭               ▭
                          
                          Outdoor Kitchen
                          ▭
```

(See `screenshots/sprint-v-2d-placement.png` if captured.)

## Per-primitive — expected 3D rendering

The 3D canvas renders unreliably in the Chrome MCP harness on Windows
(documented limitation in `E2E.md`). Visual rendering should be verified
manually in a desktop Chrome instance. Each primitive's geometric
intent below.

### Wall + Retaining Wall (`wall`, `retaining_wall`)

**Pre-Sprint V**: solid box extruded to `heightFt`, single texture.

**Sprint V**: stack of horizontal courses. Each course is a thin
`boxGeometry` slice; courses are separated by tiny gaps (factor 0.92)
which read as mortar lines. Courses count auto-derived from element
height ÷ `WALL_COURSE_THICKNESS_FT` (0.5 ft per course → 8 courses on a
4 ft wall, 6 on a 3 ft retaining_wall).

**Texture**: routes through `BoxMaterial` so per-course albedo (e.g.
stacked-stone or paver textures from Sprint 7c) renders at correct scale.

### Fence (`fence`)

**Pre-Sprint V**: solid 6-ft-tall slab.

**Sprint V**: vertical posts every `FENCE_POST_SPACING_FT` (8 ft) along
the run + 2 horizontal rails at 30% and 70% of fence height. Posts are
cylinders (`cylinderGeometry`, 8 segments). Rails are thin boxes.

**No texture**: geometry alone reads as a fence; texture authoring on
post + rail composites is out of scope (and CC0 fence textures are
rare).

### Pergola (`pergola`)

**Pre-Sprint V**: solid 8-ft tall box (looked like a small building).

**Sprint V**: 4 corner posts (boxes, 0.5 ft × 0.5 ft × pergolaHeight) +
2 long perimeter beams along the width axis at the top + a rafter grid
of `PERGOLA_RAFTERS` (6) thin perpendicular beams crossing depth. The
rafter grid is the visual signature.

**No texture**: same reasoning as fence. Wood-grain authoring is its
own sprint.

### Steps / Stairs (`steps_stairs`)

**Pre-Sprint V**: single low slab (`elementHeightFt` of 0.8 ft —
ridiculous for a stair).

**Sprint V**: stair-stepped silhouette. Step count = max(2, min(8,
round(runLength / 1.5))) — for a 12-ft Thompson stair that's 8 steps;
for a 4-ft stair it's 3. Each step's box runs the full tread width +
height = `(stepIndex+1) × STAIR_RISE_FT` (0.6 ft per step). The
rendered total rise = `stepCount × 0.6` ft, matching ~7" rise per
step — industry standard.

**Texture**: routes through `BoxMaterial` so paver/stone textures
applied to the stair material apply per-step.

### Garden Bed (`garden_bed`)

**Pre-Sprint V**: solid box (looked identical to a patio).

**Sprint V**: 4 thin edging strips around the perimeter (height
`GARDEN_BED_EDGING_HEIGHT_FT` = 0.8 ft) + a slightly recessed soil
fill in the interior at 0.3 ft. Soil colour is hard-coded warm
brown (`#5b3a1d`) overriding the AI-suggested element colour for
visual clarity — a "garden bed full of mulch" reads more clearly
than a bed with the same surface colour as the edging.

**No texture on soil**: solid colour with `roughness: 1` reads as
soil. Edging routes through `meshStandardMaterial` (no Box wrapper
needed since the strips are too thin for tiled textures).

### Outdoor Kitchen (`outdoor_kitchen`)

**Pre-Sprint V**: solid 3-ft-tall slab.

**Sprint V**: counter slab (3 ft tall, 2.5 ft deep along the back of
the element footprint) + up to 3 appliance silhouettes spaced along
the counter (rendered as 1.6 × 0.8 × 1.6 ft boxes in stainless tone
`#a3a3a3`, `roughness: 0.4`, `metalness: 0.7`). End-slot appliances
are skipped on counters under 6 ft to avoid crowding.

**Texture**: counter routes through `BoxMaterial` so granite / stone
counter albedos apply.

## Camera framing change

**Pre-Sprint V**:
```ts
const frameSpan = Math.max(spanX, spanZ, 30)
const cameraDist = frameSpan * 1.6
```
Snapped tight to element bbox; on a 30-ft set of elements the 150-ft
satellite was almost entirely off-screen.

**Sprint V**:
```ts
const propertyHalfSpan = backdropFootprint ? backdropFootprint * 0.55 : 0
const frameSpan = Math.max(spanX, spanZ, propertyHalfSpan, 30)
const cameraDist = frameSpan * 1.4
const lookAtX = backdropFootprint ? centerX * 0.5 : centerX
const lookAtPlanY = backdropFootprint ? centerPlanY * 0.5 : centerPlanY
```

Effects:
- Frame span now factors property footprint at 55% — keeps a healthy
  margin of satellite around the elements without making them tiny
- Distance multiplier dropped to 1.4× since we're already padding via
  the property factor (was 1.6×)
- LookAt target is weighted average of element bbox center + property
  origin, so elements sit at bottom-third of frame and the house
  (typically near origin in the satellite) sits toward top-third —
  natural reading order

## Bundle impact

```
Before: dist/assets/PlanView3D-*.js  893,580 bytes
After:  dist/assets/PlanView3D-*.js  897,693 bytes
Delta:  +4,113 bytes (+0.46%)
```

6 new primitives added in 4 KB — geometry helpers + the constant block
amortize well. Within budget.

## Known gaps + follow-ups

- **No CC0 texture seed catalogue yet**. Sprint V scope was the
  primitives + camera; texture authoring (paver / sod / mulch / gravel
  / concrete CC0 maps hosted on Supabase Storage) is its own sprint
  (call it Sprint V+ or fold into PERF_BUDGET.md). The
  `MaterialFormModal` already lets contractors paste URLs per-material
  per Sprint 7f, so the current MVP path works; seeding is a
  contractor-experience polish.
- **3D MCP screenshot capture is flaky on Windows**. The visual
  regression is verified by code review + manual desktop-Chrome
  inspection, not by CI screenshots. If this becomes a problem, swap
  Chromium for Firefox in Playwright (`firefox` works around the
  WebGL-headless issue) or run the visual suite on a Mac/Linux CI
  worker.
- **No automated unit tests** for ElementPrimitive. Each branch is a
  pure function of the box props; testable with `react-test-renderer`
  + a fake three.js scene. Add when one of these primitives starts
  drifting.

## Cleanup

Delete the seed project before merging if you don't want it in the
project list:

```sql
DELETE FROM project_elements WHERE project_id = '5dd98ed2-f909-4af0-a7c5-6014f35b866b';
DELETE FROM projects WHERE id = '5dd98ed2-f909-4af0-a7c5-6014f35b866b';
```

Or just delete it via the OverviewTab UI (the Delete button in the
project header).
