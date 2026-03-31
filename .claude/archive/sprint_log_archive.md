# TerrainForge — Sprint Log Archive

> Processed sprint log entries moved here during Cowork batch checkpoints.

---

## Batch 1: M1.5a Complete (processed 2026-03-30)

### Sprint 31 — 3/30/26
**Shipped**: Add project Wizard features
**Felt right**: The wizard workflow, the financial summary
**Felt off**: Equipment needing to be added manually (should have a dropdown), then a notes if equipment needs to be rented. All costs should be calculated based on project info. Should be easier to say no permits required. Compliance step should be before cost estimate. Should add parking permits as an option.
**Discovered I need**: More inclusion of financial data — project quote, material costs, labor costs, operational costs, margin, and recommendations to improve margin. Overall company contact list for subcontractors, material suppliers, etc. Ability to track estimated costs to generate quote, ability to track actual costs during project.
**Notes**: All sprint tasks worked successfully. Contractor pilot feedback incorporated.

### Sprint 30 — 3/30/26
**Shipped**: Add project Wizard
**Felt right**: The wizard workflow
**Felt off**: Add project button should just default to wizard
**Discovered I need**: More inclusion of financial data — project quote, material costs, labor costs, operational costs, margin, and recommendations to improve margin.
**Notes**: All sprint tasks worked successfully

### Sprint 29 — 3/30/26
**Shipped**: Supabase migration and bucket add
**Notes**: Data layer sprint — no UI testing applicable

### Sprint 28 — 3/30/26
**Shipped**: Supabase migration and SRC updates
**Notes**: Data layer sprint — no UI testing applicable

**Cowork notes (Batch 1 summary)**: M1.5a shipped the full 7-step creation wizard in 4 sprints (~2 hours). Key pilot contractor feedback: (1) equipment should pull from library, not manual entry; (2) compliance step should come before budget; (3) costs should auto-calculate from project data; (4) needs org-level sub/supplier directory; (5) needs estimated vs. actual cost tracking. Items 1-3 addressed in Sprint 32 bridge sprint. Items 4-5 escalated from M4 to active consideration.

---

## Batch 2: Sprint 32 Bridge + M1.5b Start (processed 2026-03-30)

### Sprint 32 — 3/30/26
**Shipped**: Updated UI in project wizard, AI integration
**Felt right**: AI correctly pulled soil type, climate zone, HOA from address. Timeline & Budget are the best features — auto-calculation. AI task generation good for minimal input.
**Felt off**: AI material quantity estimates need work (paver sqft wrong). Want materials in wizard for cost estimation. Client quote should auto-estimate to recommended margin. Need more project conditions before auto-generating tasks.
**Discovered I need**: Materials integrated into wizard. Auto-quote estimation. Scope & Tasks useful for training but experienced crews skip ~50%.
**Notes**: All sprint tasks worked successfully. Second contractor pilot session — very solid experience overall. AI connectors working well for this stage.

**Cowork notes (Batch 2 summary)**: Sprint 32 shipped all 6 planned tasks: step reorder, equipment dropdown, compliance UX, auto-calc costs, AI task generation, AI site inference. Contractor feedback confirms budget/timeline is the killer feature. AI site inference validated. Tasks feature useful but not daily-use for experienced crews. Material quantity AI needs prompt tuning. M1.5b priorities shaped by feedback: Budget tab #1, Task tracker #2, Materials integration deferred to Sprint 34.

---

## Batch 3: Sprint 33 — M1.5b Dashboard (processed 2026-03-30)

### Sprint 33 — 3/30/26
**Shipped**: Project dashboard with 5 tabs
**Felt right**: UX, speed, design looks great
**Felt off**: Didn't see AI badges in task view, project dashboard doesn't have anywhere to track specific materials and their costs
**Discovered I need**: Nothing new
**Notes**: Contractor likes the progress being made on the design

**Cowork notes (Batch 3 summary)**: Sprint 33 shipped the full project dashboard at `/projects/:id` with 5 tabs: Overview (KPI strip, active phase, recent tasks, site conditions, schedule), Tasks (phase-grouped with status toggling), Budget (cost breakdown, margin guidance, quote vs. cost visualization), Resources (crew, subs, equipment, zones), Compliance (permits, inspections, HOA, access logistics). Dashboard is read-only except task status toggling. Two issues flagged: (1) AI badges not rendering on tasks, (2) no materials tracking section. Contractor positive on design direction.
