-- Migration 006: Replace ENUM columns with TEXT + CHECK constraints
-- Fixes frontend ↔ database value mismatch that blocks all creates/updates
-- Run in Supabase SQL Editor BEFORE testing
--
-- Background: Postgres ENUMs used different values than frontend TypeScript types.
-- Example: Frontend sends category: "seed" but DB expects enum value "turf_seed".
-- Fix: Drop ENUM columns, replace with TEXT + CHECK matching frontend values exactly.

-- ============================================================================
-- MATERIALS: Replace material_category enum with TEXT
-- ============================================================================

-- Step 1: Add temporary TEXT column
ALTER TABLE materials ADD COLUMN IF NOT EXISTS category_text TEXT;

-- Step 2: Copy existing values (map old enum values to new frontend values)
UPDATE materials SET category_text = CASE category::text
  WHEN 'soil_amendments' THEN 'soil'
  WHEN 'mulch' THEN 'mulch'
  WHEN 'stone' THEN 'stone'
  WHEN 'sand' THEN 'sand'
  WHEN 'gravel' THEN 'gravel'
  WHEN 'hardscape' THEN 'concrete'
  WHEN 'pavers' THEN 'paver'
  WHEN 'stone_slab' THEN 'stone'
  WHEN 'edging' THEN 'edging'
  WHEN 'geotextile' THEN 'misc'
  WHEN 'landscape_fabric' THEN 'misc'
  WHEN 'plants' THEN 'plant'
  WHEN 'trees' THEN 'tree'
  WHEN 'shrubs' THEN 'shrub'
  WHEN 'turf_seed' THEN 'seed'
  WHEN 'fertilizer' THEN 'soil'
  WHEN 'pesticide' THEN 'misc'
  WHEN 'irrigation' THEN 'irrigation'
  WHEN 'misc_supplies' THEN 'misc'
  ELSE 'misc'
END
WHERE category_text IS NULL;

-- Step 3: Drop old column and rename
ALTER TABLE materials DROP COLUMN IF EXISTS category;
ALTER TABLE materials RENAME COLUMN category_text TO category;

-- Step 4: Add NOT NULL and CHECK constraint matching frontend MaterialCategory type
ALTER TABLE materials ALTER COLUMN category SET NOT NULL;
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_category_check;
ALTER TABLE materials ADD CONSTRAINT materials_category_check
  CHECK (category IN (
    'paver', 'stone', 'tile', 'brick', 'concrete',
    'sod', 'seed', 'mulch', 'gravel', 'sand', 'soil',
    'edging', 'plant', 'shrub', 'tree',
    'lighting', 'irrigation', 'lumber', 'misc'
  ));

-- ============================================================================
-- MATERIALS: Replace unit_type enum with TEXT
-- ============================================================================

ALTER TABLE materials ADD COLUMN IF NOT EXISTS unit_text TEXT;

UPDATE materials SET unit_text = unit_type::text
WHERE unit_text IS NULL;

ALTER TABLE materials DROP COLUMN IF EXISTS unit_type;
ALTER TABLE materials RENAME COLUMN unit_text TO unit;

ALTER TABLE materials ALTER COLUMN unit SET NOT NULL;
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_unit_check;
ALTER TABLE materials ADD CONSTRAINT materials_unit_check
  CHECK (unit IN (
    'sqft', 'lnft', 'bag', 'cuyd', 'ton', 'each', 'gallon', 'lb',
    'pallet', 'roll', 'box', 'piece', 'bundle'
  ));

-- ============================================================================
-- EQUIPMENT: Replace equipment_type enum with TEXT
-- ============================================================================

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS type_text TEXT;

UPDATE equipment SET type_text = CASE type::text
  WHEN 'excavator' THEN 'excavator'
  WHEN 'loader' THEN 'loader'
  WHEN 'compactor' THEN 'compactor'
  WHEN 'grader' THEN 'grader'
  WHEN 'skid_steer' THEN 'skid steer'
  WHEN 'mower' THEN 'mower'
  WHEN 'chainsaw' THEN 'chainsaw'
  WHEN 'blower' THEN 'blower'
  WHEN 'trimmer' THEN 'trimmer'
  WHEN 'spreader' THEN 'spreader'
  WHEN 'aerator' THEN 'aerator'
  WHEN 'truck' THEN 'truck'
  WHEN 'utility_vehicle' THEN 'utility vehicle'
  WHEN 'trailer' THEN 'trailer'
  ELSE type::text
END
WHERE type_text IS NULL;

ALTER TABLE equipment DROP COLUMN IF EXISTS type;
ALTER TABLE equipment RENAME COLUMN type_text TO type;

ALTER TABLE equipment ALTER COLUMN type SET NOT NULL;
-- No CHECK constraint on equipment type — free text field, users can enter any type

-- ============================================================================
-- EQUIPMENT: Replace equipment_status enum with TEXT
-- ============================================================================

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS status_text TEXT;

UPDATE equipment SET status_text = CASE status::text
  WHEN 'available' THEN 'available'
  WHEN 'in_use' THEN 'in-use'
  WHEN 'maintenance' THEN 'maintenance'
  WHEN 'out_of_service' THEN 'out-of-service'
  ELSE status::text
END
WHERE status_text IS NULL;

ALTER TABLE equipment DROP COLUMN IF EXISTS status;
ALTER TABLE equipment RENAME COLUMN status_text TO status;

ALTER TABLE equipment ALTER COLUMN status SET NOT NULL;
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_status_check;
ALTER TABLE equipment ADD CONSTRAINT equipment_status_check
  CHECK (status IN ('available', 'in-use', 'maintenance', 'out-of-service'));

-- ============================================================================
-- CREW: Replace crew_role enum with TEXT (if column uses enum)
-- ============================================================================

DO $$
BEGIN
  -- Check if role column is an enum type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crew_members' AND column_name = 'role'
    AND udt_name = 'crew_role'
  ) THEN
    ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS role_text TEXT;
    UPDATE crew_members SET role_text = role::text WHERE role_text IS NULL;
    ALTER TABLE crew_members DROP COLUMN role;
    ALTER TABLE crew_members RENAME COLUMN role_text TO role;
    ALTER TABLE crew_members ALTER COLUMN role SET NOT NULL;
  END IF;
END $$;

ALTER TABLE crew_members DROP CONSTRAINT IF EXISTS crew_members_role_check;
ALTER TABLE crew_members ADD CONSTRAINT crew_members_role_check
  CHECK (role IN ('foreman', 'lead', 'installer', 'laborer', 'specialist', 'apprentice'));

-- ============================================================================
-- Update RLS policies if any reference the old enum types
-- (RLS policies reference org_id, not enum columns, so no changes needed)
-- ============================================================================

-- Done. All enum columns are now TEXT with CHECK constraints matching frontend types.
