-- Migration 030: Material PBR texture columns
--
-- Future-proofing for the 3D view. Sprint 4 renders elements with a
-- solid per-type color via meshStandardMaterial (no textures yet), but
-- the schema needs these columns so contractors can attach PBR maps to
-- specific materials later without another migration round.
--
-- All three columns nullable — rendering code falls back to the solid
-- palette from src/lib/planLayout.ts when URLs are absent.
--
-- Applied via Supabase MCP.

BEGIN;

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS texture_albedo_url TEXT,
  ADD COLUMN IF NOT EXISTS texture_normal_url TEXT,
  ADD COLUMN IF NOT EXISTS texture_roughness_url TEXT;

COMMENT ON COLUMN materials.texture_albedo_url IS
  'PBR base color map URL. Rendering falls back to category color when null.';
COMMENT ON COLUMN materials.texture_normal_url IS
  'PBR normal map URL for surface bumps. Optional.';
COMMENT ON COLUMN materials.texture_roughness_url IS
  'PBR roughness map URL for specular variation. Optional.';

COMMIT;
