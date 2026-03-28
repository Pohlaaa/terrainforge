# Sprint 5 Prompts — Stability & Pilot Prep

**Goal:** Fix P0/P1 bugs found in Sprint 4 self-test, retest blocked features, deploy to Netlify staging.

Each prompt ends with a `gh` CLI block. Code will commit, create the PR, and merge it automatically. After each task you only need to run `git pull origin main` in PowerShell.

---

## S5-1: Fix Cross-Account Data Leak (P0 — F-011)

**Context:** During self-testing, signing into a new account in the same browser showed data from the previous user's account. Two root causes identified:

1. `signOut()` in `AuthContext.tsx` only clears `orgStore` — the other four Zustand stores (`tf_projects`, `tf_crew`, `tf_materials`, `tf_equipment`) remain in localStorage untouched when a user signs out.
2. All four data stores have an `if (data.length > 0)` guard in their fetch functions that prevents overwriting cached data when a new account returns zero results from Supabase. A new user signs in → Supabase returns empty → guard fires → old localStorage data stays visible.

**Changes required:**

**`src/contexts/AuthContext.tsx`**
- Import all four stores at the top: `useProjectStore`, `useCrewStore`, `useMaterialStore`, `useEquipmentStore`
- In the `signOut()` function, after `supabase.auth.signOut()`, clear all store localStorage keys before `clearOrg()`:
  ```ts
  useProjectStore.persist.clearStorage()
  useCrewStore.persist.clearStorage()
  useMaterialStore.persist.clearStorage()
  useEquipmentStore.persist.clearStorage()
  ```
- In the `onAuthStateChange` callback, when `_event === 'SIGNED_OUT'`, also call those four `clearStorage()` methods as a safety net.

**`src/stores/projectStore.ts`**
- In `fetchProjects`, remove the `if (projects.length > 0)` guard. Always call `set({ projects, isLoading: false })` regardless of how many records Supabase returns. An empty array is valid — it means the user has no projects yet.

**`src/stores/crewStore.ts`**
- Same fix: in `fetchCrew`, remove the `if (crew.length > 0)` guard. Always set.

**`src/stores/materialStore.ts`**
- Same fix: in the materials fetch function, remove the `if (materials.length > 0)` guard. Always set.

**`src/stores/equipmentStore.ts`**
- Same fix: in the equipment fetch function, remove the `if (equipment.length > 0)` guard. Always set.

**Validation:** `npm run build` must pass with zero TypeScript errors.

```bash
git add -A
git commit -m "S5-1: Fix cross-account data leak — clear all stores on signOut, remove fetch guards

Fixes F-011: Zustand persist stores now cleared on signOut and auth state change.
Fetch guards removed so empty Supabase results correctly replace cached data.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD
gh pr create --title "S5-1: Fix cross-account data isolation (P0)" --body "$(cat <<'EOF'
## Summary
- Clear all Zustand persist stores on signOut (projectStore, crewStore, materialStore, equipmentStore)
- Add clearStorage() calls to onAuthStateChange SIGNED_OUT event as safety net
- Remove if (length > 0) fetch guards in all four stores — empty array is now a valid result
- Fixes F-011: new user in same browser no longer sees previous user's data

## Test plan
- [ ] Sign in as User A, create a project
- [ ] Sign out
- [ ] Sign in as User B (new account) — should see zero projects, not User A's data
- [ ] Sign back in as User A — original data should reload from Supabase correctly
- [ ] npm run build passes with zero TypeScript errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --merge --delete-branch
```

---

## S5-2: Fix Demo Data Detection + Empty States (F-014, F-015)

**Context:** The "Clear Demo Data" button in Sidebar.tsx checks for hardcoded project IDs (`proj_001`, `proj_002`). Real Supabase accounts get UUIDs, so the button never appears for any actual user. Additionally, S4-5 empty states couldn't be tested because of this.

**Changes required:**

**`src/types/index.ts` (or wherever the Project type is defined)**
- Add `isDemo?: boolean` to the `Project` interface.

**`src/stores/projectStore.ts`**
- In `DEFAULT_PROJECTS`, add `isDemo: true` to both seed projects.
- When `fetchProjects` is called and Supabase returns results, those records will not have `isDemo: true` (it's a frontend-only flag on seed data). No change needed to the fetch logic.

**`src/components/layout/Sidebar.tsx`**
- Replace the `SEED_PROJECT_IDS` Set and `hasDemoData` check with:
  ```ts
  const hasDemoData = projects.some(p => p.isDemo === true)
  ```
- The `handleClearDemoData` function should filter out only demo-flagged projects: `projects.filter(p => !p.isDemo)`.
- Update the `clearDemoData` store action to remove only `isDemo: true` projects rather than by hardcoded IDs.

**Empty state verification:** After the fix, a user with no real projects (demo data cleared) should see:
- Dashboard: welcome card with "Create your first project" CTA
- Projects page: empty state with "Create Project" button

**Validation:** `npm run build` must pass with zero TypeScript errors.

```bash
git add -A
git commit -m "S5-2: Fix demo data detection and verify empty states

Replace hardcoded seed ID check with isDemo flag on Project type.
Demo projects flagged in DEFAULT_PROJECTS, sidebar button now works correctly.
Fixes F-014 and unblocks F-015 empty state testing.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD
gh pr create --title "S5-2: Fix demo data detection, verify empty states" --body "$(cat <<'EOF'
## Summary
- Add isDemo?: boolean to Project type
- Set isDemo: true on DEFAULT_PROJECTS seed data
- Replace SEED_PROJECT_IDS hardcoded check with projects.some(p => p.isDemo)
- Clear demo data filters on isDemo flag, not hardcoded IDs
- Fixes F-014 (button never appeared for real users)

## Test plan
- [ ] Fresh account: "Clear Demo Data" button visible in sidebar with demo projects loaded
- [ ] Clicking it shows confirmation dialog
- [ ] Confirming removes demo projects, button disappears
- [ ] Dashboard shows welcome card after clearing
- [ ] Projects page shows empty state with Create Project button after clearing
- [ ] Creating a real project makes empty states disappear

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --merge --delete-branch
```

---

## S5-3: Retest Zone UI and Dashboard Widget

**This is Charlie's manual test — not a Code task.**

After S5-1 and S5-2 are merged and pulled:

1. Open a private/incognito browser window (ensures no cached localStorage)
2. Sign up as a brand new account at `http://localhost:5174`
3. Run through the S4-1 zone tests from `.claude/TESTING/SPRINT_4_TESTS.md`
4. Run through the S4-2 dashboard widget tests
5. Run through the S4-4 and S4-5 demo data + empty state tests
6. Log any new findings as F-016+ in `FINDINGS.md`

**The test passes when:**
- [ ] New account sees zero data (no data from other accounts)
- [ ] Zone CRUD works: add, edit, delete zones on a project
- [ ] Dashboard Active Projects widget visible and functional
- [ ] Clear Demo Data button appears and works
- [ ] Empty states appear after clearing
- [ ] Creating first real project returns to normal UI

---

## S5-4: Netlify Staging Deploy

**Context:** First real deployment. Reference `.claude/DEPLOYMENT.md` for full checklist. Stripe webhooks require a public HTTPS URL — this is the first time we can test the billing flow end-to-end.

**Pre-deploy checklist (Charlie to verify before running this prompt):**
- [ ] S5-1 and S5-2 merged and tested
- [ ] Supabase staging project created (separate from dev)
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values ready for staging
- [ ] Stripe webhook secret ready for staging environment

**What Code should do:**
- Ensure `netlify.toml` exists and is correctly configured for Vite (build command: `npm run build`, publish dir: `dist`, redirects for SPA routing)
- Ensure all environment variables are documented in `.env.example` (never commit `.env`)
- Confirm `vite.config.ts` has no hardcoded localhost references
- Run `npm run build` to confirm a clean production build
- Verify no `console.log` statements remain in production code paths

**Deployment itself is done via Netlify CLI or Netlify MCP — not via Code.**

```bash
git add -A
git commit -m "S5-4: Prep production build for Netlify staging deploy

Verify netlify.toml, env vars documented, no localhost references, clean build.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin HEAD
gh pr create --title "S5-4: Production build prep for Netlify staging" --body "$(cat <<'EOF'
## Summary
- Verify/update netlify.toml for Vite SPA routing
- Confirm .env.example documents all required environment variables
- Remove any hardcoded localhost references from production paths
- Clean npm run build with zero errors or warnings

## Test plan
- [ ] npm run build passes locally with zero errors
- [ ] netlify.toml has correct build command and publish directory
- [ ] .env.example lists all VITE_ variables
- [ ] No console.log statements in production code paths

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --merge --delete-branch
```

---

## S5-5: Phase 1 Gate Review

**This is a Cowork + Charlie session — not a Code task.**

After staging is live, review Phase 1 gate criteria:

| Criterion | Status |
|-----------|--------|
| Auth working (signup, login, logout, session persistence) | ✅ Done |
| All 8 pages wired to real Supabase data | ✅ Done |
| PDF export functional (Manifest + Crew Packet) | ✅ Done |
| Stripe billing live (checkout, portal, webhook) | ✅ Done |
| Multi-tenancy: data isolated between orgs | 🔄 Retest after S5-1 |
| Pilot user can complete full workflow unassisted | 🔄 Requires staging deploy |

Phase 1 is complete when all 6 are checked. Phase 2 (Operations) begins after first pilot user completes a real project in the app.
