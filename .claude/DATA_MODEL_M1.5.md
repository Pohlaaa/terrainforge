# TerrainForge — M1.5 Data Model

> **Purpose**: Upfront schema design for the Project Intelligence milestone (M1.5a creation wizard + M1.5b project dashboard). Design now, build incrementally across sprints 28-34.
> **Created**: 2026-03-30
> **Owner**: Charlie (BSA II)
> **Status**: IMPLEMENTED — Migrations 010 + 011 applied. All tables and columns live in Supabase. TypeScript interfaces and CRUD functions in codebase.

---

## Design Principles

1. **Design upfront, build incrementally** — All tables and columns defined here. Migration splits across sprints as features are built.
2. **Follow existing patterns exactly** — `org_id` on every table, TEXT + CHECK (never ENUM), `gen_random_uuid()` PKs, `created_at`/`updated_at`, RLS with org membership checks.
3. **Extend before creating** — Add columns to `projects` table rather than creating separate tables when the data is 1:1 with a project.
4. **Nullable by default for wizard fields** — A contractor may skip steps or save partway through. Only `org_id`, `project_id`, and `id` are NOT NULL on new child tables.
5. **AI columns are suggestions, not constraints** — AI-generated values (inferred climate zone, suggested crew size) are stored but never enforced. The contractor edits freely.

---

## Current Schema (Pre-M1.5)

Tables that M1.5 touches:

| Table | Current Purpose | M1.5 Changes |
|-------|----------------|--------------|
| `projects` | Name, client_id, address, area, dates, budget, checklist, notes | Add ~20 columns (client inline, budget breakdown, project type, scope, compliance) |
| `zones` | Project subdivisions with area/perimeter/materials/equipment | No schema changes — zones become the basis for AI-generated task grouping |
| `clients` | Standalone client records linked by FK | Keep as-is. Wizard writes client fields inline on `projects` AND optionally creates/links a `clients` row |

---

## Extended Table: `projects`

New columns added to the existing `projects` table. Grouped by wizard step for clarity.

### Step 1: Job Description (identity)

```sql
-- Client info (inline on project — avoids requiring client record for wizard flow)
client_name         TEXT,
client_phone        TEXT,
client_email        TEXT,
property_type       TEXT CHECK (property_type IN (
                      'residential', 'commercial', 'hoa', 'municipal', 'multi_family', 'other'
                    )),

-- Project classification
project_type        TEXT CHECK (project_type IN (
                      'full_install', 'renovation', 'hardscape', 'softscape',
                      'drainage', 'irrigation', 'maintenance', 'mixed'
                    )),
scope_size          TEXT CHECK (scope_size IN ('small', 'medium', 'large', 'commercial')),
description         TEXT,                    -- Natural language job description (AI input)
```

### Step 2: Site Intelligence (location + conditions)

```sql
-- AI-inferred (editable by contractor)
climate_zone        TEXT,                    -- e.g., "USDA 7b", "8a"
soil_type           TEXT,                    -- e.g., "clay", "sandy loam"
permit_zone         TEXT,                    -- Municipal permit district
hoa_flag            BOOLEAN DEFAULT false,

-- Contractor-entered site conditions
slope_grade         TEXT,                    -- e.g., "flat", "moderate", "steep"
existing_vegetation TEXT,                    -- Freeform: "mature oaks, bermuda lawn"
sun_exposure        TEXT CHECK (sun_exposure IN ('full_sun', 'partial_shade', 'full_shade', 'mixed')),
drainage_pattern    TEXT,                    -- e.g., "pools at NW corner", "good runoff"

-- Access & logistics
gate_code           TEXT,
parking_restrictions TEXT,
permitted_hours     TEXT,                    -- e.g., "7am-6pm weekdays"
utility_locations   TEXT,                    -- Freeform notes
hoa_rules           TEXT,                    -- Freeform HOA constraints
```

### Step 5: Timeline & Budget (AI estimates, contractor adjusts)

```sql
-- Budget breakdown (all NUMERIC for math)
labor_budget        NUMERIC(15, 2) CHECK (labor_budget >= 0),
materials_budget    NUMERIC(15, 2) CHECK (materials_budget >= 0),
equipment_budget    NUMERIC(15, 2) CHECK (equipment_budget >= 0),
subcontractor_budget NUMERIC(15, 2) CHECK (subcontractor_budget >= 0),
overhead_pct        NUMERIC(5, 2) DEFAULT 10 CHECK (overhead_pct >= 0 AND overhead_pct <= 100),

-- Client-facing
client_quote        NUMERIC(15, 2) CHECK (client_quote >= 0),
profit_margin       NUMERIC(15, 2),          -- Computed: client_quote - total_cost
estimated_hours     NUMERIC(10, 2) CHECK (estimated_hours >= 0),
```

### Step 6: Compliance

```sql
compliance_notes    TEXT,                    -- Freeform risk/compliance notes
permit_status       TEXT DEFAULT 'not_started' CHECK (permit_status IN (
                      'not_started', 'applied', 'approved', 'denied', 'not_required'
                    )),
```

### Step 7: Wizard state

```sql
wizard_step         INTEGER DEFAULT 0,       -- Last completed wizard step (0-7). 0 = not started via wizard.
wizard_completed_at TIMESTAMPTZ,             -- NULL until wizard finishes. Distinguishes wizard-created vs. quick-created projects.
```

**Migration note**: All new columns are nullable (except those with DEFAULTs). Existing projects won't break — they'll have NULLs for all new fields and continue working as-is.

---

## New Table: `project_tasks`

Tasks are the work breakdown structure for a project. AI generates them grouped by phase; the contractor reorders, edits, adds, and removes.

```sql
CREATE TABLE IF NOT EXISTS project_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zone_id           UUID REFERENCES zones(id) ON DELETE SET NULL,

  -- Task identity
  name              TEXT NOT NULL,
  description       TEXT,
  phase             TEXT NOT NULL DEFAULT 'prep' CHECK (phase IN (
                      'demo_prep', 'rough_grade', 'hardscape', 'softscape',
                      'irrigation', 'lighting', 'cleanup_punchlist', 'custom'
                    )),
  sequence_number   INTEGER NOT NULL DEFAULT 0,

  -- Status tracking
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                      'pending', 'in_progress', 'completed', 'skipped', 'blocked'
                    )),
  assigned_crew_id  UUID REFERENCES crew_members(id) ON DELETE SET NULL,
  estimated_hours   NUMERIC(10, 2) CHECK (estimated_hours >= 0),
  actual_hours      NUMERIC(10, 2) CHECK (actual_hours >= 0),

  -- Dependencies
  depends_on        UUID[],                  -- Array of task IDs this task depends on

  -- Dates
  scheduled_date    DATE,
  completed_at      TIMESTAMPTZ,

  -- AI metadata
  ai_generated      BOOLEAN DEFAULT false,   -- true if AI created this task
  ai_confidence     NUMERIC(3, 2),           -- 0.00-1.00, how confident AI was

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_project_tasks_org ON project_tasks (org_id);
CREATE INDEX idx_project_tasks_project ON project_tasks (project_id);
CREATE INDEX idx_project_tasks_zone ON project_tasks (zone_id);
CREATE INDEX idx_project_tasks_phase ON project_tasks (project_id, phase);
CREATE INDEX idx_project_tasks_status ON project_tasks (project_id, status);
```

**Design decisions**:
- `depends_on UUID[]` uses a Postgres array rather than a junction table. For task dependency graphs within a single project (typically 10-50 tasks), an array is simpler to query and update than a many-to-many join table. If projects routinely exceed 100 tasks, revisit.
- `zone_id` is optional — not every task maps to a specific zone (e.g., "mobilize equipment" is project-level).
- `ai_generated` and `ai_confidence` support the "AI generates, contractor owns" principle. Once the contractor edits a task, the frontend should set `ai_generated = false` to signal it's been human-reviewed.

---

## New Table: `project_subcontractors`

Tracks subcontractors assigned to a project. Separate from `crew_members` because subs are external — they don't have org membership, crew PINs, or appear in the scheduling grid.

```sql
CREATE TABLE IF NOT EXISTS project_subcontractors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Sub identity
  company_name      TEXT NOT NULL,
  contact_name      TEXT,
  phone             TEXT,
  email             TEXT,
  trade             TEXT,                    -- e.g., "electrician", "plumber", "concrete"

  -- Scope on this project
  scope_description TEXT,                    -- What they're doing on this job
  scheduled_start   DATE,
  scheduled_end     DATE,
  quoted_cost       NUMERIC(15, 2) CHECK (quoted_cost >= 0),
  actual_cost       NUMERIC(15, 2) CHECK (actual_cost >= 0),
  status            TEXT DEFAULT 'pending' CHECK (status IN (
                      'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
                    )),
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_subs_org ON project_subcontractors (org_id);
CREATE INDEX idx_project_subs_project ON project_subcontractors (project_id);
```

**Design decisions**:
- No FK to `crew_members`. Subs are external entities scoped to a project, not org members.
- `trade` is freeform TEXT, not a CHECK constraint. Trades vary too widely ("irrigation specialist", "mason", "tree removal") to enumerate.
- If a sub works on multiple projects, they get a separate row per project. A shared sub directory is an M4 feature.

---

## New Table: `project_documents`

Stores metadata for files uploaded to a project. Actual files live in Supabase Storage. This table enables the project dashboard's Documents tab.

```sql
CREATE TABLE IF NOT EXISTS project_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File metadata
  file_name         TEXT NOT NULL,
  storage_path      TEXT NOT NULL,           -- Supabase Storage path (bucket/folder/file)
  file_type         TEXT,                    -- MIME type or extension
  file_size_bytes   INTEGER,

  -- Classification
  document_type     TEXT DEFAULT 'other' CHECK (document_type IN (
                      'site_photo', 'permit', 'contract', 'proposal', 'invoice',
                      'plan', 'inspection', 'receipt', 'other'
                    )),
  description       TEXT,

  -- Who uploaded
  uploaded_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_docs_org ON project_documents (org_id);
CREATE INDEX idx_project_docs_project ON project_documents (project_id);
CREATE INDEX idx_project_docs_type ON project_documents (project_id, document_type);
```

**Design decisions**:
- No `updated_at` — documents are immutable once uploaded. To "replace" a document, delete and re-upload.
- `storage_path` points to the `project-photos` Supabase Storage bucket (new bucket, separate from `crew-photos`).
- `uploaded_by` references `auth.users` directly, not `crew_members`, because managers upload documents too.

---

## New Table: `project_site_conditions`

AI-inferred and contractor-entered site condition details. This is a narrow table with key-value semantics — flexible enough for AI to populate dynamically without schema changes.

```sql
CREATE TABLE IF NOT EXISTS project_site_conditions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  condition_type    TEXT NOT NULL CHECK (condition_type IN (
                      'slope', 'soil', 'drainage', 'vegetation', 'sun_exposure',
                      'utilities', 'access', 'hazard', 'custom'
                    )),
  label             TEXT NOT NULL,            -- Display label: "Slope Grade", "Soil Type"
  value             TEXT NOT NULL,            -- The condition value: "Moderate - 8% grade"
  ai_inferred       BOOLEAN DEFAULT false,    -- true if AI set this, false if contractor entered
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_conditions_org ON project_site_conditions (org_id);
CREATE INDEX idx_site_conditions_project ON project_site_conditions (project_id);
```

**Design decisions**:
- Key-value design allows AI to add arbitrary conditions without migrations. AI might infer "frost line depth" for a northern project but not a Florida one.
- Duplicates the core site fields on `projects` (slope_grade, soil_type) intentionally. The `projects` columns are the quick-reference summary; this table holds the detailed, expandable list.
- `condition_type` uses CHECK constraint for the standard categories but includes `'custom'` as an escape hatch.

---

## New Table: `project_permits`

Permits and inspections tied to compliance requirements. Separated from `project_documents` because permits have lifecycle state (applied → approved → inspected) that documents don't.

```sql
CREATE TABLE IF NOT EXISTS project_permits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  permit_type       TEXT NOT NULL,            -- e.g., "grading", "electrical", "plumbing", "building"
  jurisdiction      TEXT,                     -- e.g., "City of Austin", "Travis County"
  permit_number     TEXT,                     -- Assigned after filing
  status            TEXT DEFAULT 'needed' CHECK (status IN (
                      'needed', 'applied', 'approved', 'denied', 'not_required', 'expired'
                    )),

  -- Dates
  applied_date      DATE,
  approved_date     DATE,
  expiry_date       DATE,

  -- Linked inspection
  inspection_date   DATE,
  inspection_result TEXT CHECK (inspection_result IS NULL OR inspection_result IN (
                      'passed', 'failed', 'conditional', 'pending'
                    )),
  inspection_notes  TEXT,

  -- Cost
  fee               NUMERIC(10, 2) CHECK (fee >= 0),

  -- AI
  ai_suggested      BOOLEAN DEFAULT false,   -- true if AI generated this permit requirement
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_permits_org ON project_permits (org_id);
CREATE INDEX idx_project_permits_project ON project_permits (project_id);
CREATE INDEX idx_project_permits_status ON project_permits (project_id, status);
```

**Design decisions**:
- `permit_type` is freeform TEXT (not CHECK-constrained) because permit categories vary by jurisdiction. AI generates the types based on location + scope.
- Inspection is embedded on the permit row rather than a separate table. One permit → one inspection is the typical pattern. If multi-inspection tracking is needed (rare for landscaping), revisit in M4.

---

## Supabase Storage: `project-photos` Bucket

New bucket separate from `crew-photos`. Must be created manually in Supabase Dashboard.

**Bucket**: `project-photos`
**Access**: Private (RLS-protected)
**Structure**:
```
project-photos/
  {org_id}/
    {project_id}/
      site/          ← Site photos from wizard Step 2
      documents/     ← General project documents
      permits/       ← Permit documentation
      progress/      ← Progress photos from manager
```

**Storage policies**: Same org-membership check pattern as `crew-photos`. Any org member can upload; only admins can delete.

---

## RLS Policy Pattern

All new tables follow the same RLS pattern established in migrations 005-008:

```sql
-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member can view
CREATE POLICY "{table_name}_select" ON {table_name}
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- INSERT: designer, foreman, or admin can create
CREATE POLICY "{table_name}_insert" ON {table_name}
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
    )
  );

-- UPDATE: designer, foreman, or admin can update
CREATE POLICY "{table_name}_update" ON {table_name}
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
    )
  );

-- DELETE: admin only
CREATE POLICY "{table_name}_delete" ON {table_name}
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );
```

---

## TypeScript Interfaces

All interfaces below are live in `src/types/index.ts` as of Sprint 29.

```typescript
// ── Project Intelligence (M1.5) ─────────────────────────────────────────────

export type ProjectType =
  | 'full_install' | 'renovation' | 'hardscape' | 'softscape'
  | 'drainage' | 'irrigation' | 'maintenance' | 'mixed';

export type ScopeSize = 'small' | 'medium' | 'large' | 'commercial';

export type PropertyType =
  | 'residential' | 'commercial' | 'hoa' | 'municipal' | 'multi_family' | 'other';

export type TaskPhase =
  | 'demo_prep' | 'rough_grade' | 'hardscape' | 'softscape'
  | 'irrigation' | 'lighting' | 'cleanup_punchlist' | 'custom';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export interface ProjectTask {
  id: string;
  orgId: string;
  projectId: string;
  zoneId: string | null;
  name: string;
  description: string;
  phase: TaskPhase;
  sequenceNumber: number;
  status: TaskStatus;
  assignedCrewId: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  dependsOn: string[];
  scheduledDate: string | null;
  completedAt: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSubcontractor {
  id: string;
  orgId: string;
  projectId: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  trade: string;
  scopeDescription: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  quotedCost: number | null;
  actualCost: number | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  orgId: string;
  projectId: string;
  fileName: string;
  storagePath: string;
  fileType: string;
  fileSizeBytes: number | null;
  documentType: 'site_photo' | 'permit' | 'contract' | 'proposal' | 'invoice' | 'plan' | 'inspection' | 'receipt' | 'other';
  description: string;
  uploadedBy: string | null;
  createdAt: string;
}

export interface ProjectSiteCondition {
  id: string;
  orgId: string;
  projectId: string;
  conditionType: 'slope' | 'soil' | 'drainage' | 'vegetation' | 'sun_exposure' | 'utilities' | 'access' | 'hazard' | 'custom';
  label: string;
  value: string;
  aiInferred: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPermit {
  id: string;
  orgId: string;
  projectId: string;
  permitType: string;
  jurisdiction: string;
  permitNumber: string;
  status: 'needed' | 'applied' | 'approved' | 'denied' | 'not_required' | 'expired';
  appliedDate: string | null;
  approvedDate: string | null;
  expiryDate: string | null;
  inspectionDate: string | null;
  inspectionResult: 'passed' | 'failed' | 'conditional' | 'pending' | null;
  inspectionNotes: string;
  fee: number | null;
  aiSuggested: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Migration History

### Migration 010: `010_project_intelligence_core.sql` (Sprint 28) ✅ APPLIED
- ALTER `projects` — added 30+ new columns (client inline, classification, site, budget, compliance, wizard state)
- CREATE `project_tasks` + RLS (4 policies) + indexes + updated_at trigger
- CREATE `project_site_conditions` + RLS (4 policies) + indexes + updated_at trigger

### Migration 011: `011_project_intelligence_resources.sql` (Sprint 29) ✅ APPLIED
- CREATE `project_subcontractors` + RLS (4 policies) + indexes + updated_at trigger
- CREATE `project_documents` + RLS (4 policies) + indexes (immutable — no updated_at)
- CREATE `project_permits` + RLS (4 policies) + indexes + updated_at trigger

### Manual step: `project-photos` Supabase Storage bucket ⚠️ NOT YET CREATED
- Charlie needs to create this in Supabase Dashboard (Storage → New bucket → "project-photos", public: false)
- Required before document upload UI can work in M1.5b

---

## Relationship Diagram

```
organizations (existing)
  │
  ├── projects (EXTENDED)
  │     ├── zones (existing, unchanged)
  │     │     └── zone_materials (existing)
  │     │     └── zone_equipment (existing)
  │     ├── project_tasks (NEW)
  │     ├── project_subcontractors (NEW)
  │     ├── project_documents (NEW)
  │     ├── project_site_conditions (NEW)
  │     ├── project_permits (NEW)
  │     └── schedule_entries (existing, unchanged)
  │
  ├── crew_members (existing, unchanged)
  ├── equipment (existing, unchanged)
  └── materials (existing, unchanged)
```

---

## What This Doesn't Cover (Intentional)

- **Time tracking** (`time_entries` table) — M4 scope, not M1.5
- **Client portal access** — M4 scope. The `client_name`/`client_email` fields on `projects` are for the contractor's reference, not for client login.
- **Invoice generation** — M4 scope. Budget fields here support cost tracking, not invoicing.
- **Notification/push system** — M4 scope. The project dashboard's activity feed will be query-based (pull), not event-based (push).
- **Multi-org sub directory** — M4 scope. Subs are per-project for now.

---

## Implementation Checklist (Post-M1.5a Verification)

All items verified as of Sprint 31:

- [x] Every new table has `org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- [x] Every new table has RLS enabled + 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [x] All type columns use TEXT + CHECK, never ENUM
- [x] All new `projects` columns are nullable (won't break existing data)
- [x] Indexes on `org_id` and `project_id` for every new table
- [x] `updated_at` trigger added for tables that have `updated_at`
- [x] `supabaseData.ts` functions filter by `org_id` on every query (24 new functions)
- [x] TypeScript interfaces added to `src/types/index.ts` with camelCase names (40+ types)
- [x] snake_case ↔ camelCase mapping in `supabaseData.ts` for all new columns

## What M1.5b Still Needs (Sprint 32+)

- [ ] Zustand stores for project_tasks, project_subcontractors, project_documents, project_site_conditions, project_permits (currently using direct supabaseData calls)
- [ ] Document upload UI component + project-photos Storage bucket creation
- [ ] AI integration: task generation from description, site condition inference from location, crew/equipment recommendations
- [ ] Project dashboard tabs consuming the new CRUD functions for display/edit
