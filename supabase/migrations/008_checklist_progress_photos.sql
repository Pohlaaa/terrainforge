-- Migration 008: Checklist Progress & Photo Proof
-- Run in Supabase SQL Editor BEFORE testing Sprint 18
-- Adds crew checklist progress tracking and photo storage infrastructure

-- ============================================================================
-- 1. Crew checklist progress table
-- ============================================================================
-- Stores which work order steps a crew member has completed per schedule entry.
-- Each row = one completed step.

CREATE TABLE IF NOT EXISTS crew_checklist_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_entry_id UUID NOT NULL REFERENCES schedule_entries(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL CHECK (step_number > 0),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_entry_id, zone_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_checklist_progress_entry
  ON crew_checklist_progress (schedule_entry_id);

CREATE INDEX IF NOT EXISTS idx_checklist_progress_org
  ON crew_checklist_progress (org_id);

-- RLS
ALTER TABLE crew_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Crew can read their own progress
DO $$ BEGIN
  CREATE POLICY "checklist_progress_select" ON crew_checklist_progress
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Crew can insert their own progress
DO $$ BEGIN
  CREATE POLICY "checklist_progress_insert" ON crew_checklist_progress
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Crew can delete their own progress (un-check a step)
DO $$ BEGIN
  CREATE POLICY "checklist_progress_delete" ON crew_checklist_progress
    FOR DELETE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Crew photos table
-- ============================================================================
-- Stores references to photos uploaded by crew members.
-- Actual files go in Supabase Storage bucket "crew-photos".

CREATE TABLE IF NOT EXISTS crew_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  schedule_entry_id UUID NOT NULL REFERENCES schedule_entries(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  step_number INTEGER,
  storage_path TEXT NOT NULL,
  caption TEXT DEFAULT '',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_photos_entry
  ON crew_photos (schedule_entry_id);

CREATE INDEX IF NOT EXISTS idx_crew_photos_org
  ON crew_photos (org_id);

-- RLS
ALTER TABLE crew_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "crew_photos_select" ON crew_photos
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "crew_photos_insert" ON crew_photos
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "crew_photos_delete" ON crew_photos
    FOR DELETE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. Create Supabase Storage bucket for crew photos
-- ============================================================================
-- NOTE: Supabase Storage buckets must be created via the Supabase Dashboard
-- (Storage → New bucket → "crew-photos", public: false).
-- SQL cannot create storage buckets. Charlie must create this manually.

-- ============================================================================
-- Verification: confirm tables exist
-- ============================================================================
-- After running, check in Supabase Table Editor that:
-- 1. crew_checklist_progress table exists with UNIQUE constraint
-- 2. crew_photos table exists
-- 3. RLS is enabled on both tables
-- 4. Storage bucket "crew-photos" exists (created manually in Dashboard)
