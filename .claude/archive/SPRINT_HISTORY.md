# TerrainForge — Sprint History Archive

> All sprint prompts (1-13.5) consolidated into one reference document.
> Individual sprint files moved to `.claude/archive/sprints/`.
> Last updated: 2026-03-29

---

## Sprint 1 — Foundation & Store Wiring (11 tasks)
Wire all 8 pages (Projects, Materials, Manifest, Work Orders, Crew, Equipment, Dashboard, Billing) to Zustand stores. Establish Materials library with category search and CRUD. Connect Manifest Engine to generate material lists with costs per zone. Add error boundaries and loading states.

**Pattern established**: Store action → optimistic update → supabaseData service call → DB persist
**Lesson**: Supabase write functions were never called from UI — sync must be explicit

## Sprint 2 — PDF Export & E2E Stability (6 tasks)
Install @react-pdf/renderer. Build manifest PDF and crew packet PDF templates. Wire export buttons. Run full E2E smoke test: signup → project → manifest → PDF export → crew packet.

**Pattern**: Contractor workflow verified: create → manifest → export
**Lesson**: Test with real contractor workflows early — abstract tests miss real gaps

## Sprint 3 — Stripe Billing & Claude API (6 tasks)
Stripe JS integration with checkout and subscription management. Build Billing page with tier selection. Stripe webhooks via Supabase Edge Function. Claude API (Haiku) for Price Research page. Trial banner and billing gate.

**Pattern**: Edge Function handles webhooks → updates org subscription → frontend reflects
**Lesson**: AI for specific tasks (price lookup) is low-cost (~$0.001/call with Haiku)

## Sprint 4 — Workflow Closure & Polish (6 tasks)
Zone CRUD UI on Projects page. Replace map placeholder with Active Projects widget. Remove unused deps (Leaflet). Clear Demo Data button. First-login empty states. Manual self-test.

**Pattern**: Zone creation was the critical blocker — without it, manifest generates nothing
**Lesson**: Empty states and seeded data guidance critical for new user first impression

## Sprint 5 — Stability & Pilot Prep (5 tasks)
Fix cross-account data leak (reset stores on signOut). Fix Supabase write layer (inject org_id). Fix demo data detection (isDemo flag). Verify zone UI. Deploy to Netlify staging.

**Pattern**: In-memory state must reset on account switch; fetch on login
**Lesson**: Silent write failures since Sprint 1 — root cause was missing org_id on inserts

## Sprint 6 — Persistence Fix & UX Polish (5 tasks)
Fix delete+create regression (confirm-first, not optimistic). Fix dark theme text readability. Add project editing. Enable email confirmation. Full smoke test.

**Pattern**: Confirm-first delete + refetch after mutation = state consistency
**Lesson**: Optimistic UI needs rollback; refetch is safety net

## Sprint 7 — UI/UX Overhaul (6 tasks)
Light theme migration. Responsive tablet-first layout. Streamlined interactions (tap anywhere). AI smart project creation (natural language → form pre-fill). Materials and crew tabs on project detail.

**Pattern**: Tap anywhere on card to open; edit inline; no multi-step modals
**Lesson**: Contractors work on tablets outdoors — responsive layout essential

## Sprint 8 — Settings & Navigation (5 tasks)
Settings page (account + app sections). Project selector drawer on Work Orders and Manifest. Enhanced dashboard widgets. Billing refetch on mount.

**Pattern**: Minimize navigation friction; quick-switch project context
**Lesson**: In-context project switching reduces bounce between pages

## Sprint 9 — Design System & Onboarding (6 tasks)
CSS custom properties v2 design token system. 4-step onboarding wizard. User preferences table and service. Redesigned Settings with sectioned navigation.

**Pattern**: Design tokens centralized; theme toggle persists via preferences
**Lesson**: Onboarding captures business context for dashboard defaults

## Sprint 10 — Dashboard Power Features (5 tasks)
KPI customization drawer (pick 6 from 12 metrics). Drag-and-drop widget grid. Widget lifecycle animations. Skeleton loading. Mapbox placeholder.

**Pattern**: Customization persists to Supabase + localStorage; respect prefers-reduced-motion
**Lesson**: 600ms minimum skeleton display ensures shimmer is visible

## Sprint 10.5 — Dashboard UX Hotfix (5 tasks)
Fix widget entrance animation. Fix skeleton timing. Make full card draggable. KPI drag-to-reorder. Toast notification wiring.

**Lesson**: Skeletons are UX, not just loading; provide feedback on all actions

## Sprint 11 — Ship It / MVP Gate (6 tasks)
Fix new user onboarding routing. Audit + propagate animations to all pages. Remove dead code. Full E2E verification. Git/directory cleanup. Documentation update.

**Pattern**: Consistent micro-interactions across all pages; zero orphaned code
**Lesson**: Polish is not optional — animation system must work everywhere before shipping

## Sprint 12 — Visual Polish, Navigation & Map (6 tasks)
Mapbox address autocomplete with geocoding. KPI tap navigation + sparklines. Widget "View All" + item tap-through. Fully activated Mapbox map widget. Greeting header. Empty state uplift with SVGs.

**Pattern**: Every element tappable; map pins color-coded by status
**Lesson**: Mapbox CSS import essential — without it, markers are 0x0px invisible

## Sprint 12.5 — Consolidated Bug Fixes (4 tasks)
Mapbox GL CSS import. Zone persistence (createZone never called). AI material interaction. Manual zone persistence (CHECK constraints).

**Lesson**: CHECK constraints fail silently; send NULL for empty values, not 0

## Sprint 13 — Full-Stack Persistence & Display Fixes (5 tasks)
Mapbox CSS import (re-attempt). Zone CHECK constraint fix (NULL not 0). Error visibility (toast on Supabase failures). Project materials JSONB column. RLS role diagnostic.

**Pattern**: Silent failures fixed with error callbacks and toast notifications
**Lesson**: Every Supabase operation must surface errors; RLS role hierarchy enforced at DB level

## Sprint 13.5 — Pin Hover & Material Persistence Hotfix (2 tasks)
Fix pin hover jump (replace CSS transform with width/height). Fix material persistence (return project ID from addProject instead of lookup by name).

**Lesson**: CSS transform conflicts with Mapbox positioning; return IDs for immediate use

---

## Key Lessons Across All Sprints

1. **Silent failures are the #1 enemy** — RLS violations, CHECK constraints, and missing org_id all fail silently. Every operation needs error visibility. (S5, S13)
2. **Full-stack testing** — Form → Store → Service → DB → back. Test the complete chain, not just the UI. (S12.5, S13)
3. **Responsive tablet-first** — Contractors work outdoors on tablets. Every touch target 44px+. (S7)
4. **Micro-interactions matter** — Skeleton + animation combo creates perceived polish. 600ms minimum. (S10, S11)
5. **Inline navigation** — Quick-switch context (project selector) > page-to-page navigation. (S8)
6. **Design tokens** — Centralized CSS custom properties make theme changes trivial. (S9)
7. **One-shot sprint execution** — Sprint prompts with explicit file paths, component names, and acceptance criteria enable zero-follow-up Code runs. (All sprints)
