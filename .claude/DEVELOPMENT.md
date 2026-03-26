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

## Code Review Checklist
Before marking any feature complete:
- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] No `console.log` left in production code
- [ ] Loading and error states are handled
- [ ] Mobile layout is not broken
- [ ] New types added to `src/types/index.ts`
- [ ] New constants added to `src/lib/constants.ts`
