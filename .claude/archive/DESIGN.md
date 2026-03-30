# TerrainForge — UI Design System & Iteration Process

## Design Identity
TerrainForge is a professional tool for people who work outdoors. The design should feel sturdy, focused, and modern — not like a generic SaaS dashboard. Dark mode is the primary experience. Green is the brand color. Density matters — landscapers are checking this on a tablet at a job site, not leaning back in an Aeron chair.

## Color System (CSS Custom Properties)
All colors are defined in `src/index.css`. Never hardcode hex values in components.

```
Brand
--green:     #2D6A4F   (primary actions, active states)
--green-l:   #74C69D   (highlights, hover states, icons)

Surfaces
--surface:   #111810   (page background)
--surface2:  #161E14   (card/panel background)
--surface3:  #1E2B1A   (input background, hover)
--border:    #2A3D26   (dividers, input borders)

Text
--text:      #F0F4EE   (primary content)
--text-2:    #A8BAA3   (secondary labels)
--text-3:    #6B7E67   (tertiary, placeholders)
--text-4:    #3D4F3A   (disabled)

Semantic
--red:       #E05C5C   --red-l:    #F4A0A0
--amber:     #D4A44C   --amber-l:  #F0CC7A
--blue:      #4A8DB5   --blue-l:   #89C4E1
--purple:    #7B68B5   --purple-l: #B8ADE0
--teal:      #3D9E8C   --teal-l:   #7ECDC0
```

## Typography
- Font: Inter (via Google Fonts CDN in index.html)
- Scale: text-xs (10px) / text-sm (12px) / text-base (14px) / text-lg (16px) / text-xl (18px)
- Page titles: text-xl font-semibold text-[var(--text)]
- Section headers: text-sm font-semibold text-[var(--text-2)] uppercase tracking-wider
- Body: text-sm text-[var(--text)]
- Labels: text-xs text-[var(--text-2)]

## Component Design Patterns

### Cards
```
bg-[var(--surface2)] rounded-lg border border-[var(--border)] p-4
```

### Buttons (use the Button component, don't write raw buttons)
- Primary: green fill, for the single most important action on a page
- Secondary: outlined, for secondary actions
- Danger: red, for destructive actions
- Ghost: no background, for low-emphasis actions

### Status Badges (use the Badge component)
- Green (`--green-l`): active, complete, available
- Amber (`--amber-l`): pending, needs attention, partial
- Red (`--red-l`): overdue, error, unavailable
- Blue (`--blue-l`): in progress, draft
- Default (text-3): inactive, archived

### Tables
- Use the DataTable shared component
- Alternating row background: every other row gets `bg-[var(--surface3)]`
- Column headers: text-xs uppercase tracking-wider text-[var(--text-2)]
- Clickable rows: cursor-pointer, hover:bg-[var(--surface3)]

### Forms
- Input background: `bg-[var(--surface3)] border border-[var(--border)]`
- Focus ring: `focus:ring-1 focus:ring-[var(--green)]`
- Error state: border turns `--red`, error message below in text-xs text-[var(--red-l)]
- Label: text-xs text-[var(--text-2)] mb-1

## Layout Grid
- Sidebar: 220px fixed width
- Main content: flex-1, overflow-auto, p-6
- Dashboard KPI row: 4-column grid on desktop, 2-column on tablet
- Page max-width: none — the app is full-bleed, not centered
- Mobile: sidebar collapses to icon rail (not yet implemented, Phase 1 can be desktop-only)

## How to Iterate on Design
When Charlie requests a design change, follow this order:
1. **Identify scope** — Is this a theme change (update CSS variables), a component change (update shared component), or a layout change (update the page)?
2. **Minimal surface area** — Change the CSS variable if possible before touching components
3. **Consistency check** — If changing a color, check all places that use that variable
4. **Show the change** — Take a screenshot or describe exactly what changed in plain language

## Design Decisions to NOT Revisit Without Good Reason
- Dark mode as default (brand decision, not negotiable)
- Inter as the typeface (clean, legible at small sizes, free)
- Green as the primary brand color (established in the prototype, should be consistent across product + marketing)
- High information density (landscapers are professionals, not consumers — they want data visible, not hidden behind clicks)

## Accessibility Minimums
- All interactive elements must be keyboard-accessible
- Contrast ratio: AA minimum (4.5:1 for normal text) — the dark theme already satisfies this
- Error states can't rely on color alon