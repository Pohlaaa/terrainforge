-- Migration 031: Phase C v0 — Client design edit mode
--
-- Lets a contractor send a client-editable share link. The client opens
-- /share/:token, drags / resizes / rotates elements directly in the 2D/3D
-- viewer, and submits the design back for the contractor to review.
--
-- Smallest cohesive ship that delivers visible value. Conservative scope:
--   - Clients can only edit ELEMENT GEOMETRY (position, rotation, shape).
--     They cannot rename elements, change types, edit dimensions outside
--     geometry, or touch material assignments. Those go through the
--     contractor's review by leaving a note on submit.
--   - All client edits funnel through SECURITY DEFINER RPCs scoped to a
--     valid `role = 'client_design'` token. No broad anon UPDATE policies
--     (smaller blast radius, easier audit, matches the migration 029
--     pattern for `respond_to_share_token`).
--
-- Schema changes:
--   project_share_tokens.role
--     CHECK extended to include 'client_design'
--   project_share_tokens.client_changes_submitted_at TIMESTAMPTZ
--     when the client clicked "Submit for review"
--   project_share_tokens.client_changes_note TEXT
--     optional note attached to the submission (200 char soft-cap at UI,
--     2000 hard-cap at the RPC)
--
-- RPCs:
--   client_update_element_geometry(p_token, p_element_id, p_geometry)
--     Validates token + role + element project membership, updates the
--     element's `geometry` column, returns the new geometry as JSONB.
--   submit_design_changes(p_token, p_note)
--     Stamps client_changes_submitted_at = now() and stores the note.
--     Idempotent — submitting twice just updates the latest timestamp.
--
-- Phase C+ extensions (later sessions):
--   - Magic-link auth so a client can return tomorrow without re-emailing.
--   - Allow client edits on element name / notes / dimension fields with
--     tighter validation.
--   - project_design_versions table for a real history chain (currently
--     edits are direct mutations).
--   - Reverse-direction acquisition (client signs up before being invited).

BEGIN;

-- ============================================================================
-- 1. Extend role CHECK to include client_design
-- ============================================================================

ALTER TABLE project_share_tokens
  DROP CONSTRAINT IF EXISTS project_share_tokens_role_check;

ALTER TABLE project_share_tokens
  ADD CONSTRAINT project_share_tokens_role_check
  CHECK (role IN ('client_view', 'client_approve', 'client_design'));

-- ============================================================================
-- 2. Add submission tracking columns
-- ============================================================================

ALTER TABLE project_share_tokens
  ADD COLUMN IF NOT EXISTS client_changes_submitted_at TIMESTAMPTZ;

ALTER TABLE project_share_tokens
  ADD COLUMN IF NOT EXISTS client_changes_note TEXT;

COMMENT ON COLUMN project_share_tokens.client_changes_submitted_at IS
  'Most recent timestamp the client clicked Submit on a client_design link.';
COMMENT ON COLUMN project_share_tokens.client_changes_note IS
  'Optional free-text note attached to the most recent design submission.';

-- ============================================================================
-- 3. RPC: client_update_element_geometry
-- ============================================================================

CREATE OR REPLACE FUNCTION client_update_element_geometry(
  p_token TEXT,
  p_element_id UUID,
  p_geometry JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token_row project_share_tokens%ROWTYPE;
  v_element_project UUID;
  v_updated project_elements%ROWTYPE;
BEGIN
  -- Validate the token exists, is active, and is a design token
  SELECT * INTO v_token_row
  FROM project_share_tokens
  WHERE token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_not_found_or_inactive'
      USING HINT = 'no active token matches the given value';
  END IF;

  IF v_token_row.role <> 'client_design' THEN
    RAISE EXCEPTION 'token_not_a_design_token'
      USING HINT = 'this share link does not grant edit permission';
  END IF;

  -- Validate the element belongs to the token's project
  SELECT project_id INTO v_element_project
  FROM project_elements
  WHERE id = p_element_id
  LIMIT 1;

  IF v_element_project IS NULL THEN
    RAISE EXCEPTION 'element_not_found'
      USING HINT = 'no element with the given id';
  END IF;

  IF v_element_project <> v_token_row.project_id THEN
    RAISE EXCEPTION 'element_not_in_token_project'
      USING HINT = 'cross-project edit attempt blocked';
  END IF;

  -- Validate geometry shape (defense-in-depth — JSONB column will accept
  -- anything, but we enforce a coarse shape check so malformed payloads
  -- don't poison the planLayout viewer downstream).
  IF p_geometry IS NULL
     OR jsonb_typeof(p_geometry) <> 'object'
     OR p_geometry -> 'position' IS NULL
     OR p_geometry -> 'shape' IS NULL THEN
    RAISE EXCEPTION 'invalid_geometry'
      USING HINT = 'geometry must include position and shape';
  END IF;

  UPDATE project_elements
  SET geometry = p_geometry
  WHERE id = p_element_id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'geometry', v_updated.geometry
  );
END;
$$;

GRANT EXECUTE ON FUNCTION client_update_element_geometry(TEXT, UUID, JSONB) TO anon, authenticated;

COMMENT ON FUNCTION client_update_element_geometry(TEXT, UUID, JSONB) IS
  'Lets a client_design share-token holder mutate ONE element''s geometry. '
  'Validates token active, role=client_design, and element project membership.';

-- ============================================================================
-- 4. RPC: submit_design_changes
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
  v_updated project_share_tokens%ROWTYPE;
BEGIN
  -- Trim + cap the note (defense against pathological anon input)
  IF p_note IS NOT NULL THEN
    p_note := LEFT(TRIM(p_note), 2000);
    IF p_note = '' THEN p_note := NULL; END IF;
  END IF;

  UPDATE project_share_tokens
  SET client_changes_submitted_at = now(),
      client_changes_note = p_note
  WHERE token = p_token
    AND role = 'client_design'
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_not_found_or_not_design'
      USING HINT = 'no active client_design token matches the given value';
  END IF;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'client_changes_submitted_at', v_updated.client_changes_submitted_at,
    'client_changes_note', v_updated.client_changes_note
  );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_design_changes(TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION submit_design_changes(TEXT, TEXT) IS
  'Records that the client clicked "Submit design changes" on a '
  'client_design share-token. Contractor surfaces this via the existing '
  'OverviewTab share-token banner.';

COMMIT;
