-- Migration 011: Project Intelligence Resources
-- Run in Supabase SQL Editor BEFORE testing Sprint 29
-- Creates project_subcontractors, project_documents, and project_permits tables

-- ============================================================================
-- 1. project_subcontractors table
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_subcontractors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Sub identity
  company_name      TEXT NOT NULL,
  contact_name      TEXT,
  phone             TEXT,
  email             TEXT,
  trade             TEXT,

  -- Scope on this project
  scope_description TEXT,
  scheduled_start   DATE,
  scheduled_end     DATE,
  quoted_cost       NUMERIC(15, 2) CHECK (quoted_cost IS NULL OR quoted_cost >= 0),
  actual_cost       NUMERIC(15, 2) CHECK (actual_cost IS NULL OR actual_cost >= 0),
  status            TEXT DEFAULT 'pending' CHECK (status IN (
                      'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
                    )),
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_subs_org ON project_subcontractors (org_id);
CREATE INDEX IF NOT EXISTS idx_project_subs_project ON project_subcontractors (project_id);

-- RLS
ALTER TABLE project_subcontractors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "project_subcontractors_select" ON project_subcontractors
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_subcontractors_insert" ON project_subcontractors
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_subcontractors_update" ON project_subcontractors
    FOR UPDATE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_subcontractors_delete" ON project_subcontractors
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
CREATE OR REPLACE FUNCTION update_project_subcontractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_subcontractors_updated_at ON project_subcontractors;
CREATE TRIGGER trg_project_subcontractors_updated_at
  BEFORE UPDATE ON project_subcontractors
  FOR EACH ROW EXECUTE FUNCTION update_project_subcontractors_updated_at();


-- ============================================================================
-- 2. project_documents table
-- ============================================================================
-- No updated_at — documents are immutable once uploaded.

CREATE TABLE IF NOT EXISTS project_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File metadata
  file_name         TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  file_type         TEXT,
  file_size_bytes   INTEGER,

  -- Classification
  document_type     TEXT DEFAULT 'other' CHECK (document_type IN (
                      'site_photo', 'permit', 'contract', 'proposal', 'invoice',
                      'plan', 'inspection', 'receipt', 'other'
                    )),
  description       TEXT,

  -- Who uploaded
  uploaded_by       UUID,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_docs_org ON project_documents (org_id);
CREATE INDEX IF NOT EXISTS idx_project_docs_project ON project_documents (project_id);
CREATE INDEX IF NOT EXISTS idx_project_docs_type ON project_documents (project_id, document_type);

-- RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "project_documents_select" ON project_documents
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_documents_insert" ON project_documents
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_documents_update" ON project_documents
    FOR UPDATE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_documents_delete" ON project_documents
    FOR DELETE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND om.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 3. project_permits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_permits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  permit_type       TEXT NOT NULL,
  jurisdiction      TEXT,
  permit_number     TEXT,
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
  fee               NUMERIC(10, 2) CHECK (fee IS NULL OR fee >= 0),

  -- AI
  ai_suggested      BOOLEAN DEFAULT false,
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_permits_org ON project_permits (org_id);
CREATE INDEX IF NOT EXISTS idx_project_permits_project ON project_permits (project_id);
CREATE INDEX IF NOT EXISTS idx_project_permits_status ON project_permits (project_id, status);

-- RLS
ALTER TABLE project_permits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "project_permits_select" ON project_permits
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_permits_insert" ON project_permits
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_permits_update" ON project_permits
    FOR UPDATE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "project_permits_delete" ON project_permits
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
CREATE OR REPLACE FUNCTION update_project_permits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_permits_updated_at ON project_permits;
CREATE TRIGGER trg_project_permits_updated_at
  BEFORE UPDATE ON project_permits
  FOR EACH ROW EXECUTE FUNCTION update_project_permits_updated_at();


-- ============================================================================
-- Supabase Storage: project-photos bucket
-- ============================================================================
-- NOTE: Supabase Storage buckets must be created via the Supabase Dashboard
-- (Storage → New bucket → "project-photos", public: false).
-- SQL cannot create storage buckets. Charlie must create this manually.
-- Structure: project-photos/{org_id}/{project_id}/site|documents|permits|progress/


-- ============================================================================
-- Verification: confirm tables exist
-- ============================================================================
-- After running, check in Supabase Table Editor that:
-- 1. project_subcontractors table exists with RLS enabled
-- 2. project_documents table exists with RLS enabled
-- 3. project_permits table exists with RLS enabled
-- 4. Storage bucket "project-photos" exists (created manually in Dashboard)
