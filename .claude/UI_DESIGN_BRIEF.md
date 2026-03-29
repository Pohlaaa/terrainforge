# TerrainForge UI Design Brief

> **Purpose**: Context file for the UI design iteration session. Read this first to understand all design decisions made so far.

## Product Context

TerrainForge is a SaaS platform for landscaping contractors. Target users are not super tech-savvy — the UI must be functional-first, boutique, and beautiful. Primary device is **tablet** (768-1024px), with desktop as secondary and phone simplified.

## Design Principles

1. **Tablet-first** — 44px minimum touch targets, layouts optimized for 768-1024px
2. **Function-first** — every interaction should reduce clicks, not add them
3. **Contractor-friendly** — readable in direct sunlight (light theme default), no jargon
4. **AI-assisted** — use AI to reduce manual input wherever possible
5. **Customizable** — users shape the dashboard to match how they run their business
6. **Inspired by**: Linear, Monday.com, Asana — visually appealing, highly usable, fast

## Design System Reference

Full design system documented in: `.claude/DESIGN_SYSTEM.md`

## Design Previews (in order of evolution)

1. **`design-preview.html`** — v1: Light/dark theme, project cards, KPI row, detail panel, AI material suggestions
2. **`design-preview-v2-map.html`** — v2: Added mapping (dashboard map widget with status pins, project detail embedded map, Map View nav)
3. **`design-preview-v3-customizable.html`** — v3 (latest): Added customizable KPIs + drag-and-drop dashboard widgets

## Decisions Already Made

### KPI Customization
- Gear icon on KPI row opens a customization drawer (slide-in from right)
- Users pick up to 6 KPIs from a library of 12+, drag to reorder
- **Natural language KPI creation**: text input where user describes what they want to track in plain English, AI parses it into a KPI definition (name, value source, description)
- Example prompts as clickable chips for discoverability
- KPI selection persists per-user in Supabase (`user_preferences` JSONB or dedicated table)
- Onboarding should include a conversational step: "What matters most to you?" → user types → dashboard populates

### Dashboard Widget System
- Entire dashboard is a drag-and-drop canvas (like Notion blocks or Monday dashboard builder)
- Each section (KPI row, map, project list, future widgets) is a moveable widget
- "Edit Layout" mode with dashed borders, visible drag handles, drop zones
- "Add Widget" button in edit mode with widget type picker (Chart, Notes, Calendar, Activity Feed)
- Layout persists per-user

### Mapping
- Dashboard map widget: status-colored pins (green=on track, blue=in progress, amber=attention, red=blocked)
- Hover tooltips on pins showing project names
- Map/Satellite toggle
- Color legend overlay
- Active projects list sidebar next to map
- Project detail panel embedded map with jobsite pin, zoom controls, address overlay
- "Map View" nav item in sidebar for full-screen map experience
- Mapbox GL JS for production implementation

### Color System
- Light theme default (outdoor readability)
- Dark theme via `[data-theme="dark"]` CSS custom properties
- Brand: `#2D6A4F` (forest green), `#D4A843` (gold accent)
- Sidebar: dark navy (`#0F172A`) in both themes
- Status colors: green (on track), blue (in progress), amber (attention), red (blocked), gray (not started)

### Layout System
- Sidebar: 240px desktop, 64px (icons only) tablet, hidden on phone
- Slide-in detail panels (Linear-style) at 55% width
- Card grid: 3-col desktop, 2-col tablet, 1-col phone
- View modes: Card grid, List, Kanban board

### Typography
- Inter font, weights 400/500/600/700
- Scale: 12px caption → 24px heading-xl

## What's Next for Design Iteration

These are the open design questions and features to explore:

1. **Onboarding flow** — conversational setup wizard where user describes their business, AI configures dashboard
2. **Widget library expansion** — what other widgets do contractors need? (Weather? Schedule? Invoicing?)
3. **Project creation flow** — AI smart creation already built, but the form UI needs the v3 design language
4. **Material management UI** — how does the material loop (add, import, track, order) look in the new design?
5. **Crew assignment UI** — how does assigning crew to projects/zones look?
6. **Settings page** — theme toggle, notification preferences, profile, integrations
7. **Mobile-specific layouts** — phone bottom nav, simplified views
8. **Animations and micro-interactions** — loading states, transitions, empty states
9. **Notification system** — in-app notifications, deadline alerts, material order updates

## Tech Stack (for awareness)

- React 18 + Vite + TypeScript + Zustand + Supabase + Netlify
- CSS custom properties for theming
- Mapbox GL JS for maps
- Design tokens should map to CSS variables already in `src/index.css`
