# Sprint 8 — Workflow Completion + Theme Toggle

**Goal:** Close the remaining Phase 1 workflow gaps: make AI material suggestions actionable (accept/add to project), prompt users to add materials after project creation, add supplier CRUD, build a Settings page with dark/light theme toggle, and streamline the post-creation flow.

**Done when:** After creating a project with AI, a contractor can accept suggested materials with one tap, get prompted to add more, manage suppliers, and toggle between dark and light themes from Settings.

**Execution:** Read `.claude/SPRINT_EXECUTION.md` for the autonomous workflow. Execute tasks S8-1 through S8-5 sequentially. Each task must pass `npm run build` before committing.

**SQL migrations:** Write all DB changes to `.claude/SQL/sprint_8_migrations.sql` — Charlie will run them manually.

---

## S8-1: Make AI Material Suggestions Actionable (P1)

**Context:** When a project is created via AI description, the app shows suggested materials as display-only pills/badges. The pilot user expects to tap a suggestion and have it added to the project. Currently there's no way to accept or dismiss suggestions — they're informational only.

**Current state:** In `src/pages/Projects.tsx`, after AI generation, `suggestedMaterials` is stored in component state and rendered as styled spans. The `AIProjectSuggestion` type includes `suggestedMaterials: Array<{ name: string; estimatedQuantity: number; unit: string }>`.

**Changes required:**

**`src/pages/Projects.tsx` (or wherever the project creation form with AI suggestions lives):**

1. Replace the static material suggestion pills with interactive cards/chips. Each should have:
   - Material name, quantity, unit displayed
   - A green "Add" button (checkmark icon) to accept the suggestion
   - A gray "Dismiss" (X icon) to remove the suggestion
   - An "Add All" button above the list to accept all suggestions at once

2. When the user taps "Add" on a suggestion:
   - Create the material in the material store if it doesn't already exist (match by name, case-insensitive)
   - Create a `project_materials` entry linking it to the current project with the suggested quantity
   - Remove the suggestion from the displayed list
   - Show a brief toast/feedback: "Added {name} to project"

3. When the user taps "Add All":
   - Loop through all remaining suggestions and add each one
   - Clear the suggestions list
   - Show feedback: "Added {count} materials to project"

4. When the user taps "Dismiss":
   - Remove that suggestion from the list (no DB action)

5. The suggestions should persist in component state until the form is closed or all are acted on. They should NOT persist across page navigation — they're ephemeral.

**Important:** The `project_materials` table was created in Sprint 7 migrations. Use the existing Supabase service layer to insert records. If no `createProjectMaterial` function exists in `supabaseData.ts`, create one:
```typescript
export async function createProjectMaterial(projectId: string, materialId: string, quantity: number, orgId: string) {
  const { data, error } = await supabase
    .from('project_materials')
    .insert({ project_id: projectId, material_id: materialId, quantity, org_id: orgId })
    .select()
    .single()
  if (error) {
    console.error('[TF-DEBUG] createProjectMaterial error:', error)
    return null
  }
  return data
}
```

**Validation:** `npm run build` passes.

---

## S8-2: Post-Creation Material Prompt (P2 — FR-003)

**Context:** After a user creates a project (whether via AI or manually), the app returns to the project list. The user then has to navigate back into the project to add materials. This is a missed opportunity — the app should guide the user to the next logical step.

**Changes required:**

**`src/pages/Projects.tsx` (or the project creation flow):**

After a project is successfully created (both optimistic add and Supabase write confirmed):

1. Instead of immediately closing the creation modal/form, show a transition screen or updated modal state:
   - "Project created! What's next?"
   - Two clear action buttons:
     - "Add Materials" → navigates to the project detail view with the Materials tab active
     - "Done for now" → closes the modal and returns to the project list

2. If AI suggestions exist and haven't all been accepted yet, the prompt should say:
   - "Project created! You have {count} material suggestion(s) waiting."
   - "Review Materials" → navigates to project detail / Materials tab
   - "Done for now" → closes

3. The prompt should be a clean, simple UI — not a modal-within-a-modal. Options:
   - Replace the form content with the prompt content in the same modal
   - Or use a bottom sheet / toast with action buttons
   - Keep it lightweight — one heading, one subtitle, two buttons

**Validation:** `npm run build` passes.

---

## S8-3: Supplier Management (P2 — FR-006)

**Context:** Suppliers currently exist only as fields on materials (`supplier_name`, `supplier_contact`, `supplier_phone`, `supplier_notes`). There's a derived "Suppliers" tab in MaterialLibrary that aggregates suppliers from materials, but no way to create, edit, or manage suppliers independently. Contractors need to track their preferred suppliers.

**Changes required:**

**Approach:** Rather than creating a separate suppliers table (which adds complexity and a migration), enhance the existing supplier-from-materials pattern with a better UI. Suppliers are lightweight metadata attached to materials — not independent entities with their own lifecycle. This matches how contractors think: "I buy sod from Green Valley Nursery" not "Green Valley Nursery is a supplier entity."

**`src/pages/MaterialLibrary.tsx` — enhance the Suppliers tab:**

1. The existing Suppliers tab shows a derived list. Enhance it with:
   - A card layout for each supplier showing: name, contact, phone, number of materials, total material value
   - Tap a supplier card to expand and see all materials from that supplier
   - "Edit Supplier" button that updates supplier fields across all materials with that supplier name
   - "Add Supplier" form that creates a placeholder material entry (or allows setting supplier info that will be applied to future materials)

2. When adding/editing a material (in the Materials tab or from project detail):
   - The supplier fields should be prominently displayed, not hidden
   - Add a supplier name dropdown/autocomplete that suggests existing supplier names from other materials
   - Fields: Supplier Name, Contact Person, Phone, SKU, Lead Time (days), Notes

3. In the material add/edit form:
   - Supplier Name should autocomplete from existing suppliers (derived from `materialStore`)
   - When a known supplier is selected, auto-fill contact/phone from the most recent material with that supplier

**Validation:** `npm run build` passes.

---

## S8-4: Settings Page with Dark/Light Theme Toggle

**Context:** No settings page exists. The app needs one for user preferences, starting with a theme toggle. The light theme was implemented in S7-1 but there's no dark theme option and no toggle.

**Changes required:**

### Phase 1: Create the Settings page and route

**`src/pages/Settings.tsx`** (new file)
Create a Settings page with sections:
- **Appearance** — theme toggle (dark/light)
- **Account** — display current user email, org name (read-only for now)
- **About** — app version, "TerrainForge v1.0"

Layout: simple single-column page with section cards. Match the existing page pattern (PageHeader + content).

**`src/App.tsx`** (or wherever routes are defined)
Add route: `/settings` → `<Settings />`

**`src/components/layout/Sidebar.tsx`**
Add a Settings nav item at the bottom of the sidebar (gear icon from lucide-react), separated from the main nav items by a divider/spacer.

### Phase 2: Implement dark theme CSS variables

**`src/index.css`**
Keep the current `:root` variables as the light theme. Add a dark theme using a `[data-theme="dark"]` selector on the root:

```css
[data-theme="dark"] {
  /* Dark surfaces */
  --surface: #0F172A;
  --surface2: #1E293B;
  --surface3: #334155;

  /* Dark borders */
  --border: #475569;

  /* Dark text */
  --text: #F1F5F9;
  --text-2: #CBD5E1;
  --text-3: #94A3B8;
  --text-4: #64748B;

  /* Sidebar stays the same in dark mode */
  --bg-sidebar: #0B1120;
  --sidebar-text: #E2E8F0;
  --sidebar-text-2: #94A3B8;
  --sidebar-border: #1E293B;
  --sidebar-surface2: #162032;
}
```

This approach means all components that already use `var(--surface)`, `var(--text)`, etc. will automatically adapt when the theme changes. No per-component edits needed.

### Phase 3: Theme toggle logic

**`src/stores/uiStore.ts`** (or create if it doesn't exist)
Add theme state to the UI store with persist:
```typescript
interface UIState {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
}
```

The store should:
- Default to `'light'`
- Persist the choice to localStorage (key: `tf_theme`)
- On initialization (and on every change), apply `document.documentElement.setAttribute('data-theme', theme)`

**`src/App.tsx`** (or AppLayout)
On mount, read the theme from the store and apply the `data-theme` attribute to `<html>`.

**Settings page — Appearance section:**
- Show a toggle switch or segmented control: ☀️ Light | 🌙 Dark
- Tapping toggles the theme immediately (no save button needed)
- The current selection is highlighted

### Phase 4: Verify all components work in both themes

After implementing, scan all component files for any hardcoded colors that bypass CSS custom properties:
- `bg-white` should be `bg-[var(--surface2)]` or similar
- `text-gray-900` should be `text-[var(--text)]`
- `border-gray-200` should be `border-[var(--border)]`

Any hardcoded colors that don't adapt to the theme need to be replaced with CSS variable references. The sidebar is the exception — it stays dark in both themes.

**Validation:** `npm run build` passes.

---

## S8-5: Smoke Test Checklist (Manual — not a Code task)

After S8-1 through S8-4 are deployed:

1. **AI material suggestions:** Create a project with AI description → see suggestions → tap "Add" on one → confirm it appears in project materials → tap "Add All" for the rest
2. **Post-creation prompt:** After creating a project, see the "Add Materials" / "Done for now" prompt
3. **Supplier management:** Go to Materials → Suppliers tab → see supplier cards → edit supplier details → add a new material with supplier autocomplete
4. **Settings page:** Navigate to Settings → see Appearance section → toggle to dark → verify entire app switches to dark theme → toggle back to light → verify it switches back
5. **Theme persistence:** Toggle to dark → refresh page → should still be dark
6. **Responsive check:** Resize to tablet width → verify all new features work at 768px

---

## Post-Sprint SQL Migrations

If any new tables or columns are needed, write them to `.claude/SQL/sprint_8_migrations.sql`. Based on current design, no new migrations should be needed — S8 builds on existing tables (`project_materials`, `materials` with supplier fields). But if Code discovers a need during implementation, capture it in the file.
