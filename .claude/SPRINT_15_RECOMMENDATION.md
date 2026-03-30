# Sprint 15 — Recommendation (Revised)

> **Written by**: Orchestrator session, 2026-03-29
> **Revised**: Scope changed from "Demo-Ready bug fixes" to "Scheduling Module (Manager Side)"
> **Milestone**: M1 — "Worth the Demo"

---

## Sprint 15 Goal

Build the scheduling & calendar system on the manager side. This is the daily-use hook — the feature that makes a contractor open TerrainForge every morning. After Sprint 15, the manager can assign crew to projects by day, see a weekly calendar, and get a "Today's Schedule" summary on the Dashboard.

Sprint 15 also picks up the quick UX wins (active project bug, material tab reorder, Debug page removal) since they're small and improve the demo experience.

---

## Proposed Sprint 15 Scope

### Core Deliverables (Scheduling)

**S15-1: Database migration — schedule_entries table**
- Create `supabase/migrations/005_scheduling.sql`
- `schedule_entries` table with full RLS policies
- Indexes on `(org_id, scheduled_date)` and `(crew_member_id, scheduled_date)`

**S15-2: Schedule store + Supabase CRUD**
- New Zustand store: `src/stores/scheduleStore.ts`
- CRUD functions in `src/services/supabaseData.ts`
- Types in `src/types/index.ts`

**S15-3: Schedule page — weekly calendar view**
- New page: `src/pages/Schedule.tsx`
- Weekly view: 7-day columns, rows per crew member
- Cells show project assignment (color-coded by project status)
- Week navigation: prev/next week, "Today" button
- Click cell to assign crew to project for that day

**S15-4: Drag-and-drop scheduling**
- Drag crew member → drop on day/project cell to create schedule entry
- Drag existing entry to move it
- Conflict detection: visual warning if crew member is already assigned that day

**S15-5: "Today's Schedule" Dashboard widget**
- New widget: `src/components/dashboard/widgets/ScheduleWidget.tsx`
- Shows today's assignments: crew name → project name → location
- Tappable: click to navigate to full Schedule page
- Add to default widget layout

**S15-6: Schedule ↔ Project integration**
- On project detail panel: show upcoming schedule entries for this project
- "Schedule crew" action from project detail → opens schedule page with project pre-selected

### Quick Wins (UX Fixes)

**S15-7: Fix active project context**
- Sidebar icon updates when a project is selected
- Work Orders page filters by active project

**S15-8: Material Library tab reorder + Debug page removal**
- Reorder tabs: Inventory on Hand → Suppliers → Material Library
- Remove `/debug` route from `App.tsx` (keep `Debug.tsx` file for dev use)

---

## What Sprint 15 is NOT

- Not the crew app — that's Sprint 17-19
- Not a design overhaul — current UI is fine for manager-side scheduling
- Not time tracking — that's M4

---

## Post-Sprint Testing (for Charlie)

### What to Test — New Features
1. Schedule page loads → weekly view with 7 columns visible
2. Click a cell → assignment modal opens
3. Assign crew to project for Monday → entry appears in the cell
4. Drag entry from Monday to Wednesday → entry moves
5. Assign same crew member to two projects on same day → conflict warning appears
6. Dashboard → "Today's Schedule" widget shows today's assignments
7. Project detail → "Upcoming schedule" section shows entries

### Regression Checks
1. Dashboard loads with all existing widgets (KPI, map, crew, fleet, alerts)
2. Projects CRUD still works (create, edit, delete)
3. Manifest engine still generates correctly
4. Work Orders now filters by active project

---

## Dependencies

- **SQL migration** must be run in Supabase SQL Editor BEFORE testing locally
- No new env vars needed
- No new npm packages needed (drag-and-drop uses existing patterns)

---

## Sprint 16 Preview

Sprint 16 refines the scheduling system:
- Equipment scheduling (assign equipment to projects alongside crew)
- Schedule templates (save a weekly template, apply to future weeks)
- Print/PDF daily schedule for field distribution
- Notifications stub (schedule change → flag for crew app to pick up later)
