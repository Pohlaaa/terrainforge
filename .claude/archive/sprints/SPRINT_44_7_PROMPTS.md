# Sprint 44.7 — Hotfix: Simplify Widget Persistence (Remove Supabase, localStorage Only)

> **Goal**: Make widget layout persist through page refresh and sign-out/sign-in by REMOVING the Supabase widget layout sync entirely. The Supabase fetch/save cycle has caused widget persistence bugs for 4 consecutive sprints. The fix is to simplify: use ONLY Zustand persist (localStorage), scoped by user ID.
>
> **Single sprint**. Create a PR when done.
> **Branch**: `sprint-44-7-hotfix`
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-44-7-hotfix --title "Sprint 44.7: Simplify widget persistence — localStorage only, remove Supabase sync" --body "Removes Supabase widget_layout fetch/save from Dashboard. Widget layout now persists via Zustand persist (localStorage) only, scoped by user ID to prevent cross-account bleed."`

---

## CRITICAL CONTEXT

> **Widget layout persistence has failed 4 fix attempts (S43, S44, S44.5, S44.6).** Each attempt tried to make the Supabase round-trip work. The Supabase useEffect on Dashboard mount has been the source of every bug — it overwrites localStorage state, has timing issues, and fails silently.
>
> **New strategy: DELETE the Supabase widget sync. Use localStorage only.**
>
> Why this is safe:
> - Cross-account isolation: `signOut()` already calls `useUIStore.persist.clearStorage()` (added in S44.6), so switching users starts fresh
> - Default layout for new users: Zustand initializes with `DEFAULT_WIDGET_LAYOUT` when no localStorage entry exists
> - Only downside: layout doesn't sync across devices. This is acceptable for M3 — no contractor uses two devices for the dashboard simultaneously. Can add Supabase sync back in M4 when we have proper testing.
>
> **Current code state (verified by Orchestrator reading source on 2026-04-01):**
> - `Dashboard.tsx:38-40`: Module-level `layoutLoadedForUser` guard + `resetLayoutLoadedGuard` export
> - `Dashboard.tsx:360-383`: useEffect that fetches from Supabase and calls `setWidgetLayout(restored)` — THIS IS WHAT TO REMOVE
> - `Dashboard.tsx:385-401`: `debouncedSaveLayout` function that writes to Supabase — THIS IS WHAT TO REMOVE
> - `Dashboard.tsx:404-408`: `handleReorder` calls `debouncedSaveLayout` — REMOVE the Supabase save call
> - `Dashboard.tsx:418-420`: `handleVisibilityToggle` calls `debouncedSaveLayout` — REMOVE the Supabase save call
> - `Dashboard.tsx:17`: Import of `updateWidgetLayout` from preferences — REMOVE
> - `AuthContext.tsx:11`: Import of `resetLayoutLoadedGuard` — REMOVE
> - `AuthContext.tsx:128`: `resetLayoutLoadedGuard()` call — REMOVE

---

## REGRESSION CHECKLIST

> - [ ] Dashboard loads for authenticated users
> - [ ] Sample data still works
> - [ ] Manifest back nav still returns to /manifest
> - [ ] KPI customization still works (uses `updateSelectedKpis`, NOT affected by this change)
> - [ ] `npm run build` passes

---

## S44.7-1: Remove Supabase widget layout sync from Dashboard.tsx

**DO NOT investigate. Apply exactly these changes.**

### Remove the Supabase layout fetch useEffect (lines ~360-383)

Find this entire block:
```typescript
  // Load widget layout from Supabase on user login/switch — prevents cross-user leakage
  // Module-level guard (survives component unmount/remount during page navigation)
  useEffect(() => {
    if (!user?.id) return;
    if (layoutLoadedForUser === user.id) return;
    layoutLoadedForUser = user.id;

    fetchUserPreferences(user.id).then((prefs) => {
      if (prefs && Array.isArray((prefs as any).widgetLayout) && (prefs as any).widgetLayout.length > 0) {
        // Map Supabase format → store WidgetConfig format
        const saved = (prefs as any).widgetLayout as Array<{ widgetId: string; type: string; position: number; visible?: boolean }>;
        const restored = DEFAULT_WIDGET_LAYOUT.map((def) => {
          const match = saved.find((s) => s.type === def.type || s.widgetId === def.id);
          return match
            ? { ...def, order: match.position, visible: match.visible !== false }
            : { ...def, visible: false };
        });
        restored.sort((a, b) => a.order - b.order);
        useUIStore.getState().setWidgetLayout(restored);
      }
      // If no Supabase record: keep current store state (from localStorage persist or DEFAULT_WIDGET_LAYOUT)
      // Do NOT call resetWidgetLayout() here — it destroys the working localStorage layout
    });
  }, [user?.id]);
```

**DELETE this entire block.**

### Remove the debouncedSaveLayout function (lines ~385-401)

Find this entire block:
```typescript
  // Debounced Supabase layout write — reads layout from store to avoid stale closure
  const debouncedSaveLayout = useDebouncedCallback(
    async (userId: string, userOrgId: string) => {
      const layout = useUIStore.getState().widgetLayout;
      const serialized = layout.map((w) => ({
        widgetId: w.id,
        type: w.type,
        position: w.order,
        visible: w.visible,
      }));
      try {
        await updateWidgetLayout(userId, userOrgId, serialized);
      } catch {
        // silently ignore
      }
    },
    1000,
  );
```

**DELETE this entire block.**

### Remove debouncedSaveLayout calls from handleReorder

Find:
```typescript
  const handleReorder = (fromIndex: number, toIndex: number) => {
    reorderWidgets(fromIndex, toIndex);
    if (user?.id && orgId) {
      debouncedSaveLayout(user.id, orgId);
    }
  };
```

Replace with:
```typescript
  const handleReorder = (fromIndex: number, toIndex: number) => {
    reorderWidgets(fromIndex, toIndex);
  };
```

### Remove debouncedSaveLayout call from handleVisibilityToggle

Find:
```typescript
    if (user?.id && orgId) {
      debouncedSaveLayout(user.id, orgId);
    }
```
(inside `handleVisibilityToggle`)

**DELETE these 3 lines.**

### Remove module-level guard and export (lines ~38-40)

Find:
```typescript
// Track which user's layout has been loaded this session (survives component unmount/remount)
let layoutLoadedForUser: string | null = null;
export function resetLayoutLoadedGuard() { layoutLoadedForUser = null; }
```

**DELETE this entire block.** It was only needed for the Supabase fetch guard.

### Remove unused imports from Dashboard.tsx

From the import of `fetchUserPreferences, updateSelectedKpis, updateWidgetLayout`:
- **Keep** `fetchUserPreferences` and `updateSelectedKpis` (used for KPI persistence — not affected)
- **Remove** `updateWidgetLayout`

From the import line:
```typescript
import { fetchUserPreferences, updateSelectedKpis, updateWidgetLayout } from '@/services/preferences';
```
Change to:
```typescript
import { fetchUserPreferences, updateSelectedKpis } from '@/services/preferences';
```

Also remove `DEFAULT_WIDGET_LAYOUT` from the kpiDefinitions import IF it's no longer used in Dashboard.tsx after removing the Supabase fetch. **Check first** — it might still be used in the KPI section or as a fallback. If it's used elsewhere in the file, keep it.

Also remove the `useDebouncedCallback` function definition (lines ~42-55) IF it's no longer used anywhere in Dashboard.tsx after removing `debouncedSaveLayout`. **Check first** — if no other code in Dashboard.tsx calls `useDebouncedCallback`, delete it.

---

## S44.7-2: Clean up AuthContext.tsx

### Remove resetLayoutLoadedGuard import and call

Find in imports:
```typescript
import { resetLayoutLoadedGuard } from '@/pages/Dashboard'
```
**DELETE this line.**

Find in signOut:
```typescript
    resetLayoutLoadedGuard()
```
**DELETE this line.**

**Keep** the `useUIStore` import and the `useUIStore.getState().resetWidgetLayout()` + `useUIStore.persist.clearStorage()` calls in `signOut()`. These are still needed to clear the previous user's widget layout from localStorage on sign-out.

---

## Summary of ALL changes

| File | What Changes |
|------|-------------|
| `src/pages/Dashboard.tsx` | Remove: Supabase layout fetch useEffect, debouncedSaveLayout, Supabase save calls in handleReorder/handleVisibilityToggle, module-level guard, unused imports. Keep: everything else (KPI persistence, widget rendering, store reads). |
| `src/contexts/AuthContext.tsx` | Remove: `resetLayoutLoadedGuard` import + call. Keep: `useUIStore` reset + clearStorage in signOut. |

**Net result**: Widget layout is managed entirely by Zustand persist middleware. Changes to widget order/visibility are written to localStorage automatically by Zustand. Page refresh restores from localStorage. Sign-out clears localStorage. Sign-in starts fresh with defaults (or localStorage if same user on same browser without sign-out).

---

## Self-verification (before PR):
- [ ] `npm run build` passes
- [ ] No references to `debouncedSaveLayout` remain
- [ ] No references to `layoutLoadedForUser` remain
- [ ] No references to `resetLayoutLoadedGuard` remain
- [ ] `updateWidgetLayout` is not imported in Dashboard.tsx
- [ ] `handleReorder` still calls `reorderWidgets` (store update)
- [ ] `handleVisibilityToggle` still calls `toggleWidgetVisibility` (store update)
- [ ] `signOut()` still calls `useUIStore.getState().resetWidgetLayout()` and `useUIStore.persist.clearStorage()`
- [ ] KPI persistence (updateSelectedKpis) still works — NOT affected by this change
- [ ] No debug console.log statements

---

## Charlie's Test Plan (after merge):

1. **Rearrange widgets → navigate to Projects → back to Dashboard → layout preserved**
2. **Rearrange widgets → refresh page (F5) → layout preserved**
3. **Rearrange widgets → sign out → sign in same account → layout preserved** (localStorage survives sign-out only if we DON'T clear it — wait, we DO clear it in signOut. See note below.)
4. Sign in with different account → default layout (no bleed)
5. Load sample data → no errors (regression)
6. Manifest → project → back → /manifest (regression)
7. Console: no errors

**IMPORTANT NOTE on test 3**: After the S44.6 changes, `signOut()` calls `useUIStore.persist.clearStorage()` which removes `tf_ui` from localStorage. This means sign-out/sign-in will reset to defaults — because there's no Supabase to restore from anymore. **If you want widget layout to survive sign-out/sign-in**, we would need to NOT clear `tf_ui` on sign-out. But then cross-account isolation breaks (different user on same browser sees previous user's layout). This is a trade-off:

- **Option A (current)**: Sign-out clears layout. Cross-account safe. Layout lost on sign-out.
- **Option B**: Sign-out does NOT clear layout. Layout survives sign-out. Different user sees previous user's layout.

**Charlie: which do you prefer?** If you want Option B, tell me and I'll add it to the sprint prompt. If cross-account isolation matters more (recommended for production), keep Option A and accept that sign-out resets widget layout.

### Merge commands:
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git checkout main
git merge sprint-44-7-hotfix
git push origin main
git branch -d sprint-44-7-hotfix
npm run build
npm run dev
```

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
