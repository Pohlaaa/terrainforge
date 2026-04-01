# TerrainForge — Considerations Backlog

Items in this file are **not sprint-ready**. They are UX improvements, feature gaps, product ideas, and strategic notes flagged during development. Review this file when planning new sprints.

Prefix legend: `[ ]` open · `[?]` needs decision

> **Last updated**: 2026-03-31 (post-M2/M1.5b restructure — resolved items archived)

---

## Dashboard

- [ ] **Active Projects widget** should show project details (location, value, team, fleet, progress) — not just a count. Project dashboard exists now; widget could deep-link.
- [ ] **Crew & Fleet status cards** should display the active project name if that crew member or equipment is currently assigned.

---

## Core UX / Navigation

- [ ] **Workflow button reordering** — Users should be able to drag to reorder workflow step buttons within a project. Store ordering in user preferences (Zustand + Supabase). Low priority.

---

## Material Library

- [ ] **Multi-supplier per material** — A single material (e.g., "#57 gravel") should support multiple saved suppliers with individual pricing so users can compare and select at manifest time. M4 scope.
- [ ] **Storage location map integration** — Consider embedding a map pin or location field for inventory storage locations (yard, warehouse, job site). Low priority.

---

## Project Intelligence (Post-M1.5)

- [ ] **Wizard "save and continue later"** — `wizard_step` column exists on `projects` but partial save isn't implemented. Wizard currently only persists on final "Create." M4 candidate.
- [ ] **AI task generation quality** — AI-generated task breakdowns need testing against more real contractor job descriptions. Prompt tuning needed.
- [ ] **Project template library** — Saving a completed wizard as a reusable template. "Start from my patio template" instead of describing from scratch. M4 candidate.
- [ ] **Zustand stores for M1.5 data** — Tasks, subs, conditions, docs, permits currently use direct supabaseData calls. Dedicated stores would improve reactivity.

---

## Contractor Feedback (Priority Items for M4)

These are the three pillars the pilot contractor cares about most:

### Budget Management
- [ ] **AI material quantity accuracy** — Paver sqft calculation was wrong. AI prompt tuning needed.
- [ ] **Materials in wizard** — Contractor wants material cost estimates in wizard before generating quote. Requires manifest engine integration into wizard flow.
- [ ] **Auto-estimated client quote** — AI suggests quote price based on costs + recommended margin (25-40% for landscaping).
- [ ] **AI margin recommendations** — AI suggests ways to improve margin based on cost breakdown. Deferred until real cost data patterns exist.
- [ ] **Estimated vs. actual cost tracking** — Budget fields exist for estimates. Need actual cost tracking during project execution.

### Materials Management
- [ ] **Org-level sub/supplier directory** — Shared contact list at org level, not just per-project. Contractor clearly wants this.
- [ ] Multi-supplier per material (see Material Library section above)
- [ ] CSV import for bulk material onboarding (see Platform Capabilities below)

### AI Integration
- [ ] **Scope & Tasks skip option** — Experienced crews skip tasks ~50% of the time. Consider a "skip for experienced crew" toggle or making Step 3 optional.
- [ ] AI task generation quality improvements (see above)
- [ ] AI material quantity accuracy (see Budget Management above)

---

## Crew App (Field-Facing Features)

- [ ] **Permitting & Compliance** — Build as an AI tool anchored to the project map. Generate permit checklists, flag local compliance requirements by jurisdiction. M4 scope.
- [ ] **GPS check-in** — Verify crew is on-site using device location. M4 scope.
- [ ] **Equipment checkout/return logging** — Crew app tracks which equipment a crew member picks up and returns. M4 scope.

---

## Platform Capabilities

- [ ] **Tablet compatibility** — Responsive layout works on iPad/Android tablet after v7 overhaul (Sprint 21). Needs QA pass on actual tablets.
- [ ] **CSV export** — Allow users to export project data, manifests, crew rosters to CSV. M4 scope, high contractor demand.
- [ ] **CSV import** — Allow bulk import of materials, crew, or projects from CSV (useful for onboarding from spreadsheets). M4 scope, critical for contractor migration.
- [ ] **Translation / i18n** — Multi-language support. Spanish is the highest priority. M5 scope unless a pilot user requests it.
- [ ] **PWA for crew app** — Offline time entries, camera uploads, homescreen install. M5 scope. `vite-plugin-pwa` is the implementation path.

---

## Business / GTM

- [?] **Ad-supported tier** — Consider a free tier with non-intrusive ads as an acquisition channel. Needs revenue model analysis. **Decision needed before M3 launch.**
- [ ] **SEO strategy** — Organic search as a growth channel. Needs landing page, blog, and keyword strategy. M3 scope.
- [ ] **Competitor awareness:**
  - **Fieldwire** — Field management, task tracking, plan markup. Their weakness: not landscaping-specific, no manifest/material engine.
  - **Aurora Solar** — AI-driven design + proposal tool for solar. Relevant model for our M5 3D Studio goal.
