# Sprint 18 — Crew App: Persistence, Photos & Manager Visibility

> **Goal**: Make the crew app production-grade. Checklist step completions persist to Supabase (survive page refresh). Crew can take photos as proof of work. Managers see crew status on the schedule page.
>
> **Branch**: `sprint-18-crew-persist`
> **Design reference**: None — uses existing design tokens. Mobile-first for crew pages, desktop for manager pages.
> **SQL migrations**: YES — `supabase/migrations/008_checklist_progress_photos.sql` must be run BEFORE testing.
> **Manual step**: Charlie must create a Supabase Storage bucket named `crew-photos` (private) in the Supabase Dashboard before testing photo uploads.
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-18-crew-persist --title "Sprint 18: Crew App Persistence, Photos & Manager Visibility" --body "Checklist step persistence to Supabase, photo proof uploads, crew status on manager schedule page, manager photo gallery."`

---

## CRITICAL CONTEXT

> Read these files before starting:
> 1. `CLAUDE.md` (project root) — architecture rules, naming, what NOT to do
> 2. `.claude/CODE_GUIDE.md` — execution workflow
> 3. This file
>
> Key context:
> - Crew app lives at `/crew/*` using `CrewLayout` (Sprint 17)
> - `CrewJobDetail.tsx` currently stores step completions in local React state (`Record<string, Set<number>>`)
> - `generateSteps(zone, materials)` from `@/lib/workorders` produces steps with `.n` (1-based step number) and `.text`
> - Crew status signals (`upsertCrewStatus`, `fetchCrewStatus`) already work in `supabaseData.ts`
> - Schedule page (`src/pages/Schedule.tsx`) renders a crew-by-day grid — crew status indicators go next to crew names
> - Supabase Storage requires: bucket creation (manual), file upload via `supabase.storage.from('bucket').upload(path, file)`
> - All Supabase queries MUST filter by org_id

---

## S18-1: Add checklist progress CRUD to supabaseData.ts

**Problem/Goal**: CrewJobDetail needs to save/load step completions to Supabase so progress survives page refreshes and is visible to managers.

**Files to modify**:
- `src/services/supabaseData.ts` — Add three functions

**Implementation details**:

Add these functions after the crew status section:

```typescript
// ===== CREW CHECKLIST PROGRESS =====

export async function fetchChecklistProgress(
  scheduleEntryId: string,
): Promise<Array<{ zoneId: string; stepNumber: number }>> {
  try {
    const { data, error } = await supabase
      .from('crew_checklist_progress')
      .select('zone_id, step_number')
      .eq('schedule_entry_id', scheduleEntryId);
    if (error) throw error;
    return (data || []).map(row => ({
      zoneId: row.zone_id,
      stepNumber: row.step_number,
    }));
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_checklist_progress', err);
    return [];
  }
}

export async function saveChecklistStep(
  orgId: string,
  scheduleEntryId: string,
  crewMemberId: string,
  zoneId: string,
  stepNumber: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('crew_checklist_progress')
      .insert([{
        org_id: orgId,
        schedule_entry_id: scheduleEntryId,
        crew_member_id: crewMemberId,
        zone_id: zoneId,
        step_number: stepNumber,
      }]);
    if (error) throw error;
  } catch (err: any) {
    // Ignore unique constraint violations (step already saved)
    if (err?.code === '23505') return;
    onSupabaseError('INSERT', 'crew_checklist_progress', err);
  }
}

export async function removeChecklistStep(
  scheduleEntryId: string,
  zoneId: string,
  stepNumber: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('crew_checklist_progress')
      .delete()
      .eq('schedule_entry_id', scheduleEntryId)
      .eq('zone_id', zoneId)
      .eq('step_number', stepNumber);
    if (error) throw error;
  } catch (err: any) {
    onSupabaseError('DELETE', 'crew_checklist_progress', err);
  }
}
```

**Supabase considerations**:
- Table: `crew_checklist_progress` (created by migration 008)
- UNIQUE constraint on `(schedule_entry_id, zone_id, step_number)` — insert may conflict, handle 23505 gracefully
- RLS: org member can SELECT, INSERT, DELETE

**Acceptance criteria**:
- [ ] Three new functions exported from supabaseData.ts
- [ ] `npm run build` passes

---

## S18-2: Wire checklist persistence into CrewJobDetail

**Problem/Goal**: Replace the local-only `completedSteps` state with Supabase-backed persistence. Steps should load on page open and save/unsave on tap.

**Files to modify**:
- `src/pages/crew/CrewJobDetail.tsx`

**Implementation details**:

1. Import the new functions:
   ```typescript
   import { fetchScheduleEntries, fetchCrewStatus, upsertCrewStatus, fetchChecklistProgress, saveChecklistStep, removeChecklistStep } from '@/services/supabaseData';
   ```

2. On mount (after entry loads), fetch existing progress:
   ```typescript
   useEffect(() => {
     if (!entry) return;
     fetchChecklistProgress(entry.id).then((rows) => {
       const map: Record<string, Set<number>> = {};
       for (const { zoneId, stepNumber } of rows) {
         if (!map[zoneId]) map[zoneId] = new Set();
         map[zoneId].add(stepNumber);
       }
       setCompletedSteps(map);
     });
   }, [entry?.id]);
   ```

3. Replace the `toggleStep` function to save/remove on tap:
   ```typescript
   function toggleStep(zoneId: string, stepN: number) {
     if (!orgId || !crewMemberId || !entry) return;
     setCompletedSteps(prev => {
       const zoneSet = new Set(prev[zoneId] ?? []);
       if (zoneSet.has(stepN)) {
         zoneSet.delete(stepN);
         removeChecklistStep(entry.id, zoneId, stepN);
       } else {
         zoneSet.add(stepN);
         saveChecklistStep(orgId, entry.id, crewMemberId, zoneId, stepN);
       }
       return { ...prev, [zoneId]: zoneSet };
     });
   }
   ```

This gives optimistic UI (instant toggle) with background Supabase sync.

**Supabase considerations**:
- All operations go through the new CRUD functions from S18-1
- Optimistic: update local state first, then fire DB call
- On page load: fetch progress and rebuild the Set map

**Acceptance criteria**:
- [ ] Step completions persist across page refreshes
- [ ] Tapping a completed step un-completes it (removes from DB)
- [ ] Progress bar reflects persisted state on reload
- [ ] `npm run build` passes

---

## S18-3: Add photo upload CRUD to supabaseData.ts

**Problem/Goal**: Infrastructure for crew photo uploads. Upload files to Supabase Storage, save metadata to crew_photos table.

**Files to modify**:
- `src/services/supabaseData.ts` — Add photo upload/fetch/delete functions

**Implementation details**:

Add after the checklist progress section:

```typescript
// ===== CREW PHOTOS =====

export interface CrewPhoto {
  id: string;
  storagePath: string;
  caption: string;
  zoneId: string | null;
  stepNumber: number | null;
  uploadedAt: string;
}

export async function uploadCrewPhoto(
  orgId: string,
  scheduleEntryId: string,
  crewMemberId: string,
  file: File,
  zoneId?: string,
  stepNumber?: number,
  caption?: string,
): Promise<CrewPhoto | null> {
  try {
    // Upload file to storage
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${orgId}/${scheduleEntryId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('crew-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    // Save metadata row
    const { data, error } = await supabase
      .from('crew_photos')
      .insert([{
        org_id: orgId,
        schedule_entry_id: scheduleEntryId,
        crew_member_id: crewMemberId,
        zone_id: zoneId || null,
        step_number: stepNumber || null,
        storage_path: path,
        caption: caption || '',
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      storagePath: data.storage_path,
      caption: data.caption,
      zoneId: data.zone_id,
      stepNumber: data.step_number,
      uploadedAt: data.uploaded_at,
    };
  } catch (err: any) {
    onSupabaseError('UPLOAD', 'crew_photos', err);
    return null;
  }
}

export async function fetchCrewPhotos(
  scheduleEntryId: string,
): Promise<CrewPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('crew_photos')
      .select('id, storage_path, caption, zone_id, step_number, uploaded_at')
      .eq('schedule_entry_id', scheduleEntryId)
      .order('uploaded_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      storagePath: row.storage_path,
      caption: row.caption,
      zoneId: row.zone_id,
      stepNumber: row.step_number,
      uploadedAt: row.uploaded_at,
    }));
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_photos', err);
    return [];
  }
}

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('crew-photos')
    .createSignedUrl(storagePath, 3600); // 1 hour
  return data?.signedUrl || '';
}

export async function deleteCrewPhoto(id: string, storagePath: string): Promise<boolean> {
  try {
    await supabase.storage.from('crew-photos').remove([storagePath]);
    const { error } = await supabase
      .from('crew_photos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    onSupabaseError('DELETE', 'crew_photos', err);
    return false;
  }
}
```

**Supabase considerations**:
- Storage bucket `crew-photos` must exist (Charlie creates manually in Dashboard)
- File path format: `{orgId}/{scheduleEntryId}/{uuid}.{ext}` — org-scoped
- Signed URLs for display (private bucket)
- Metadata stored in `crew_photos` table with RLS

**Acceptance criteria**:
- [ ] Four new functions exported: `uploadCrewPhoto`, `fetchCrewPhotos`, `getPhotoUrl`, `deleteCrewPhoto`
- [ ] `npm run build` passes

---

## S18-4: Add photo capture UI to CrewJobDetail

**Problem/Goal**: Crew members can take a photo at any point during a job and upload it as proof of work.

**Files to modify**:
- `src/pages/crew/CrewJobDetail.tsx` — Add camera button and photo gallery

**Implementation details**:

1. Import photo functions:
   ```typescript
   import { ..., uploadCrewPhoto, fetchCrewPhotos, getPhotoUrl } from '@/services/supabaseData';
   import type { CrewPhoto } from '@/services/supabaseData';
   ```

2. Add state:
   ```typescript
   const [photos, setPhotos] = useState<Array<CrewPhoto & { url: string }>>([]);
   const [uploading, setUploading] = useState(false);
   ```

3. Fetch photos on mount:
   ```typescript
   useEffect(() => {
     if (!entry) return;
     fetchCrewPhotos(entry.id).then(async (list) => {
       const withUrls = await Promise.all(
         list.map(async (p) => ({ ...p, url: await getPhotoUrl(p.storagePath) }))
       );
       setPhotos(withUrls);
     });
   }, [entry?.id]);
   ```

4. Add a camera button in a floating action area, above the status buttons:
   - Position: Fixed, bottom `68px` (above the status buttons bar), right `16px`
   - Style: `w-[52px] h-[52px]` circle, background `var(--green)`, color white, shadow
   - Icon: camera emoji 📷 or SVG, `text-[22px]`
   - On tap: open a hidden `<input type="file" accept="image/*" capture="environment">` (opens phone camera)

5. Handle file selection:
   ```typescript
   async function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
     const file = e.target.files?.[0];
     if (!file || !orgId || !crewMemberId || !entry) return;
     setUploading(true);
     const photo = await uploadCrewPhoto(orgId, entry.id, crewMemberId, file);
     if (photo) {
       const url = await getPhotoUrl(photo.storagePath);
       setPhotos(prev => [...prev, { ...photo, url }]);
     }
     setUploading(false);
     e.target.value = ''; // reset input
   }
   ```

6. Photo gallery section — show ABOVE the zone sections, after progress bar. Only render if photos.length > 0 or uploading:
   - Section header: "Photos" — `text-[11px] font-[700] uppercase text-[var(--text-4)]`
   - Grid: `grid grid-cols-3 gap-[8px]`
   - Each photo: `aspect-square rounded-[8px] overflow-hidden` with `<img>` filling the cell via `object-fit: cover`
   - Below the grid: photo count — `text-[11px] text-[var(--text-4)]` — "3 photos"
   - While uploading: show a placeholder cell with a spinner/pulse animation

**Supabase considerations**:
- `capture="environment"` opens the rear camera on mobile
- Files go to `crew-photos` Storage bucket
- Signed URLs expire after 1 hour — fine for a single session

**Acceptance criteria**:
- [ ] Camera button visible on job detail page
- [ ] Tapping opens camera / file picker on mobile
- [ ] Photo uploads to Supabase Storage
- [ ] Photo appears in the gallery after upload
- [ ] Photos persist across page refreshes
- [ ] `npm run build` passes

---

## S18-5: Show crew status on manager schedule page

**Problem/Goal**: Managers should see real-time crew status next to crew names on the schedule grid. When a crew member updates their status (en route, on site, done), the manager sees it.

**Files to modify**:
- `src/pages/Schedule.tsx` — Add status dots next to crew names
- `src/services/supabaseData.ts` — Add `fetchAllCrewStatuses` function

**Implementation details**:

**New function in supabaseData.ts**:
```typescript
export async function fetchAllCrewStatuses(
  orgId: string,
): Promise<Array<{ crewMemberId: string; status: string }>> {
  try {
    const { data, error } = await supabase
      .from('crew_status')
      .select('crew_member_id, status')
      .eq('org_id', orgId);
    if (error) throw error;
    return (data || []).map(row => ({
      crewMemberId: row.crew_member_id,
      status: row.status,
    }));
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_status', err);
    return [];
  }
}
```

**In Schedule.tsx**:

1. Import `fetchAllCrewStatuses` and add state:
   ```typescript
   import { fetchAllCrewStatuses } from '@/services/supabaseData';

   const [crewStatuses, setCrewStatuses] = useState<Record<string, string>>({});
   ```

2. Fetch statuses on mount and periodically (every 30 seconds):
   ```typescript
   useEffect(() => {
     if (!orgId) return;
     const load = () => {
       fetchAllCrewStatuses(orgId).then((list) => {
         const map: Record<string, string> = {};
         for (const { crewMemberId, status } of list) map[crewMemberId] = status;
         setCrewStatuses(map);
       });
     };
     load();
     const interval = setInterval(load, 30000);
     return () => clearInterval(interval);
   }, [orgId]);
   ```

3. Add a status dot next to each crew member's name in the grid. In the crew name cell (the `<td>` that renders `member.name`), add a dot after the avatar circle:

   Status dot colors:
   - `off_duty` — no dot (or `var(--text-4)` with 30% opacity)
   - `en_route` — `#60A5FA` (blue)
   - `on_site` — `var(--green-l)` (green)
   - `on_break` — `#FCD34D` (amber)
   - `done` — `#A78BFA` (purple)

   Dot style: `width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;`

   Place the dot between the avatar initial circle and the name text. Add a `title` attribute with the status text for hover tooltip.

**Supabase considerations**:
- `crew_status` table, org_id filtered
- 30-second polling is simple and sufficient for MVP. Real-time subscriptions can be added later.

**Acceptance criteria**:
- [ ] Crew status dots appear next to crew names on the schedule grid
- [ ] Colors match the status (blue=en route, green=on site, etc.)
- [ ] Dots update every 30 seconds without page refresh
- [ ] No dot shown for crew with no status (off duty)
- [ ] `npm run build` passes

---

## S18-6: Show checklist progress on manager schedule page

**Problem/Goal**: Managers want to glance at the schedule and see how far along each job is. Add a small progress indicator on schedule entry chips.

**Files to modify**:
- `src/pages/Schedule.tsx` — Add progress to entry chips
- `src/services/supabaseData.ts` — Add `fetchChecklistProgressBatch` function

**Implementation details**:

**New function in supabaseData.ts** (batch fetch for all entries visible in the current week):
```typescript
export async function fetchChecklistProgressCounts(
  scheduleEntryIds: string[],
): Promise<Record<string, number>> {
  if (scheduleEntryIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('crew_checklist_progress')
      .select('schedule_entry_id')
      .in('schedule_entry_id', scheduleEntryIds);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.schedule_entry_id] = (counts[row.schedule_entry_id] || 0) + 1;
    }
    return counts;
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_checklist_progress', err);
    return {};
  }
}
```

**In Schedule.tsx**:

1. Import `fetchChecklistProgressCounts` and `useProjectStore` materials:
   ```typescript
   import { fetchChecklistProgressCounts } from '@/services/supabaseData';
   import { generateSteps } from '@/lib/workorders';
   import { useMaterialStore } from '@/stores/materialStore';
   ```

2. Add state and fetch when entries change:
   ```typescript
   const [progressCounts, setProgressCounts] = useState<Record<string, number>>({});
   const { materials } = useMaterialStore();

   useEffect(() => {
     const ids = entries.map(e => e.id);
     if (ids.length === 0) return;
     fetchChecklistProgressCounts(ids).then(setProgressCounts);
   }, [entries]);
   ```

3. For each schedule entry chip in the grid, compute total steps for the project and show a mini progress indicator. After the project name on the chip, add:

   ```tsx
   // Compute total steps for this project
   const entryProject = projects.find(p => p.id === entry.projectId);
   const totalSteps = entryProject
     ? entryProject.zones.reduce((sum, z) => sum + generateSteps(z, materials).length, 0)
     : 0;
   const doneSteps = progressCounts[entry.id] || 0;
   ```

   Display as a small text below the project name on the chip:
   - If `totalSteps > 0 && doneSteps > 0`: show `{doneSteps}/{totalSteps}` in `text-[9px] font-mono` with color based on completion:
     - All done: `var(--green-l)`
     - Partial: `var(--text-3)`
   - If no progress yet: don't show anything (keep the chip clean)

   Keep this minimal — just the fraction text, no progress bar (too small for the chip).

**Supabase considerations**:
- Batch fetch using `.in()` operator — one query for all visible entries
- Re-fetch when entries change (week navigation)

**Acceptance criteria**:
- [ ] Schedule chips show step progress counts when crew has made progress
- [ ] Progress counts update when navigating weeks
- [ ] No visual clutter when no progress exists
- [ ] `npm run build` passes

---

## Execution Order

1. **S18-1** — Checklist progress CRUD (needed by S18-2)
2. **S18-2** — Wire persistence into CrewJobDetail (depends on S18-1)
3. **S18-3** — Photo upload CRUD (needed by S18-4)
4. **S18-4** — Photo capture UI in CrewJobDetail (depends on S18-3)
5. **S18-5** — Crew status on manager schedule (standalone)
6. **S18-6** — Checklist progress on manager schedule (depends on S18-1)

---

## SQL Migrations Required

**File**: `supabase/migrations/008_checklist_progress_photos.sql`

Charlie must run this in Supabase SQL Editor BEFORE testing. It creates:
- `crew_checklist_progress` table (step completions with unique constraint)
- `crew_photos` table (photo metadata)
- RLS policies for both tables

**Manual step**: Create a Supabase Storage bucket named `crew-photos` (private) in the Supabase Dashboard → Storage → New bucket.

---

## Post-Sprint Test Plan

### Pre-Test Setup
1. Run migration 008 in Supabase SQL Editor
2. Create Storage bucket `crew-photos` in Supabase Dashboard (Storage → New bucket, name: `crew-photos`, public: OFF)
3. Merge sprint branch, `npm run build`, `npm run dev`
4. Open `http://localhost:3000` in incognito

### Crew App Tests
1. Go to `/crew` → select crew member → tap a job card
2. Tap steps to complete → refresh page → steps are still completed
3. Un-tap a step → refresh → step is unchecked
4. Tap camera button → select/take a photo → photo appears in gallery
5. Refresh page → photos persist
6. Complete several steps, take a photo, tap "On Site" → all persist

### Manager Schedule Tests
7. Open `/schedule` → crew name rows show status dots next to names
8. In crew app: tap "En Route" → wait 30 seconds → manager schedule shows blue dot
9. In crew app: tap "On Site" → wait 30 seconds → dot turns green
10. Schedule chips show step progress (e.g., "3/12") when crew has completed steps

### Regression Checks
11. Dashboard loads, all widgets render
12. Projects page works — create, edit, zones
13. Material Library — add material works
14. Equipment Manager — add equipment works
15. Work Orders — loads with active project
16. Crew Manager (at `/crew-manager`) — add/edit/delete works

### Edge Cases
17. Upload a large photo (5MB+) → should succeed (Supabase default limit is 50MB)
18. Crew app with no schedule entries → empty state still works
19. Manager schedule with no crew statuses → no dots shown (clean grid)
