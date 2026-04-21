# Track 3 — Account Management & Settings Overhaul

> **Branch**: `feature-account-management`
> **Depends on**: Track 1 merged (Settings.tsx store-bypass is fixed there)
> **Goal**: Rebuild the Settings page with proper sections, add org profile management, improve role-based access, and polish the onboarding flow.

---

## Task 1: Rebuild Settings Page Structure

`src/pages/Settings.tsx` is 576 lines with 6 sections crammed into one component. Extract each section into its own component.

### New file structure:
```
src/components/settings/
├── ProfileSection.tsx      ← Display name, email, avatar, password change
├── CompanySection.tsx      ← Org name, address, phone, logo, business type
├── PreferencesSection.tsx  ← Theme, default project view, date format, units
├── NotificationSection.tsx ← Email/push notification toggles per event type
├── BillingSection.tsx      ← Current plan, usage, Stripe portal link
├── DangerZoneSection.tsx   ← Sample data insert/clear, account deletion
```

### Each section component:
- Self-contained with its own local state for form fields
- Receives only the store hooks it needs
- Has a consistent layout: section header + description + form fields + save button
- Uses the shared `Button`, `Input`, `Select` components from `src/components/ui/`

### Settings.tsx becomes orchestration only:
```tsx
<SettingsLayout activeSection={activeSection} onSectionChange={setActiveSection}>
  {activeSection === 'profile' && <ProfileSection />}
  {activeSection === 'company' && <CompanySection />}
  {/* etc. */}
</SettingsLayout>
```

Target: Settings.tsx under 100 lines. Each section component under 150 lines.

---

## Task 2: Enhanced Company/Org Profile

`CompanySection.tsx` should support editing all org fields that matter to a landscaping company:

### Fields to support:
- **Company Name** (existing — `organizations.name`)
- **Business Type** (existing in onboarding, should persist — residential, commercial, hardscaping, full-service)
- **Team Size** (existing in onboarding, should persist)
- **Company Phone** (new field — add to `organizations` table if not present)
- **Company Address** (new field — street, city, state, zip. Reuse `AddressInput` component)
- **Service Area** (text — e.g., "Greater Austin area, 50-mile radius")
- **Default Hourly Rate** (existing — `organizations.default_hourly_rate`)
- **Default Overhead %** (existing — `organizations.default_overhead_pct`)
- **License Number** (text — contractors often need this on documents)

### Implementation:
- Check which columns already exist on `organizations` table. If missing, note them but do NOT create migrations — just skip the field with a comment.
- All fields save via `orgStore.updateOrg(fields)` → `supabaseData.updateOrg()`.
- If `updateOrg` doesn't exist in supabaseData, create it.
- Show success toast on save, error toast on failure.

---

## Task 3: Profile Section Improvements

`ProfileSection.tsx` should handle:

### 3a. Display Name
- Current: Works but UX is basic. Keep the existing save flow.
- Add: Character limit indicator (50 chars max).

### 3b. Email Display
- Show current email (read-only from `user.email`).
- "Change email" button that opens Supabase Auth email change flow via `supabase.auth.updateUser({ email: newEmail })`.
- Show pending verification state if email change is in progress.

### 3c. Password Change
- Button: "Change Password"
- Opens inline form with: current password (not needed for Supabase Auth — use `updateUser`), new password, confirm password.
- Validation: min 8 chars, must match confirmation.
- Uses `supabase.auth.updateUser({ password: newPassword })`.
- Success → toast + close form. Error → inline error message.

### 3d. Avatar (stretch — implement only if time allows)
- Upload profile photo to Supabase Storage `avatars` bucket.
- Display in TopNav user menu and Profile section.
- Fallback: initials circle (already exists in TopNav).

---

## Task 4: Role-Based Settings Visibility

Not all settings sections should be visible to all roles.

### Visibility matrix:
| Section | admin | designer | foreman | client |
|---------|-------|----------|---------|--------|
| Profile | ✓ | ✓ | ✓ | ✓ |
| Company | ✓ | read-only | ✗ | ✗ |
| Preferences | ✓ | ✓ | ✓ | ✓ |
| Notifications | ✓ | ✓ | ✓ | ✓ |
| Billing | ✓ | ✗ | ✗ | ✗ |
| Danger Zone | ✓ | ✗ | ✗ | ✗ |

### Implementation:
- Read user role from `useOrgStore().org?.userRole` or from the membership record.
- Filter `NAV_ITEMS` based on role before rendering the settings sidebar.
- For "read-only" sections, pass `readOnly` prop to the section component which disables all form inputs and hides save buttons.

---

## Task 5: Onboarding Flow Polish

`src/pages/Onboarding.tsx` (449 lines) works but needs refinement:

### 5a. Persist all onboarding data to org record
Currently, business type, team size, and role are collected but some only go to `user_preferences`. Ensure they also write to the `organizations` table so `CompanySection` can read them later.

### 5b. Skip onboarding if already completed
The redirect check exists (line 78) but uses `fetchUserPreferences`. Also check if `org.businessType` is set — if so, skip onboarding.

### 5c. Progress indicator
Add a step progress bar at the top (Step 1 of 4, Step 2 of 4, etc.) using a simplified version of `WizardStepper`.

### 5d. Welcome screen
Add a brief welcome step (Step 0) before the business type selection:
- "Welcome to TerrainForge" header
- Brief value prop (2-3 sentences about what the platform does)
- "Let's set up your account" CTA button
- Skip link: "I'll set this up later" → goes to dashboard with defaults

### 5e. Extract sub-components
If Onboarding stays over 300 lines after these changes, extract each step into:
```
src/components/onboarding/
├── WelcomeStep.tsx
├── BusinessTypeStep.tsx
├── TeamInfoStep.tsx
├── PrioritiesStep.tsx
├── DashboardPreviewStep.tsx
```

---

## Task 6: Notification Preferences (Foundation)

Current notification toggles save to localStorage. Build the foundation for real notifications:

### 6a. Create `user_preferences` columns (if not present):
Check if `user_preferences` table has notification columns. If not, note which are missing but do NOT create migrations. Instead, use the existing `preferences` JSONB column if available.

### 6b. Notification categories:
- **Project updates**: New project assigned, project status change, budget threshold exceeded
- **Crew**: Crew member checked in/out, new crew assignment
- **Equipment**: Maintenance due, equipment status change
- **System**: Weekly summary email, account security alerts

### 6c. Save to Supabase instead of localStorage:
Use `upsertUserPreferences` to persist notification settings. Read them on load via `fetchUserPreferences`.

---

## Task 7: Verification

1. `npm run build` passes with zero errors
2. Settings page loads with all 6 sections navigable
3. Company section saves org fields and reloads correctly
4. Password change works via Supabase Auth
5. Role-based visibility: create a test with admin role → all sections visible. Verify designer can't see Billing or Danger Zone (manual test).
6. Onboarding flow completes and writes all data to org + preferences
7. Settings.tsx is under 100 lines
8. Each settings section component is under 150 lines
9. Notification preferences persist to Supabase (not just localStorage)
