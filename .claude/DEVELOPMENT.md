# TerrainForge — Development Standards

## Before Writing Any Code
1. Read the relevant store(s) and types first — don't assume interfaces
2. Check if a shared component already exists before building a new one
3. Keep business logic out of components — it belongs in `src/lib/`
4. Prefer editing existing files over creating new ones

## Component Patterns

### Page Components
Pages are thin orchestrators — they pull from stores, pass data down, handle navigation.
```tsx
// Correct pattern
const Projects = () => {
  const { projects, addProject, updateProject } = useProjectStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // No business logic here — call src/lib/ functions
  return <ProjectsUI projects={projects} onAdd={addProject} />;
};
export default Projects;
```

### Shared Components
All shared components must: accept className for composability, use CSS custom properties for colors, handle loading and empty states, never import from stores directly.

### Form Pattern
Use `useForm` hook from `src/hooks/useForm.ts`. Validate with `src/utils/validation.ts`. Never inline validation logic.

## TypeScript Rules
- Never use `any` — use `unknown` and narrow, or add the type to `src/types/index.ts`
- All component props must be explicitly typed (no implicit props)
- Zustand store state must match the TypeScript interfaces in `src/types/`
- Use `src/types/index.ts` as the single source of truth for all shared interfaces

## State Management Rules
- One store per data domain: project, material, crew, equipment, ui
- Store shape: `{ items, isLoading, error, fetch*, add*, update*, delete* }`
- Always use `persist` middleware — stores must survive page reload
- Optimistic updates: update local state first, sync to DB in background, rollback on error
- Never put derived state in stores — compute it in the component or a `useMemo`

## Error Handling
- Async store actions: try/catch, set `error` field on failure, clear error on success
- API errors: surface to user via the AlertBanner component, never swallow silently
- TypeScript errors: fix them, don't suppress with `// @ts-ignore`

## Supabase Data Layer
- All DB calls go through `src/services/supabaseData.ts`
- snake_case in DB, camelCase in TypeScript — the mapping layer handles conversion
- Multi-tenant: always include `org_id` in queries, never let RLS be the only guard
- Test queries in Supabase dashboard before implementing in code

### RLS Policy Rules (learned the hard way — Sprint 5)
- Every table with RLS enabled MUST have explicit INSERT, SELECT, UPDATE, DELETE policies for every path the frontend client uses. Don't assume SECURITY DEFINER triggers cover all cases — they only cover the trigger path.
- When adding a new table: write all four RLS policies before writing any frontend code that touches it. Treat "no INSERT policy" as a bug, not a TODO.
- RLS rejections are silent (zero rows affected, no error thrown). Never rely on error handling to catch RLS failures — verify with a direct query from Supabase SQL Editor using the anon key role.
- Chicken-and-egg patterns (user needs a membership row to INSERT a membership row) must be resolved with a self-referencing policy like `WITH CHECK (auth.uid() = user_id)`, not deferred to "the trigger will handle it."
- When debugging persistence issues: check RLS policies FIRST. Run `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'your_table';` to see what's actually in place.

### Error Logging Standards
- Log full error objects (`console.error('context:', err)`), not just `err.message` — Postgres error codes and details are in the full object
- Use `[TF-DEBUG]` prefix for structured diagnostic logging in any Supabase write/fetch chain
- Null/empty coercion: always coerce empty strings to null before sending to Postgres date/timestamp columns

### New Table Checklist
Before writing frontend code for any new Supabase table:
1. RLS INSERT policy exists (test: can anon-key client insert?)
2. RLS SELECT policy exists (test: can anon-key client read back what it inserted?)
3. org_id column has a default or is explicitly set in all write paths
4. NOT NULL columns have values supplied by frontend OR have DB defaults
5. UNIQUE constraints won't conflict with fallback/retry logic (use timestamps or UUIDs in slugs)

## Import Order Convention
1. React and React hooks
2. Third-party libraries (zustand, react-router, lucide-react)
3. Internal: types (`@/types/`)
4. Internal: stores (`@/stores/`)
5. Internal: lib/utils (`@/lib/`, `@/utils/`)
6. Internal: components (`@/components/`)
7. Local/relative imports

## Performance Rules
- Memoize expensive computations (manifest calculations, alert aggregations) with `useMemo`
- Avoid re-renders from store subscriptions — use selectors: `useProjectStore(s => s.projects)`
- Images: use WebP, lazy load anything below the fold
- Bundle: don't add dependencies without checking bundle impact first

## Testing Approach (when tests are added)
- Business logic in `src/lib/` must have unit tests — these are pure functions, easy to test
- Stores: integration tests against real Supabase test project, never mock the DB
- Components: test user interactions, not implementation details
- No snapshot tests

## PDF Component Patterns (src/components/pdf/)

All PDF components use `@react-pdf/renderer`. Follow these conventions:

### Structure
```tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { backgroundColor: '#2D6A4F', color: 'white', padding: 16 },
});

export const ManifestPDF = ({ project, ... }: Props) => (
  <Document>
    <Page size="A4" style={styles.page}>
      ...
    </Page>
  </Document>
);
```

### Export Pattern
Use `pdf().toBlob()` + manual anchor click for downloads (not `PDFDownloadLink` — it causes blank-tab UX issues):
```tsx
const handleExport = async () => {
  setExporting(true);
  const blob = await pdf(<ManifestPDF {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name}-manifest.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  setExporting(false);
};
```

### PDF-Specific Rules
- Never use Tailwind or CSS custom properties inside PDF components — `StyleSheet.create()` only
- Brand green for PDF headers: `#2D6A4F`
- Keep PDF component props typed — no `any` even in PDF templates
- PDF components live in `src/components/pdf/`, never in pages
- Test PDF output by generating and opening the file — TypeScript alone isn't sufficient

### Existing PDF Templates
- `src/components/pdf/ManifestPDF.tsx` — material manifest with zone tables and cost rollup
- `src/components/pdf/CrewPacketPDF.tsx` — field crew packet with installation steps and checkboxes

## Code Review Checklist
Before marking any feature complete:
- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] No `console.log` left in production code (exception: `[TF-DEBUG]` logs can stay during active sprint debugging)
- [ ] Loading and error states are handled
- [ ] Mobile layout is not broken
- [ ] New types added to `src/types/index.ts`
- [ ] New constants added to `src/lib/constants.ts`
- [ ] PDF exports (if touched): tested by generating actual PDF, not just checking TypeScript
- [ ] Supabase writes (if touched): verified data persists across page refresh — not just optimistic UI
- [ ] RLS policies (if new table): all four CRUD policies exist and tested from frontend client
- [ ] Error logging: full error objects logged, not just `.message`
