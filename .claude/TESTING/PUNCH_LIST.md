# Contractor-Walkthrough Punch List

Working list of open findings from the contractor-walkthrough series. Source of truth for findings is `FINDINGS.md` — this file is for tracking fix status during a fix session. Items checked off here get a resolution note in FINDINGS.md too.

**Last updated**: 2026-04-25 (after first fix sweep)

## Fixed in this session ✅

- **F-CW-45 cascade** (P0 root) — `addMaterial` now returns `Material | null`; wizard captures the returned id; junction insert uses `null` not `''` for material_id; manifest engine + adapter tolerate null materialId. Closes F-CW-17/18/36/43.
- **F-CW-54** P1 — Settings layout `flex-col md:flex-row` so mobile stacks instead of putting tabs in a vertical bar
- **F-CW-15** P1 — Both Edge Functions now query `auth.users` via admin API instead of phantom `profiles` table. send-proposal-email v8 + notify-client-response v7 deployed
- **F-CW-53** P1 — Resources tab "Schedule page" reference now points to `/crew-hub`
- **F-CW-27** P1 — Modal split into header / scrollable body / sticky footer; Save button always reachable
- **F-CW-28** P3 (free with F-CW-27) — Modal got `role="dialog"`, `aria-modal="true"`, `aria-label="Close"`
- **F-CW-33** P1 — Client & Location switched to controlled inputs + explicit save on Done
- **F-CW-35** P3 — More menu (and User menu) now close on Escape
- **F-CW-39** P3 — Closeout button reads "Update Usage" when project is already Completed
- **F-CW-42** P2 — Re-completing preserves original `completed_at`
- **F-CW-15c** P3 — Request-changes placeholder copy is now project-agnostic
- **F-CW-58** P3 — Supplier/client phone numbers formatted via shared `formatPhone` util
- **F-CW-22 / F-CW-23** P3 — Hide Low Stock + In Stock KPIs until org actually tracks on-hand inventory
- **F-CW-50** P3 — Project name truncation cuts at word boundary + ellipsis instead of mid-word
- **F-CW-55** P3 — Budget Hub "Avg Budget" relabeled to "Outstanding" (matches the actual data)
- **F-CW-26** P2 — Was a mis-finding (the "prefilled" text was just placeholder text). Removed from list.

## Still open



## Priority order for current fix session

### Tier A — Highest impact / fastest leverage
- [ ] **F-CW-45 cascade** (P0 root cause) — `createMaterial` fails silently when AI says "will be added automatically." Materials end up as project-level JSONB orphans with empty `materialId`. Fixes F-CW-17 (createMaterial errors silent), F-CW-18 (project_element_materials INSERT failures), F-CW-36 (Manifest sees 1 of 10), F-CW-43 (Closeout vs Manifest disagree)
- [ ] **F-CW-54** P1 — Settings page layout broken (6 tab pills render as full-viewport vertical bars). CSS regression
- [ ] **F-CW-15** P1 — Edge Functions query phantom `profiles` table; should be `auth.users`. Affects send-proposal-email contractorName + notify-client-response email recipient
- [ ] **F-CW-53** P1 — `/schedule` returns 404 but Resources tab tells users to go there. Update copy in OverviewTab/Resources
- [ ] **F-CW-27** P1 — Add/Edit Material modal can't internally scroll; Save button unreachable on small viewports

### Tier B — Independent P1s
- [ ] **F-CW-33** P1 — Client & Location inline edit silently drops changes (Project Details edit works fine — bug scoped to one form)
- [ ] **F-CW-46** P1 — Wizard equipment-accept doesn't persist `assigned_project_id`
- [ ] **F-CW-48** P1 — No "Add Task" button anywhere on project page
- [ ] **F-CW-44** P1 — Closeout numeric inputs don't persist (no save mechanism)
- [ ] **F-CW-16** P1 — Claude JSON parse failure cascades; no retry/fallback. May share root cause with F-CW-17/18 (oversize prompt response truncation)
- [ ] **F-CW-12** P1 — AI element inference too loose on non-install context ("flagstone walkway" → bogus Patio etc.)
- [ ] **F-CW-29** P1 — CSV import only accepts 4 columns; missing engine columns

### Tier C — P2/P3 batch (mostly polish; many can ship together)
- [ ] **F-CW-26** P2 — Add Material form opens with stale prefilled state (form needs reset on open)
- [ ] **F-CW-42** P2 — Re-clicking Complete on already-Completed project overwrites `completed_at` (mutation should be idempotent)
- [ ] **F-CW-14** P2 — `equipment_budget` vs `equipment_cost` schema duplicate; wizard sums both, persistence saves one → drift
- [ ] **F-CW-56** P2 — Williams shows wrong status in Budget hub (stale cache or wrong-source query)
- [ ] **F-CW-19** P2 — Wizard Numbers shows $0 when AI fails (no per-sqft fallback)
- [ ] **F-CW-10 partial** P3 — Scroll-to-top works Step 2→3 but fails Step 1→2 (auto-suggest mid-render DOM growth)
- [ ] **F-CW-11** P3 — Wizard step-indicator row overflows panel width
- [ ] **F-CW-13** P3 — Tree/Shrub Planting dimension UI uses Area sqft not count/spacing
- [ ] **F-CW-15b** P3 — Client share view has no contractor branding
- [ ] **F-CW-15c** P3 — Request-changes placeholder mentions "patio" hardcoded
- [ ] **F-CW-20** P3 — Completed project shows non-100% progress
- [ ] **F-CW-21** P3 — Schedule transition's two-step pattern undiscoverable
- [ ] **F-CW-22** P3 — Low Stock KPI = Total Materials KPI (decorative noise)
- [ ] **F-CW-23** P3 — In Stock value $0 (same root)
- [ ] **F-CW-24** P3 — Low-stock banner phrasing misleading
- [ ] **F-CW-25** P3 — Materials page category pill row overflow (same shape as F-CW-11)
- [ ] **F-CW-28** P3 — Material modals lack `role="dialog"` + `aria-modal`
- [ ] **F-CW-30** P3 — CSV import no template/examples
- [ ] **F-CW-31** P3 — No inline delete on material rows
- [ ] **F-CW-32** P3 — Inconsistent edit patterns (modal vs inline)
- [ ] **F-CW-34** P3 — No top-level Manifest Engine entry
- [ ] **F-CW-35** P3 — More menu doesn't dismiss on Escape
- [ ] **F-CW-37** P3 — Manifest "Under Budget" compares to wrong baseline
- [ ] **F-CW-38** P3 — Manifest table horizontal overflow
- [ ] **F-CW-39** P3 — Already-Completed project still shows "Complete Project" button
- [ ] **F-CW-41** P3 — Stage gates don't reflect terminal status
- [ ] **F-CW-47** P3 — "Crew Size 4 + No crew scheduled" copy confusion
- [ ] **F-CW-49** P3 — `/crew` is worker app, not admin
- [ ] **F-CW-50** P3 — Project names truncated mid-word ("Chamberlain Apa")
- [ ] **F-CW-51** P3 — Equipment-profile completion pills don't deep-link
- [ ] **F-CW-52** P3 — Add Crew form too minimal
- [ ] **F-CW-55** P3 — AVG BUDGET = REVENUE math bug
- [ ] **F-CW-57** P3 — Profanity in production test data
- [ ] **F-CW-58** P3 — Supplier phone displayed unformatted
- [ ] **F-CW-59** P3 — Suppliers table horizontal overflow

---

## Dependency notes

- **F-CW-17/18/36/43 all close together** when F-CW-45 is fixed (single root cause: `createMaterial` reliability + JSONB↔junction reconciliation).
- **F-CW-11/25/38/59** all share an "overflow on narrow viewport" pattern. Could be one shared responsive fix.
- **F-CW-22/23/24** all root in "no on-hand inventory tracking yet" — could be one fix or simply hide the unrelated KPIs.
- **F-CW-15** needs `notify-client-response` redeploy AND `send-proposal-email` redeploy.

Everything else is independent.
