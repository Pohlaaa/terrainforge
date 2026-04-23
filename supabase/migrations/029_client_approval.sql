-- Migration 029: Client approve / request-changes on share tokens
--
-- Sprint 2 Phase B. Lets a client open a /share/:token link and either
-- approve the design or request changes with an optional note. The
-- contractor sees the response on the project's Overview tab.
--
-- One response per token. If a client wants to change their mind,
-- the contractor can send a fresh link.
--
-- Schema:
--   project_share_tokens.client_response TEXT
--     — 'approved' | 'changes_requested' | NULL (no response yet)
--   project_share_tokens.client_responded_at TIMESTAMPTZ
--     — when the response arrived
--   project_share_tokens.client_note TEXT
--     — optional free-text note from the client (200 char soft cap at UI)
--
-- RPC:
--   respond_to_share_token(p_token, p_response, p_note)
--     — SECURITY DEFINER so anon can call it without a broad UPDATE policy.
--     — Idempotent: responding twice just updates the latest response.
--     — Rejects if token is revoked/expired or response value is invalid.
--
-- Applied via Supabase MCP (CLI not connected).

BEGIN;

ALTER TABLE project_share_tokens
  ADD COLUMN IF NOT EXISTS client_response TEXT
    CHECK (client_response IN ('approved', 'changes_requested'));

ALTER TABLE project_share_tokens
  ADD COLUMN IF NOT EXISTS client_responded_at TIMESTAMPTZ;

ALTER TABLE project_share_tokens
  ADD COLUMN IF NOT EXISTS client_note TEXT;

COMMENT ON COLUMN project_share_tokens.client_response IS
  'Most recent client response: approved / changes_requested / NULL.';
COMMENT ON COLUMN project_share_tokens.client_responded_at IS
  'Timestamp of the most recent client response.';
COMMENT ON COLUMN project_share_tokens.client_note IS
  'Optional free-text note from the client accompanying the response.';

CREATE OR REPLACE FUNCTION respond_to_share_token(
  p_token TEXT,
  p_response TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated_row project_share_tokens%ROWTYPE;
BEGIN
  -- Validate input
  IF p_response NOT IN ('approved', 'changes_requested') THEN
    RAISE EXCEPTION 'invalid_response'
      USING HINT = 'response must be approved or changes_requested';
  END IF;

  -- Trim + cap the note (defense against pathological input from anon)
  IF p_note IS NOT NULL THEN
    p_note := LEFT(TRIM(p_note), 2000);
    IF p_note = '' THEN p_note := NULL; END IF;
  END IF;

  UPDATE project_share_tokens
  SET client_response = p_response,
      client_responded_at = now(),
      client_note = p_note
  WHERE token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_not_found_or_inactive'
      USING HINT = 'no active token matches the given value';
  END IF;

  RETURN jsonb_build_object(
    'id', updated_row.id,
    'client_response', updated_row.client_response,
    'client_responded_at', updated_row.client_responded_at,
    'client_note', updated_row.client_note
  );
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_share_token(TEXT, TEXT, TEXT) TO anon, authenticated;

COMMENT ON FUNCTION respond_to_share_token(TEXT, TEXT, TEXT) IS
  'Writes a client approve/reject response to a share token. SECURITY '
  'DEFINER lets anon call it without an UPDATE policy on the table.';

COMMIT;
