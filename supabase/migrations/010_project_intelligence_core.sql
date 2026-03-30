-- Migration 010: Project Intelligence Core
-- Run in Supabase SQL Editor BEFORE testing Sprint 28
-- Extends projects table + creates project_tasks and project_site_conditions tables

-- ============================================================================
-- 1. Extend projects table with new columns
-- ============================================================================
-- All new columns are nullable so existing projects are unaffected.

-- Step 1: Client info (inline on project)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS property_type TEXT
  CHECK (property_type IS NULL OR property_type IN (
    'residential', 'commercial', 'hoa', 'municipal', 'multi_family', 'other'
  ));

-- Project classification
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT
  CHECK (project_type IS NULL OR project_type IN (
    'full_install', 'renovation', 'hardscape', 'softscape',
    'drainage', 'irrigation', 'maintenance', 'mixed'
  ));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_size TEXT
  CHECK (scope_size IS NULL OR scope_size IN ('small', 'medium', 'large', 'commercial'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 2: Site intelligence
ALTER TABLE projects ADD COLUMN IF NOT EXISTS climate_zone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS soil_type TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS permit_zone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hoa_flag BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS slope_grade TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS existing_vegetation TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sun_exposure TEXT
  CHECK (sun_exposure IS NULL OR sun_exposure IN ('full_sun', 'partial_shade', 'full_shade', 'mixed'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS drainage_pattern TEXT;

-- Access & logistics
ALTER TABLE projects ADD COLUMN IF NOT EXISTS gate_code TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS parking_restrictions TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS permitted_hours TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS utility_locations TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS hoa_rules TEXT;

-- Step 5: Budget breakdown
ALTER TABLE projects ADD COLUMN IF NOT EXISTS labor_budget NUMERIC(15, 2)
  CHECK (labor_budget IS NULL OR labor_budget >= 0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS materials_budget NUMERIC(15, 2)
  CHECK (materials_budget IS NULL OR materials_budget >= 0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS equipment_budget NUMERIC(15, 2)
  CHECK (equipment_budget IS NULL OR equipment_budget >= 0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subcontractor_budget NUMERIC(15, 2)
  CHECK (subcontractor_budget IS NULL OR subcontractor_budget >= 0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS overhead_pct NUMERIC(5, 2) DEFAULT 10
  CHECK (overhead_pct IS NULL OR (overhead_pct >= 0 AND overhead_pct <= 100));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_quote NUMERIC(15, 2)
  CHECK (client_quote IS NULL OR client_quote >= 0);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(15, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10, 2)
  CHECK (estimated_hours IS NULL OR estimated_hours >= 0);

-- Step 6: Compliance
ALTER TABLE projects ADD COLUMN IF NOT EXISTS compliance_notes TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS permit_status TEXT DEFAULT 'not_started'
  CHECK (permit_status IS NULL OR permit_status IN (
    'not_started', 'applied', 'approved', 'denied', 'not_required'
  ));

-- Step 7: Wizard state
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wizard_step INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS wizard_completed_at TIMESTAMPTZ;


-- ============================================================================
-- 2. project_tasks table
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zone_id           UUID REFERENCES zones(id) ON DELETE SET NULL,

  -- Task identity
  name              TEXT NOT NULL,
  description       TEXT,
  phase             TEXT NOT NULL DEFAULT 'demo_prep' CHECK (phase IN (
                      'demo_prep', 'rough_grade', 'hardscape', 'softscape',
                      'irrigation', 'lighting', 'cleanup_punchlist', 'custom'
                    )),
  sequence_number   INTEGER NOT NULL DEFAULT 0,

  -- Status tracking
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                      'pending', 'in_progress', 'completed', 'skipped', 'blocked'
                    )),
  assigned_crew_id  UUID REFERENCES crew_members(id) ON DELETE SET NULL,
  estimated_hours   NUMERIC(10, 2) CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
  actual_hours      NUMERIC(10, 2) CHECK (actual_hours IS NULL OR actual_hours >= 0),

  -- Dependencies
  depends_on        UUID[],

  -- Dates
  scheduled_date    DATE,
  completed_at      TIMESTAMPTZ,

  -- AI metadata
  ai_generated      BOOLEAN DEFAULT false,
  ai_confidence     NUMERIC(3, 2),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_tasks_org ON project_tasks (org_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_zone ON project_tasks (zone_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_phase ON project_tasks (project_id, phase);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks (project_id, status);

-- RLS
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member
DO $$ BEGIN
  CREATE POLICY "project_tasks_select" ON project_tasks
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT: designer, foreman, or admin
DO $$ BEGIN
  CREATE POLICY "project_tasks_insert" ON project_tasks
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: designer, foreman, or admin
DO $$ BEGIN
  CREATE POLICY "project_tasks_update" ON project_tasks
    FOR UPDATE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELETE: admin only
DO $$ BEGIN
  CREATE POLICY "project_tasks_delete" ON project_tasks
    FOR DELETE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND om.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_project_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER trg_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_project_tasks_updated_at();


-- ============================================================================
-- 3. project_site_conditions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_site_conditions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  condition_type    TEXT NOT NULL CHECK (condition_type IN (
                      'slope', 'soil', 'drainage', 'vegetation', 'sun_exposure',
                      'utilities', 'access', 'hazard', 'custom'
                    )),
  label             TEXT NOT NULL,
  value             TEXT NOT NULL,
  ai_inferred       BOOLEAN DEFAULT false,
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_conditions_org ON project_site_conditions (org_id);
CREATE INDEX IF NOT EXISTS idx_site_conditions_project ON project_site_conditions (project_id);

-- RLS
ALTER TABLE project_site_conditions ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member
DO $$ BEGIN
  CREATE POLICY "project_site_conditions_select" ON project_site_conditions
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT: designer, foreman, or admin
DO $$ BEGIN
  CREATE POLICY "project_site_conditions_insert" ON project_site_conditions
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: designer, foreman, or admin
DO $$ BEGIN
  CREATE POLICY "project_site_conditions_update" ON project_site_conditions
    FOR UPDATE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELETE: admin only
DO $$ BEGIN
  CREATE POLICY "project_site_conditions_delete" ON project_site_conditions
    FOR DELETE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND om.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_project_site_conditions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_site_conditions_updated_at ON project_site_conditions;
CREATE TRIGGER trg_project_site_conditions_updated_at
  BEFORE UPDATE ON project_site_conditions
  FOR EACH ROW EXECUTE FUNCTION update_project_site_conditions_updated_at();


-- ============================================================================
-- Verification: confirm changes
-- ============================================================================
-- After running, check in Supabase Table Editor that:
-- 1. projects table has new columns (client_name, project_type, scope_size, etc.)
-- 2. project_tasks table exists with all columns and RLS enabled
-- 3. project_site_conditions table exists with all columns and RLS enabled
-- 4. Both new tables have updated_at triggers
