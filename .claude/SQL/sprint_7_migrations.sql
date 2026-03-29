-- ============================================================
-- Sprint 7 Migrations
-- Run in Supabase SQL Editor before testing S7-5 and S7-6.
-- This file is idempotent — safe to run multiple times.
-- ============================================================


-- ── project_materials (S7-5) ─────────────────────────────────────────────────
-- Tracks per-project material assignments with project-specific quantities.
-- Separate from zone_materials (which drives the manifest engine).

CREATE TABLE IF NOT EXISTS project_materials (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  material_id      UUID        NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity         NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  org_id           UUID        NOT NULL REFERENCES organizations(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, material_id)
);

ALTER TABLE project_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_materials_select ON project_materials;
CREATE POLICY project_materials_select ON project_materials
  FOR SELECT
  USING (user_has_role(org_id, 'viewer'));

DROP POLICY IF EXISTS project_materials_insert ON project_materials;
CREATE POLICY project_materials_insert ON project_materials
  FOR INSERT
  WITH CHECK (user_has_role(org_id, 'designer'));

DROP POLICY IF EXISTS project_materials_update ON project_materials;
CREATE POLICY project_materials_update ON project_materials
  FOR UPDATE
  USING (user_has_role(org_id, 'designer'));

DROP POLICY IF EXISTS project_materials_delete ON project_materials;
CREATE POLICY project_materials_delete ON project_materials
  FOR DELETE
  USING (user_is_admin(org_id));


-- ── project_crew (S7-6) ──────────────────────────────────────────────────────
-- Tracks crew member assignments to projects with optional role override.

CREATE TABLE IF NOT EXISTS project_crew (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_member_id   UUID        NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  role_on_project  TEXT        NOT NULL DEFAULT 'general',
  org_id           UUID        NOT NULL REFERENCES organizations(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, crew_member_id)
);

ALTER TABLE project_crew ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_crew_select ON project_crew;
CREATE POLICY project_crew_select ON project_crew
  FOR SELECT
  USING (user_has_role(org_id, 'viewer'));

DROP POLICY IF EXISTS project_crew_insert ON project_crew;
CREATE POLICY project_crew_insert ON project_crew
  FOR INSERT
  WITH CHECK (user_has_role(org_id, 'designer'));

DROP POLICY IF EXISTS project_crew_update ON project_crew;
CREATE POLICY project_crew_update ON project_crew
  FOR UPDATE
  USING (user_has_role(org_id, 'designer'));

DROP POLICY IF EXISTS project_crew_delete ON project_crew;
CREATE POLICY project_crew_delete ON project_crew
  FOR DELETE
  USING (user_is_admin(org_id));


-- ── Notes ────────────────────────────────────────────────────────────────────
-- Phase 1 MVP: project_materials and project_crew are currently persisted
-- in Zustand/localStorage only. These tables are ready for Phase 2 sync
-- when we wire up supabaseData.ts fetch/upsert for these entities.
-- The frontend uses projectStore.projectMaterials and projectStore.projectCrew
-- (keyed Record<projectId, entry[]>) until then.
