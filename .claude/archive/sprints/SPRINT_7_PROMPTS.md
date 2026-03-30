# Sprint 7 — UI/UX Overhaul + Core Workflow Completion

**Goal:** Transform TerrainForge from a functional prototype into a professional, tablet-friendly project management app that a contractor would use daily. Focus on three pillars: responsive layout, visual polish, and interaction streamlining.

**Done when:** A contractor can create a project on a tablet, add materials, assign crew, and manage the job without needing a desktop or a spreadsheet on the side. The app looks professional enough to show a client.

**Execution:** Read `.claude/SPRINT_EXECUTION.md` for the autonomous workflow. Execute tasks S7-1 through S7-6 sequentially. Each task must pass `npm run build` before committing.

**SQL migrations:** Write all DB changes to `.claude/SQL/sprint_7_migrations.sql` — Charlie will run them manually.

---

## S7-1: Color Palette + Theme Overhaul (Foundation)

**Context:** The current dark theme is hard to read in sunlight and looks developer-oriented. Contractors use tablets/phones on jobsites in bright conditions. We need a light-dominant, professional theme.

**Design direction:**
- Light background (white/off-white: `#FAFAFA` or `#F5F5F5`) for main content areas
- Clean white cards/panels with subtle shadows (`box-shadow: 0 1px 3px rgba(0,0,0,0.1)`)
- Primary brand color: forest green `#2D6A4F` — used for nav bar, primary buttons, active states
- Secondary accent: warm amber `#D4A843` — used for warnings, highlights, CTAs
- Text: dark gray `#1A1A2E` on light backgrounds (high contrast, daylight readable)
- Subtle borders: `#E5E7EB` for card edges and dividers
- Error red: `#DC2626`, Success green: `#16A34A`, Info blue: `#2563EB`
- Sidebar: keep it dark (`#1A1A2E` background, white text) for visual hierarchy contrast against light content

**Changes required:**

**`src/index.css` (or wherever CSS custom properties are defined)**
Replace the dark theme custom properties with light theme values:
```css
:root {
  /* Backgrounds */
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --bg-surface: #FFFFFF;
  --bg-sidebar: #1A1A2E;

  /* Text */
  --text-primary: #1A1A2E;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;
  --text-on-dark: #FFFFFF;
  --text-on-primary: #FFFFFF;

  /* Brand */
  --color-primary: #2D6A4F;
  --color-primary-hover: #245A42;
  --color-primary-light: #D1FAE5;
  --color-secondary: #D4A843;
  --color-secondary-hover: #C49A3A;

  /* Borders & Shadows */
  --border-color: #E5E7EB;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Status */
  --color-error: #DC2626;
  --color-success: #16A34A;
  --color-warning: #F59E0B;
  --color-info: #2563EB;
}
```

**`tailwind.config.ts`**
Extend the Tailwind theme to reference CSS custom properties so components can use utility classes:
```typescript
theme: {
  extend: {
    colors: {
      primary: 'var(--color-primary)',
      'primary-hover': 'var(--color-primary-hover)',
      'primary-light': 'var(--color-primary-light)',
      secondary: 'var(--color-secondary)',
      surface: 'var(--bg-surface)',
      sidebar: 'var(--bg-sidebar)',
    }
  }
}
```

**All component files (systematic find-and-replace):**
- Replace hardcoded dark background colors (`bg-gray-900`, `bg-gray-800`, `bg-[#1a1a2e]`, etc.) with light equivalents (`bg-white`, `bg-gray-50`, or `bg-[var(--bg-primary)]`)
- Replace hardcoded light text on dark (`text-white`, `text-gray-100`, `text-gray-200`) with dark text on light (`text-gray-900`, `text-gray-700`, `text-gray-500`)
- Exception: sidebar components should keep dark backgrounds
- Exception: buttons with `bg-green-*` or `bg-primary` should keep white text
- Update all `border-gray-700`, `border-gray-600` to `border-gray-200` or `border-[var(--border-color)]`
- Update hover states: `hover:bg-gray-700` → `hover:bg-gray-100`
- Update card/panel backgrounds: add `shadow-sm` or `shadow-md` for depth on white cards

**Select/dropdown elements (from S6-2):**
Now that we're light theme, update the S6-2 fix:
```css
select, select option {
  background-color: var(--bg-surface);
  color: var(--text-primary);
}
```

**Input fields:**
```css
input, textarea, select {
  background-color: var(--bg-surface);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
input::placeholder, textarea::placeholder {
  color: var(--text-muted);
}
```

**Important:** Do NOT change the sidebar — it stays dark for visual contrast. The sidebar should be the only dark element against the light content area.

**Validation:** `npm run build` passes. Visually: the app should look like a modern SaaS tool (think Linear, Notion, or Jobber), not a developer dashboard.

---

## S7-2: Responsive Layout — Tablet-First (Foundation)

**Context:** Primary use case is a contractor on a jobsite with an iPad (768-1024px). The current layout breaks on smaller screens. We need deliberate breakpoints, not just "make it shrink."

**Breakpoint strategy:**
- `< 640px` (phone): simplified single-column, collapsible sidebar, larger touch targets
- `640px - 1024px` (tablet): primary design target — sidebar collapses to icons, content fills width, cards stack 2-up
- `> 1024px` (desktop): current layout with full sidebar, 3-up cards

**Changes required:**

**`src/components/layout/Sidebar.tsx` (or equivalent navigation component)**
- Add a collapsible state: on tablet, sidebar shows only icons (no text labels). On phone, sidebar is hidden behind a hamburger menu.
- Add a hamburger/menu button visible at `< 1024px`
- Sidebar items should have `title` attributes so hover tooltips show the label when collapsed
- Transition: smooth slide animation for open/close (200ms ease)
- Touch target: all sidebar items minimum 44x44px tap area (Apple HIG)

**`src/components/layout/AppLayout.tsx`**
- Wrap content in a responsive container that adjusts padding/margins at breakpoints
- On phone: `px-3 py-2`, On tablet: `px-4 py-3`, On desktop: `px-6 py-4`
- The main content area should take `100%` width when sidebar is collapsed

**All page components (`src/pages/*.tsx`):**
- Project cards, material cards, equipment cards, crew cards should use CSS grid with responsive columns:
  - Phone: `grid-cols-1`
  - Tablet: `grid-cols-2`
  - Desktop: `grid-cols-3`
- Tables (if any) should become card lists on phone/tablet — tables don't work well on touch
- Form layouts should be single-column on phone, two-column on tablet+

**Touch targets:**
- All buttons: minimum height `44px` on touch devices
- All clickable cards: minimum height `60px`
- Spacing between interactive elements: minimum `8px` gap to prevent mis-taps

**Meta viewport (should already exist in `index.html`):**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

**Validation:** `npm run build` passes. Responsive behavior can only be fully tested in browser, but the build should compile cleanly.

---

## S7-3: Interaction Streamlining — Click Reduction

**Context:** The pilot user flagged that project cards highlight on hover but require a "View" button click to open. Contractors aren't tech-savvy — if something looks clickable, it should be clickable. Every extra click is friction.

**Principle:** Tap to open, edit inline, one-step actions. No unnecessary modals or confirmation dialogs except for destructive actions.

**Changes required:**

**Project cards (in the Projects page component):**
- Make the entire project card clickable — tapping anywhere on the card opens the project detail view
- Remove the separate "View" button (redundant once the card is clickable)
- Keep the "Delete" button but move it to a `...` overflow menu (three dots) in the card's top-right corner to prevent accidental deletion
- The card should have `cursor-pointer` and a subtle hover/active state: `hover:shadow-md active:shadow-sm transition-shadow`
- On the detail view: show project info with inline-editable fields. Clicking a field like "Project Name" turns it into an input. Press Enter or click away to save. No separate "Edit" modal needed.

**Material cards (in the Materials page):**
- Same pattern: tap card to expand/open detail
- "Add Material" should be a prominent button or FAB (floating action button) at bottom-right on mobile
- Quick-add: after adding one material, the form stays open for adding another (don't close the modal after each add)

**Equipment cards (in the Equipment page):**
- Same clickable card pattern
- Tap to expand and see details/logs

**Crew cards (in the Crew page):**
- Same clickable card pattern
- Tap to see crew member details, skills, certifications

**Dashboard:**
- KPI cards should be tappable — tap "Active Projects" KPI to navigate to the Projects page with active filter
- Recent activity or project list items should be tappable to navigate directly to that project

**General interaction patterns:**
- Use `<Link>` or `onClick` + `navigate()` — never both
- Remove any "View" or "Open" buttons that duplicate what clicking the card does
- "Edit" and "Delete" actions go in a `...` overflow menu or appear as icon buttons on hover/long-press
- Confirmation dialog only for: delete, signout, and destructive actions. Not for saves or navigation.

**Validation:** `npm run build` passes.

---

## S7-4: AI Smart Project Creation

**Context:** This is the highest-value AI feature — described in `.claude/AI_PRODUCT.md` as "Project Estimate Assistant." The contractor describes a job in natural language, and AI pre-fills the project form. This replaces typing into 6+ form fields.

**User flow:**
1. User taps "New Project" on the Projects page
2. Instead of a blank form, they see a text area: "Describe your project — e.g., 'New sod installation, 2500 sqft backyard at 123 Oak Street, budget around $5000'"
3. User types or voice-dictates their description
4. They tap "Generate" (or it auto-triggers after a brief pause)
5. AI returns structured data and pre-fills the form: name, address, area, budget estimate, suggested materials list, suggested checklist items
6. User reviews, adjusts, and taps "Create Project"
7. If user prefers manual entry, a "Skip — fill manually" link bypasses AI

**Implementation:**

**`src/services/anthropic.ts`** (or wherever AI calls are made)
Add a new function:
```typescript
export async function generateProjectFromDescription(description: string) {
  const response = await callClaude(`
You are a project estimator for a landscaping and contracting company.
Parse this project description and return structured JSON.

Description: "${description}"

Return JSON matching this schema exactly:
{
  "name": string (short project name, e.g. "Oak St Sod Installation"),
  "address": string (extracted address or ""),
  "totalAreaSqft": number (estimated total area, or 0 if not mentioned),
  "budget": number (estimated budget in cents, or 0 if not mentioned),
  "startDate": string (ISO date if mentioned, or null),
  "targetDate": string (ISO date if mentioned, or null),
  "notes": string (any additional context from the description),
  "suggestedMaterials": [
    { "name": string, "estimatedQuantity": number, "unit": string }
  ],
  "checklistSuggestions": {
    "permit": boolean (true if project likely needs permits),
    "utility": boolean (true if underground utilities might be affected),
    "deposit": boolean,
    "design": boolean (true if design approval needed),
    "access": boolean (true if site access needs coordination),
    "materials": boolean,
    "crew": boolean,
    "equipment": boolean
  }
}

Be practical and estimate based on common landscaping projects. If information is missing, use reasonable defaults. Always return valid JSON.
  `, 'claude-haiku-4-5-20251001');

  return JSON.parse(response);
}
```

**Project creation form component (wherever the "New Project" form lives):**
- Add a description text area at the top of the form
- Add a "Generate from description" button that calls `generateProjectFromDescription()`
- Show a loading spinner while AI processes (Haiku is fast, usually < 2 seconds)
- On success: populate form fields with AI response. Show suggested materials below the form as chips/tags the user can accept or dismiss.
- On error: show a subtle toast "Couldn't generate — please fill in manually" and leave the form blank
- The form should be fully functional without AI — all fields are still manually editable
- Add a "Skip — fill manually" link that hides the description area and shows the blank form

**Error handling:**
- Wrap the AI call in try/catch
- If the API key is missing or invalid, silently fall back to manual mode
- If the response isn't valid JSON, fall back to manual mode
- Never block project creation on AI availability

**Cost management:**
- Haiku is ~$0.001 per call for this payload size — negligible
- No need for caching (each project description is unique)
- Optional: add a localStorage counter to track AI usage for analytics

**Validation:** `npm run build` passes.

---

## S7-5: Material Management Loop

**Context:** The pilot user's feedback: "Need to be able to add materials to projects" and "Need ability to import material list." Currently, materials exist as a standalone page but aren't connected to the project workflow. A contractor needs to go from "I'm doing a sod install" to "here's my material order" without leaving the project view.

**Changes required:**

**Project detail view (wherever single project details are shown):**
Add a "Materials" tab or section within the project detail view that shows:
- Materials assigned to this project (with quantities, unit costs, totals)
- An "Add Material" button that either:
  - Opens a quick-add form (name, quantity, unit, unit cost)
  - Or shows a searchable list of existing materials from the materials store to assign to this project
- Ability to adjust quantities per-project (the same material might be in the library at 100 units but this project only needs 25)
- Running total cost of all materials for this project

**AI material suggestions (connects to S7-4):**
After smart project creation, if `suggestedMaterials` were returned:
- Show them as a "Suggested Materials" section in the project detail
- Each suggestion is a card with: name, estimated quantity, unit
- User taps "Add" to add it to the project, or "Dismiss" to remove the suggestion
- "Add All" button to accept all suggestions at once

**Material import (CSV):**
- Add an "Import" button on the Materials page
- Accepts a CSV file with columns: name, quantity, unit, unit_cost (at minimum)
- Parse the CSV, show a preview table, let user confirm before importing
- Use `FileReader` API + basic CSV parsing (split on commas, handle quoted fields)
- Each imported row creates a material in the store + Supabase
- Show success count: "Imported 23 materials"

**Data model consideration:**
Materials may need a junction table `project_materials` to track per-project quantities. Check if this already exists in the schema. If not, note the SQL needed in the migrations file:
```sql
CREATE TABLE IF NOT EXISTS project_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, material_id)
);

-- RLS policies
ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_materials_select ON project_materials FOR SELECT
  USING (user_has_role(org_id, 'viewer'));

CREATE POLICY project_materials_insert ON project_materials FOR INSERT
  WITH CHECK (user_has_role(org_id, 'designer'));

CREATE POLICY project_materials_update ON project_materials FOR UPDATE
  USING (user_has_role(org_id, 'designer'));

CREATE POLICY project_materials_delete ON project_materials FOR DELETE
  USING (user_is_admin(org_id));
```

Write this SQL to `.claude/SQL/sprint_7_migrations.sql`.

**Validation:** `npm run build` passes.

---

## S7-6: Crew Assignment to Projects

**Context:** Contractors need to assign crew members to projects. Currently, crew exists as a standalone page but has no connection to projects. The workflow: create project → add materials → assign crew → go build.

**Changes required:**

**Project detail view:**
Add a "Crew" tab or section that shows:
- Crew members assigned to this project
- An "Assign Crew" button that shows available crew from the crew store
- Each crew card shows: name, role, key skills/certifications
- Ability to remove crew from a project

**Data model:**
Check if a `project_crew` junction table exists. If not, add to the migrations file:
```sql
CREATE TABLE IF NOT EXISTS project_crew (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  role_on_project TEXT DEFAULT 'general',
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, crew_member_id)
);

ALTER TABLE project_crew ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_crew_select ON project_crew FOR SELECT
  USING (user_has_role(org_id, 'viewer'));

CREATE POLICY project_crew_insert ON project_crew FOR INSERT
  WITH CHECK (user_has_role(org_id, 'designer'));

CREATE POLICY project_crew_update ON project_crew FOR UPDATE
  USING (user_has_role(org_id, 'designer'));

CREATE POLICY project_crew_delete ON project_crew FOR DELETE
  USING (user_is_admin(org_id));
```

Add to `.claude/SQL/sprint_7_migrations.sql`.

**Crew assignment UI in project detail:**
- Show assigned crew as compact cards (avatar placeholder + name + role)
- "Assign Crew" opens a panel/modal with all available crew members
- Each crew member card shows skills that match the project type (highlight matches)
- Tap to assign, tap again to unassign
- Show crew count on the project card in the list view (e.g., "3 crew assigned")

**Validation:** `npm run build` passes.

---

## Post-Sprint SQL Migrations

All database changes for this sprint should be consolidated into a single file: `.claude/SQL/sprint_7_migrations.sql`

This file should include:
1. `project_materials` table + RLS policies (from S7-5)
2. `project_crew` table + RLS policies (from S7-6)
3. Any column additions or constraint changes discovered during implementation

The file must be idempotent — safe to run multiple times (use IF NOT EXISTS, DROP IF EXISTS).
