# TerrainForge — Testing Plan

> **Last updated:** 2026-04-28 (post Sprint X/S/U/D run)
> **Audience.** Forward-looking plan for what to test next. Read after `PROTOCOL.md` (how to run tests today) and `E2E.md` (E2E architecture).
> **Scope.** Full coverage map across every testing layer, gap analysis, prioritized backlog, CI strategy. This is the strategy doc; per-finding receipts live in `FINDINGS.md`.

---

## TL;DR

We're strong at the top of the pyramid (AI accuracy harness, contractor-walkthrough E2E, manual partner walks) and at the very bottom for the materials engine specifically (Sprint U: 58 vitest tests). We're empty in the middle: zero tests on stores, services, components, edge functions, and RLS policies beyond the two RPCs covered by `rpc-negative`. There's also no CI — every test is manual-trigger today.

The single highest-leverage move is **CI on every PR**: GitHub Actions running `tsc + vitest + e2e (walkthrough only, harness excluded) + rpc-negative` against the staging deploy. That's ~10 minutes of parallel work per PR and would have caught at least 4 of the 18 walkthrough series regressions before they hit staging.

After CI, the testing backlog is ordered by blast radius: edge functions (we just shipped `proxy-claude` with no tests), stores/services (every page reads through them), then component-level tests on the wizard's `handleCreate` graph write (449 LOC, atomic, untested).

---

## Where we are today

| Layer | Tooling | Status | Coverage |
|---|---|---|---|
| Pure functions | vitest 4.1.5 | 🟢 strong (engine only) | `src/materials-engine/*` (58 tests). Everything else in `src/lib/`, `src/utils/` untested. |
| Stores | — | 🔴 none | 7 Zustand stores, all untested. |
| Services / data mapping | — | 🔴 none | `supabaseData.ts` (snake↔camel), `supabaseShareTokens.ts`, `supabaseMaterials.ts`, `aiRecommendations.ts`, `anthropic.ts` — all untested. |
| Components | — | 🔴 none | No RTL setup. Wizard, ProjectDashboard tabs, MaterialPicker, TaskTimeline untested. |
| E2E happy paths | Playwright | 🟢 strong | 5-step wizard → creation → share → client edit → submit → accept covered end-to-end (`walkthrough.spec.ts`). |
| E2E other surfaces | — | 🔴 none | ReviewQueue (just shipped), Settings, Budget editing, MaterialLibrary CSV import, Crew/Equipment hub all untested. |
| RPC negative | Playwright (direct REST) | 🟡 partial | 2 RPCs covered (`client_update_element_geometry`, `submit_design_changes`). Other RPCs + RLS edge cases untested. |
| Edge functions | — | 🔴 none | 7 functions in `supabase/functions/`, none tested — including `proxy-claude` shipped today and `stripe-webhook` (payment-critical). |
| AI accuracy | Custom harness | 🟢 strong | 30 scenarios, 87% mean, 0 forbidden. Excluded from default e2e; runs via `materials:score`. |
| Visual regression | — | 🟡 documented | `3D_VISUAL_REGRESSION.md` describes the approach; no code exists. |
| Perf budget | — | 🟡 documented | `PERF_BUDGET.md` lists targets; checked manually via `npm run analyze`. |
| Database / RLS | — | 🔴 manual only | No automated RLS audit; advisor warnings are caught only when run on demand. |
| **CI** | — | 🔴 **none** | No `.github/workflows/`. Every test is manual-trigger. |

---

## Layer-by-layer gap analysis

### Layer 1 — Pure functions (vitest unit)

**Covered (Sprint U):** `src/materials-engine/engine.ts`, `src/materials-engine/unit-conversions.ts` — 58 tests, raw-before-rounding regression test, all 6 computation models.

**Untested:**
- `src/lib/manifest.ts` — `computeQty`, `generateManifest`, `computeProjectCostRaw`. Used in three call sites; bugs flow into KPIs and budget rollups.
- `src/lib/projectCost.ts` — `computeProjectCost`. Powers wizard ↔ Overview consistency. Single source of truth for what a project will cost.
- `src/lib/workorders.ts` — generates installation steps per zone based on material categories. Drives the WorkOrders page.
- `src/lib/alerts.ts` — `getAllAlerts(state)`. If this returns wrong severities, contractor sees noise.
- `src/lib/kpiCompute.ts` — every dashboard KPI flows through here.
- `src/lib/planLayout.ts` — `resolveGeometry`, `autoLayout`, color/material tables. Drives 3D viewer and wizard placement.
- `src/lib/taskTimeline.ts` — the `exceedsTarget` / `totalScheduledDays` algorithm fixed by Sprint X-12. The fix was UI-only; the underlying algorithm has no tests.
- `src/utils/*` — formatting, dates, validation. Probably the cheapest wins per LOC.

**Why it matters:** these are pure functions with no I/O. Every test is fast (<1ms), runs in CI without a database, and catches regressions at compile time. Lowest cost-per-bug-prevented in the codebase.

### Layer 2 — Stores (vitest with mocked Supabase)

**Covered:** none.

**Untested:** 7 stores. Every page reads through them; every action writes through them. Each store has fetch/update/delete/optimistic-update logic that can silently corrupt state.

Highest-risk stores to cover first:
1. `projectStore` — `fetchProjects`, `fetchProjectFull`, `updateProject`. The fetchProjectFull graph traversal touches every related table; one bad join silently strips data.
2. `materialStore` — bulk import path (the F-045 chunked import). Regression risk: import a CSV bigger than the chunk size, ensure all rows land.
3. `scheduleStore` — crew assignment writes. Persisted to `project_crew_assignments`; live-edit conflicts possible.
4. `orgStore` — `fetchOrg` has the auto-create-on-first-login fallback (lines 125–167 of orgStore.ts). Subtle bug: a race here would silently create duplicate orgs.

**Approach:** mock `@/services/supabase` with an in-memory query stub. Test that store actions call the right table, with the right payload, and update local state correctly on success/failure.

### Layer 3 — Services / data mapping (vitest)

**Covered:** none.

**Highest-risk targets:**
- `src/services/supabaseData.ts` — snake_case ↔ camelCase mapper. Every Supabase fetch goes through `toCamelCase` and writes go through `toSnakeCase`. A miss here means data is silently dropped on round-trip. Should be a property-based test (round-trip a sample object, assert deep equality).
- `src/services/aiRecommendations.ts` — `validateAndEnrich`, `enrichAvailability`, `safeParseRecommendations`. The validation pipeline is the moat against bad AI output; Sprint M proved its value but the pipeline itself is untested.
- `src/services/supabaseShareTokens.ts` — just gained `fetchPendingDesignSubmissions` (Sprint D Inc 1). The embedded-select shape is fragile (Supabase's typings vary between embedded `projects` returning array vs. object); needs a test.
- `src/services/anthropic.ts` — Sprint S `callClaude` rewrite. The error-context unwrapping path (`ctx.json()` from `FunctionsHttpError`) is untested.

### Layer 4 — Components (vitest + React Testing Library)

**Covered:** none. RTL not yet installed.

**Targets in priority order:**
1. **`ProjectWizard.handleCreate`** (`src/pages/ProjectWizard.tsx` lines 441–889) — atomic graph write across `projects`, `project_elements`, `project_element_materials`, `project_subcontractors`, `project_permits`, `project_crew_assignments`. 449 LOC. If any step fails partway through, the project ends up half-created. **High blast radius, high complexity, untested.**
2. `WizardStepMeasurements` — drag-to-place + 3D canvas state plumbing (Phase A). Failure mode: contractor places elements but they don't persist.
3. `MaterialPicker` — per-element material selection sidebar. Sprint D Inc 1 will probably extend this.
4. `TaskTimeline` — Sprint X-12 added overrun warning UI. Tests would lock in the "warning shows when totalScheduledDays > totalTimelineDays" contract.
5. `BudgetTab` — Sprint X-7 added select-on-focus. Editing flow: enter edit mode → change quote → save → leave. Currently no test covers it.

**Approach:** install `@testing-library/react` + `@testing-library/jest-dom`. Add `jsdom` environment to vitest (currently `node`). Mock stores via Zustand's testing-friendly `setState` reset hook.

### Layer 5 — E2E (Playwright)

**Covered (`walkthrough.spec.ts`):** auth → 5-step wizard → AI calls → element-type changes → material caching → RPC persistence → share token lifecycle → client edits → submit → accept. 20 numbered assertions. This is the regression gate.

**Major surfaces NOT covered:**
- **`/queue`** (Sprint D Inc 1, just shipped). Test: contractor opens queue, sees pending count, clicks into project, accepts changes, queue empty.
- **MaterialLibrary CSV import** — F-045 chunked import. Test: upload CSV with >50 rows, all rows land, no error.
- **BudgetTab editing** — enter edit mode, change values, save, refresh, values persist.
- **Settings hub** — org profile updates, role assignment, KPI selection.
- **CrewEquipmentHub** — assignment / unassignment to projects.
- **MaterialPicker advanced overrides** — `spacing_override_inches`, `waste_factor_override`, `manual_count` — schema columns exist (mig 026), no UI test.
- **Trial / billing gates** — `useBillingGate` hook decisions. Test: expired trial sees overlay, signed-in past-due sees banner.

### Layer 6 — RPC negative (Playwright direct REST)

**Covered:** `client_update_element_geometry`, `submit_design_changes` with malformed payloads / wrong tokens.

**Untested RPCs:**
- `accept_client_changes` (revokes client_design token, called by contractor "Accept" button).
- Any RPCs added by future migrations.

**Untested RLS scenarios:**
- Cross-org isolation: org A user tries to read org B's project. Should return 0 rows silently. Worth automating because RLS bugs are silent failures.
- Anon scope: anon with valid token can only see one project's elements; shouldn't see siblings.
- Role-scoped writes: `designer` role can update but not delete; `client` role can do neither.

### Layer 7 — Edge Functions

**Covered:** none.

**Functions in `supabase/functions/`:**
1. `proxy-claude` (Sprint S) — auth check, rate limit, upstream forwarding. **Just shipped with zero tests.**
2. `send-proposal-email` — Resend integration, contractor → client email.
3. `notify-client-response` — client → contractor email on approve/reject/submit.
4. `search-local-suppliers` (Sprint X-10) — Nominatim search with school/civic blocklist.
5. `create-checkout-session`, `create-portal-session` — Stripe billing entry points.
6. `stripe-webhook` — **payment-critical.** Drives subscription status; bug = paid contractor blocked from app.

**Approach:** Edge Functions are Deno modules. Two test paths:
- **Unit-style:** import the handler into a `*.test.ts`, mock `Deno.env.get` + `fetch`, exercise the request/response shape. Works well for `proxy-claude`'s rate-limit and auth logic.
- **Integration-style:** deploy to a Supabase preview branch, call via HTTPS with various payloads, assert response codes and audit-log side effects. More expensive but the only way to test the JWT-verification path.

Top priority: `stripe-webhook` (paid bug), then `proxy-claude` (just shipped), then the others.

### Layer 8 — AI accuracy

**Covered:** Sprint M harness — 30 scenarios, 7 representative subset evaluated each run, 87% mean / 0 forbidden / 5 unique categories. Excluded from default e2e; runs via `npm run materials:score`.

**Open work:**
- Re-baseline after each AI prompt change. Today's run was post-Sprint-X (which strengthened the base-depth prompt and added the polymeric-sand coercion). Mean may have moved.
- Add scenarios: every time the contractor flags an AI miss in a partner walk, that scenario should land in `scenarios.ts`.
- Score against contractor-supplied catalog (currently scores against starter catalog only). Different orgs have different inventory; AI accuracy is per-catalog.

### Layer 9 — Visual regression (3D)

**Covered:** approach documented in `3D_VISUAL_REGRESSION.md`. No code exists yet.

**Why it matters:** the 3D viewer (`PlanView3D`) is hard to test functionally because rendering correctness is visual ("the patio looks right on the satellite"). Visual regression catches what unit tests can't: a shader miscompile, a camera-angle bug, a material that suddenly renders chrome instead of gravel.

**Approach (per existing doc):** Playwright screenshot diffs of the 3D canvas at deterministic camera positions, gated to the `walkthrough` project. Caveats: WebGL output is non-deterministic across machines; need a tolerance threshold (~5% pixel diff) and per-OS baseline images.

**Status:** documented but unimplemented. Cost to implement: 1-2 days. Recommend pulling forward only after Phase D ships (because Phase D Inc 2 magic-link will likely change the share viewer surface).

### Layer 10 — Perf budget

**Covered:** documented targets in `PERF_BUDGET.md`. Manual check via `npm run analyze` (which prints chunk sizes).

**Open work:** automate the budget. After every build, fail CI if any chunk exceeds its target. Trivially scriptable from the existing `analyze` output.

### Layer 11 — Database / RLS audit

**Covered:** manual via Supabase advisor MCP tool. Caught when run on demand; not part of any cadence.

**Open work:** scheduled monthly check (or per-migration) — run `mcp__abf185cc...__get_advisors` for `lints` and `security`, fail if any new errors appear.

---

## Risk ranking (top 10 hot spots)

Ordered by **blast radius × likelihood of regression × time-to-detect-without-tests**.

| # | Risk | Layer | Mitigation |
|---|---|---|---|
| 1 | **Stripe webhook** silently drops a paid event → contractor billing breaks | Edge fn | Unit-test the handler with Stripe sample payloads. **Add to CI.** |
| 2 | **Multi-tenant RLS** breach (org A reads org B) | RLS | Automated cross-org RLS tests in `rpc-negative` project. |
| 3 | **Wizard `handleCreate`** partial failure → orphan project rows | Component | RTL test mocking each Supabase call to fail at every step boundary. |
| 4 | **Materials cascade** (element ↔ material junction) regresses to <10/7 ratio | Integration | Add an E2E assertion that creates the Sprint M reference scenario and verifies junction count. |
| 5 | **Snake↔camel mapper** drops a column on round-trip | Service | Property-based round-trip test on `supabaseData.ts`. |
| 6 | **proxy-claude** rate-limit fails open under load | Edge fn | Unit test the audit-log count path with mocked clock. |
| 7 | **Auth + billing gate** false-positive locks paid contractor out | Component | RTL test on `useBillingGate` for every status × isTrial × isPastDue combination. |
| 8 | **AI accuracy** drifts when prompt changes | Harness | Sprint M harness — re-run on every prompt edit (already wired, just needs cadence). |
| 9 | **Bundle size** balloons past Sprint P targets | Build | Automate `PERF_BUDGET.md` check in CI. |
| 10 | **3D viewer** renders incorrectly after a `@react-three/fiber` upgrade | Visual | Implement `3D_VISUAL_REGRESSION.md` (1–2 day spike). |

---

## Prioritized backlog

### P0 — before next partner session

These are the items where a regression would be visible to Charlie's partner inside 5 minutes of testing.

1. **CI on every PR** — GitHub Actions: `tsc + vitest + e2e walkthrough + rpc-negative`. ~10 min per run. Single biggest leverage move. *Effort: 0.5 day.*
2. **`stripe-webhook` unit tests** — contract tests for `customer.subscription.{created,updated,deleted}` and `invoice.payment_failed`. Mock Stripe SDK; assert DB writes + audit_log entries. *Effort: 1 day.*
3. **Cross-org RLS automation** — extend `rpc-negative` project with a second auth context (org B) and assert org A's data is invisible. *Effort: 0.5 day.*
4. **`/queue` E2E** — extend `walkthrough.spec.ts` to assert the contractor sees the badge + page after the client submits. The walkthrough already does the submit; just add 3 assertions at the end. *Effort: 0.25 day.*
5. **Perf budget enforcement** — script that parses `dist/assets/*.js` sizes and fails if any exceeds its `PERF_BUDGET.md` target. Wire into CI. *Effort: 0.25 day.*

**Total P0:** ~2.5 days. Unblocks confident PR merging and gives the partner-test surface a safety net.

### P1 — within 30 days

6. **Pure-function vitest pass** — cover `src/lib/manifest.ts`, `projectCost.ts`, `workorders.ts`, `kpiCompute.ts`, `taskTimeline.ts`, `alerts.ts`. Aim for 80% line coverage on each. *Effort: 2 days.*
7. **`supabaseData.ts` round-trip tests** — property test that serializes + deserializes every type in `src/types/index.ts` and asserts equality. *Effort: 1 day.*
8. **Store tests** — start with `projectStore.fetchProjectFull` (most complex) and `materialStore.bulkImportMaterials` (chunked path, F-045). *Effort: 1.5 days.*
9. **`proxy-claude` integration tests** — deploy to a preview branch, hit it with valid + invalid JWT + over-quota requests, assert audit_log entries. *Effort: 1 day.*
10. **RTL setup + wizard `handleCreate` test** — install `@testing-library/react`, switch vitest env to `jsdom`, write the failure-at-every-step test for `handleCreate`. *Effort: 2 days.*
11. **AI harness on every prompt PR** — gate any PR that touches `src/services/aiRecommendations.ts` or `src/services/anthropic.ts` with a `materials:score` run. CI + a labelled trigger. *Effort: 0.5 day.*
12. **Component tests for the four highest-blast-radius tabs** — OverviewTab, BudgetTab, MaterialsTab, TasksTab. *Effort: 3 days.*

**Total P1:** ~11 days.

### P2 — longer term

13. **Visual regression for 3D viewer** — implement per `3D_VISUAL_REGRESSION.md`. Defer until Phase D ships.
14. **E2E for Settings, CrewEquipmentHub, MaterialLibrary CSV** — fill in the major-surface E2E gaps.
15. **Edge Function integration tests** for `send-proposal-email`, `notify-client-response`, `search-local-suppliers`.
16. **Mobile viewport E2E** — add a 390×844 (iPhone 14) project to `playwright.config.ts`.
17. **Database migration safety** — every new migration runs `up` then `down` in a CI ephemeral branch; fail if `down` doesn't restore.
18. **Load testing** — staging-only, simulate 50 concurrent wizard runs hitting `proxy-claude` and `handleCreate`. One-time spike + per-quarter rerun.
19. **Per-org AI accuracy** — extend the harness to score against a contractor-supplied catalog instead of starter-only.

---

## CI strategy

**Today:** zero CI. Every test runs locally on demand.

**Proposal:** GitHub Actions, three workflows.

### Workflow 1: `pr-checks.yml` (every PR)

Triggers: `pull_request` on any branch.

```
jobs:
  fast:
    - tsc --noEmit
    - vitest run
    - eslint --report-unused-disable-directives
    - perf budget script (parses dist/assets/*.js)
  e2e:
    needs: fast
    - npm run e2e (walkthrough + rpc-negative + setup; harness excluded)
    - upload Playwright traces on failure
```

Estimated wall time: ~10 minutes (fast: 2 min; e2e: 8 min serial). Cost: free for public, ~$0.05/run private.

Gates merge to `claude/quirky-ishizaka` and `main`.

### Workflow 2: `nightly.yml` (daily at 02:00 UTC)

Triggers: `schedule` + `workflow_dispatch`.

```
jobs:
  accuracy:
    - npm run materials:score (full 30 scenarios, not the 7-subset)
    - upload scorecard JSON as artifact
    - fail if mean drops below 80%
  advisor:
    - run Supabase advisor MCP for security + performance
    - fail if any new error-level finding appears
  bundle-trend:
    - record dist sizes to a tracking gist
```

Estimated wall time: ~20 minutes.

### Workflow 3: `pre-deploy.yml` (manual trigger before Netlify prod push)

Triggers: `workflow_dispatch`.

```
jobs:
  full:
    - everything from pr-checks
    - everything from nightly
    - mobile viewport E2E (P2 — once added)
```

Used as a final gate before promoting `claude/quirky-ishizaka` → `main`.

### What stays out of CI

- `materials:score` on default PRs — too slow (15 min) and burns Anthropic credits. Run only on AI-prompt PRs (label-gated) or nightly.
- 3D visual regression — non-deterministic across runners; needs per-OS baselines, defer until P2.
- Real Stripe webhooks — use sample payloads in unit tests; real webhook smoke test stays manual on prod.

---

## Manual testing residue

Things that should stay manual indefinitely (or that aren't worth automating yet):

| Activity | Cadence | Owner |
|---|---|---|
| Partner walkthrough on staging | Per major release | Charlie + partner |
| Real device mobile QA | Per release | Charlie |
| Real Stripe payment flow (test card → live mode) | Quarterly | Charlie |
| 3D viewer subjective quality check | Per 3D-pivot sprint | Charlie |
| Email delivery smoke test (real inbox) | Per Resend/SES change | Charlie |
| Onboarding flow on a fresh signup | Per Auth/onboarding change | Charlie |
| `npm run analyze` chunk inspection | Per `vite.config.ts` change | Charlie |

`PROTOCOL.md` should grow to include these as a checklist.

---

## Open questions for you

1. **CI provider.** GitHub Actions is the default and free for public repos — is the repo public, or do we need a paid plan? Alternative: Netlify build hooks can run a partial check, but they're less powerful.
2. **Anthropic credit budget for CI.** If we run `materials:score` nightly (full 30 scenarios), budget is ~$1/night. Acceptable, or gate it behind a label/manual trigger?
3. **Coverage threshold.** Vitest can fail builds below a coverage % (e.g. 70% on `src/lib/`). Worth adopting once the P1 backlog lands, or wait?
4. **RTL adoption.** Component tests need `jsdom` + `@testing-library/react`. Adding now is ~half a day of setup cost; it pays back from P1 item #10 onward. Pull it forward into P0?
5. **Pre-merge enforcement.** Should `pr-checks.yml` block merges (required check), or just warn? Recommend block — but it constrains hot-fix flexibility on prod incidents.

---

## Companion docs

- `PROTOCOL.md` — how to run the existing tests today (this doc is forward-looking; that one is operational).
- `E2E.md` — Playwright architecture, helpers, fixtures.
- `MATERIALS_ACCURACY.md` — current scorecard.
- `MATERIALS_ACCURACY_NOTES.md` — methodology notes.
- `3D_VISUAL_REGRESSION.md` — visual-diff approach (referenced from P2 #13).
- `PERF_BUDGET.md` — bundle size targets (referenced from P0 #5).
- `FINDINGS.md` — historical regression receipts (per-finding ledger).
- `PUNCH_LIST.md` — open polish backlog.
