# TerrainForge — Roadmap

> **What this is.** Single prioritized source of "what's next." Consolidates all
> contractor feedback (v2-v5), the Apr 5 audit report, Supabase advisor findings, and
> internal stability work. Status on each item: ✅ done / 🟡 in-progress / 🔴 open.
>
> **Last updated:** 2026-04-26 (~50 contractor-walkthrough findings closed across 18 commits; materials engine verified end-to-end on staging; next focus: 3D in wizard).
>
> **Audience.** Next session's default work picker. Read after `CLAUDE.md` + `CONTEXT.md`.

---

## The destination

**3D client-facing design app.** The contractor tool is the feeder — measurements
flow in, a 3D rendering of the project flows out to the client. Every priority below
either unblocks partner testing (so we can keep the foundation solid) or moves us
closer to the 3D pivot.

---

## Sprint queue (autonomous run — 2026-04-28) — ✅ ALL FOUR SHIPPED

Commits `aab54d9 → cafe7e3 → e4d50ec → 08b6336` on `claude/quirky-ishizaka`,
deployed to staging at <https://terrainforge-staging.netlify.app>.

1. ✅ **Sprint X** — P0 partner-test sweep. 8 of 12 items shipped real
   fixes (X-2/X-7/X-9/X-10/X-11/X-12); 5 turned out to already be fixed
   by prior commits and were closed as no-ops; X-6 (custom popover arrow
   keys) deferred — too scope-heavy to batch.
2. ✅ **Sprint S** — Anthropic API key moved server-side. New
   `proxy-claude` Edge Function authenticates via Supabase JWT, applies
   per-org rate limit (30 req/min), audit-logs every invocation. Client
   now calls `supabase.functions.invoke('proxy-claude')` instead of
   fetching `api.anthropic.com` directly. **Manual step still required:**
   set `ANTHROPIC_API_KEY` in Supabase Edge Function Secrets, then rotate
   the previously-exposed `VITE_ANTHROPIC_API_KEY`.
3. ✅ **Sprint U** — Vitest installed (4.1.5). 58 unit tests covering
   all 6 computation models + unit-conversions + manifest aggregation.
   Guards the "raw-before-rounding" rule with a regression test for the
   historical double-buy bug. `npm test` / `npm run test:watch` wired up.
4. 🟡 **Sprint D Inc 1** — Contractor `/queue` page shipped: cross-project
   pending-submission list with project grouping, count badge on the More
   dropdown, 60s polling. **Inc 2 (magic-link auth) and Inc 3 (reverse-
   direction "design your project" invite) deferred** — scoped out of
   this autonomous batch because magic-link auth changes are too sensitive
   to ship without a manual review pass.

Each sprint verified: tsc clean → build green → vitest green (Sprint U+) →
commit → push → Netlify deploy. ROADMAP entries below have been updated
to reflect what landed; what's marked 🔴 is what was *not* done in this run.

## P0 — Partner-test blockers (fix before next partner session)

These are actively breaking Charlie's partner's ability to use the app.

### 🔴 CSV material import fails after ~50 rows *(V3)*
> "Failed to save Material" error when importing a larger catalog.
Likely a Supabase rate-limit or batched-insert missing. **Investigation starts at**
`src/pages/MaterialLibrary.tsx` CSV handler + `src/services/supabaseMaterials.ts`
`createMaterial`. Fix: batch inserts via `upsert` with chunks of 50, or add retry
logic. High impact — contractors won't onboard without bulk import.

### 🔴 Materials page AI suggests 4″ base depth, contradicts engine's 6″ *(V3)*
> Two sources of truth for base depth in the UI; contractor sees both and gets
confused. The engine (`src/materials-engine/unit-conversions.ts` `DEPTH_MINIMUMS`)
enforces 6″ for gravel/sand — but the AI prompt in `src/services/aiRecommendations.ts`
still seeds 4″ in some paths. Fix: make the AI prompt read from `DEPTH_MINIMUMS` or
strip all AI-suggested depths and have the engine compute.

### 🔴 Completed project stays "scheduled" *(V4)*
> "I brought a Project to full Completion. The status remained scheduled. Maybe
because I have it set for next week." — When a user marks completion from the project
view, status should transition to `completed`. Likely the completion UI writes to
`completed_at` but doesn't set `status`. **Investigation**:
`src/components/project-dashboard/CloseoutTab.tsx` +
`src/stores/projectStore.ts` completion action.

### 🔴 Quoted tab missing from UI *(V4)*
> "Do we have a Quoted Tab? Before hitting Client Approval, you get a notification
that the project was added to 'Quotes'." — The `'quoted'` status exists in the DB
(migration 024) and the enum, but the Dashboard pipeline tabs may not include it
as a filter. Check `src/pages/Dashboard.tsx` STATUS_FILTER_OPTIONS + pipeline filter.

### 🔴 Crewmember added in wizard doesn't save to Crew Tab *(V4)*
> "I added a Crewmember when I was creating new project but didn't save that crew
member to my Crew Tab." — New crew via wizard only links to the project; should also
write a row to `crew_members` if the name didn't match an existing member.
**Investigation**: `src/pages/ProjectWizard.tsx` `handleCreate` crew block.

### 🔴 Arrow keys broken on some dropdowns *(V3, V4, V5)*
> Recurring across 3 rounds of feedback. "Still can't use full function of Arrow keys
when selecting drop downs. Some work some don't." Mixed native `<select>` vs custom
dropdown components. Audit every picker: native selects with `onChange` should work;
custom popover components need explicit keyboard handlers. Likely offenders:
SuggestionPanel, MaterialPicker, address autocomplete, supplier search.

### 🔴 Zero doesn't clear on numeric inputs *(V4, V5)*
> "The Zero in each box doesn't disappear when I click to enter in amounts used.
I can't delete the zero first thing I have to enter in my number then use arrow
keys to shift over to the Zero to delete it." — `<input type="number" value={0}>`
pattern. Fix: change inputs to display "" when value is 0 and the user has focused,
or auto-select-all on focus. Applies to Cost Breakdown (V5) and Project Completion
material-quantities-used (V4). Generic input-behavior fix.

### 🔴 Owner crew role not in onboarding UI *(V3)*
> DB has the role (migration 025), `crew_members.role` CHECK accepts it, but the
onboarding step for adding the first crew member doesn't offer 'Owner' in its
role dropdown. `src/components/onboarding/AddCrewStep.tsx`.

### 🔴 Polymeric sand priced per pound in wizard *(V3)*
> Engine uses 50lb bag / 65 sqft correctly, but wizard material add UI shows
"per pound" unit. Fix: ensure wizard material picker surfaces the purchase_unit from
the catalog (likely mismatched in `WizardStepMaterials.tsx`).

### 🔴 Supplier search returns schools *(V3)*
> Nominatim search too loose. Filter the results by place type (exclude `school`,
`amenity`, `leisure`) and require `shop` / `landscape` / `building=industrial`.
`src/hooks/useAddressAutocomplete.ts` or wherever supplier geocoding lives.

### 🔴 Equipment auto-assignment names show GUIDs *(V3)*
> On Schedule/project view, equipment cards show raw UUIDs instead of equipment
names. Missing join or display lookup. Cheap fix.

### 🔴 Task timeline man-hour distribution visually wrong *(V3)*
> "2mh day 1, 16mh day 2 for a weeklong job → calculating 13 working days." The
`src/lib/taskTimeline.ts` algorithm groups by phase correctly but the visual render
in `src/components/shared/TaskTimeline.tsx` may be doubling or mis-summing. Needs
a trace through a known-good test case.

---

## P1 — Engineering / hardening (next 1-2 sessions)

### 🔴 Consolidate 25 multiple-permissive RLS policies
Supabase performance advisor still flags 25 cases where two permissive policies on
the same table/role/action run redundantly (e.g., `crew_members_self_select` +
`crew_view` both fire for SELECT). Consolidate into single `OR`-joined policies.
Own migration (028). Deferred from mig 027 because it needs per-table analysis.

### 🔴 Move Anthropic API key server-side
`VITE_ANTHROPIC_API_KEY` is browser-exposed with `anthropic-dangerous-direct-browser-access`.
Fine for partner test; not fine once real contractors are on. Build a Supabase Edge
Function that proxies to `api.anthropic.com/v1/messages`, add per-org rate limiting,
rotate the exposed key. ~2-3 hours work.

### 🔴 Curved shapes + circles in measurements *(V4)*
> "Need to be able to calc out round shapes, need to be able to add circle walls,
patios, round garden beds etc. Same with edging lines & walkways, need to be able
to calculate curves & round edges." Major architectural add. Options:
1. Add a `shape` discriminator to `project_elements` (`rectangle|circle|polyline|custom_svg`)
   + conditional dimension fields (radius, arc_length, curve_points JSONB).
2. Keep elements linear-dimensioned but add a `geometry` JSONB column (SVG path
   or GeoJSON) that can describe arbitrary shapes. Unifies with 3D app plans.
Recommendation: option 2 — matches the `site_geometry` pattern planned for 3D app.
Single migration adds the column; wizard step gets a shape picker that writes the
geometry blob; engine reads both `length_ft × width_ft` (rectangular fallback) and
`geometry.area` (computed from the blob).

### 🟡 Materials engine accuracy *(V4)* — mostly closed by Sprint M
> "Some pricing on materials still isn't dialed in yet but that will change once
the materials engine is completed." Sprint M (commit 7cba8cf) shipped a
30-scenario harness scoring `inferMaterialsForElement` against expected
categories + quantity ranges. **87.0% mean / 0 forbidden hits** — both
threshold goals met. Two real production prompt bugs caught + fixed
(category-label drift, mulch quantity 6.6× over-spec). Run via
`npm run materials:score` (~3 min, ~$0.45). Remaining gap: `vitest` unit
tests for the pure compute models in `src/materials-engine/*` — those are
deterministic so they're a different surface from the AI harness. See P2
"Vitest + test suite for materials-engine".

### 🔴 Wire the `manifests` table
Snapshots feature scaffolded by mig 026 but no code writes to it. Add a hook on
project status transitions `approved → scheduled`: generate a manifest via
`generateEngineManifest()` and insert a row. `src/services/supabaseManifests.ts`
new file.

### 🔴 Element-level override UI
`project_element_materials` already has `spacing_override_inches`,
`waste_factor_override`, `manual_count`, `wall_length_ft`, `wall_height_ft`,
`computation_model` columns — contractor can't set them from any UI yet. Add to
`MaterialPicker.tsx` as an "Advanced" collapsible section.

### 🔴 Documentation refresh
`.claude/ARCHITECTURE.md` is from Apr 4 (9-step wizard, pre-materials-engine). Needs
a pass. `.claude/DESIGN_SYSTEM.md` may or may not be stale — review when a UI change
touches it.

---

## P2 — Stability / polish

### 🔴 Vitest + test suite for materials-engine
Zero tests currently. Engine functions are pure — highest ROI for unit tests.
Install vitest, add `src/materials-engine/*.test.ts`, cover all 6 computation models.
Also cover `src/lib/manifest.ts` adapters.

### ✅ Bundle splitting (closed by Sprint P, commit d751bd8)
~~`index.js` is 2.65 MB. `React.lazy` the "More" dropdown pages.~~
**Done**: Sprint P shipped `manualChunks` (vendor-react, vendor-supabase,
vendor-stripe, vendor-pdf) + `React.lazy` for MaterialLibrary,
PriceResearch, Billing, Settings, WorkOrders, Onboarding. Eager bundle
2,681 KB → 519 KB; total eager 876 KB. Gzip 830 KB → 252 KB. Per-chunk
budgets in `.claude/TESTING/PERF_BUDGET.md`.

### 🔴 Centralize localStorage keys
21 scattered `tf-*` localStorage reads across 10+ files. Move all into `uiStore` +
`orgStore` namespaces per the CLAUDE.md rule. Prevents a repeat of the cross-account
data-leak saga (F-011 in TESTING/FINDINGS.md).

### 🔴 Drop `project_materials` legacy table
Redundant with `projects.materials` JSONB; nothing reads from it. One-line migration.
Also drop `idx_pm_*` indexes (already dropped in 027 anyway). Hold until all readers
verified gone.

### 🔴 Port `generateSteps()` off zones, then drop zone tables
`src/lib/workorders.ts` `generateSteps()` still reads from zones. Once ported to
elements, drop `zones`, `zone_materials`, `zone_equipment` (3 tables, 4-5 RLS
policies each).

### 🔴 Split oversized files
Still over CLAUDE.md's soft limits:
- `src/pages/Landing.tsx` (1108 LOC — extract hero/features/pricing/CTAs)
- `src/components/wizard/WizardStepMeasurements.tsx` (546)
- `src/components/wizard/WizardStepPlan.tsx` (439)
- `src/pages/ProjectWizard.tsx` (1014, orchestrator — could extract AI flow)
- `src/components/onboarding/AddSuppliersStep.tsx` (572)

---

## P3 — 3D pivot (ACTIVE)

Originally "gated on P0 clear." P0 cleared and this was the next push. Multiple
sprints shipped between Apr 21–23. Section reflects current state per-item.

### 🆕 Next session focus: 3D preview inside the project wizard

3D rendering is currently post-creation only — the contractor enters dimensions in Step 2 (Measurements), creates the project, and then can toggle 3D on the Overview tab. The next push pulls that 3D viewer back INTO the wizard so contractors see their elements rendered in 3D as they enter measurements, with the preview updating live as dimensions change.

**Why this matters**: tightens the feedback loop from "type 24×18, hope it's right" → "type 24×18, see the patio appear at full size on the property." Contractors catch sizing mistakes at the source. Also exercises the 3D-editing modes (Sprint 7a) on a different surface, which surfaces any state-handling assumptions baked into the post-creation flow.

**Open backlog this push will likely close or advance**:
- 6a/7a editing parity inside the wizard (drag to move/resize/rotate so contractors can tweak placement before saving)
- 6c precise placement (use the wizard's address-geocoded property footprint as the 3D ground origin instead of `(0,0)`)
- 6f/7e shape primitive coverage for any element type that's still rendering as a generic box
- 7c real PBR texture maps once a hosting decision lands (currently per-category material props only)

**Architectural questions to settle early**:
1. Where exactly does the 3D canvas mount — embedded in WizardStepMeasurements (alongside the dimension form) or as a fullscreen toggle from that step?
2. Live preview state — does the wizard pass un-persisted `WizardElement[]` directly to PlanView3D, or does PlanView3D need a different prop shape?
3. How do edits flow back — drag in 3D updates `data.elements[i].lengthFt` / `widthFt` / position, then the dimension form fields reflect the change.
4. Performance — does mounting r3f on every step transition + every dimension keystroke cause lag? Probably need a `requestAnimationFrame`-debounced re-render.

**Critical files to read first**:
- [PlanView3D.tsx](src/components/plan/PlanView3D.tsx) — current 3D viewer (~750 LOC)
- [WizardStepMeasurements.tsx](src/components/wizard/WizardStepMeasurements.tsx) — Step 2 of the wizard
- [planLayout.ts](src/lib/planLayout.ts) — shared geometry helpers (`autoLayout`, element-type heights, default origin offset)
- [DesignSandbox.tsx](src/pages/DesignSandbox.tsx) — DEV-only 3D r3f playground; useful reference for live-edit flows

### ✅ Schema additions for spatial data (migrations 028 + 029 + 030, all live)
- ✅ `project_elements.geometry` JSONB (mig 028)
- ✅ `projects.site_geometry` JSONB (mig 028)
- ✅ `project_share_tokens` table with RLS + anon policies (mig 028)
- ✅ `bump_share_token_view` RPC (mig 028)
- ✅ `project_share_tokens.client_response/responded_at/note` + `respond_to_share_token` RPC (mig 029)
- ✅ `materials.texture_albedo_url / normal_url / roughness_url` (mig 030)
- 🔴 `element_relationships` (adjacency/containment/elevation) — not yet needed
- 🔴 `project_scenes` versioned JSONB — skipped; the `project_elements.geometry` per-row approach is working

### ✅ 3D rendering stack decision
`@react-three/fiber@^8.18.0` + `@react-three/drei@^9.122.0` + `three@^0.162.0`
pinned in package.json. Requires `optimizeDeps.include: ['three', '@react-three/*']`
in `vite.config.ts` to be pre-bundled — without that, fiber's `WebGLRenderer`
references an unresolved THREE and Canvas silently fails to paint (see S5 debug in
FINDINGS).

### ✅ Start with 2D top-down (PlanView2D)
Full SVG viewer + editor: auto-layout, drag-to-move, 4-corner resize, rotation
handle. Mapbox satellite backdrop. Contractor + client (read-only) surfaces.

### ✅ Client-facing share link (read-only view)
`/share/:token` route live. Token-scoped anon RLS. Client approve / request-changes
workflow (mig 029). Contractor sees response banner + echoed note on Overview tab.

### ✅ 3D camera (PlanView3D)
r3f Canvas with orbit controls, per-category material properties, floating labels,
shadow-casting directional light, hemisphere fill. Extrudes rectangle elements to
boxes sized by measured dimensions. Ground plane is the Mapbox satellite of the
real property (geo-aligned to actual extent via Web Mercator math).

### ✅ PBR texture library (Sprint 7c — closed 2026-04-23)
PlanView3D loads `materials.texture_albedo_url` via three's TextureLoader,
applies as `map` on meshStandardMaterial with SRGB + RepeatWrapping (one tile
per 3ft of element surface). First material per element with a URL wins. Anon
share-link viewer gets the URLs too — `fetchSharedProjectByToken` now returns
`materialsById` via the mig 028 anon RLS policy that scopes materials-SELECT
through an active share token. No seed catalogue yet (contractors paste URLs
per-material via 7f).

### ✅ Per-material texture URL editor (Sprint 7f — closed 2026-04-23)
MaterialFormModal has Albedo / Normal / Roughness URL input fields in a new
"3D Textures (optional)" section. `MaterialLibrary.MaterialForm` types
extended; `materialToForm` / `formToMaterial` convert to/from the
migration 030 columns. Empty strings persist as `null` in the DB.
File-upload-to-Supabase-Storage is deferred polish; URL paste covers the
MVP path and can be swapped in the same form field later.

### ✅ 3D editing — all three modes closed (Sprint 7a, 2026-04-23)
- ✅ **7a-translate**: click-to-select + drei TransformControls on the ground
  plane. OrbitControls locks while dragging. Position snaps to 1-ft grid.
- ✅ **7a-rotate**: Y-axis yaw ring, snap to 15°, `space="local"`.
- ✅ **7a-resize**: local X/Z scale handles, multiplies width/height,
  snap to 1-ft, min 2×2 ft. Scale resets to 1 on commit so chained
  resizes don't stack multiplicatively.
- Mode switcher toolbar (Move / Rotate / Resize / Deselect) appears as an
  HTML overlay only when editable + a selection is active.
- Client viewer stays read-only (`editable` defaults false).

### ✅ Shape primitives (Sprint 6f / 7e — closed 2026-04-23)
Trees render as trunk (cylinder) + canopy (sphere). Shrubs as a spherical dome
sized to element footprint. Fire pits as a short stone-rim cylinder with a
glowing ember top (emissive material). Labels position above the primitive's
actual top height. Other element types keep their box extrusions.

### ✅ Resend email on client response + contractor-to-client proposal email (Sprint 7d — closed 2026-04-24)
Both Edge Functions deployed and operational against prod Resend. `send-proposal-email` v6 verified live with `emailed: true` round-trip in 2.3s. `notify-client-response` v4 same code path. Two emergent bugs found + fixed during live testing:
- F-CW-EMAIL-01: malformed `NOTIFY_FROM_EMAIL` (missing closing `>`) — operator config
- F-CW-EMAIL-02: functions queried `client` instead of `client_name` from projects table — silent query failure produced placeholder-text emails. Commit `e4e5c06`.
In-app banner on OverviewTab continues to work as a fallback when env vars aren't configured.

### 🟡 Precise element-on-property placement (Sprint 6c — residual closed 2026-04-23)
S7b delivered the geo-aligned satellite plane. S6c-residual (Apr 23) fixed the
default auto-layout to offset 25 ft south of origin so un-positioned elements
don't overlap the house. Full auto-inference ("fit to yard" based on geocoded
house footprint) remains a UX design problem; the current default keeps
elements visible on the lawn area until the contractor positions them.

---

## P4 — Next sprints (overnight-runnable)

Three discrete, well-scoped sprints that I (Claude) can run autonomously
overnight against the staging deployment. Each is self-verifying — no
human eyes in the loop required to know whether it landed correctly.
Logged here after Phase C v0 + polish wrapped (commits `5ccec06` →
`8fa113a`). Pick one and assign explicitly; do not run multiple in
parallel — they touch overlapping files (PlanView3D, OverviewTab,
aiRecommendations).

### ✅ Sprint M — Materials engine accuracy harness (closed 2026-04-28)

**Status**: shipped. 30-scenario harness (10 element types × 3 sizes)
runs every prompt-change via `npm run materials:score` (~3 min, ~$0.45
of Anthropic budget). Baseline 30% mean → iter 1 (CATEGORY VOCAB enum)
73.9% → iter 2 (formula directives + edging scope + 1500 tokens) **87.0%
mean, 0 forbidden hits**. Both ROADMAP threshold goals met.

Two real prompt bugs uncovered + fixed:
1. Claude returning role labels (`hardscape`, `base_material`,
   `structural`) instead of the `MaterialCategory` enum the production
   code expects (`paver`, `gravel`, `lumber`). Affected production
   `CATEGORY_TO_ELEMENT_TYPES` lookups too — silent.
2. Bulk-material quantity drift: mulch consistently came back at 6.6×
   expected. Claude was using cuft/27 instead of (sqft × inches)/324.
   Worked examples in the prompt fixed it.

Sidecar context + iteration log: `.claude/TESTING/MATERIALS_ACCURACY_NOTES.md`.
Live scorecard: `.claude/TESTING/MATERIALS_ACCURACY.md` (regenerated by
the harness).

### 🆕 Sprint M — Materials engine accuracy harness — ORIGINAL BRIEF (preserved)

**Brief**: Build a synthetic test harness that runs ~30 scenarios (10
element types × 3 dimension variations) through `inferMaterialsForElement`,
scores Claude's quantity outputs against industry-standard expectations
(F-PHB-02 sod-base / F-PHB-06 sqft-clamp etc. flag false positives), and
generates a calibration scorecard. Iterate the prompt + validators until
the scorecard passes a configurable threshold (default ≥ 80% accuracy
per scenario).

**Why this is overnight-runnable**: tight inner loop. Run harness → see
deltas → tweak prompt → re-run. Costs ~$0.50 per full pass × 20–30
iterations = ~$10–15 of API budget.

**Deliverables**:
- `src/services/aiRecommendations.harness.ts` — pure scorer module
- `e2e-or-script/materials-accuracy.ts` — runs N scenarios, writes
  scorecard JSON to `.claude/TESTING/materials-scorecard-<date>.json`
  + a markdown summary to `.claude/TESTING/MATERIALS_ACCURACY.md`
- Prompt iterations to `aiRecommendations.ts` (negative examples,
  sharper formula directives, unit-vocab clarifications)
- Validator hardening — extend the F-PHB-06 sqft clamp to other units
  (lnft on linear elements, cuyd on bulk materials, etc.)
- npm script `npm run materials:score` to re-run on demand

**Self-verifying**: scorecard score is the success metric. Snapshot
the scenarios + expected outputs; harness diff fails if accuracy
regresses.

**Risks**:
- Anthropic API flakiness (rate limits / transient 5xx) — handle with
  exponential backoff + per-scenario retry
- Scenario expected-output authorship is opinionated; document
  explicitly in `MATERIALS_ACCURACY.md` so reviewers can argue with
  the harness, not the score

**Critical files**:
- `src/services/aiRecommendations.ts` — `inferMaterialsForElement`,
  `validatePerElementMaterials`, `relevantCategoriesForType`
- `src/types/index.ts` — `AIMaterialRecommendation`,
  `ElementMaterialInferenceContext`
- `.claude/TESTING/FINDINGS.md` — F-PHB-01/02/06 (existing observed bugs)

---

### ✅ Sprint P — Performance pass (closed 2026-04-28)

**Status**: shipped. Initial-paint JS reduced 67%:

| | Before | After | Reduction |
|---|---|---|---|
| Eager total bundle | 2,681 KB | 876 KB (519 + 163 + 194) | −67% |
| Eager gzip | ~830 KB | ~252 KB | −70% |

Changes:
1. `vite.config.ts` `manualChunks` — vendor-react / vendor-supabase /
   vendor-stripe / vendor-pdf split out so they cache independently
   across deploys
2. Lazy-loaded all secondary routes (`MaterialLibrary`, `WorkOrders`,
   `PriceResearch`, `Billing`, `Settings`, `Onboarding`) plus the
   already-lazy hub pages. Each gets a `<React.Suspense>` wrapper.
3. New `npm run analyze` script — builds + prints chunk-size table
   sorted desc.
4. Budget doc at `.claude/TESTING/PERF_BUDGET.md` with per-chunk
   targets + manual chunks rationale + Lighthouse expectations.

Heavy libraries (mapbox-gl 1.7 MB, vendor-pdf 1.5 MB, PlanView3D 898
KB) all stay in their own chunks — already lazy via consumer routes
(ProjectDashboard, SharedProjectView, MaterialsTab, WorkOrders,
Billing). They never load on first paint.

E2E suite (6/6) passes against the post-Sprint-P deploy in 40s — no
regressions from the chunking + lazy-loading shuffle. The walkthrough
exercises the lazy `/projects/wizard` and `/share/:token` routes plus
the dashboard route, so the shape of the regression gate matches the
shape of the changes.

Out of scope (deferred): Lighthouse automation (run manually for now),
auth-page lazying (5–10 KB savings not worth the flash), preload
hints, image audit, CSS code-splitting.

### 🆕 Sprint P — Performance pass (bundle + first paint) — ORIGINAL BRIEF (preserved)

**Brief**: Build flags 2.6 MB `index.js` + 1.7 MB `mapbox-gl` chunk +
893 KB `PlanView3D` chunk. Audit and code-split: lazy-load three.js /
mapbox-gl until the canvas mounts, move Settings/Billing/MaterialLibrary
into their own chunks, audit images for next-gen formats, evaluate CSS
for unused selectors. Target: 50% smaller initial JS, sub-1s first
paint on simulated 4G.

**Why this matters**: contractors load this on phones in the field.
Today's first-paint on a cold cache is in the 3–5s range on a fast
connection; field LTE is 2–5× slower. Every 100 KB shaved off the
initial bundle is real time off the contractor's day.

**Deliverables**:
- `vite.config.ts` `manualChunks` strategy for the heavy libs
- `React.lazy` + `<Suspense>` boundaries for Settings, Billing,
  MaterialLibrary, PriceResearch, WorkOrders, CrewDashboard, CrewJobDetail
- Defer `PlanView3D` import behind a "load 3D" intent (e.g. only
  import when the 3D toggle is clicked the first time, not on
  OverviewTab mount)
- Defer Mapbox import similarly — currently it loads even when no
  satellite backdrop renders
- Audit `dist/` chunks and document expected sizes in
  `.claude/TESTING/PERF_BUDGET.md`
- Add `npm run analyze` (Rollup visualizer or similar) for ongoing
  monitoring

**Self-verifying**:
- `npm run build` chunk sizes (read from stdout, assert against
  budgets in `PERF_BUDGET.md`)
- Lighthouse via Chrome MCP on staging deploy — assert performance
  score ≥ 75 on mobile-emulated cold load
- Existing E2E walkthrough (Sprint E once shipped) catches functional
  regressions from any dynamic-import shuffle

**Risks**:
- Dynamic imports break circular dependencies; if Vite catches them
  the dev server fails fast but prod-build can hide them. Run a full
  walkthrough (manual or automated) before landing.
- Lazy-loaded routes need a Suspense fallback that's not jarring;
  match the existing dark green panel.

**Critical files**:
- `vite.config.ts` — chunking config
- `src/App.tsx` — Route declarations + existing `React.lazy` pattern
  (already used for SharedProjectView, Landing, etc.)
- `src/components/project-dashboard/OverviewTab.tsx` — Mapbox /
  PlanView3D import sites
- `src/components/plan/PlanView2D.tsx` + `PlanView3D.tsx` — Mapbox
  TextureLoader call sites

---

### ✅ Sprint V — 3D primitives + camera framing (closed 2026-04-28)

**Status**: shipped. 6 new primitives in PlanView3D (wall / retaining_wall,
fence, pergola, steps_stairs, garden_bed, outdoor_kitchen) replacing
generic box extrusions. Camera framing factored to include property
footprint (was: snap to element bbox; now: max of element span,
property half-span, 30 ft minimum, with weighted lookAt). Bundle delta:
+4 KB. E2E suite still 6/6 green. Texture pipeline (Sprint 7c)
preserved on the BoxGeometry primitives that route through `BoxMaterial`.

What was deferred:
- CC0 texture seed catalogue (paver / sod / mulch / gravel / concrete
  CC0 maps hosted on Supabase Storage). The contractor URL-paste path
  via MaterialFormModal still works; seeding is a polish sprint.
- Per-primitive `react-test-renderer` unit tests. Add when drift
  becomes a problem.

See `.claude/TESTING/3D_VISUAL_REGRESSION.md` for per-primitive
geometry intent + bundle delta + camera-framing math.

### 🆕 Sprint V — 3D primitives + texture maps (visual fidelity) — ORIGINAL BRIEF (preserved for reference)

**Brief**: Replace remaining generic box extrusions in PlanView3D with
type-specific primitives. Wire the migration 030 texture-URL columns
to actually load albedo maps for paver / sod / mulch / gravel /
concrete via the existing `BoxMaterial`. Tighten camera framing
defaults so the elements + house both fit in view on first paint.

**Why this matters**: visual scaffolding is the wizard's whole pitch
("AI suggestions become falsifiable when rendered on the contractor's
real property"). Each new primitive makes AI suggestions more legible
and trust-building. Texture maps push the demo from "abstract gray
blocks" to "this looks like the actual job."

**Deliverables**:
- New primitives in `PlanView3D.tsx` `ElementPrimitive`:
  - `wall` / `retaining_wall`: stacked-block visual (3-4 cylinder
    layers or BoxGeometry rows)
  - `fence`: posts every 6–8 ft + horizontal rails (per panel
    geometry)
  - `pergola`: 4 corner posts + crossbeam roof grid
  - `steps_stairs`: multi-step extrusion (one box per step at
    incrementing Y)
  - `garden_bed`: low edging frame + soil fill (slightly recessed
    interior box)
  - `outdoor_kitchen`: counter + appliance silhouettes
- Texture pipeline:
  - Seed catalogue: 5 high-quality CC0 textures hosted on Supabase
    Storage (paver, concrete, sod, mulch, gravel) — 1024×1024 JPG,
    seamless tile
  - Update `MaterialLibrary` seed-catalogue migration to populate
    `texture_albedo_url` for default materials
  - Verify `BoxMaterial` SRGB + RepeatWrapping renders correctly on
    new primitives that use BoxGeometry
- Camera framing helper: compute the bounding box of `elements +
  property satellite footprint`, set initial camera distance + lookAt
  so both fit comfortably (~1.4× span). Replace the current "snap to
  element bbox" default that ignores the property.
- Visual regression: snapshot Chrome MCP screenshots of the Thompson
  test project before/after, save to
  `.claude/TESTING/3D_VISUAL_REGRESSION.md`

**Self-verifying**:
- Build doesn't crash + tsc clean (functional)
- Each primitive's render path has a named export so a unit test can
  smoke-render it via react-test-renderer (no full WebGL needed)
- Chrome MCP screenshots before + after side-by-side; visual sanity
  check — primitives render distinct from boxes, textures load
  without obvious artifacts (stretched, pixelated, wrong-color)

**Risks** (highest of the three):
- three.js / r3f rabbit-hole potential — multi-mesh group ordering,
  shadow-casting on complex geometry, texture loading async failure
  states. Set hard 2-hour cutoff per primitive; revert any that
  exceed
- Texture asset hosting: Supabase Storage works but bandwidth costs
  scale. Document expected MB/material in PERF_BUDGET.md
- Seamless-tile texture authoring is a craft skill; CC0 sources from
  ambientCG / cc0textures.com are the safe path. Don't generate
  textures in this sprint

**Critical files**:
- `src/components/plan/PlanView3D.tsx` — `ElementPrimitive`,
  `BoxMaterial`, `TexturedBoxMaterial`
- `src/lib/planLayout.ts` — `elementHeightFt`, `elementMaterial`,
  `elementColor` (color fallback for primitives without textures)
- `supabase/migrations/030_material_textures.sql` — schema for
  texture URLs
- `src/components/library/MaterialFormModal.tsx` — texture URL inputs
  (already wired)

---

### Coordination notes

- Each sprint is self-contained. Pick exactly one per overnight run.
- All three benefit from Sprint E (E2E walkthrough automation, currently
  in flight) being complete first — Sprint E becomes the regression
  gate that catches functional breakage in any of these sprints.
- After each sprint completes, archive its plan section here ("Done
  recently") and let me know whether to start the next.

---

## Done recently (last 2 weeks)

- ✅ Contractor-walkthrough verification (Apr 24): full fresh-contractor persona walked through wizard → share link → email proposal. 10 findings logged (F-CW-01..10), 9 shipped + 1 false positive. 2 emergent email-side bugs found + fixed during live verification (F-CW-EMAIL-01 operator typo, F-CW-EMAIL-02 wrong projects column). Commits `c219d80`, `4c6bd84`, `e4e5c06`, `8c6d5b4`.
- ✅ Real Resend email delivery operational end-to-end (Apr 24): both Edge Functions verified live against prod Resend
- ✅ Shared `computeProjectCost` helper at `src/lib/projectCost.ts` — single source of truth for cost rollup; closes wizard-vs-Overview number disagreement
- ✅ Edge Function JWT decode fix (replaced wrong `supabase.auth.getUser(jwt)` API with direct base64 decode; gateway already validated via `verify_jwt: true`)
- ✅ Migration 020-026 schema catch-up (Apr 17, committed)
- ✅ Migration 027 perf + security hardening (88 RLS wraps, 12 FK indexes, 28 unused
  drops, 10 function pins, audit_log tighten)
- ✅ Git sync with production (72 uncommitted files recovered, 4 commits shipped)
- ✅ Deleted 3 unrouted pages (Schedule, CrewManager, EquipmentManager — 2,127 LOC)
- ✅ Deleted orphan WizardStep3.tsx (642 LOC)
- ✅ Last `: any` removed from src/
- ✅ CLAUDE.md + ERD.md refreshed against live state
- ✅ Doc consolidation (63 .md files → 22 active + organized archive)
- ✅ WorktreeCreate hook installed globally to prevent silent agent isolation
- ✅ Formula corrections (base depth 6″ min, polymeric sand 65 sqft/bag, cuyd formula
  documented) — engine-level
- ✅ 6-step wizard rebuild (Job → Measurements → Plan → Materials → Numbers → Summary)
- ✅ Materials computation engine with 6 models + STARTER_CATALOG + CSV supplier import
- ✅ Project lifecycle enum (estimate → quoted → approved → scheduled → in_progress →
  completed/on_hold) + status gates on UI
- ✅ Man-hours / clock-hours clarified across task UI
- ✅ ProjectElement + project_element_materials measurement-driven architecture
- ✅ Shared components: ElementVisual, MaterialPicker, TaskTimeline
- ✅ Unified progress model (src/lib/projectProgress.ts)
- ✅ **3D pivot Sprint 1** — migration 028 + `/share/:token` public route + PlanView2D SVG (Apr 22)
- ✅ **Sprint 2** — Mapbox satellite on 2D + migration 029 client approve/reject (Apr 22)
- ✅ **Sprint 3** — drag move + 4-corner resize + rotation handle in PlanView2D + r3f/drei install + DesignSandbox (Apr 22)
- ✅ **Sprint 4** PARTIAL — migration 030 PBR columns + PlanView3D scaffolding shipped; 2D/3D toggle reverted pending S5 (Apr 22)
- ✅ **Sprint 5** — Vite `optimizeDeps` fix restored 3D toggle end-to-end (Apr 23)
- ✅ **Sprint 6** PARTIAL — 6b satellite 3D ground + 6d per-category material props (Apr 23). 6a/6c/6e/6f pending.
- ✅ **Sprint 7** PARTIAL — 7b geo-aligned Web Mercator tile footprint + element-focused camera (Apr 23). 7a/7c/7d/7f pending.
- ✅ **Sprint 7e** — Shape primitives (trunk+canopy trees, dome shrubs, fire pits with emissive embers) (Apr 23)
- ✅ **Sprint 6c-residual** — `autoLayout` default origin offset (0, 25) so un-positioned elements sit on lawn not house (Apr 23)
- ✅ **Sprint 7d (scaffold)** — `notify-client-response` Edge Function + fire-and-forget client call; dormant until Charlie deploys + sets env (Apr 23)
- ✅ **Sprint 7c** — PlanView3D loads `materials.texture_albedo_url` via TextureLoader; RepeatWrapping, SRGB (Apr 23)
- ✅ **Sprint 7f** — MaterialFormModal URL input fields (Albedo / Normal / Roughness) persist to mig 030 columns (Apr 23)
- ✅ **Sprint 7a-translate** — drei TransformControls on selected element in 3D, snap-to-1ft, OrbitControls lock on drag (Apr 23)
- ✅ **Sprint 7a-resize + 7a-rotate** — mode switcher toolbar (Move / Rotate / Resize), local-space handles, snap-to-grid, min-size enforcement (Apr 23)
- ✅ Dev-only escape hatches: `VITE_DEV_AUTO_SIGNIN_*` + `VITE_DEV_BYPASS_BILLING` (Apr 22)

---

## Deferred / out of scope

Tracked for completeness; not actively planned.

- HaveIBeenPwned leaked-password toggle — Supabase Pro only. Trigger: first real
  contractor.
- Landing page `1108 LOC` extraction — cosmetic. No functional issue.
- Replacing Postgres ENUMs (`org_role`, `audit_action`, `maintenance_type`) with
  TEXT + CHECK — CLAUDE.md rule violation but pre-dates it. Low priority.
- Squash migrations 001-027 into a single `00_init.sql` — bold but unnecessary while
  no real data.

---

## Source attribution

- V2 → `.claude/feedback/v2.md` (pre-launch feedback, April)
- V3 → `.claude/feedback/v3.md` (post-Phase-1-4 feedback)
- V4 → `.claude/feedback/v4.md` (Apr 21, freshest)
- V5 → `.claude/feedback/v5.md` (Apr 21, follow-up polish items)
- Audit → `TerrainForge_Audit_Report.docx` (Apr 5 internal audit)
- Supabase advisors → run via MCP `get_advisors` anytime
