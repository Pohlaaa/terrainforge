-- Migration 013: Project Crew Assignments
-- Persists crew-to-project assignments (replaces in-memory projectCrew map)
-- Run in Supabase SQL Editor BEFORE executing refactor code

-- Create table
CREATE TABLE IF NOT EXISTS project_crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  role_on_project TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, crew_member_id)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_pca_org_id ON project_crew_assignments(org_id);
CREATE INDEX IF NOT EXISTS idx_pca_project_id ON project_crew_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pca_crew_member_id ON project_crew_assignments(crew_member_id);

-- Enable RLS
ALTER TABLE project_crew_assignments ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — org members can read their org's assignments
DROP POLICY IF EXISTS "pca_select_org" ON project_crew_assignments;
CREATE POLICY "pca_select_org" ON project_crew_assignments
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- RLS: INSERT — designer or admin can create assignments
DROP POLICY IF EXISTS "pca_insert_role" ON project_crew_assignments;
CREATE POLICY "pca_insert_role" ON project_crew_assignments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );

-- RLS: UPDATE — designer or admin can update assignments
DROP POLICY IF EXISTS "pca_update_role" ON project_crew_assignments;
CREATE POLICY "pca_update_role" ON project_crew_assignments
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );

-- RLS: DELETE — designer or admin can remove assignments
DROP POLICY IF EXISTS "pca_delete_role" ON project_crew_assignments;
CREATE POLICY "pca_delete_role" ON project_crew_assignments
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );
