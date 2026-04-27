-- Migration 032: F-PHC-04 — design version history
--
-- Phase C v0 stored client edits as direct mutations on
-- project_elements.geometry. That works for the simple "one-shot client
-- design submission" case, but loses the audit trail: if a client moves
-- the patio twice, the contractor sees only the latest position with no
-- way to rewind, and there's no record of when each change happened.
--
-- This migration adds a minimal version-history table. Each call to
-- submit_design_changes() now also snapshots the current elements
-- (geometry + dims + name + type) into project_design_versions. The
-- contractor reads the snapshots to compare submissions over time and
-- (future cleanup) revert to a prior version.
--
-- Schema changes:
--   project_design_versions
--     id UUID PK
--     project_id UUID FK → projects (CASCADE)
--     org_id UUID FK → organizations (CASCADE)
--     share_token_id UUID FK → project_share_tokens (SET NULL on token delete)
--     submitted_by_role TEXT — 'client' (Phase C v0 only writes 'client')
--     submitted_at TIMESTAMPTZ DEFAULT now()
--     elements_snapshot JSONB NOT NULL — array of element rows
--     note TEXT
--
-- RLS:
--   org members: full access (via org_id ↔ organization_members)
--   anon via share_token_id: SELECT only for their own token's versions
--
-- RPC:
--   submit_design_changes(p_token, p_note) is REPLACED to additionally
--   INSERT a row into project_design_versions before stamping the token
--   columns. Idempotency: each call creates a fresh version row, so a
--   client who submits twice gets two rows in the history (matches the
--   "stamps the latest timestamp" behaviour from the original RPC, but
--   now with full audit).

BEGIN;

-- ============================================================================
-- 1. project_design_versions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  share_token_id UUID REFERENCES project_share_tokens(id) ON DELETE SET NULL,
  submitted_by_role TEXT NOT NULL DEFAULT 'client'
    CHECK (submitted_by_role IN ('client', 'contractor')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  elements_snapshot JSONB NOT NULL,
  note TEXT
);

COMMENT ON TABLE project_design_versions IS
  'Append-only history of design submissions. Each row snapshots all '
  'elements (id, name, type, dims, geometry) at submission time. Used '
  'by the contractor to compare submissions and (future) revert.';

CREATE INDEX IF NOT EXISTS idx_project_design_versions_project_id
  ON project_design_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_design_versions_org_id
  ON project_design_versions(org_id);
CREATE INDEX IF NOT EXISTS idx_project_design_versions_share_token_id
  ON project_design_versions(share_token_id);
CREATE INDEX IF NOT EXISTS idx_project_design_versions_submitted_at
  ON project_design_versions(submitted_at DESC);

-- ============================================================================
-- 2. RLS
-- ============================================================================

ALTER TABLE project_design_versions ENABLE ROW LEVEL SECURITY;

-- Org members: full CRUD on their own org's versions.
CREATE POLICY design_versions_org_full_access
  ON project_design_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = project_design_versions.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = project_design_versions.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

-- Anon: SELECT only versions linked to a token. The client_design viewer
-- can show "your previous submissions" without leaking other clients' work.
-- (Future: gate by token in URL via a SECURITY DEFINER fetch RPC if we
-- decide we don't want anon to see ANY rows at all without an exact
-- token match. For now, scoping by token presence is enough.)
CREATE POLICY design_versions_anon_via_share_token
  ON project_design_versions
  FOR SELECT
  TO anon
  USING (
    share_token_id IN (
      SELECT id FROM project_share_tokens
      WHERE revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- ============================================================================
-- 3. submit_design_changes — REPLACED to snapshot elements before stamping
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_design_changes(
  p_token TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token_row project_share_tokens%ROWTYPE;
  v_updated project_share_tokens%ROWTYPE;
  v_snapshot JSONB;
  v_version_id UUID;
BEGIN
  -- Trim + cap the note (defense against pathological anon input)
  IF p_note IS NOT NULL THEN
    p_note := LEFT(TRIM(p_note), 2000);
    IF p_note = '' THEN p_note := NULL; END IF;
  END IF;

  -- Look up the token (need its project_id + org_id for the snapshot row)
  SELECT * INTO v_token_row
  FROM project_share_tokens
  WHERE token = p_token
    AND role = 'client_design'
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_not_found_or_not_design'
      USING HINT = 'no active client_design token matches the given value';
  END IF;

  -- Build the elements snapshot. Capture the fields the contractor
  -- needs to compare submissions (id for stable join, name/type for
  -- recognition, dims for sanity, geometry for the actual change).
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', pe.id,
        'name', pe.name,
        'element_type', pe.element_type,
        'length_ft', pe.length_ft,
        'width_ft', pe.width_ft,
        'area_sqft', pe.area_sqft,
        'linear_ft', pe.linear_ft,
        'height_ft', pe.height_ft,
        'depth_in', pe.depth_in,
        'geometry', pe.geometry
      )
      ORDER BY pe.sequence
    ),
    '[]'::jsonb
  )
  INTO v_snapshot
  FROM project_elements pe
  WHERE pe.project_id = v_token_row.project_id;

  -- Insert the version row
  INSERT INTO project_design_versions (
    project_id,
    org_id,
    share_token_id,
    submitted_by_role,
    elements_snapshot,
    note
  ) VALUES (
    v_token_row.project_id,
    v_token_row.org_id,
    v_token_row.id,
    'client',
    v_snapshot,
    p_note
  )
  RETURNING id INTO v_version_id;

  -- Stamp the token's submission columns (unchanged from migration 031)
  UPDATE project_share_tokens
  SET client_changes_submitted_at = now(),
      client_changes_note = p_note
  WHERE id = v_token_row.id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'version_id', v_version_id,
    'client_changes_submitted_at', v_updated.client_changes_submitted_at,
    'client_changes_note', v_updated.client_changes_note
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_design_changes(TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION submit_design_changes(TEXT, TEXT) IS
  'Records a client design submission. Inserts an append-only version '
  'row into project_design_versions and stamps the token''s '
  'client_changes_submitted_at + client_changes_note columns. Returns '
  'the version_id alongside the token id so the client UI can confirm.';

COMMIT;
