# AI Wizard Refinements — Execution Prompt

> **Sprint**: AI Wizard Refinements
> **Branch**: `fix-wizard-refinements`
> **Pre-requisite**: `feature-ai-wizard` merged. No new migrations.
> **Read first**: `ARCHITECTURE.md` §5, `CODE_GUIDE.md`, `CLAUDE.md`

---

## Overview

Post-merge refinements to the AI-powered wizard based on user testing feedback. These are all frontend changes — no schema modifications needed.

---

## Task 1: Move Timeline to Step 1 (Job Description)

**Why**: AI needs start/target dates to recommend scope, crew availability, equipment scheduling, and hour estimates. Currently dates are buried in Step 5 (Budget), which runs AFTER AI recommendations.

### 1a. Move fields from WizardStep5 to WizardStep1

In `src/components/wizard/WizardStep1.tsx`:
- Add `startDate` and `targetDate` date inputs below the existing project fields (after scope size, before client info section)
- Label them "Start Date" and "Target Completion"
- Same input styling as other Step 1 fields

In `src/components/wizard/WizardStep5.tsx`:
- **Remove** the Timeline section entirely (the `<h3>Timeline</h3>` block with startDate, targetDate, and estimatedHours inputs)
- Keep `estimatedHours` as a field in the Budget section (it's calculated from tasks, not manually entered for timeline purposes)
- The Budget step header can just be "Budget & Cost Breakdown" now (no "Timeline &" prefix)

### 1b. Update AI trigger context

In `ProjectWizard.tsx`, the AI recommendation call already passes `startDate` and `targetDate` from wizard data. Since these are now captured in Step 1 (before Step 2), the AI call after Step 2 will automatically have them. No change needed to the trigger itself.

### 1c. Update review step

In `WizardStep7.tsx`:
- Move the timeline display (start → target dates) from the "Timeline & Budget" section to the "Job Description" section
- Update the section label from "Timeline & Budget" to "Budget"

**Build and verify**: `npm run build` must pass clean.

---

## Task 2: Client Phone Auto-Format

**Why**: Phone numbers should display consistently as `xxx-xxx-xxxx`.

### 2a. Create a phone formatting utility

Add to `src/utils/validation.ts` (or create if needed):

```typescript
/**
 * Formats a phone string as xxx-xxx-xxxx.
 * Strips all non-digit characters, then inserts dashes.
 * Returns the raw input if it doesn't have exactly 10 digits.
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Allow partial formatting while typing
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}`;
  }
  return digits;
}
```

### 2b. Apply to all phone inputs

Update phone inputs in these files to use `formatPhoneNumber` on change:

**WizardStep1.tsx** — `clientPhone` field:
```typescript
onChange={(e) => onChange({ clientPhone: formatPhoneNumber(e.target.value) || null })}
```

**OverviewTab.tsx** — `clientPhone` field in the edit modal:
```typescript
onChange={(e) => setField('clientPhone', formatPhoneNumber(e.target.value))}
```

Also apply to any `crew_members.phone` inputs if they exist in the crew add/edit modals on `CrewEquipmentHub.tsx`.

Set `maxLength={12}` on all phone inputs (10 digits + 2 dashes).
Set `placeholder="xxx-xxx-xxxx"` on all phone inputs.

**Build and verify**: `npm run build` must pass clean.

---

## Task 3: Auto-Populate Permit Zone from Address

**Why**: Permit zone (jurisdiction) can be inferred from the address, just like climate zone and soil type already are.

### 3a. Extend `inferSiteConditions` response

In `src/services/anthropic.ts`, update the `AISiteInference` interface:

```typescript
export interface AISiteInference {
  climateZone: string | null;
  soilType: string | null;
  permitRequirements: string[];
  hoaLikelihood: 'low' | 'medium' | 'high';
  permitZone: string | null;  // ADD THIS — city/county jurisdiction name
}
```

Update the prompt in `inferSiteConditions()` to include:
- `"permitZone": string or null` in the JSON schema
- Add instruction: `"permitZone: The city or county jurisdiction name for permitting purposes (e.g., 'City of Austin', 'Harris County', 'Unincorporated Maricopa County'). Infer from the address."`

### 3b. Wire into WizardStep2

In `WizardStep2.tsx`, where `inferSiteConditions` results are applied to the form, add:

```typescript
if (result.permitZone && !data.permitZone) {
  onChange({ permitZone: result.permitZone });
}
```

This follows the same pattern as the existing climate zone and soil type auto-fill — only populates if the field is empty (doesn't override user input).

### 3c. Remove duplicate permitZone input

`permitZone` currently appears on both Step 2 AND Step 6 (Permits). Keep it on Step 2 (where address context is) and remove the duplicate from Step 6. Step 6 should display the value read-only if populated, with an edit link that scrolls/navigates back to Step 2.

**Build and verify**: `npm run build` must pass clean.

---

## Task 4: Task Timeline View

**Why**: Contractors think in days/weeks, not just a flat task list. Tasks should present as a timeline showing which days each task is scheduled for, based on the project start/target dates.

### 4a. Add timeline visualization to WizardStep3

Below the existing task list in `WizardStep3.tsx`, add a visual timeline section that:

1. **Only renders** if `data.startDate` and `data.targetDate` are set (since we moved dates to Step 1, they should be available)
2. Shows a horizontal day-by-day grid spanning the project date range (weekdays only)
3. Each task is a horizontal bar spanning its estimated duration (calculated from `estimatedHours` ÷ 8 hours/day, minimum 1 day)
4. Tasks are ordered by phase sequence: demo_prep → rough_grade → hardscape → softscape → irrigation → lighting → cleanup_punchlist
5. Tasks are auto-scheduled sequentially (task 2 starts when task 1 ends), respecting phase order
6. Color-code bars by phase (use existing phase colors from the task list if defined, or assign from the CSS variable palette)

### 4b. Implementation approach

Create a helper function `scheduleTasksOnTimeline()` in the same file (or in `src/lib/` if it exceeds 30 lines):

```typescript
interface ScheduledTask {
  name: string;
  phase: string;
  startDay: number;  // 0-indexed weekday offset from project start
  durationDays: number;
  estimatedHours: number;
}

function scheduleTasksOnTimeline(
  tasks: WizardTask[],
  startDate: string,
  targetDate: string
): ScheduledTask[]
```

Logic:
- Calculate total weekdays in the project range
- For each task, `durationDays = Math.max(1, Math.ceil(estimatedHours / 8))`
- Stack tasks sequentially by phase order
- If total task days exceed available weekdays, compress proportionally to fit

### 4c. Timeline UI component

Use a simple CSS grid or flexbox layout:
- Top row: day labels (Mon 4/6, Tue 4/7, etc.) — show week headers if > 10 days
- Each task row: a colored bar positioned at the correct start day, spanning duration days
- Task name label inside or beside the bar
- Scrollable horizontally if the project spans > 2 weeks
- Uses CSS custom properties for theming (dark/light compatible)

### 4d. AI recommendation integration

If AI recommendations include tasks, the timeline should reflect those tasks (after acceptance). The timeline should reactively update as the contractor accepts/dismisses/adds tasks.

**Build and verify**: `npm run build` must pass clean.

---

## Task 5: Remove Manual Crew Fields from Step 4

**Why**: AI now recommends crew with availability checking. The manual `crewSize` and `crewNotes` fields are redundant and confusing alongside the AI suggestion panel.

### 5a. Remove from WizardStep4

In `WizardStep4.tsx`:
- **Remove** the "Estimated Crew Size" number input and "Crew Notes" textarea
- The crew section should now consist entirely of: the AI `SuggestionPanel` for crew recommendations + the accepted crew list
- Keep `equipmentNotes` — this is useful context that AI doesn't replace

### 5b. Auto-calculate crewSize from accepted crew

Instead of a manual field, compute `crewSize` from the accepted crew picks:

In `ProjectWizard.tsx`, when building the project data for submit:
```typescript
crewSize: data.crewSelections?.length ?? 0,
crewNotes: null, // No longer manually entered
```

### 5c. Update WizardStep7 review

In `WizardStep7.tsx`:
- Replace the static "Crew Size: X" display with a list of accepted crew members (names + roles)
- Remove crewNotes from the review display
- Update the "filled" check for the Resources section: use `data.crewSelections?.length > 0` instead of `(data.crewSize ?? 0) > 0`

**Build and verify**: `npm run build` must pass clean.

---

## Task 6: Budget Calculation Fixes

**Why**: The default equipment rate from org settings isn't being used in equipment cost calculations, and the client quote should auto-calculate from a target profit margin instead of being purely manual.

### 6a. Use org default equipment rate in budget calculations

In `WizardStep5.tsx`:
- Read `org?.defaultEquipmentRate` from the org store (already imported)
- For equipment cost calculation: if individual equipment items don't have a `dailyRate` set, fall back to `defaultEquipmentRate`
- Update the `calcEquipment` useMemo:

```typescript
const orgEquipmentRate = org?.defaultEquipmentRate ?? 0;

const calcEquipment = useMemo(
  () => data.equipmentSelections.reduce((sum, e) => {
    const rate = e.dailyRate > 0 ? e.dailyRate : orgEquipmentRate;
    return sum + rate * e.durationDays;
  }, 0),
  [data.equipmentSelections, orgEquipmentRate]
);
```

### 6b. Auto-calculate client quote from target profit %

Add a "Target Profit %" input field near the client quote field. When the contractor enters a target margin, auto-calculate the quote:

```
quote = totalCost / (1 - targetMarginPct / 100)
```

For example: if total cost is $10,000 and target margin is 25%, quote = $10,000 / 0.75 = $13,333.

Implementation:
1. Add a `targetProfitPct` field to `WizardData` (default: null)
2. Add a number input labeled "Target Profit %" next to the Client Quote field
3. When `targetProfitPct` changes AND `clientQuote` hasn't been manually edited:
   - Auto-calculate: `clientQuote = totalCost / (1 - targetProfitPct / 100)`
   - Round to nearest dollar
4. When `clientQuote` is manually edited, stop auto-calculating (use a `useRef` flag like `quoteManuallyEdited`)
5. Display both the calculated margin % (existing) AND the target profit % so the contractor can see if they match
6. If AI provided a `clientQuoteRange`, show it as context: "AI suggests $X–$Y"

### 6c. Update the financials summary

The existing financials `useMemo` already computes `profit` and `marginPct`. Add the target vs actual comparison:

```typescript
const onTarget = data.targetProfitPct != null
  ? Math.abs(financials.marginPct - data.targetProfitPct) < 2
  : true;
```

Display a visual indicator:
- Green if actual margin is within 2% of target
- Amber if actual margin is 2–5% below target
- Red if actual margin is >5% below target

**Build and verify**: `npm run build` must pass clean.

---

## Task 7: Final Verification

### Build
```
npm run build
```
Must pass clean with zero errors and zero warnings.

### Regression checklist
- [ ] Wizard Step 1 now shows Start Date and Target Completion fields
- [ ] Client phone auto-formats as xxx-xxx-xxxx while typing
- [ ] Wizard Step 2 auto-populates Permit Zone from address (alongside climate zone)
- [ ] Wizard Step 3 shows task timeline visualization when dates are set
- [ ] Tasks auto-schedule sequentially on the timeline by phase
- [ ] Timeline updates reactively when tasks are added/removed/accepted
- [ ] Wizard Step 4 no longer shows manual Crew Size or Crew Notes fields
- [ ] Accepted AI crew picks display instead of manual count
- [ ] Wizard Step 5 (Budget) no longer has Timeline section (dates moved to Step 1)
- [ ] Equipment budget uses org default rate as fallback for items without daily rate
- [ ] Target Profit % input auto-calculates client quote
- [ ] Manual quote edit overrides auto-calculation
- [ ] Margin indicator shows on-target/below-target status
- [ ] Wizard Step 7 review reflects all changes (dates in Job Description, crew list instead of count)
- [ ] Full wizard flow completes and creates project successfully
- [ ] ProjectDashboard loads all 6 tabs correctly for newly created project
- [ ] AI fallback still works (no API key = manual entry, no suggestion panels)
- [ ] Theme toggle still works
- [ ] `npm run build` passes clean

### PR
Branch: `fix-wizard-refinements`
Title: "fix: wizard UX refinements — timeline, crew AI, budget calc, phone format"
Body: Summary of all 7 tasks.

---

## Notes for Code

- **No migrations needed.** `targetProfitPct` is a wizard-only field that doesn't persist to the database — it's used for real-time quote calculation only. The `clientQuote` (which does persist) stores the final calculated or manually entered value.
- **Step order matters.** Double-check the actual step index mapping in `ProjectWizard.tsx` — steps render in a different order than their component numbers.
- **Phone formatting is live.** Format on every keystroke, not just on blur. The `formatPhoneNumber` function handles partial input gracefully.
- **Timeline is read-only.** It's a visualization, not a drag-and-drop scheduler. Contractors adjust tasks in the list; the timeline reflects those changes reactively.
