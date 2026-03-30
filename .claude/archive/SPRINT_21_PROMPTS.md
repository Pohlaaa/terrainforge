# Sprint 21 — Layout Shell: Icon Rail + Top Nav

> **Goal**: Replace the full sidebar with a 64px icon rail and add a top nav bar with tab-style page navigation. All existing pages render inside the new shell with zero functionality changes.
>
> **Branch**: `sprint-21-layout-shell`
> **Design reference**: `.claude/design/design-preview-v7-tablet-density.html` — top-bar, mock-sidebar, greeting-compact sections
> **SQL migrations**: No
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-21-layout-shell --title "Sprint 21: Layout Shell — Icon Rail + Top Nav" --body "Replaces full sidebar with 64px icon rail. Adds top nav bar with tab-style navigation. All existing pages render inside new shell. No functionality changes."`

---

## CRITICAL CONTEXT

> **This sprint changes the app shell only — no page content is modified.**
> - Every existing page must render identically inside the new layout
> - The crew app at `/crew/*` is NOT affected — it uses `CrewLayout`, not `AppLayout`
> - The v7 design preview (`.claude/design/design-preview-v7-tablet-density.html`) is the target for the shell structure
> - Current sidebar is in `src/components/layout/Sidebar.tsx` (301 lines) and `AppLayout.tsx` (201 lines)
> - Current sidebar nav items are hardcoded in `Sidebar.tsx` lines 17-27 as `navItems[]`
> - Current sidebar width: 240px desktop, 56px collapsed tablet, hidden overlay mobile
> - Target: 64px icon rail (always visible on desktop/tablet), top nav bar for page tabs
> - CSS tokens: sidebar-related tokens (`--bg-sidebar`, `--sidebar-text`, etc.) already exist in `src/index.css`
> - The `PageHeader` component (`src/components/layout/PageHeader.tsx`, 50 lines) is NOT changed in this sprint
> - Trial banner and payment failed banner in AppLayout must remain functional
> - Active project pill currently lives in sidebar footer — moves to top nav right side
> - User email + sign-out currently in sidebar — moves to top nav dropdown
> - Mobile hamburger behavior changes: icon rail hidden on mobile, hamburger opens overlay with icon rail + labels

---

## S21-1: Add New Radius Tokens to CSS

**Problem/Goal**: Add the v7 radius tokens to `src/index.css` so subsequent tasks can reference them.

**Files to modify**:
- `src/index.css` — add tokens to `:root` block

**Implementation details**:

Add these tokens inside the existing `:root` block in `src/index.css`, after the existing shadow tokens:

```css
/* Radius tokens (v7) */
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
```

These tokens are used in the v7 design preview for all border-radius values. Do NOT change any existing `border-radius` values in this task — just add the tokens. Future sprints will migrate existing components.

Also add a spring easing curve token:
```css
/* Animation */
--spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

**Supabase considerations**: None — CSS-only change.

**Acceptance criteria**:
- [ ] Four radius tokens added to `:root` in index.css
- [ ] Spring easing token added to `:root` in index.css
- [ ] Dark theme block (`[data-theme="dark"]`) does NOT need these — they're theme-independent
- [ ] `npm run build` passes

---

## S21-2: Create IconRail Component

**Problem/Goal**: Build the new 64px icon rail that replaces the full sidebar. Icons only, no text labels. Active state matches v7 design.

**Files to create**:
- `src/components/layout/IconRail.tsx` — new component

**Design reference**: `design-preview-v7-tablet-density.html` → `.mock-sidebar` section (lines 272-307)

**Implementation details**:

Create `src/components/layout/IconRail.tsx`:

```typescript
interface IconRailProps {
  className?: string;
}
```

Structure:
```
<aside> — 64px wide, full height, flex column, items centered
  ├─ Logo mark — 32x32px, rounded-lg (var(--radius-md)), bg: var(--sidebar-active)
  │   Text: "TF", font-weight 800, font-size 14px, color: var(--sidebar-accent)
  │   margin-bottom: 12px
  │
  ├─ Nav icons — map over navConfig array (defined below)
  │   Each: 40x40px button, rounded var(--radius-md), centered icon
  │   Default: color var(--sidebar-text-muted)
  │   Hover: bg var(--sidebar-hover)
  │   Active: bg var(--sidebar-active), color white
  │   Gap between items: 4px
  │   Use react-router `useLocation()` to determine active state
  │   Each icon is an inline SVG (Lucide-style, stroke-based, 18x18 viewBox 0 0 24 24, stroke-width 2)
  │
  ├─ Spacer (flex: 1)
  │
  └─ Settings icon — same style as nav icons, links to /settings
      Gear SVG icon
```

**Navigation config** (define as a const array inside the file):

```typescript
const navConfig = [
  { path: '/', icon: 'grid', label: 'Dashboard' },          // 4-square grid icon
  { path: '/projects', icon: 'folder', label: 'Projects' },  // folder icon
  { path: '/materials', icon: 'package', label: 'Materials' },// box/package icon
  { path: '/crew-manager', icon: 'users', label: 'Crew' },   // users icon
  { path: '/equipment', icon: 'wrench', label: 'Equipment' }, // wrench icon
  { path: '/schedule', icon: 'calendar', label: 'Schedule' }, // calendar icon
  { path: '/manifest', icon: 'clipboard', label: 'Manifest' },// clipboard icon
  { path: '/work-orders', icon: 'check-square', label: 'Work Orders' }, // check-square icon
];
```

**SVG icons** — use inline SVGs matching the v7 preview. Each icon is `width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"`. Here are the paths:

- **grid** (Dashboard): `<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>`
- **folder** (Projects): `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>`
- **package** (Materials): `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>`
- **users** (Crew): `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`
- **wrench** (Equipment): `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`
- **calendar** (Schedule): `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`
- **clipboard** (Manifest): `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>`
- **check-square** (Work Orders): `<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`
- **settings** (Settings): `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`

Create a helper function that returns the SVG JSX for each icon name to keep the render clean:
```typescript
function NavIcon({ name }: { name: string }) {
  // switch on name, return the <svg> element
}
```

**Tooltip on hover**: Each icon button should show the `label` as a native `title` attribute. No custom tooltip component needed for Sprint 21.

**Styling** — use Tailwind utilities + CSS custom properties:
- `aside` background: `var(--sidebar-bg)` (always dark)
- Apply with inline style `{ background: 'var(--sidebar-bg)' }` or a className that maps to it
- Width: `w-16` (64px)
- Use `flex flex-col items-center` for vertical centering
- Padding: `py-3`
- Each nav button: `w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-100`

**Active state matching**: Use `useLocation().pathname` to check. For Dashboard (`/`), match exactly. For others, use `pathname.startsWith(path)` so `/projects/123` still highlights the Projects icon.

**Supabase considerations**: None — frontend-only component.

**Acceptance criteria**:
- [ ] `IconRail.tsx` created in `src/components/layout/`
- [ ] 8 nav icons + 1 settings icon render in a vertical column
- [ ] Active icon highlighted with `var(--sidebar-active)` background and white color
- [ ] Hover state shows `var(--sidebar-hover)` background
- [ ] Logo "TF" mark at top with green accent color
- [ ] `npm run build` passes

---

## S21-3: Create TopNav Component

**Problem/Goal**: Build the top navigation bar that sits above the page content. Contains: active project name (left), page-specific context (center area — unused for now), user menu + theme toggle (right).

**Files to create**:
- `src/components/layout/TopNav.tsx` — new component

**Design reference**: `design-preview-v7-tablet-density.html` → `.top-bar` section (lines 100-165) and `.greeting-compact` (lines 321-348)

**Implementation details**:

Create `src/components/layout/TopNav.tsx`:

```typescript
interface TopNavProps {
  onMobileMenuToggle?: () => void;
  showMobileMenu?: boolean;
}
```

Structure:
```
<header> — sticky top-0, z-50, full width
  ├─ <div> main bar — flex, items-center, justify-between, padding 10px 20px
  │   │
  │   ├─ LEFT section — flex, items-center, gap-12px
  │   │   ├─ Mobile hamburger button (visible only < 1024px / lg:hidden)
  │   │   │   Three-line SVG icon, 40x40px touch target
  │   │   │   onClick: onMobileMenuToggle
  │   │   │
  │   │   └─ Active project pill (if a project is selected)
  │   │       Show project name in a small pill badge
  │   │       Uses useProjectStore().activeProjectId to get project name
  │   │       Style: font-size 13px, font-weight 600, color var(--text-secondary)
  │   │       If no active project: show "TerrainForge" as text logo
  │   │
  │   └─ RIGHT section — flex, items-center, gap-6px
  │       ├─ Theme toggle button
  │       │   40x40px, rounded var(--radius-md), border 1px var(--border-default)
  │       │   Sun/moon SVG icon based on current theme
  │       │   onClick: toggle data-theme attribute on <html>
  │       │   Use useUIStore or read from document.documentElement.dataset.theme
  │       │
  │       └─ User menu button
  │           40x40px, rounded var(--radius-md), border 1px var(--border-default)
  │           Shows first letter of user email as avatar
  │           onClick: toggle dropdown (local state)
  │           Dropdown content:
  │             - User email (text, not clickable)
  │             - "Billing" link → /billing
  │             - "Settings" link → /settings
  │             - Divider
  │             - "Crew App" link → /crew (opens in new tab)
  │             - Divider
  │             - "Sign Out" button → calls signOut() from AuthContext
  │           Dropdown: absolute, right-0, top-full + 4px, min-width 200px
  │           Style: bg var(--surface-card), border 1px var(--border-default),
  │                  rounded var(--radius-lg), shadow var(--shadow-panel)
  │           Close on click outside (useEffect with document click listener)
```

**Styling**:
- Header background: `var(--surface-card)`
- Border bottom: `1px solid var(--border-default)`
- Button style (ctrl-btn pattern from v7): `w-10 h-10 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] flex items-center justify-center cursor-pointer transition-all duration-100`
- Hover: `bg-[var(--surface-hover)]`

**Dropdown items**:
- Each item: `px-3 py-2 text-sm hover:bg-[var(--surface-hover)] rounded-md cursor-pointer`
- Sign out: `text-red-400 hover:bg-red-500/10`

**Imports needed**:
- `useNavigate` from react-router-dom
- `useAuth` from `@/contexts/AuthContext`
- `useProjectStore` from `@/stores/projectStore`

**Supabase considerations**: None — reads from existing stores/context only.

**Acceptance criteria**:
- [ ] `TopNav.tsx` created in `src/components/layout/`
- [ ] Active project name shows on left (or "TerrainForge" if none selected)
- [ ] Theme toggle works (sun/moon icon switches)
- [ ] User dropdown opens/closes with email, links, sign out
- [ ] Mobile hamburger button visible only below 1024px
- [ ] Dropdown closes when clicking outside
- [ ] `npm run build` passes

---

## S21-4: Rewrite AppLayout to Use IconRail + TopNav

**Problem/Goal**: Replace the current `Sidebar` import in `AppLayout.tsx` with the new `IconRail` + `TopNav` combination. This is the structural swap.

**Files to modify**:
- `src/components/layout/AppLayout.tsx` — major rewrite

**Design reference**: `design-preview-v7-tablet-density.html` → `.app-shell` structure (lines 262-314)

**Implementation details**:

Current structure of AppLayout (to be replaced):
```
<div className="flex h-screen">
  <Sidebar collapsed={isCollapsed} mobileOpen={mobileOpen} onClose={closeMobile} />
  <main className="flex-1 flex flex-col overflow-hidden">
    [mobile header bar with hamburger — lg:hidden]
    [trial banner]
    [payment failed banner]
    <div className="flex-1 overflow-auto px-3 py-2 ...">
      {children}
    </div>
  </main>
  <ToastContainer />
</div>
```

New structure:
```
<div className="flex h-screen">
  {/* Icon Rail — hidden on mobile, visible on tablet+ */}
  <div className="hidden lg:block">
    <IconRail />
  </div>

  {/* Mobile sidebar overlay — visible only when mobileOpen */}
  {mobileOpen && (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closeMobile} />
      {/* Slide-in panel: icon rail + labels */}
      <aside className="relative w-[240px] h-full" style={{ background: 'var(--sidebar-bg)' }}>
        <MobileSidebar onClose={closeMobile} />
      </aside>
    </div>
  )}

  {/* Main content column */}
  <div className="flex-1 flex flex-col overflow-hidden min-w-0">
    {/* Top Nav — always visible */}
    <TopNav
      onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
      showMobileMenu={mobileOpen}
    />

    {/* Trial banner — keep existing logic */}
    {showTrialBanner && <TrialBanner ... />}
    {/* Payment failed banner — keep existing logic */}
    {showPaymentBanner && <PaymentBanner ... />}

    {/* Page content — scrollable */}
    <main className="flex-1 overflow-auto px-3 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4"
          style={{ background: 'var(--surface-bg, var(--bg-primary))' }}>
      {children}
    </main>
  </div>

  <ToastContainer />
</div>
```

**Key changes**:
1. Remove `import { Sidebar }` — replace with `import { IconRail }` and `import { TopNav }`
2. Remove the `isCollapsed` state and the responsive width calculation for the sidebar
3. Keep `mobileOpen` state for the mobile overlay
4. The mobile overlay now shows a `MobileSidebar` component (created in next task) instead of the old Sidebar
5. Remove the old mobile header bar (hamburger + "TerrainForge" text) — TopNav now handles this
6. Keep all trial/payment banner logic exactly as-is
7. Keep `ToastContainer` exactly as-is
8. The `main` element keeps the same padding classes so page content renders identically

**DO NOT** remove the old `Sidebar.tsx` file — keep it for reference. It will be deleted in a cleanup sprint.

**Supabase considerations**: None — layout-only change.

**Acceptance criteria**:
- [ ] AppLayout uses IconRail (desktop/tablet) + TopNav (all sizes)
- [ ] Mobile hamburger opens overlay with full nav labels
- [ ] Desktop: 64px icon rail on left, top nav above content, page fills remaining space
- [ ] Tablet (640-1024px): same as desktop (icon rail visible)
- [ ] Mobile (<640px): no icon rail, hamburger in top nav, overlay when opened
- [ ] Trial and payment banners still render correctly
- [ ] All existing page content renders identically inside the new shell
- [ ] `npm run build` passes

---

## S21-5: Create MobileSidebar Component

**Problem/Goal**: Build the mobile overlay sidebar that shows when the hamburger is tapped. Shows icons + labels (like the old sidebar, but styled to match v7).

**Files to create**:
- `src/components/layout/MobileSidebar.tsx` — new component

**Implementation details**:

```typescript
interface MobileSidebarProps {
  onClose: () => void;
}
```

Structure:
```
<div> — full height, flex column, padding
  ├─ Header row — flex, items-center, justify-between
  │   ├─ Logo: "TF" mark (same as IconRail) + "TerrainForge" text
  │   └─ Close button (X icon), 40x40px, onClick: onClose
  │
  ├─ Nav items — flex column, gap 2px, padding-top 12px
  │   Map over same navConfig from IconRail (import it or duplicate as shared const)
  │   Each item: flex row, items-center, gap 12px, padding 10px 12px
  │     Icon (18x18 SVG) + Label text (14px, font-weight 500)
  │     Active: bg var(--sidebar-active), text white
  │     Hover: bg var(--sidebar-hover)
  │     Rounded: var(--radius-md)
  │     onClick: navigate(path) then onClose()
  │
  ├─ Divider — 1px line, bg var(--sidebar-border), margin-y 8px
  │
  ├─ Secondary items
  │   ├─ Settings → /settings
  │   ├─ Billing → /billing
  │   └─ Crew App → /crew (opens new tab)
  │
  ├─ Spacer (flex: 1)
  │
  └─ Footer
      ├─ User email (font-size 12px, color var(--sidebar-text-muted))
      └─ Sign Out button (font-size 13px, color red-400)
```

**Shared nav config**: Extract the `navConfig` array from S21-2 into a shared file `src/components/layout/navConfig.ts` so both `IconRail` and `MobileSidebar` import from the same source. Export:

```typescript
// src/components/layout/navConfig.ts
export interface NavItem {
  path: string;
  icon: string;
  label: string;
}

export const navConfig: NavItem[] = [
  { path: '/', icon: 'grid', label: 'Dashboard' },
  { path: '/projects', icon: 'folder', label: 'Projects' },
  { path: '/materials', icon: 'package', label: 'Materials' },
  { path: '/crew-manager', icon: 'users', label: 'Crew' },
  { path: '/equipment', icon: 'wrench', label: 'Equipment' },
  { path: '/schedule', icon: 'calendar', label: 'Schedule' },
  { path: '/manifest', icon: 'clipboard', label: 'Manifest' },
  { path: '/work-orders', icon: 'check-square', label: 'Work Orders' },
];
```

Also extract the `NavIcon` component from S21-2 into `src/components/layout/NavIcon.tsx` so it can be shared.

**Styling**: Same dark background as icon rail (`var(--sidebar-bg)`). Text colors use `var(--sidebar-text)` and `var(--sidebar-text-muted)`.

**Supabase considerations**: None.

**Acceptance criteria**:
- [ ] `MobileSidebar.tsx` created in `src/components/layout/`
- [ ] `navConfig.ts` extracted as shared config
- [ ] `NavIcon.tsx` extracted as shared icon component
- [ ] Mobile overlay shows all nav items with icons + labels
- [ ] Tapping a nav item navigates and closes the overlay
- [ ] Close button (X) dismisses the overlay
- [ ] Sign out works from mobile sidebar
- [ ] `npm run build` passes

---

## S21-6: Remove Price Research and Billing from Top-Level Routing

**Problem/Goal**: Price Research becomes accessible only from Manifest page (future sprint). Billing moves to Settings (future sprint). For now, remove them from the icon rail nav config but keep the routes working — they just won't have a nav icon. This reduces the icon count from 8 to 6, which fits the rail better.

**Files to modify**:
- `src/components/layout/navConfig.ts` — remove price-research from primary nav
- `src/App.tsx` — keep all routes (do NOT remove any routes), just verify nothing breaks

**Implementation details**:

Update `navConfig` to remove `/price-research` and `/billing` from the nav items:

```typescript
export const navConfig: NavItem[] = [
  { path: '/', icon: 'grid', label: 'Dashboard' },
  { path: '/projects', icon: 'folder', label: 'Projects' },
  { path: '/materials', icon: 'package', label: 'Materials' },
  { path: '/crew-manager', icon: 'users', label: 'Crew' },
  { path: '/equipment', icon: 'wrench', label: 'Equipment' },
  { path: '/schedule', icon: 'calendar', label: 'Schedule' },
  { path: '/manifest', icon: 'clipboard', label: 'Manifest' },
  { path: '/work-orders', icon: 'check-square', label: 'Work Orders' },
];
```

Wait — Price Research and Billing are already not in navConfig as defined in S21-2/S21-5. They existed in the OLD sidebar but were intentionally excluded. So this task is really about confirming:

1. `/price-research` route still works in `App.tsx` (it does — don't remove it)
2. `/billing` route still works in `App.tsx` (it does — don't remove it)
3. Billing is accessible from TopNav user dropdown (added in S21-3)
4. Price Research is accessible from the MobileSidebar secondary items section

Update `MobileSidebar.tsx` secondary items to include:
- Settings → /settings
- Billing → /billing
- Price Research → /price-research
- Crew App → /crew (opens new tab)

This ensures all pages remain reachable even though they're not in the icon rail.

**Supabase considerations**: None.

**Acceptance criteria**:
- [ ] Icon rail shows 8 nav items (the core pages)
- [ ] Price Research and Billing are reachable from MobileSidebar secondary section and TopNav dropdown
- [ ] All routes in App.tsx still work — nothing removed
- [ ] `npm run build` passes

---

## Execution Order

1. **S21-1** — CSS tokens first (foundation for all other tasks)
2. **S21-5 (partial)** — Create `navConfig.ts` and `NavIcon.tsx` shared files first (dependencies for S21-2 and S21-5)
3. **S21-2** — IconRail component (needs navConfig + NavIcon)
4. **S21-3** — TopNav component (independent of IconRail)
5. **S21-5** — MobileSidebar component (needs navConfig + NavIcon)
6. **S21-4** — AppLayout rewrite (needs IconRail, TopNav, MobileSidebar)
7. **S21-6** — Route confirmation and secondary nav items (needs everything above)

**Recommended approach**: Implement in this order: S21-1 → shared files → S21-2 → S21-3 → S21-5 → S21-4 → S21-6. Commit after each task.

---

## SQL Migrations Required

None for this sprint.

---

## Post-Sprint Test Plan

### New Features
1. **Icon rail visible on desktop** — Open localhost:3000 at full width (>1024px). Left side should show a narrow (64px) dark column with icon buttons. Hover over icons to see tooltips (title text). Pass
2. **Top nav bar visible** — Above the page content, there should be a header bar with the active project name (or "TerrainForge"), theme toggle, and user avatar button. Pass.
3. **Theme toggle** — Click the sun/moon icon in top nav. App should switch between light and dark themes. Pass
4. **User dropdown** — Click the user avatar. Dropdown should show email, Billing link, Settings link, Crew App link, and Sign Out. Pass
5. **Mobile hamburger** — Resize browser to <640px width. Hamburger icon should appear in top nav. Tap it — full overlay sidebar slides in with icons + labels. Tap a nav item — it navigates and overlay closes. Pass
6. **Navigate via icon rail** — Click each icon in the rail. Should navigate to the correct page. Active icon should be highlighted.Pass

### Regression Checks
1. **Dashboard renders** — KPI cards, widgets, map all display correctly inside the new shell. Pass
2. **Projects page** — Project list, create project, zone builder all work: pass
3. **Schedule page** — Weekly grid, drag-and-drop, crew status dots all work: pass
4. **Crew app unchanged** — Navigate to /crew — should still show CrewLayout (NOT the new icon rail/top nav): pass
5. **Billing accessible** — Click Billing in user dropdown → navigates to /billing page: pass
6. **Settings accessible** — Click Settings in user dropdown or icon rail → navigates to /settings: Pass
7. **Trial banner** — If applicable, trial expiry banner still shows below top nav: pass
8. **Sign out** — Click Sign Out in user dropdown → redirects to login page: pass

### Edge Cases
1. **Resize from desktop to mobile** — Icon rail should hide, hamburger should appear: pass
2. **Resize from mobile to desktop** — Mobile overlay should close, icon rail should appear: pass
3. **Refresh on any page** — Correct icon should be highlighted in the rail: pass
4. **Click outside dropdown** — User dropdown should close: pass
