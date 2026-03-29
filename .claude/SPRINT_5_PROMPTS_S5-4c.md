# S5-4c: Diagnose and Fix Supabase Persistence — End-to-End

**Priority:** P0 — This is the #1 blocker for Phase 1.

**Context:** TerrainForge is deployed to Netlify staging at `terrainforge-staging.netlify.app`. Previous fix attempts (S5-4b) addressed several issues but persistence STILL doesn't work. When a user creates a project, it appears in the UI (optimistic local state) but vanishes on page refresh — meaning the Supabase write is silently failing.

**IMPORTANT: This prompt requires a DIAGNOSTIC-FIRST approach.** Do NOT guess at fixes. Follow these steps in order.

---

## Phase 1: Create Diagnostic Script

Create a file `scripts/test-persistence.ts` that tests the ENTIRE persistence chain against the live Supabase instance. The script should:

1. Read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.local` (or `.env`)
2. Sign in as a test user (use `woodsrider82+test4@gmail.com` / check `.env.local` for password, or use Supabase admin API to get a session)
3. Run each test in sequence and log PASS/FAIL with full error details:

```
TEST 1: Can we SELECT from organizations WHERE id = user.id?
TEST 2: Can we SELECT from organization_members WHERE user_id = user.id?
TEST 3: Does user_has_role(org_id, 'designer') return true? (Run raw SQL via supabase.rpc if possible, or test via a projects INSERT)
TEST 4: Can we INSERT into projects with org_id = user.id?
TEST 5: Can we SELECT back the project we just inserted?
TEST 6: Can we DELETE the test project?
```

If the script can't authenticate as a user, create an alternative approach: add a temporary `/debug` route in the app that runs these checks client-side and displays results on screen. This route should:
- Show the current `auth.uid()`
- Show the current org store state (`useOrgStore.getState()`)
- Attempt a test project INSERT and show the full Supabase response (data + error)
- Attempt a project fetch and show the full Supabase response
- Show all localStorage keys and their sizes

## Phase 2: Add Heavy Instrumentation

Add `console.log` (not `console.error`) statements with a `[TF-DEBUG]` prefix to EVERY step of the chain. These must be visible in the browser console on the staging site:

### In `src/stores/orgStore.ts` → `fetchOrg`:
```typescript
console.log('[TF-DEBUG] fetchOrg called with orgId:', orgId)
// After the SELECT:
console.log('[TF-DEBUG] fetchOrg SELECT result:', { data, error })
// After INSERT (if PGRST116):
console.log('[TF-DEBUG] fetchOrg INSERT result:', { newOrg, insertError })
// After org_members INSERT:
console.log('[TF-DEBUG] fetchOrg org_members INSERT result:', { memberError })
// After set():
console.log('[TF-DEBUG] fetchOrg set org:', useOrgStore.getState().org)
```

### In `src/stores/projectStore.ts` → `addProject`:
```typescript
console.log('[TF-DEBUG] addProject called, orgId:', orgId)
console.log('[TF-DEBUG] addProject sending to Supabase, project id:', newProject.id)
const result = await db.createProject(projectData, newProject.id, orgId)
console.log('[TF-DEBUG] addProject Supabase result:', result)
```

### In `src/stores/projectStore.ts` → `fetchProjects`:
```typescript
console.log('[TF-DEBUG] fetchProjects called')
const projects = await db.fetchProjects()
console.log('[TF-DEBUG] fetchProjects returned', projects.length, 'projects')
```

### In `src/services/supabaseData.ts` → `createProject`:
```typescript
console.log('[TF-DEBUG] createProject payload:', JSON.stringify(snakeData, null, 2))
// After insert:
console.log('[TF-DEBUG] createProject response:', { data, error })
```

### In `src/services/supabaseData.ts` → `fetchProjects`:
```typescript
console.log('[TF-DEBUG] fetchProjects query response:', { data: data?.length, error })
```

### In `src/components/layout/AppLayout.tsx`:
```typescript
console.log('[TF-DEBUG] AppLayout useEffect, user.id:', user?.id)
```

### In `src/contexts/AuthContext.tsx` → `onAuthStateChange`:
```typescript
console.log('[TF-DEBUG] onAuthStateChange:', _event, session?.user?.id)
```

## Phase 3: Fix Known RLS Gaps

The original migration (`001_initial_schema.sql`) has these RLS policies for projects:

```sql
-- projects_create requires user_has_role(org_id, 'designer')
-- user_has_role checks organization_members WHERE org_id = p_org_id AND user_id = auth.uid() AND (role = p_role OR role = 'admin')
-- This means: the user must have a row in organization_members with role 'admin' or 'designer'
```

The `organizations` table has NO INSERT policy — RLS is enabled but only SELECT/UPDATE/DELETE policies exist. This means the frontend `fetchOrg` fallback INSERT is ALWAYS blocked by RLS.

Create a new migration file `supabase/migrations/003_fix_rls_policies.sql`:

```sql
-- Allow users to create their own organization (fetchOrg fallback)
CREATE POLICY org_insert_own
ON organizations FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Allow users to create their own membership (fetchOrg fallback)
-- This supplements the existing org_members_insert policy which requires user_is_admin
CREATE POLICY org_members_insert_self
ON organization_members FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

Also verify the `org_members_view` policy is `auth.uid() = user_id` (not the self-referencing one from the original migration). If the original policy is still in place, drop and recreate it.

**IMPORTANT:** Include a comment in the migration that says "Run this in Supabase SQL Editor — this project does not use automatic migrations."

## Phase 4: Fix Any Additional Issues Found

After adding instrumentation, run `npm run dev` locally and test the full flow:
1. Sign in
2. Check console for `[TF-DEBUG]` messages — trace the exact point of failure
3. Fix whatever you find
4. Test again until a project survives a page refresh

Common issues to watch for:
- `snakeData` in `createProject` might include fields that don't exist in the DB schema (e.g., `status`, `progress`, `value`, `team`, `fleet`). Log the full payload and compare against the actual DB columns.
- `fetchProjects` might fail to map the response back correctly, returning an empty array even when data exists.
- The Zustand `persist` middleware might rehydrate BEFORE `fetchProjects` completes, showing stale empty state.

## Phase 5: Commit

Remove the `/debug` route (if created) before committing. Keep the `[TF-DEBUG]` console.log statements — they're invaluable for staging debugging and can be removed in a production cleanup sprint.

```bash
git add -A
git commit -m "S5-4c: Diagnose and fix Supabase persistence end-to-end

Add [TF-DEBUG] instrumentation throughout org→project write chain.
Add RLS INSERT policies for organizations and organization_members.
Fix any additional issues found during local diagnostic testing.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD
gh pr create --title "S5-4c: Diagnose and fix Supabase persistence" --body "$(cat <<'EOF'
## Summary
- Add [TF-DEBUG] console.log instrumentation to entire persistence chain
- Add missing RLS INSERT policies for organizations + organization_members
- Add migration 003_fix_rls_policies.sql
- Fix any additional issues found during local diagnostic testing

## Test plan
- [ ] npm run build passes
- [ ] Sign in → create project → page refresh → project persists
- [ ] Browser console shows [TF-DEBUG] trace with no errors
- [ ] New user signup → fetchOrg creates org → project creation works

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --merge --delete-branch
```

## Environment Notes

- Supabase URL: https://axasujjoywqadzuisvaj.supabase.co
- The `.env.local` file should have VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- If `.env.local` doesn't exist, check `.env` or create it from `.env.example`
- Test user: woodsrider82+test4@gmail.com (has manually created org + membership in Supabase)
- The app uses Zustand with localStorage persist middleware
- Netlify auto-deploys from GitHub main branch
