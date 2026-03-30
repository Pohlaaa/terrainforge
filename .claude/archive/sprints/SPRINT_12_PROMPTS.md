# Sprint 12 — Visual Polish, Navigation & Map

> **Goal**: Make the MVP feel alive. Every element should be tappable, navigable, and visually compelling. Activate the map. Add address verification. Uplift empty states. Add sparklines and greeting header.
>
> **CRITICAL RULE**: This sprint ENHANCES existing components — it does NOT replace them. The KPI customization drawer, widget drag-and-drop grid, edit mode, and all Sprint 10/10.5 features MUST remain fully functional after every task. If you're about to delete a component or remove a feature to implement something new, STOP — layer the new visual on top of the existing component instead.

## Context Files to Read First

1. `CLAUDE.md` — master project context
2. `.claude/DESIGN_SYSTEM.md` — design tokens and component specs
3. `.claude/design-preview-v6-polish.html` — visual reference for all tasks (DO NOT copy HTML verbatim — extract the design patterns and apply them to existing React components)
4. `src/pages/Dashboard.tsx` — current dashboard with KPI drawer, widget grid, edit mode
5. `src/lib/kpiDefinitions.ts` — KPI library (12 KPIs, dynamic selection)

---

## S12-1: Address Autocomplete + Geocoding

**Goal**: When creating or editing a project, the address field provides autocomplete suggestions from Mapbox and stores lat/lng coordinates for map display.

**New files**:
- `src/hooks/useAddressAutocomplete.ts`
- `src/components/shared/AddressInput.tsx`

**Modified files**:
- `src/pages/Projects.tsx` — replace plain address text input with `<AddressInput>`

**Hook: `useAddressAutocomplete(query: string)`**
```typescript
interface AddressSuggestion {
  placeId: string;
  address: string;      // full formatted address
  city: string;
  state: string;
  lat: number;
  lng: number;
}

// Returns { suggestions, isLoading, error }
// - Debounce 300ms, min 3 characters
// - Endpoint: https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json
// - Params: access_token={VITE_MAPBOX_TOKEN}&country=us&types=address&limit=5
// - Gracefully returns empty array if VITE_MAPBOX_TOKEN is missing
```

**Component: `AddressInput`**
- Props: `value: string`, `onSelect: (suggestion: AddressSuggestion) => void`, `onChange: (text: string) => void`, `placeholder?: string`
- Renders a text input matching existing form styling (44px height, `var(--radius-md)` border radius, `var(--surface-card)` background, `var(--border-default)` border)
- Below the input, a dropdown appears when suggestions are available:
  - Card with `var(--shadow-panel)`, `var(--radius-lg)` corners
  - Each suggestion: full address line + city/state secondary text, `var(--surface-hover)` on hover, 44px min-height touch target
  - Selecting a suggestion: fills input, calls `onSelect` with full object (including lat/lng)
- After selection: show green checkmark icon (`var(--status-green)`) next to the input
- If user blurs with unverified text: show subtle warning below input in `var(--text-tertiary)`: "Address not verified — project won't appear on map"
- Mini map preview (120px height, rounded corners) appears below the input after a verified address is selected, showing a single pin at the lat/lng. Use `useMapbox` hook for this.

**Changes to Projects.tsx**:
- Import and use `<AddressInput>` wherever the address field appears in the new project form and edit project form
- When `onSelect` fires, store `lat` and `lng` alongside the address string in the project data
- Ensure `lat` and `lng` are passed to the Supabase upsert (columns already exist from Sprint 10 migration)

**Acceptance criteria**:
- [ ] Typing 3+ characters in address field shows autocomplete dropdown
- [ ] Selecting a suggestion fills the field and stores lat/lng
- [ ] Creating a project with verified address → lat/lng saved to Supabase
- [ ] Projects with lat/lng appear on the dashboard map widget
- [ ] Graceful degradation when Mapbox token is missing (no errors, just no autocomplete)
- [ ] KPI drawer, widget drag, edit mode all still work (regression check)
- [ ] `npm run build` passes

---

## S12-2: KPI Card Tap-Through Navigation + Sparklines

**Goal**: Each KPI card on the dashboard navigates to a relevant page on tap, and shows a sparkline trend line.

**CRITICAL**: Do NOT replace the KPI card rendering system. The current Dashboard uses `activeKpis` from `kpiDefinitions.ts` + `selectedKpis` from user preferences + `KPIDrawer` for customization. All of that stays. You are ADDING tap navigation and sparklines to the EXISTING `KPICard` component inside Dashboard.tsx.

**Modified files**:
- `src/pages/Dashboard.tsx` — enhance the KPI card rendering (around lines 339-400)
- `src/lib/kpiDefinitions.ts` — add `navigateTo` and `navigateParams` fields to each KPI definition

**Changes to `kpiDefinitions.ts`**:
Add two new optional fields to each KPI definition object:
```typescript
navigateTo?: string;       // e.g. '/projects'
navigateParams?: string;   // e.g. '?status=active'
```

Mapping:
| KPI id | navigateTo | navigateParams |
|--------|-----------|----------------|
| `active-projects` | `/projects` | `?status=active` |
| `total-value` | `/projects` | `?sort=value` |
| `team-size` | `/crew` | |
| `fleet-size` | `/equipment` | |
| `completion-rate` | `/projects` | `?status=completed` |
| `revenue-mtd` | `/projects` | |
| `materials-value` | `/materials` | |
| `pending-orders` | `/work-orders` | `?status=pending` |
| `overdue-projects` | `/projects` | `?status=overdue` |
| `avg-project-duration` | `/projects` | |
| `crew-utilization` | `/crew` | |
| `equipment-downtime` | `/equipment` | |

**Changes to Dashboard.tsx KPI card section**:
1. Wrap each KPI card in a clickable container that calls `navigate(kpi.navigateTo + (kpi.navigateParams || ''))` on click
2. Add a small chevron icon (16px, `var(--text-tertiary)`, opacity 0.5 → 1 on hover) in the top-right of each card
3. Add cursor: pointer and hover effect: `translateY(-1px)` + `var(--shadow-hover)`
4. Add a sparkline SVG at the bottom of each KPI card:
   - 100% width, 32px height
   - Use a simple area + line path (reference v6 preview for the SVG pattern)
   - Color: `var(--brand-primary)` at 20% opacity for area, full opacity for line
   - For now, generate mock sparkline data (7 points, slight upward trend) — we'll wire real historical data later
   - Hide sparkline when `editMode` is true (drag mode shouldn't show sparklines)
5. Below the KPI value, add a change indicator line (e.g. "+3 this month" or "2 available today"):
   - Pull this from a new optional `subtitle` field on kpiDefinitions, or compute from the existing `compute()` function
   - Green text with up arrow for positive change, red with down arrow for negative, neutral for static
6. Add a 4px left border accent in `var(--brand-primary)` to each KPI card (per v6 design)

**DO NOT**:
- Remove the KPI drawer trigger (gear/customize button)
- Remove edit mode drag-to-reorder on KPIs
- Change the `activeKpis` computation logic
- Hardcode specific KPIs — the system must remain dynamic (user picks which 6 to show)

**Acceptance criteria**:
- [ ] Tapping any KPI card navigates to the correct page
- [ ] Sparklines render on all visible KPI cards
- [ ] Chevron and hover effects visible
- [ ] KPI drawer still opens and allows add/remove/reorder
- [ ] Edit mode still allows drag-to-reorder KPIs
- [ ] `npm run build` passes

---

## S12-3: Widget Header "View All" + Item Tap-Through + Radial Progress

**Goal**: Each dashboard widget has a "View All →" link and tappable individual items. Projects widget uses radial progress rings instead of linear bars.

**CRITICAL**: Do NOT replace `WidgetGrid`, `WidgetCard`, or the drag-and-drop system. Add navigation to the EXISTING widget components.

**Modified files**:
- `src/components/dashboard/widgets/ProjectsWidget.tsx`
- `src/components/dashboard/widgets/CrewWidget.tsx`
- `src/components/dashboard/widgets/FleetWidget.tsx`
- `src/components/dashboard/widgets/AlertsWidget.tsx`

**Changes per widget**:
1. Add a "View All →" link in the widget header (right side):
   - `ProjectsWidget` → `/projects`
   - `CrewWidget` → `/crew`
   - `FleetWidget` → `/equipment`
   - `AlertsWidget` → `/work-orders`
   - Style: `var(--text-secondary)`, 13px, `var(--brand-primary)` on hover, underline on hover, cursor pointer
   - Uses `useNavigate()` from react-router-dom

2. Make individual list items tappable:
   - Each item gets cursor: pointer, `var(--surface-hover)` background on hover, and a small right chevron (14px, `var(--text-tertiary)`)
   - ProjectsWidget items → set active project + navigate to project detail
   - CrewWidget items → navigate to `/crew`
   - FleetWidget items → navigate to `/equipment`
   - AlertsWidget items → navigate based on alert type

3. **ProjectsWidget only** — replace linear progress bar with radial (circular) progress ring:
   - SVG circle: 36x36 viewBox, `r="15.9"`, stroke-dasharray based on progress %
   - Background circle: `var(--border-light)` stroke
   - Fill circle: status-colored stroke (green/amber/blue/red based on project status)
   - Center text: progress percentage in 10px font
   - Reference v6 preview for exact SVG pattern (`.radial-progress` class)

**DO NOT**:
- Remove the WidgetCard wrapper (it provides drag, collapse, hide functionality)
- Remove edit mode behavior
- Change the widget rendering order or visibility system

**Acceptance criteria**:
- [ ] Every "View All" link navigates correctly
- [ ] Every list item is tappable and navigates appropriately
- [ ] Radial progress rings show on project items
- [ ] Widget drag-and-drop, collapse, hide, and edit mode all still work
- [ ] `npm run build` passes

---

## S12-4: Map Widget Full Activation

**Goal**: The map widget renders a real Mapbox map with project pins, now that VITE_MAPBOX_TOKEN is configured.

**Modified files**:
- `src/components/dashboard/widgets/MapWidget.tsx` — enhance pin styling and popups
- `src/hooks/useMapbox.ts` — verify/enhance pin colors and popup content

**Changes**:
The `useMapbox.ts` hook and `MapWidget.tsx` already exist with most of the logic. Verify and enhance:

1. **Pin colors by project status** (match v6 design):
   - On Track / Completed → `#16A34A` (green)
   - In Progress → `#2563EB` (blue)
   - Attention / Delayed → `#F59E0B` (amber)
   - Blocked / On Hold → `#DC2626` (red)
   - Not Started → `#9CA3AF` (gray)
   - Pins: 32px diameter circles with white 3px border and subtle drop shadow

2. **Pin popup** on click (Mapbox popup, not a separate modal):
   - Project name (bold), client name, address
   - Budget and progress bar
   - "View Project →" link that navigates to project detail
   - Popup styled to match app theme (use CSS custom properties)

3. **Map controls**:
   - Map/Satellite style toggle button in the widget header (next to the widget title)
   - Auto-fit bounds to show all project markers with padding

4. **Empty state** (when no projects have lat/lng):
   - Show a styled empty state: map icon + "Add addresses to your projects to see them here"
   - Don't show a broken/empty map container

5. **Legend overlay** (bottom-left of map):
   - Small transparent card with 5 status dots and labels
   - Matches v6 preview legend design

**Acceptance criteria**:
- [ ] Map renders with all projects that have lat/lng coordinates
- [ ] Pins are color-coded by project status
- [ ] Clicking a pin shows a popup with project info
- [ ] Map/Satellite toggle works
- [ ] Empty state shows when no geocoded projects exist
- [ ] `npm run build` passes

---

## S12-5: Dashboard Greeting Header

**Goal**: Add a contextual greeting section above the KPI strip.

**Modified files**:
- `src/pages/Dashboard.tsx`

**Changes**:
Add a greeting section between the page wrapper and the KPI grid:

1. **Greeting text**: Time-based — "Good morning/afternoon/evening, {name}"
   - Name: extract first name from user email prefix (before @), capitalize it. e.g. `woodsrider82@gmail.com` → "Woodsrider82" (or if user has a display name in auth, use that)
   - Fallback: "Good morning" without name

2. **Date line**: Current date formatted as "Monday, March 30, 2026"

3. **Stats line**: "{N} projects active · {N} needing attention · ${total}K total value"
   - Compute from project store data
   - "Needing attention" = projects with status warning/blocked/overdue

4. **Layout**: Left-aligned, compact (no more than 80px total height). No weather widget for now — skip that to avoid scope creep.

5. **Styling**:
   - Greeting: 24px, font-weight 700, `var(--text-primary)`
   - Date: 13px, `var(--text-tertiary)`
   - Stats: 14px, `var(--text-secondary)`, bold numbers
   - Bottom margin: 20px before KPI grid

**DO NOT**:
- Add a weather widget (deferred — would require a new API integration)
- Push KPIs below the fold — keep the greeting compact

**Acceptance criteria**:
- [ ] Greeting shows correct time-of-day word
- [ ] Stats line reflects actual project data
- [ ] Both light and dark theme look correct
- [ ] Greeting doesn't break KPI grid layout
- [ ] `npm run build` passes

---

## S12-6: Empty State Visual Uplift

**Goal**: Replace emoji + gray text empty states across all pages with designed empty states that have SVG illustrations and action-oriented CTAs.

**Modified files**:
- `src/pages/Dashboard.tsx` (empty dashboard / no projects state)
- `src/pages/Projects.tsx`
- `src/pages/MaterialLibrary.tsx`
- `src/pages/CrewManager.tsx`
- `src/pages/EquipmentManager.tsx`
- `src/pages/WorkOrders.tsx`

**New file** (optional):
- `src/components/shared/EmptyState.tsx` — reusable empty state component

**EmptyState component**:
```typescript
interface EmptyStateProps {
  icon: React.ReactNode;      // SVG illustration
  title: string;               // "Your first project starts here"
  description: string;         // "Create a project to start tracking..."
  actionLabel?: string;        // "Create Project"
  onAction?: () => void;       // onClick handler for CTA
}
```

**Design per page** (reference v6 preview Section 4 for SVG illustrations):
| Page | Title | Description | CTA |
|------|-------|-------------|-----|
| Dashboard | "Welcome to TerrainForge" | "Create your first project to see your dashboard come alive" | "Create Project" |
| Projects | "Your first project starts here" | "Track jobs, assign crews, and manage materials all in one place" | "New Project" |
| Materials | "Stock your material library" | "Add materials to track inventory and costs across projects" | "Add Material" |
| Crew | "Build your team" | "Add crew members to assign them to projects and track availability" | "Add Crew Member" |
| Equipment | "Register your fleet" | "Track equipment status, maintenance schedules, and assignments" | "Add Equipment" |
| Work Orders | "No work orders yet" | "Work orders will appear here as you assign tasks to projects" | "View Projects" |

**SVG illustrations**: Create simple, clean SVG illustrations for each (clipboard for projects, stacked blocks for materials, people silhouettes for crew, truck for equipment). Use `var(--brand-primary)` as the accent color, `var(--text-tertiary)` for outlines. Keep them simple — 64x64px or 80x80px, single-color line art style. Reference the v6 preview's SVG patterns.

**CTA button**: Use the existing `Button` component with `variant="primary"` (brand green, 44px height).

**Acceptance criteria**:
- [ ] Every page with an empty state shows the new designed version
- [ ] CTA buttons trigger the correct create action
- [ ] Both light and dark theme look correct
- [ ] No leftover emoji-based empty states
- [ ] `npm run build` passes

---

## S12-7: Visual Brand Polish

**Goal**: Subtle visual improvements that make the app feel more polished and less "template-like."

**Modified files**:
- `src/index.css` — global styles
- `src/pages/Dashboard.tsx` — card styling
- Any page component that renders cards

**Changes**:

1. **KPI card left accent bar**: Add a 4px left border in `var(--brand-primary)` to each KPI card. Apply via CSS — add a class like `.kpi-card-accent` or add the border directly to the KPI card style in Dashboard.tsx.

2. **Card hover consistency**: Ensure ALL clickable cards across the app have consistent hover:
   ```css
   transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
   /* On hover: */
   transform: translateY(-1px);
   box-shadow: var(--shadow-hover);
   border-color: var(--border-strong);
   ```

3. **Subtle page background**: Change `--surface-bg` from flat `#FAFAFA` to a very subtle gradient:
   ```css
   body { background: linear-gradient(180deg, #FAFAFA 0%, #F0F2F0 100%); }
   [data-theme="dark"] body { background: linear-gradient(180deg, #0F172A 0%, #0A1120 100%); }
   ```
   Keep it subtle — barely noticeable, just adds depth.

4. **Section divider**: Add a thin horizontal rule between the KPI section and widget section on the dashboard. Use a faint `var(--border-light)` line with 24px vertical margin.

**DO NOT**:
- Add project card hero images (nice idea but too much scope for this sprint)
- Add sidebar brand marks or patterns
- Change the color system or font

**Acceptance criteria**:
- [ ] KPI cards have green left accent bar
- [ ] All clickable cards have consistent hover effects
- [ ] Page background has subtle gradient
- [ ] Visual changes work in both light and dark theme
- [ ] No existing functionality broken
- [ ] `npm run build` passes

---

## Execution Notes

- **Branch**: `sprint-12-polish`, one commit per task, single PR to main when done
- **Dependency order**: S12-1 first (map depends on geocoded addresses), then S12-4 (map), then S12-2/3/5/6/7 in any order
- **Push**: `git push origin sprint-12-polish` — do NOT push to main directly
- **PR creation**: Use `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-12-polish --title "Sprint 12: Visual Polish & Map" --body "Address verification, KPI navigation, widget tap-through, map activation, greeting header, empty states, visual polish"`
- **Regression check after EVERY task**: Verify KPI drawer opens, widget drag works, edit mode toggles, theme switching works. If any Sprint 10/10.5 feature breaks, fix it before moving to the next task.
- **Design reference**: `.claude/design-preview-v6-polish.html` is a VISUAL REFERENCE only. Extract colors, spacing, SVG patterns, and layout ideas. Do NOT copy its HTML structure — our React components have their own architecture.
