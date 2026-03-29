# TerrainForge — Design System v2

## Design Philosophy
TerrainForge should feel like a premium native app, not a web dashboard. Inspired by Linear (speed, clarity), Monday (visual status), and Asana (view flexibility) — but adapted for contractors on tablets in the field. Every design decision passes the "muddy hands test": can a contractor standing in a yard, holding a tablet in one hand, use this feature without frustration?

## Core Principles

1. **Glanceable** — Status, progress, and priorities visible without tapping into anything
2. **Touch-first** — Every interactive element designed for thumbs, not cursors
3. **Fast** — Transitions under 200ms, no loading spinners for cached data, optimistic UI everywhere
4. **Contextual** — Show only what matters for the current task, hide everything else behind one tap
5. **Professional** — Clean enough to show a client during a walkthrough

## Layout System

### Page Structure
```
┌─────────────────────────────────────────────────┐
│ Sidebar (dark)  │  Page Content (light)          │
│                 │                                 │
│  [Logo]         │  ┌─ Page Header ─────────────┐ │
│                 │  │ Title    [Search] [+ New]  │ │
│  Dashboard      │  └───────────────────────────┘ │
│  Projects       │                                 │
│  Materials      │  ┌─ View Toggle ─────────────┐ │
│  Crew           │  │ [List] [Board] [Calendar]  │ │
│  Equipment      │  └───────────────────────────┘ │
│  ...            │                                 │
│                 │  ┌─ Content Area ─────────────┐ │
│  ─────────      │  │                             │ │
│  [Settings]     │  │  Cards / List / Board       │ │
│                 │  │                             │ │
│                 │  └───────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Sidebar Behavior
- Desktop (>1024px): Full sidebar with icons + labels, 240px wide
- Tablet (640-1024px): Collapsed to icon-only rail, 64px wide. Tap icon = navigate. Long-press = show tooltip label.
- Phone (<640px): Hidden. Hamburger icon in top-left. Slides over content as overlay.

### Detail Panel (Linear-style)
When tapping a project card (or material, crew, equipment):
- Detail slides in from the right as a panel overlay (not a new page)
- Panel width: 60% on desktop, 85% on tablet, 100% on phone
- Background content dims slightly but stays visible
- Tap outside or swipe right to close
- This keeps the user's place in the list — no "back button" navigation

### Page Header
- Fixed at top of content area (not the viewport — sidebar stays fixed)
- Contains: page title (left), search bar (center, collapsible on mobile), primary action button (right)
- Primary action button: "+ New Project", "+ Add Material", etc. — always one tap away
- On phone: search collapses to a search icon that expands on tap

## Color System

### Light Theme (default)
```css
/* Surfaces */
--surface-bg: #FAFAFA;          /* Page background */
--surface-card: #FFFFFF;        /* Card/panel background */
--surface-hover: #F3F4F6;       /* Hover state on cards */
--surface-active: #E5E7EB;      /* Active/pressed state */
--surface-selected: #D1FAE5;    /* Selected item highlight (green tint) */

/* Text */
--text-primary: #111827;        /* Headings, primary content */
--text-secondary: #4B5563;      /* Body text, descriptions */
--text-tertiary: #9CA3AF;       /* Timestamps, metadata, placeholders */
--text-disabled: #D1D5DB;       /* Disabled state */

/* Brand */
--brand-primary: #2D6A4F;       /* Primary actions, links, active nav */
--brand-primary-hover: #245A42;
--brand-primary-bg: #D1FAE5;    /* Light green background for selected/active */
--brand-secondary: #D4A843;     /* Accent, warnings, highlights */

/* Borders */
--border-light: #F3F4F6;        /* Subtle dividers within cards */
--border-default: #E5E7EB;      /* Card borders, input borders */
--border-strong: #D1D5DB;       /* Emphasized borders */

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
--shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-hover: 0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
--shadow-panel: 0 8px 24px rgba(0,0,0,0.12);

/* Status colors */
--status-green: #16A34A;        /* On track, complete */
--status-green-bg: #DCFCE7;
--status-amber: #F59E0B;        /* Needs attention */
--status-amber-bg: #FEF3C7;
--status-red: #DC2626;          /* Blocked, overdue */
--status-red-bg: #FEE2E2;
--status-blue: #2563EB;         /* In progress */
--status-blue-bg: #DBEAFE;
--status-gray: #9CA3AF;         /* Not started, draft */
--status-gray-bg: #F3F4F6;
```

### Dark Theme
```css
[data-theme="dark"] {
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
}
```

### Sidebar (always dark, both themes)
```css
--sidebar-bg: #0F172A;
--sidebar-hover: #1E293B;
--sidebar-active: #334155;
--sidebar-text: #E2E8F0;
--sidebar-text-muted: #94A3B8;
--sidebar-border: #1E293B;
--sidebar-accent: #34D399;       /* Active nav indicator */
```

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```
Inter is available via Google Fonts CDN. It's the standard for modern SaaS apps (Linear, Vercel, Resend all use it). If loading a web font is undesirable, the system font stack alone is fine.

### Scale
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| heading-xl | 24px / 1.75rem | 700 | Page titles |
| heading-lg | 20px / 1.25rem | 600 | Section headers |
| heading-md | 16px / 1rem | 600 | Card titles, modal headers |
| body | 14px / 0.875rem | 400 | Default body text |
| body-sm | 13px / 0.8125rem | 400 | Secondary text, metadata |
| caption | 12px / 0.75rem | 500 | Labels, badges, timestamps |
| overline | 11px / 0.6875rem | 600 | Section labels, uppercase tracking |

### Rules
- Never use font size below 13px on mobile/tablet — unreadable in sunlight
- Line height: 1.5 for body, 1.3 for headings
- Letter spacing: -0.01em on headings (tighter), 0 on body

## Component Library

### Cards (Project, Material, Equipment, Crew)
```
┌──────────────────────────────────┐
│ ● Status    Project Name    ...  │  ← Header: status dot + title + overflow menu
│                                  │
│ 123 Oak Street                   │  ← Subtitle / address
│                                  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐    │  ← Metadata chips
│ │$5K │ │3👷│ │12🧱│ │Mar 15│   │
│ └────┘ └────┘ └────┘ └────┘    │
│                                  │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░ 65%          │  ← Progress bar
└──────────────────────────────────┘
```

- Entire card is tappable (opens detail panel)
- Status dot: colored circle (6px) in top-left — maps to project status
- Overflow menu (`...`): appears on hover (desktop) or is always visible (mobile)
- Metadata chips: small rounded pills showing key metrics at a glance
- Progress bar: thin (4px) bar at bottom showing project completion
- Card height: minimum 120px, consistent across the grid
- Card spacing: 12px gap in grid

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

### Buttons
| Type | Use | Style |
|------|-----|-------|
| Primary | Main action ("Create Project", "Save") | Green bg, white text, rounded-lg |
| Secondary | Supporting action ("Cancel", "Back") | White bg, gray border, dark text |
| Ghost | Tertiary action ("Skip", "Maybe later") | No bg, no border, green text |
| Danger | Destructive action ("Delete") | Red bg, white text — only in confirmation dialogs |
| Icon | Toolbar actions | 40x40px, rounded-full, ghost style, icon centered |

- All buttons: minimum height 44px (touch target), rounded-lg (8px radius)
- Primary button: only ONE per view/modal. If there are two green buttons visible, something is wrong.
- Loading state: replace label with a small spinner, keep button width stable

### Form Inputs
- Height: 44px minimum (touch target)
- Border: 1px solid var(--border-default), rounded-lg
- Focus: 2px ring in brand-primary color, border changes to brand-primary
- Error: red border, red ring, error message below in caption size
- Label: caption size, above the input, text-secondary color
- Placeholder: text-tertiary, never use as the label

### Modal / Dialog
- Centered on desktop, slides up from bottom on mobile (bottom sheet pattern)
- Max width: 480px for forms, 640px for detail views
- Overlay: black at 40% opacity
- Close: X button in top-right + tap overlay + Escape key
- Animation: fade in overlay (150ms) + slide up content (200ms ease-out)

### Toast / Notifications
- Appears bottom-center on desktop, top-center on mobile (away from thumb zone)
- Auto-dismiss after 3 seconds for success, persist until dismissed for errors
- Types: success (green left border), error (red), info (blue), warning (amber)
- Max width: 400px, single line when possible

### Empty States
- Centered illustration or icon (64px, muted color)
- Heading: "No projects yet"
- Subtitle: "Create your first project to get started"
- Primary CTA button below
- Never show an empty table or empty grid — always show the empty state

## Motion & Transitions

### Principles
- Every transition should be under 200ms — the app should feel instant
- Use ease-out for entrances, ease-in for exits
- Never animate content that the user is trying to read
- Disable all animations if the user has `prefers-reduced-motion: reduce`

### Standard Transitions
| Action | Animation | Duration |
|--------|-----------|----------|
| Page navigation | Content fade + slight slide up | 150ms ease-out |
| Detail panel open | Slide in from right | 200ms ease-out |
| Detail panel close | Slide out to right | 150ms ease-in |
| Modal open | Fade overlay + scale up content from 95% | 150ms ease-out |
| Modal close | Fade out | 100ms ease-in |
| Card hover | Shadow elevation increase | 100ms ease |
| Toast appear | Slide up + fade in | 200ms ease-out |
| Toast dismiss | Fade out + slide down | 100ms ease-in |
| Loading skeleton | Pulse animation | 1.5s infinite |

### Loading States
- Never show a blank page — show skeleton loaders (gray pulsing rectangles matching content layout)
- For inline loads (fetching materials for a project): show a subtle spinner next to the section header
- For full page loads: show skeleton cards in the same grid layout as real cards

## View Modes

### Projects Page — Three Views
1. **Card Grid** (default) — responsive grid of project cards. Best for overview.
2. **List View** — compact rows with status, name, dates, budget in columns. Best for scanning many projects.
3. **Board View** (kanban) — columns for each status (Not Started, Planning, In Progress, Complete). Drag cards between columns to update status. Best for workflow management.

Toggle between views using a segmented control in the page header. Persist the user's preferred view in localStorage.

### Material Library — Two Views
1. **Grid** — material cards with name, supplier, quantity, cost
2. **Table** — dense list view for bulk management and CSV import preview

### Dashboard
Single view, but with customizable widget ordering (future). Current layout:
- Top row: KPI cards (active projects, total budget, materials cost, crew deployed)
- Middle: active projects list (compact cards, sorted by nearest deadline)
- Bottom: alerts / notifications

## Accessibility Requirements
- Color contrast: minimum 4.5:1 for body text, 3:1 for large text (WCAG AA)
- Focus indicators: visible 2px ring on all interactive elements (keyboard and programmatic focus)
- Touch targets: minimum 44x44px
- Screen reader: all icons have aria-labels, status dots have sr-only text
- Reduced motion: respect prefers-reduced-motion media query

## Responsive Breakpoints (reminder)
```css
/* Phone */
@media (max-width: 639px) { ... }

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }
```

## Implementation Priority
1. Color tokens + typography (foundation for everything)
2. Card component (used on every page)
3. Detail panel pattern (replaces page navigation)
4. Status badges + progress bars (visual tracking)
5. View toggle (card/list/board)
6. Motion system (polish layer)
7. Empty states (UX completeness)
