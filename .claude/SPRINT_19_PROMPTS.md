# Sprint 19 — UI Polish Pass

> **Goal**: Make every page feel consistent and professional. Standardize border-radius, card shadows, page headers, hover states, focus rings, and touch targets across the app. No new features — purely visual consistency.
>
> **Branch**: `sprint-19-ui-polish`
> **Design reference**: `.claude/DESIGN_SYSTEM.md` — the authoritative source for all token values
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-19-ui-polish --title "Sprint 19: UI Polish Pass" --body "Standardize border-radius, card shadows, focus rings, page headers, hover states, and touch targets across all pages. No feature changes."`

---

## CRITICAL CONTEXT

> Read these files before starting:
> 1. `CLAUDE.md` (project root) — architecture rules, what NOT to do
> 2. `.claude/CODE_GUIDE.md` — execution workflow
> 3. `.claude/DESIGN_SYSTEM.md` — the design token reference (color, typography, spacing, component specs)
> 4. `src/index.css` — the CSS custom properties (both themes)
> 5. This file
>
> Key rules:
> - This sprint is ENHANCEMENT ONLY — do not change functionality, data flow, or business logic
> - After EVERY task, verify: dashboard loads, schedule works, crew app works, all pages render
> - Use design system tokens, not hardcoded values
> - The app uses legacy CSS variable aliases (`--surface2`, `--border`, `--text`, etc.) that map to the new names. Both work. Do NOT mass-rename legacy vars in this sprint — that's a separate refactor. Focus on visual consistency.
> - Standard border-radius: `8px` for buttons/inputs/small elements, `10px` for cards/containers, `12px` for modals/panels
> - Standard card: `background: var(--surface-card)`, `border: 1px solid var(--border-default)`, `border-radius: 10px`, `box-shadow: var(--shadow-card)`

---

## S19-1: Standardize card shadows and hover effects

**Problem/Goal**: Cards across the app have inconsistent shadow and hover behavior. Some have no shadow, some have custom shadows, some have the `.card-hover` class and most don't.

**Files to modify**:
- `src/pages/Dashboard.tsx` — KPI cards, widget cards
- `src/pages/Projects.tsx` — project cards in the grid
- `src/pages/MaterialLibrary.tsx` — material cards/rows
- `src/pages/CrewManager.tsx` — crew member cards
- `src/pages/EquipmentManager.tsx` — equipment cards/rows
- `src/pages/WorkOrders.tsx` — zone cards, project selector cards

**Implementation details**:

For every card-like container across these pages, ensure they have:
1. `box-shadow: var(--shadow-card)` (or class `shadow-[var(--shadow-card)]`)
2. On hover (if the card is interactive/clickable): add `transition: transform 0.15s ease, box-shadow 0.15s ease` and on hover: `transform: translateY(-1px)`, `box-shadow: var(--shadow-hover)`

The easiest approach: add the `card-hover` CSS class (already defined in `index.css` lines 187-195) to all interactive card elements. For non-interactive cards (display-only), just add `box-shadow: var(--shadow-card)`.

**Specific targets** (search for these patterns and add shadow + hover):
- Dashboard widget containers (the cards wrapping ProjectsWidget, CrewWidget, etc.)
- Project cards in the project list/grid
- Crew member cards in the crew manager
- Equipment items in the equipment manager
- Zone cards in work orders
- Material rows/cards in material library

Do NOT add shadows to:
- Table headers/rows (these should stay flat)
- Inline form inputs
- The sidebar
- Schedule grid cells

**Acceptance criteria**:
- [ ] All card-like containers have `box-shadow: var(--shadow-card)`
- [ ] All clickable cards have hover elevation effect
- [ ] No visual regressions (pages still render correctly)
- [ ] `npm run build` passes

---

## S19-2: Standardize border-radius across all pages

**Problem/Goal**: Border-radius is inconsistent — mix of 5px, 6px, 7px, 8px, 10px, 12px across pages.

**Files to modify**: All page files in `src/pages/` that use non-standard border-radius values.

**Implementation details**:

Standard values per DESIGN_SYSTEM.md:
- **8px** (`rounded-[8px]`) — buttons, inputs, small interactive elements, badges, chips
- **10px** (`rounded-[10px]`) — cards, containers, panels
- **12px** (`rounded-[12px]`) — modals, large panels, crew app cards

Replace these non-standard values:
- `rounded-[5px]` → `rounded-[8px]` (buttons in CrewManager, PriceResearch)
- `rounded-[6px]` → `rounded-[8px]` (buttons in Billing, EquipmentManager, Projects, MaterialLibrary, WorkOrders, Schedule)
- `rounded-[7px]` → `rounded-[8px]` (buttons in Billing, WorkOrders)
- `borderRadius: '6px'` → `borderRadius: '8px'` (Dashboard, Schedule, Projects)
- `borderRadius: '5px'` → `borderRadius: '8px'` (if any exist)

Use find-and-replace within each file. Be careful with `borderRadius: '12px'` — that's correct for modals/panels, don't change those.

**Acceptance criteria**:
- [ ] No instances of `rounded-[5px]`, `rounded-[6px]`, or `rounded-[7px]` in page files
- [ ] No instances of `borderRadius: '5px'` or `borderRadius: '6px'` in page files
- [ ] Cards use 10px, buttons/inputs use 8px, modals use 12px
- [ ] `npm run build` passes

---

## S19-3: Add focus rings to all form inputs

**Problem/Goal**: Form inputs across Login, Signup, ForgotPassword, and other pages only change border color on focus — no visible focus ring. This fails WCAG 2.4.7 (Focus Visible).

**Files to modify**:
- `src/pages/Login.tsx`
- `src/pages/Signup.tsx`
- `src/pages/ForgotPassword.tsx`
- `src/pages/Settings.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Textarea.tsx`

**Implementation details**:

For the UI components (`Input.tsx`, `Select.tsx`, `Textarea.tsx`), add focus ring styles:
```
focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1 focus:border-[var(--brand-primary)]
```

For auth pages (Login, Signup, ForgotPassword) that use raw `<input>` elements with inline `focus:border-*` classes, add the same focus ring pattern:
```
focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1
```

The `ring-offset` should use `ring-offset-[var(--surface-bg)]` to match the page background color.

**Acceptance criteria**:
- [ ] All form inputs show a visible green ring on focus (keyboard or click)
- [ ] Ring color is `var(--brand-primary)` (green)
- [ ] Login, Signup, ForgotPassword pages all have focus rings
- [ ] UI components (Input, Select, Textarea) have focus rings
- [ ] `npm run build` passes

---

## S19-4: Standardize page headers

**Problem/Goal**: Pages use different header patterns — some use `<PageHeader>`, most use manual inline styles. Standardize all pages to a consistent header with title + subtitle + optional action buttons.

**Files to modify**:
- `src/pages/ManifestEngine.tsx`
- `src/pages/WorkOrders.tsx`
- `src/pages/Schedule.tsx`
- `src/pages/CrewManager.tsx`
- `src/pages/EquipmentManager.tsx`
- `src/pages/MaterialLibrary.tsx`
- `src/pages/PriceResearch.tsx`
- `src/pages/Settings.tsx`

**Implementation details**:

Each page should use the `<PageHeader>` component from `src/components/layout/PageHeader.tsx`. Import it and replace the manual header markup.

Example transformation for ManifestEngine.tsx:

Before:
```tsx
<div className="text-[22px] font-serif text-[var(--text)] mb-[6px]">Manifest Engine</div>
<p className="text-[13px] text-[var(--text-3)] mb-[24px]">Select a project...</p>
```

After:
```tsx
<PageHeader
  title="Manifest Engine"
  subtitle="Select a project to generate its material manifest and cost breakdown."
/>
```

Pages that have action buttons in the header (like "+ Add Material") should use the `actions` prop:
```tsx
<PageHeader
  title="Material Library"
  subtitle="Manage your materials inventory and suppliers."
  actions={[{ label: '+ Add Material', onClick: () => openAddModal() }]}
/>
```

**Important**: Some pages have conditional headers (e.g., WorkOrders shows different content based on active project). For these, only standardize the base header — don't restructure the conditional rendering.

For `Schedule.tsx`, the header uses inline styles. Convert to:
```tsx
<PageHeader title="Schedule" subtitle="Assign crew to projects by day. Drag chips to reschedule." />
```
Move the week navigation bar BELOW the PageHeader (it's currently part of the header area).

**Acceptance criteria**:
- [ ] All 8 listed pages use `<PageHeader>` for their title/subtitle
- [ ] Subtitles describe the page purpose in one sentence
- [ ] Action buttons appear in the header where appropriate
- [ ] `npm run build` passes

---

## S19-5: Fix touch target sizes

**Problem/Goal**: Some interactive elements are smaller than the 44px minimum recommended for touch devices.

**Files to modify**:
- `src/pages/CrewManager.tsx` — availability day toggles
- `src/pages/PriceResearch.tsx` — filter tag buttons
- `src/pages/ManifestEngine.tsx` — view toggle buttons

**Implementation details**:

For each undersized button, add `min-h-[44px] min-w-[44px]` (or increase padding to achieve 44px height). The visual appearance can stay small by using padding, but the clickable area must be at least 44x44.

Specific fixes:

1. **CrewManager.tsx** — Day availability toggles (`px-[9px] py-[4px] rounded-[5px]`):
   Change to `px-[10px] py-[8px] rounded-[8px] min-h-[36px]`. These are in a tight grid so 36px is acceptable for inline toggles, but bump padding to be more tappable.

2. **PriceResearch.tsx** — Category filter pills (`rounded-[5px] px-[8px] py-[3px]`):
   Change to `rounded-[8px] px-[10px] py-[6px]` for better touch targets.

3. **ManifestEngine.tsx** — View toggle buttons (if any have `py-[6px]` or similar):
   Ensure minimum `py-[8px]` and `min-h-[36px]`.

For small inline controls (pills, tags, toggles) where 44px would look oversized, aim for at least 36px as a practical compromise. The 44px rule strictly applies to standalone buttons and primary actions.

**Acceptance criteria**:
- [ ] No button/toggle with less than 36px touch height
- [ ] All primary action buttons have min-height 44px
- [ ] `npm run build` passes

---

## S19-6: Add card hover states to interactive elements

**Problem/Goal**: Some clickable cards and list items don't provide visual feedback on hover, making them feel unresponsive.

**Files to modify**:
- `src/pages/CrewManager.tsx` — crew member cards
- `src/pages/Projects.tsx` — project selector cards (in the no-project WorkOrders state)
- `src/pages/ManifestEngine.tsx` — project selection cards
- `src/pages/crew/CrewDashboard.tsx` — crew member picker buttons, job cards

**Implementation details**:

For each clickable card/button that lacks hover feedback, add:
```
hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] transition-all duration-150
```

Or use the `card-hover` CSS class from `index.css` if the element is a standalone card (not inline).

For the crew app buttons (CrewDashboard crew picker), add:
```
hover:bg-[var(--surface-hover)]
```

Keep transitions short (150ms) per the design system's "under 200ms" rule.

**Acceptance criteria**:
- [ ] All clickable cards have visible hover feedback (border change + shadow or background change)
- [ ] Transitions are smooth (150ms)
- [ ] `npm run build` passes

---

## Execution Order

1. **S19-1** — Card shadows (foundation — establishes the shadow pattern)
2. **S19-2** — Border-radius standardization (quick find-replace pass)
3. **S19-3** — Focus rings on inputs (accessibility)
4. **S19-4** — Page headers (visual consistency)
5. **S19-5** — Touch target sizes (usability)
6. **S19-6** — Card hover states (polish)

---

## SQL Migrations Required

None.

---

## Post-Sprint Test Plan

### Visual Checks (open each page and verify)
1. **Dashboard** — KPI cards have shadows, widget cards have shadows, hover on widgets shows elevation
2. **Projects** — Project cards have consistent border-radius and shadows
3. **Material Library** — Cards/rows consistent, no 5px/6px radius anomalies
4. **Crew Manager** — Crew cards have shadows, day toggles are tappable
5. **Equipment Manager** — Equipment items have consistent styling
6. **Work Orders** — Zone cards have shadows, step buttons have consistent radius
7. **Schedule** — Page header uses PageHeader component, grid unchanged
8. **Manifest Engine** — Page header, project cards consistent
9. **Price Research** — Filter pills have correct radius and touch size
10. **Billing** — Cards consistent (already uses PageHeader — verify no regression)
11. **Settings** — Page header added
12. **Crew App** (`/crew`) — Cards have hover, job cards consistent

### Accessibility Checks
13. Tab through Login page — all inputs show green focus ring
14. Tab through Signup page — all inputs show focus ring
15. Tab through any page with forms — focus rings visible

### Regression Checks
16. Dashboard KPI drawer still opens
17. Widget drag-and-drop still works
18. Schedule: create, edit, drag entries works
19. Crew app: select member, view schedule, tap steps, take photo, status buttons
20. Projects: create, edit zones, delete works
21. Materials: add material works
22. Equipment: add equipment works
