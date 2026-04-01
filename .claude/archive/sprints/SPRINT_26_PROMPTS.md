# Sprint 26 — First-Run Experience

> **Goal**: After onboarding, guide new users through creating their first project, adding crew, and viewing the schedule — so the app feels purposeful instead of empty. Add a "Load Sample Company" button so users can explore with realistic data before committing their own.
>
> **Branch**: `sprint-26-first-run-experience`
> **Design reference**: None (follows existing design system tokens)
> **SQL migrations**: None (no schema changes — all client-side)
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-26-first-run-experience --title "Sprint 26: First-Run Experience" --body "M2 first-run guided flow, setup checklist, enhanced empty states, sample data loader, tooltip component"`

---

## CRITICAL CONTEXT

> - Empty states already exist on all major pages via `src/components/shared/EmptyState.tsx` — this sprint enhances them, not replaces them.
> - Onboarding wizard (4 steps) already exists at `src/pages/Onboarding.tsx` — this sprint adds a post-onboarding guided flow on the Dashboard.
> - Seed data exists in Zustand stores (projectStore, crewStore, equipmentStore, materialStore) with `isDemo: true` flags — but it's localStorage-only. The sample data loader in this sprint inserts into Supabase so it works with RLS.
> - `src/services/preferences.ts` manages `user_preferences` table — `onboarding_completed_at` is the completion flag.
> - All Supabase writes go through `src/services/supabaseData.ts` with `org_id` required.
> - The `src/components/ui/Button.tsx` component has variants: `primary`, `secondary`, `ghost`, `danger`.
> - Settings page (`src/pages/Settings.tsx`) already has 6 tabs and a "Clear Demo Data" section.
> - No tooltip component exists — must be created from scratch.

---

## S26-1: Create Tooltip Component

**Problem/Goal**: No tooltip or contextual help component exists. We need a lightweight, reusable tooltip for help icons and contextual hints throughout M2.

**Files to modify**:
- `src/components/shared/Tooltip.tsx` — **NEW FILE**

**Implementation details**:

Create a `Tooltip` component with these features:
- **Trigger**: Wraps any child element. Shows tooltip on hover (desktop) and tap (mobile).
- **Position**: `top | bottom | left | right` prop (default `top`).
- **Content**: Accepts `string` or `ReactNode` via `content` prop.
- **Arrow**: Small 6px CSS triangle pointing toward the trigger.
- **Delay**: 200ms hover delay before showing (prevents flicker on mouse pass-through). No delay on mobile tap.
- **Dismiss**: Hides on mouse leave (desktop) or tap-outside (mobile).
- **Style**: `var(--surface3)` background, `var(--text)` text, `var(--border)` border (1px), `border-radius: var(--radius-md, 8px)`, `font-size: 13px`, `padding: 8px 12px`, `max-width: 240px`, `z-index: 50`.
- **Animation**: `opacity 0→1` + `translateY(4px→0)` for top position, `150ms ease-out`. Respect `prefers-reduced-motion`.
- **Accessibility**: `role="tooltip"`, `aria-describedby` on trigger, `id` on tooltip content.

Also export a `HelpIcon` component:
- Small `?` in a 20px circle (1px border `var(--text-3)`, text color `var(--text-3)`, font-size 12px, font-weight 600).
- Inline-flex, vertically centered. Cursor help.
- Usage: `<HelpIcon tooltip="Explanation text" />` — internally renders `<Tooltip content={tooltip}><span className="help-circle">?</span></Tooltip>`.

**Supabase considerations**: None — frontend-only component.

**Acceptance criteria**:
- [ ] `<Tooltip content="Hello">Hover me</Tooltip>` shows tooltip on hover with correct styling
- [ ] `<HelpIcon tooltip="Some help" />` renders a `?` circle that shows tooltip
- [ ] Tooltip positions correctly for all 4 directions
- [ ] Tooltip auto-dismisses on mouse leave
- [ ] `npm run build` passes

---

## S26-2: Setup Checklist Component

**Problem/Goal**: After onboarding, users land on an empty dashboard with no guidance. We need a setup progress tracker that shows what to do next and celebrates completion.

**Files to modify**:
- `src/components/dashboard/SetupChecklist.tsx` — **NEW FILE**
- `src/pages/Dashboard.tsx` — integrate checklist above widget grid when setup is incomplete
- `src/types/index.ts` — add `SetupStep` interface if needed

**Implementation details**:

### SetupChecklist component

A card-style component that shows setup progress. Renders **only when at least one step is incomplete**.

**Steps** (in order):
1. **"Create your first project"** — complete when `projects.length > 0` (check projectStore, exclude `isDemo`)
2. **"Add a crew member"** — complete when `crewMembers.length > 0` (check crewStore, exclude demo)
3. **"Add equipment"** — complete when `equipment.length > 0` (check equipmentStore, exclude demo)
4. **"View your schedule"** — complete when user has visited `/schedule` (track via localStorage key `tf-visited-schedule`)
5. **"Explore the manifest engine"** — complete when user has visited `/manifest` (track via localStorage key `tf-visited-manifest`)

**Layout**:
- Card with `var(--surface2)` background, `var(--border)` border, `border-radius: var(--radius-lg, 12px)`, padding `24px`.
- Header: "Get Started" (heading-md, `var(--text)`), right-aligned "2 of 5 complete" counter in `var(--text-3)`.
- Below header: horizontal progress bar (4px height, `var(--green-l)` fill, `var(--surface3)` track, rounded-full, width = `completedCount / totalCount * 100%`).
- Steps listed vertically with `12px` gap:
  - Each step: flex row with checkbox icon (left), label (center), arrow or "Go" link (right).
  - **Completed**: Green checkmark circle (`var(--green-l)` fill, white check), label in `var(--text-3)` with `line-through`.
  - **Next incomplete (first one)**: Highlighted — `var(--green)` left border (3px), `var(--surface3)` background, label in `var(--text)` font-weight 600. "Go →" link in `var(--green-l)`.
  - **Future incomplete**: Empty circle border (`var(--text-4)`), label in `var(--text-2)`.
- The "Go →" link navigates to the relevant page using `useNavigate`:
  - Step 1 → `/projects`
  - Step 2 → `/crew-manager`
  - Step 3 → `/equipment`
  - Step 4 → `/schedule`
  - Step 5 → `/manifest`

**When all 5 complete**: Show a celebratory state for 1 session:
- Replace checklist with: "You're all set! Your TerrainForge workspace is ready." in `var(--green-l)` text.
- Confetti-style border: `border: 2px solid var(--green-l)`.
- "Dismiss" ghost button removes the card. Set `localStorage['tf-setup-dismissed']` to prevent re-showing.

### Dashboard integration

In `Dashboard.tsx`, render `<SetupChecklist />` between the greeting header and the KPI strip, **only if**:
- `localStorage['tf-setup-dismissed']` is not set
- At least one step is incomplete OR the celebration state hasn't been dismissed

### Visit tracking

For steps 4 and 5 (page visits), set localStorage flags on mount:
- In `src/pages/Schedule.tsx`: on mount, set `localStorage.setItem('tf-visited-schedule', 'true')`
- In `src/pages/ManifestEngine.tsx`: on mount, set `localStorage.setItem('tf-visited-manifest', 'true')`

Add these as single `useEffect` calls at the top of each page component (after existing effects).

**Supabase considerations**: None — all state derived from stores + localStorage.

**Acceptance criteria**:
- [ ] New user sees "Get Started" checklist on Dashboard after onboarding
- [ ] Progress bar fills as steps complete
- [ ] "Go →" links navigate to correct pages
- [ ] Completed steps show green check + strikethrough
- [ ] Creating a project marks step 1 complete (without page refresh)
- [ ] Visiting `/schedule` marks step 4 complete
- [ ] All 5 complete → celebration message → dismiss hides permanently
- [ ] `npm run build` passes

---

## S26-3: Enhanced Empty States with Setup Context

**Problem/Goal**: Current empty states are generic ("Add your first project to get started"). They should connect to the setup flow and guide users with more specific, actionable copy.

**Files to modify**:
- `src/pages/Projects.tsx` — update empty state copy
- `src/pages/CrewManager.tsx` — update empty state copy
- `src/pages/EquipmentManager.tsx` — update empty state copy
- `src/pages/Schedule.tsx` — update empty state copy
- `src/pages/WorkOrders.tsx` — update empty state copy
- `src/pages/ManifestEngine.tsx` — update empty state if applicable

**Implementation details**:

Update empty state text on each page to be more guided. Keep using the existing `<EmptyState>` component — just change the `title`, `description`, and `actionLabel` props.

**New copy**:

| Page | Title | Description | Action Label |
|------|-------|-------------|--------------|
| Projects | "Create your first project" | "Every job starts here. Add a project with a name, address, and budget — then build zones, assign crew, and track progress." | "New Project" |
| Crew Manager | "Build your crew roster" | "Add your team members so you can assign them to projects and schedule their work week." | "Add Crew Member" |
| Equipment | "Register your equipment" | "Track your trucks, excavators, and tools. Log maintenance, insurance, and which jobs they're assigned to." | "Add Equipment" |
| Schedule | "Your schedule is empty" | "Once you have projects and crew, drag and drop assignments here to plan each work week." | (no action — schedule needs projects + crew first) |
| Work Orders | "No work orders yet" | "Work orders are generated from project zones. Create a project with zones first, then come back to see installation steps." | "Go to Projects" |
| Manifest | "Generate your first manifest" | "Select a project to calculate exact material quantities, costs, and order lists for every zone." | (no action if no projects — show "Create a project first" in description) |

For Schedule empty state: if `projects.length === 0 || crewMembers.length === 0`, show additional hint: "Tip: Add projects and crew members first, then come back to build your schedule."

**Supabase considerations**: None — copy changes only.

**Acceptance criteria**:
- [ ] Each page shows updated, action-oriented empty state copy
- [ ] Schedule empty state shows prerequisite hint when no projects/crew exist
- [ ] Manifest empty state adjusts message based on whether projects exist
- [ ] Existing CTA buttons still work (open modals, navigate)
- [ ] `npm run build` passes

---

## S26-4: Sample Data Loader

**Problem/Goal**: New users see empty pages and don't understand what the app looks like with real data. Add a "Load Sample Company" feature that populates Supabase with realistic landscaping data.

**Files to modify**:
- `src/lib/sampleData.ts` — **NEW FILE** — sample data definitions
- `src/services/supabaseData.ts` — add `insertSampleData()` and `clearSampleData()` functions
- `src/pages/Settings.tsx` — replace "Clear Demo Data" with "Load/Clear Sample Data" toggle
- `src/pages/Dashboard.tsx` — add "Load sample data" option in empty state

**Implementation details**:

### Sample data definitions (`src/lib/sampleData.ts`)

Export functions that return typed arrays (do NOT hardcode `org_id` — it's passed at insert time):

**3 Projects** (variety of statuses):
1. "Riverside Patio & Firepit" — status: in_progress, budget: $38,000, 3 zones (Patio, Firepit Area, Pathway), start: 2 weeks ago, target: 4 weeks from now
2. "Cedar Park Front Yard" — status: planning, budget: $22,000, 2 zones (Driveway Border, Garden Beds), start: next week, target: 6 weeks from now
3. "Thompson Pool Deck" — status: not_started, budget: $55,000, 2 zones (Pool Deck, Landscape Ring), start: 3 weeks from now, target: 10 weeks from now

Each project includes: name, client, address (Austin TX area), totalArea, startDate, targetDate, budget, notes, zones with materials and area/perimeter.

**6 Crew Members**:
1. Marco Gutierrez — Foreman, skills: [hardscape, grading], available Mon-Fri
2. James Wilson — Lead Installer, skills: [hardscape, concrete], available Mon-Fri
3. Sofia Reyes — Landscape Specialist, skills: [planting, irrigation], available Mon-Sat
4. Tyler Brooks — Equipment Operator, skills: [grading, demolition], available Mon-Fri
5. David Chen — Apprentice, skills: [general labor], available Mon-Fri
6. Ana Martinez — Designer/PM, skills: [design, estimation], available Mon-Thu

**5 Equipment**:
1. CAT 303.5 Mini Excavator — status: available
2. Bobcat S570 Skid Steer — status: in_use
3. Ford F-350 Dump Truck — status: available
4. Wacker Neuson WP1550 Compactor — status: available
5. Vermeer BC700XL Chipper — status: maintenance

**8 Materials** (common landscaping):
1. Belgard Cambridge Pavers — category: paver, unit: sqft, cost: $4.50
2. Austin Cream Limestone — category: stone, unit: sqft, cost: $8.75
3. Bermuda Sod (premium) — category: sod, unit: sqft, cost: $0.85
4. Hardwood Mulch — category: mulch, unit: cuyd, cost: $45
5. #57 Limestone Gravel — category: gravel, unit: ton, cost: $38
6. Steel Landscape Edging — category: edging, unit: lnft, cost: $3.25
7. Live Oak (30gal) — category: tree, unit: each, cost: $285
8. Hunter MP Rotator — category: irrigation, unit: each, cost: $12.50

All items include `isSample: true` flag for easy cleanup.

### Supabase insert function (`supabaseData.ts`)

Add `insertSampleData(orgId: string)`:
- Inserts projects, zones, crew_members, equipment, materials in order (projects first, then zones referencing project IDs).
- Uses existing insert functions where possible (`insertProject`, `insertCrewMember`, etc.).
- Returns `{ success: boolean; error?: string }`.
- All inserted records get `org_id = orgId`.
- **Important**: Generate fresh UUIDs for all IDs (use `crypto.randomUUID()`).

Add `clearSampleData(orgId: string)`:
- Deletes all records where `is_sample = true` for the org.
- Requires a `is_sample` column — but we said no migration this sprint. **Instead**: tag sample records by prefixing their `notes` field with `[SAMPLE]`. The clear function deletes records where `notes LIKE '[SAMPLE]%'`.
- **Actually, simpler approach**: Store the IDs of inserted sample records in localStorage (`tf-sample-ids`) as `{ projects: [...], crew: [...], equipment: [...], materials: [...] }`. The clear function deletes by those IDs. This avoids any schema changes.

### Settings integration

In `Settings.tsx`, replace the existing "Clear Demo Data" section in the Profile tab with:

**If sample data is NOT loaded** (check `localStorage['tf-sample-ids']` is null):
- Button: "Load Sample Company" (secondary variant)
- Description: "Populate your workspace with a sample landscaping company — 3 projects, 6 crew members, equipment, and materials. You can clear it anytime."

**If sample data IS loaded**:
- Button: "Clear Sample Data" (danger variant)
- Description: "Remove all sample projects, crew, equipment, and materials."
- Show a `<ConfirmDialog>` before clearing.

Both buttons show a loading spinner during the operation and a success toast on completion. After loading, call `fetchProjects()`, `fetchCrew()`, etc. to refresh stores.

### Dashboard empty state integration

In the Dashboard empty state (when no projects exist), add a secondary action below the "Create Project" button:
- Divider text: "— or —" in `var(--text-4)`, 13px
- Link: "Load a sample company to explore" in `var(--green-l)`, 13px, cursor pointer, underline on hover
- Clicking it runs the same `insertSampleData()` logic and refreshes stores.

**Supabase considerations**:
- All inserts go through existing `supabaseData.ts` functions with `org_id`.
- RLS policies already handle org isolation — sample data is org-scoped.
- No schema migration needed — using localStorage ID tracking for cleanup.

**Acceptance criteria**:
- [ ] "Load Sample Company" button in Settings inserts 3 projects, 6 crew, 5 equipment, 8 materials
- [ ] After loading, all pages show sample data immediately (stores refreshed)
- [ ] "Clear Sample Data" button removes all sample records
- [ ] Dashboard empty state shows "Load a sample company" link
- [ ] Sample data is org-scoped (only visible to the user's org)
- [ ] Loading/clearing shows spinner + success toast
- [ ] `npm run build` passes

---

## S26-5: Help Icons on Key Features

**Problem/Goal**: New users don't know what certain features do. Add contextual `<HelpIcon>` tooltips on the features that are least self-explanatory.

**Files to modify**:
- `src/pages/Dashboard.tsx` — help icon on KPI strip "Customize" button area
- `src/pages/ManifestEngine.tsx` — help icon explaining what the manifest engine does
- `src/pages/PriceResearch.tsx` — help icon explaining AI price research
- `src/pages/Schedule.tsx` — help icon on the schedule grid header
- `src/components/dashboard/SetupChecklist.tsx` — help icon on the checklist header

**Implementation details**:

Add `<HelpIcon tooltip="..." />` (from S26-1) next to these elements:

| Location | Placement | Tooltip Text |
|----------|-----------|--------------|
| Dashboard KPI strip | Next to "Customize" button | "Choose which metrics appear here. Drag to reorder." |
| Manifest Engine | Next to page title | "Calculates exact material quantities for each zone based on area and perimeter. Includes waste reserve." |
| Price Research | Next to page title | "AI-powered material pricing. Enter a material and location to get current market estimates." |
| Schedule | Next to week navigation | "Drag crew members onto days to assign them. Click an assignment to edit details." |
| Setup Checklist | Next to "Get Started" title | "Complete these steps to set up your workspace. You can dismiss this anytime." |

Place each `<HelpIcon>` inline with `margin-left: 8px` and `vertical-align: middle` relative to the element it describes.

**Supabase considerations**: None — frontend-only.

**Acceptance criteria**:
- [ ] 5 help icons visible on their respective pages
- [ ] Hovering shows tooltip with correct text
- [ ] Tooltips don't obscure important content
- [ ] Tooltips dismiss properly
- [ ] `npm run build` passes

---

## Execution Order

1. **S26-1** — Tooltip component (dependency for S26-5 and S26-2's help icon)
2. **S26-2** — Setup Checklist (core first-run feature, depends on S26-1 for help icon)
3. **S26-3** — Enhanced empty states (standalone copy changes, but reads better after checklist exists)
4. **S26-4** — Sample data loader (standalone, biggest task)
5. **S26-5** — Help icons (depends on S26-1, quick integration pass)

---

## SQL Migrations Required

**None.** This sprint is entirely frontend — no schema changes needed.

---

## Post-Sprint Test Plan

> Open `http://localhost:3000` in **incognito** (clean localStorage). Log in with a test account.

1. **Fresh user flow**: After login, Dashboard should show the Setup Checklist with 0/5 progress. Verify "Get Started" card renders with all 5 steps.
2. **Checklist navigation**: Click "Go →" on "Create your first project" — verify it navigates to `/projects`. Create a project — go back to Dashboard — verify step 1 shows green check and progress bar updated.
3. **Visit tracking**: Navigate to `/schedule` — return to Dashboard — verify step 4 is complete.
4. **Checklist completion**: Complete all 5 steps — verify celebration message appears. Click "Dismiss" — verify checklist disappears permanently (survives page refresh).
5. **Empty state copy**: Visit Projects, Crew, Equipment, Schedule, Work Orders, Manifest with no data — verify updated, action-oriented copy on each page.
6. **Sample data load**: Go to Settings → Profile → click "Load Sample Company". Verify loading spinner, success toast, and that Projects/Crew/Equipment/Materials pages now show data.
7. **Sample data on Dashboard**: With sample data loaded, verify Dashboard shows KPIs, widgets with real data, map pins.
8. **Sample data clear**: Go to Settings → Profile → click "Clear Sample Data" → confirm. Verify all sample records removed, pages return to empty states.
9. **Dashboard sample link**: Clear all data. On Dashboard empty state, verify "Load a sample company to explore" link appears and works.
10. **Tooltip hover**: Hover over `?` icon next to "Customize" on Dashboard — verify tooltip appears with correct text. Check all 5 help icon locations.
11. **Console check**: Open DevTools console — verify no `[TF-SUPABASE]` errors during all operations.
