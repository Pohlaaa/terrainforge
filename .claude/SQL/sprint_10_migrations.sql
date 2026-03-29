-- Sprint 10 Migrations
-- Run in Supabase SQL Editor before testing Sprint 10 features
-- All statements are idempotent

-- Add selected_kpis column to user_preferences if not present
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS selected_kpis TEXT[] DEFAULT ARRAY['active_projects','pipeline_value','crew_available','fleet_available'];

-- Add widget_layout column to user_preferences if not present
-- (already added in S9-6 migration, but idempotent here)
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS widget_layout JSONB DEFAULT '[]'::JSONB;

-- Add lat/lng columns to projects for Mapbox map widget
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- No new tables required for Sprint 10.
-- The user_preferences table from S9-6 handles all KPI and widget layout persistence.
