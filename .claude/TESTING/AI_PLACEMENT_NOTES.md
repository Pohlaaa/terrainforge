# Sprint AI-Place — operator + harness notes

> **What this is.** Living doc for the vision-grounded element-placement
> work. Captures prompt-iteration history, known failure modes per
> property type, the authoring protocol for the corpus's expected
> placements, and the cost/cadence of running the harness.
>
> **Status as of 2026-04-29 (commit `<TBD>`):** plumbing PR landed.
> mapTileMath + proxy-claude vision support + aiPlacement service +
> 15-entry corpus skeleton are all in place. The corpus needs Charlie's
> manual `expected` authoring before the harness becomes a real CI gate.
> Wizard wiring (Step 1 → Step 2 transition) is the second PR.

---

## Why this sprint exists

Charlie's manual test on 2026-04-29 confirmed `autoLayout`'s placement
heuristic puts elements in physically nonsensical locations: a 16×12
paver patio sits squarely on a building's roof, a 60-LF garden-bed
edging slices through both lanes of a 4-lane road. The 25-ft "south
of origin" offset (Sprint 6c residual) has zero awareness of road /
roof / lawn / driveway in the actual satellite tile.

**Hard requirement (per ROADMAP.md "Sprint AI-Place"): this must work
for any address the contractor inputs.** Not just suburban backyards
in our test corpus. Urban, rural, commercial, recently-built,
partially-occluded, and faded-imagery addresses are all in scope.

The fix grounds element placement in a vision-LLM read of the actual
satellite tile. The model sees what's road / roof / lawn / driveway
and returns placement coordinates as fractions of the tile.

---

## Architecture (recap)

```
Wizard Step 1 (address + description)
    │
    ▼
Inferred element list ──┐
Mapbox satellite URL ───┤
lat / zoom / px ────────┤
    │                   │
    ▼                   │
inferElementPlacements (services/aiPlacement.ts)
    │                   │
    │  ── prompt + tile bytes ──▶  proxy-claude (Edge Fn)
    │                                │
    │                                ▼
    │                            base64-encode tile
    │                            multi-block message
    │                                │
    │                                ▼
    │                            Anthropic Haiku 4.5 vision
    │                                │
    │                                ▼
    │  ◀── normalized coords ──────  raw response
    ▼
mapTileMath.normalizedToPlanFeet
    │
    ▼
ProjectElement.geometry.position (plan-feet)
```

Fallback chain (each step degrades gracefully):

1. Vision call succeeds + valid coords → use them.
2. Vision call returns coords outside `[0, 1]` → reject those, keep others.
3. Vision call times out (>15 s) or returns malformed JSON → use
   `autoLayout` 25-ft offset. Show contractor "AI placement
   unavailable — drag to position" hint.
4. Contractor drag-place in Step 2 always wins. AI is suggestion.

---

## Files in this sprint

### Plumbing PR (this commit)

| File | What |
|---|---|
| `src/lib/mapTileMath.ts` | Web Mercator helpers + normalized↔plan-feet conversion. Pure, dep-free, importable from Edge Functions. |
| `src/lib/mapTileMath.test.ts` | 19 tests covering m/px scaling, lat-cosine, round-trip, boundary conditions, regression-gate against PlanView3D constants. |
| `supabase/functions/proxy-claude/index.ts` | Extended to accept `images: string[]`. Server fetches each URL with 8s timeout, base64-encodes, builds Anthropic multi-block message. Cap of 4 images. The Mapbox token never reaches Anthropic. |
| `src/services/anthropic.ts` | New `callClaudeWithVision(prompt, images, model, maxTokens)` sibling to `callClaude`. |
| `src/services/aiPlacement.ts` | `inferElementPlacements(ctx)` — orchestrates the prompt build, vision call, parse + validation, plan-feet mapping. Pure JSON parsing, defensive against hallucinated keys / out-of-tile coords / malformed polygons. |
| `src/services/aiPlacement.test.ts` | 17 tests: prompt construction, valid response, error paths, fence stripping, JSON-block recovery, coord clamping, hallucinated-key rejection, polygon validation, imageryPoor flag, coordinate fidelity. |
| `e2e/ai-placement/corpus.ts` | 15-entry corpus spanning urban / rural / commercial / waterfront / sloped / heavily-treed / sparse / corner-lot / HOA-tract / townhouse / apartment / bad-address. |
| `.claude/TESTING/AI_PLACEMENT_NOTES.md` | This file. |

### Wizard-integration PR (next)

| File | What |
|---|---|
| `src/pages/ProjectWizard.tsx` | Kick off `inferElementPlacements` in Step 1 → 2 transition (in parallel with `inferElements`). Pre-populate `wizardData.elements[i].geometry.position`. |
| `src/components/wizard/WizardStepMeasurements.tsx` | Skeleton placeholders during call. "AI placed N elements" banner with rationale tooltip per element. "Recompute" button. |
| `e2e/walkthrough.spec.ts` | New checkpoint: assert that AI-placed elements land within the (eventual AI-buildable) area. |
| `package.json` | `npm run placement:score` script. |
| `.claude/TESTING/AI_PLACE_SCORECARD.md` | Generated by harness. |

### Phase 2 (Sprint AI-Buildable, separate sprint)

| File | What |
|---|---|
| `supabase/migrations/035_lot_geometry.sql` | `projects.lot_geometry JSONB` (parcel polygon) + `projects.buildable_area_geometry JSONB`. |
| `src/services/parcelLookup.ts` | Cascading lookup: Regrid (paid) → OSM (free, ~70% hit) → county GIS. |
| `src/components/plan/PlanView2D.tsx` + `PlanView3D.tsx` | Buildable polygon overlay (translucent green) + soft-clip drag warning halo. |

---

## Authoring the corpus expected placements

The corpus's `expected` arrays start as sensible-but-unverified guesses.
Before the harness becomes a real CI gate, **Charlie needs to author
each entry by hand**.

Protocol per entry:

1. Fill in the real `address`, `lat`, `lng` on the entry.
2. Open the address in `terrainforge-staging.netlify.app` (create a
   sample project at that address).
3. Add the entry's `elements` to the project (matching keys + types +
   dims).
4. Drag each element to where it should sit on the satellite (Step 2
   of the wizard). Verify in 3D view that placement reads correctly.
5. Note the resulting plan-feet `position.x` and `position.y` from
   each element's debug overlay (TODO: needs a small dev affordance —
   add to `WizardStepMeasurements` debug menu in the wizard PR).
6. Update `e2e/ai-placement/corpus.ts` with those coords.
7. Mark the entry's `// TBD` annotations as done.

Tolerance bands by property type (already set per entry):

| Property type | Tolerance |
|---|---|
| Suburban / standard | 25 ft |
| Urban rowhouse / townhouse | 8–12 ft |
| Rural / large lot | 50 ft |
| Commercial | 50 ft |
| Bad address (graceful fail) | n/a — expects empty placements map |

---

## Cost + cadence (target)

| Path | Cost | When |
|---|---|---|
| Single project wizard transition | ~$0.05 (Haiku vision, ~700 KB tile + ~2 KB prompt + ~800 token response) | Per project create |
| `npm run placement:score` (full corpus) | ~$0.75 (15 entries × $0.05) | Pre-merge gate, daily CI |
| Prompt iteration cycle | ~$0.75 per pass × ~20 passes = ~$15 | One-time during prompt tuning |
| Operator-tuning sessions | ~$5 per session | Weekly during early iterations |

Threshold: ≥ 70% mean accuracy across the 15 entries to merge new
prompt versions.

---

## Known failure modes (predicted; will be confirmed during corpus authoring)

These are the failure modes I expect to see when running the harness
against the real corpus. Each one might need a prompt fix, a fixture
adjustment, or both.

1. **Tile-vs-parcel mismatch** — model places element in a beautiful
   patch of grass that's actually the neighbor's lawn. Mitigation:
   Sprint AI-Buildable parcel data clipping. Until then: expect
   ~10–20% of HOA tract / townhouse fixtures to fail this way.
2. **Mature canopy occlusion** — model can't see the ground, places
   patio "in the woods." Mitigation: prompt mentions canopy
   awareness. Stress fixture: 06-heavily-treed.
3. **Stale satellite imagery** — recently-built houses don't appear
   in the tile. Model places elements over what looks like dirt
   (which IS where the house now stands). Mitigation: model returns
   `imageryPoor: true`, contractor falls to manual drag. Stress
   fixture: 05-recently-built-sparse.
4. **Commercial scale confusion** — model treats a parking lot as
   "buildable" because there's no rooftop. Mitigation: explicit rule
   #1 in the prompt (avoid asphalt). Stress: 04-commercial,
   12-apartment.
5. **Y-axis sign error** — placements come back consistently 50–200
   ft north or south of expected. Symptom of a coordinate-system bug
   in `mapTileMath` or `aiPlacement`. Caught by `mapTileMath.test.ts`
   regression gate.
6. **Hallucinated obstacles** — model invents "swimming pool" on
   properties that have none. Cosmetic — the buildableArea polygon
   may shrink wrongly but placements still land in real ground.
   Mitigation: low priority; surfaces in Sprint AI-Buildable when
   we render the overlay.

---

## Prompt iteration log

(Each iteration is a separate commit. Score format: `mean / hard
requirement`. Hard requirement is "no element on a roof or in a road"
which is checked separately in the scoring harness.)

| Iter | Date | Commit | Score | Change |
|---|---|---|---|---|
| v0 | 2026-04-30 | `5bb0b54` | (region-baseline) | Initial prompt — see `buildPlacementPrompt` in `aiPlacement.ts`. Region-based scoring landed in `26d05bf` hits 100% mean across 22 operational fixtures. |
| v1 | 2026-05-01 | `045b5f8` | 100% (unchanged) | F-PLAC-03 defense in depth: prompt explicitly states (x, y) is the element CENTER, not a corner. Region-based scoring isn't sensitive to corner-vs-center so the harness number is unchanged; the wizard now correctly converts. |
| v2 | 2026-05-01 | (this commit) | TBD | Added `rotationDeg` per-element placement. Model returns degrees clockwise from east-west long-axis baseline; wizard applies after `aiCenterToTopLeft` so rotation pivots around the AI's intended center. Defaults to 0 for square/circular elements. Region scoring won't reflect rotation quality directly — visual proof is the proof. |

---

## Open questions

1. **URL pass-through vs base64 server fetch.** Going with base64
   server fetch in the proxy so the Mapbox token never reaches
   Anthropic. Trade-off: ~150 ms extra latency + ~1 MB payload to
   Anthropic. Acceptable at MVP scale.
2. **Tile zoom strategy.** Currently the wizard uses zoom 19 (matches
   PlanView3D BACKDROP_ZOOM). Rural fixtures use zoom 17 to capture
   multi-acre context. Open question: does the model need a *single*
   zoom for consistency, or does the prompt handle variable zoom OK?
   Will know after corpus authoring.
3. **Multi-element placement ordering.** Model currently places each
   element independently. Two patios on the same property might
   land on top of each other. Mitigation either via prompt ("don't
   overlap previously-placed elements") or post-hoc collision-detect
   in `aiPlacement.ts`. Defer to v1 — corpus has at most 2 elements
   per fixture so this won't surface.
4. **Caching across wizard re-entries.** A contractor who tweaks the
   address slightly should not re-spend the vision call. Cache by
   `lat,lng,zoom,elementListHash` in the wizard for the session.
   Defer to wizard-integration PR.

---

## Stop-gap until this sprint ships

Per the F-3D-PLACEMENT-01 finding in `FINDINGS.md`: the wizard's
manual drag-in-Step-2 affordance already exists. Make sure all
marketing screenshots / demo recordings come from manually-placed
projects, NOT auto-layout E2E fixtures. Optionally hide the share
link button on projects where every element still has the default
auto-layout position.
