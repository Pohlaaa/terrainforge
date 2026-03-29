# Sprint 12 — Deployment Brief: Functional Polish & Map Integration

> **Context**: Phase 1 MVP is complete. Sprint 12 focuses on making existing features feel connected and polished. The UI Design session is producing visual specs (`design-preview-v6-polish.html`) — wait for that before writing code prompts for visual items. This brief covers the **functional architecture** that Code needs to implement.
>
> **Workflow**: UI Design session delivers v6 preview → Orchestrator synthesizes into this brief → You write Code-ready prompts with exact file paths, component names, and acceptance criteria.

---

## Architecture Decisions (Pre-decided)

### Address Geocoding
- **Service**: Mapbox Geocoding API (free tier, same token as map display)
- **Endpoint**: `https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token={token}&country=us&types=address&limit=5`
- **Flow**: User types in address field → debounced API call (300ms) → dropdown suggestions → user selects → lat/lng stored on project
- **Storage**: `projects` table already has `lat DOUBLE PRECISION` and `lng DOUBLE PRECISION` columns (added in Sprint 10 migration)
- **Env var**: `VITE_MAPBOX_TOKEN` — same token used for both map display and geocoding

### Navigation Pattern for KPI/Widget Tap-Through
- KPI taps use `navigate()` from react-router-dom with optional query params for filtering
- Widget "View All" links use standard `<Link>` components
- Widget item taps navigate to the detail view (e.g., project detail panel)
- No new routes needed — all destinations are existing pages

### Map Token
- Charlie will provide the Mapbox public token
- Needs to be set as a Netlify environment variable: `VITE_MAPBOX_TOKEN`
- Also set in local `.env.local` for dev

---

## Sprint 12 Tasks for Code Prompts

### S12-1: Address Autocomplete + Geocoding on Project Creation/Edit

**New files**:
- `src/hooks/useAddressAutocomplete.ts` — debounced Mapbox geocoding hook
- `src/components/shared/AddressInput.tsx` — autocomplete input component with dropdown

**Modified files**:
- `src/pages/Projects.tsx` — replace plain address text input with `<AddressInput>`
- `src/services/projects.ts` — ensure `lat` and `lng` are saved when creating/updating projects

**Hook spec** (`useAddressAutocomplete`):
```typescript
interface AddressSuggestion {
  placeId: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

function useAddressAutocomplete(query: string): {
  suggestions: AddressSuggestion[];
  isLoading: boolean;
  error: string | null;
}
```
- Debounce 300ms
- Minimum 3 characters before querying
- Returns top 5 US address results
- Gracefully handles missing VITE_MAPBOX_TOKEN (returns empty, no error)

**Component spec** (`AddressInput`):
- Text input matching existing form styling (44px height, rounded 8px)
- Dropdown appears below with suggestions (card shadow, rounded corners)
- Each suggestion shows street address + city, state
- Selecting a suggestion: fills input text, calls `onSelect(suggestion)` with full object including lat/lng
- Green checkmark icon appears when address is verified (has lat/lng)
- If user types something that doesn't match and blurs away: show subtle warning text "Address not verified — project won't appear on map"

**Acceptance criteria**:
- New project with verified address → lat/lng saved to Supabase projects row
- Edit project address → lat/lng updated
- Projects with lat/lng appear on dashboard map widget
- Projects without lat/lng still work, just don't show on map
- `npm run build` passes

---

### S12-2: KPI Card Tap-Through Navigation

**Modified files**:
- `src/pages/Dashboard.tsx` — wrap each KPI card in a clickable container with navigate()

**Navigation mapping** (these are the KPIs from `src/lib/kpiDefinitions.ts`):

| KPI id | Navigate to | Query param |
|--------|------------|-------------|
| `active-projects` | `/projects` | `?status=active` |
| `total-value` | `/projects` | `?sort=value` |
| `team-size` | `/crew` | — |
| `fleet-size` | `/equipment` | — |
| `completion-rate` | `/projects` | `?status=completed` |
| `revenue-mtd` | `/projects` | — |
| `materials-value` | `/materials` | — |
| `pending-orders` | `/work-orders` | `?status=pending` |
| `overdue-projects` | `/projects` | `?status=overdue` |
| `avg-project-duration` | `/projects` | — |
| `crew-utilization` | `/crew` | — |
| `equipment-downtime` | `/equipment` | — |

**Visual changes**:
- Each KPI card wrapper: `cursor: pointer`, hover effect (translateY -1px + shadow)
- Small chevron-right icon (12px, text-tertiary color) in top-right corner of each card
- Apply these based on the v6 design preview specs

**Acceptance criteria**:
- Tapping any KPI card navigates to the correct page
- Query params are read by destination pages to filter/sort (even if filtering isn't implemented yet — the params should be in the URL for future use)
- Hover/tap visual feedback is clear
- Touch targets remain 44px+

---

### S12-3: Widget Header "View All" + Item Tap-Through

**Modified files**:
- `src/components/dashboard/widgets/ProjectsWidget.tsx`
- `src/components/dashboard/widgets/CrewWidget.tsx`
- `src/components/dashboard/widgets/FleetWidget.tsx`
- `src/components/dashboard/widgets/AlertsWidget.tsx`

**Changes per widget**:
1. Add "View All →" link in widget header (right-aligned, text-secondary, 13px)
   - ProjectsWidget → `/projects`
   - CrewWidget → `/crew`
   - FleetWidget → `/equipment`
   - AlertsWidget → `/work-orders`

2. Make individual items within each widget tappable:
   - Project items → navigate to project detail (set active project + open detail panel)
   - Crew items → navigate to `/crew` (with crew member selected if possible)
   - Fleet items → navigate to `/equipment`
   - Alert items → navigate to relevant page based on alert type

**Visual changes**:
- "View All →" uses hover underline, cursor pointer
- List items: hover background (surface-hover), cursor pointer, subtle right chevron on hover
- Apply v6 design preview specs for exact styling

**Acceptance criteria**:
- Every "View All" link navigates correctly
- Tapping individual items navigates to the appropriate detail
- No dead-end taps — every clickable element goes somewhere

---

### S12-4: Map Widget Full Activation

**Modified files**:
- `src/components/dashboard/widgets/MapWidget.tsx`
- `src/hooks/useMapbox.ts`

**Changes**:
- Map widget should now render fully (token will be configured as env var)
- Pin colors based on project status (match v2 design: green/blue/amber/red/gray)
- Pin click opens popup with: project name, address, budget, progress %
- Popup click navigates to project detail
- Map/Satellite toggle button in widget header
- Auto-fit bounds to all project markers
- Empty state when no projects have coordinates: "Add addresses to projects to see them on the map"

**Check existing implementation**: `useMapbox.ts` already has most of this logic. Verify it matches v6 specs and enhance where needed. Don't rewrite what's already working.

**Acceptance criteria**:
- Map renders with all projects that have lat/lng
- Status-colored pins match the design system
- Pin popups show project info
- Map auto-zooms to fit all markers
- Graceful empty state

---

### S12-5: Dashboard Greeting Header

**Modified files**:
- `src/pages/Dashboard.tsx`

**Changes**:
- Add a greeting section above the KPI strip
- Time-based greeting: "Good morning/afternoon/evening, {first name or email prefix}"
- Current date formatted: "Monday, March 30, 2026"
- Summary line: "{N} active projects, {N} needing attention" (computed from project store)
- Styled per v6 design preview specs

**Acceptance criteria**:
- Greeting updates based on time of day
- Project counts are accurate from store data
- Looks good in both light and dark theme

---

### S12-6: Empty State Visual Uplift

**Modified files**:
- All pages that have empty states (Dashboard, Projects, Materials, Crew, Equipment, Work Orders)

**Changes**:
- Replace emoji + gray text empty states with designed empty states from v6 preview
- Each should have: illustration/icon (SVG or styled div), descriptive heading, action-oriented subtext, prominent CTA button
- CTA buttons should trigger the appropriate create action (e.g., "Create Your First Project" opens the new project modal)

**Design reference**: v6 design preview section 4 (Empty States)

**Acceptance criteria**:
- Every page with empty state shows the designed version instead of emoji + text
- CTA buttons work and trigger the correct action
- Looks good in both light and dark theme

---

### S12-7: Visual Brand Depth (from v6 specs)

This task depends entirely on what UI Design produces. Potential items:
- Subtle page background texture/gradient
- Card left-edge accent bars
- Project card hero images/gradient headers
- KPI sparklines (even with mock trend data)

**Hold this task until v6 preview is delivered and reviewed.**

---

## Execution Notes

- **Dependency order**: S12-1 (address) first (map depends on it), then S12-4 (map), then S12-2/3/5/6 in any order, S12-7 last
- **Mapbox token**: Charlie will set `VITE_MAPBOX_TOKEN` in Netlify env vars and `.env.local` before S12-4
- **Wait for UI**: Tasks S12-6 and S12-7 need the v6 design preview before Code can implement
- **Git**: Single branch `sprint-12-polish`, one commit per task, single PR to main
- **Push note**: `git push origin HEAD:main` (NOT `HEAD:master`)
