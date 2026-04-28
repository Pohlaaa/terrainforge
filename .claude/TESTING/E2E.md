# TerrainForge E2E test suite

Single-command Playwright regression gate covering everything shipped
in the 3D-in-Wizard / Phase A–C / cleanup arc.

```
npm run e2e
```

Runs 6 tests in ~28s against the staging deployment. Suite is split
across three projects:

| Project | What it covers | Time |
|---|---|---|
| `setup` | One-time contractor sign-in, persists Supabase session to `e2e/.auth/contractor.json` | ~3s |
| `rpc-negative` | Direct RPC tests for the Phase C v0 SECURITY DEFINER functions (token validity, role enforcement, malformed payload, invalid-response value) | ~1s |
| `contractor-walkthrough` | Full happy-path flow: wizard → create → share → client edit → submit → contractor accept → cleanup | ~22s |

## What gets asserted

The walkthrough spec hits 21 named checkpoints. Each one is documented
inline in `e2e/walkthrough.spec.ts`. Highlights:

1. Wizard renders the compressed 5-step stepper
2. Step 1 → 2 transition fires both Anthropic calls (project recs +
   element inference) — both 200
3. AI seeds at least one element; Step 2 canvas mounts
4. Element type change clears notes + areaSqft (regression gate for
   F-PHB-04 / F-PHB-05)
5. Per-element materials Phase B "tailored to this element" badge
   appears
6. Project creation lands on `/projects/:id` with Estimate status
7. "✎ Design link" creates a `client_design` token; URL pill shows
   the EDIT badge AND `expires {date}` suffix (F-PHC-01 / F-PHC-05)
8. Edit layout is locked (🔒) while design token is active (F-PHC-06)
9. `/share/:token` in design role mounts the Edit-mode banner +
   editable canvas + submit panel
10. Submit flow fires the `submit_design_changes` RPC with the note
11. Contractor sees the green "Client submitted design changes" banner
12. Design submission history expander shows the new row (F-PHC-04)
13. Accept changes button revokes the token + unlocks Edit layout
    (F-PHC-03)
14. Test project is deleted; project name no longer appears in the
    `/projects` list

The negative spec hits four reject paths via direct REST calls — no
UI dependency, sub-second per assertion.

## Setup (first time only)

1. Copy the env template:
   ```
   cp .env.e2e.example .env.e2e
   ```
2. Fill in `.env.e2e` with:
   - `E2E_PASSWORD` — the dev account password (in your password
     manager; same one used by `VITE_DEV_AUTO_SIGNIN_PASSWORD` in
     `.env.local`)
   - `E2E_SUPABASE_ANON_KEY` — the staging Supabase anon key (same
     one used by `VITE_SUPABASE_ANON_KEY`)
3. Install Chromium binary (one-time, ~150 MB):
   ```
   npm run e2e:install
   ```

`.env.e2e` is gitignored; never commit it.

## Run modes

| Command | What it does |
|---|---|
| `npm run e2e` | Full suite (setup + walkthrough + negative). Default. |
| `npm run e2e:walkthrough` | Just the walkthrough (skips negative tests). |
| `npm run e2e:rpc` | Just the RPC negative tests (skips auth + walkthrough; ~1s). |
| `npm run e2e:headed` | Same as `e2e` but visible browser. Good for debugging. |
| `npm run e2e:debug` | Same plus DevTools paused at each action. Pixie dust. |

## Cost per run

- Walkthrough fires ~5 Anthropic API calls per pass (project recs +
  element inference + 3 per-element material calls). Cost: ~$0.50.
- One staging-DB project + share token + design version row created
  and deleted per pass. The teardown sweep also cleans any leftover
  `E2E_TEST_*` projects from prior partial runs.
- Mapbox + Supabase requests are free at this scale.

Budget ~$15/month for a daily-run cadence including occasional
debug iterations.

## CI integration

The config sets `forbidOnly: !!process.env.CI` and bumps `retries: 2`
when CI is set, so the same `npm run e2e` invocation works as a CI
check. Inject `E2E_*` env vars via the CI provider's secrets store.
GitHub Actions example:

```yaml
- name: E2E
  env:
    E2E_EMAIL: ${{ secrets.E2E_EMAIL }}
    E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
    E2E_SUPABASE_ANON_KEY: ${{ secrets.E2E_SUPABASE_ANON_KEY }}
  run: |
    npm ci
    npm run e2e:install
    npm run e2e
```

## What to do when a test fails

Playwright keeps `trace.zip`, screenshot, and video for every
failure under `test-results/<test-name>/`. To inspect the trace
visually:

```
npx playwright show-trace test-results/<test-name>/trace.zip
```

Or open the Playwright report:

```
npx playwright show-report
```

For walkthrough failures specifically:

1. Read the `error-context.md` next to the trace — it lists the
   failed locator + a yaml snapshot of the page at the moment of
   failure. Useful for catching strict-mode collisions or stale
   selectors.
2. If the failure is a UI selector that started missing because a
   component was renamed, fix the spec — the spec is the contract,
   not the implementation.
3. If the failure is a real regression (e.g. AI call returning 500,
   RPC rejecting a previously-valid payload), file it in
   `.claude/TESTING/FINDINGS.md` and roll a fix.
4. Don't skip a test to make CI green. Mark it `test.fixme` with an
   inline `// TODO: link to FINDINGS.md`.

## Maintenance

- After every meaningful UI change, run `npm run e2e:walkthrough`
  before committing to catch selector drift.
- After every Phase C+ change to RPCs, add a corresponding negative
  test in `rpc-negative.spec.ts` so the security boundary stays
  asserted.
- The walkthrough spec should grow with the product. When adding
  Phase D / E / F features, append checkpoints rather than splitting
  the spec — a single end-to-end flow is more useful than several
  isolated ones for catching cross-feature regressions.

## Known limitations

- The "drag an element via the canvas" step (#16 in the walkthrough)
  currently introspects the page state instead of doing pixel-level
  drag — drag-and-drop on a dynamic SVG/Canvas is fragile in
  headless mode. The user-facing drag is exercised in `npm run
  e2e:headed` runs. Phase D could swap in a more robust drag
  implementation via `dispatchEvent('mousedown' / 'mousemove' /
  'mouseup')` on the element refs.
- The 3D viewer (PlanView3D) requires WebGL, which is flaky in
  Chromium headless on Windows. The walkthrough switches to 2D mode
  (PlanView2D, pure SVG) before asserting canvas behavior. Manual
  3D verification still happens via `npm run e2e:headed`.
- Tests run sequentially (`fullyParallel: false`) because parallel
  runs would race on the shared dev account session token. If we
  add a second test account, parallelism becomes possible.
