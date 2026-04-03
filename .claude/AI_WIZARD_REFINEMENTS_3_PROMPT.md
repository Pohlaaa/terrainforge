# AI Wizard Refinements Round 3 — Execution Prompt

> **Sprint**: AI Wizard Refinements 3
> **Branch**: `fix-wizard-refinements-3`
> **Pre-requisite**: `fix-wizard-refinements-2` merged. Missing columns already added to DB (`crew_size`, `crew_notes`, `equipment_notes` on projects table).
> **Read first**: `ARCHITECTURE.md` §5, `CODE_GUIDE.md`, `CLAUDE.md`

---

## Overview

Final polish round for the AI wizard. Fixes task timeline logic, adds reset/manual controls, corrects equipment cost field mapping, improves wizard step navigation, and fixes minor console warnings.

---

## Task 1: Reset AI Recommendations Button

**Why**: Contractors need a way to clear AI suggestions and start fresh on any step.

### 1a. Add reset buttons to wizard steps 3, 4, and 6

On each wizard step that has a `SuggestionPanel` (Tasks, Resources, Compliance), add a "Reset AI Suggestions" button that:

1. Clears all accepted items for that category back to pending (removes from `acceptedItems`, removes from `dismissedItems`)
2. Removes the accepted items from the wizard data (e.g., removes AI-accepted tasks from `data.tasks`, removes AI-accepted crew from `data.crewSelections`, removes AI-accepted permits from `data.permitChecklist`)
3. Returns the suggestion panel to its initial state — all AI suggestions show as pending (neither accepted nor dismissed)

Implementation in `ProjectWizard.tsx` — add a reset handler:

```typescript
const handleResetCategory = (category: string) => {
  // Clear accepted/dismissed state
  setAcceptedItems(prev => ({ ...prev, [category]: new Set() }));
  setDismissedItems(prev => ({ ...prev, [category]: new Set() }));

  // Remove AI-sourced items from wizard data
  if (category === 'tasks') {
    // Keep only manually-added tasks (those not from AI)
    onChange({ tasks: data.tasks.filter(t => !t.aiGenerated) });
  }
  if (category === 'crew') {
    onChange({ crewSelections: [] });
  }
  if (category === 'permits') {
    // Reset permit checklist to empty, clear AI-suggested fees
    onChange({ permitChecklist: [], permitFees: {} });
  }
};
```

Pass this handler to each relevant wizard step. Each step renders a button:
```
[↺ Reset AI Suggestions]
```
Positioned in the top-right of the suggestion panel area, styled as a subtle text button (not primary).

### 1b. Track AI-generated items

To distinguish AI-accepted items from manually-added ones, ensure:
- Tasks accepted from AI have `aiGenerated: true` (the `WizardTask` type already has this field)
- When a task is manually added by the user, set `aiGenerated: false`
- This allows the reset to only remove AI-sourced tasks while preserving manual entries

**Build and verify**: `npm run build` must pass clean.

---

## Task 2: Fix Task Timeline Logic — Dependencies and Crew Direction

**File**: `src/lib/taskTimeline.ts`

### 2a. Fix crew count direction

**Bug**: Reducing crew from 4 to 3 currently REDUCES the timeline. It should INCREASE it — fewer crew members means each task takes longer.

The formula `durationDays = Math.ceil(estimatedHours / (8 × crewCount))` is correct mathematically (more crew = fewer days). Verify this is what's actually implemented. If the timeline gets shorter when crew decreases, the bug is likely in how the component passes or reacts to crew count changes.

Check `WizardStep3.tsx` — verify that `crewCount` is derived from `data.crewSelections?.length` and that changes to crew selections on Step 4 trigger a re-render of Step 3's timeline when the user navigates back.

### 2b. Add intra-phase dependencies

Current behavior: ALL tasks within the same phase run fully in parallel.

Better behavior: Tasks within a phase should respect a dependency chain. By default, tasks within the same phase are sequential UNLESS they have no dependency relationship. Use the `sequenceNumber` field to determine order:

```typescript
// Within a phase, tasks with the SAME sequence number run in parallel.
// Tasks with DIFFERENT sequence numbers are sequential.
// Example: Two hardscape tasks both at sequence 3 = parallel.
//          Hardscape task at sequence 3, then sequence 4 = sequential.

for (const [phase, phaseTasks] of phases) {
  // Group by sequence number within the phase
  const sequenceGroups = groupBySequence(phaseTasks);

  for (const [seqNum, groupTasks] of sequenceGroups) {
    // Tasks in the same sequence group run in parallel
    let maxDuration = 0;
    for (const task of groupTasks) {
      const duration = Math.max(1, Math.ceil((task.estimatedHours ?? 8) / (8 * effectiveCrew)));
      result.push({
        name: task.name,
        phase,
        startDay: currentDay,
        durationDays: duration,
        estimatedHours: task.estimatedHours ?? 0,
      });
      maxDuration = Math.max(maxDuration, duration);
    }
    currentDay += maxDuration; // Next sequence group starts after this one
  }
}
```

### 2c. AI-generated tasks should have meaningful sequence numbers

When AI generates tasks (in `aiRecommendations.ts`), the prompt should instruct Claude to assign `sequenceNumber` values that reflect dependencies:
- Tasks that can be done simultaneously get the same sequence number
- Tasks that depend on a previous task get a higher sequence number
- Within a phase, sequence numbers should start at 1 and increment

**Build and verify**: `npm run build` must pass clean.

---

## Task 3: Fix Task Timeline Readability

**File**: `src/components/wizard/WizardStep3.tsx` (timeline section)

### 3a. Fix task name truncation

**Bug**: Task names get cut off with "..." because the timeline bars are too narrow.

Fixes:
1. **Minimum bar width**: Set a minimum width for task bars so short-duration tasks still show their name:
   ```css
   min-width: 120px;
   ```

2. **Tooltip on hover**: Add a `title` attribute or a custom tooltip to each task bar showing the full task name, estimated hours, and duration:
   ```
   "Remove existing pavers — 8 hrs (1 day)"
   ```

3. **Task name positioning**: For short bars where the name doesn't fit inside, position the label to the right of the bar instead of inside it:
   ```typescript
   const nameOverflows = barWidth < 120;
   // If overflows, render label to the right of the bar
   ```

4. **Increase row height**: Give each task row enough vertical space for the label. Minimum row height of 32px.

### 3b. Improve overall timeline layout

- Add phase group headers as colored left-side labels (e.g., "Demo/Prep", "Hardscape")
- Add a subtle grid line for each day column
- Show day count total at the bottom: "Estimated: X working days"
- If timeline exceeds 2 weeks, collapse weekends and show week markers instead of individual day labels

**Build and verify**: `npm run build` must pass clean.

---

## Task 4: Manual Crew Add Option

**Why**: Contractors may want to add crew members who aren't recommended by AI, or the org may not have crew profiles set up yet.

### 4a. Add "Add Crew Manually" to WizardStep4

Below the AI crew suggestion panel (or in place of it when no recommendations exist), add a manual crew picker:

1. **Dropdown/select from org roster**: Show all org crew members not already in `data.crewSelections`. Each option shows name + role. Selecting one adds them to `data.crewSelections`.

2. **If no org crew exists**: Show a message: "No crew members in your organization yet. Add crew on the Crew & Equipment page, or continue without crew assignments."

3. The manual picks should appear in the same accepted crew list as AI-accepted picks. They should be visually indistinguishable — a crew member is a crew member regardless of how they were added.

### 4b. UI design

```
┌─ Crew ──────────────────────────────────────────────┐
│ [AI Suggestion Panel - if recommendations exist]    │
│                                                      │
│ ── Or add manually ──                                │
│ [Select crew member ▾]  [Add]                       │
│                                                      │
│ ── Assigned Crew (3) ──                             │
│ ✓ Maria Lopez — Foreman (AI recommended)            │
│ ✓ John Smith — Installer (AI recommended)           │
│ ✓ Dave Park — Laborer (manually added)    [Remove]  │
└──────────────────────────────────────────────────────┘
```

### 4c. Data handling

Manual picks use the same `crewSelections` array:
```typescript
const handleManualCrewAdd = (crewMember: CrewMember) => {
  const current = data.crewSelections ?? [];
  if (current.some(c => c.crewMemberId === crewMember.id)) return; // already added
  onChange({
    crewSelections: [...current, {
      crewMemberId: crewMember.id,
      name: crewMember.name,
      role: crewMember.role,
    }]
  });
};
```

**Build and verify**: `npm run build` must pass clean.

---

## Task 5: Fix Wizard Step Navigation — Forward Clicks

**File**: `src/pages/ProjectWizard.tsx` and `src/components/wizard/WizardStepper.tsx`

**Current behavior**: Step circles are only clickable for steps ≤ current step (backward only).

**Correct behavior**: Steps should be clickable both backward AND forward, but ONLY if data has been entered on those steps (i.e., the user has visited them before).

### 5a. Track highest visited step

Add state to `ProjectWizard.tsx`:

```typescript
const [highestVisitedStep, setHighestVisitedStep] = useState(0);

// Update on navigation
const handleNext = () => {
  const nextStep = currentStep + 1;
  setCurrentStep(nextStep);
  setHighestVisitedStep(prev => Math.max(prev, nextStep));
  triggerAIIfNeeded(currentStep);
};
```

### 5b. Update WizardStepper clickability

Change `isClickable` in `WizardStepper.tsx`:

```typescript
// Was: const isClickable = onStepClick && idx <= currentStep;
// Now: allow clicking any visited step (forward or backward)
const isClickable = onStepClick && idx <= highestVisitedStep;
```

Pass `highestVisitedStep` as a prop to `WizardStepper`:

```typescript
interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  highestVisitedStep: number;  // NEW
  onStepClick?: (step: number) => void;
}
```

### 5c. Visual distinction

- **Visited steps** (≤ highestVisitedStep): Show green checkmark, clickable cursor
- **Current step**: Green with glow ring (existing)
- **Unvisited future steps**: Gray, not clickable, default cursor

**Build and verify**: `npm run build` must pass clean.

---

## Task 6: Fix Equipment Cost Field Mapping

**Why**: Equipment cost is showing under the wrong field in the budget. The wizard calculates equipment costs but maps them to `equipmentBudget` (the rental/usage field) instead of `equipmentCost`.

### 6a. Clarify the two equipment fields

The projects table has TWO equipment-related cost fields:
- `equipment_budget` / `equipmentBudget` — **equipment rental/usage budget** (what the contractor plans to spend on renting or using equipment)
- `equipment_cost` / `equipmentCost` — **actual equipment operating cost** (hourly rate × hours)

### 6b. Fix the wizard budget step calculation

In `WizardStep5.tsx`, the `calcEquipment` value (hours × rate) should map to `equipmentCost`, not `equipmentBudget`:

```typescript
// Auto-populate equipmentCost (not equipmentBudget) from equipment selections
useEffect(() => {
  if (calcEquipment > 0 && !equipmentCostManuallyEdited.current) {
    onChange({ equipmentCost: calcEquipment });
  }
}, [calcEquipment]);
```

The `equipmentBudget` field should remain as a manual-entry field for the contractor to set their overall equipment budget/allocation.

### 6c. Update the financials display

Make sure the budget breakdown shows both fields:
```
Equipment Budget:  $X,XXX  (planned allocation — editable)
Equipment Cost:    $X,XXX  (calculated from hours × rate — auto-calculated, editable)
```

### 6d. Update handleCreate

In `ProjectWizard.tsx`, verify the project builder maps both fields:
```typescript
equipmentBudget: data.equipmentBudget ?? null,
equipmentCost: data.equipmentCost ?? null,
```

**Build and verify**: `npm run build` must pass clean.

---

## Task 7: Fix Console Warnings

### 7a. Landing page CSS border conflict

**File**: `src/pages/Landing.tsx` — `PainPointCard` component (~line 393)

The warning: "Updating a style property during rerender (border) when a conflicting property is set (borderTop)."

Fix: Replace mixed shorthand/longhand border properties. Instead of setting both `border` and `borderTop`, use only longhand properties:

```typescript
// Instead of:
style={{ border: '1px solid var(--border)', borderTop: '3px solid var(--green)' }}

// Use:
style={{
  borderLeft: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  borderTop: '3px solid var(--green)',
}}
```

### 7b. Recharts dimension warning

The warning: "The width(-1) and height(-1) of chart should be greater than 0."

This happens when a Recharts `ResponsiveContainer` renders before its parent has a measurable size (e.g., in a collapsed section or during initial layout).

Fix: Add `minWidth` and `minHeight` to the `ResponsiveContainer`:

```typescript
<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
```

Or wrap the chart in a container with explicit minimum dimensions:

```typescript
<div style={{ minHeight: '200px', minWidth: '100px' }}>
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>
```

Search for ALL `ResponsiveContainer` usages across the codebase and apply the fix.

**Build and verify**: `npm run build` must pass clean. Console should have zero warnings from these sources.

---

## Task 8: Final Verification

### Build
```
npm run build
```
Must pass clean with zero errors and zero warnings.

### Regression checklist
- [ ] "Reset AI Suggestions" button appears on Steps 3, 4, and 6
- [ ] Clicking reset clears AI suggestions back to pending state
- [ ] Reset preserves manually-added tasks/crew
- [ ] Task timeline: adding crew reduces days per task (more crew = shorter timeline)
- [ ] Task timeline: removing crew increases days per task (fewer crew = longer timeline)
- [ ] Task timeline: tasks within same phase with same sequence number show in parallel
- [ ] Task timeline: tasks with different sequence numbers are sequential
- [ ] Task names show fully (tooltip on hover for overflow)
- [ ] Phase group headers visible on timeline
- [ ] Manual crew add dropdown shows org crew members
- [ ] Manually added crew appear in assigned crew list alongside AI picks
- [ ] Wizard step circles clickable for all previously visited steps (forward AND backward)
- [ ] Unvisited future steps are NOT clickable
- [ ] Equipment cost (hours × rate) populates `equipmentCost` field, not `equipmentBudget`
- [ ] Both equipment fields visible in budget breakdown
- [ ] No border warning in console from Landing page
- [ ] No Recharts dimension warning in console
- [ ] Full wizard flow creates project successfully
- [ ] ProjectDashboard Budget tab shows correct equipment cost vs equipment budget
- [ ] `npm run build` passes clean

### PR
Branch: `fix-wizard-refinements-3`
Title: "fix: AI reset, timeline dependencies, manual crew, step nav, equipment cost mapping"
Body: Summary of all 8 tasks.
