# S5-4b: Fix Supabase Data Persistence — End-to-End

**Priority:** P0 — Blocks Phase 1 gate. Nothing persists to Supabase on staging.

**Context:** TerrainForge is deployed to Netlify staging at `terrainforge-staging.netlify.app`. The app loads, auth works, but projects created by users vanish on sign-out/sign-in because Supabase writes are silently failing. Multiple bugs in the org→project write chain compound to make persistence non-functional.

## Root Cause Chain (all must be fixed)

### Bug 1: `fetchOrg` INSERT fallback missing `slug`
**File:** `src/stores/orgStore.ts` (line ~100)

When a new user has no org row in Supabase, `fetchOrg` tries to INSERT one. But the INSERT payload is missing the `slug` field, which has a `NOT NULL UNIQUE` constraint with a format check (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`). The INSERT always fails with a constraint violation. The code catches this and falls back to `makeDefaultOrg()`, which creates an in-memory org that may or may not be persisted correctly.

**Fix:** Add `slug` to the INSERT payload: `slug: 'org-' + orgId.replace(/-/g, '').slice(0, 8) + '-' + Date.now()`

### Bug 2: `fetchOrg` INSERT also missing `organization_members` row
**File:** `src/stores/orgStore.ts`

Even when the org INSERT succeeds, there's no corresponding `organization_members` row created. Without that row, ALL subsequent RLS-protected operations (projects, crew, materials, equipment) will fail because the RLS policies check `organization_members` for access.

**Fix:** After successfully inserting into `organizations`, also insert into `organization_members`:
```typescript
await supabase.from('organization_members').insert([{
  org_id: orgId,
  user_id: orgId,
  role: 'admin'
}])
```

### Bug 3: `createProject` empty date strings
**File:** `src/services/supabaseData.ts` (in `createProject`)

When a project is created without dates, `start_date` and `target_date` are sent as `""` (empty strings). PostgreSQL rejects empty strings for date columns.

**Fix (already partially applied — VERIFY it's present):** After the `toSnakeCase` conversion and field fixups, add:
```typescript
if (snakeData.start_date === '') snakeData.start_date = null
if (snakeData.target_date === '') snakeData.target_date = null
```

### Bug 4: Insufficient error logging throughout the write chain

The entire chain (`fetchOrg` → org store → `addProject` → `createProject`) swallows errors silently. When something fails, nothing shows in the console except generic messages.

**Fix:** Add `console.error` breadcrumbs at EVERY failure point in:
- `orgStore.ts` → `fetchOrg`: log the Supabase error object (not just message) on SELECT failure, INSERT failure, and INSERT success
- `projectStore.ts` → `addProject`: log when org_id is missing, log after `db.createProject` returns null
- `supabaseData.ts` → `createProject`: log the full error object, not just `err.message`
- Same for `crewStore`, `materialStore`, `equipmentStore` create functions

### Bug 5: `fetchOrg` query uses `.eq('owner_id', orgId)` which can return wrong org

The organizations table has orgs from multiple sources (trigger, backfill, orgStore fallback). Some orgs were created with `id = user_id` (trigger/backfill), some with `id != owner_id` (seed data). The query should prefer the org where `id = owner_id` (the canonical one).

**Fix:** Change the fetchOrg query to:
```typescript
const { data, error } = await supabase
  .from('organizations')
  .select('id, name, subscription_status, subscription_tier, trial_ends_at, subscription_ends_at, stripe_customer_id')
  .eq('id', orgId)  // Changed from owner_id to id — canonical orgs have id = user_id
  .single();
```

This is correct because the signup trigger and backfill both set `organizations.id = auth.uid()`, and the `organization_members` row uses this same ID as `org_id`. Querying by `id` directly is unambiguous.

## Files to Modify

1. `src/stores/orgStore.ts` — Bugs 1, 2, 4, 5
2. `src/services/supabaseData.ts` — Bugs 3, 4
3. `src/stores/projectStore.ts` — Bug 4
4. `src/stores/crewStore.ts` — Bug 4
5. `src/stores/materialStore.ts` — Bug 4
6. `src/stores/equipmentStore.ts` — Bug 4

## Validation

- `npm run build` must pass with zero TypeScript errors
- After these fixes, the following flow must work:
  1. New user signs up (or is created in Supabase Auth dashboard)
  2. On first login, `fetchOrg` either finds the trigger-created org OR creates one
  3. User creates a project → `addProject` has org_id → `createProject` sends valid data to Supabase
  4. User signs out → signs back in → project reloads from Supabase

## Commit

```bash
git add -A
git commit -m "S5-4b: Fix end-to-end Supabase data persistence

Root causes: fetchOrg INSERT missing slug + org_members row, query ambiguity
with owner_id, empty date strings rejected by Postgres, silent error swallowing.

Fixes: slug in org INSERT, org_members row creation, query by id instead of
owner_id, date coercion, console.error breadcrumbs throughout write chain.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD
gh pr create --title "S5-4b: Fix end-to-end Supabase data persistence" --body "$(cat <<'EOF'
## Summary
- Fix fetchOrg INSERT fallback: add slug field + organization_members row
- Change fetchOrg query from owner_id to id (canonical org lookup)
- Verify date coercion (empty string → null) in createProject
- Add console.error breadcrumbs in orgStore, projectStore, supabaseData, crewStore, materialStore, equipmentStore

## Test plan
- [ ] npm run build passes with zero errors
- [ ] New user signup → fetchOrg creates org + membership if trigger missed
- [ ] Create project → no console errors from Supabase
- [ ] Sign out → sign in → project persists from Supabase
- [ ] Create crew member → persists through sign-out/sign-in
- [ ] Create material → persists through sign-out/sign-in

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --merge --delete-branch
```
