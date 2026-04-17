-- Migration 021: Project Element Materials (junction table)
-- Links materials to project elements for measurement-driven quantity calculation.
-- Element dimensions + material formulas = accurate quantities from real measurements.

CREATE TABLE IF NOT EXISTS project_element_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  element_id UUID NOT NULL REFERENCES project_elements(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  depth_in NUMERIC,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pem_element_id ON project_element_materials(element_id);
CREATE INDEX IF NOT EXISTS idx_pem_org_id ON project_element_materials(org_id);

-- Enable RLS
ALTER TABLE project_element_materials ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — org members can read their org's element materials
DROP POLICY IF EXISTS "pem_select_org" ON project_element_materials;
CREATE POLICY "pem_select_org" ON project_element_materials
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- RLS: INSERT — designer or admin can create element materials
DROP POLICY IF EXISTS "pem_insert_role" ON project_element_materials;
CREATE POLICY "pem_insert_role" ON project_element_materials
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );

-- RLS: UPDATE — designer or admin can update element materials
DROP POLICY IF EXISTS "pem_update_role" ON project_element_materials;
CREATE POLICY "pem_update_role" ON project_element_materials
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );

-- RLS: DELETE — designer or admin can remove element materials
DROP POLICY IF EXISTS "pem_delete_role" ON project_element_materials;
CREATE POLICY "pem_delete_role" ON project_element_materials
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );
