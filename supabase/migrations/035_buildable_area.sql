-- Migration 035: Sprint AI-Buildable — persist buildable-area polygon
-- and (eventually) parcel-boundary polygon on `projects`.
--
-- Sprint AI-Place's vision call returns a `buildableArea` polygon (the
-- AI's read of where lawn / dirt / open ground is on the satellite) and
-- a list of `obstacles` polygons (rooftop, road, driveway, pool, mature
-- canopy). Today these live only in wizard state and are dropped on
-- project create. This migration captures them so:
--   1) Editing an existing project's elements can render the same
--      buildable polygon as a soft overlay
--   2) Soft-clip drag warnings persist across sessions
--   3) Future work (Sprint AI-Buildable Phase 2) can layer parcel data
--      from OSM / Regrid into `lot_geometry`
--
-- All three columns are JSONB to match the existing
-- `projects.site_geometry` pattern (Migration 028). Polygon shape:
--   [{ "x": <number>, "y": <number> }, ...]
-- where x and y are PLAN-FEET from the property tile center (same
-- coordinate space used by ProjectElement.geometry.position).
--
-- Conversion from Sprint AI-Place's normalized [0,1] tile coords to
-- plan-feet happens in src/lib/mapTileMath.ts (normalizedToPlanFeet)
-- before persistence — clients only see plan-feet.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS lot_geometry JSONB,
  ADD COLUMN IF NOT EXISTS buildable_area_geometry JSONB,
  ADD COLUMN IF NOT EXISTS obstacles_geometry JSONB;

COMMENT ON COLUMN projects.lot_geometry IS
  'Parcel polygon in plan-feet (origin = tile center). Sourced from a parcel-data provider (OSM landuse=residential, Regrid, county GIS). Null when not yet looked up. Future: Sprint AI-Buildable Phase 2.';

COMMENT ON COLUMN projects.buildable_area_geometry IS
  'AI-identified buildable polygon (lawn / dirt / non-paved non-rooftop) in plan-feet. Returned by Sprint AI-Place vision call. Null when call failed, image was unclear, or contractor cleared it.';

COMMENT ON COLUMN projects.obstacles_geometry IS
  'AI-identified obstacle polygons (rooftop, road, driveway, pool, canopy) as JSONB array of polygon arrays. Each obstacle is [{ x, y }, ...] in plan-feet. Used to warn-on-drag when a contractor moves an element onto an obstacle. Null when call failed or returned no obstacles.';
