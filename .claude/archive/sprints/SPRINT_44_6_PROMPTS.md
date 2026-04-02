# Sprint 44.6 — Hotfix: Widget Layout Persistence (EXACT CODE PATCH)

> **Goal**: Fix widget layout persistence. This has failed 3 previous attempts because Code kept fixing the SAVE path while the bug is in the LOAD path. This sprint provides EXACT code changes — no investigation, no options, no interpretation. Apply these changes verbatim.
>
> **Single sprint**. Create a PR when done.
> **Branch**: `sprint-44-6-hotfix`
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-44-6-hotfix --title "Sprint 44.6: Widget layout persistence — root cause fix" --body "Root cause: Dashboard.tsx useRef dies on unmount, causing Supabase fetch to re-run and resetWidgetLayout() to destroy localStorage layout. Fix: module-level guard, remove resetWidgetLayout fallback, add uiStore cleanup to signOut."`

---

## CRITICAL CONTEXT

> **DO NOT investigate. DO NOT add debug logs. DO NOT change the save path. Apply EXACTLY the 3 changes below.**
>
> **Root cause** (verified by Orchestrator reading source code on 2026-04-01):
>
> 1. `Dashboard.tsx:357` — `const lastLayoutUserRef = useRef<string | null>(null)` dies when Dashboard unmounts during page navigation. On remount, ref is `null`, guard fails, Supabase fetch re-runs.
> 2. `Dashboard.tsx:376-378` — When Supabase has no saved layout (common: upsert may have failed silently), `resetWidgetLayout()` is called, which **overwrites the working localStorage layout with defaults**. This is the line that destroys the layout.
> 3. `AuthContext.tsx:110-123` — `signOut()` resets project/crew/material/equipment stores but does NOT reset `useUIStore` or clear `tf_ui` from localStorage. This means a previous user's layout leaks to the next user on the same browser.
>
> **Why 3 previous fixes failed**: All three (S43, S44, S44.5) only modified the SAVE path (closure fix, .update→.upsert, debounce fix). None of them touched the LOAD path where the bug actually is.

---

## REGRESSION CHECKLIST

> - [ ] Dashboard loads for authenticated users
> - [ ] Sample data still works
> - [ ] Manifest back nav still returns to /manifest
> - [ ] All pages load without errors
> - [ ] `npm run build` passes

---

## S44.6-1: Three exact changes (apply in order)

### Change A: Module-level guard in Dashboard.tsx

**File**: `src/pages/Dashboard.tsx`

Find this code (around lines 356-362):
```typescript
  // Load widget layout from Supabase on user login/switch — prevents cross-user leakage
  const lastLayoutUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    // Only load once per user per session
    if (lastLayoutUserRef.current === user.id) return;
    lastLayoutUserRef.current = user.id;
```

Replace with:
```typescript
  // Load widget layout from Supabase on user login/switch — prevents cross-user leakage
  // Module-level guard (survives component unmount/remount during page navigation)
  useEffect(() => {
    if (!user?.id) return;
    if (layoutLoadedForUser === user.id) return;
    layoutLoadedForUser = user.id;
```

And add this module-level variable OUTSIDE the Dashboard component, near the top of the file (after the imports, before the component function). Place it near the other module-level declarations (like the `PRIORITY_TO_KPI` map or the `useDebouncedCallback` function):

```typescript
// Track which user's layout has been loaded this session (survives component unmount/remount)
let layoutLoadedForUser: string | null = null;
```

Also remove `useRef` from the React import on line 1 IF it's no longer used elsewhere in the file. Check first — `kpiRefs` and `timerRef` in `useDebouncedCallback` still use `useRef`, so **keep the import**.

### Change B: Remove resetWidgetLayout() from the else branch

**File**: `src/pages/Dashboard.tsx`

Find this code (around lines 375-380):
```typescript
        useUIStore.getState().setWidgetLayout(restored);
      } else {
        // No saved layout — reset to default (clears previous user's cached layout)
        useUIStore.getState().resetWidgetLayout();
      }
```

Replace with:
```typescript
        useUIStore.getState().setWidgetLayout(restored);
      }
      // If no Supabase record: keep current store state (from localStorage persist or DEFAULT_WIDGET_LAYOUT)
      // Do NOT call resetWidgetLayout() here — it destroys the working localStorage layout
```

**Why this is safe**: 
- New user (no Supabase record, no localStorage): Zustand initializes with `DEFAULT_WIDGET_LAYOUT` (line 77 of uiStore.ts) — correct.
- Returning user (no Supabase record, has localStorage): Zustand persist loads from `tf_ui` — correct.
- Returning user (has Supabase record): `setWidgetLayout(restored)` runs — correct.
- Different user after sign-out: Change C below handles clearing the old user's state.

### Change C: Add uiStore cleanup to signOut

**File**: `src/contexts/AuthContext.tsx`

Find this code (around lines 110-123):
```typescript
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Reset in-memory state and clear persisted store data
    useProjectStore.getState().reset()
    useCrewStore.getState().reset()
    useMaterialStore.getState().reset()
    useEquipmentStore.getState().reset()
    useProjectStore.persist.clearStorage()
    useCrewStore.persist.clearStorage()
    useMaterialStore.persist.clearStorage()
    useEquipmentStore.persist.clearStorage()
    useOrgStore.getState().clearOrg()
  }
```

Replace with:
```typescript
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // Reset in-memory state and clear persisted store data
    useProjectStore.getState().reset()
    useCrewStore.getState().reset()
    useMaterialStore.getState().reset()
    useEquipmentStore.getState().reset()
    useProjectStore.persist.clearStorage()
    useCrewStore.persist.clearStorage()
    useMaterialStore.persist.clearStorage()
    useEquipmentStore.persist.clearStorage()
    useOrgStore.getState().clearOrg()
    // Reset widget layout so next user gets defaults (not previous user's layout)
    useUIStore.getState().resetWidgetLayout()
    useUIStore.persist.clearStorage()
  }
```

This requires adding the import at the top of AuthContext.tsx:
```typescript
import { useUIStore } from '@/stores/uiStore'
```

Also reset the module-level guard so the next user triggers a fresh Supabase fetch. Add this line right after the `useUIStore.persist.clearStorage()` line:

Wait — the module-level variable `layoutLoadedForUser` is in Dashboard.tsx, not accessible from AuthContext.tsx. We need a different approach to reset it. **Two options:**

**Option 1 (simplest)**: Export a reset function from Dashboard.tsx:
- In Dashboard.tsx, after the `let layoutLoadedForUser` declaration, add:
  ```typescript
  export function resetLayoutLoadedGuard() { layoutLoadedForUser = null; }
  ```
- In AuthContext.tsx, import and call it:
  ```typescript
  import { resetLayoutLoadedGuard } from '@/pages/Dashboard'
  // ...in signOut:
  resetLayoutLoadedGuard()
  ```

**Option 2 (cleaner)**: Move the guard into uiStore instead:
- In `src/stores/uiStore.ts`, add a field `layoutLoadedForUser: string | null` and an action `setLayoutLoadedForUser: (userId: string | null) => void` to the store (NOT persisted — use `partialize` to exclude it, or just accept it persists and gets cleared on sign-out via `resetWidgetLayout`)
- Actually this overcomplicates things. **Use Option 1.**

**Apply Option 1:**

In `src/pages/Dashboard.tsx`, after the module-level variable:
```typescript
let layoutLoadedForUser: string | null = null;
export function resetLayoutLoadedGuard() { layoutLoadedForUser = null; }
```

In `src/contexts/AuthContext.tsx`, add to imports:
```typescript
import { resetLayoutLoadedGuard } from '@/pages/Dashboard'
```

And in the signOut function, after `useUIStore.persist.clearStorage()`:
```typescript
    resetLayoutLoadedGuard()
```

---

## Summary of ALL changes

| File | What Changes |
|------|-------------|
| `src/pages/Dashboard.tsx` | Replace `useRef` guard with module-level `layoutLoadedForUser` variable. Export `resetLayoutLoadedGuard()`. Remove `resetWidgetLayout()` from the else branch. |
| `src/contexts/AuthContext.tsx` | Import `useUIStore` and `resetLayoutLoadedGuard`. Add `useUIStore.getState().resetWidgetLayout()`, `useUIStore.persist.clearStorage()`, and `resetLayoutLoadedGuard()` to `signOut()`. |

That's it. Two files. No new functions, no new tables, no Supabase changes.

---

## Self-verification (before PR):
- [ ] `npm run build` passes
- [ ] `layoutLoadedForUser` is a module-level `let` (not `useRef`, not inside the component)
- [ ] `resetWidgetLayout()` does NOT appear in the Supabase fetch else branch
- [ ] `signOut()` calls `useUIStore.getState().resetWidgetLayout()`, `useUIStore.persist.clearStorage()`, and `resetLayoutLoadedGuard()`
- [ ] `Dashboard.tsx` still imports `useRef` (needed by `kpiRefs` and `useDebouncedCallback`)
- [ ] No debug `console.log` statements

---

## Charlie's Test Plan (after merge):

1. **Rearrange widgets → navigate to Projects → back to Dashboard → layout preserved** (this was broken)
2. **Rearrange widgets → sign out → sign in same account → layout preserved** (this was broken)
3. Sign in different account → default layout (no bleed from previous user)
4. New account → default layout
5. Load sample data → no errors (regression)
6. Manifest → project → back → /manifest (regression)
7. Console: no errors, no debug logs

### Merge commands:
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git checkout main
git merge sprint-44-6-hotfix
git push origin main
git branch -d sprint-44-6-hotfix
npm run build
npm run dev
```

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
