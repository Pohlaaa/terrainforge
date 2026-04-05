-- Migration 019: Project Elements
-- Measurable areas of work (patio, wall, garden bed, etc.) with contractor-supplied dimensions.
-- Materials attach to elements — the foundation of measurement-driven architecture.

CREATE TABLE IF NOT EXISTS project_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  element_type TEXT NOT NULL CHECK (element_type IN (
    'patio', 'wall', 'garden_bed', 'sod_area', 'edging', 'walkway',
    'driveway', 'retaining_wall', 'fire_pit', 'pool_deck', 'other'
  )),
  length_ft NUMERIC,
  width_ft NUMERIC,
  area_sqft NUMERIC,
  linear_ft NUMERIC,
  height_ft NUMERIC,
  depth_in NUMERIC,
  computed_area_sqft NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_pe_project_id ON project_elements(project_id);

-- Enable RLS
ALTER TABLE project_elements ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT — org members can read their org's elements
DROP POLICY IF EXISTS "pe_select_org" ON project_elements;
CREATE POLICY "pe_select_org" ON project_elements
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- RLS: INSERT — designer or admin can create elements
DROP POLICY IF EXISTS "pe_insert_role" ON project_elements;
CREATE POLICY "pe_insert_role" ON project_elements
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );

-- RLS: UPDATE — designer or admin can update elements
DROP POLICY IF EXISTS "pe_update_role" ON project_elements;
CREATE POLICY "pe_update_role" ON project_elements
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );

-- RLS: DELETE — designer or admin can remove elements
DROP POLICY IF EXISTS "pe_delete_role" ON project_elements;
CREATE POLICY "pe_delete_role" ON project_elements
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id FROM organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('admin', 'designer')
    )
  );
