-- Migration 015: Schema cleanup
-- Run AFTER AI wizard sprint is merged and tested.
--
-- Fixes:
-- 1. Drop dead `project_crew` table (duplicate of project_crew_assignments)
-- 2. Add missing FK on equipment.assigned_project_id → projects.id
-- 3. Fix inconsistent ON DELETE rules (NO ACTION → CASCADE) for org_id FKs

-- ── 1. Drop dead table ──────────────────────────────────────────────────────────
DROP TABLE IF EXISTS project_crew;

-- ── 2. Add missing FK on equipment.assigned_project_id ──────────────────────────
-- SET NULL so equipment becomes unassigned when a project is deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'equipment_assigned_project_id_fkey'
      AND table_name = 'equipment'
  ) THEN
    ALTER TABLE equipment
      ADD CONSTRAINT equipment_assigned_project_id_fkey
      FOREIGN KEY (assigned_project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 3. Fix ON DELETE NO ACTION → CASCADE for org_id FKs ─────────────────────────

-- project_crew_assignments.org_id
ALTER TABLE project_crew_assignments
  DROP CONSTRAINT IF EXISTS project_crew_assignments_org_id_fkey;
ALTER TABLE project_crew_assignments
  ADD CONSTRAINT project_crew_assignments_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- project_materials.org_id
ALTER TABLE project_materials
  DROP CONSTRAINT IF EXISTS project_materials_org_id_fkey;
ALTER TABLE project_materials
  ADD CONSTRAINT project_materials_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
