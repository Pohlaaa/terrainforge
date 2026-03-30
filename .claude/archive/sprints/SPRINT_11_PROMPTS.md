# Sprint 11 — The "Ship It" Sprint

> **Goal**: MVP-ready gate. Every feature polished, every flow tested, zero dead code. New AND existing users can complete a full front-to-back workflow. This sprint marks the official Phase 1 MVP.

## Context Files to Read First

1. `CLAUDE.md` — master project context
2. `.claude/DEVELOPMENT.md` — code standards, RLS rules
3. `.claude/SPRINT_EXECUTION.md` — execution workflow
4. `.claude/TESTING/FINDINGS.md` — open bugs (F-034 is the priority fix)
5. `.claude/DESIGN_SYSTEM.md` — design tokens and component specs
6. `.claude/WORKFLOW.md` — sprint prompt quality bar

---

## S11-1: Fix New User Onboarding Flow (F-034)

**Goal**: New users who sign up are routed through the 4-step onboarding wizard before reaching the dashboard.

**Files to modify**:
- `src/pages/Signup.tsx`
- `src/pages/Onboarding.tsx`
- `src/components/shared/ProtectedRoute.tsx` (read-only — verify no onboarding logic remains here)

**Implementation details**:
- In `Signup.tsx`, after successful signup and email confirmation, navigate the user to `/onboarding` instead of `/`
- The issue is timing: Supabase auth `onAuthStateChange` fires `SIGNED_IN` but the navigation may happen before the auth state is fully resolved
- Fix: In `Signup.tsx`, after the signup call succeeds and the user confirms their email and logs in, explicitly check if the user has a `user_preferences` row. If not, redirect to `/onboarding`. If yes, redirect to `/`
- In `Onboarding.tsx`, the existing `handleGetStarted` saves preferences and navigates to `/` — verify this still works correctly
- Verify `ProtectedRoute.tsx` has NO onboarding redirect logic (it was removed in S9-hotfix-4)

**Acceptance criteria**:
- [ ] New user signs up → confirms email → logs in → sees onboarding wizard
- [ ] Existing user logs in → goes straight to dashboard (no onboarding)
- [ ] User who completed onboarding and navigates to `/onboarding` manually → redirected to `/`
- [ ] `npm run build` passes with zero errors

---

## S11-2: Fix Animation System + Propagate Micro-Interactions Across All Pages

**Goal**: First, verify the animation system is fully functional. Then propagate skeleton loading, toast notifications, and animations from Dashboard to every page.

**Files to modify**:
- `src/index.css`
- `tailwind.config.ts`
- `src/pages/Projects.tsx`
- `src/pages/MaterialLibrary.tsx`
- `src/pages/CrewManager.tsx`
- `src/pages/EquipmentManager.tsx`
- `src/pages/WorkOrders.tsx`
- `src/pages/ManifestEngine.tsx`
- `src/pages/PriceResearch.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Billing.tsx`

**CRITICAL PRE-STEP — Animation system audit**:
Before propagating to other pages, verify the animation pipeline end-to-end:

1. **Check `tailwind.config.ts`**: Ensure it is NOT truncated. It should contain a full `extend.animation` and `extend.keyframes` section defining ALL of these animations: `cardBirth`, `completionPulse`, `shimmerSweep`, `dropSettle`, `placeholderPulse`, `skeletonShimmer`, `breathe`, `btnPulse`, `errorShake`, `bellRing`, `stockPulseLow`, `stockPulseOut`, `inkDrop`, `toastSlideIn`, `toastSlideOut`. If the file is truncated (less than 50 lines) or missing any of these, **restore it fully** from the git commit `922b910` using `git show 922b910:tailwind.config.ts` as a reference.

2. **Check `src/index.css`**: Ensure it contains ALL `@keyframes` definitions and the `.skeleton-shimmer` utility class. If the file is less than 100 lines, it is truncated — restore from `git show 922b910:src/index.css`.

3. **Verify in a test build**: Run `npm run build` and check the output CSS bundle contains the keyframe names. If animations are missing from the build, the config files need fixing before proceeding.

**Implementation details**:
For EACH page listed above:
1. **Skeleton loading**: Import `Skeleton` components from `@/components/shared/Skeleton`. When the page's data is loading (Zustand store `loading` state), show skeleton placeholders instead of blank content. Create page-specific skeleton layouts:
   - Projects: 3-column card grid of skeleton cards (match existing card shape)
   - MaterialLibrary: skeleton table rows (6 rows, with shimmer)
   - CrewManager: skeleton list items
   - EquipmentManager: skeleton list items
   - WorkOrders: skeleton card list
   - ManifestEngine: skeleton form + preview area
   - PriceResearch: skeleton search results
   - Settings: skeleton form fields
   - Billing: skeleton plan cards

2. **Toast notifications**: Import `toast` from `@/hooks/useToast`. Replace any existing `alert()` calls or inline error messages with toast notifications:
   - Success: `toast.success('Project created')` — green checkmark icon
   - Error: `toast.error('Failed to save')` — red X icon with shake animation
   - Info: `toast.info('Loading...')` — blue info icon

3. **Status badge animations**: Any page showing status badges (Projects, WorkOrders) should use the `completionPulse` animation when status changes to "Complete". Add the CSS class `celebrating` briefly (600ms) when a status transitions.

4. **Progress bar animations**: Any page showing progress bars (Projects, Dashboard) should use the spring-eased fill with shimmer sweep from `index.css`.

5. **Card hover effects**: All clickable cards across all pages should have consistent hover: `box-shadow: var(--shadow-hover)`, `border-color: var(--border-strong)`, `transform: translateY(-1px)`, `transition: all 0.15s ease`.

**Acceptance criteria**:
- [ ] Every page shows skeleton loading state while data fetches (no blank screens)
- [ ] No `alert()` calls remain anywhere in src/pages/
- [ ] Toast notifications appear for all create/update/delete operations across all pages
- [ ] Card hover effects are consistent on Projects, WorkOrders, MaterialLibrary, EquipmentManager, CrewManager
- [ ] `npm run build` passes with zero errors

---

## S11-3: Code Cleanup and Dead Code Removal

**Goal**: Remove all unused files, dead imports, stale components, and console.log statements (except `[TF-DEBUG]` ones).

**Files to modify**: All files in `src/` — this is a sweep task.

**Implementation details**:

1. **Remove dead imports**: Run through every `.tsx` and `.ts` file in `src/`. Remove any import that is not used. TypeScript's build will catch most of these, but also check for:
   - Imported types that are never referenced
   - Imported components that are commented out
   - Duplicate imports

2. **Remove unused components**: Check if any component files in `src/components/` are never imported anywhere. If a component has zero imports across the codebase, delete the file. Candidates to check:
   - Any component created in early sprints that was replaced by a newer version
   - Test/debug components that shouldn't be in production

3. **Remove console.log statements**: Remove ALL `console.log` and `console.warn` statements EXCEPT those prefixed with `[TF-DEBUG]`. The debug logging stays for Supabase diagnostics. Remove:
   - Generic `console.log('test')` or `console.log(data)` statements
   - Commented-out console.log lines
   - `console.warn` for non-critical warnings

4. **Remove the Debug page from production routing**: In `src/App.tsx`, wrap the Debug route in a check for `import.meta.env.DEV` so it only renders in development mode:
   ```tsx
   {import.meta.env.DEV && (
     <Route path="/debug" element={<Debug />} />
   )}
   ```
   Also hide the Debug nav item in Sidebar.tsx under the same condition.

5. **Clean up type definitions**: In `src/types/index.ts` and `src/types/models.ts`, remove any exported types/interfaces that are never imported elsewhere.

6. **Verify all CSS custom properties are used**: In `src/index.css`, check for any `--` custom properties defined in `:root` that are never referenced in any `.tsx` file or elsewhere in the CSS. Remove unused ones.

**Acceptance criteria**:
- [ ] `npm run build` passes with zero errors and zero warnings
- [ ] No `alert()` calls in production code
- [ ] No `console.log` without `[TF-DEBUG]` prefix in production code
- [ ] Debug page not accessible in production build
- [ ] Every import in every file is actively used
- [ ] No orphaned component files (every component is imported somewhere)

---

## S11-4: End-to-End Flow Verification and Fixes

**Goal**: Walk through both the new-user and existing-user flows completely, fixing any broken interactions found along the way.

**Files to modify**: Whatever breaks during the walkthrough — this task is reactive.

**Implementation details**:

**Flow 1 — New User (simulate fresh signup)**:
Walk the code path for a user who has just signed up:
1. After auth, check if `user_preferences` row exists → should NOT exist → route to `/onboarding`
2. Onboarding step 1: select business type → step 2: company info → step 3: priorities → step 4: AI dashboard preview
3. Click "Get Started" → `upsertUserPreferences` writes to Supabase → navigate to `/`
4. Dashboard loads → KPI cards show (based on selected KPIs or defaults) → widget grid renders
5. Navigate to Projects → click "+ New Project" → AI Quick Create input visible → type description → form pre-fills
6. Create project → toast success → project appears in list
7. Click project card → detail panel opens → Overview tab with map placeholder, Materials tab, Crew tab
8. Add material to project → toast success → material appears in list
9. Navigate to Materials page → material visible in category sidebar and table
10. Navigate to Crew → assign crew member to project
11. Navigate to Manifest Engine → select project → export PDF

**Verify each step compiles and the component renders without errors. Fix any:**
- Missing imports or undefined references
- TypeScript type mismatches
- Broken navigation (clicking something doesn't go anywhere)
- Empty pages (component renders but shows nothing because data shape changed)
- Zustand store methods that don't exist or have wrong signatures

**Flow 2 — Existing User (simulate returning login)**:
Walk the code path for a user who has existing data:
1. Login → ProtectedRoute checks auth → dashboard loads (NO onboarding redirect)
2. Dashboard → KPI cards populated from real data → project cards visible with status dots
3. Click project → detail panel → verify all tabs render with data
4. Edit project → save → toast → verify change persists on refresh
5. Delete project → confirm dialog → toast → verify removed on refresh
6. Navigate every sidebar link: Projects, Materials, Crew, Equipment, Work Orders, Manifest, Settings
7. Settings → theme toggle works → light/dark switch persists
8. All pages render without console errors

**For each issue found**: fix it inline, note what was broken in a comment `// S11-4: fixed [description]`, and continue.

**Acceptance criteria**:
- [ ] Both flows complete without TypeScript errors
- [ ] Both flows complete without runtime console errors (except [TF-DEBUG] diagnostics)
- [ ] Every sidebar nav link renders a functional page
- [ ] CRUD operations work on Projects, Materials, Crew, Equipment
- [ ] Theme toggle persists across page navigation
- [ ] `npm run build` passes with zero errors

---

## S11-5: Project Folder Cleanup

**Goal**: Remove dead worktrees, stale build artifacts, and unnecessary files from the `.claude/` directory.

**Implementation details**:

1. **Prune git worktrees**:
   ```bash
   git worktree prune
   ```

2. **Delete stale worktree directories**: Remove all directories under `.claude/worktrees/`:
   ```bash
   rm -rf .claude/worktrees/*/
   ```

3. **Remove stale files**: Check for and remove:
   - Any `.claude/SPRINT_*_PROMPTS_S*` fragment files (these were intermediate prompt files from earlier sprints)
   - `PROJECT_DASHBOARD.html` at the repo root (if it exists and is no longer the active dashboard)
   - Any leftover `launch.json` in `.claude/`
   - Any `.netlifyignore` at root if it's empty or not needed

4. **Verify package.json is clean**: Check `package.json` for any dependencies that are imported nowhere in `src/`. Common candidates:
   - Leaflet (if Mapbox replaced it)
   - Any testing libraries that were never set up
   - Any dependencies from early prototyping that are no longer used

5. **Update .gitignore**: Ensure `.claude/worktrees/` is in `.gitignore` so worktree directories are never committed again.

**Acceptance criteria**:
- [ ] No directories under `.claude/worktrees/`
- [ ] No fragment prompt files (only `SPRINT_[N]_PROMPTS.md` per sprint)
- [ ] `.claude/worktrees/` is in `.gitignore`
- [ ] `npm run build` still passes
- [ ] `npm install` completes without warnings about unused dependencies

---

## S11-6: Phase 1 Gate Audit and Documentation Update

**Goal**: Update all project documentation to reflect Sprint 11 completion and Phase 1 MVP status.

**Files to modify**:
- `.claude/PROJECT_MANAGEMENT.md`
- `.claude/TESTING/FINDINGS.md`
- `CLAUDE.md`

**Implementation details**:

1. **PROJECT_MANAGEMENT.md**:
   - Mark Sprint 11 as complete
   - Update Phase 1 gate criteria — check off every item that is now met
   - Set Active Sprint to "None — Phase 1 MVP Complete"
   - Add a "Phase 1 MVP Summary" section listing all features shipped across Sprints 1-11

2. **TESTING/FINDINGS.md**:
   - Update F-034 status (should be resolved by S11-1)
   - Add any new findings from S11-4 walkthrough
   - Add a "Sprint 11 — Ship It Verification" section confirming both E2E flows pass

3. **CLAUDE.md**:
   - Update the project description to reflect current state (not early-stage prototype, but Phase 1 MVP)
   - Update the page list to include all pages (Onboarding, Settings were added in S9)
   - Update the tech stack section if anything changed (Mapbox, new shared components)
   - Ensure the Sprint 11 completion is noted

**Acceptance criteria**:
- [ ] All Phase 1 gate criteria in PROJECT_MANAGEMENT.md are checked (or explicitly noted as deferred with reasoning)
- [ ] F-034 is marked resolved
- [ ] CLAUDE.md accurately describes the current application
- [ ] `npm run build` passes (final confirmation)

---

## Execution Notes

- Tasks S11-1 through S11-4 should be executed sequentially (each builds on the last)
- S11-5 (cleanup) and S11-6 (docs) can run in any order after S11-4
- This sprint should produce ZERO new features — only fixes, propagation, cleanup, and verification
- If S11-4 discovers a bug that would take more than 30 minutes to fix, log it in FINDINGS.md as a P2 and continue — don't let one bug block the whole audit
- The final `npm run build` after S11-6 is the Phase 1 gate build — it must pass clean
