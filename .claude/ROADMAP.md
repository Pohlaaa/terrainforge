# TerrainForge — Roadmap

> **What this is.** Single prioritized source of "what's next." Consolidates all
> contractor feedback (v2-v5), the Apr 5 audit report, Supabase advisor findings, and
> internal stability work. Status on each item: ✅ done / 🟡 in-progress / 🔴 open.
>
> **Last updated:** 2026-04-21 (post stabilization + mig 027 + V4/V5 ingestion).
>
> **Audience.** Next session's default work picker. Read after `CLAUDE.md` + `CONTEXT.md`.

---

## The destination

**3D client-facing design app.** The contractor tool is the feeder — measurements
flow in, a 3D rendering of the project flows out to the client. Every priority below
either unblocks partner testing (so we can keep the foundation solid) or moves us
closer to the 3D pivot.

---

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

### 🔴 Materials engine accuracy *(V4)*
> "Some pricing on materials still isn't dialed in yet but that will change once
the materials engine is completed." Ongoing. Review engine against a known
project manually — use a real material catalog (STARTER_CATALOG) and verify the 6
computation models produce contractor-expected quantities. Write vitest suite
alongside (currently zero tests).

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

### 🔴 Bundle splitting
`index.js` is 2.65 MB. `React.lazy` the "More" dropdown pages: MaterialLibrary,
PriceResearch, Billing, Settings, WorkOrders. Expect ~400 kB drop to initial bundle.

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

## P3 — 3D pivot preparation (gated on P0 clear)

Tasks that start the architectural shift toward the 3D app. Only begin when the
P0 list is empty — i.e. when the partner can run an end-to-end flow without
blockers.

### 🔴 Schema additions for spatial data (migration 029?)
- `project_elements.geometry` JSONB (shape + position + rotation)
- `projects.site_geometry` JSONB (boundary polygon, elevation samples)
- `materials.texture_albedo_url` / `normal_url` / `roughness_url`, or `textures` JSONB
- New table `element_relationships` (adjacency, containment, elevation)
- New table `project_share_tokens` (client-view tokens with role + expiry)
- Optional: new table `project_scenes` (versioned scene graph JSONB) OR extend
  `manifests` with a `scene` payload.

See `.claude/ERD.md` "Extension points" table for the full list.

### 🔴 3D rendering stack decision
Default pick: `react-three-fiber` + `@react-three/drei`. Alternatives Babylon.js
(more feature-heavy, heavier) or vanilla three.js (thinner, more code). Charlie's
preference TBD — ask at the start of that session.

### 🔴 Start with 2D top-down
Before 3D, ship a flat top-down view scaled from `project_elements` dimensions +
shape geometry. This shakes out the "do measurements produce a correct plan"
question without the 3D camera/lighting complexity. Once that's clean, switch to
a 3D camera on the same scene data.

### 🔴 Client-facing share link (read-only view)
Core of the "killer feature" — contractor designs, client sees a URL, client sees
the 3D scene rendered with the materials chosen. Needs the `project_share_tokens`
table and a new `/share/:token` route with no auth but token-scoped read access.

### 🔴 PBR texture library
`ElementVisual.tsx` already uses SVG patterns for each element type. For 3D, upgrade
to PBR maps (albedo, normal, roughness). Start with ~10 common materials (standard
paver, concrete, grass, mulch, wood, stone) and expand.

---

## Done recently (last 2 weeks)

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
