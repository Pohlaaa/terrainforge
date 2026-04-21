# Track 2 — Full UI Overhaul: Layout, Design Personality & Polish Fixes

> **Branch**: `refactor-ui-complete`
> **Depends on**: Track 1 (architecture cleanup) and Track 3 (account management) already merged to main
> **Goal**: Three passes in one shot — (A) align layout/structure to Figma, (B) layer bespoke design personality, (C) fix contrast, chart quality, and cleanup. **Commit after each pass.**

---

### DO NOT CHANGE (preserve these exactly):
- **Dark mode as default** — `data-theme="dark"` is the brand default. All styling must work in both themes via CSS variables. Do not switch the default to light.
- **Projects tab chart/map toggle** — Do not remove or restructure. Improve what's behind it.
- **Wizard flow** — ProjectWizard and all wizard step components are untouched.
- **PDF components** — CrewPacketPDF and ManifestPDF use @react-pdf/renderer. Do not touch. Hardcoded hex in PDFs is acceptable.
- **Auth flow** — AuthCallback.tsx, ResetPassword.tsx, and the signup verification flow from Track 3 must remain working.

---

# PASS A — Layout, Structure & Figma Alignment

> Figma reference: `https://www.figma.com/make/8U9qU4ZFoP9LgOcEiUtnPC/`
> The Figma shows centered content, pill tabs, KPI icon circles, two-column layouts, clean tables, and a minimal app header.

## A1: Centered Content Container

In `src/components/layout/AppLayout.tsx`, wrap `{children}` in a max-width container:

```tsx
<main className="flex-1 overflow-y-auto bg-transparent">
  <div className="max-w-6xl mx-auto px-6 py-6">
    {children}
  </div>
</main>
```

- `max-w-6xl` = 1152px, centered with `mx-auto`.
- The `<main>` background MUST be `bg-transparent` so the body topo texture shows through.
- TopNav stays full-width. Only the content area gets max-width.

## A2: Hub Header

Create `src/components/shared/HubHeader.tsx`:
```tsx
import React from 'react';
import { useOrgStore } from '@/stores/orgStore';

export const HubHeader: React.FC = () => {
  const org = useOrgStore((s) => s.org);
  const now = new Date();
  const formatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex items-baseline justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{org?.name || 'TerrainForge'}</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Landscaping Project Management</p>
      </div>
      <div className="text-right text-sm text-[var(--text-tertiary)]">
        <div>Today</div>
        <div className="font-medium text-[var(--text-secondary)]">{formatted}</div>
      </div>
    </div>
  );
};
```

Add `<HubHeader />` to all 4 hub pages (Dashboard, BudgetHub, MaterialLibrary, CrewEquipmentHub).

## A3: Pill-Style Tab Navigation

In `src/components/layout/TopNav.tsx`, replace the bottom-border tab styling:

**Active tab:** Green pill background, white text, rounded-full, `px-5 py-2`, font-medium.
**Inactive tab:** Transparent background, `var(--text-secondary)` text, rounded-full.
**Hover (inactive):** `var(--surface-hover)` background.

Tab container: wrap tabs in a subtle card:
```tsx
<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-card)] border border-[var(--border-light)]">
  {/* tab links */}
</div>
```

Remove any bottom-border active indicator entirely.

## A4: KPI Card Redesign with Icon Circles

Update `src/components/shared/KPICard.tsx` to accept `icon`, `iconBg`, and `iconColor` props:

```tsx
interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: 'green' | 'red' | 'amber' | 'default';
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}
```

Layout: Label top-left, large bold value below, optional subtext, icon in a colored circle top-right (`w-10 h-10 rounded-full flex items-center justify-center`).

Card styling: `bg-[var(--surface-card)] border border-[var(--border-light)] rounded-xl p-5`.

Update ALL hub pages with icon props:

**Dashboard.tsx (Projects):**
| KPI | Icon | iconBg | iconColor |
|-----|------|--------|-----------|
| Active Projects | TrendingUp | `bg-green-100 dark:bg-green-900/40` | `text-green-600 dark:text-green-400` |
| Completed This Month | Calendar | `bg-blue-100 dark:bg-blue-900/40` | `text-blue-600 dark:text-blue-400` |
| Pipeline Value | BarChart3 | `bg-orange-100 dark:bg-orange-900/40` | `text-orange-600 dark:text-orange-400` |
| Average Completion | Users | `bg-purple-100 dark:bg-purple-900/40` | `text-purple-600 dark:text-purple-400` |

**BudgetHub.tsx:**
| KPI | Icon | iconBg | iconColor |
|-----|------|--------|-----------|
| Revenue | DollarSign | `bg-teal-100 dark:bg-teal-900/40` | `text-teal-600 dark:text-teal-400` |
| Expenses | TrendingDown | `bg-pink-100 dark:bg-pink-900/40` | `text-pink-600 dark:text-pink-400` |
| Profit | TrendingUp | `bg-blue-100 dark:bg-blue-900/40` | `text-blue-600 dark:text-blue-400` |
| Avg Budget | DollarSign | `bg-orange-100 dark:bg-orange-900/40` | `text-orange-600 dark:text-orange-400` |

**MaterialLibrary.tsx:**
| KPI | Icon | iconBg | iconColor |
|-----|------|--------|-----------|
| Total Materials | Package | `bg-teal-100 dark:bg-teal-900/40` | `text-teal-600 dark:text-teal-400` |
| Low Stock | AlertTriangle | `bg-red-100 dark:bg-red-900/40` | `text-red-600 dark:text-red-400` |
| In Stock | CheckCircle | `bg-green-100 dark:bg-green-900/40` | `text-green-600 dark:text-green-400` |
| Categories | ShoppingCart | `bg-blue-100 dark:bg-blue-900/40` | `text-blue-600 dark:text-blue-400` |

**CrewEquipmentHub.tsx (or extracted CrewEquipmentKPIs):**
| KPI | Icon | iconBg | iconColor |
|-----|------|--------|-----------|
| Total Crew | Users | `bg-purple-100 dark:bg-purple-900/40` | `text-purple-600 dark:text-purple-400` |
| Available | Laptop | `bg-green-100 dark:bg-green-900/40` | `text-green-600 dark:text-green-400` |
| Total Equipment | Wrench | `bg-orange-100 dark:bg-orange-900/40` | `text-orange-600 dark:text-orange-400` |
| Maintenance Due | AlertTriangle | `bg-red-100 dark:bg-red-900/40` | `text-red-600 dark:text-red-400` |

KPI grid: `grid grid-cols-2 lg:grid-cols-4 gap-4` on all hub pages.

## A5: Two-Column Middle Sections

**BudgetHub.tsx**: Revenue vs Expenses (60%) + Expense Breakdown (40%):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3">{/* Revenue chart */}</div>
  <div className="lg:col-span-2">{/* Expense breakdown */}</div>
</div>
```

**CrewEquipmentHub.tsx**: Crew Status (55%) + Week Schedule (45%):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>{/* Crew cards */}</div>
  <div>{/* Schedule */}</div>
</div>
```

## A6: Table Styling

Update shared DataTable or create table utility classes:
- Headers: `text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]`, bottom border only
- Rows: `text-sm text-[var(--text-primary)]`, subtle separator `border-b border-[var(--border-light)]`
- NO alternating row colors
- Status badges: consistent pill badges using `StatusBadge` component

Create `src/components/shared/StatusBadge.tsx`:
```tsx
import React from 'react';

interface StatusBadgeProps {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

const VARIANTS = {
  success: 'bg-[var(--status-green-bg)] text-[var(--status-green)]',
  warning: 'bg-[var(--status-amber-bg)] text-[var(--status-amber)]',
  error: 'bg-[var(--status-red-bg)] text-[var(--status-red)]',
  info: 'bg-[var(--status-blue-bg)] text-[var(--status-blue)]',
  neutral: 'bg-[var(--status-gray-bg)] text-[var(--status-gray)]',
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]}`}>
    {label}
  </span>
);
```

## A7: Extract Oversized Components

Break up the largest files. No visual changes — just structural extraction.

### MaterialLibrary.tsx (966 → ~350 lines)
Extract into `src/components/materials/`:
- `MaterialFormModal.tsx` — Add/Edit modal with form fields
- `MaterialTable.tsx` — Material list table with badges and actions
- `CSVImportModal.tsx` — File input, preview, error/success
- `MaterialQuickAddBar.tsx` — Quick-add inline form
- `LowStockBanner.tsx` — Alert banner for low stock items

### CrewEquipmentHub.tsx (518 → ~250 lines)
Extract into `src/components/crew/`:
- `CrewTable.tsx` — Crew member list with availability badges
- `EquipmentTable.tsx` — Equipment list with status indicators
- `CrewEquipmentKPIs.tsx` — 4 KPI cards for the tab

### Dashboard Tab Components (400-700 lines each)
Extract modal and form sections from `src/components/project-dashboard/`:
- ComplianceTab.tsx → `compliance/PermitFormModal.tsx`, `compliance/SiteConditionFormModal.tsx`, `compliance/SubcontractorFormModal.tsx`
- OverviewTab.tsx → `overview/ProjectInfoCard.tsx`, `overview/ProjectTimelineCard.tsx`, `overview/ProjectNotesSection.tsx`
- ResourcesTab.tsx → `resources/CrewAssignmentPanel.tsx`, `resources/EquipmentAssignmentPanel.tsx`
- BudgetTab.tsx → `budget/BudgetBreakdownTable.tsx`, `budget/CostSummaryCard.tsx`
- TasksTab.tsx → `tasks/TaskFormModal.tsx`, `tasks/TaskTable.tsx`

Each parent component should be under 300 lines after extraction.

## A8: Responsive Improvements

- TopNav: Mobile (< 768px) tabs collapse to horizontal scroll
- KPI grids: `grid-cols-2 lg:grid-cols-4`
- Two-column sections: `grid-cols-1 lg:grid-cols-*`
- Tables: `overflow-x-auto` wrapper on all DataTable instances

## A9: Landing Page Refresh

Update `src/pages/Landing.tsx` to use the same centered max-width container, color palette, card styling, and pill button style as the internal app. Don't change the copy — just the visual styling.

## A10: Inline Style Migration

### SetupChecklist.tsx — 20+ inline `style={{}}` objects
Replace every `style={{ color: '...', background: '...' }}` with Tailwind utility classes.

### Hardcoded hex colors in non-PDF files
Search for hex color patterns in JSX/TSX files. Replace with CSS variables:
| Hardcoded | Replace with |
|-----------|-------------|
| `#2D6A4F` | `var(--brand-primary)` |
| `#D97706`, `#F59E0B` | `var(--status-amber)` |
| `#DC2626`, `#F87171` | `var(--status-red)` |
| `#2563EB`, `#3B82F6` | `var(--status-blue)` |
| `#7C3AED`, `#A78BFA` | `var(--purple)` / `var(--purple-l)` |
| `#FFFFFF` in button text | `var(--text-on-primary)` |

**Exempt**: `pdf/CrewPacketPDF.tsx`, `pdf/ManifestPDF.tsx`, `Debug.tsx`.

Priority files: Billing.tsx, WorkOrders.tsx, PriceResearch.tsx, PreferencesSection.tsx, WizardStep3.tsx, MobileSidebar.tsx, Dashboard.tsx.

### Dashboard.tsx inline styles
Replace `style={{ background: 'var(--xxx)' }}` patterns with Tailwind:
- `style={{ background: 'var(--surface-card)' }}` → `bg-[var(--surface-card)]`
- `style={{ color: 'var(--text-primary)' }}` → `text-[var(--text-primary)]`
- `style={{ border: '1px solid var(--border-default)' }}` → `border border-[var(--border-default)]`

**Run `npm run build` and verify it passes. Then commit Pass A:**
```
git add -A && git commit -m "refactor: Pass A — centered layout, pill tabs, KPI icons, table styling, component extraction, responsive"
```

---

# PASS B — Design Personality: Texture, Color, Motion & Charts

## B1: Topographic Background Texture

The topo pattern SVG is already defined as `--topo-pattern` in `src/index.css` and applied to body. However, it uses low opacity values (0.04/0.03). Bump the opacities so it's actually visible:

**Light theme `:root`** — update the existing `--topo-pattern`:
Change opacity values to: first path `0.06`, second `0.04`, third `0.04`, fourth `0.03`.

**Dark theme `[data-theme="dark"]`** — update the existing `--topo-pattern`:
Change opacity values to: first path `0.07`, second `0.05`, third `0.05`, fourth `0.03`.

**CRITICAL**: The topo pattern must be VISIBLE. Ensure:
- AppLayout `<main>` has NO background color — use `bg-transparent` (set in A1)
- No wrapper div between body and the content area has a solid background
- Cards (`--surface-card`) remain solid — texture only shows in gaps and margins between cards

## B2: Warm Gray Color Temperature Shift

In `src/index.css`, replace the cool blue-grays with warm stone grays:

**Light theme `:root`:**
```css
--surface-bg: #FAF9F7;           /* was #FAFAFA */
--surface-hover: #F3F1EE;        /* was #F3F4F6 */
--surface-active: #E5E3DF;       /* was #E5E7EB */
--text-secondary: #57534E;       /* was #4B5563 */
--text-tertiary: #A8A29E;        /* was #9CA3AF */
--text-disabled: #D6D3D1;        /* was #D1D5DB */
--border-light: #F3F1EE;         /* was #F3F4F6 */
--border-default: #E7E5E4;       /* was #E5E7EB */
--border-strong: #D6D3D1;        /* was #D1D5DB */
```

**Dark theme `[data-theme="dark"]`:**
```css
--surface-bg: #171412;           /* was #0F172A */
--surface-card: #231F1C;         /* was #1E293B */
--surface-hover: #332E2A;        /* was #334155 */
--surface-active: #47413B;       /* was #475569 */
--text-secondary: #C8C2BA;       /* was #CBD5E1 */
--text-tertiary: #78716C;        /* was #64748B */
--text-disabled: #47413B;        /* was #475569 */
--border-light: #231F1C;         /* was #1E293B */
--border-default: #332E2A;       /* was #334155 */
--border-strong: #47413B;        /* was #475569 */
```

Also add these dark-theme brand secondary tokens:
```css
--brand-secondary: #E5BE5A;
--brand-secondary-hover: #F0D06A;
--brand-secondary-bg: #3D2E0A;
```

`--surface-card` stays `#FFFFFF` in light mode. `--text-primary` stays unchanged.

## B3: Gold/Amber Secondary Accent

The `.btn-primary-gold` and `.btn-danger` classes are already defined in `index.css`. Now:
- Add `.btn-primary-gold` class to primary CTA buttons ("New Project", landing page CTAs)
- Do NOT apply to destructive/red buttons — those use `btn-danger`
- Add `kpi-card-hover` class to interactive KPI cards

Also add:
```css
.kpi-card-hover {
  border-top: 2px solid transparent;
  transition: border-color 150ms ease;
}
.kpi-card-hover:hover {
  border-top: 2px solid var(--brand-secondary);
}
```

## B4: Spring Micro-Interactions

Using existing `--spring: cubic-bezier(0.34, 1.56, 0.64, 1)`, add to `index.css`:

```css
@media (prefers-reduced-motion: no-preference) {
  .card-interactive {
    transition: transform 200ms var(--spring), box-shadow 200ms ease;
    cursor: pointer;
  }
  .card-interactive:hover { box-shadow: var(--shadow-hover); }
  .card-interactive:active { transform: scale(0.98); }

  .progress-fill { transition: width 600ms var(--spring); }

  .tab-link {
    transition: background-color 150ms ease, color 150ms ease, transform 100ms var(--spring);
  }
  .tab-link:active { transform: scale(0.96); }

  button, [role="button"] {
    transition: transform 100ms var(--spring), background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }
  button:active, [role="button"]:active { transform: scale(0.97); }
}
```

Apply `card-interactive` class to clickable KPI cards, project rows, crew/equipment cards.

## B5: Chart Styling

### Bar charts (Dashboard.tsx):
- Rounded bar caps: `<Bar radius={[0, 4, 4, 0]} />` (horizontal) or `[4, 4, 0, 0]` (vertical)
- Gradient fill via `<defs><linearGradient>` using `var(--brand-primary)`
- Grid: `<CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />`
- Axes: `axisLine={false} tickLine={false}` with `fill="var(--text-tertiary)"` tick text

### Area/Line charts (BudgetHub.tsx):
- Gradient area fills below lines
- `strokeWidth={2}`, `dot={false}`, `activeDot={{ r: 4, strokeWidth: 2 }}`

### All chart tooltips — CRITICAL for dark mode:
```tsx
<Tooltip
  contentStyle={{
    backgroundColor: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    boxShadow: 'var(--shadow-panel)',
    color: 'var(--text-primary)',
    fontSize: '13px',
  }}
  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}
  itemStyle={{ color: 'var(--text-secondary)', padding: '2px 0' }}
  cursor={{ fill: 'var(--surface-hover)' }}
/>
```

You MUST include `labelStyle` and `itemStyle` on EVERY Recharts Tooltip — without them, Recharts renders black text in dark mode which is unreadable.

**Run `npm run build` and verify. Then commit Pass B:**
```
git add -A && git commit -m "refactor: Pass B — topo texture, warm grays, gold accent, spring animations, chart styling"
```

---

# PASS C — Polish Fixes & Cleanup

## C1: Map Sizing

In `src/pages/Dashboard.tsx`, change visualization container height from `280px` to `380px`:
```tsx
<div className="h-[300px] md:h-[380px]">
```

In `src/components/dashboard/widgets/MapWidget.tsx`, make it fill parent instead of fixed height:
```tsx
style={{ width: '100%', height: '100%' }}
```

## C2: Projects Page Chart Enhancement

In Dashboard.tsx:
- Add chart title: `<h3 className="text-sm font-medium mb-3 text-[var(--text-secondary)]">Project Progress Overview</h3>`
- Add active project count badge near the chart/map toggle
- Replace "New Project" button inline style/event handlers with the `.btn-primary` CSS class

## C3: Resend Verification Email Fix

In the signup flow (Signup.tsx), the resend handler should:
1. Try `supabase.auth.resend({ type: 'signup', email })`
2. If that fails, fall back to re-calling `signUp()` with the same email/password
3. Show success/error message
4. 60-second cooldown with disabled button

```ts
const handleResend = async () => {
  if (resendCooldown > 0) return;
  setResendMessage('');
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      // Fallback: re-call signUp which resends confirmation
      const { error: fallbackError } = await supabase.auth.signUp({ email, password });
      if (fallbackError) throw fallbackError;
    }
    setResendMessage('Verification email resent!');
    setResendCooldown(60);
  } catch (err) {
    setResendMessage(`Failed to resend: ${(err as Error).message}`);
  }
};
```

## C4: Auth Page Visual Refresh

Login, Signup, ForgotPassword, ResetPassword pages should:
- Show topo texture background (inherit from body — don't override with solid bg)
- Use `bg-[var(--surface-card)]` card with `border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-panel)]`
- Brand mark: green hexagon, serif "TerrainForge" text
- Submit buttons: primary green with `btn-primary-gold` class

## C5: Legacy CSS Cleanup

In `src/index.css`, search the codebase for each legacy alias. If an alias is used in 0 files, remove it. If used in 1-2 files, update those files to use the modern token and then remove the alias.

Check if these keyframe animations are referenced anywhere and remove unused ones:
`completionPulse`, `shimmerSweep`, `cardBirth`, `dropSettle`, `placeholderPulse`, `skeletonShimmer`, `breathe`, `btnPulse`, `errorShake`, `bellRing`, `stockPulseLow`, `stockPulseOut`, `inkDrop`

Keep any that are actually used by animation utility classes in the codebase.

**Run `npm run build` and verify. Then commit Pass C:**
```
git add -A && git commit -m "refactor: Pass C — map sizing, chart polish, tooltip contrast, auth styling, CSS cleanup"
```

---

# VERIFICATION (after all 3 passes)

1. `npm run build` passes with zero errors
2. Content is centered with breathing room on wide screens
3. Active tab shows as a colored pill (not underline)
4. KPI cards show colored icon circles on ALL 4 hub tabs, working in both light and dark mode
5. Topo texture is visible in gaps between cards (both themes)
6. Interface feels warm, not blue-gray
7. Chart tooltips are readable in dark mode (light text on dark card)
8. Map is taller (~380px) and fills its container
9. Projects chart has title, grid, gradient bars
10. Gold glow on primary CTAs, NOT on destructive buttons
11. Button/card press animations work (scale down on click)
12. Auth pages show topo background and warm card styling
13. Resend verification either works or shows a meaningful error
14. All existing functionality preserved — dark mode default, chart/map toggle, wizard, PDFs
15. No page file exceeds 400 lines, no component exceeds 300 lines
