-- Migration 014: Contractor feedback fields
-- Adds fields requested by contractor testing (2026-04-02)
-- Run in Supabase SQL Editor BEFORE executing rebuild code

-- Crew: phone number
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS phone TEXT;

-- Equipment: hourly cost and equipment type
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS hourly_cost NUMERIC;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS equipment_type TEXT;

-- Equipment type CHECK constraint (landscaping-specific)
-- Using TEXT + CHECK per project conventions (never ENUM)
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_type_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_type_check CHECK (
  equipment_type IS NULL OR equipment_type IN (
    'excavator', 'mini-excavator', 'skid-steer', 'mini-skid-steer',
    'tractor', 'dump-truck', 'trailer', 'pickup-truck', 'other'
  )
);

-- Projects: disposal cost and equipment cost budget fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS disposal_cost NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS equipment_cost NUMERIC;

-- Organizations: rate settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_labor_rate NUMERIC;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_equipment_rate NUMERIC;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS disposal_rates JSONB DEFAULT '{}';
