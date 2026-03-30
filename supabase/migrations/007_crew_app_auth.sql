-- Migration 007: Crew App — Auth & Status Infrastructure
-- Run in Supabase SQL Editor BEFORE testing Sprint 17
-- Adds crew_member auth linkage and extends crew_status for real-time signals

-- ============================================================================
-- 1. Add user_id column to crew_members (links crew to Supabase auth user)
-- ============================================================================

ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE crew_members ADD COLUMN IF NOT EXISTS pin_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_crew_members_user_id ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_email ON crew_members(email);

-- ============================================================================
-- 2. Add pin column for simplified crew login
-- ============================================================================
-- Crew members authenticate via either:
--   a) Supabase auth (user_id set) — for foremen/leads who have full accounts
--   b) PIN code (pin_hash set) — for laborers who don't need email auth
-- The manager creates crew members and optionally sets a 4-6 digit PIN.
-- PIN is hashed before storage. Verification happens client-side against the hash.

-- ============================================================================
-- 3. Extend crew_status table for real-time status signals
-- ============================================================================

-- crew_status was created in migration 005. Add location and timestamp fields.
ALTER TABLE crew_status ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE crew_status ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE crew_status ADD COLUMN IF NOT EXISTS status_note TEXT DEFAULT '';

-- Update CHECK constraint to include all crew status values
-- First drop old constraint if it exists, then add new one
ALTER TABLE crew_status DROP CONSTRAINT IF EXISTS crew_status_status_check;
ALTER TABLE crew_status ADD CONSTRAINT crew_status_status_check
  CHECK (status IN ('off_duty', 'en_route', 'on_site', 'on_break', 'done'));

-- ============================================================================
-- 4. RLS policies for crew app access
-- ============================================================================

-- Allow crew members to read their own crew_members row via user_id
DO $$ BEGIN
  CREATE POLICY "crew_members_self_select" ON crew_members
    FOR SELECT USING (
      user_id = auth.uid()
      OR org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow crew members to update their own crew_status
DO $$ BEGIN
  CREATE POLICY "crew_status_self_update" ON crew_status
    FOR UPDATE USING (
      crew_member_id IN (
        SELECT id FROM crew_members WHERE user_id = auth.uid()
      )
      OR org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow crew members to read schedule entries for their assignments
DO $$ BEGIN
  CREATE POLICY "schedule_entries_crew_select" ON schedule_entries
    FOR SELECT USING (
      crew_member_id IN (
        SELECT id FROM crew_members WHERE user_id = auth.uid()
      )
      OR org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Verification: confirm columns exist
-- ============================================================================
-- After running, check in Supabase Table Editor that:
-- 1. crew_members has user_id, email, phone, pin_hash columns
-- 2. crew_status has lat, lng, status_note columns
-- 3. RLS policies crew_members_self_select, crew_status_self_update, schedule_entries_crew_select exist
