# Next session prompt — TerrainForge, post-2026-04-30

> Drop the contents below into a fresh Claude Code session as the
> opening user message. Everything Claude needs to start producing
> useful work is in here or one read-link away.

---

## Context to load before doing anything

You're picking up a TerrainForge session. Read these in order, then come back here:

1. **`CLAUDE.md`** (root) — current status block (top), tech stack, architecture rules.
2. **`.claude/CONTEXT.md`** — partner preferences (Charlie), known quirks, decisions locked in.
3. **`.claude/ROADMAP.md`** — START WITH the "Currently open work (post-2026-04-30 truth)" section at the top. The long history below is reference, not the to-do list.
4. **`.claude/feedback/v6.md`** — most recent contractor (jbluhm) feedback round; what's shipped vs deferred.
5. **`.claude/TESTING/AI_PLACEMENT_NOTES.md`** if you're working on placement; otherwise skim.

Production deploys go to `terrainforge-staging.netlify.app` via `npx netlify-cli deploy --dir=dist --prod --site=d8efdf00-91f7-4717-aabd-d1c65372a634`. The site is NOT git-connected; you push commits AND drag-deploy the build.

---

## Where things stand right now

The V6 contractor feedback loop with jbluhm is closed at the architectural level. Sprint AI-Place + AI-Buildable Phase 1 + the V6 jbluhm batch + Bucket A are all live in prod. Latest commit on `main` is `83e21c5` — doc refresh + `@rollup/rollup-linux-x64-gnu` demoted to optionalDependencies (so `npm install` no longer needs `--force` on Windows).

Single working tree on `main`. The historical `claude/quirky-ishizaka` worktree was cleaned up — fresh feature work goes in fresh worktrees as needed. 181/181 vitest green. tsc + build clean.

---

## Pick one of these for this session

The ROADMAP "Currently open work" section lists 14 items. I've grouped them here by "next big push" type. **Pick exactly one.** Don't try to multi-thread — they touch overlapping files. Each is sized to fit one focused session.

### Option 1 — "Ship the Schedule page" (P1, ~1 day)

**Why this matters.** jbluhm's V6: *"I think the schedule should be its own defined page that can be edited & changed at any given moment."* Today's schedule UI is scattered across Work Orders / Resources tab / Crew + Equipment Hub. Nobody can answer "show me everything on Tuesday" with one click.

**Scope.**
- New route `/schedule` rendering a single editable schedule view: rows per project, columns per day (Gantt-lite), drag to reschedule, edit start/end inline.
- Pull from existing `schedule_entries` (mig 005) + `project_crew_assignments` (mig 013) + `projects.start_date / target_date`.
- Filter: status (estimate / approved / scheduled / in_progress), date range (this week / this month / custom), crew member.
- Status update: dragging a project's bar across dates should update `start_date` / `target_date`. Status transition (e.g. approved → scheduled) writes a manifest snapshot per existing pipeline.

**Critical files.** `src/stores/scheduleStore.ts` already exists; verify what's there vs what you need. `src/pages/CrewEquipmentHub.tsx` has the closest existing UI to fork from. `src/components/project-dashboard/ResourcesTab.tsx` and `src/pages/WorkOrders.tsx` are the surfaces that today route contractors AT a schedule that doesn't exist — clean them up to point at the new `/schedule`.

**Verification.** `npm run e2e:walkthrough` (covers wizard → create → status transitions); manual click-test on the new page.

---

### Option 2 — "Ship Materials Settings (fixed-rate defaults)" (P1, ~1.5 days)

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

**Why this matters.** Sprint AI-Place plumbing is shipped, but the 15-property test corpus skeleton has placeholder lat/lng for 14 of 15 entries. Without real ground-truth, the harness (`npm run placement:score`) is directional, not a CI gate. And the placement quality on real properties — especially commercial / rural / heavily-treed — has only been spot-checked.

**Scope.**
- Author real lat/lng + hand-placed `expected[]` for the 15 entries in `e2e/ai-placement/corpus.ts`. Protocol in `.claude/TESTING/AI_PLACEMENT_NOTES.md`. Use the live wizard at `terrainforge-staging.netlify.app` to drag-place each fixture's elements and read off plan-feet.
- Run `npm run placement:score`. Iterate the prompt in `src/services/aiPlacement.ts` (`buildPlacementPrompt`) until the corpus hits ≥70% mean accuracy.
- Common failure modes likely to surface (predicted in `AI_PLACEMENT_NOTES.md`):
  1. Tile-vs-parcel mismatch (placed on neighbor's lawn) — partially mitigated by Sprint AI-Buildable Phase 2 if you also do that.
  2. Mature canopy occlusion — prompt rule already mentions canopy.
  3. Stale satellite imagery (recently-built houses) — model should set `imageryPoor: true`.
  4. Commercial scale confusion (parking lot ≠ buildable) — explicit rule #1 in prompt.
- Each prompt iteration: commit + push (re-running the harness locally costs ~$0.75 on Anthropic). Log iterations in `AI_PLACEMENT_NOTES.md` "Prompt iteration log."

**Critical files.** `e2e/ai-placement/corpus.ts`, `src/services/aiPlacement.ts`, `.claude/TESTING/AI_PLACEMENT_NOTES.md`.

**Verification.** Threshold is ≥70% mean. Land + log the score regardless. If you can't author all 15, author the 5 most-different and skip the rest — the harness already skips entries with placeholder lat/lng.

---

### Option 4 — "Sprint AI-Buildable Phase 2 (parcel boundary clipping)" (P1, ~1.5 days)

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

- Don't refactor `PlanView3D.tsx` or `PlanView2D.tsx` for fun. They're large but stable.
- Don't reformat existing code wholesale.
- Don't add new dependencies unless the option you picked specifically calls for one.
- Don't push to `main` directly — push to a fresh branch and FF after `npm test` + `npm run build` are green.
- Don't deploy without verifying staging shows the bundle hash matches `dist/assets/index-*.js`.
- Don't auto-deploy to Netlify branch deploys — production deploy is manual via `netlify-cli deploy --dir=dist --prod`.

---

## Operator decisions to confirm before starting

- **Option 4 only:** which parcel-data provider should I use? (OSM-only → free, ~70% hit rate. Regrid → paid, accurate.)
- **Option 5 only:** OK to add a second AI call per project create (~$0.10 added on top of the existing ~$0.05 vision call)? Total per-project cost goes ~$0.15.
- All options: **the abandoned `sprint-23-crew-pin-auth` branch is 1 month old with 8 unique commits about crew PIN auth that never landed.** Should it be deleted, or do you want it back on the roadmap?

---

## Suggested process

1. Read the load list at the top.
2. Pick an option. Tell the user what you picked and why.
3. Make a checklist (TodoWrite) with 5-10 concrete steps before writing code.
4. Each step: edit, verify (`npx tsc --noEmit`, `npm test`), commit.
5. End-to-end verification before pushing: `npm run build` clean, manual test on staging via Chrome MCP.
6. Update the ROADMAP "Currently open work" section + add an entry to `.claude/TESTING/FINDINGS.md` if you fixed a bug.
7. Push to a feature branch first; FF to main + drag-deploy `dist/` to Netlify only after verification.

Default to commits over chat — narrate the work in commit messages so future sessions can follow.
