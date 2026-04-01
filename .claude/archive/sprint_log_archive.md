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

**Cowork notes (Batch 3 summary)**: Sprint 33 shipped the full project dashboard. Two issues flagged: AI badges not rendering, no materials tracking. Both addressed in Sprint 34.

---

## Batch 4: Sprints 34-36 — M1.5b Complete + M2 Complete (processed 2026-03-31)

### Sprint 34 — 3/30/26
**Shipped**: Materials tab, AI badge fix, inline budget editing, task CRUD, permit editing, subcontractor editing
**Notes**: M1.5b dashboard now fully editable across all 6 tabs.

### Sprint 35 — 3/31/26
**Shipped**: Settings page (6 sections), production readiness pass, UI consistency
**Felt right**: Some attempts to make UI consistent
**Felt off**: Settings input bug (1 char at a time), billing portal doesn't open to Stripe, Equipment/Crew have legacy headers, Materials/Projects missing PageHeader, map doesn't route to dashboard, projects can't be deleted
**Discovered I need**: Materials page improvements (entry cut off)

### Sprint 36 — 3/31/26
**Shipped**: Bug fix & UI consistency pass — all Sprint 35 issues
**Notes**: All Sprint 35 bugs resolved. M2 gate fully met.

**Cowork notes (Batch 4 summary)**: Sprints 34-36 closed out both M1.5b and M2. Sprint 34 made the dashboard fully editable. Sprint 35 shipped the Settings page (last M2 item) but introduced several UI bugs. Sprint 36 was a comprehensive bug fix sprint covering Settings input, PageHeader consistency, map routing, project deletion, and full UI audit. Post-batch assessment identified three key process improvements: (1) add self-verification to sprint prompts, (2) reduce Code's pre-sprint reading from 1,400 to 500 lines, (3) persist every sprint prompt file. Full restructure executed: archived DATA_MODEL_M1.5.md and old sprint prompts, cleaned CONSIDERATIONS.md, streamlined ORCHESTRATOR.md, updated SPRINT_TEMPLATE.md and CODE_GUIDE.md with self-verification protocol. M3 sprint prompts batch-prepared.