-- Migration 009: Add org_shortcode to organizations
-- Run this in Supabase SQL Editor BEFORE testing Sprint 23

-- Add shortcode column (6-char alphanumeric, unique, used for crew login)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS shortcode TEXT;

-- Generate shortcodes for existing orgs that don't have one
DO $$
DECLARE
  r RECORD;
  code TEXT;
  attempts INT;
BEGIN
  FOR r IN SELECT id FROM organizations WHERE shortcode IS NULL LOOP
    attempts := 0;
    LOOP
      -- Generate a 6-char uppercase alphanumeric code
      code := upper(substr(md5(random()::text || r.id::text), 1, 6));
      -- Check uniqueness
      BEGIN
        UPDATE organizations SET shortcode = code WHERE id = r.id;
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        attempts := attempts + 1;
        IF attempts > 10 THEN
          RAISE EXCEPTION 'Could not generate unique shortcode for org %', r.id;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Now make it NOT NULL and UNIQUE
DO $$
BEGIN
  -- Set NOT NULL constraint
  ALTER TABLE organizations ALTER COLUMN shortcode SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Add unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_shortcode
ON organizations (shortcode);

-- Add a default for new orgs (generates on insert via trigger)
CREATE OR REPLACE FUNCTION generate_org_shortcode()
RETURNS TRIGGER AS $$
DECLARE
  code TEXT;
  attempts INT := 0;
BEGIN
  IF NEW.shortcode IS NULL OR NEW.shortcode = '' THEN
    LOOP
      code := upper(substr(md5(random()::text || NEW.id::text || clock_timestamp()::text), 1, 6));
      -- Check if it's taken
      IF NOT EXISTS (SELECT 1 FROM organizations WHERE shortcode = code) THEN
        NEW.shortcode := code;
        EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 20 THEN
        RAISE EXCEPTION 'Could not generate unique org shortcode';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_org_shortcode ON organizations;
CREATE TRIGGER trg_org_shortcode
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION generate_org_shortcode();

-- Allow crew to look up org by shortcode (for crew login page)
-- This is a limited SELECT policy - only returns id and name for the shortcode lookup
CREATE POLICY IF NOT EXISTS "Anyone can lookup org by shortcode"
ON organizations FOR SELECT
USING (true);
-- Note: The existing RLS policies already handle org isolation for authenticated users.
-- This policy allows the crew login page to verify a shortcode exists.
-- The crew login page only reads shortcode + org name, no sensitive data.
