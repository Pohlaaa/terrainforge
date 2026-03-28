# TerrainForge — Phase 2: Operations & Integrations

## Phase 2 Overview
Phase 2 transforms TerrainForge from a planning/estimation tool into a full operational platform. The goal is to make TerrainForge the app a contractor uses *every single day*, not just when estimating a project. Daily use = high retention = word-of-mouth growth.

**Phase 2 starts when:** Phase 1 gate is met ($5K MRR, Stripe live, pilot user confirmed).
**Phase 2 ends when:** $15K MRR and at least 3 of the 5 modules below are live.

---

## Phase 2 Modules (Priority Order)

### Module 1: Scheduling & Calendar
**Why first:** Contractors plan their week constantly — this is the highest-frequency use case.

**Features:**
- Project calendar view (week/month) showing which crew is assigned to which project each day
- Drag-and-drop scheduling (assign a crew to a project day)
- Conflict detection (crew member double-booked, equipment unavailable)
- "Today's schedule" view for foremen — what am I doing, where, with who
- Push notification when schedule changes (future — Phase 2b)

**Data model additions:**
```sql
-- schedule_entries table
id, org_id, project_id, crew_member_id, equipment_id, start_date, end_date, notes
```

**Integration points:** Pulls from existing `projects`, `crew_members`, `equipment` tables.

---

### Module 2: Time Tracking
**Why second:** Directly tied to payroll — once a contractor is tracking time in the app, switching cost is very high (strong retention).

**Features:**
- Foreman clock-in/clock-out per project zone
- Manual time entry (for back-fill or correction)
- Time summary per project: total hours worked vs. estimated
- Labor cost tracking: hours × hourly rate → actual labor cost per project
- Export time records as CSV for payroll processing

**Data model additions:**
```sql
-- time_entries table
id, org_id, project_id, zone_id, crew_member_id, clock_in, clock_out, notes, approved_by
```

**New crew_members field:** `hourly_rate` (needed for labor cost calculations).

---

### Module 3: Client Portal
**Why third:** Enables contractors to use TerrainForge as a client-facing tool, not just internal. Clients can log in, view project status, approve manifests, and sign off on completed work.

**Features:**
- Invite a client to view a specific project (email invite → limited-access login)
- Client sees: project timeline, manifest summary (no internal costs), photo uploads
- Client can approve a manifest/proposal (triggers status change in the system)
- Contractor can send a PDF summary directly from the client portal
- Role: `client` (already in the schema — read-only, project-scoped)

**UX note:** Client portal should feel like a simple status page, not the full TerrainForge app. Use a separate layout without the sidebar.

**Integration points:** Uses existing `org_role = 'client'` in auth + RLS. Route: `/portal/:projectId`.

---

### Module 4: Invoicing & QuickBooks Integration
**Why fourth:** Once time is tracked and projects complete, billing becomes natural. QuickBooks is the most common accounting tool for small contractors.

**Features:**
- Generate an invoice from a completed project (materials + labor cost summary)
- Send invoice via email directly from TerrainForge (PDF attachment)
- Mark invoices as paid/outstanding
- QuickBooks Online OAuth integration — push invoice line items to QBO automatically
- Invoice status dashboard: draft, sent, paid, overdue

**Data model additions:**
```sql
-- invoices table
id, org_id, project_id, status (draft/sent/paid/overdue), total_amount, sent_at, paid_at
-- invoice_line_items table
id, invoice_id, description, quantity, unit_price, total
```

**Third-party:** QuickBooks Online API (OAuth 2.0). Register app at developer.intuit.com. Scope: `com.intuit.quickbooks.accounting`.

**Stripe note:** Keep Stripe for subscription billing. QuickBooks is for *client invoicing*, not TerrainForge's own revenue.

---

### Module 5: Mobile Field Access
**Why fifth:** Foremen are on job sites — they need the app to work on a phone without a laptop. This doesn't require a native app; a Progressive Web App (PWA) is sufficient.

**Features:**
- PWA manifest + service worker so the app can be added to homescreen
- Mobile-optimized layouts for: Today's schedule, Work Order steps (checkbox), Time clock-in/out
- Offline support for time entries (sync when back on WiFi)
- Photo upload from camera (attach to project/zone for client portal)

**Implementation approach:**
- Add `manifest.json` and service worker to the Vite build
- Use the existing `vite-plugin-pwa` package (don't reinvent)
- Mobile layouts: keep the sidebar hidden on `<768px`, show bottom navigation instead
- No separate native app — PWA gets 80% of the value at 10% of the effort

---

## Phase 2 Database Migration Strategy
Each module requires a new migration file:
```
supabase/migrations/002_scheduling.sql
supabase/migrations/003_time_tracking.sql
supabase/migrations/004_client_portal.sql
supabase/migrations/005_invoicing.sql
supabase/migrations/006_pwa_metadata.sql
```

Always add `org_id` and RLS policies to every new table. Pattern is established in `001_initial_schema.sql`.

---

## Phase 2 AI Integration Points
Phase 2 unlocks new AI use cases — add these to `AI_PRODUCT.md` when building:

1. **Schedule optimizer:** Given crew availability and project deadlines, Claude suggests an optimal weekly schedule. Input: projects, crew members, equipment.
2. **Invoice generator:** Claude drafts invoice line items from project data (zones, materials, labor hours). User reviews and approves before sending.
3. **Client communication drafts:** Claude writes a project status update in contractor-friendly language to send to the client portal.

---

## Phase 2 New Pages (to add to routing)
| Route | Component | Module |
|---|---|---|
| `/schedule` | `src/pages/Schedule.tsx` | Module 1 |
| `/time-tracking` | `src/pages/TimeTracking.tsx` | Module 2 |
| `/portal/:projectId` | `src/pages/ClientPortal.tsx` | Module 3 |
| `/invoices` | `src/pages/Invoices.tsx` | Module 4 |

Add these routes to `src/App.tsx` and sidebar navigation when building.

---

## Phase 2 What NOT to Build (yet)
- Native iOS/Android app — PWA is sufficient until $30K MRR
- Full accounting software — QuickBooks integration is enough; don't rebuild QBO
- Real-time GPS tracking — too complex, too expensive, out of scope for Phase 2
- Subcontractor portal — that's Phase 4
- Multi-location org support — that's Phase 4
- Automated email campaigns — use Mailchimp manually until Phase 3
