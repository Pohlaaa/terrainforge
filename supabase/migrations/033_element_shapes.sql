-- Migration 033: curved-shape support on project_elements
--
-- Partner V4 ask: "Need to be able to calc out round shapes — circle walls,
-- patios, round garden beds, curves & round edges on edging/walkways."
--
-- This migration adds the minimal schema needed to represent circles. The
-- materials engine reads `shape` to dispatch its area calculation:
--   shape='rectangle' (default, back-compat) → length_ft × width_ft
--   shape='circle'                            → π × radius_ft²
--   shape='polyline'                          → reserved for v2; not yet honored
--
-- Existing rows default to 'rectangle' so the engine's behavior is unchanged
-- for everything in production today.

ALTER TABLE project_elements
  ADD COLUMN IF NOT EXISTS shape TEXT NOT NULL DEFAULT 'rectangle';

ALTER TABLE project_elements
  ADD COLUMN IF NOT EXISTS radius_ft NUMERIC NULL;

-- CHECK: only the values the engine knows how to read. Extend the union when
-- adding new shape kinds.
ALTER TABLE project_elements
  DROP CONSTRAINT IF EXISTS project_elements_shape_check;

ALTER TABLE project_elements
  ADD CONSTRAINT project_elements_shape_check
  CHECK (shape IN ('rectangle', 'circle', 'polyline'));

-- Sanity guard: a circle row should have a positive radius. We don't enforce
-- this with a CHECK because in-progress wizard rows can transiently land in
-- weird states; the engine treats radius_ft <= 0 as "fall back to rectangle".

COMMENT ON COLUMN project_elements.shape IS
  'Geometric shape for area calculation. ''rectangle'' uses length_ft × width_ft (default). ''circle'' uses π × radius_ft². ''polyline'' reserved.';

COMMENT ON COLUMN project_elements.radius_ft IS
  'Radius in feet for shape=''circle''. Null when shape is rectangular.';
