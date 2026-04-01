# Sprint 41 — Onboarding & Auth Flow Hotfix

> **Goal**: Fix four UX bugs found during Sprint 37-40 testing. All relate to the signup → onboarding → app flow. After this sprint, a brand-new user has a clean onboarding experience and existing users aren't disrupted.
>
> **Single sprint** (not a batch). Create a PR when done.
> **Branch**: `sprint-41-onboarding-hotfix`
> **Design reference**: `.claude/DESIGN_SYSTEM.md`
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-41-onboarding-hotfix --title "Sprint 41: Onboarding & Auth Flow Hotfix" --body "Fixes: checklist pre-completion, duplicate company name, onboarding skip, sign-out redirect."`

---

## CRITICAL CONTEXT

> - These bugs were found during Sprint 37-40 testing
> - The onboarding system was built in Sprints 26-27 (setup checklist, welcome banner, sample data)
> - Sprint 38 was supposed to fix sign-out redirect and add onboarding skip — verify if those changes exist before reimplementing
> - The signup page collects a company name during account creation
> - The onboarding wizard also asks for company name (duplicate)
> - The setup checklist on Dashboard tracks first-run progress (e.g., "Set up company info", "Create first project")
> - Trial system (Sprint 39) sets `subscription_status = 'trialing'` on org INSERT via DB trigger
> - React 18 + Vite + TypeScript + Tailwind CSS
> - Brand color: `#2D6A4F` (green). Dark theme is primary.

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] `/login` page renders and login works
> - [ ] `/signup` page renders and creates account
> - [ ] Landing page renders at `/` for unauthenticated users
> - [ ] Authenticated users see Dashboard at `/`
> - [ ] Trial banner shows for trialing users
> - [ ] SubscriptionGuard still works
> - [ ] Settings page still loads
> - [ ] Project wizard still loads

---

## S41-1: Fix Setup Checklist Pre-Completion

**Problem**: A brand-new account already shows some "Get Started" checklist tasks as complete before the user has done anything. This likely happens because the signup flow or trial trigger satisfies checklist conditions automatically.

**Current state**: The setup checklist (built in Sprint 26) shows on the Dashboard for new users. It tracks steps like "Set up company info", "Create first project", etc. Some items appear pre-completed on fresh accounts.

**Investigation steps**:
1. Read the setup checklist component — find where checklist items are defined and how "complete" is determined
2. Check each completion condition:
   - If "Set up company info" checks for org name — this would be true because signup collects company name
   - If any item checks for `subscription_status` being set — trial trigger sets this to `'trialing'` on INSERT
   - If any item checks for profile fields — these might be set during signup
3. Identify which specific items are incorrectly pre-completed and why

**Fix approach**: Checklist completion conditions need to check for *meaningful* user actions, not just field existence. For example:
- "Set up company info" should check if the user has visited Settings and saved (not just that a company name exists from signup)
- Consider adding a `setup_checklist_completed` JSON column or using a simple flag per step
- Alternatively, make the checklist conditions more specific (e.g., check for phone number, address, or other fields that signup doesn't collect)

**Files to investigate first**: Search for the checklist component and its completion logic. Likely in `src/components/` or `src/pages/Dashboard`.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] New account shows all checklist items as incomplete
- [ ] Completing a checklist action properly marks it as done
- [ ] Existing accounts with real data still show correct completion state

---

## S41-2: Remove Duplicate Company Name from Onboarding

**Problem**: The signup page asks for company name, then the onboarding wizard asks for it again. This feels broken to the user.

**Current state**: Signup page has a "Company Name" field that creates the organization. The onboarding wizard (built in Sprint 26-27) has a step that also asks for company info.

**Investigation steps**:
1. Read the signup page — confirm it collects company name and creates the org
2. Read the onboarding wizard — find the company name step
3. Determine the best fix: skip the step, pre-fill it, or remove it

**Fix approach** (pick the cleanest):
- **Option A (preferred)**: In the onboarding wizard, pre-fill the company name from the org record and skip to the next step if it's already set. The step still exists but auto-advances.
- **Option B**: Remove the company name step from onboarding entirely. If the onboarding has other company fields (address, phone, etc.), keep those but remove the name field.
- **Option C**: Remove company name from the signup form and only collect it in onboarding. This is worse because the org needs a name at creation time.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Signup collects company name
- [ ] Onboarding does NOT re-ask for company name (or auto-skips if pre-filled)
- [ ] Company name persists correctly in the org record

---

## S41-3: Add Onboarding Exit / Skip

**Problem**: Once the onboarding workflow starts, there's no way for the user to exit without completing it or signing out. This was supposed to be fixed in S38-0 — check if the fix exists and is working.

**Current state**: Read the onboarding component to check if a "Skip" link was added in Sprint 38.

**Investigation steps**:
1. Read the onboarding page component
2. Check if a "Skip for now" or similar link was added in Sprint 38
3. If it exists but isn't visible, fix the styling/placement
4. If it doesn't exist, implement it

**Fix approach**:
- Add a "Skip for now →" text link at the top-right of the onboarding component
- Clicking it should:
  - Set a flag so the user isn't redirected back to onboarding (use org record or local state)
  - Navigate to Dashboard `/`
- Style: subtle text link, `rgba(255,255,255,0.5)`, 14px
- The user can always come back to complete setup via the Dashboard checklist

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Onboarding has a visible "Skip" option
- [ ] Clicking Skip navigates to Dashboard
- [ ] User is NOT redirected back to onboarding after skipping

---

## S41-4: Fix Sign-Out Redirect

**Problem**: Signing out takes the user to `/login` instead of the landing page at `/`. This was supposed to be fixed in S38-0 — check if the fix exists and is working.

**Current state**: Read the sign-out handler to check current behavior.

**Investigation steps**:
1. Search for the sign-out/logout handler (likely in a header, sidebar, or settings component)
2. Check what URL it redirects to after `supabase.auth.signOut()`
3. If it goes to `/login`, change it to `/`

**Fix**: Change the post-signout redirect from `/login` to `/`. Since Sprint 37 set up unauthenticated `/` to show the landing page, this is the correct destination.

**Files to investigate**: Search for `signOut` or `sign_out` across the codebase.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Sign out from any page redirects to `/` (landing page)
- [ ] Landing page renders correctly after sign-out
- [ ] Signing back in from landing page works

---

## Execution Order

1. **S41-1** — Checklist pre-completion (most investigation needed)
2. **S41-2** — Duplicate company name (quick once onboarding is understood)
3. **S41-3** — Onboarding skip (may already be partially done from S38)
4. **S41-4** — Sign-out redirect (quick fix)

---

## SQL Migrations Required

**None.**

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] Fresh signup shows all checklist items as incomplete
- [ ] Company name is not asked twice
- [ ] Onboarding has a skip option that works
- [ ] Sign-out goes to landing page
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean
- [ ] No console.log debug statements left

### Charlie's Test Plan (after merge):
1. Create a brand-new account in incognito
2. Verify signup asks for company name
3. After signup, check if onboarding asks for company name again (should not)
4. Verify all "Get Started" checklist items show as incomplete
5. Test "Skip" on onboarding — should go to Dashboard
6. Complete one checklist item — verify it updates
7. Sign out — should land on the landing page (not /login)
8. Sign back in — should go to Dashboard
9. Console check: no errors

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
