# Sprint 22 — Navigation Consolidation: 5 Groups with Sub-Tabs

> **Goal**: Reduce the icon rail from 8 items to 5 workflow groups (Dashboard, Jobs, Resources, Manifest, Settings). Grouped pages show a sub-tab bar below the TopNav.
>
> **Branch**: `sprint-22-nav-consolidation`
> **Design reference**: `.claude/design/design-preview-v7-tablet-density.html` — tab-row pattern
> **SQL migrations**: No
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-22-nav-consolidation --title "Sprint 22: Navigation Consolidation — 5 Groups" --body "Reduces icon rail from 8 to 5 groups. Adds sub-tab bar for Jobs, Resources, Manifest. All routes preserved."`

---

## CRITICAL CONTEXT

> - Sprint 21 shipped the icon rail + top nav shell. This sprint reorganizes what's IN the rail.
> - All existing routes in `App.tsx` remain unchanged — we only change navigation UI.
> - The 5 groups:
>   - **Dashboard** → `/` (no sub-tabs, single page)
>   - **Jobs** → sub-tabs: Projects `/projects`, Schedule `/schedule`, Work Orders `/work-orders`
>   - **Resources** → sub-tabs: Crew `/crew-manager`, Equipment `/equipment`, Materials `/materials`
>   - **Manifest** → sub-tabs: Manifest Engine `/manifest`, Price Research `/price-research`
>   - **Settings** → sub-tabs: Settings `/settings`, Billing `/billing`
> - Clicking a group icon navigates to its default sub-tab (first item)
> - Sub-tab bar appears below TopNav for groups with multiple pages
> - The crew app at `/crew/*` is NOT affected
> - Files from Sprint 21: `navConfig.ts`, `NavIcon.tsx`, `IconRail.tsx`, `TopNav.tsx`, `MobileSidebar.tsx`, `AppLayout.tsx`

---

## S22-1: Restructure navConfig.ts with Groups

**Problem/Goal**: Replace flat nav item list with grouped navigation structure.

**Files to modify**:
- `src/components/layout/navConfig.ts` — restructure

**Implementation details**:

Replace the current flat arrays with a grouped structure:

```typescript
export interface NavItem {
  path: string;
  icon: string;
  label: string;
}

export interface NavGroup {
  key: string;
  icon: string;
  label: string;
  defaultPath: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    key: 'dashboard',
    icon: 'grid',
    label: 'Dashboard',
    defaultPath: '/',
    items: [], // No sub-tabs — single page
  },
  {
    key: 'jobs',
    icon: 'folder',
    label: 'Jobs',
    defaultPath: '/projects',
    items: [
      { path: '/projects', icon: 'folder', label: 'Projects' },
      { path: '/schedule', icon: 'calendar', label: 'Schedule' },
      { path: '/work-orders', icon: 'check-square', label: 'Work Orders' },
    ],
  },
  {
    key: 'resources',
    icon: 'users',
    label: 'Resources',
    defaultPath: '/crew-manager',
    items: [
      { path: '/crew-manager', icon: 'users', label: 'Crew' },
      { path: '/equipment', icon: 'wrench', label: 'Equipment' },
      { path: '/materials', icon: 'package', label: 'Materials' },
    ],
  },
  {
    key: 'manifest',
    icon: 'clipboard',
    label: 'Manifest',
    defaultPath: '/manifest',
    items: [
      { path: '/manifest', icon: 'clipboard', label: 'Manifest Engine' },
      { path: '/price-research', icon: 'search', label: 'Price Research' },
    ],
  },
  {
    key: 'settings',
    icon: 'settings',
    label: 'Settings',
    defaultPath: '/settings',
    items: [
      { path: '/settings', icon: 'settings', label: 'Settings' },
      { path: '/billing', icon: 'credit-card', label: 'Billing' },
    ],
  },
];

// Helper: find which group a path belongs to
export function findGroupForPath(pathname: string): NavGroup | undefined {
  return navGroups.find((g) => {
    if (g.defaultPath === '/' && pathname === '/') return true;
    if (g.defaultPath !== '/' && pathname.startsWith(g.defaultPath)) return true;
    return g.items.some((item) => pathname.startsWith(item.path));
  });
}

// Keep flat list for MobileSidebar (all navigable pages)
export const allNavItems: NavItem[] = navGroups.flatMap((g) =>
  g.items.length > 0 ? g.items : [{ path: g.defaultPath, icon: g.icon, label: g.label }]
);
```

Remove the old `navConfig` and `secondaryNavItems` exports. Update all imports in other files.

**Acceptance criteria**:
- [ ] `navGroups` exported with 5 groups
- [ ] `findGroupForPath` helper exported
- [ ] `allNavItems` flat list exported for mobile sidebar
- [ ] Old `navConfig` and `secondaryNavItems` removed
- [ ] `npm run build` passes

---

## S22-2: Update IconRail to Show 5 Groups

**Problem/Goal**: Icon rail shows 5 group icons instead of 8 individual page icons. Settings moves from bottom spacer position into the main group list.

**Files to modify**:
- `src/components/layout/IconRail.tsx` — use navGroups

**Implementation details**:

Replace the navConfig import with navGroups. Map over `navGroups` instead of flat items.

Active state: a group icon is active if `findGroupForPath(location.pathname)?.key === group.key`.

Clicking a group icon navigates to `group.defaultPath`.

Remove the separate settings icon at the bottom — settings is now in the group list.

The rail now shows exactly 5 icons: grid (Dashboard), folder (Jobs), users (Resources), clipboard (Manifest), settings (Settings).

**Acceptance criteria**:
- [ ] Icon rail shows exactly 5 icons
- [ ] Clicking Jobs navigates to /projects
- [ ] Clicking Resources navigates to /crew-manager
- [ ] Clicking Manifest navigates to /manifest
- [ ] Active highlight works for all sub-pages within a group
- [ ] `npm run build` passes

---

## S22-3: Create SubTabBar Component

**Problem/Goal**: A horizontal tab bar that appears below TopNav when the current page belongs to a group with sub-tabs.

**Files to create**:
- `src/components/layout/SubTabBar.tsx` — new component

**Design reference**: `design-preview-v7-tablet-density.html` → `.tab-btn` styles (lines 122-143)

**Implementation details**:

```typescript
// No props needed — reads route from useLocation
```

Structure:
```
<nav> — full width, flex row, border-bottom
  Map over activeGroup.items:
    <button> — tab style, active state for current path
      Icon (14px) + Label text (13px)
    </button>
```

Logic:
1. `useLocation()` to get current pathname
2. `findGroupForPath(pathname)` to get the active group
3. If group has no items (Dashboard) or only 1 item → render nothing (return null)
4. If group has 2+ items → render the tab bar

**Styling** (matching v7 `.tab-btn` pattern):
- Container: `flex items-center gap-0.5 px-4 overflow-x-auto`, background `var(--surface-card)`, border-bottom `1px solid var(--border-default)`
- Use `scrollbar-width: none` and `::-webkit-scrollbar { display: none }` for clean horizontal scroll on mobile
- Each tab button: `px-3.5 py-2 text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all duration-100 border border-transparent cursor-pointer bg-transparent min-h-[40px]`
- Default color: `var(--text-tertiary)`
- Hover: background `var(--surface-hover)`, color `var(--text-secondary)`, border-radius `var(--radius-md)`
- Active: background `var(--brand-primary-bg)`, color `var(--brand-primary)`, border-color `var(--brand-primary)`, border-radius `var(--radius-md)`

Active matching: exact match on `pathname.startsWith(item.path)` (same logic as icon rail).

**Acceptance criteria**:
- [ ] SubTabBar renders for Jobs, Resources, Manifest, Settings groups
- [ ] SubTabBar does NOT render on Dashboard
- [ ] Active sub-tab highlighted with brand-primary styling
- [ ] Clicking a sub-tab navigates to correct page
- [ ] Horizontal scroll works on narrow viewports
- [ ] `npm run build` passes

---

## S22-4: Wire SubTabBar into AppLayout

**Problem/Goal**: Add SubTabBar between TopNav and the banner/content area in AppLayout.

**Files to modify**:
- `src/components/layout/AppLayout.tsx` — add SubTabBar import and render

**Implementation details**:

Add `import { SubTabBar } from '@/components/layout/SubTabBar'` and render it right after `<TopNav />`:

```tsx
<TopNav ... />
<SubTabBar />
{/* Trial banner */}
{showTrial && ( ... )}
```

No other changes to AppLayout.

**Acceptance criteria**:
- [ ] SubTabBar visible below TopNav on grouped pages
- [ ] No sub-tab bar on Dashboard
- [ ] Banners still render below the sub-tab bar
- [ ] Page content area unchanged
- [ ] `npm run build` passes

---

## S22-5: Update MobileSidebar for Grouped Navigation

**Problem/Goal**: Mobile sidebar now shows groups with indented sub-items instead of a flat list.

**Files to modify**:
- `src/components/layout/MobileSidebar.tsx` — restructure nav section

**Implementation details**:

Replace the flat `navConfig.map()` with `navGroups.map()`:

For each group:
- If group has no sub-items (Dashboard): render a single nav button (same as current)
- If group has sub-items: render group label as a section header, then indented sub-items

Structure:
```
Dashboard (clickable, navigates to /)
─────
Jobs (section header, not clickable)
  Projects (indented, navigates to /projects)
  Schedule (indented, navigates to /schedule)
  Work Orders (indented, navigates to /work-orders)
─────
Resources (section header)
  Crew (indented)
  Equipment (indented)
  Materials (indented)
─────
Manifest (section header)
  Manifest Engine (indented)
  Price Research (indented)
─────
Settings (section header)
  Settings (indented)
  Billing (indented)
```

Section header styling: `text-[11px] font-bold uppercase tracking-wider px-3 py-2`, color `var(--sidebar-text-muted)`, NOT clickable.

Sub-item styling: same as current nav items but with `pl-8` (left indent) instead of `pl-3`.

Remove the old "secondary items" section (Settings, Billing, Price Research) — they're now in their groups.

Keep the Crew App external link after all groups, before the footer.

**Acceptance criteria**:
- [ ] Mobile sidebar shows grouped navigation with section headers
- [ ] Sub-items are indented under their group
- [ ] Dashboard is a single clickable item (no header)
- [ ] Crew App external link still present
- [ ] Sign out still works
- [ ] All pages reachable from mobile sidebar
- [ ] `npm run build` passes

---

## S22-6: Update TopNav User Dropdown

**Problem/Goal**: Remove Billing and Settings from the user dropdown since they're now in the Settings group in the icon rail. Simplify dropdown to just: email, Crew App, Sign Out.

**Files to modify**:
- `src/components/layout/TopNav.tsx` — simplify dropdown

**Implementation details**:

Remove the Billing and Settings navigation buttons from the dropdown. New dropdown structure:

```
User email (text)
─────
Crew App (opens new tab)
─────
Sign Out
```

This is cleaner — Settings and Billing are always one click away in the icon rail/sub-tabs.

**Acceptance criteria**:
- [ ] Dropdown shows only: email, Crew App, Sign Out
- [ ] Billing and Settings removed from dropdown (accessible via icon rail)
- [ ] `npm run build` passes

---

## Execution Order

1. **S22-1** — navConfig restructure (foundation)
2. **S22-2** — IconRail update (depends on S22-1)
3. **S22-3** — SubTabBar creation (depends on S22-1)
4. **S22-5** — MobileSidebar update (depends on S22-1)
5. **S22-6** — TopNav dropdown simplification (independent)
6. **S22-4** — Wire SubTabBar into AppLayout (depends on S22-3)

Build after each task. Commit after each task.

---

## SQL Migrations Required

None for this sprint.

---

## Post-Sprint Test Plan

### New Features
1. **Icon rail shows 5 icons** — Dashboard, Jobs, Resources, Manifest, Settings
2. **Sub-tab bar on Jobs pages** — Navigate to /projects. Sub-tabs should show: Projects | Schedule | Work Orders. Click each — correct page loads, active tab highlights.
3. **Sub-tab bar on Resources** — Navigate to /crew-manager. Sub-tabs: Crew | Equipment | Materials.
4. **Sub-tab bar on Manifest** — Navigate to /manifest. Sub-tabs: Manifest Engine | Price Research.
5. **Sub-tab bar on Settings** — Navigate to /settings. Sub-tabs: Settings | Billing.
6. **No sub-tab bar on Dashboard** — Navigate to /. No sub-tab bar visible.
7. **Mobile sidebar grouped** — Open hamburger. Items grouped with section headers. All pages reachable.
8. **User dropdown simplified** — Only email, Crew App, Sign Out.

### Regression Checks
1. **All pages still render** — Projects, Schedule, Work Orders, Crew, Equipment, Materials, Manifest, Price Research, Settings, Billing, Dashboard
2. **Crew app unchanged** — /crew still uses CrewLayout
3. **Theme toggle still works** in TopNav
4. **Trial/payment banners** still render when applicable
5. **Sign out** works from both dropdown and mobile sidebar

### Edge Cases
1. **Direct URL navigation** — Type /schedule directly in URL bar. Jobs icon should highlight, Schedule sub-tab should be active.
2. **Browser back/forward** — Navigate between sub-tabs, use back button. Correct tabs should highlight.
3. **Resize from mobile to desktop** — Sub-tab bar appears, mobile overlay closes.
