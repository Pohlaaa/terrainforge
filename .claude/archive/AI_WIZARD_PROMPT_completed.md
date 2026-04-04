# AI-Powered Wizard — Execution Prompt

> **Sprint**: AI Wizard Optimization
> **Branch**: `feature-ai-wizard`
> **Pre-requisite**: PR #114 (fix-field-alignment) merged. Migration 014 applied.
> **Read first**: `ARCHITECTURE.md` §5 (Wizard Architecture), `CODE_GUIDE.md`, `CLAUDE.md`

---

## Overview

Transform the project creation wizard from manual-entry to AI-first. After the contractor enters project basics and site info (Steps 1–2), AI recommends everything else using the org's actual crew, equipment, materials, and rates. The contractor reviews AI suggestions in a "suggest-then-accept" panel on each step, then edits as needed. On submit, the wizard writes to ALL downstream systems — not just the project record.

**Key principle**: The AI service is a pure suggestion layer. It never writes to stores. The wizard owns accept/reject logic and all store writes.

---

## Task 1: AI Recommendation Service

**Create** `src/services/aiRecommendations.ts`

This module generates a comprehensive recommendation set for a project. It calls Claude via the existing `callClaude()` function in `anthropic.ts`.

### 1a. Define the recommendation types

Add to `src/types/index.ts`:

```typescript
// ── AI Recommendation Types ──────────────────────────────────────────────────

export interface AIRecommendationSet {
  tasks: AITaskRecommendation[];
  crew: AICrewRecommendation[];
  equipment: AIEquipmentRecommendation[];
  materials: AIMaterialRecommendation[];
  budget: AIBudgetRecommendation;
  permits: AIPermitRecommendation[];
  generatedAt: string; // ISO timestamp
}

export interface AITaskRecommendation {
  name: string;
  phase: string; // must match TaskPhase values
  estimatedHours: number;
  description: string;
  suggestedCrewRole?: string; // e.g., "foreman", "specialist"
}

export interface AICrewRecommendation {
  crewMemberId: string;     // references actual crew member in org
  crewMemberName: string;   // for display
  role: string;             // their role
  reason: string;           // why AI picked them (e.g., "Has hardscape cert, available all week")
  availabilityNote: string; // e.g., "Available", "Busy Mon-Wed on Riverside project"
  isAvailable: boolean;     // true if fully available for project date range
  skills: string[];         // matching skills
}

export interface AIEquipmentRecommendation {
  equipmentId: string;      // references actual equipment in org
  equipmentName: string;    // for display
  type: string;
  reason: string;           // why AI picked it
  availabilityNote: string; // e.g., "Available", "In maintenance until Friday"
  isAvailable: boolean;
  estimatedDays: number;    // how many days needed
  dailyRate: number;
}

export interface AIMaterialRecommendation {
  materialId: string | null;  // null if not in org library
  materialName: string;
  category: string;
  estimatedQuantity: number;
  unit: string;
  unitCost: number;
  reason: string;           // e.g., "Standard base for paver installation"
  inLibrary: boolean;       // whether this material exists in the org's library
}

export interface AIBudgetRecommendation {
  laborBudget: number;
  materialsBudget: number;
  equipmentBudget: number;
  disposalCost: number;
  subcontractorBudget: number;
  overheadPct: number;
  estimatedHours: number;
  clientQuoteRange: { low: number; high: number }; // suggested quote range
  reasoning: string;        // brief explanation of how estimates were derived
}

export interface AIPermitRecommendation {
  permitType: string;       // e.g., "grading", "building", "tree_removal"
  reason: string;           // why this permit is likely needed
  estimatedFee: number | null;
  urgency: 'required' | 'recommended' | 'optional';
}
```

### 1b. Build the recommendation engine

Create `src/services/aiRecommendations.ts` with one main function:

```typescript
export async function generateProjectRecommendations(context: {
  // From wizard steps 1-2
  description: string;
  projectType: string | null;
  propertyType: string | null;
  scopeSize: string | null;
  address: string;
  siteConditions: {
    slopeGrade?: string;
    soilType?: string;
    sunExposure?: string;
    drainagePattern?: string;
    climateZone?: string;
    hoaFlag?: boolean;
  };
  startDate?: string;
  targetDate?: string;
  // From org stores
  orgCrew: CrewMember[];
  orgEquipment: Equipment[];
  orgMaterials: Material[];
  defaultLaborRate: number;
  defaultEquipmentRate: number;
  // From schedule store — existing assignments for conflict detection
  existingAssignments: ProjectCrewAssignment[];
  existingScheduleEntries: ScheduleEntry[];
  existingProjects: ProjectListItem[]; // for date range context on conflicts
}): Promise<AIRecommendationSet | null>
```

**Implementation approach:**

1. Build a detailed system prompt that includes the org's actual crew roster (names, roles, skills), equipment list (names, types, status), and material library (names, categories, unit costs). Include schedule data for availability checking.

2. Call `callClaude()` with a structured prompt requesting JSON output matching `AIRecommendationSet`.

3. **Increase `max_tokens` to 4096** for this call — the response will be much larger than single-function calls. Pass this as a parameter or create a new `callClaudeExtended()` variant in `anthropic.ts` that accepts `maxTokens`.

4. Parse the response and **validate/enrich** it:
   - For crew recommendations: verify each `crewMemberId` exists in `orgCrew`. Drop any hallucinated IDs.
   - For equipment: verify each `equipmentId` exists in `orgEquipment`. Drop invalid.
   - For materials: match by name/category against `orgMaterials`. Set `materialId` and `inLibrary: true` if found, `null` and `false` if not.
   - For budget: multiply task hours × `defaultLaborRate`, equipment days × `dailyRate`, materials × `unitCost`. If AI's numbers don't match the math, use the computed values and keep AI's reasoning.

5. **Availability logic** (runs post-AI, in TypeScript — not in the AI prompt):
   - For each recommended crew member, check `existingAssignments` and `existingScheduleEntries` against the project's `startDate`/`targetDate` range.
   - If any entries overlap the date range, set `isAvailable: false` and populate `availabilityNote` with which project they're on and when.
   - For equipment, check `status` field. If `in-use` or `maintenance`, set `isAvailable: false`.

6. **Graceful degradation**: If the API key is missing, if the API call fails, or if the response isn't valid JSON, return `null`. The wizard should handle `null` by falling back to the current manual-entry behavior (no suggestions panel shown).

### 1c. Update `anthropic.ts`

Add a `maxTokens` parameter to `callClaude()`:

```typescript
export async function callClaude(
  prompt: string,
  model: string = DEFAULT_MODEL,
  maxTokens: number = 1024
): Promise<string>
```

Update the `body` in the fetch call to use the parameter. Existing callers pass no third argument, so they get the default 1024.

### 1d. Prompt engineering notes

The prompt to Claude should:
- Include a system-level instruction: "You are an experienced landscaping project estimator and crew scheduler."
- Provide the org's crew/equipment/materials as structured data in the prompt (not as separate messages).
- Request JSON output matching the `AIRecommendationSet` schema exactly.
- Instruct Claude to only recommend crew/equipment that exist in the provided roster (by ID). Never invent new ones.
- For materials, prefer items from the org's library but can suggest unlisted materials with `materialId: null`.
- Budget math should use the provided `defaultLaborRate` and actual equipment `dailyRate` values.
- Include the project's start/target dates so Claude can estimate duration and phase scheduling.

**Build and verify**: `npm run build` must pass clean.

---

## Task 2: SuggestionPanel Shared Component

**Create** `src/components/shared/SuggestionPanel.tsx`

A reusable component that displays AI recommendations as cards the contractor can accept or dismiss.

### Design spec

```
┌─ AI Suggestions ─────────────────────────────────────────┐
│ ✨ Based on your project description, here's what I      │
│ recommend:                                                │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [icon] Maria Lopez — Foreman              [Accept]  │  │
│ │ Has hardscape cert, available all week     [Dismiss] │  │
│ └─────────────────────────────────────────────────────┘  │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [icon] John Smith — Installer              [Accept] │  │
│ │ ⚠ Busy Mon-Wed on Riverside project       [Dismiss] │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                           │
│ [Accept All]                              [Dismiss All]  │
└──────────────────────────────────────────────────────────┘
```

### Props interface

```typescript
interface SuggestionItem {
  id: string;               // unique key for this suggestion
  title: string;            // primary display text
  subtitle?: string;        // secondary line (e.g., role, category)
  reason: string;           // why AI recommended this
  warning?: string;         // availability warning (amber text)
  metadata?: Record<string, string | number>; // extra display data
}

interface SuggestionPanelProps {
  title: string;            // e.g., "Crew Recommendations"
  items: SuggestionItem[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcceptAll: () => void;
  onDismissAll: () => void;
  acceptedIds: Set<string>;  // which items have been accepted
  dismissedIds: Set<string>; // which items have been dismissed
  isLoading?: boolean;       // show skeleton while AI is working
  emptyMessage?: string;     // shown when no suggestions
}
```

### Behavior
- Items start in "pending" state (neither accepted nor dismissed)
- Accepted items get a green check and muted styling
- Dismissed items collapse to a single line with "Undo" option
- "Accept All" / "Dismiss All" bulk actions
- Loading state shows 3 skeleton cards with pulse animation
- If `items` is empty and not loading, show `emptyMessage`
- Uses CSS custom properties for theming (works in dark + light mode)
- Responsive: stacks vertically on mobile, card layout on desktop

**Build and verify**: `npm run build` must pass clean.

---

## Task 3: Wire AI into Wizard Steps 3–6

Modify the wizard to trigger AI after Step 2 and display suggestions on Steps 3–6.

### 3a. ProjectWizard.tsx — AI trigger and state

Add state to `ProjectWizard.tsx`:

```typescript
const [recommendations, setRecommendations] = useState<AIRecommendationSet | null>(null);
const [aiLoading, setAiLoading] = useState(false);
const [acceptedItems, setAcceptedItems] = useState<Record<string, Set<string>>>({
  tasks: new Set(),
  crew: new Set(),
  equipment: new Set(),
  materials: new Set(),
  permits: new Set(),
});
const [dismissedItems, setDismissedItems] = useState<Record<string, Set<string>>>({
  tasks: new Set(),
  crew: new Set(),
  equipment: new Set(),
  materials: new Set(),
  permits: new Set(),
});
```

**Trigger AI when leaving Step 2** (the site conditions step):

When `currentStep` changes from step index 2 to step index 3 (or whichever index maps to the tasks step — check the actual step order in the component):

```typescript
// In the step navigation handler, after advancing past step 2:
if (leavingStep === SITE_STEP_INDEX && !recommendations && !aiLoading) {
  setAiLoading(true);
  generateProjectRecommendations({
    description: data.description || '',
    projectType: data.projectType,
    propertyType: data.propertyType,
    scopeSize: data.scopeSize,
    address: data.address || '',
    siteConditions: {
      slopeGrade: data.slopeGrade,
      soilType: data.soilType,
      sunExposure: data.sunExposure,
      drainagePattern: data.drainagePattern,
      climateZone: data.climateZone,
      hoaFlag: data.hoaFlag,
    },
    startDate: data.startDate,
    targetDate: data.targetDate,
    orgCrew: crewStore.crew,
    orgEquipment: equipmentStore.equipment,
    orgMaterials: materialStore.materials,
    defaultLaborRate: org?.defaultLaborRate ?? 35,
    defaultEquipmentRate: org?.defaultEquipmentRate ?? 0,
    existingAssignments: scheduleStore.assignments,
    existingScheduleEntries: scheduleStore.entries,
    existingProjects: projectStore.projects,
  }).then(result => {
    setRecommendations(result);
    setAiLoading(false);
  }).catch(() => setAiLoading(false));
}
```

**Important**: The wizard must also fetch crew, equipment, materials, and schedule data on mount so it's available for the AI call. Add these fetches to the wizard's useEffect:

```typescript
useEffect(() => {
  const orgId = org?.id;
  if (!orgId) return;
  // Fetch org data needed for AI recommendations
  crewStore.fetchCrew();
  equipmentStore.fetchEquipment();
  materialStore.fetchMaterials();
  scheduleStore.fetchAssignments(orgId);
  // Fetch schedule entries for next 90 days (project planning window)
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
  scheduleStore.fetchEntries(orgId, today, future);
}, [org?.id]);
```

### 3b. WizardStep3.tsx (Tasks) — Add suggestion panel

Pass `recommendations?.tasks` and the accept/dismiss handlers as props. When a task recommendation is accepted:
1. Add it to the `data.tasks` array (same shape as manually-added tasks)
2. Mark it as accepted in `acceptedItems.tasks`

**Replace the current auto-generate behavior**: The existing `generateTasksFromDescription()` call on mount should be removed. AI recommendations from Step 2 now handle task suggestions. If `recommendations` is null (API failure), fall back to the existing manual entry + quick-add presets.

The suggestion panel renders alongside the existing task list. Accepted tasks appear in the task list immediately.

### 3c. WizardStep4.tsx (Resources) — Add crew + equipment panels

This step gets TWO suggestion panels:

**Crew panel**: Map `recommendations?.crew` to `SuggestionItem[]`:
- `title`: crew member name
- `subtitle`: role
- `reason`: AI's reason
- `warning`: `availabilityNote` if `isAvailable === false`

When a crew pick is accepted, add to `data.crewSelections` (you'll need to add this field to `WizardData`):

```typescript
// Add to WizardData interface:
crewSelections?: Array<{
  crewMemberId: string;
  name: string;
  role: string;
  roleOnProject?: string;
}>;
```

**Equipment panel**: Map `recommendations?.equipment` to `SuggestionItem[]`:
- `title`: equipment name
- `subtitle`: type
- `reason`: AI's reason + estimated days + daily rate
- `warning`: `availabilityNote` if `isAvailable === false`

When accepted, add to `data.equipmentSelections` (already exists in WizardData).

### 3d. WizardStep5.tsx (Budget) — Auto-populate from AI

When `recommendations?.budget` is available and the user hasn't manually edited budget fields yet:
- Pre-fill `laborBudget`, `materialsBudget`, `equipmentBudget`, `disposalCost`, `subcontractorBudget`, `overheadPct`, `estimatedHours` from the AI budget recommendation.
- Show the AI's `reasoning` in an info banner above the budget fields.
- Show the `clientQuoteRange` as a guide: "AI suggests quoting $X–$Y".
- All fields remain fully editable. Use the same `useRef` override-tracking pattern from the org rate pre-population (already implemented in field alignment sprint).

### 3e. WizardStep6.tsx (Permits/Compliance) — Add permit suggestion panel

Map `recommendations?.permits` to `SuggestionItem[]`:
- `title`: permit type (human-readable)
- `subtitle`: urgency level badge
- `reason`: why it's recommended
- `metadata`: estimated fee if available

When accepted, add the permit to `data.permitChecklist` and set `data.permitFees[permitType]` to the estimated fee.

### 3f. Materials handling

Materials don't have their own wizard step currently — they're part of the zone setup. For now:
- Store `recommendations?.materials` in wizard state
- Display them as an info section on the Budget step: "AI suggests these materials: [list with quantities and costs]"
- The material costs feed into the `materialsBudget` field
- Future sprint can add a dedicated materials step to the wizard

**Build and verify**: `npm run build` must pass clean.

---

## Task 4: Expanded Wizard Submit — Write to All Downstream Systems

Update `handleCreate()` in `ProjectWizard.tsx` to write accepted crew/equipment to their respective stores.

### 4a. Crew assignments

After creating the project, for each accepted crew pick in `data.crewSelections`:

```typescript
for (const crew of data.crewSelections ?? []) {
  await scheduleStore.createAssignment({
    orgId,
    projectId: project.id,
    crewMemberId: crew.crewMemberId,
    roleOnProject: crew.roleOnProject || crew.role,
  });

  // If project has start/target dates, create schedule entries
  if (data.startDate && data.targetDate) {
    // Create entries for each weekday in the project date range
    const dates = getWeekdaysBetween(data.startDate, data.targetDate);
    for (const date of dates) {
      await scheduleStore.createEntry({
        orgId,
        projectId: project.id,
        crewMemberId: crew.crewMemberId,
        scheduledDate: date,
        status: 'scheduled',
        notes: '',
      });
    }
  }
}
```

**Add helper** `getWeekdaysBetween(start: string, end: string): string[]` to `src/utils/dates.ts`. Returns an array of YYYY-MM-DD strings for each Monday–Friday between start and end (inclusive). Cap at 60 days to prevent runaway loops.

### 4b. Equipment status updates

For each accepted equipment pick:

```typescript
for (const equip of data.equipmentSelections ?? []) {
  if (equip.equipmentId) {
    await equipmentStore.updateEquipment(equip.equipmentId, {
      status: 'in-use',
      assignedProject: project.id,
    });
  }
}
```

### 4c. Budget field population

Ensure ALL budget fields from the wizard are included in the project creation payload. Verify these fields are mapped in the `handleCreate` project builder:
- `laborBudget`, `materialsBudget`, `equipmentBudget`, `subcontractorBudget`
- `disposalCost`, `equipmentCost`
- `overheadPct`, `clientQuote`, `profitMargin`, `estimatedHours`

These should already be mapped from the field alignment sprint, but verify.

### 4d. Error handling

Wrap the downstream writes (crew assignments, schedule entries, equipment updates) in try/catch blocks. If any fail:
- Log the error but don't block project creation
- The project itself should still be created successfully
- Show a toast: "Project created. Some crew/equipment assignments couldn't be saved — you can add them on the project dashboard."

### 4e. Loading state

The submit operation now does more work. Update the UI:
- Show a progress indicator during creation: "Creating project...", "Assigning crew...", "Scheduling...", "Done!"
- Use the existing `isCreating` state but extend it with a status message string

**Build and verify**: `npm run build` must pass clean.

---

## Task 5: Integration Cleanup

### 5a. Remove legacy AI function

The `generateProjectFromDescription()` function in `anthropic.ts` is unused (it was a legacy approach). Remove it and its associated `AIProjectSuggestion` interface.

The `generateTasksFromDescription()` function is still used as a fallback when AI recommendations fail. Keep it but it should no longer auto-fire on WizardStep3 mount. Only call it if `recommendations` is null and the user explicitly clicks a "Generate Tasks" button.

The `inferSiteConditions()` function remains unchanged — it fires independently on Step 2 address entry.

### 5b. Store imports in wizard

The wizard now needs access to more stores. Verify these are imported:

```typescript
const crewStore = useCrewStore();
const equipmentStore = useEquipmentStore();
const materialStore = useMaterialStore();
const scheduleStore = useScheduleStore();
const projectStore = useProjectStore();
const { org } = useOrgStore();
```

### 5c. Type exports

Ensure all new types (`AIRecommendationSet`, etc.) are exported from `src/types/index.ts` and all new functions are exported from their respective modules.

### 5d. WizardData interface update

Update the `WizardData` interface in `ProjectWizard.tsx` (or wherever it's defined) to include:
- `crewSelections?: Array<{ crewMemberId: string; name: string; role: string; roleOnProject?: string; }>`
- Verify `equipmentSelections` already handles the AI-recommended shape

**Build and verify**: `npm run build` must pass clean.

---

## Task 6: Final Verification

### Build
```
npm run build
```
Must pass clean with zero errors and zero warnings.

### Regression checklist
- [ ] Wizard Step 1 (project basics) — unchanged, works as before
- [ ] Wizard Step 2 (site/address) — unchanged, site inference still works
- [ ] After Step 2: AI loading indicator appears (if API key is set)
- [ ] Wizard Step 3 (tasks) — suggestion panel shows AI task recommendations
- [ ] Accepting a task adds it to the task list
- [ ] Dismissing a task removes it from suggestions
- [ ] Manual task entry still works alongside suggestions
- [ ] Wizard Step 4 (resources) — crew and equipment suggestion panels appear
- [ ] Crew suggestions show availability warnings for busy crew
- [ ] Equipment suggestions show status warnings for unavailable equipment
- [ ] Wizard Step 5 (budget) — AI budget pre-fills fields, shows reasoning
- [ ] Client quote range guide displays
- [ ] All budget fields remain editable
- [ ] Wizard Step 6 (permits) — permit suggestions appear with urgency levels
- [ ] Wizard Step 7 (review) — shows all accepted items
- [ ] Submit creates project + tasks + subcontractors (existing behavior)
- [ ] Submit creates crew assignments (new)
- [ ] Submit creates schedule entries for assigned crew (new)
- [ ] Submit updates equipment status to 'in-use' (new)
- [ ] Created project appears on Projects hub tab
- [ ] Created project's crew shows on Crew & Equipment hub tab
- [ ] Created project's budget shows on Budget & Finance hub tab
- [ ] ProjectDashboard loads all 6 tabs correctly for the new project
- [ ] **Fallback**: If AI fails (no API key, timeout, bad response), wizard falls back to manual entry — no errors
- [ ] Theme toggle still works
- [ ] Sign out works

### PR
Branch: `feature-ai-wizard`
Title: "feat: AI-powered wizard with suggest-then-accept UX and full downstream writes"
Body: Summary of all 6 tasks.

---

## Notes for Code

- **Model**: Use `claude-haiku-4-5-20251001` for AI calls (fast, cheap). The recommendation call will be ~$0.005 due to larger context.
- **Max tokens**: Set to 4096 for the recommendation call. The org context (crew, equipment, materials) could be substantial.
- **No new migrations**: This sprint is pure frontend + AI service. No schema changes needed.
- **Fallback is critical**: Every AI feature must degrade gracefully. If `VITE_ANTHROPIC_API_KEY` is not set, the wizard should work exactly as it does today.
- **Step order**: The wizard renders steps in a different order than defined. Double-check the actual step index mapping in `ProjectWizard.tsx` before wiring the AI trigger.
