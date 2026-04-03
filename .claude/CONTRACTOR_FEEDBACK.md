# TerrainForge — Contractor Feedback

> **Source**: Contractor proof-of-concept review (2026-04-02)
> **Status**: Requirements captured. Stabilization refactor in progress — features to be layered on after.
> **Last updated**: 2026-04-03

---

## Feedback Summary

A contractor used the production site and provided detailed workflow feedback. The overarching theme: the app has good bones but data entered in one place doesn't flow through to where it's needed. Individual features work in isolation but the end-to-end workflow feels disjointed.

---

## Wizard Feedback (New Project Workflow)

### Step 1: Job Description
- Project Name, Project Type, Property Type — good as-is
- **Scope Size needs real measurements**: total square footage (not just small/medium/large). Could be overall sqft if AI can differentiate between material areas, OR defer individual measurements to a dedicated step
- Client Information — no changes needed

### Step 2: Site Intelligence
- Address autofill works well. **Request: keyboard arrow navigation on suggestions dropdown**
- **Question: should Slope/Grade auto-fill from AI?** (currently manual)
- Everything else in Step 2 is solid

### NEW STEP (between Site Intelligence and Scope & Tasks): Material Quantities
- **Contractor wants a dedicated step for defining material quantities**
- Enter sqft/linear feet per work type: demo area, patio, wall, garden beds, etc.
- **Disposal categories**: brush, concrete, mixed — different disposal sites for different debris types. Some projects need 3+ disposal sites. Need rough disposal amounts per category.
- Purpose: feed AI to generate accurate material list "down to the penny instead of a broad rough guess"

### Step 4: Scope & Tasks
- All good, no changes

### Step 5: Crew & Labor
- Functions well, no changes right now
- **Future**: assign a foreman at this stage

### Step 6: Compliance
- No changes

### Step 7: Timeline & Budget
- Start Date & Target Completion — good
- **Bug: Estimated Total Hours doesn't auto-fill Labor Cost** when manually changed
- **Add Disposal Cost field** and **Equipment Cost field** (adjustable manually). Equipment rental box isn't needed — contractors fold rental into equipment cost
- **Client Quote**: should AI auto-generate a quote recommendation? Contractor wants option for AI-generated quote that can be manually adjusted
- **Post-creation editing**: must be able to go back and edit every step after project creation (scope changes happen on every job)

---

## Project View / Work Orders

- **Utility Locate safety check**: when assigning a project to a crew member, pop up a reminder asking if they've called in a utility locate. Yes/No, won't dismiss until Yes. Mostly for residential sites.
- **Assignment → Schedule flow**: when assigning to a foreman/crew member, they should input or confirm the start date. Assignment should auto-fill the Schedule page with project info (start date, who's assigned).
- **Crew Page not connected**: program is not currently sharing job assignments to the Crew Page.

---

## Org-Level Settings (New Feature Request)

Contractor wants a place to set standard rates that auto-populate into projects:
- Disposal rates (per category)
- Equipment hourly rate (if applicable)
- Man-hour / labor rates
- These rates should "communicate with the project build page" to calculate costs automatically, especially for demo/prep tasks

---

## Crew

- **Add phone number field** to crew member profiles

---

## Equipment

- **Equipment Type dropdown** needs landscaping-specific options:
  Excavator, Mini-Excavator, Skid Steer, Mini Skid Steer, Tractor, Dump Truck, Trailer, Pickup Truck
  (contractor will add more later)
- **Add hourly cost field** — some contractors estimate by equipment cost per hour on a job
- Edit & Maintenance Log — working fine, no changes

---

## Priority Ranking (Cowork Assessment)

### Must-have for daily use (stabilization scope)
1. Data pipeline integrity — wizard data flows to dashboard, schedule, crew
2. Crew assignment persistence
3. Schedule ↔ project connectivity
4. Dashboard reflects reality across all widgets

### High-value features (post-stabilization)
1. Material quantities wizard step (biggest accuracy improvement)
2. Org-level rate settings (biggest time-saver per project)
3. Disposal cost category
4. Utility locate safety check
5. Client quote AI generation

### Quick wins (can bundle with any sprint)
1. Equipment type dropdown values
2. Crew phone number field
3. Equipment hourly cost field
4. Estimated hours → labor cost auto-calc fix
5. Address dropdown keyboard navigation
