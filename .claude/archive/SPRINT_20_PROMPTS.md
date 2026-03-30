# Sprint 20 — Demo Readiness & Manager-Crew Integration

> **Goal**: Close the last gaps for an M1 demo. Manager can view crew photos, active project indicator works in sidebar, Settings page gets a proper header and org name display, and the crew app gets a "switch member" improvement. This is the final sprint before M1 gate evaluation.
>
> **Branch**: `sprint-20-demo-ready`
> **Design reference**: `.claude/DESIGN_SYSTEM.md`
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-20-demo-ready --title "Sprint 20: Demo Readiness & Manager-Crew Integration" --body "Manager photo gallery on schedule, active project sidebar indicator, Settings page polish, crew app improvements. Final M1 sprint."`

---

## CRITICAL CONTEXT

> Read these files before starting:
> 1. `CLAUDE.md` (project root)
> 2. `.claude/CODE_GUIDE.md`
> 3. This file
>
> Key context:
> - Schedule page (`src/pages/Schedule.tsx`) already shows crew status dots and checklist progress counts
> - `fetchCrewPhotos(scheduleEntryId)` and `getPhotoUrl(storagePath)` already exist in `supabaseData.ts`
> - Active project is tracked in `useProjectStore().activeProjectId`
> - Sidebar shows a green dot on Projects/Work Orders when `activeProjectId` is set, but the active project pill at the bottom doesn't update reliably
> - Settings page has profile, appearance, notifications, integrations, team, billing sections
> - Debug page is already gated behind `import.meta.env.DEV` — no production exposure

---

## S20-1: Manager photo gallery on schedule entry detail

**Problem/Goal**: Crew members upload photos during jobs, but managers have no way to see them. Add a photo indicator on schedule chips and a photo modal when clicking an entry.

**Files to modify**:
- `src/pages/Schedule.tsx` — Add photo count badge to entry chips, add photo gallery modal

**Implementation details**:

1. Import photo functions:
   ```typescript
   import { fetchAllCrewStatuses, fetchChecklistProgressCounts, fetchCrewPhotos, getPhotoUrl } from '@/services/supabaseData';
   import type { CrewPhoto } from '@/services/supabaseData';
   ```

2. Add state for photo gallery:
   ```typescript
   const [photoGallery, setPhotoGallery] = useState<{ entryId: string; photos: Array<CrewPhoto & { url: string }> } | null>(null);
   ```

3. Fetch photo counts alongside checklist progress. Add a new state:
   ```typescript
   const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
   ```

   In the existing `useEffect` that fetches progress counts, also fetch photo counts:
   ```typescript
   useEffect(() => {
     const ids = entries.map(e => e.id);
     if (ids.length === 0) return;
     fetchChecklistProgressCounts(ids).then(setProgressCounts);
     // Fetch photo counts
     Promise.all(ids.map(async (id) => {
       const photos = await fetchCrewPhotos(id);
       return { id, count: photos.length };
     })).then((results) => {
       const counts: Record<string, number> = {};
       for (const { id, count } of results) {
         if (count > 0) counts[id] = count;
       }
       setPhotoCounts(counts);
     });
   }, [entries]);
   ```

4. On the entry chip (where project name is shown), add a camera icon with count if photos exist:
   After the progress count span, add:
   ```tsx
   {photoCounts[entry.id] > 0 && (
     <span
       onClick={(e) => { e.stopPropagation(); handleViewPhotos(entry.id); }}
       title={`${photoCounts[entry.id]} photo(s)`}
       style={{ fontSize: '9px', cursor: 'pointer', marginLeft: '2px' }}
     >
       📷{photoCounts[entry.id]}
     </span>
   )}
   ```

5. Add the photo viewer function:
   ```typescript
   async function handleViewPhotos(entryId: string) {
     const photos = await fetchCrewPhotos(entryId);
     const withUrls = await Promise.all(
       photos.map(async (p) => ({ ...p, url: await getPhotoUrl(p.storagePath) }))
     );
     setPhotoGallery({ entryId, photos: withUrls });
   }
   ```

6. Add a simple photo gallery modal at the bottom of the component (before the closing `</div>`):
   ```tsx
   {photoGallery && (
     <div
       style={{
         position: 'fixed', inset: 0, zIndex: 50,
         background: 'rgba(0,0,0,0.7)',
         display: 'flex', alignItems: 'center', justifyContent: 'center',
       }}
       onClick={() => setPhotoGallery(null)}
     >
       <div
         style={{
           background: 'var(--surface-card)', borderRadius: '12px',
           padding: '20px', maxWidth: '640px', width: '90vw', maxHeight: '80vh',
           overflow: 'auto',
         }}
         onClick={(e) => e.stopPropagation()}
       >
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
           <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
             Job Photos ({photoGallery.photos.length})
           </div>
           <button
             onClick={() => setPhotoGallery(null)}
             style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer', padding: '4px' }}
           >
             ✕
           </button>
         </div>
         {photoGallery.photos.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: '13px' }}>
             No photos uploaded yet.
           </div>
         ) : (
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
             {photoGallery.photos.map(p => (
               <div key={p.id} style={{ aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-hover)' }}>
                 <img src={p.url} alt={p.caption || 'Job photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               </div>
             ))}
           </div>
         )}
         {photoGallery.photos.length > 0 && (
           <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-3)' }}>
             Uploaded by crew during job execution
           </div>
         )}
       </div>
     </div>
   )}
   ```

**Supabase considerations**: Uses existing `fetchCrewPhotos` and `getPhotoUrl` functions.

**Acceptance criteria**:
- [ ] Schedule chips show camera icon + count when photos exist
- [ ] Clicking the camera icon opens a photo gallery modal
- [ ] Photos display in a grid with signed URLs
- [ ] Modal closes on backdrop click or X button
- [ ] `npm run build` passes

---

## S20-2: Fix active project indicator in sidebar

**Problem/Goal**: The sidebar shows a green dot next to Projects and Work Orders when an active project is selected, but the active project pill at the bottom doesn't always reflect the correct project. Also, the dot should appear on more relevant pages (Schedule, Manifest, Equipment).

**Files to modify**:
- `src/components/layout/Sidebar.tsx`

**Implementation details**:

1. Extend the green dot indicator to appear on more nav items when an active project is set. Currently it only shows on `/projects` and `/work-orders`. Add it to `/manifest`, `/schedule`, and `/equipment` as well:

   Change:
   ```tsx
   {!collapsed && (item.path === '/projects' || item.path === '/work-orders') && activeProjectId && (
   ```
   To:
   ```tsx
   {!collapsed && ['/projects', '/work-orders', '/manifest', '/schedule', '/equipment'].includes(item.path) && activeProjectId && (
   ```

2. In the Active Project Pill section at the bottom of the sidebar, ensure it updates reactively. Currently it reads from `activeProject` which is derived from `projects.find(...)`. This should already work. Verify the pill shows the correct project name.

   If there's no issue with the pill itself, just extending the dots is sufficient.

**Supabase considerations**: None — frontend-only.

**Acceptance criteria**:
- [ ] Green dot appears on Projects, Work Orders, Manifest, Schedule, and Equipment nav items when a project is selected
- [ ] Active Project Pill at bottom of sidebar shows the correct project name
- [ ] `npm run build` passes

---

## S20-3: Settings page polish

**Problem/Goal**: Settings page needs a PageHeader and the company name field should show the org name from Supabase.

**Files to modify**:
- `src/pages/Settings.tsx`

**Implementation details**:

1. Import PageHeader:
   ```typescript
   import { PageHeader } from '@/components/layout/PageHeader';
   ```

2. Add PageHeader at the top of the component's return JSX (before the settings nav/content layout):
   ```tsx
   <PageHeader title="Settings" subtitle="Manage your account, appearance, and team preferences." />
   ```

3. In the Profile section, the org name input should show the actual org name. The component already has:
   ```tsx
   const [orgName, setOrgName] = useState(org?.name ?? '')
   ```
   But if `org` loads asynchronously, the initial state may be empty. Add a `useEffect` to sync:
   ```tsx
   useEffect(() => {
     if (org?.name && !orgName) setOrgName(org.name);
   }, [org?.name]);
   ```

**Supabase considerations**: None — reads from existing org store.

**Acceptance criteria**:
- [ ] Settings page has a consistent PageHeader
- [ ] Company name field shows the org name from Supabase
- [ ] Saving org name still works
- [ ] `npm run build` passes

---

## S20-4: Crew app — show project address on dashboard cards with map link

**Problem/Goal**: When a crew member sees their job card, the address should be tappable to open in Google Maps for navigation. This is a key field-use feature.

**Files to modify**:
- `src/pages/crew/CrewDashboard.tsx`

**Implementation details**:

In the job card, make the address a tappable link that opens Google Maps:

Replace the address line:
```tsx
<div className="text-[12px] truncate mt-[2px]" style={{ color: 'var(--text-3)' }}>
  {project?.address || ''}
</div>
```

With:
```tsx
{project?.address && (
  <a
    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="text-[12px] truncate mt-[2px] underline underline-offset-2"
    style={{ color: 'var(--brand-primary)', display: 'block' }}
  >
    {project.address}
  </a>
)}
```

The `e.stopPropagation()` prevents the card's onClick (navigate to job detail) from firing when tapping the address.

Also add the same map link to CrewJobDetail's project header card.

**Files to also modify**:
- `src/pages/crew/CrewJobDetail.tsx` — Make address tappable in the project header card

**Supabase considerations**: None — frontend-only.

**Acceptance criteria**:
- [ ] Address on crew dashboard job cards is a tappable link (underlined, green)
- [ ] Tapping opens Google Maps in a new tab with the address
- [ ] Tapping address does NOT navigate to job detail (stopPropagation)
- [ ] Same map link on job detail page header
- [ ] `npm run build` passes

---

## S20-5: Crew app — remember scroll position and add pull-to-refresh hint

**Problem/Goal**: Small UX improvements for field use. When crew navigates back from a job, the dashboard should feel snappy. Add a visible "last updated" timestamp so crew knows their schedule is fresh.

**Files to modify**:
- `src/pages/crew/CrewDashboard.tsx`

**Implementation details**:

1. Add a "Last updated" timestamp below the job cards:
   ```typescript
   const [lastFetched, setLastFetched] = useState<Date | null>(null);
   ```

   In the fetch effect, after entries load:
   ```typescript
   setLastFetched(new Date());
   ```

   At the bottom of the schedule view (after the job cards, before the "switch member" button), show:
   ```tsx
   {lastFetched && (
     <div className="text-[11px] mt-[16px]" style={{ color: 'var(--text-4)' }}>
       Updated {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
     </div>
   )}
   ```

2. Add a manual refresh button next to the date header:
   ```tsx
   <button
     onClick={() => { /* re-trigger fetch */ }}
     className="text-[12px] bg-transparent border-none cursor-pointer min-h-[44px] px-[8px]"
     style={{ color: 'var(--text-3)' }}
     title="Refresh schedule"
   >
     ↻
   </button>
   ```

   To support manual refresh, extract the fetch logic into a `loadSchedule` function that can be called from both the useEffect and the button.

**Acceptance criteria**:
- [ ] "Updated HH:MM" shows below job cards
- [ ] Refresh button next to date triggers a re-fetch
- [ ] Timestamp updates after refresh
- [ ] `npm run build` passes

---

## S20-6: Work Orders — auto-select active project

**Problem/Goal**: Work Orders page shows a project selector even when an active project is selected in the sidebar. It should auto-select the active project.

**Files to modify**:
- `src/pages/WorkOrders.tsx`

**Implementation details**:

The Work Orders page already reads `activeProjectId` from the project store and uses it to find the project. The issue from CONSIDERATIONS.md says "Work Orders page doesn't update when a different active project is selected."

Check the current behavior — the `project` memo already depends on `activeProjectId`:
```tsx
const project = useMemo(
  () => projects.find(p => p.id === activeProjectId) ?? null,
  [projects, activeProjectId]
);
```

This should already work. The reported issue may have been fixed by Sprint 16.5 (data loading race). If so, just verify and mark it resolved.

If there IS still an issue: the project selector dropdown in the active-project view should reflect the current `activeProjectId` and changing it should update the store:
```tsx
value={activeProjectId ?? ''}
onChange={e => setActiveProject(e.target.value || null)}
```

This is already in the code. Mark as resolved in CONSIDERATIONS.md.

**Acceptance criteria**:
- [ ] Opening Work Orders with an active project shows that project's work orders immediately
- [ ] Changing the project in the dropdown updates the view
- [ ] `npm run build` passes

---

## Execution Order

1. **S20-1** — Manager photo gallery (biggest demo impact)
2. **S20-2** — Active project sidebar indicator (quick fix)
3. **S20-3** — Settings page polish (quick)
4. **S20-4** — Crew app map links (field UX)
5. **S20-5** — Crew app refresh + timestamp (field UX)
6. **S20-6** — Work Orders auto-select (verify + mark resolved)

---

## SQL Migrations Required

None.

---

## Post-Sprint Test Plan

### Manager App
1. Open `/schedule` → create a schedule entry for today, assign a crew member
2. Open `/crew` in a new tab → select that crew member → tap the job → take a photo → complete some steps
3. Back on manager `/schedule` → refresh → entry chip should show camera icon with photo count
4. Click the camera icon → photo gallery modal opens with the uploaded photos
5. Select a project in the sidebar → green dot appears on Projects, Work Orders, Manifest, Schedule, Equipment
6. Check Active Project Pill in sidebar shows correct name
7. Open `/settings` → PageHeader visible, company name field shows org name
8. Open Work Orders with active project → work orders show immediately

### Crew App
9. `/crew` → select member → job card shows tappable green address
10. Tap address → opens Google Maps in new tab
11. Tap job card → job detail → address also tappable
12. Back to `/crew` → "Updated HH:MM" visible, refresh button works
13. Status buttons, checklist, photos all still work

### Regression
14. Dashboard, Projects, Materials, Crew Manager, Equipment, Billing all work
15. Schedule drag-and-drop still works
16. Crew app checklist persistence still works
