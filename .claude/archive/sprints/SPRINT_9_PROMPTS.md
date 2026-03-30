# Sprint 9 — Design System Foundation + Core User Flows

**Goal:** Migrate to the v2 design token system, build the onboarding wizard, overhaul project creation with AI quick-create, redesign the material management UI, and rebuild the Settings page with full navigation sections.

**Done when:** A new user can sign up, complete the onboarding wizard (4 steps including AI-configured dashboard preview), create a project via natural language AI input, manage materials with category filtering and quick-add, and configure their preferences in a sectioned Settings page — all matching the design language in `.claude/DESIGN_SYSTEM.md`.

**Execution:** Read `.claude/SPRINT_EXECUTION.md` for the autonomous workflow. Execute tasks S9-1 through S9-6 sequentially. Each task must pass `npm run build` before committing.

**SQL migrations:** Write all DB changes to `.claude/SQL/sprint_9_migrations.sql` — Charlie will run them manually in the Supabase SQL Editor.

**Design reference:** `.claude/DESIGN_SYSTEM.md` is the authoritative visual spec. Key rules: Inter font, 44px minimum touch targets, `--brand-primary: #2D6A4F` for primary actions, `--surface-card: #FFFFFF` for card backgrounds, `--shadow-card` for card elevation, `--border-default: #E5E7EB` for borders. Sidebar stays dark (`--sidebar-bg: #0F172A`) in all themes.

---

## S9-1: Design Token Migration (P0 — Foundation for all other tasks)

**Goal:** Replace the current partial CSS custom properties in `src/index.css` with the full v2 design token set from `.claude/DESIGN_SYSTEM.md`, add dark theme support via `[data-theme="dark"]`, and maintain backward compatibility with existing components.

**Files to modify:**
- `src/index.css`

**Dependencies:** None — this is the foundation task.

**Design reference:** `.claude/DESIGN_SYSTEM.md` → "Color System" section (Light Theme + Dark Theme blocks) and "Typography" section.

### Implementation details

**`src/index.css` — complete rewrite of the CSS custom properties:**

1. Add Inter font import at the very top (before `@tailwind` directives):
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

2. Replace the entire `:root { ... }` block with this exact token set:
```css
:root {
  /* ── Surfaces ──────────────────────────────────────────────────────────── */
  --surface-bg: #FAFAFA;
  --surface-card: #FFFFFF;
  --surface-hover: #F3F4F6;
  --surface-active: #E5E7EB;
  --surface-selected: #D1FAE5;

  /* ── Text ───────────────────────────────────────────────────────────────── */
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-tertiary: #9CA3AF;
  --text-disabled: #D1D5DB;

  /* ── Brand ──────────────────────────────────────────────────────────────── */
  --brand-primary: #2D6A4F;
  --brand-primary-hover: #245A42;
  --brand-primary-bg: #D1FAE5;
  --brand-secondary: #D4A843;

  /* ── Borders ────────────────────────────────────────────────────────────── */
  --border-light: #F3F4F6;
  --border-default: #E5E7EB;
  --border-strong: #D1D5DB;

  /* ── Shadows ────────────────────────────────────────────────────────────── */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-hover: 0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-panel: 0 8px 24px rgba(0,0,0,0.12);

  /* ── Status colors ──────────────────────────────────────────────────────── */
  --status-green: #16A34A;
  --status-green-bg: #DCFCE7;
  --status-amber: #F59E0B;
  --status-amber-bg: #FEF3C7;
  --status-red: #DC2626;
  --status-red-bg: #FEE2E2;
  --status-blue: #2563EB;
  --status-blue-bg: #DBEAFE;
  --status-gray: #9CA3AF;
  --status-gray-bg: #F3F4F6;

  /* ── Sidebar (always dark in both themes) ───────────────────────────────── */
  --sidebar-bg: #0F172A;
  --sidebar-hover: #1E293B;
  --sidebar-active: #334155;
  --sidebar-text: #E2E8F0;
  --sidebar-text-muted: #94A3B8;
  --sidebar-border: #1E293B;
  --sidebar-accent: #34D399;

  /* ── Brand accent colors (legacy — kept for components not yet migrated) ── */
  --green: #2D6A4F;
  --green-l: #74C69D;
  --green-xl: #B7E4C7;
  --green-bg: #D1FAE5;
  --blue: #2563EB;
  --blue-l: #3B82F6;
  --purple: #7C3AED;
  --purple-l: #A78BFA;
  --amber: #D97706;
  --amber-l: #F59E0B;
  --red: #DC2626;
  --red-l: #EF4444;
  --teal: #0D9488;
  --teal-l: #14B8A6;

  /* ── Legacy aliases (backward compat — DO NOT use in new code) ──────────── */
  --surface: var(--surface-bg);
  --surface2: var(--surface-card);
  --surface3: var(--surface-hover);
  --border: var(--border-default);
  --border2: var(--border-strong);
  --text: var(--text-primary);
  --text-2: var(--text-secondary);
  --text-3: var(--text-tertiary);
  --text-4: var(--text-secondary);
  --bg-primary: var(--surface-bg);
  --bg-secondary: var(--surface-card);
  --bg-surface: var(--surface-card);
  --color-primary: var(--brand-primary);
  --color-primary-hover: var(--brand-primary-hover);
  --color-primary-light: var(--brand-primary-bg);
  --color-secondary: var(--brand-secondary);
  --color-secondary-hover: #C49A3A;
  --border-color: var(--border-default);
  --shadow-md: var(--shadow-card);
  --shadow-lg: var(--shadow-panel);
  --color-error: var(--status-red);
  --color-success: var(--status-green);
  --color-warning: var(--status-amber);
  --color-info: var(--status-blue);
  --bg-sidebar: var(--sidebar-bg);
  --sidebar-text-2: var(--sidebar-text-muted);
  --sidebar-text-3: var(--sidebar-text-muted);
  --sidebar-text-4: var(--sidebar-text-muted);
  --sidebar-surface2: var(--sidebar-hover);
  --text-primary-fallback: #1A1A2E;
  --text-secondary-fallback: #4B5563;
  --text-muted: var(--text-tertiary);
  --text-on-dark: #FFFFFF;
  --text-on-primary: #FFFFFF;
}
```

3. Add dark theme block immediately after `:root`:
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

  --brand-primary: #34D399;
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

  /* Legacy dark overrides */
  --text: var(--text-primary);
  --text-2: var(--text-secondary);
  --text-3: var(--text-tertiary);
  --text-4: var(--text-secondary);
  --text-muted: var(--text-tertiary);
  --text-on-dark: #FFFFFF;
  --text-on-primary: #0F172A;
  --text-primary-fallback: #F1F5F9;
  --text-secondary-fallback: #CBD5E1;
}
```

4. Keep all the existing global styles (`*`, `html`, `body`, `::placeholder`, `input`, `textarea`, `select`, `button`, `a`) but update the `body` rule:
```css
body {
  background-color: var(--surface-bg);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: background-color 0.2s ease, color 0.2s ease;
  @apply h-full w-full;
}
```

5. Ensure input/select/textarea rules reference the new tokens:
```css
input, textarea, select {
  background-color: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  @apply rounded;
}
```

### Acceptance criteria
- [ ] `npm run build` passes with zero errors
- [ ] `:root` contains all v2 tokens (surfaces, text, brand, borders, shadows, status, sidebar)
- [ ] `[data-theme="dark"]` block exists with all dark overrides
- [ ] Legacy aliases present — all existing `var(--surface)`, `var(--text)`, `var(--color-primary)` etc. still resolve
- [ ] Inter font loads via `@import` at top of file
- [ ] `body` uses Inter font-family
- [ ] All existing pages render without visual regressions (legacy aliases prevent breakage)

---

## S9-2: Onboarding Wizard (P1 — New User Flow)

**Goal:** Build a 4-step onboarding wizard that captures the user's business type, company info, priority focus areas, and shows an AI-configured dashboard preview. New users are redirected here before seeing the main app.

**Files to create:**
- `src/pages/Onboarding.tsx` — the wizard component
- `src/services/preferences.ts` — Supabase CRUD for `user_preferences` table

**Files to modify:**
- `src/App.tsx` — add `/onboarding` route outside of `AppLayout`
- `src/components/shared/ProtectedRoute.tsx` — redirect to `/onboarding` if onboarding not complete
- `src/types/index.ts` — add `UserPreferences` and `NotificationSettings` interfaces

**Dependencies:** S9-1 must be complete (design tokens). S9-6 defines the SQL — the service layer should handle graceful failure if the table doesn't exist yet.

**Design reference:** `.claude/DESIGN_SYSTEM.md` → "Form Inputs" (44px height, `--border-default` border, `--brand-primary` focus ring), "Buttons" (primary = green bg white text, ghost = no bg green text), "Modal / Dialog" (centered, max-width 640px).

### Implementation details

**`src/types/index.ts` — add these interfaces at the end:**

```typescript
export interface UserPreferences {
  id: string;
  userId: string;
  orgId: string;
  businessType: string | null;
  companyName: string | null;
  teamSize: string | null;
  userRole: string | null;
  priorities: string[];
  onboardingCompletedAt: string | null;
  selectedKpis: string[];
  customKpis: Array<{ name: string; description: string; valueSource?: string }>;
  widgetLayout: Array<{ widgetId: string; type: string; position: number; config?: Record<string, any> }>;
  notificationSettings: NotificationSettings;
  theme: 'light' | 'dark' | 'system';
}

export interface NotificationSettings {
  deadlineReminders: boolean;
  lowStockAlerts: boolean;
  certExpiry: boolean;
  maintenanceDue: boolean;
  weeklyDigest: boolean;
}
```

**`src/services/preferences.ts` — new file:**

```typescript
import { supabase } from './supabase'
import type { UserPreferences } from '@/types'

// Snake/camel mapping follows the same pattern as supabaseData.ts

export async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[TF-DEBUG] fetchUserPreferences error:', error)
    return null
  }
  if (!data) return null
  return toCamelCase(data) as UserPreferences
}

export async function upsertUserPreferences(
  userId: string, orgId: string, prefs: Partial<Record<string, any>>
): Promise<UserPreferences | null> {
  const payload = toSnakeCase({ ...prefs, userId, orgId })
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) {
    console.error('[TF-DEBUG] upsertUserPreferences error:', error)
    return null
  }
  return toCamelCase(data) as UserPreferences
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('onboarding_completed_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return false  // Table might not exist yet — treat as not completed
  return data.onboarding_completed_at !== null
}

// Include toCamelCase and toSnakeCase helper functions here
// (copy the same implementation from supabaseData.ts)
```

**Important:** Wrap all Supabase calls in try/catch. If the `user_preferences` table doesn't exist yet (Charlie hasn't run the SQL), functions should return `null` / `false` gracefully — never crash the app.

**`src/pages/Onboarding.tsx` — new file, full-page wizard:**

Component structure:
```typescript
const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1) // 1-4
  const [businessType, setBusinessType] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [teamSize, setTeamSize] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [aiKpiInput, setAiKpiInput] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<{name: string; description: string; mockValue: string} | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [customKpis, setCustomKpis] = useState<Array<{name: string; description: string}>>([])
  const [isSaving, setIsSaving] = useState(false)

  // ... step rendering logic
}
```

**Step 1 — Business Type Picker:**

Layout: centered container (`max-w-[640px] mx-auto px-6 py-12`), heading at top, 2×2 grid below.

- Heading: `<h1>` "What kind of landscaping do you do?" — `text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]`
- Subheading: "Pick your primary focus" — `text-[14px] text-[var(--text-secondary)] mt-2 mb-8`
- 4 cards in `grid grid-cols-2 gap-4`:
  ```
  Each card: div with
    - className: "p-6 rounded-xl border-2 cursor-pointer transition-all duration-150"
    - Default: border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]
    - Selected: border-[var(--brand-primary)] bg-[var(--surface-selected)] shadow-[var(--shadow-card)]
    - Hover: hover:shadow-[var(--shadow-card)] hover:border-[var(--border-strong)]
    - Content: emoji (text-[32px] mb-3), title (text-[16px] font-[600]), subtitle (text-[13px] text-[var(--text-secondary)])
  ```
  Cards:
  - 🏡 Residential / "Homes, yards, gardens"
  - 🏢 Commercial / "Properties, campuses, HOAs"
  - 🧱 Hardscaping / "Patios, walls, driveways"
  - 🌿 Full-Service / "Design, install, maintain"

- "Continue" button: `<Button variant="primary">` — disabled until `businessType` is set. Full width at bottom of container: `w-full h-[44px] mt-8`

**Step 2 — Company Info:**

- Heading: "Tell us about your company" — same heading style
- Company name: `<Input label="Company name" />` from `src/components/ui/Input.tsx`, placeholder "e.g., Green Valley Landscaping"
- Team size chips: horizontal flex container (`flex flex-wrap gap-3 mt-4`), each chip:
  ```
  className: "px-4 py-2 rounded-full border cursor-pointer transition-all text-[14px] font-[500] min-h-[44px]"
  Default: border-[var(--border-default)] text-[var(--text-secondary)] bg-[var(--surface-card)]
  Selected: border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary-bg)]
  ```
  Options: "Just me", "2–5", "6–15", "16–25", "25+"
- Role: `<Select label="Your role">` with options: "Owner/Operator", "Project Manager", "Estimator", "Foreman", "Office Manager"
- Footer: "Back" ghost button (left), "Continue" primary button (right), both `h-[44px]`

**Step 3 — Priority Focus Areas:**

- Heading: "What do you want TerrainForge to help with most?"
- Subheading: "Pick your top priorities — we'll customize your dashboard"
- Grid: `grid grid-cols-4 gap-3` on desktop, `grid-cols-2` on tablet/phone (`md:grid-cols-4`)
- 8 priority cards, each:
  ```
  className: "p-4 rounded-lg border-2 cursor-pointer transition-all text-center min-h-[44px]"
  Default: border-[var(--border-default)] bg-[var(--surface-card)]
  Selected: border-[var(--brand-primary)] bg-[var(--surface-selected)]
  ```
  Content: emoji (text-[24px] mb-2), label (text-[13px] font-[500])
  Cards:
  - 📋 Project Tracking
  - 💰 Budget & Estimates
  - 👷 Crew Management
  - 🧱 Material Inventory
  - 🚜 Equipment Tracking
  - 💬 Client Comms
  - 🧾 Invoicing
  - 🌤️ Weather Planning
- Multi-select: tapping toggles the item in `priorities` array. Show a subtle checkmark overlay on selected cards (absolute positioned, top-right, green circle with white checkmark).
- Footer: Back + Continue

**Step 4 — AI Dashboard Preview:**

- Heading: "Here's your personalized dashboard"
- Subheading: "Based on your selections, we've configured these KPIs"
- KPI preview: `grid grid-cols-2 gap-3` (or `grid-cols-4` on desktop), showing 4 KPI cards based on priorities selection:
  ```
  Mapping (priority slug → KPI):
  "Project Tracking"   → { label: "Active Projects", value: "—", icon: "📋" }
  "Budget & Estimates"  → { label: "Pipeline Value", value: "—", icon: "💰" }
  "Crew Management"     → { label: "Crew Available", value: "—", icon: "👷" }
  "Material Inventory"  → { label: "Low Stock Alerts", value: "—", icon: "🧱" }
  "Equipment Tracking"  → { label: "Fleet Status", value: "—", icon: "🚜" }
  "Client Comms"        → { label: "Pending Responses", value: "—", icon: "💬" }
  "Invoicing"           → { label: "Outstanding Invoices", value: "—", icon: "🧾" }
  "Weather Planning"    → { label: "Weather Alerts", value: "—", icon: "🌤️" }
  Default (if <4): fill with Active Projects, Pipeline Value, Crew Available, Low Stock Alerts
  ```
  Each KPI card:
  ```
  className: "p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]"
  Content: icon (text-[20px]), label (text-[12px] uppercase tracking-[0.05em] font-[600] text-[var(--text-tertiary)]), value (text-[28px] font-[700] text-[var(--text-primary)])
  ```

- **Natural language KPI input** (below the preview):
  ```
  Container: mt-8 p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)]
  Label: "Want to track something specific?" text-[14px] font-[600] mb-3
  Input row: flex gap-2
    - Input: flex-1, h-[44px], placeholder "Describe a metric — e.g., 'average project profit margin'"
    - Button: "Ask AI" variant="primary" h-[44px] px-6, disabled while isAiLoading
  ```

  Suggested chips below the input (`flex flex-wrap gap-2 mt-3`):
  ```
  Each chip: text-[12px] px-3 py-1.5 rounded-full cursor-pointer
    bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--brand-primary-bg)] hover:text-[var(--brand-primary)]
  ```
  Chips: "Jobs overdue this week", "Profit margin by project", "Crew utilization rate"
  Clicking a chip: sets `aiKpiInput` to the chip text and triggers `handleAskAi()`

  **AI call — `handleAskAi()`:**
  ```typescript
  async function handleAskAi() {
    if (!aiKpiInput.trim()) return
    setIsAiLoading(true)
    setAiSuggestion(null)
    try {
      const response = await callClaude(`
  You are configuring a dashboard for a landscaping contractor's project management tool.
  The user wants to track this metric: "${aiKpiInput}"

  Return JSON with:
  {
    "name": string (short KPI name, max 25 chars),
    "description": string (one sentence explaining what this tracks),
    "mockValue": string (a realistic example value, e.g. "3", "$12,450", "87%", "2 overdue")
  }

  Return only valid JSON, no markdown.`, 'claude-haiku-4-5-20251001')

      const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      setAiSuggestion(JSON.parse(cleaned))
    } catch {
      // Silently fail — AI features are optional
    } finally {
      setIsAiLoading(false)
    }
  }
  ```

  **AI suggestion card** (shown when `aiSuggestion` is not null):
  ```
  Container: mt-4 p-4 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-bg)]
    animate: fade in + slide up (use CSS animation or inline style transition)
  Header row: flex justify-between items-center
    Name: text-[14px] font-[600]
    Mock value: text-[14px] font-[700] text-[var(--brand-primary)]
  Description: text-[13px] text-[var(--text-secondary)] mt-1
  Buttons: flex gap-2 mt-3
    "Add to Dashboard": Button variant="primary" size="sm" — pushes {name, description} to customKpis array
    "Dismiss": Button variant="ghost" size="sm" — sets aiSuggestion to null
  ```

- **"Get Started" button:** `w-full h-[44px] mt-8`, variant="primary". On click:
  1. Set `isSaving = true`
  2. Call `upsertUserPreferences(user.id, org.id, { businessType, companyName, teamSize, userRole: role, priorities, selectedKpis: derivedKpiIds, customKpis, onboardingCompletedAt: new Date().toISOString() })`
  3. Navigate to `/` (Dashboard)
  4. Wrap in try/catch — if Supabase save fails, still navigate (preferences are best-effort)

**Progress indicator** at top of every step:
```
Container: flex justify-center gap-2 mb-8
4 dots, each: w-2.5 h-2.5 rounded-full transition-colors
  Current/past: bg-[var(--brand-primary)]
  Future: bg-[var(--border-default)]
```

**Page wrapper** (no sidebar, centered):
```
<div className="min-h-screen bg-[var(--surface-bg)] flex items-start justify-center pt-16 px-4">
  <div className="w-full max-w-[640px]">
    {/* progress dots */}
    {/* step content */}
  </div>
</div>
```

**`src/App.tsx` — add onboarding route:**

Add import: `import Onboarding from '@/pages/Onboarding'`

Add route inside `<Routes>` alongside the other public-ish routes, but wrapped in ProtectedRoute (requires auth, no sidebar):
```tsx
<Route path="/onboarding" element={
  <ProtectedRoute skipOnboardingCheck>
    <Onboarding />
  </ProtectedRoute>
} />
```

**`src/components/shared/ProtectedRoute.tsx` — add onboarding gate:**

Add a `skipOnboardingCheck` prop (boolean, default false). In the component:
1. After confirming the user is authenticated, if `!skipOnboardingCheck`:
   - Call `hasCompletedOnboarding(user.id)` on mount
   - If returns `false`, redirect to `/onboarding`
   - If returns `true` or if the call errors (table doesn't exist), allow through
2. Store onboarding status in a `useRef` or `useState` so it doesn't re-check on every render
3. Show a loading skeleton while checking (not a blank screen)

### Acceptance criteria
- [ ] `npm run build` passes
- [ ] `/onboarding` renders the wizard without sidebar or app chrome
- [ ] Step 1: 4 business type cards, single-select, Continue disabled until selected
- [ ] Step 2: company name input, team size chips (single-select), role dropdown
- [ ] Step 3: 8 priority cards in grid, multi-select with visual checkmarks
- [ ] Step 4: KPI preview cards mapped from priorities, natural language input calls `callClaude()`, chip suggestions work
- [ ] Progress dots show current step
- [ ] "Get Started" saves to Supabase (or fails gracefully) and navigates to Dashboard
- [ ] ProtectedRoute redirects new users (no onboarding record) to `/onboarding`
- [ ] ProtectedRoute does NOT redirect on `/onboarding` itself (no loop)

---

## S9-3: Project Creation Overhaul (P1 — AI Quick Create + Zone Builder)

**Goal:** Redesign the project creation modal in `src/pages/Projects.tsx` with a prominent AI input at top, example chips, redesigned manual form, and a zone builder section.

**Files to modify:**
- `src/pages/Projects.tsx`

**Dependencies:** S9-1 (design tokens).

**Design reference:** `.claude/DESIGN_SYSTEM.md` → "Modal / Dialog" section (centered, max-width 640px, overlay black 40%, fade + scale animation), "Form Inputs" section (44px height, rounded-lg, `--brand-primary` focus ring).

### Implementation details

**Redesign the project creation modal inline in `Projects.tsx`** — this is NOT a separate component file. The modal code stays in `src/pages/Projects.tsx` where the existing creation modal lives. Modify the existing modal JSX and state, don't extract to a new file.

The existing `generateProjectFromDescription()` in `src/services/anthropic.ts` and `AIProjectSuggestion` interface remain unchanged. The existing creation state (`NewProjectForm`, `EMPTY_FORM`) can be reused. Add zone state alongside it.

**Modal layout — top to bottom:**

1. **Modal container:**
   ```
   className: "w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-xl bg-[var(--surface-card)] shadow-[var(--shadow-panel)]"
   ```

2. **Header:**
   ```
   className: "sticky top-0 z-10 px-6 py-4 border-b border-[var(--border-default)] bg-[var(--surface-card)] flex items-center justify-between"
   Title: "New Project" text-[20px] font-[600]
   Close button: 24x24 X icon, ghost style
   ```

3. **AI Quick Create section:**
   ```
   Container: px-6 py-5 border-b border-[var(--border-light)] bg-[var(--surface-bg)]
   Label: "Describe your project" text-[14px] font-[600] text-[var(--text-primary)] mb-2
   Input row: flex gap-2
     - Input: h-[44px] flex-1, placeholder "e.g., 3000 sqft paver patio with retaining wall"
       border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]
     - Button: "Create with AI" variant="primary" h-[44px] px-5, shows spinner when loading
   Example chips: flex flex-wrap gap-2 mt-3
     Each chip: text-[12px] px-3 py-1.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)]
       cursor-pointer hover:bg-[var(--brand-primary-bg)] hover:text-[var(--brand-primary)] transition-colors
     Chips:
       "2500 sqft backyard patio with firepit"
       "Front yard sod replacement, 4000 sqft"
       "Retaining wall with drainage, 80 linear ft"
       "Commercial parking lot landscape, 10000 sqft"
     On click: populate the AI input and auto-trigger generateProjectFromDescription()
   ```

4. **Divider:**
   ```
   className: "relative py-4 px-6"
   Horizontal rule with centered text: "or fill in manually"
   Implementation: <div className="border-t border-[var(--border-default)]"><span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 bg-[var(--surface-card)] text-[12px] text-[var(--text-tertiary)]">or fill in manually</span></div>
   ```

5. **Manual form:**
   ```
   Container: px-6 py-5
   Grid: grid grid-cols-2 gap-4 (single column on phone: grid-cols-1 sm:grid-cols-2)
   ```
   Fields (use existing `<Input>`, `<Select>`, `<TextArea>` from `src/components/ui/`):
   - Project Name (full width, `col-span-2`): `<Input label="Project name" placeholder="e.g., Oak St Patio" />`
   - Client (half width): `<Select label="Client">` — populated from existing clients in project data or a text input if no clients exist
   - Address (half width): `<Input label="Address" />`
   - Budget (half width): `<Input label="Budget" type="number" />` with `$` prefix — use a wrapper div with the `$` as an absolute-positioned span
   - Total Area (half width): `<Input label="Total area (sqft)" type="number" />`
   - Start Date (half width): `<Input label="Start date" type="date" />`
   - Target Date (half width): `<Input label="Target date" type="date" />`
   - Status (half width): chips for "Planning" (blue), "In Progress" (green), "On Hold" (amber) — default to "Planning"
   - Priority (half width): chips for "Low", "Medium" (default), "High"
   - Description (full width, `col-span-2`): `<TextArea label="Description" rows={3} />`

   All inputs: `h-[44px]` (except textarea), `rounded-lg`, `border-[var(--border-default)]`, `focus:ring-2 focus:ring-[var(--brand-primary)]`

6. **Zone Builder section:**
   ```
   Container: px-6 py-5 border-t border-[var(--border-light)]
   Header: flex items-center justify-between mb-4
     "Work Zones" text-[14px] font-[600]
     "+" button: w-[36px] h-[36px] rounded-full border border-[var(--border-default)] bg-[var(--surface-card)]
       hover:bg-[var(--surface-hover)] flex items-center justify-center text-[18px] text-[var(--text-secondary)]
   ```
   If no zones added: subtle dashed border box "Add zones to break the project into sections" with centered "+" icon

   Each zone card:
   ```
   className: "p-4 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] mb-3"
   Layout: grid grid-cols-[1fr_100px_auto] gap-3 items-center
     - Zone Name: <Input placeholder="e.g., Front Patio" /> compact (h-[36px])
     - Area: <Input placeholder="sqft" type="number" /> compact (h-[36px])
     - Delete: ghost X button, 28x28
   Color picker below: flex gap-2 mt-2
     6 small circles (w-5 h-5 rounded-full cursor-pointer border-2):
       Colors: #2D6A4F (green), #2563EB (blue), #F59E0B (amber), #DC2626 (red), #7C3AED (purple), #0D9488 (teal)
       Selected: border-[var(--text-primary)], unselected: border-transparent
   ```

   Zone state: `const [zones, setZones] = useState<Array<{name: string, area: string, color: string}>>([])`. When creating the project, map these to the `Zone` interface shape.

7. **Footer:**
   ```
   className: "sticky bottom-0 px-6 py-4 border-t border-[var(--border-default)] bg-[var(--surface-card)] flex justify-between"
   Left: "Cancel" Button variant="ghost" h-[44px]
   Right: "Create Project" Button variant="primary" h-[44px]
   ```

**AI flow (reusing existing logic):**
When user types in the AI input and clicks "Create with AI" or clicks a chip:
1. Set loading state (spinner on button)
2. Call `generateProjectFromDescription(description)` (already exists in `src/services/anthropic.ts`)
3. On success: populate the manual form fields from the response (name, address, totalArea, budget, notes). If `suggestedMaterials` come back, show them as pills below the form with "Add" buttons (existing Sprint 8 pattern, if implemented).
4. On failure: show toast "Couldn't parse — fill in manually" and leave form as-is

**AI auto-population behavior:** When `generateProjectFromDescription()` returns successfully, immediately set all form state fields from the response: `setForm({ ...form, name: result.name, address: result.address, totalArea: String(result.totalAreaSqft), budget: String(result.budget), notes: result.notes })`. The user sees the form fields pre-filled and can edit any of them before clicking "Create Project." The AI response also sets `startDate` and `targetDate` if the AI returned them. This is auto-fill, not a preview — fields populate directly.

### Acceptance criteria
- [ ] `npm run build` passes
- [ ] AI Quick Create input is prominent at top of modal with "Create with AI" button
- [ ] Example chips populate AI input and auto-trigger `generateProjectFromDescription()` on click
- [ ] AI response auto-fills form fields (name, address, area, budget, notes, dates) — user can edit before saving
- [ ] Manual form has all fields (name, client, address, budget, area, start/target dates, status, priority, description) in two-column grid with v2 design tokens
- [ ] Zone builder: "+" adds a zone card with name input, area input, color picker (6 colors), and delete button
- [ ] Zone builder: zones are included in the project payload when "Create Project" is clicked
- [ ] "Create Project" saves project with zones to projectStore + Supabase via existing `addProject()`
- [ ] Modal has overlay (black 40%), close button (X), scrolls on overflow, max-width 640px

---

## S9-4: Material Management UI Overhaul (P1)

**Goal:** Redesign `src/pages/MaterialLibrary.tsx` with a category sidebar, quick-add bar, search/filter, stock status badges, and action buttons.

**Files to modify:**
- `src/pages/MaterialLibrary.tsx`

**Dependencies:** S9-1 (design tokens).

**Design reference:** `.claude/DESIGN_SYSTEM.md` → "Status Badges" section (rounded pill, status dot + label, status color at 10% opacity), "Cards" section (tappable, hover shadow elevation), "Empty States" (centered icon + heading + CTA).

### Implementation details

**Page layout — replace the current content with a two-panel layout:**

```
<div className="flex gap-0 h-full">
  {/* Category sidebar — hidden on phone, shown on tablet+ */}
  <aside className="hidden md:block w-[200px] border-r border-[var(--border-default)] bg-[var(--surface-card)] overflow-y-auto flex-shrink-0">
    {/* category nav */}
  </aside>

  {/* Mobile category bar — shown only on phone */}
  <div className="md:hidden overflow-x-auto flex gap-2 px-4 py-3 border-b border-[var(--border-default)]">
    {/* horizontal chip bar */}
  </div>

  {/* Main content */}
  <div className="flex-1 overflow-y-auto">
    {/* quick-add bar */}
    {/* search/filter bar */}
    {/* material table/list */}
  </div>
</div>
```

**1. Category sidebar (`aside`):**

```
Category list items:
  Each item: div with className "flex items-center justify-between px-4 py-3 cursor-pointer transition-colors text-[14px]"
    Default: text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]
    Active: text-[var(--brand-primary)] bg-[var(--surface-selected)] font-[500]
  Left: emoji + name (gap-2.5)
  Right: count badge — span className "text-[11px] font-[500] px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
```

Categories with emojis and how they map to `MaterialCategory` values:
```
"All Materials" → shows all (no filter)
🧱 "Pavers"    → category === 'paver'
🪨 "Stone"     → category === 'stone'
🌿 "Sod"       → category === 'sod'
🪵 "Mulch"     → category === 'mulch'
🧹 "Edging"    → category === 'edging'
🌱 "Plants"    → category in ['plant', 'shrub', 'tree']
💡 "Lighting"  → category === 'lighting'
💧 "Irrigation"→ category === 'irrigation'
📦 "Other"     → category in ['tile', 'brick', 'concrete', 'gravel', 'sand', 'soil', 'seed', 'lumber', 'misc']
```

State: `const [activeCategory, setActiveCategory] = useState<string>('all')`

Mobile chip bar: same categories as horizontal scrollable chips using the same active/default styling but as `px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap` chips.

**2. Quick-add bar:**

```
Container: px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface-bg)]
Layout: flex flex-wrap gap-2 items-end
  - Name:     <Input placeholder="Material name" className="flex-1 min-w-[180px] h-[40px]" />
  - Category: <Select className="w-[130px] h-[40px]"> with options from MaterialCategory
  - Unit:     <Select className="w-[90px] h-[40px]"> with options: sqft, cuyd, ton, lft, each, bag, pallet, unit
  - Cost:     <Input type="number" placeholder="Cost" className="w-[90px] h-[40px]" /> with $ prefix
  - Qty:      <Input type="number" placeholder="Qty" className="w-[80px] h-[40px]" />
  - Button:   <Button variant="primary" className="h-[40px]">Add</Button>
```

On submit: create material in `materialStore` + Supabase via existing `addMaterial()`. Clear inputs. Show brief toast "Added {name}".

**3. Search and stock filter bar:**

```
Container: px-4 py-3 flex items-center gap-3 border-b border-[var(--border-light)]
  - Search: <Input placeholder="Search materials..." className="flex-1 h-[40px]" /> with 🔍 icon inside
  - Stock filter: segmented control — flex gap-1 bg-[var(--surface-hover)] p-1 rounded-lg
    4 segments: "All", "In Stock", "Low Stock", "Out of Stock"
    Each: px-3 py-1.5 rounded-md text-[12px] font-[500] cursor-pointer transition-colors
      Active: bg-[var(--surface-card)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]
      Inactive: text-[var(--text-secondary)]
```

State: `const [search, setSearch] = useState('')` and `const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out'>('all')`

Stock status logic per material:
```typescript
function getStockStatus(m: Material): 'in' | 'low' | 'out' {
  if (m.qtyOnHand <= 0) return 'out'
  if (m.qtyOnHand <= m.minStockLevel) return 'low'
  return 'in'
}
```

**4. Material table:**

Use a styled `<table>` (not the existing `DataTable` component — build inline for full control):

```
<table className="w-full">
  <thead>
    <tr className="border-b border-[var(--border-default)] text-[11px] font-[600] uppercase tracking-[0.05em] text-[var(--text-tertiary)]">
      <th className="text-left px-4 py-3">Name</th>
      <th className="text-left px-4 py-3">Category</th>
      <th className="text-right px-4 py-3">Unit</th>
      <th className="text-right px-4 py-3">Cost</th>
      <th className="text-right px-4 py-3">On Hand</th>
      <th className="text-left px-4 py-3">Status</th>
      <th className="text-left px-4 py-3">Supplier</th>
      <th className="text-right px-4 py-3">Actions</th>
    </tr>
  </thead>
```

Each row:
```
<tr className="border-b border-[var(--border-light)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors">
  <td className="px-4 py-3 text-[14px] font-[500]">{material.name}</td>
  <td className="px-4 py-3">
    <span className="text-[12px] px-2.5 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-secondary)] font-[500] capitalize">{material.category}</span>
  </td>
  <td className="px-4 py-3 text-right text-[14px] text-[var(--text-secondary)]">{material.unit}</td>
  <td className="px-4 py-3 text-right text-[14px] font-[500]">${material.cost.toFixed(2)}</td>
  <td className="px-4 py-3 text-right text-[14px]">{material.qtyOnHand}</td>
  <td className="px-4 py-3">{/* stock status badge */}</td>
  <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">{material.supplier_name || '—'}</td>
  <td className="px-4 py-3 text-right">{/* action buttons */}</td>
</tr>
```

Stock status badges:
```
"In Stock":  <span className="inline-flex items-center gap-1.5 text-[12px] font-[500] px-2.5 py-1 rounded-full bg-[var(--status-green-bg)] text-[var(--status-green)]">● In Stock</span>
"Low Stock": <span className="... bg-[var(--status-amber-bg)] text-[var(--status-amber)]">● Low Stock</span>
"Out of Stock": <span className="... bg-[var(--status-red-bg)] text-[var(--status-red)]">● Out</span>
```

Action buttons (right-aligned in the cell):
```
<div className="flex gap-1 justify-end">
  <button className="w-[32px] h-[32px] rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center" title="Edit">✏️</button>
  <button className="w-[32px] h-[32px] rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center" title="Order">📦</button>
</div>
```
- Edit: opens the existing material edit modal (carry over current edit functionality)
- Order: shows toast "Material ordering coming in Phase 2"

**Empty state** (when no materials match the current category + filter):
```
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="text-[48px] mb-4 opacity-40">🧱</div>
  <div className="text-[16px] font-[600] text-[var(--text-primary)] mb-2">No materials found</div>
  <div className="text-[13px] text-[var(--text-tertiary)] mb-6">
    {activeCategory === 'all' ? "Add your first material to get started" : `No ${activeCategoryLabel} materials yet`}
  </div>
  <Button variant="primary">Add Material</Button>
</div>
```

### Acceptance criteria
- [ ] `npm run build` passes
- [ ] Category sidebar filters materials by category (desktop: sidebar, mobile: chip bar)
- [ ] Quick-add bar creates a material inline without opening a modal
- [ ] Search filters by name and supplier
- [ ] Stock status filter chips (All / In Stock / Low Stock / Out of Stock) filter correctly
- [ ] Stock badges show correct status per material (green/amber/red)
- [ ] Edit button opens material editing
- [ ] Order button shows Phase 2 toast
- [ ] Empty state shown when no materials match filters

---

## S9-5: Settings Page Overhaul (P1)

**Goal:** Rebuild `src/pages/Settings.tsx` as a full settings hub with left navigation and 6 sections: Profile, Appearance, Notifications, Integrations, Team Members, Billing.

**Files to modify:**
- `src/pages/Settings.tsx`
- `src/components/layout/AppLayout.tsx` (or `src/App.tsx`) — read theme from localStorage on app load

**Dependencies:** S9-1 (design tokens), S9-2 (preferences service for notification settings).

**Design reference:** `.claude/DESIGN_SYSTEM.md` → "Layout System" section (page structure), "Form Inputs", "Buttons", "Status Badges".

### Implementation details

**`src/pages/Settings.tsx` — complete rewrite:**

Component state:
```typescript
type SettingsSection = 'profile' | 'appearance' | 'notifications' | 'integrations' | 'team' | 'billing'

export const Settings: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  const { user } = useAuth()
  const { org, updateOrgName } = useOrgStore()
  const navigate = useNavigate()

  // Carry over all existing state: orgName, isSaving, saveStatus, showClearConfirm, hasDemoData
  // Add theme state:
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system') || 'light'
  })
  // Add notification state:
  const [notifications, setNotifications] = useState({
    deadlineReminders: true,
    lowStockAlerts: true,
    certExpiry: true,
    maintenanceDue: true,
    weeklyDigest: false,
  })
```

**Page layout:**
```
<div className="flex gap-0 h-full">
  {/* Left nav — hidden on phone */}
  <nav className="hidden md:block w-[220px] border-r border-[var(--border-default)] bg-[var(--surface-card)] py-4">
    {/* nav items */}
  </nav>

  {/* Mobile tabs — phone only */}
  <div className="md:hidden overflow-x-auto flex gap-1 px-3 py-2 border-b border-[var(--border-default)]">
    {/* horizontal tabs */}
  </div>

  {/* Content area */}
  <div className="flex-1 overflow-y-auto px-6 py-6 max-w-[640px]">
    {activeSection === 'profile' && <ProfileSection />}
    {activeSection === 'appearance' && <AppearanceSection />}
    {/* ... etc */}
  </div>
</div>
```

**Left nav items:**
```
const NAV_ITEMS: Array<{id: SettingsSection, icon: string, label: string}> = [
  { id: 'profile',       icon: '👤', label: 'Profile' },
  { id: 'appearance',    icon: '🎨', label: 'Appearance' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'integrations',  icon: '🔌', label: 'Integrations' },
  { id: 'team',          icon: '👥', label: 'Team Members' },
  { id: 'billing',       icon: '💳', label: 'Billing' },
]
```

Each nav item:
```
className: "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors text-[14px]"
Active: "bg-[var(--surface-selected)] text-[var(--brand-primary)] font-[500] border-l-2 border-[var(--brand-primary)]"
Inactive: "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
```

**Profile section:**
- Carry over all existing logic: email (read-only + lock), org name (editable + save), billing shortcut
- Add: Role display (read-only): "text-[13px] text-[var(--text-secondary)]" — hard-code to "Admin" for now
- Add: Demo data clearing at bottom (carry over `handleClearDemoData` logic under a "Data Management" sub-header)
- Sub-header style: `text-[11px] font-[600] uppercase tracking-[0.1em] text-[var(--text-tertiary)] mt-8 mb-3`

**Appearance section:**

3 theme preview cards in `grid grid-cols-3 gap-4`:
```
Each card:
  className: "p-4 rounded-xl border-2 cursor-pointer transition-all text-center"
  Default: border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]
  Active: border-[var(--brand-primary)] bg-[var(--surface-selected)] shadow-[var(--shadow-card)]

  Content:
    Preview rectangle: div className "w-full h-[60px] rounded-lg mb-3 border border-[var(--border-light)]"
      Light: bg-gradient-to-b from-[#FAFAFA] to-[#FFFFFF]
      Dark: bg-gradient-to-b from-[#0F172A] to-[#1E293B]
      System: bg-gradient-to-r from-[#FAFAFA] via-[#FAFAFA] to-[#0F172A] (split)
    Icon: ☀️ / 🌙 / 💻 (text-[20px] mb-1)
    Label: "Light" / "Dark" / "System" (text-[13px] font-[500])
    Active: show ✓ checkmark overlay (absolute positioned, top-right, green circle)
```

Theme switching logic:
```typescript
function applyTheme(newTheme: 'light' | 'dark' | 'system') {
  setTheme(newTheme)
  localStorage.setItem('tf-theme', newTheme)
  if (newTheme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', newTheme)
  }
}
```

**Also add theme initialization on app load** — in `src/components/layout/AppLayout.tsx` (or `src/App.tsx`), add a `useEffect` that runs once:
```typescript
useEffect(() => {
  const saved = localStorage.getItem('tf-theme') as 'light' | 'dark' | 'system' | null
  const theme = saved || 'light'
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}, [])
```

**Notifications section:**

Info banner at top:
```
<div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--status-blue-bg)] text-[var(--status-blue)] text-[13px] mb-6">
  ℹ️ Notification delivery coming soon — your preferences are saved for when it launches.
</div>
```

5 toggle rows, each:
```
<div className="flex items-center justify-between py-4 border-b border-[var(--border-light)]">
  <div>
    <div className="text-[14px] font-[500] text-[var(--text-primary)]">{icon} {label}</div>
    <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{description}</div>
  </div>
  <button
    onClick={() => toggleNotification(key)}
    className={`w-[48px] h-[28px] rounded-full transition-colors flex items-center px-[2px] ${
      value ? 'bg-[var(--brand-primary)] justify-end' : 'bg-[var(--border-strong)] justify-start'
    }`}
  >
    <div className="w-[24px] h-[24px] rounded-full bg-white shadow-[var(--shadow-sm)]" />
  </button>
</div>
```

Toggle items:
```
{ key: 'deadlineReminders', icon: '⏰', label: 'Deadline reminders', desc: '3 days before project target date' }
{ key: 'lowStockAlerts',    icon: '📦', label: 'Low stock alerts', desc: 'When material drops below minimum' }
{ key: 'certExpiry',        icon: '📜', label: 'Cert expiry warnings', desc: '30 days before crew certification expires' }
{ key: 'maintenanceDue',    icon: '🔧', label: 'Maintenance due', desc: 'When equipment hours approach service interval' }
{ key: 'weeklyDigest',      icon: '📧', label: 'Weekly email digest', desc: 'Summary of project activity every Monday' }
```

Persist to localStorage: `localStorage.setItem('tf-notifications', JSON.stringify(notifications))`
Load on mount from localStorage.
(Supabase persistence will work once S9-6 table is created and Charlie runs the migration.)

**Integrations section:**

```
Grid: grid grid-cols-1 sm:grid-cols-2 gap-4
```

6 integration cards:
```
Each card:
  className: "p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]"
  If "Coming Soon": add "opacity-60"

  Layout:
    Header row: flex items-center gap-3 mb-3
      Icon: text-[24px]
      Name: text-[14px] font-[600]
      Status badge (right-aligned, ml-auto):
        Connected: "text-[11px] font-[500] px-2 py-1 rounded-full bg-[var(--status-green-bg)] text-[var(--status-green)]"
        Coming Soon: "... bg-[var(--status-gray-bg)] text-[var(--status-gray)]"
        Not Connected: "... bg-[var(--status-amber-bg)] text-[var(--status-amber)]"
    Description: text-[13px] text-[var(--text-secondary)] mb-4
    Button:
      Connected: Button variant="secondary" size="sm" "Manage" (or navigates appropriately)
      Coming Soon: Button variant="secondary" size="sm" disabled "Coming Soon"
      Not Connected: Button variant="primary" size="sm" "Connect"
```

Cards:
```
{ icon: '💳', name: 'Stripe', desc: 'Payment processing & subscriptions',
  status: org?.stripeCustomerId ? 'connected' : 'not_connected',
  // stripeCustomerId is already in the org store (orgStore.ts) — loaded from Supabase organizations table
  // Check: useOrgStore().org?.stripeCustomerId — it's a string or null
  action: () => navigate('/billing') }

{ icon: '📊', name: 'QuickBooks', desc: 'Accounting & bookkeeping sync', status: 'coming_soon' }
{ icon: '📅', name: 'Google Calendar', desc: 'Schedule & deadline sync', status: 'coming_soon' }
{ icon: '🌤️', name: 'Weather API', desc: 'Job site weather forecasts', status: 'coming_soon' }
{ icon: '🗺️', name: 'Mapbox', desc: 'Project location mapping', status: 'coming_soon' }

{ icon: '🤖', name: 'Claude AI', desc: 'Smart suggestions & estimates',
  status: import.meta.env.VITE_ANTHROPIC_API_KEY ? 'connected' : 'not_connected' }
```

**Team Members section:**

Simple placeholder for now:
```
<div className="text-center py-12">
  <div className="text-[48px] mb-4 opacity-30">👥</div>
  <div className="text-[16px] font-[600] mb-2">Team Management</div>
  <div className="text-[13px] text-[var(--text-tertiary)] mb-6">
    You're the only member. Invite your crew when you're ready.
  </div>
  <Button variant="primary" onClick={() => {/* show toast */}}>
    Invite Member
  </Button>
</div>
```
Toast on click: "Team invitations coming in Phase 2"

**Billing section:**

Simple redirect section:
```
Current plan card + "Manage Subscription →" button that navigates to /billing.
Reuse the existing billing shortcut pattern from the current Profile section.
```

### Acceptance criteria
- [ ] `npm run build` passes
- [ ] Left nav switches between all 6 sections (desktop: sidebar, mobile: horizontal tabs)
- [ ] Profile: email read-only, org name editable + save, demo data clearing works
- [ ] Appearance: 3 theme cards, clicking changes `data-theme` on `<html>`, persists to localStorage, survives page reload
- [ ] Notifications: 5 toggle switches with pill-style toggle buttons, state persists to localStorage
- [ ] Integrations: 6 cards with correct status badges (Stripe checks `org.stripeCustomerId`, Claude AI checks env var, others show "Coming Soon")
- [ ] Team: empty state with invite placeholder
- [ ] Billing: links to `/billing` page
- [ ] Theme applies on app load (AppLayout reads from localStorage)

---

## S9-6: SQL Migration + Dashboard Update (P0 — DB + Bookkeeping)

**Goal:** Write the `user_preferences` table migration for Charlie to run in Supabase, and update the project dashboard.

**Files to create:**
- `.claude/SQL/sprint_9_migrations.sql`

**Files to modify:**
- `PROJECT_DASHBOARD.html` — update sprint status

**Dependencies:** None (SQL file is standalone; dashboard update happens last).

### Implementation details

**`.claude/SQL/sprint_9_migrations.sql` — full migration file:**

```sql
-- ============================================================
-- Sprint 9 Migrations — user_preferences table
-- Run in Supabase SQL Editor BEFORE testing Sprint 9 features
-- Idempotent: safe to run multiple times
-- ============================================================

-- 1. Create the user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Onboarding data
  business_type TEXT,
  company_name TEXT,
  team_size TEXT,
  user_role TEXT,
  priorities TEXT[] DEFAULT '{}',
  onboarding_completed_at TIMESTAMPTZ,

  -- Dashboard preferences
  selected_kpis TEXT[] DEFAULT '{active_projects,pipeline_value,crew_available,low_stock_alerts}',
  custom_kpis JSONB DEFAULT '[]'::jsonb,
  widget_layout JSONB DEFAULT '[]'::jsonb,

  -- Notification preferences
  notification_settings JSONB DEFAULT '{
    "deadline_reminders": true,
    "low_stock_alerts": true,
    "cert_expiry": true,
    "maintenance_due": true,
    "weekly_digest": false
  }'::jsonb,

  -- Theme
  theme TEXT DEFAULT 'light',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies — users can only read/write their own preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Updated_at trigger (reuse existing function if it exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_org_id ON user_preferences(org_id);
```

**`PROJECT_DASHBOARD.html` — update after all tasks:**

1. Move S9-1 through S9-6 from `currentSprint.tasks` to `completedWork` array
2. Set `lastUpdated` to today's date
3. Update `currentSprint` to "Sprint 10 — Dashboard Customization"
4. Check Phase 1 gate criteria if any are newly met:
   - "Professional UI: light theme, readable in daylight" → should now be checked (theme toggle + v2 tokens)
   - "AI streamlining: smart project creation" → already checked from S7-4 but onboarding adds more AI

### Acceptance criteria
- [ ] `npm run build` passes
- [ ] `.claude/SQL/sprint_9_migrations.sql` exists and is idempotent (uses IF NOT EXISTS, DROP IF EXISTS)
- [ ] SQL creates `user_preferences` table with all columns matching the TypeScript `UserPreferences` interface
- [ ] 4 RLS policies (SELECT, INSERT, UPDATE, DELETE) — all scoped to `auth.uid() = user_id`
- [ ] `updated_at` trigger exists
- [ ] Indexes on `user_id` and `org_id`
- [ ] `PROJECT_DASHBOARD.html` reflects Sprint 9 completion and Sprint 10 as next

---

## Sprint 10 Preview (for planning awareness — not yet executable)

Sprint 10 covers dashboard power features, dependent on Sprint 9's tokens + preferences table:
- **S10-1:** KPI Customization Drawer — slide-in panel from right, drag-to-reorder active KPIs, library of 12+ KPIs, natural language AI input with chips
- **S10-2:** Widget System + Edit Layout mode — drag-and-drop dashboard canvas, "Edit Layout" toggle, "Add Widget" picker (Chart, Notes, Calendar, Activity Feed)
- **S10-3:** Mapbox Map Widget — `mapbox-gl` integration, status-colored project pins, hover tooltips, map/satellite toggle, color legend
- **S10-4:** Polish pass — empty states with illustrations, loading skeletons, motion/transitions per DESIGN_SYSTEM.md spec, accessibility audit (contrast, focus rings, aria-labels)

Visual reference for Sprint 10: `.claude/design-preview-v3-customizable.html` (archived in git at commit `ed22f60`).
