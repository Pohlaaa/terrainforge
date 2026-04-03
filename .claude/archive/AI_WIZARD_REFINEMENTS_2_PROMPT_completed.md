# AI Wizard Refinements Round 2 — Execution Prompt

> **Sprint**: AI Wizard Refinements 2
> **Branch**: `fix-wizard-refinements-2`
> **Pre-requisite**: `fix-wizard-refinements` merged. No new migrations.
> **Read first**: `ARCHITECTURE.md` §5, `CODE_GUIDE.md`, `CLAUDE.md`

---

## Overview

Second round of refinements based on user testing. Fixes task timeline scheduling logic, labor/equipment cost calculations, overhead-driven quoting, wizard navigation UX, and exit warnings.

---

## Task 1: Fix Task Timeline Scheduling Logic

**File**: `src/lib/taskTimeline.ts`

**Current behavior**: Tasks stack sequentially — each task starts after the previous one ends. One task per time slot.

**Correct behavior**: Multiple tasks CAN run in parallel on the same day if there are enough crew members. Multiple crew members can also reduce a single task's duration.

### 1a. Update `scheduleTasksOnTimeline()` to support parallelism

New logic:

1. **Crew-aware task duration**: A task's duration depends on how many crew are available. If a task estimates 16 hours and 2 crew members are assigned, it takes 1 day (16 hours ÷ 2 crew ÷ 8 hours/day = 1 day), not 2 days.

   Update the function signature to accept crew count:
   ```typescript
   export function scheduleTasksOnTimeline(
     tasks: WizardTask[],
     startDate: string,
     targetDate: string,
     crewCount: number  // NEW — number of accepted crew picks
   ): ScheduledTask[]
   ```

   Duration calculation becomes:
   ```typescript
   const effectiveCrew = Math.max(1, crewCount);
   const durationDays = Math.max(1, Math.ceil((task.estimatedHours ?? 8) / (8 * effectiveCrew)));
   ```

2. **Phase-based parallelism**: Tasks within the SAME phase can run in parallel (e.g., two hardscape tasks happening simultaneously). Tasks in DIFFERENT phases are still sequential (you don't start softscape until hardscape is done).

   Scheduling logic:
   - Group tasks by phase (maintaining phase order: demo_prep → rough_grade → hardscape → etc.)
   - Within each phase, tasks run in parallel — the phase duration is the MAX duration of any single task in that phase (not the sum)
   - The next phase starts on the day after the current phase ends
   - If total phase durations exceed available weekdays, compress proportionally

   ```typescript
   // Group by phase
   const phases = groupTasksByPhase(sorted); // Map<string, WizardTask[]>

   let currentDay = 0;
   const result: ScheduledTask[] = [];

   for (const [phase, phaseTasks] of phases) {
     let maxDuration = 0;
     for (const task of phaseTasks) {
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
     currentDay += maxDuration; // Next phase starts after longest task in this phase
   }
   ```

3. **Compression**: If `currentDay > totalWeekdays`, apply proportional compression to all task durations (same as current behavior, but applied to the phase-parallel result).

### 1b. Update `WizardStep3.tsx` to pass crew count

In `WizardStep3.tsx`, where `scheduleTasksOnTimeline` is called:

```typescript
const crewCount = data.crewSelections?.length ?? 1;
const scheduledTasks = useMemo(
  () => scheduleTasksOnTimeline(tasks, data.startDate, data.targetDate, crewCount),
  [tasks, data.startDate, data.targetDate, crewCount]
);
```

### 1c. Update timeline visualization

Since tasks within a phase now run in parallel (same start day), the timeline UI needs to stack them vertically:
- Tasks with the same `startDay` should render on separate rows but aligned to the same column
- Use a different visual treatment: parallel tasks get a subtle "stacked" appearance (slight vertical offset or grouped border)
- Phase labels can appear as row group headers on the left

**Build and verify**: `npm run build` must pass clean.

---

## Task 2: Fix Labor Cost Calculation — Crew Member Level

**File**: `src/components/wizard/WizardStep5.tsx`

**Current behavior**: `laborBudget = estimatedHours × laborRate` — this treats hours as aggregate.

**Correct behavior**: Labor cost happens at the crew member level. Each crew member costs `hourlyRate` per hour they work.

### 2a. Update labor calculation

```typescript
const crewCount = data.crewSelections?.length ?? 1;

const calcLabor = useMemo(() => {
  // Each crew member works the task hours, so total labor = hours × rate × crew
  return taskHoursSum * effectiveRate * crewCount;
}, [taskHoursSum, effectiveRate, crewCount]);
```

Wait — this isn't quite right either. If 2 crew members split a 16-hour task, they each work 8 hours. The total labor cost is still 16 hours × rate. But if there are 3 tasks each requiring 8 hours and 2 crew, the tasks take fewer calendar days but the total person-hours are the same.

Actually, for labor cost purposes: **total person-hours = sum of all task estimated hours**. This doesn't change with crew count — more crew means fewer days, but the same total hours billed.

The key insight: labor cost = `totalTaskHours × hourlyRate`. This is already correct in the current implementation. What changes with crew count is the **timeline duration** (Task 1 above), not the dollar amount.

**However**, if the contractor accepted specific crew members with potentially different rates in the future, we'd want per-crew rates. For now, the calculation is correct as-is.

### 2b. Clarify the labor display

Update the labor section in the budget step to show the breakdown clearly:

```
Labor: $X,XXX
  (XX total task hours × $XX/hr rate)
  (X crew members × Y calendar days)
```

Add a subtitle line under the labor budget field showing:
```typescript
const calendarDays = crewCount > 0
  ? Math.ceil(taskHoursSum / (8 * crewCount))
  : Math.ceil(taskHoursSum / 8);

// Display: "32 task hours × $35/hr · 2 crew × 2 days"
```

This helps the contractor understand that adding crew reduces days but doesn't change the labor cost.

**Build and verify**: `npm run build` must pass clean.

---

## Task 3: Fix Equipment Cost Calculation — Hours × Rate

**File**: `src/components/wizard/WizardStep5.tsx`

**Current behavior**: Equipment cost uses `dailyRate × durationDays` per selected item.

**Correct behavior**: Equipment cost should calculate based on **hours × default equipment rate** from org settings, not daily rate.

### 3a. Update equipment cost calculation

```typescript
const orgEquipmentRate = org?.defaultEquipmentRate ?? 0;

const calcEquipment = useMemo(() => {
  // If individual items have an hourly cost, use it; otherwise use org default
  return data.equipmentSelections.reduce((sum, e) => {
    const hourlyRate = e.hourlyCost > 0 ? e.hourlyCost : orgEquipmentRate;
    const hours = e.estimatedHours ?? (e.durationDays * 8); // convert days to hours if needed
    return sum + (hourlyRate * hours);
  }, 0);
}, [data.equipmentSelections, orgEquipmentRate]);
```

### 3b. Update WizardEquipment interface if needed

Check the `WizardEquipment` type in `ProjectWizard.tsx`. If it doesn't have `hourlyCost` or `estimatedHours`, add them:

```typescript
interface WizardEquipment {
  equipmentId: string;
  name: string;
  dailyRate: number;     // existing
  durationDays: number;  // existing
  hourlyCost?: number;   // ADD — from equipment profile
  estimatedHours?: number; // ADD — hours of equipment use
}
```

When AI recommends equipment or when equipment is accepted from the suggestion panel, populate `hourlyCost` from the equipment profile's `hourly_cost` field (added in migration 014).

### 3c. Update equipment display in budget

Show: `Equipment: $X,XXX (XX hours × $XX/hr)`

**Build and verify**: `npm run build` must pass clean.

---

## Task 4: Overhead % Drives the Quote

**File**: `src/components/wizard/WizardStep5.tsx`

**Current behavior**: There's a `targetProfitPct` field that auto-calculates the client quote, with overhead as a separate line item added to the subtotal.

**Correct behavior**: **Overhead % IS the markup that drives the quote.** There is no separate "target profit %" field. The contractor sets their overhead/markup %, and the quote auto-calculates from it. Profit margin is display-only.

### 4a. Remove `targetProfitPct`

- Remove the `targetProfitPct` field from `WizardData` interface
- Remove the `targetProfitPct` input field from the budget step UI
- Remove the `useEffect` that auto-calculates quote from `targetProfitPct`
- Remove the "on target" indicator that compared target vs actual margin

### 4b. Auto-calculate quote from overhead %

The financials calculation becomes:

```typescript
const financials = useMemo(() => {
  const labor = data.laborBudget ?? 0;
  const materials = data.materialsBudget ?? 0;
  const equipment = data.equipmentBudget ?? 0;
  const subs = data.subcontractorBudget ?? 0;
  const disposal = data.disposalCost ?? 0;
  const equipCost = data.equipmentCost ?? 0;
  const permits = totalPermitFees;

  const directCosts = labor + materials + equipment + subs + disposal + equipCost + permits;
  const overheadPct = data.overheadPct ?? 10;
  const overheadAmount = directCosts * (overheadPct / 100);
  const estimatedQuote = directCosts + overheadAmount;

  // Profit margin is display-only
  const profitMargin = estimatedQuote > 0
    ? (overheadAmount / estimatedQuote) * 100
    : 0;

  return { directCosts, overheadAmount, estimatedQuote, profitMargin };
}, [/* all cost fields + overheadPct */]);
```

### 4c. Auto-populate clientQuote from overhead calculation

When overhead % changes, auto-update the client quote (unless manually overridden):

```typescript
useEffect(() => {
  if (!quoteManuallyEdited.current && financials.estimatedQuote > 0) {
    onChange({ clientQuote: Math.round(financials.estimatedQuote) });
  }
}, [financials.estimatedQuote]);
```

### 4d. Update the UI layout

The budget section should display:

```
─── Cost Breakdown ───
Labor:           $X,XXX
Materials:       $X,XXX
Equipment:       $X,XXX
Subcontractors:  $X,XXX
Disposal:        $X,XXX
Permit Fees:     $X,XXX
─────────────────────────
Direct Costs:    $XX,XXX

Overhead/Markup: [___]%     ← editable input (drives the quote)
Overhead Amount: $X,XXX     ← display only

─── Estimated Quote ───
Client Quote:    $XX,XXX    ← auto-calculated, but editable to override
Profit Margin:   XX.X%      ← display only (green/amber/red based on %)
```

The **Overhead/Markup %** input is the primary driver. When the contractor changes it, the client quote updates automatically. The contractor CAN still manually override the quote (which sets the `quoteManuallyEdited` flag), and the profit margin display will update to reflect the manual quote vs direct costs.

### 4e. Margin color logic

```typescript
const marginColor = financials.profitMargin >= 20
  ? 'var(--status-green)'   // Healthy margin
  : financials.profitMargin >= 10
    ? 'var(--status-amber)'  // Thin margin
    : 'var(--status-red)';   // Low/negative margin
```

**Build and verify**: `npm run build` must pass clean.

---

## Task 5: Exit Warning on Wizard

**File**: `src/pages/ProjectWizard.tsx`

**Why**: Contractors lose work if they accidentally navigate away from the wizard mid-entry.

### 5a. Add browser beforeunload handler

```typescript
useEffect(() => {
  const hasData = data.name.trim().length > 0 || data.tasks.length > 0;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasData && !isCreating) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [data.name, data.tasks.length, isCreating]);
```

### 5b. Add React Router navigation blocker

Use `useBlocker` from react-router-dom (v6.4+) or a custom prompt:

```typescript
import { useBlocker } from 'react-router-dom';

const hasUnsavedData = data.name.trim().length > 0 || data.tasks.length > 0;

const blocker = useBlocker(
  ({ currentLocation, nextLocation }) =>
    hasUnsavedData && !isCreating && currentLocation.pathname !== nextLocation.pathname
);
```

If `useBlocker` is not available in the project's react-router version, use a simpler approach — add a confirmation to the Cancel button and the back navigation:

```typescript
const handleCancel = () => {
  if (hasUnsavedData) {
    if (window.confirm('You have unsaved project data. Are you sure you want to leave?')) {
      navigate('/');
    }
  } else {
    navigate('/');
  }
};
```

### 5c. Update Cancel button

The Cancel button in the wizard footer should use `handleCancel` (with the confirmation). If it already does, just verify the confirmation dialog is wired in.

**Build and verify**: `npm run build` must pass clean.

---

## Task 6: Clickable Wizard Step Navigation

**File**: `src/pages/ProjectWizard.tsx` and `src/components/wizard/WizardStepper.tsx`

**Current behavior**: `WizardStepper` is imported but not rendered in `ProjectWizard.tsx`. The wizard only has Next/Back buttons. The stepper component already supports `onStepClick` for backward navigation (`idx <= currentStep`).

**Correct behavior**: The step indicator should be visible and clickable. Users should be able to click any previously visited step to jump back, AND click forward to any step up to one beyond the current step (so they can skip ahead after reviewing).

### 6a. Render the WizardStepper in ProjectWizard

Add the `WizardStepper` component to the wizard layout, above the step content:

```tsx
<WizardStepper
  steps={WIZARD_STEPS.map((s) => ({ label: s.label, shortLabel: s.shortLabel }))}
  currentStep={currentStep}
  onStepClick={handleStepClick}
/>
```

Define `WIZARD_STEPS` with labels if not already defined:

```typescript
const WIZARD_STEPS = [
  { label: 'Job Description', shortLabel: 'Job' },
  { label: 'Site Intelligence', shortLabel: 'Site' },
  { label: 'Scope & Tasks', shortLabel: 'Tasks' },
  { label: 'Resources', shortLabel: 'Resources' },
  { label: 'Compliance', shortLabel: 'Permits' },
  { label: 'Budget', shortLabel: 'Budget' },
  { label: 'Review', shortLabel: 'Review' },
];
```

### 6b. Handle step click navigation

```typescript
const handleStepClick = (stepIndex: number) => {
  // Allow clicking backward to any visited step
  // Allow clicking forward up to currentStep (already visited)
  if (stepIndex <= currentStep) {
    setCurrentStep(stepIndex);
  }
  // Note: clicking forward beyond current step is NOT allowed
  // (prevents skipping required steps)
};
```

### 6c. Update WizardStepper to allow clicking visited steps

The `WizardStepper` component already has `isClickable = onStepClick && idx <= currentStep`. This is correct — it allows clicking the current step and any previous step, but not future steps. The completed steps show a green checkmark and are clickable. No changes needed to the component itself.

### 6d. Fire AI trigger on step click navigation

If the user clicks forward from Step 1 (Site) to Step 2 (Tasks), it should trigger AI just like `handleNext` does. Extract the AI trigger logic into a shared function:

```typescript
const triggerAIIfNeeded = (fromStep: number) => {
  if (fromStep === 1 && !recommendations && !aiLoading) {
    // ... existing AI trigger code
  }
};

const handleNext = () => {
  triggerAIIfNeeded(currentStep);
  setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
};

const handleStepClick = (stepIndex: number) => {
  if (stepIndex <= currentStep) {
    // If jumping forward past step 1, trigger AI
    if (stepIndex > 1 && currentStep <= 1) {
      triggerAIIfNeeded(1);
    }
    setCurrentStep(stepIndex);
  }
};
```

**Build and verify**: `npm run build` must pass clean.

---

## Task 7: Final Verification

### Build
```
npm run build
```
Must pass clean with zero errors and zero warnings.

### Regression checklist
- [ ] Task timeline shows tasks within same phase running in parallel (not sequential)
- [ ] Task timeline adjusts durations based on crew count
- [ ] Adding/removing crew picks updates the timeline
- [ ] Labor cost displays correctly with hours × rate breakdown
- [ ] Equipment cost calculates using hours × hourly rate (org default as fallback)
- [ ] Overhead % field auto-updates the client quote
- [ ] Manually editing client quote stops auto-calculation
- [ ] Profit margin displays as read-only percentage
- [ ] Margin color: green (≥20%), amber (10-20%), red (<10%)
- [ ] `targetProfitPct` field is removed from UI
- [ ] Clicking Cancel shows confirmation dialog when wizard has data
- [ ] Browser back/refresh shows "unsaved changes" warning when wizard has data
- [ ] No warning shown if wizard is empty (no name or tasks)
- [ ] Wizard step buttons (circles/labels) are visible above the step content
- [ ] Clicking a completed step navigates back to that step
- [ ] Clicking a future step does nothing (disabled)
- [ ] AI still triggers when navigating past Step 2 (via Next or step click)
- [ ] Full wizard flow completes and creates project successfully
- [ ] Budget data flows correctly to ProjectDashboard Budget tab
- [ ] `npm run build` passes clean

### PR
Branch: `fix-wizard-refinements-2`
Title: "fix: timeline parallelism, budget calc fixes, overhead-driven quoting, wizard nav UX"
Body: Summary of all 7 tasks.

---

## Notes for Code

- **No migrations needed.** All changes are frontend logic.
- **`targetProfitPct` removal**: This field was added in the first refinements sprint. Remove it cleanly — from WizardData, from the UI, and from any useEffects that reference it. It does NOT exist in the database, so no schema impact.
- **Crew count for timeline**: Use `data.crewSelections?.length ?? 1`. If no crew is selected yet, default to 1 so the timeline still renders reasonably.
- **Equipment hourly cost**: The `equipment` table has `hourly_cost` (migration 014). When AI recommends equipment and the contractor accepts, the `hourlyCost` value should come from the equipment profile. Check that the acceptance handler in `ProjectWizard.tsx` copies this field.
- **`useBlocker`**: Check the react-router-dom version in package.json. If < 6.4, use the `window.confirm` fallback approach instead.
