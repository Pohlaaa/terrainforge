-- Migration 026: Materials Engine Upgrade
-- Adds computation model, purchase units, dependent materials, and engine params.
-- Migrates existing data from old columns to new structure.

-- ── New columns on materials table ──────────────────────────────────────────

ALTER TABLE materials ADD COLUMN IF NOT EXISTS computation_model TEXT DEFAULT 'AREA_COVERAGE';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS compute_params JSONB DEFAULT '{}';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchase_unit TEXT DEFAULT 'each';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS qty_per_purchase_unit NUMERIC DEFAULT 1;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cost_per_purchase_unit NUMERIC DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS default_waste_factor NUMERIC DEFAULT 0.05;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS supplier_sku TEXT DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS dependent_material_ids TEXT[] DEFAULT '{}';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- CHECK constraint for computation_model
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_computation_model_check;
ALTER TABLE materials ADD CONSTRAINT materials_computation_model_check
  CHECK (computation_model IN (
    'AREA_COVERAGE', 'UNIT_COVERAGE', 'LINEAR', 'POINT_SPACING', 'LINEAR_DEPTH', 'SUBSTRATE'
  ));

-- ── Migrate existing data ────────────────────────────────────────────────────
-- Map cost → cost_per_purchase_unit
UPDATE materials SET cost_per_purchase_unit = cost WHERE cost_per_purchase_unit = 0 AND cost > 0;
-- Map reserve_override_pct → default_waste_factor (pct to decimal)
UPDATE materials SET default_waste_factor = reserve_override_pct / 100.0
  WHERE reserve_override_pct > 0 AND default_waste_factor = 0.05;
-- Map coverage + depth_in into compute_params
UPDATE materials SET compute_params = jsonb_build_object(
  'coverage_sqft_per_unit', coverage,
  'depth_inches', depth_in
) WHERE (coverage IS NOT NULL OR depth_in IS NOT NULL) AND compute_params = '{}';
-- Map unit → purchase_unit
UPDATE materials SET purchase_unit = unit WHERE purchase_unit = 'each' AND unit != 'each';
-- Infer computation_model from category
UPDATE materials SET computation_model = 'AREA_COVERAGE' WHERE category IN ('gravel', 'sand', 'soil', 'mulch', 'concrete');
UPDATE materials SET computation_model = 'UNIT_COVERAGE' WHERE category IN ('paver', 'stone', 'tile', 'sod');
UPDATE materials SET computation_model = 'LINEAR' WHERE category IN ('edging');
UPDATE materials SET computation_model = 'POINT_SPACING' WHERE category IN ('plant', 'shrub', 'tree', 'lighting');
UPDATE materials SET computation_model = 'LINEAR_DEPTH' WHERE category IN ('brick', 'lumber');
UPDATE materials SET computation_model = 'SUBSTRATE' WHERE category IN ('irrigation');

-- Index on computation_model for filtering
CREATE INDEX IF NOT EXISTS idx_materials_computation_model ON materials(computation_model);
CREATE INDEX IF NOT EXISTS idx_materials_is_active ON materials(is_active) WHERE is_active = true;

-- ── Override columns on project_element_materials ────────────────────────────

ALTER TABLE project_element_materials ADD COLUMN IF NOT EXISTS spacing_override_inches NUMERIC;
ALTER TABLE project_element_materials ADD COLUMN IF NOT EXISTS waste_factor_override NUMERIC;
ALTER TABLE project_element_materials ADD COLUMN IF NOT EXISTS manual_count INTEGER;
ALTER TABLE project_element_materials ADD COLUMN IF NOT EXISTS wall_length_ft NUMERIC;
ALTER TABLE project_element_materials ADD COLUMN IF NOT EXISTS wall_height_ft NUMERIC;
ALTER TABLE project_element_materials ADD COLUMN IF NOT EXISTS computation_model TEXT;

-- ── Manifests table (versioned snapshots) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id),
  version INTEGER NOT NULL DEFAULT 1,
  line_items JSONB NOT NULL DEFAULT '[]',
  purchase_list JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manifests_project ON manifests(project_id);
CREATE INDEX IF NOT EXISTS idx_manifests_org ON manifests(org_id);

ALTER TABLE manifests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manifest_select_org" ON manifests;
CREATE POLICY "manifest_select_org" ON manifests
  FOR SELECT USING (org_id IN (
    SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "manifest_insert_role" ON manifests;
CREATE POLICY "manifest_insert_role" ON manifests
  FOR INSERT WITH CHECK (org_id IN (
    SELECT om.org_id FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('admin', 'designer')
  ));

DROP POLICY IF EXISTS "manifest_delete_role" ON manifests;
CREATE POLICY "manifest_delete_role" ON manifests
  FOR DELETE USING (org_id IN (
    SELECT om.org_id FROM organization_members om
    WHERE om.user_id = auth.uid() AND om.role IN ('admin')
  ));
