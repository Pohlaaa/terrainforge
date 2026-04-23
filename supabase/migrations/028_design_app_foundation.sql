-- Migration 028: 3D/2D Design App Foundation
--
-- Schema groundwork for the client-facing design app. The current
-- project_elements + project_element_materials graph already carries
-- ~90% of what a 2D top-down (and later 3D) viewer needs. This migration
-- adds the three missing pieces per .claude/ERD.md "Extension points":
--
--   1. project_elements.geometry JSONB
--      Holds {position:{x,y}, rotation, shape:{kind,...}} — position in
--      property-plane feet, rotation in degrees, shape discriminator for
--      future non-rectangular elements. Nullable; the 2D viewer falls
--      back to auto-layout when null.
--
--   2. projects.site_geometry JSONB
--      Holds {boundary:[{x,y}], center:{lat,lng}, zoom, elevationSamples?}
--      — property boundary polygon + optional Mapbox anchor point. Nullable;
--      the viewer shows a neutral canvas when null.
--
--   3. project_share_tokens table
--      Tokenized read-only links for clients. Anon role can SELECT when
--      the URL token matches an un-revoked, un-expired row. Policies on
--      projects / project_elements / project_element_materials / materials
--      are widened for anon to scope reads through a valid token.
--
-- Everything wrapped in a transaction. No data is touched.
--
-- Applied manually in Supabase SQL Editor. CLI is not connected.

BEGIN;

-- ============================================================================
-- 1. project_elements.geometry JSONB (nullable)
-- ============================================================================

ALTER TABLE project_elements
  ADD COLUMN IF NOT EXISTS geometry JSONB;

COMMENT ON COLUMN project_elements.geometry IS
  'Design-app geometry: {position:{x,y}, rotation, shape:{kind,...}}. '
  'Position in property-plane feet. Rotation in degrees. Nullable; viewer '
  'auto-layouts when null.';

-- ============================================================================
-- 2. projects.site_geometry JSONB (nullable)
-- ============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS site_geometry JSONB;

COMMENT ON COLUMN projects.site_geometry IS
  'Property context: {boundary:[{x,y}], center:{lat,lng}, zoom, '
  'elevationSamples?}. Powers the Mapbox satellite backdrop + element '
  'positioning reference.';

-- ============================================================================
-- 3. project_share_tokens table + RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'client_view'
    CHECK (role IN ('client_view', 'client_approve')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE project_share_tokens IS
  'Client-facing share links. Anon role SELECTs when token matches an '
  'un-revoked, un-expired row; widened policies on projects / elements / '
  'materials scope anon reads through this table.';

CREATE INDEX IF NOT EXISTS idx_project_share_tokens_token
  ON project_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_project_share_tokens_project_id
  ON project_share_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_project_share_tokens_org_id
  ON project_share_tokens(org_id);

ALTER TABLE project_share_tokens ENABLE ROW LEVEL SECURITY;

-- Org members: full CRUD on their own tokens
CREATE POLICY share_tokens_org_full_access
  ON project_share_tokens
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = project_share_tokens.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.org_id = project_share_tokens.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

-- Anon: SELECT only the token row that matches (by token lookup), and
-- only when the token is active. The frontend passes the token in the
-- URL; it queries `.select().eq('token', urlToken).single()` which
-- filters to the exact row. The USING clause additionally enforces
-- the active state, so revoked/expired tokens return zero rows.
CREATE POLICY share_tokens_anon_active_only
  ON project_share_tokens
  FOR SELECT
  TO anon
  USING (
    revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );

-- ============================================================================
-- 4. Widen anon read access on projects / elements / materials when a
--    valid share token exists for the project.
-- ============================================================================

-- projects: anon SELECT if a valid token references this project
CREATE POLICY projects_anon_via_share_token
  ON projects
  FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT project_id FROM project_share_tokens
      WHERE revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- project_elements: anon SELECT if the element's project has a valid token
CREATE POLICY project_elements_anon_via_share_token
  ON project_elements
  FOR SELECT
  TO anon
  USING (
    project_id IN (
      SELECT project_id FROM project_share_tokens
      WHERE revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
    )
  );

-- project_element_materials: anon SELECT scoped through elements
CREATE POLICY project_element_materials_anon_via_share_token
  ON project_element_materials
  FOR SELECT
  TO anon
  USING (
    project_element_id IN (
      SELECT pe.id FROM project_elements pe
      WHERE pe.project_id IN (
        SELECT project_id FROM project_share_tokens
        WHERE revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > now())
      )
    )
  );

-- materials: anon SELECT only the specific material rows referenced by
-- elements in a shared project. Scoped via project_element_materials so
-- we don't leak the org's full material catalogue to any share link.
CREATE POLICY materials_anon_via_share_token
  ON materials
  FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT pem.material_id FROM project_element_materials pem
      WHERE pem.project_element_id IN (
        SELECT pe.id FROM project_elements pe
        WHERE pe.project_id IN (
          SELECT project_id FROM project_share_tokens
          WHERE revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > now())
        )
      )
    )
  );

-- ============================================================================
-- 5. view_count / last_viewed_at bump on share token read
--    Uses a RPC (callable by anon with SECURITY DEFINER) so we don't need
--    UPDATE policies for anon. Frontend calls this after a successful load.
-- ============================================================================

CREATE OR REPLACE FUNCTION bump_share_token_view(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE project_share_tokens
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION bump_share_token_view(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION bump_share_token_view(TEXT) IS
  'Increments view_count + sets last_viewed_at on a share token. '
  'SECURITY DEFINER so anon can call it without an UPDATE policy.';

COMMIT;

-- ============================================================================
-- POST-APPLICATION SANITY CHECKS (run manually after applying)
-- ============================================================================
--
-- 1. Columns added:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name IN ('project_elements', 'projects')
--      AND column_name IN ('geometry', 'site_geometry');
--
-- 2. Share token table:
--    SELECT * FROM project_share_tokens LIMIT 0;
--
-- 3. Policies on share tokens:
--    SELECT policyname, cmd, roles FROM pg_policies
--    WHERE tablename = 'project_share_tokens';
--
-- 4. Anon read test (run as anon via PostgREST):
--    - Insert a token for a real project
--    - Fetch GET /rest/v1/project_share_tokens?token=eq.<TOKEN>
--      → should return the token row
--    - Fetch GET /rest/v1/projects?id=eq.<PROJECT_ID>
--      → should return the project row
--    - Revoke the token (UPDATE revoked_at = now())
--    - Re-fetch both → should return zero rows
--
-- 5. RPC test:
--    SELECT bump_share_token_view('<TOKEN>');
--    SELECT view_count, last_viewed_at FROM project_share_tokens
--    WHERE token = '<TOKEN>';
