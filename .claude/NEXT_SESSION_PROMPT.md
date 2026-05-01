# Next session prompt — TerrainForge, post-2026-05-01

> Drop the contents below into a fresh Claude Code session as the
> opening user message. Everything Claude needs to start producing
> useful work is in here or one read-link away.

---

## Headline: 2D / 3D placement still needs work

Charlie tested the live staging deploy at the close of the 2026-05-01
session and reported, verbatim:

> *"I just tested personally, there is still a lot of work to do on the
> 3D and 2D placement. You're about to run out of context for this
> session. We need to lock down this in our next session."*

**This is your priority for the next session.** Before you touch any
of the option list further down, work this thread first.

### Why the placement harness says it's fine but Charlie says it isn't

Sprint AI-Place + F-PLAC-02 region-based scoring just shipped the
harness to **100% mean accuracy** across 22 operational fixtures. That
metric checks three cheap things per element: within geocode radius,
not inside an OSM building footprint, away from a road. It does NOT
check:

- Whether the element renders at the right visual scale on the satellite tile
- Whether the 3D extrusion height / orientation / ground alignment looks right
- Whether the element drifts visually from where the AI rationale says it placed
- Whether the buildable polygon overlay agrees with actual element positions
- Whether a contractor inspecting the canvas at multiple zoom levels sees obvious wrongness

The harness is now a **regression gate**, not a **UX gate**. Saved as
memory → `memory/feedback_2d3d_placement.md`. Read that first.

### How to actually drive this down

1. **Get Charlie's specific symptoms.** Ask him at session open: which
   property did he test, what did he see (scale wrong? element on the
   roof? 3D mesh sunk into ground? pinch felt wrong?), screenshots if
   he has them.
2. **Drive the live wizard end-to-end via Chrome MCP.** Pick 3-5
   addresses from `e2e/ai-placement/corpus.ts` (urban / suburban /
   rural / commercial / treed). Run the wizard, screenshot the 2D
   canvas at full-zoom, mid-zoom, and zoomed-out. Open the project
   dashboard, toggle 3D, screenshot from default angle + top-down.
3. **Catalog what you see** in `.claude/TESTING/FINDINGS.md` under a
   new F-PLAC-03 family. One row per visible defect with: property,
   zoom level, expected vs observed, suspected file (PlanView2D /
   PlanView3D / aiPlacement / element-mesh-builder).
4. **Fix in priority order.** Likely candidates based on what we know:
   - `src/components/plan/PlanView2D.tsx` — element rect/circle render
     scale (uses `pixelsPerFoot * dimension`; verify against tile-bound
     plan-feet math)
   - `src/components/plan/PlanView3D.tsx` — mesh height defaults
     (paver 0.4 ft, edging 0.3 ft from F-3D-MESH-01) and ground offset
     (0.05 ft) — check whether they apply to all element types
   - `src/components/wizard/WizardStepMeasurements.tsx` — the new
     `<WizardElementEditSheet>` editor: confirm ± steppers actually
     write back to `data.elements` (sheet → wizard data plumbing)
   - `supabase/functions/proxy-claude/index.ts` vision call response
     handling in `src/services/aiPlacement.ts` — rationale says X,
     element ends up at Y means the normalized → plan-feet conversion
     might be off
5. **Don't trust the harness as your gate.** After every fix, eyeball
   the canvas. Run the harness too — it should still be 100% — but
   the screenshot is the proof.

### Files to read first

- `memory/feedback_2d3d_placement.md` (this session's takeaway)
- `src/components/plan/PlanView2D.tsx` (large but stable — read for
  element rendering math, NOT to refactor)
- `src/components/plan/PlanView3D.tsx`
- `src/components/wizard/WizardStepMeasurements.tsx`
- `src/components/shared/ElementEditSheet.tsx` (new this session)
- `src/components/wizard/WizardElementEditSheet.tsx` (new this session)
- `src/services/aiPlacement.ts` (normalized tile coords → plan-feet)
- `.claude/TESTING/AI_PLACEMENT_NOTES.md`

---

## Open PRs from the 2026-05-01 session — pending Charlie's review

7 PRs are open and have NOT been merged. They were pushed to feature
branches; do not assume they're on `main`:

| PR | Branch | What |
|----|--------|------|
| [#122](https://github.com/anthropics/terrainforge/pull/122) | `sprint-schedule` | Dedicated `/schedule` Gantt-lite page |
| [#123](https://github.com/anthropics/terrainforge/pull/123) | `sprint-materials-settings` | Org-level material defaults panel |
| [#124](https://github.com/anthropics/terrainforge/pull/124) | `sprint-p2-hardening` | Probe script, obstacle labels, bulk-import stress |
| [#125](https://github.com/anthropics/terrainforge/pull/125) | `sprint-provider-catalog` | Supplier directory autocomplete |
| [#126](https://github.com/anthropics/terrainforge/pull/126) | `sprint-ai-buildable-2` | OSM building footprint overlay |
| [#127](https://github.com/anthropics/terrainforge/pull/127) | `sprint-corpus-authoring` | F-PLAC-01/02 corpus + region-based scoring + 100% mean |
| [#128](https://github.com/anthropics/terrainforge/pull/128) | `sprint-touch-ui` | ElementEditSheet + pinch-to-scale on PlanView2D |

If Charlie merges any of these before next session, `git pull main`
first and re-baseline before starting placement work — the touch UI
sheet (#128) directly affects how he tests, and `sprint-corpus-authoring`
(#127) defines what "100%" means.

**Pinch-to-scale (in #128) was NOT verified live** — Chrome MCP can't
emit two pointerdown events for a real pinch. Real touch hardware (or
Chrome DevTools Device Mode) is required. Likely first thing Charlie
will test.

**Total spend on 2026-05-01 session: ~$8.95 of the $10 cap.** Anthropic
vision calls were the bulk of it (multiple harness re-runs).

---

## Context to load before doing anything

You're picking up a TerrainForge session. Read these in order, then come back here:

1. **`CLAUDE.md`** (root) — current status block (top), tech stack, architecture rules.
2. **`.claude/CONTEXT.md`** — partner preferences (Charlie), known quirks, decisions locked in.
3. **`.claude/ROADMAP.md`** — START WITH the "Currently open work (post-2026-04-30 truth)" section at the top. The long history below is reference, not the to-do list.
4. **`.claude/feedback/v6.md`** — most recent contractor (jbluhm) feedback round; what's shipped vs deferred.
5. **`memory/feedback_2d3d_placement.md`** — this session's UX gap.
6. **`.claude/TESTING/AI_PLACEMENT_NOTES.md`** if you're working on placement; otherwise skim.

Production deploys go to `terrainforge-staging.netlify.app` via `npx netlify-cli deploy --dir=dist --prod --site=d8efdf00-91f7-4717-aabd-d1c65372a634`. The site is NOT git-connected; you push commits AND drag-deploy the build.

---

## Where things stand right now

The V6 contractor feedback loop with jbluhm is closed at the
architectural level. Sprint AI-Place + AI-Buildable Phase 1 + the V6
jbluhm batch + Bucket A are all live in prod. Latest commit on `main`
is `a807987` (NEXT_SESSION_PROMPT itself).

Above that, on feature branches and unmerged: F-PLAC-02 (corpus +
region-based scoring), touch UI sheet, pinch-to-scale, parcel polygon
overlay, materials settings panel, schedule page, provider catalog,
P2 hardening — see PR table above.

Single working tree on `main`. 181/181 vitest green. tsc + build clean.

---

## Pick one of these for this session — ONLY after the 2D/3D placement work above is locked

The ROADMAP "Currently open work" section lists 14 items. I've grouped them here by "next big push" type. **Pick exactly one.** Don't try to multi-thread — they touch overlapping files. Each is sized to fit one focused session.

### Option 1 — "Ship the Schedule page" (P1, ~1 day)

**Why this matters.** jbluhm's V6: *"I think the schedule should be its own defined page that can be edited & changed at any given moment."* Today's schedule UI is scattered across Work Orders / Resources tab / Crew + Equipment Hub. Nobody can answer "show me everything on Tuesday" with one click.

**Already started in PR #122 (`sprint-schedule`).** Pull that branch
and finish if Charlie hasn't merged it yet.

**Scope.**
- New route `/schedule` rendering a single editable schedule view: rows per project, columns per day (Gantt-lite), drag to reschedule, edit start/end inline.
- Pull from existing `schedule_entries` (mig 005) + `project_crew_assignments` (mig 013) + `projects.start_date / target_date`.
- Filter: status (estimate / approved / scheduled / in_progress), date range (this week / this month / custom), crew member.
- Status update: dragging a project's bar across dates should update `start_date` / `target_date`. Status transition (e.g. approved → scheduled) writes a manifest snapshot per existing pipeline.

**Critical files.** `src/stores/scheduleStore.ts` already exists; verify what's there vs what you need. `src/pages/CrewEquipmentHub.tsx` has the closest existing UI to fork from. `src/components/project-dashboard/ResourcesTab.tsx` and `src/pages/WorkOrders.tsx` are the surfaces that today route contractors AT a schedule that doesn't exist — clean them up to point at the new `/schedule`.

**Verification.** `npm run e2e:walkthrough` (covers wizard → create → status transitions); manual click-test on the new page.

---

### Option 2 — "Ship Materials Settings (fixed-rate defaults)" (P1, ~1.5 days)

**Already started in PR #123 (`sprint-materials-settings`).** Pull
that branch and finish if Charlie hasn't merged it yet.

**Why this matters.** jbluhm's V6: *"Maybe we should have a Materials Setting where a contractor can go into and put in basic stuff like: 'I only use Class 5 for all my base work from this one Supplier & it costs this much.'"* Plus disposal-rate categories he wants to set once: Brush, Concrete, Soil, Fill, Rock. The AI currently invents these every project.

**Scope.**
- Migration 037: `organizations.material_defaults JSONB` with shape:
  ```json
  {
    "categoryRates": [
      { "label": "Class 5 base", "category": "gravel",
        "supplierId": "uuid", "unitCost": 35, "unit": "cuyd" }
    ],
    "disposalRates": [
      { "type": "concrete", "unitCost": 80, "unit": "cuyd" }
    ]
  }
  ```
- New "Material Defaults" panel in Settings (or a sub-tab on the Materials page).
- Two tables: category rates, disposal rates. Add / edit / delete rows; supplier picker shows the org's suppliers.
- AI integration: `aiRecommendations.ts` budget prompt receives the org's defaults. When AI suggests $X/yard for gravel, it's instructed to use the contractor's rate if set, otherwise infer from location.
- Engine: when material qty is computed and the catalog has no `costPerPurchaseUnit`, fall back to the org's category rate.

**Critical files.** `src/services/aiRecommendations.ts` (budget prompt section), `src/lib/manifest.ts` (engine's cost rollup), `src/stores/orgStore.ts` (load/save defaults), new `src/components/settings/MaterialDefaultsPanel.tsx`.

**Verification.** Materials accuracy harness (`npm run materials:score`) should reflect defaults if set; verify a fresh project on a real address picks up the defaults.

---

### Option 3 — "Author the AI placement corpus + harden the prompt" (P1, ~half day actively + scheduled passes)

**LARGELY DONE in PR #127 (`sprint-corpus-authoring`).** Corpus now
has 22 operational fixtures and the harness scores 100% on
region-based criteria. Remaining work: convert harness from "region
pass" to "render-quality pass" once Charlie's specific 2D/3D
complaints are catalogued (see headline section above). That's the
real Option 3 going forward.

---

### Option 4 — "Sprint AI-Buildable Phase 2 (parcel boundary clipping)" (P1, ~1.5 days)

**Already started in PR #126 (`sprint-ai-buildable-2`).** OSM
building footprint overlay landed; parcel polygon clipping is the
remaining piece. Pull that branch and continue if Charlie hasn't
merged it yet.

**Why this matters.** The Sprint AI-Place vision call sometimes places elements in beautiful patches of grass that turn out to be the neighbor's lawn. The AI returns a `buildableArea` polygon, but it's just the AI's read of the satellite — there's no parcel data telling us where THIS lot ends. The fix is to fetch the actual parcel polygon from a public source per address and clip placements to it.

**Scope.**
- Pick a parcel-data provider:
  - **OSM** (`landuse=residential` near address) — free, ~70% hit rate, requires Nominatim or Overpass API queries.
  - **Regrid** — paid, accurate, requires API key + spend approval.
  - **County GIS** — free, fragmented per-county, big lift to integrate.
  - **Recommend OSM-only first**; promote to Regrid if hit rate is unacceptable.
- Migration 037 (or whatever number is next): no new column needed — `projects.lot_geometry` already exists from mig 035, just isn't being populated.
- New `src/services/parcelLookup.ts` — cascading lookup with provider fallback. Returns plan-feet polygon centered on the property's lat/lng.
- Wizard: after geocode + before AI placement, kick off parcel lookup in parallel. Pass parcel polygon to `inferElementPlacements` so the prompt can constrain placements.
- 2D + 3D: render the parcel polygon as a soft outline (visually distinct from the AI buildable polygon — maybe dotted blue).
- Soft-clip drag: extend existing obstacle-warning halo to also fire when contractor drags outside the parcel.

**Critical files.** New `src/services/parcelLookup.ts`. `src/pages/ProjectWizard.tsx` (kick off parcel lookup alongside placements). `src/components/plan/PlanView2D.tsx` + `PlanView3D.tsx` (render parcel overlay).

**Verification.** Re-run the placement corpus (Option 3 dependency, but works without it too). Verify on a known suburban address that the parcel polygon is roughly the actual lot.

---

### Option 5 — "AI re-inference at end of Step 2" (P1, ~1 day)

**Why this matters.** Today `triggerAIIfNeeded` fires once at Step 0→1 transition with just the description. By the end of Step 2, the contractor has dragged + sized real elements. Step 3 (Plan/Crew) and Step 4 (Numbers) should re-run AI inference against the now-known element list for sharper crew/equipment/budget estimates. Right now they use the description-only initial pass.

**Scope.**
- New trigger: when the contractor advances from Step 2 → Step 3, re-run `generateProjectRecommendations` with the element list + dimensions in the context.
- Update `src/services/aiRecommendations.ts` `buildPrompt` to use element data when present (currently it's already there as `existingElements`, but the prompt may not be exercising it).
- UI: small "Re-running AI estimates with your placed elements…" status banner during Step 3 paint. Cached so re-entering Step 3 doesn't burn another call.
- Optional: cost cap per project (we've talked about $0.05 vision call already; adding a $0.10 task/crew call brings per-create cost up).

**Critical files.** `src/services/aiRecommendations.ts`, `src/pages/ProjectWizard.tsx` (Step 2→3 trigger), `src/components/wizard/WizardStepPlan.tsx` (banner).

**Verification.** Materials accuracy harness; manual test that crew suggestions for a 2400-sqft patio differ meaningfully from the description-only "small patio project" pass.

---

## What NOT to do this session

- **Don't trust the placement harness 100% score as proof of UX correctness** — it's a regression gate, not a UX gate. See headline section.
- Don't refactor `PlanView3D.tsx` or `PlanView2D.tsx` for fun. They're large but stable. Targeted fixes only.
- Don't reformat existing code wholesale.
- Don't add new dependencies unless the option you picked specifically calls for one.
- Don't push to `main` directly — push to a fresh branch and FF after `npm test` + `npm run build` are green.
- Don't deploy without verifying staging shows the bundle hash matches `dist/assets/index-*.js`.
- Don't auto-deploy to Netlify branch deploys — production deploy is manual via `netlify-cli deploy --dir=dist --prod`.
- Don't merge the 7 open PRs (#122-#128) without Charlie's go — they're his to review.

---

## Operator decisions to confirm before starting

- **First**: which 2D/3D placement symptoms specifically did Charlie see? (Scale? Drift? 3D height? Pinch feel? Buildable overlay disagreement?) — block on this before chasing fixes.
- **Option 4 only:** which parcel-data provider should I use? (OSM-only → free, ~70% hit rate. Regrid → paid, accurate.)
- **Option 5 only:** OK to add a second AI call per project create (~$0.10 added on top of the existing ~$0.05 vision call)? Total per-project cost goes ~$0.15.
- All options: **the abandoned `sprint-23-crew-pin-auth` branch is 1 month old with 8 unique commits about crew PIN auth that never landed.** Should it be deleted, or do you want it back on the roadmap?

---

## Suggested process

1. Read the load list above (CLAUDE.md → CONTEXT.md → ROADMAP.md → feedback/v6.md → memory/feedback_2d3d_placement.md).
2. Ask Charlie for his specific 2D/3D placement symptoms before writing code.
3. Make a checklist (TodoWrite) with 5-10 concrete steps before writing code.
4. Each step: edit, verify (`npx tsc --noEmit`, `npm test`), commit.
5. End-to-end verification before pushing: `npm run build` clean, manual test on staging via Chrome MCP. **Screenshot the canvas at multiple zoom levels — that's the proof, not the harness score.**
6. Update the ROADMAP "Currently open work" section + add an entry to `.claude/TESTING/FINDINGS.md` if you fixed a bug.
7. Push to a feature branch first; FF to main + drag-deploy `dist/` to Netlify only after verification.

Default to commits over chat — narrate the work in commit messages so future sessions can follow.
