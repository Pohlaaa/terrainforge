# Sprint 15 Test Cases — Scheduling Module

Run `npm run dev` and open `http://localhost:3000`. Log in with your test account.

## Pre-Flight

- [Y] Build passes: `npm run build` (zero errors)
- [Y] Dev server starts: `npm run dev` (no console errors on load)
- [Y] SQL migration 005_scheduling.sql has been run in Supabase

---

## 1. Schedule Page — Basic Rendering

**Navigate to /schedule (sidebar → "Schedule")**

- [Y] Schedule page loads with the weekly calendar grid
- [Y] Header shows "Schedule" with subtitle about drag-to-reschedule
- [Y] Week navigation bar shows: ← Prev Week, "Week of [date]", Next Week →, Today button, 5-day/7-day toggle
- [Y] Crew members from Crew Manager appear as rows on the left
- [Y] 7 day columns (Mon–Sun) show with correct dates for the current week
- [Y] Today's column has a subtle green highlight
- [Y] Seed data chips appear in the correct day/crew cells

**If no crew members exist:**

- [Y] Empty state shows "No crew members" with a link to Crew Manager
- [Y] Clicking "Go to Crew Manager →" navigates to /crew

## 2. Week Navigation

- [Y] Click "← Prev Week" — dates shift back 7 days, label updates
- [Y] Click "Next Week →" — dates shift forward 7 days, label updates
- [Y] Click "Today" — returns to current week
- [Y] Click "5-day" — weekends disappear, only Mon–Fri columns show
- [Y] Click "7-day" — weekends return
- [y] Navigating weeks preserves the 5/7 day toggle state

## 3. Assignment Modal

**Click an empty cell (a day/crew intersection with no entries)**

- [y] Modal opens with title "Assign to Schedule"
- [y] Modal shows the correct date (e.g., "Monday, March 30")
- [y] Project dropdown lists all projects from the project store
- [y] Start time and End time fields are optional time inputs
- [y] Notes textarea is optional
- [y] "Assign" button is disabled until a project is selected
- [y] Select a project → "Assign" button enables
- [y] Click "Assign" → modal closes, new chip appears in the cell
- [y] Click "Cancel" or click the backdrop → modal closes without changes

## 4. Schedule Entry Chips

- [y] Each entry shows as a colored chip with the project name
- [y] Different projects get different deterministic colors
- [y] Hovering a chip shows a tooltip with project name, time, and notes 
- [y] Each chip has a small "✕" delete button on the right
- [y] Clicking "✕" removes the entry immediately (optimistic delete)

## 5. Drag and Drop

**Drag a chip from one cell to another:**

- [y] Cursor changes to "grab" when hovering a chip
- [y] Dragging a chip makes it semi-transparent (opacity 0.4)
- [y] Hovering over a target cell shows a green dashed outline and highlighted background
- [y] Dropping on a different day for the same crew member → entry moves to new date
- [y] Dropping on a different crew member row → entry reassigns to new crew member AND new date
- [y] Dropping back on original cell → no change (entry stays put)
- [y] Dragging to a cell that already has entries → drop still works (multiple entries per cell)
- [y] After drop, the chip appears in the new cell and is gone from the old cell

## 6. Conflict Detection

- [y] When a crew member has 2+ entries on the same day, a ⚠️ icon appears in that cell
- [x] Hovering the ⚠️ shows a tooltip about multiple assignments - TEST NOTE: it shows a question mark on hover
- [x] Creating a second assignment for the same crew member on the same day triggers the warning - TEST NOTE: can't add multiple assignments on a day without adding it on a different day or crew and dragging. After dragging the ⚠️ appears. 

## 7. Dashboard — Schedule Widget

**Navigate to / (Dashboard)**

- [N] "Today's Schedule" widget appears in the widget grid
- [n] Widget shows today's schedule entries (crew → project, time range, status)
- [x] If no entries for today, shows "No crew scheduled today" empty state - TESTING NOTE: shows crew utilization widget as 0/2 for today
- [N] "View full schedule →" link navigates to /schedule
- [N] Entry status labels display correctly (Scheduled, In Progress, Done, Cancelled)

## 8. Project Detail — Upcoming Schedule

**Navigate to /projects, select any project**

- [Y] "Upcoming Schedule" section appears in the project detail panel
- [Y] Shows up to 5 future schedule entries for that project
- [Y] Each entry shows crew member name and scheduled date
- [Y] If no upcoming entries, shows "No crew scheduled" with a "Schedule crew →" link
- [Y] "Schedule crew →" links navigate to /schedule

## 9. Material Library — Tab Reorder

**Navigate to /materials**

- [N] Tabs appear in order: "Inventory On Hand", "Suppliers", "Material Library"
- [N] All three tabs load their content correctly
- [N] Low stock count badge still appears on the Inventory tab if applicable

TESTING NOTE: This is material library. Adding a material also fails with an in-app load error warning

## 10. Sidebar — Schedule Link

- [X] Sidebar shows "Schedule" with a 📅 icon - TESTING NOTE: Shows schedule, does not show icon. No sidebar links have emoji icons, only colored dots
- [Y] Clicking it navigates to /schedule
- [Y] Active state highlights correctly when on /schedule

---

## Regression Checks

- [y] Dashboard loads without console errors
- [y] Projects page: list view, detail panel, zones all still work
- [y] Crew Manager: add/edit/delete crew members still work
- [n] Equipment Manager loads and functions normally - TESTING NOTE: Failed to add equipment with an in-app load error warning
- [x] Work Orders page loads (check if active project filter still works) - TESTING NOTE: loads fine without an active project, lets you pick a project then fails. with an active project selected, clicking the work orders page fails
- [N] Material Library: all three tabs load content
- [Y] Browser refresh on /schedule preserves the cur