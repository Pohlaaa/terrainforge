# Track 2 — UI Polish & Component Extraction

> **Branch**: `refactor-ui-polish`
> **Depends on**: Track 1 (architecture cleanup) must be merged first
> **Goal**: Break up oversized page/component files, migrate inline styles to Tailwind/CSS vars, and improve responsive behavior.

---

## Task 1: Extract MaterialLibrary.tsx (966 → ~350 lines)

`src/pages/MaterialLibrary.tsx` is the largest page at 966 lines. Extract these sub-components into `src/components/materials/`:

### 1a. MaterialFormModal
**New file**: `src/components/materials/MaterialFormModal.tsx`
- The Add/Edit material modal with 20+ form fields
- Props: `isOpen: boolean`, `material: Material | null`, `onClose: () => void`, `onSave: (m: Partial<Material>) => Promise<void>`, `readOnly?: boolean`
- Contains all form state (internal useState hooks)
- ~200 lines

### 1b. MaterialTable
**New file**: `src/components/materials/MaterialTable.tsx`
- The material list table with status badges, stock indicators, action buttons
- Props: `materials: Material[]`, `onEdit: (m: Material) => void`, `onDelete: (id: string) => void`, `onOrder: (m: Material) => void`, `readOnly?: boolean`
- ~100 lines

### 1c. CSVImportModal
**New file**: `src/components/materials/CSVImportModal.tsx`
- File input, preview table, error/success states
- Props: `isOpen: boolean`, `onClose: () => void`, `onConfirm: (materials: Partial<Material>[]) => Promise<void>`
- ~80 lines

### 1d. MaterialQuickAddBar
**New file**: `src/components/materials/MaterialQuickAddBar.tsx`
- Quick-add inline form (5 inputs + buttons)
- Props: `onAdd: (m: Partial<Material>) => void`, `onImportClick: () => void`, `readOnly?: boolean`
- ~60 lines

### 1e. LowStockBanner
**New file**: `src/components/materials/LowStockBanner.tsx`
- Banner showing low stock items with link to filter
- Props: `items: Material[]`, `onFilterLowStock: () => void`
- ~30 lines

After extraction, `MaterialLibrary.tsx` should be orchestration only: store hooks, state management, rendering the sub-components. Target: **under 350 lines**.

---

## Task 2: Extract CrewEquipmentHub.tsx (518 → ~250 lines)

`src/pages/CrewEquipmentHub.tsx` at 518 lines. Extract:

### 2a. CrewTable
**New file**: `src/components/crew/CrewTable.tsx`
- Crew member list with availability badges, skill tags, action buttons
- Props: `crew: CrewMember[]`, `onEdit: (c: CrewMember) => void`, `onDelete: (id: string) => void`

### 2b. EquipmentTable
**New file**: `src/components/crew/EquipmentTable.tsx`
- Equipment list with status indicators, maintenance dates, action buttons
- Props: `equipment: Equipment[]`, `onEdit: (e: Equipment) => void`, `onDelete: (id: string) => void`

### 2c. CrewEquipmentKPIs
**New file**: `src/components/crew/CrewEquipmentKPIs.tsx`
- 4 KPI cards for the Crew & Equipment tab
- Props: computed values from stores

Target: **under 250 lines** for the hub page.

---

## Task 3: Extract Oversized Dashboard Tab Components

These `src/components/project-dashboard/` files are all 400-700 lines. Extract modal and form sections:

### 3a. ComplianceTab.tsx (687 lines)
Extract: `PermitFormModal`, `SiteConditionFormModal`, `SubcontractorFormModal` into `src/components/project-dashboard/compliance/`
Target: ComplianceTab under 300 lines.

### 3b. OverviewTab.tsx (683 lines)
Extract: `ProjectInfoCard`, `ProjectTimelineCard`, `ProjectNotesSection` into `src/components/project-dashboard/overview/`
Target: OverviewTab under 300 lines.

### 3c. ResourcesTab.tsx (588 lines)
Extract: `CrewAssignmentPanel`, `EquipmentAssignmentPanel` into `src/components/project-dashboard/resources/`
Target: ResourcesTab under 300 lines.

### 3d. BudgetTab.tsx (485 lines)
Extract: `BudgetBreakdownTable`, `CostSummaryCard` into `src/components/project-dashboard/budget/`
Target: BudgetTab under 250 lines.

### 3e. TasksTab.tsx (406 lines)
Extract: `TaskFormModal`, `TaskTable` into `src/components/project-dashboard/tasks/`
Target: TasksTab under 200 lines.

---

## Task 4: Migrate Inline Styles to Tailwind/CSS Variables

### 4a. SetupChecklist.tsx — 20+ inline `style={{}}` objects
Replace every `style={{ color: '...', background: '...' }}` with Tailwind utility classes or CSS variable references.

**Pattern**:
```tsx
// Before
style={{ color: 'var(--green-l)', background: 'rgba(45,106,79,.15)' }}
// After
className="text-[var(--green-l)] bg-[var(--green-l)]/15"
```

If a CSS variable doesn't exist in `src/index.css`, add it. If it's already defined in the design system, use the existing token.

### 4b. Hardcoded hex colors (31 files)
Search for hex color patterns (`#[0-9a-fA-F]{3,6}`) in JSX/TSX files. For each:
- If the color matches an existing CSS variable → replace with `var(--token-name)`
- If it's a new color → add to `:root` and `[data-theme="dark"]` in `src/index.css`, then reference via variable

**Priority files** (most violations):
- `src/components/ui/Button.tsx`
- `src/components/shared/Badge.tsx`
- `src/components/dashboard/widgets/*.tsx`

### 4c. RGB/RGBA arbitrary values
Search for `rgba(` and `rgb(` in className strings. Replace with CSS variable opacity syntax:
```tsx
// Before
className="bg-[rgba(45,106,79,.25)]"
// After
className="bg-[var(--green-l)]/25"
```

---

## Task 5: Responsive Improvements

### 5a. TopNav.tsx (291 lines)
- On mobile (< 768px), the 4 primary tabs should collapse into a hamburger menu or horizontal scroll
- The "More" dropdown, notification bell, and user avatar should remain visible
- Add `md:` breakpoint prefixes for the tab layout

### 5b. KPI Cards
- All hub tabs use a 4-column KPI row. On mobile this should be 2×2 grid, on tablet 4×1.
- Add responsive grid classes: `grid grid-cols-2 md:grid-cols-4 gap-4`
- Check all 4 hub pages: ProjectsHub, BudgetHub, MaterialLibrary, CrewEquipmentHub

### 5c. Data Tables
- Ensure all DataTable instances have horizontal scroll on small screens
- Add `overflow-x-auto` wrapper if not already present
- Priority: MaterialLibrary table, CrewEquipmentHub tables, Schedule grid

---

## Task 6: Verification

1. `npm run build` passes with zero errors
2. No page file exceeds 400 lines: `find src/pages -name '*.tsx' | xargs wc -l | sort -rn | head -20`
3. No component file exceeds 300 lines: `find src/components -name '*.tsx' | xargs wc -l | sort -rn | head -20`
4. `grep -r 'style={{' src/components/dashboard/SetupChecklist.tsx` returns **nothing**
5. Verify mobile layout at 375px width: TopNav collapses, KPIs stack 2×2, tables scroll horizontally
6. All existing functionality preserved — no behavior changes, only structural refactor
