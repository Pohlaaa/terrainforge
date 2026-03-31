# TerrainForge — Considerations Backlog

Items in this file are **not sprint-ready**. They are UX improvements, feature gaps, product ideas, and strategic notes that Charlie has flagged during development. Review this file when planning new sprints.

Prefix legend: `[ ]` open · `[x]` resolved · `[~]` in progress · `[?]` needs decision

> **Last updated**: 2026-03-30 (post-M2, pre-M1.5 planning)

---

## Dashboard

- [ ] **Active Projects widget** should show project details (location, value, team, fleet, progress) — not just a count. S4-2 adds the widget; detail expansion is M1.5b project dashboard scope.
- [ ] **Crew & Fleet status cards** should display the active project name if that crew member or equipment is currently assigned.

---

## Core UX / Navigation

- [x] **Active project selected icon** — Sidebar icon now updates correctly after v7 layout overhaul (Sprint 21-22).
- [ ] **Settings tab** — Users need an account settings page: profile info, org details, billing shortcut, notification preferences. **Last M2 item — flagged for Sprint 28 or standalone mini-sprint.**
- [ ] **Workflow button reordering** — Users should be able to drag to reorder workflow step buttons within a project. Store ordering in user preferences (Zustand + Supabase). Low priority — revisit after M1.5b.

---

## Equipment Manager

- [x] **Adding equipment fails** — Fixed in Sprint 16.5. Root cause: empty date strings sent to Postgres DATE columns. Coerced to null.

---

## Material Library

- [x] **Tab order** — Reorder to: Inventory on Hand → Suppliers → Material Library. **DONE in Sprint 15.**
- [x] **Adding materials fails** — Fixed in Sprint 16.5. Root cause: DB ENUM mismatch + stale unit_type column reference.
- [ ] **Multi-supplier per material** — A single material (e.g., "#57 gravel") should support multiple saved suppliers with individual pricing so users can compare and select at manifest time. M4 scope.
- [ ] **Storage location map integration** — Consider embedding a map pin or location field for inventory storage locations (yard, warehouse, job site). Low priority.

---

## Work Orders

- [x] **Active project context** — Work Orders auto-selects the active project. Original issue was the data loading race fixed in Sprint 16.5. Verified working in Sprint 20.
- [x] **Page crashes with active project** — Fixed in Sprint 16.5. Root cause: useMemo called after early returns (React hooks ordering violation).

---

## Project Intelligence (M1.5 — Active Planning)

- [x] **AI creation wizard** — 7-step guided project creation. Full wizard shipped in Sprints 28-31. 9 components, 24 CRUD functions, 2 migrations. **COMPLETE.**
- [~] **Project dashboard** — Project detail view becomes a full command center with tabs (schedule, tasks, resources, budget, activity, documents, compliance). Full spec in ROADMAP.md M1.5b section. Sprint 33-35 scope.
- [ ] **AI wizard integration** — Wizard is built but AI isn't wired in yet. Task generation from description, site condition inference from address, crew/equipment recommendations all need Sprint 32 work. This is the "intelligence" in Project Intelligence.
- [ ] **Wizard "save and continue later"** — `wizard_step` column exists on `projects` but partial save isn't implemented. Wizard currently only persists on final "Create." Sprint 32 or 33 candidate.
- [ ] **AI task generation quality** — AI-generated task breakdowns need to be tested against real contractor job descriptions. Blocked until AI is wired to wizard (Sprint 32).
- [ ] **Project template library** — Now that wizard is shipped, saving a completed wizard as a reusable template is more tangible. "Start from my patio template" instead of describing from scratch. M4 candidate.
- [?] **Detail panel → full page transition** — M1.5b project dashboard may need to be a full page rather than the current slide-in detail panel. Decision depends on information density during Sprint 33 implementation.
- [x] **project-photos Storage bucket** — Created in Supabase Dashboard. Ready for M1.5b document upload.
- [ ] **Zustand stores for M1.5 data** — Tasks, subs, conditions, docs, permits currently use direct supabaseData calls. Project dashboard will need dedicated stores for display/edit/reactivity.

### Pilot Contractor Feedback (Sprint 32 scope)
- [ ] **Equipment dropdown from library** — Step 4 should pull from org's equipment list with duration picker, not freeform text. Add "rental notes" field for equipment not in library. *Contractor feedback: "I shouldn't have to type my own equipment names."*
- [ ] **Reorder: compliance before budget** — Move Step 6 (compliance) before Step 5 (budget). Permit costs affect the estimate. Current order: 1-2-3-4-5-6-7 → New order: 1-2-3-4-6-5-7.
- [ ] **"No permits required" quick toggle** — Add prominent toggle at top of compliance step that collapses the checklist. Most small residential jobs need zero permits.
- [ ] **Parking permits** — Add to permit checklist options.
- [ ] **Auto-calculated costs** — AI should pre-populate budget from earlier steps: labor (crew size × hours × rates from crew library), materials (from manifest engine quantities × material costs), equipment (daily rates × duration from equipment library). Budget step becomes a review/adjust step, not data entry.
- [ ] **AI margin recommendations** — After costs are calculated, AI suggests ways to improve margin: "Consider bulk ordering stone — saves ~12% at 50+ cuyd" or "Subbing out electrical saves $X vs. in-house."
- [ ] **Org-level sub/supplier directory** — Shared contact list for subcontractors and material suppliers at the org level, not just per-project. Was M4 scope; contractor clearly wants it sooner. **Decision needed: pull into M1.5b or keep in M4?**
- [ ] **Estimated vs. actual cost tracking** — Budget fields exist for estimates. Need actual cost columns + UI for tracking spend during project execution. M1.5b budget tab scope.

---

## Crew App (Field-Facing Features)

- [x] **Crew login** — PIN-based auth implemented in Sprint 23. Company code → pick name → enter PIN → 8-hour session.
- [x] **Today's schedule view** — Job cards with project name, address, crew, equipment. Sprint 17-18.
- [x] **Work order checklist** — Tap-to-complete steps with Supabase sync. Sprint 18.
- [x] **Photo proof of completion** — Camera upload to Supabase Storage `crew-photos` bucket. Sprint 18.
- [x] **Basic crew communication** — Status signals (en route / on site / done) visible on manager schedule. Sprint 17-18.
- [ ] **Permitting & Compliance** — Build as an AI tool anchored to the project map. Generate permit checklists, flag local compliance requirements by jurisdiction. Partially addressed by M1.5a Step 6 (compliance) and `project_permits` table. Full crew-app integration is M4 scope.
- [ ] **GPS check-in** — Verify crew is on-site using device location. M4 scope.
- [ ] **Equipment checkout/return logging** — Crew app tracks which equipment a crew member picks up and returns. M4 scope.

---

## Platform Capabilities

- [ ] **Tablet compatibility** — Responsive layout works on iPad/Android tablet after v7 overhaul (Sprint 21). Needs QA pass on actual tablets — desktop Chrome DevTools simulation only so far.
- [ ] **CSV export** — Allow users to export project data, manifests, crew rosters to CSV. M4 scope, high contractor demand.
- [ ] **CSV import** — Allow bulk import of materials, crew, or projects from CSV (useful for onboarding from spreadsheets). M4 scope, critical for contractor migration.
- [ ] **Translation / i18n** — Multi-language support. Spanish is the highest-priority first language given landscaping workforce demographics. M5 scope unless a pilot user requests it.
- [ ] **PWA for crew app** — Offline time entries, camera uploads, homescreen install. Service worker caches today's schedule. M5 scope. `vite-plugin-pwa` is the implementation path.

---

## Business / GTM

- [ ] **Ad-supported tier** — Consider a free tier with non-intrusive ads as an acquisition channel. Needs revenue model analysis before committing. **Needs decision before M3 planning.**
- [ ] **SEO strategy** — Organic search as a growth channel. Needs landing page, blog, and keyword strategy. Marketing-led, not engineering-led. M3 scope.
- [ ] **Competitor awareness:**
  - **Fieldwire** — Field management, task tracking, plan markup. Their weakness: not landscaping-specific, no manifest/material engine.
  - **Aurora Solar** — AI-driven design + proposal tool for solar. Relevant model: design tool that auto-generates a proposal/estimate. Analogue to our M5 3D Studio goal.
- [?] **Pilot contractor program** — Was planned during M1.5a but didn't happen. Now critical before M1.5b starts — need real contractor feedback on the wizard to shape dashboard priorities. **Decision needed: how to recruit 2-3 pilot contractors. Sprint 32 is the window.**

---

## Notes for Sprint Planning

- **Settings page** is the only remaining M2 item. Could be a mini-sprint (28a) or bundled with Sprint 28's M1.5a kickoff.
- **CSV import/export** is a strong contractor ask — M4 scope, schedule after core operations features.
- **Translation** is M5 unless a pilot user specifically requests it.
- **Ad-supported tier** needs a business model decision before any engineering work. Flag for Charlie's review before M3 planning.
- **M1.5 data model** fully implemented — migrations 010 + 011 applied. DATA_MODEL_M1.5.md updated with implementation status.
- **Pilot testing** didn't happen during M1.5a. Sprint 32 bridge sprint is the window. Show the wizard to real contractors before building the project dashboard (M1.5b).
- **AI wiring** is the biggest gap between "wizard works" and "wizard is intelligent." Sprint 32 should prioritize this alongside pilot outreach.
- **CONTEXT.md maintenance** — Code didn't update CONTEXT.md during Sprints 28-31. Cowork caught this at batch checkpoint. May need to reinforce in CODE_GUIDE.md or accept that Cowork handles the sync.
