# TerrainForge — Considerations Backlog

Items in this file are **not sprint-ready**. They are UX improvements, feature gaps, product ideas, and strategic notes that Charlie has flagged during development. Review this file when planning new sprints or Phase 2+ scope.

Prefix legend: `[ ]` open · `[x]` resolved · `[~]` in progress · `[?]` needs decision

---

## Dashboard

- [ ] **Active Projects widget** should show project details (location, value, team, fleet, progress) — not just a count. S4-2 adds the widget; detail expansion is Phase 2 polish.
- [ ] **Crew & Fleet status cards** should display the active project name if that crew member or equipment is currently assigned.

---

## Core UX / Navigation

- [ ] **Active project selected icon** doesn't update in the sidebar when a project is selected — visual feedback is broken.
- [ ] **Settings tab** — Users need an account settings page: profile info, org details, billing shortcut, notification preferences.
- [ ] **Workflow button reordering** — Users should be able to drag to reorder workflow step buttons within a project. Store ordering in user preferences (Zustand + Supabase).

---

## Material Library

- [ ] **Tab order** — Reorder to: Inventory on Hand → Suppliers → Material Library (current order is inverted from usage priority).
- [ ] **Multi-supplier per material** — A single material (e.g., "#57 gravel") should support multiple saved suppliers with individual pricing so users can compare and select at manifest time.
- [ ] **Storage location map integration** — Consider embedding a map pin or location field for inventory storage locations (yard, warehouse, job site).

---

## Work Orders

- [ ] **Active project context** — Work Orders page doesn't update when a different active project is selected. Should filter/display based on the currently active project.

---

## Price Research

- [ ] **No specific items flagged yet** — Charlie noted this section but did not specify gaps. Revisit after S4-6 self-test.

---

## Crew App (Field-Facing Features)

- [ ] **Permitting & Compliance** — Build as an AI tool anchored to the project map. Generate permit checklists, flag local compliance requirements by jurisdiction. Phase 3 candidate.
- [ ] **Picture proof of completion** — Field crew can upload a photo to mark a work order step complete. Ties to the work order checklist.

---

## Platform Capabilities

- [ ] **Tablet compatibility** — Ensure responsive layout works well on iPad/Android tablet. Key for field foremen.
- [ ] **CSV export** — Allow users to export project data, manifests, crew rosters to CSV.
- [ ] **CSV import** — Allow bulk import of materials, crew, or projects from CSV (useful for onboarding from spreadsheets).
- [ ] **Translation / i18n** — Multi-language support. Spanish is the highest-priority first language given landscaping workforce demographics.

---

## Business / GTM

- [ ] **Ad-supported tier** — Consider a free tier with non-intrusive ads as an acquisition channel. Needs revenue model analysis before committing.
- [ ] **SEO strategy** — Organic search as a growth channel. Needs landing page, blog, and keyword strategy. Marketing-led, not engineering-led.
- [ ] **Competitor awareness:**
  - **Fieldwire** — Field management, task tracking, plan markup. Their weakness: not landscaping-specific, no manifest/material engine.
  - **Aurora Solar** — AI-driven design + proposal tool for solar. Relevant model: design tool that auto-generates a proposal/estimate. Analogue to our Phase 3 3D Studio goal.

---

## Notes for Sprint Planning

- **Tab reorder + multi-supplier** are related — tackle together in a Material Library sprint (Phase 2).
- **Active project context bug** (sidebar icon + work orders) is a polish item for Sprint 4 or early Sprint 5.
- **CSV import/export** is a strong contractor ask — likely Phase 2 scope, schedule after core operations features.
- **Translation** is a Phase 3+ effort unless a pilot user specifically requests it.
- **Ad-supported tier** needs a business model decision before any engineering work. Flag for Charlie's review before Phase 3 planning.
