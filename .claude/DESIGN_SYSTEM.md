# TerrainForge — Design System

> **Last updated**: 2026-04-03 (UI hub rebuild — 4-tab layout)
> **Figma reference**: `https://www.figma.com/make/8U9qU4ZFoP9LgOcEiUtnPC/Landscaping-Project-Management-Dashboard`
> **CSS source of truth**: `src/index.css`

## Design Identity

TerrainForge is a professional tool for people who work outdoors. The design should feel sturdy, focused, and modern — not like a generic SaaS dashboard. Dark theme is the default, light theme available via toggle. Green is the brand color. Density matters — landscapers are checking this on a tablet at a job site.

### Decisions That Are Final
- Dark mode as default (brand decision), light mode via user toggle
- Inter as the typeface (clean, legible at small sizes, free)
- Green (#2D6A4F light / #34D399 dark) as the primary brand color
- High information density (professionals want data visible, not hidden behind clicks)
- 4-tab hub layout with top navigation bar (no sidebar)
- Consistent tab pattern: KPI cards → visualization → data table

## Design Philosophy
Inspired by Linear (speed, clarity), Monday (visual status), and the Figma template layout (clean hub tabs with consistent card/chart/table sections) — adapted for contractors on tablets in the field. Every design decision passes the "muddy hands test": can a contractor standing in a yard, holding a tablet in one hand, use this feature without frustration?

## Core Principles

1. **Glanceable** — Status, progress, and priorities visible without tapping into anything
2. **Touch-first** — Every interactive element designed for thumbs, not cursors
3. **Fast** — Transitions under 200ms, no loading spinners for cached data, optimistic UI everywhere
4. **Contextual** — Show only what matters for the current task, hide everything else behind one tap
5. **Professional** — Clean enough to show a client during a walkthrough

## Layout System

### App Shell
```
┌──────────────────────────────────────────────────────────────────┐
│ [TF Logo]  Projects  Budget & Finance  Materials  Crew & Equip  │
│                                            [🔔] [More ▾] [👤]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Tab Content Area (full width, scrollable)                       │
│                                                                   │
│  ┌─ KPI Cards ──────────────────────────────────────────────┐   │
│  │ [Card 1]  [Card 2]  [Card 3]  [Card 4]                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Visualization ──────────────────────────────────────────┐   │
│  │ Chart / Map / Schedule Grid                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ Data Table ─────────────────────────────────────────────┐   │
│  │ Sortable, filterable table of primary entities            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Top Navigation Bar
- Fixed at top of viewport, full width
- Height: 56px
- Background: `var(--surface-card)` with bottom border `var(--border-default)`
- Left: Logo (links to `/`)
- Center-left: 4 tab links — active tab gets a 2px bottom border in `var(--brand-primary)` and `var(--text-primary)` text; inactive tabs use `var(--text-secondary)`
- Right: Alert bell icon, "More" dropdown (secondary pages), user avatar dropdown (theme toggle, sign out)

### TopNav Responsive Behavior
- Desktop (>1024px): Full tab labels, all right-side icons visible
- Tablet (640-1024px): Abbreviated tab labels (e.g., "Crew & Equip" → "Crew"), icons visible
- Phone (<640px): Hamburger menu icon replaces tab links. Tapping opens a slide-out drawer with all nav items.

### "More" Dropdown
Contains secondary pages: Manifest Engine, Work Orders, Price Research, Settings, Billing. Styled as a standard dropdown menu with `var(--surface-card)` background and `var(--shadow-panel)` shadow.

### User Avatar Dropdown
- User name and email
- Theme toggle (Dark / Light) — switch component
- Sign Out button

### Hub Tab Content Pattern
Every hub tab follows the same 3-section layout:
1. **KPI Cards** — row of 4 cards at top. Each card: title (caption size, `var(--text-tertiary)`), value (heading-lg, `var(--text-primary)`), optional trend indicator (green up arrow or red down arrow with % change).
2. **Visualization** — chart area. Projects tab has a chart/map toggle. Materials tab has an alert banner. Crew & Equipment tab has a split view (crew cards left, schedule grid right).
3. **Data Table** — full-width table with sortable columns, search/filter bar, and an action button (e.g., "+ New Project", "+ Add Material").

### Detail Navigation
Clicking a project in any table navigates to `/projects/:id` (ProjectDashboard with 6 tabs). This is a full page navigation, not a panel overlay. Back navigation via browser back button or breadcrumb.

### Page Header (Secondary Pages)
Secondary pages (Manifest Engine, Work Orders, etc.) keep the standard page header pattern:
- Fixed at top of content area (below TopNav)
- Contains: page title (left), optional search bar (center), primary action button (right)

## Color System

### Light Theme (`:root` in index.css)
```css
/* Surfaces */
--surface-bg: #FAFAFA;          /* Page background */
--surface-card: #FFFFFF;        /* Card/panel/nav background */
--surface-hover: #F3F4F6;       /* Hover state on cards/rows */
--surface-active: #E5E7EB;      /* Active/pressed state */
--surface-selected: #D1FAE5;    /* Selected item highlight (green tint) */

/* Text */
--text-primary: #111827;        /* Headings, primary content */
--text-secondary: #4B5563;      /* Body text, descriptions, inactive tabs */
--text-tertiary: #9CA3AF;       /* Timestamps, metadata, KPI labels */
--text-disabled: #D1D5DB;       /* Disabled state */

/* Brand */
--brand-primary: #2D6A4F;       /* Primary actions, active tab indicator, links */
--brand-primary-hover: #245A42;
--brand-primary-bg: #D1FAE5;    /* Light green background for selected/active */
--brand-secondary: #D4A843;     /* Accent, warnings, highlights */

/* Borders */
--border-light: #F3F4F6;        /* Subtle dividers within cards */
--border-default: #E5E7EB;      /* Card borders, nav bottom border, input borders */
--border-strong: #D1D5DB;       /* Emphasized borders, hover state */

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-hover: 0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
--shadow-panel: 0 8px 24px rgba(0,0,0,0.12);

/* Status colors */
--status-green: #16A34A;        /* On track, complete, positive trend */
--status-green-bg: #DCFCE7;
--status-amber: #F59E0B;        /* Needs attention, low stock */
--status-amber-bg: #FEF3C7;
--status-red: #DC2626;          /* Blocked, overdue, negative trend */
--status-red-bg: #FEE2E2;
--status-blue: #2563EB;         /* In progress */
--status-blue-bg: #DBEAFE;
--status-gray: #9CA3AF;         /* Not started, draft */
--status-gray-bg: #F3F4F6;
```

### Dark Theme (`[data-theme="dark"]` in index.css)
```css
--surface-bg: #0F172A;
--surface-card: #1E293B;
--surface-hover: #334155;
--surface-active: #475569;
--surface-selected: #064E3B;

--text-primary: #F1F5F9;
--text-secondary: #CBD5E1;
--text-tertiary: #64748B;
--text-disabled: #475569;

--brand-primary: #34D399;      /* Brighter green for dark bg readability */
--brand-primary-hover: #6EE7B7;
--brand-primary-bg: #064E3B;

--border-light: #1E293B;
--border-default: #334155;
--border-strong: #475569;

--shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
--shadow-card: 0 1px 3px rgba(0,0,0,0.3);
--shadow-hover: 0 4px 8px rgba(0,0,0,0.3);
--shadow-panel: 0 8px 24px rgba(0,0,0,0.4);

--status-green-bg: #064E3B;
--status-amber-bg: #78350F;
--status-red-bg: #7F1D1D;
--status-blue-bg: #1E3A5F;
--status-gray-bg: #1E293B;
```

### Theme Toggle Implementation
- Theme stored in `uiStore` (localStorage)
- Applied via `document.documentElement.setAttribute('data-theme', theme)`
- Default: `'dark'`
- Toggle location: user avatar dropdown in TopNav

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
Inter loaded via Google Fonts CDN.

### Scale
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| heading-xl | 24px / 1.75rem | 700 | Page titles (secondary pages only) |
| heading-lg | 20px / 1.25rem | 600 | KPI values, section headers |
| heading-md | 16px / 1rem | 600 | Card titles, modal headers, tab labels |
| body | 14px / 0.875rem | 400 | Default body text, table cells |
| body-sm | 13px / 0.8125rem | 400 | Secondary text, metadata |
| caption | 12px / 0.75rem | 500 | KPI labels, badges, timestamps |
| overline | 11px / 0.6875rem | 600 | Section labels, uppercase tracking |

### Rules
- Never use font size below 13px on mobile/tablet — unreadable in sunlight
- Line height: 1.5 for body, 1.3 for headings
- Letter spacing: -0.01em on headings (tighter), 0 on body

## Component Library

### KPI Card
```
┌──────────────────────────┐
│ ▎ Total Revenue          │  ← Green left accent bar (4px), caption label
│ ▎ $124,500               │  ← heading-lg value
│ ▎ ↑ 12.5% from last mo  │  ← Optional trend (green up / red down + %)
└──────────────────────────┘
```
- 4 cards per row on desktop, 2×2 on tablet, stacked on phone
- Background: `var(--surface-card)`
- Border: `1px solid var(--border-default)`
- Left accent: `4px solid var(--brand-primary)` (class: `kpi-card-accent`)
- Shadow: `var(--shadow-card)`
- Padding: 16px
- Min width: 200px

### Data Table
- Full-width within content area
- Header row: `var(--surface-hover)` background, caption text, sortable columns (click to sort)
- Body rows: alternating `var(--surface-bg)` and `var(--surface-card)` or hover with `var(--surface-hover)`
- Row height: 48px minimum (touch-friendly)
- Search/filter bar above table
- Action button top-right (e.g., "+ New Project")
- Pagination or infinite scroll for long lists

### Status Badges
```
[ ● Not Started ]  gray
[ ● Planning    ]  blue
[ ● In Progress ]  green
[ ● On Hold     ]  amber
[ ● Completed   ]  green (filled)
[ ● Cancelled   ]  red
```
- Rounded pill shape, 24px height
- Status dot (8px) + label text
- Background uses status color at 10% opacity

### Progress Bar
- Used in project tables to show completion %
- Height: 4px (thin bar) or 8px (standard)
- Background: `var(--surface-hover)`
- Fill: `var(--status-green)` for progress, `var(--status-blue)` for secondary metric
- Text label next to bar: completion %

### Crew Card (Crew & Equipment tab)
```
┌──────────────────────────┐
│ John Smith          📞   │  ← Name + phone icon
│ Foreman                  │  ← Role
│ Assigned: Oak Street     │  ← Current project or "Available"
│ [excavation] [grading]   │  ← Skill tags
└──────────────────────────┘
```
- Background: `var(--surface-card)`
- Border: `1px solid var(--border-default)`
- Click opens edit modal
- "Available" state uses `var(--status-green)` text

### Alert Banner (Materials tab)
```
┌─ ⚠ ─────────────────────────────────────────────┐
│  Low stock: Mulch (5 bags), Pavers (12 units)    │
└──────────────────────────────────────────────────┘
```
- Background: `var(--status-amber-bg)`
- Left border or icon: `var(--status-amber)`
- Text: `var(--text-primary)`
- Only shows when low stock items exist

### Buttons
| Type | Use | Style |
|------|-----|-------|
| Primary | Main action ("Create Project", "Save") | Green bg, white text, rounded-lg |
| Secondary | Supporting action ("Cancel", "Back") | `var(--surface-card)` bg, border, dark text |
| Ghost | Tertiary action ("Skip", "Maybe later") | No bg, no border, green text |
| Danger | Destructive action ("Delete") | Red bg, white text — only in confirmation dialogs |
| Icon | Toolbar actions, nav icons | 40x40px, rounded-full, ghost style, icon centered |

- All buttons: minimum height 44px (touch target), rounded-lg (8px radius via `var(--radius-md)`)
- Primary button: only ONE per view/modal
- Loading state: replace label with a small spinner, keep button width stable

### Form Inputs
- Height: 44px minimum (touch target)
- Border: `1px solid var(--border-default)`, `var(--radius-md)` radius
- Focus: 2px ring in `var(--brand-primary)`, border changes to `var(--brand-primary)`
- Error: red border, red ring, error message below in caption size
- Label: caption size, above the input, `var(--text-secondary)` color
- Placeholder: `var(--text-tertiary)`, never use as the label

### Modal / Dialog
- Centered on desktop, slides up from bottom on mobile (bottom sheet pattern)
- Max width: 480px for forms, 640px for detail views
- Overlay: black at 40% opacity
- Close: X button in top-right + tap overlay + Escape key
- Animation: fade in overlay (150ms) + slide up content (200ms ease-out)

### Toast / Notifications
- Appears bottom-center on desktop, top-center on mobile
- Auto-dismiss after 3 seconds for success, persist until dismissed for errors
- Types: success (green left border), error (red), info (blue), warning (amber)
- Max width: 400px, single line when possible

### Empty States
- Centered illustration or icon (64px, muted color)
- Heading: "No projects yet"
- Subtitle: "Create your first project to get started"
- Primary CTA button below
- Never show an empty table or empty grid — always show the empty state

## Charts (Recharts)

### Bar Chart (Projects tab — project progress overview)
- Horizontal or vertical bars per project
- Green fill for completed portion, gray/blue for remaining
- Y-axis: project names (truncated to ~20 chars)
- X-axis: percentage (0-100%)
- Tooltip on hover: project name, completion %, budget info

### Line Chart (Budget tab — revenue vs expenses)
- Two lines: revenue (green), expenses (red/amber)
- X-axis: months (last 6)
- Y-axis: dollar amounts
- Grid lines: `var(--border-light)`

### Donut/Pie Chart (Budget tab — expense breakdown)
- Categories: Labor, Materials, Equipment, Disposal, Overhead
- Legend below or beside chart
- Colors: use distinct brand/status colors for each segment

### Chart Styling
- Background: transparent (inherits card background)
- Text: `var(--text-secondary)` for axis labels
- Grid: `var(--border-light)`
- Tooltip: `var(--surface-card)` bg, `var(--shadow-panel)` shadow, `var(--text-primary)` text

## Motion & Transitions

### Principles
- Every transition under 200ms — the app should feel instant
- Use ease-out for entrances, ease-in for exits
- Never animate content the user is trying to read
- Disable all animations if `prefers-reduced-motion: reduce`

### Standard Transitions
| Action | Animation | Duration |
|--------|-----------|----------|
| Tab switch | Content fade | 100ms ease |
| Detail page navigate | Browser default | instant |
| Modal open | Fade overlay + scale up from 95% | 150ms ease-out |
| Modal close | Fade out | 100ms ease-in |
| Card hover | Shadow elevation increase | 100ms ease |
| Toast appear | Slide up + fade in | 200ms ease-out |
| Toast dismiss | Fade out + slide down | 100ms ease-in |
| Loading skeleton | Pulse animation | 1.5s infinite |
| Dropdown open | Scale from 95% + fade | 100ms ease-out |

### Loading States
- Never show a blank page — show skeleton loaders (gray pulsing rectangles matching content layout)
- Skeleton class: `.skeleton-shimmer` (defined in index.css)
- For tab switches: show skeleton KPI cards + table rows until data loads
- For inline loads: show a subtle spinner next to the section header

## Radius Tokens
```css
--radius-sm: 6px;    /* Badges, small pills */
--radius-md: 8px;    /* Buttons, inputs, cards */
--radius-lg: 12px;   /* Larger cards, modals */
--radius-xl: 16px;   /* Full panels */
```

## Accessibility Requirements
- Color contrast: minimum 4.5:1 for body text, 3:1 for large text (WCAG AA)
- Focus indicators: visible 2px ring on all interactive elements
- Touch targets: minimum 44x44px
- Screen reader: all icons have aria-labels, status dots have sr-only text
- Reduced motion: respect `prefers-reduced-motion` media query (all animations have a disable rule in index.css)

## Responsive Breakpoints
```css
/* Phone */
@media (max-width: 639px) { ... }

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }
```

### KPI Card Grid
- Desktop: 4 across (`grid-cols-4`)
- Tablet: 2×2 (`grid-cols-2`)
- Phone: stacked (`grid-cols-1`)

### Crew & Equipment Split View
- Desktop: 50/50 split (crew cards left, schedule right)
- Tablet: stacked (crew cards above schedule)
- Phone: stacked

## Implementation Notes

### CSS Variable Naming
The design spec variable names (above) **are** the actual variable names in `src/index.css`. Legacy aliases (e.g., `--surface`, `--text`, `--border`) exist for backward compatibility but should NOT be used in new code. Always use the full semantic names: `--surface-bg`, `--text-primary`, `--border-default`.

### Sidebar Variables — DEPRECATED
The following variables exist in `index.css` but are no longer used after the hub rebuild:
```css
--sidebar-bg, --sidebar-hover, --sidebar-active, --sidebar-text,
--sidebar-text-muted, --sidebar-border, --sidebar-accent
```
These can be cleaned up in a future pass. Do not reference them in new code.

### Legacy Aliases — DO NOT USE
```css
--surface, --surface2, --surface3, --border, --border2,
--text, --text-2, --text-3, --text-4, --bg-primary, --bg-secondary,
--bg-surface, --color-primary, etc.
```
These are kept for components not yet migrated. All new code uses the semantic names.

## How to Iterate on Design

1. **Identify scope** — Is this a theme change (update CSS variables), a component change (update shared component), or a layout change (update the page)?
2. **Minimal surface area** — Change the CSS variable if possible before touching components
3. **Consistency check** — If changing a color, check all places that use that variable
4. **Hub tab consistency** — All 4 tabs must follow the same KPI → visualization → table pattern
5. **Dark + light** — Every visual change must work in both themes. Test by toggling.
