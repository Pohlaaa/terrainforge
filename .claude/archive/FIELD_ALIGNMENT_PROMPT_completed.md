# TerrainForge — Wizard ↔ Dashboard Field Alignment

> **Goal**: Every field the wizard collects must be viewable AND editable on the ProjectDashboard. Org default rates must pre-populate the wizard budget step and be editable at the project level.
>
> **Branch**: `fix-field-alignment`
> **SQL migrations**: None
> **Architecture reference**: `.claude/ARCHITECTURE.md`
> **Design reference**: `.claude/DESIGN_SYSTEM.md`

---

## PRE-FLIGHT: Read These Files

1. `.claude/ARCHITECTURE.md` — store boundaries, data flow
2. `.claude/DESIGN_SYSTEM.md` — modal/form patterns, component specs
3. `.claude/CODE_GUIDE.md` — execution rules
4. `CLAUDE.md` (root) — naming conventions, what NOT to do
5. `src/pages/ProjectWizard.tsx` — wizard state shape, handleCreate
6. `src/pages/ProjectDashboard.tsx` — how project data loads, tab structure
7. `src/components/project-dashboard/OverviewTab.tsx`
8. `src/components/project-dashboard/BudgetTab.tsx`
9. `src/components/project-dashboard/ResourcesTab.tsx`
10. `src/components/project-dashboard/ComplianceTab.tsx`
11. `src/stores/orgStore.ts` — org default rates
12. `src/stores/projectStore.ts` — updateProject action

---

## CONTEXT: Current State

The wizard collects ~50+ fields across 7 steps. The ProjectDashboard displays most of them but almost nothing is editable outside of Tasks, a few Budget line items, Subcontractors, and Permits.

The contractor said: "must be able to go back and edit every step after project creation (scope changes happen on every job)."

This prompt adds edit capabilities across 4 dashboard tabs and wires org default rates into the wizard.

---

## TASK 1: Overview Tab — "Edit Project Details" Modal

**File**: `src/components/project-dashboard/OverviewTab.tsx`

Add an "Edit" button (pencil icon or text link) to the Overview tab header area. Clicking it opens a modal with two sections:

### Section A: Project & Client Info
Editable fields:
- `name` — text input (required)
- `description` — textarea
- `projectType` — select dropdown (same options as wizard)
- `propertyType` — select dropdown (same options as wizard)
- `scopeSize` — select/button group (small, medium, large, commercial)
- `clientName` — text input
- `clientPhone` — text input
- `clientEmail` — email input
- `address` — text input (plain text, not autocomplete — changing address post-creation is a manual correction, not a geocode redo)
- `startDate` — date input
- `targetDate` — date input
- `estimatedHours` — number input

### Section B: Site Conditions
Editable fields:
- `slopeGrade` — text input
- `soilType` — text input
- `sunExposure` — select (full_sun, partial_shade, full_shade, mixed)
- `drainagePattern` — text input
- `existingVegetation` — text input
- `climateZone` — text input
- `utilityLocations` — text input

### Save Action
On save, call `useProjectStore().updateProject(project.id, { ...allEditedFields })`.

Optimistic update: update local state immediately, write to Supabase, roll back on error.

### Modal Styling
- Use the existing Modal/Dialog component from `src/components/shared/`
- Max-width 640px
- Two-column layout on desktop for Section A (name/description full-width, the rest 2-col)
- Section B below with a "Site Conditions" sub-header
- Save + Cancel buttons at bottom

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Edit button appears on Overview tab
- [ ] Modal opens with all fields pre-populated from project data
- [ ] Saving updates the project and UI reflects changes
- [ ] Cancel closes without saving
- [ ] All fields map to correct project properties (camelCase)

---

## TASK 2: Budget Tab — Complete Edit Form

**File**: `src/components/project-dashboard/BudgetTab.tsx`

The Budget tab already has an "Edit Budget" mode with: clientQuote, laborBudget, materialsBudget, equipmentBudget, overheadPct.

### Add missing fields to the edit form:
- `subcontractorBudget` — number input (currently view-only)
- `disposalCost` — number input (currently not shown at all)
- `equipmentCost` — number input (currently not shown at all)

### Add to the Cost Breakdown display:
The cost breakdown card should also display disposalCost and equipmentCost as line items (currently missing from the read-only view too). Add them between the existing cost lines:
```
Labor Budget:        $X,XXX
Materials Budget:    $X,XXX
Equipment Budget:    $X,XXX
Equipment Cost:      $X,XXX    ← ADD
Disposal Cost:       $X,XXX    ← ADD
Subcontractor Budget: $X,XXX
Permit Fees:         $X,XXX
Overhead (X%):       $X,XXX
─────────────────────────────
Total Project Cost:  $XX,XXX
```

### Save Action
Same pattern — `updateProject(project.id, { subcontractorBudget, disposalCost, equipmentCost, ...existing })`.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Edit mode shows all 8 budget fields (clientQuote, laborBudget, materialsBudget, equipmentBudget, subcontractorBudget, disposalCost, equipmentCost, overheadPct)
- [ ] Cost breakdown display includes disposal and equipment cost line items
- [ ] Total cost calculation includes the new fields
- [ ] KPI cards (profit, margin) account for the new cost fields

---

## TASK 3: Resources Tab — Crew & Equipment Editable

**File**: `src/components/project-dashboard/ResourcesTab.tsx`

### Add editable fields to the Crew section:
- `crewSize` — number input with inline edit (click to edit pattern, or small edit button)
- `crewNotes` — text input with inline edit

Display these in the Crew card header area. If currently not displayed, add them.

### Add editable field to Equipment section:
- `equipmentNotes` — textarea with inline edit

### Save Action
Each field saves independently via `updateProject(project.id, { crewSize })` etc.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Crew size displays and is editable
- [ ] Crew notes display and are editable
- [ ] Equipment notes display and are editable
- [ ] Changes persist after page refresh

---

## TASK 4: Compliance Tab — Editable Fields

**File**: `src/components/project-dashboard/ComplianceTab.tsx`

### Add edit capabilities:

**Compliance Notes** — currently read-only in the "Risk & Compliance Notes" card:
- Add an edit button that toggles the card to edit mode (textarea)
- Save via `updateProject(project.id, { complianceNotes })`

**Permit Status** — currently shown as a KPI but not editable:
- Add a select dropdown next to or replacing the KPI display
- Options: not_started, applied, approved, denied, not_required
- Save via `updateProject(project.id, { permitStatus })`

**Access & Logistics Card** — currently read-only:
- Add an edit button that opens inline edit mode for:
  - `gateCode` — text input
  - `permittedHours` — text input
  - `parkingRestrictions` — text input
- Save via `updateProject(project.id, { gateCode, permittedHours, parkingRestrictions })`

**HOA Card** — currently read-only:
- Add edit mode for:
  - `hoaFlag` — checkbox/toggle
  - `hoaRules` — textarea
  - `permitZone` — text input
- Save via `updateProject(project.id, { hoaFlag, hoaRules, permitZone })`

### Inline Edit Pattern
Use a consistent pattern across all cards: pencil icon button in the card header → fields become editable → Save/Cancel buttons appear at the card footer. Keep it lightweight — no modals needed here, just in-card edit mode.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Compliance notes editable and saves
- [ ] Permit status dropdown works and saves
- [ ] Access fields (gateCode, permittedHours, parkingRestrictions) editable and save
- [ ] HOA fields (hoaFlag, hoaRules, permitZone) editable and save
- [ ] All saves persist after refresh

---

## TASK 5: Wizard Budget Step — Pre-populate Org Default Rates

**File**: `src/pages/ProjectWizard.tsx` and the budget step component (`src/components/wizard/WizardStep5.tsx` or equivalent)

### 5a: Load org default rates in wizard

In ProjectWizard.tsx, read from orgStore:
```typescript
const { org } = useOrgStore();
```

When the wizard initializes, if the budget fields are null/empty AND org has defaults, pre-populate:
- `laborBudget` ← calculate from `estimatedHours × org.defaultLaborRate` (if both exist)
- `equipmentCost` ← if org has `defaultEquipmentRate`, show it as a suggested starting point but don't auto-fill (different projects use equipment differently)

### 5b: Show org rates as reference in the budget step

In the budget step UI, below or next to the labor budget field, show a helper text:
```
Org default: $75/hr × [estimated hours] = $X,XXX
```

This helps the contractor see where the number comes from while still allowing manual override. Only show this if `org.defaultLaborRate` exists.

For disposal costs, if `org.disposalRates` has entries, show them as a reference:
```
Org disposal rates: Brush $200/load, Concrete $350/load, Mixed $275/load
```

### 5c: Auto-calculate labor budget when hours change

If the user changes `estimatedHours` in the budget step AND hasn't manually edited `laborBudget`, recalculate:
```
laborBudget = estimatedHours × org.defaultLaborRate
```

Track whether the user has manually edited laborBudget with a local flag. If they have, don't overwrite it.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] Wizard budget step shows org default rate as helper text
- [ ] Labor budget auto-calculates from hours × default rate
- [ ] Changing hours recalculates labor budget (unless manually overridden)
- [ ] Disposal rate reference displays when org has disposal rates
- [ ] If org has no rates, no helper text shown (no errors)

---

## TASK 6: Verify updateProject Handles All Fields

**File**: `src/services/supabaseData.ts` and `src/stores/projectStore.ts`

Verify that `updateProject` in supabaseData.ts can handle ALL the fields being edited in Tasks 1-4. The generic `toSnakeCase()` mapper should handle most of these, but verify:

- `existingVegetation` → `existing_vegetation`
- `utilityLocations` → `utility_locations`
- `climateZone` → `climate_zone`
- `sunExposure` → `sun_exposure`
- `drainagePattern` → `drainage_pattern`
- `slopeGrade` → `slope_grade`
- `disposalCost` → `disposal_cost`
- `equipmentCost` → `equipment_cost`
- `hoaFlag` → `hoa_flag`
- `hoaRules` → `hoa_rules`
- `gateCode` → `gate_code`
- `permittedHours` → `permitted_hours`
- `parkingRestrictions` → `parking_restrictions`
- `permitZone` → `permit_zone`
- `complianceNotes` → `compliance_notes`
- `permitStatus` → `permit_status`
- `crewSize` → `crew_size`
- `crewNotes` → `crew_notes`
- `equipmentNotes` → `equipment_notes`
- `scopeSize` → `scope_size`
- `propertyType` → `property_type`
- `projectType` → `project_type`

If the mapper is generic (converts any camelCase to snake_case), this should work. If it uses an explicit field list, add the missing ones.

Also verify that `projectStore.updateProject` action correctly calls supabaseData and refreshes the local state.

**Self-verification:**
- [ ] `npm run build` passes
- [ ] All field names map correctly through snake/camel conversion
- [ ] No fields silently dropped during update

---

## REGRESSION CHECKLIST

After all tasks:

### Overview Tab
- [ ] Edit button opens modal
- [ ] All project/client fields editable and save
- [ ] All site condition fields editable and save
- [ ] Overview displays updated values after save

### Budget Tab
- [ ] Edit mode shows all 8 cost fields
- [ ] Disposal cost and equipment cost display in cost breakdown
- [ ] Total cost and margin calculations correct
- [ ] Budget KPIs update after edit

### Resources Tab
- [ ] Crew size, crew notes editable
- [ ] Equipment notes editable
- [ ] Subcontractors still fully editable (existing functionality)

### Compliance Tab
- [ ] Compliance notes editable
- [ ] Permit status editable via dropdown
- [ ] Access/logistics fields editable
- [ ] HOA fields editable

### Wizard
- [ ] Budget step shows org default rate helper text
- [ ] Labor budget auto-calculates from hours × rate
- [ ] Manual override of labor budget sticks
- [ ] Disposal rate reference shown when org rates exist
- [ ] Full wizard → project creation still works end-to-end

### Other Tabs (no regressions)
- [ ] Projects hub tab still works
- [ ] Budget & Finance hub tab still works
- [ ] Materials hub tab still works
- [ ] Crew & Equipment hub tab still works
- [ ] Theme toggle still works
- [ ] `npm run build` passes clean

---

## EXECUTION ORDER

1. **Task 6** (Verify field mapping) — ensure updateProject can handle all fields before building edit UIs
2. **Task 1** (Overview edit modal) — biggest impact, most fields
3. **Task 2** (Budget edit completion) — add 3 missing fields + display lines
4. **Task 3** (Resources edit) — crew size, notes
5. **Task 4** (Compliance edit) — access, HOA, notes
6. **Task 5** (Wizard org rates) — pre-populate from org defaults

Run `npm run build` after each task.

---

## PR COMMAND

```
"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head fix-field-alignment --title "Fix: wizard-dashboard field alignment + org rate defaults" --body "Makes all wizard-collected fields editable on the ProjectDashboard. Adds edit modal to Overview tab, completes Budget edit form (disposal/equipment cost), adds crew/equipment edit to Resources, adds compliance/access/HOA editing. Pre-populates wizard budget step from org default rates."
```
