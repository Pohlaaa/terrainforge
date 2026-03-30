# Sprint 12 — UI Design Brief: Visual Polish & Navigation

> **Context**: Phase 1 MVP is functionally complete. This sprint is about making it *feel* like a product, not a prototype. The app works — now it needs to feel alive, connected, and visually compelling for landscaping contractors who spend their day outdoors, not in front of software.
>
> **Your deliverable**: An interactive HTML design preview (`design-preview-v6-polish.html`) covering all items below. Use the same design system tokens from `.claude/DESIGN_SYSTEM.md`. Tablet-first (768-1024px), 44px touch targets, dark/light theme support.

---

## 1. Dashboard — Make It Feel Alive

### KPI Tap-Through
Currently KPI cards at the top of the dashboard are static numbers. Each one should feel tappable and navigate somewhere useful:

| KPI | Tap destination | Visual hint |
|-----|----------------|-------------|
| Active Projects | Projects page (filtered to active) | → arrow or chevron |
| Total Project Value | Projects page (sorted by value) | → arrow |
| Team Size | Crew Manager page | → arrow |
| Fleet Size | Equipment Manager page | → arrow |
| Materials Inventory | Material Library page | → arrow |
| Revenue / Completion Rate / etc. | Relevant filtered view | → arrow |

**Design goal**: Each KPI card should have a subtle "tappable" affordance — maybe a small chevron, a hover/tap lift effect, or a colored accent bar on the left edge. Not a button, but clearly interactive. Consider adding a **sparkline** (tiny trend line) to each KPI to show directionality — even if it's mock data for now, the visual pattern makes the dashboard feel dynamic.

### Widget Tap-Through
Dashboard widgets (Projects, Crew, Fleet, Alerts) show summary data but don't link anywhere. Each should:
- Have a "View All →" link in the header that navigates to the full page
- Individual items within each widget should be tappable (e.g., tapping a project card goes to that project's detail)

### Active Project List
The sidebar shows the active project — but tapping the project name/pill should navigate to that project's detail panel. Add a tap affordance.

---

## 2. Map Widget — Full Experience

Reference: Your v2 map design preview was excellent. Bring that vision fully to life:

### Dashboard Map Widget
- Status-colored pins (green=on track, blue=in progress, amber=attention, red=blocked, gray=not started)
- Pin hover/tap shows popup with: project name, client, address, budget, progress %
- Clicking popup navigates to project detail
- Map/Satellite toggle in header
- Legend overlay (bottom-left) showing status colors
- Auto-fit bounds to show all project markers

### Project Detail Map
- When viewing a single project, show a focused map with that project's pin centered
- Address displayed below the map
- If no coordinates exist for the project, show a prompt: "Add an address to see this project on the map"

---

## 3. Address Verification UX

When creating or editing a project, the address field needs to feel smart:

### Autocomplete Flow
- As user types an address, show dropdown suggestions (think Google Maps autocomplete style)
- Each suggestion shows: street address, city, state
- Selecting a suggestion fills the address field AND stores lat/lng coordinates
- Visual confirmation: small map preview appears below the address field showing the pin location
- If the user types a free-form address that doesn't match suggestions, show a gentle warning: "We couldn't verify this address. Projects with verified addresses appear on the map."

### Visual Design
- Autocomplete dropdown should feel native to the app's card system (rounded corners, shadow, Inter font)
- Selected address gets a green checkmark icon
- Mini map preview: ~120px height, rounded corners, single pin, no controls (just visual confirmation)
- On mobile/tablet: autocomplete dropdown should be full-width and large enough for touch

---

## 4. Visual Uplift — Move Beyond "Template"

This is the most open-ended section. The app currently reads as "clean developer template." For a landscaping SaaS, it should feel more **grounded, professional, and alive**. Some directions to explore:

### Empty States with Personality
Replace emoji + gray text empty states with:
- **Illustration or imagery** — e.g., an illustrated truck, a landscape sketch, a blueprint graphic
- **Action-oriented copy** — "Your first project starts here" instead of "No projects yet"
- **Clear CTA button** — prominent, branded green, with icon

Design empty states for: Dashboard (no projects), Projects list (empty), Material Library (empty), Crew (empty), Equipment (empty).

### Dashboard Header / Greeting
Add a contextual header to the dashboard:
- "Good morning, Charlie" (time-based greeting)
- Today's date
- Quick stats line: "3 projects active, 2 needing attention"
- Optional: weather widget for the user's area (landscaping is weather-dependent)

### Brand Depth
- Consider a subtle **texture or gradient** on the page background instead of flat #FAFAFA
- The sidebar could have a subtle brand mark or pattern at the bottom
- Card borders could use a thin green accent on the left edge for primary content cards
- Section dividers could use a faint landscape-inspired line or mark

### Imagery Ideas
- Project cards could show a **placeholder project photo** (or a solid color/gradient) at the top, like a mini hero image
- The onboarding wizard could use step illustrations (e.g., step 1 shows a clipboard, step 2 shows a truck, step 3 shows a team)
- Settings page integrations could use actual service logos (Stripe, Google Calendar, etc.)

### Data Visualization
- KPI sparklines (tiny trend charts showing last 7 days / 30 days)
- Project progress could be a circular/radial progress indicator instead of a flat bar
- Budget usage could show a filled bar with threshold markers (on budget / over budget)

---

## 5. What NOT to Change

- Don't alter the navigation structure or sidebar layout
- Don't change the color system — stay within the established tokens
- Don't add new pages or features — this is visual/navigation polish only
- Keep all touch targets at 44px minimum
- Keep all animations respecting `prefers-reduced-motion`

---

## Delivery Format

Create a single `design-preview-v6-polish.html` file with tabbed sections:
1. **Dashboard** — KPI tap-through, widget navigation, greeting header, sparklines
2. **Map Experience** — Dashboard widget, project detail map, pin popups
3. **Address Verification** — Autocomplete dropdown, mini map preview, verification states
4. **Empty States** — All 5 empty state designs with illustrations/imagery
5. **Visual Uplift** — Brand depth explorations (textures, accents, imagery on cards)

Use interactive elements where possible (click KPIs to show navigation, type in address field to show autocomplete, toggle between empty/populated states).
