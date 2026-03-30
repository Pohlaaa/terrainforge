-- Migration 005: Scheduling System
-- Run in Supabase SQL Editor BEFORE testing Sprint 15 locally
-- Adds schedule_entries and crew_status tables for M1 scheduling module

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Schedule Entries Table
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_schedule_entries_org_date
  ON schedule_entries (org_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_crew_date
  ON schedule_entries (crew_member_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_project
  ON schedule_entries (project_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RLS Policies for schedule_entries
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member can view their org's schedule
DO $$ BEGIN
  CREATE POLICY "schedule_entries_select" ON schedule_entries
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT: designer or admin can create schedule entries
DO $$ BEGIN
  CREATE POLICY "schedule_entries_insert" ON schedule_entries
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: designer, foreman, or admin can update
DO $$ BEGIN
  CREATE POLICY "schedule_entries_update" ON schedule_entries
    FOR UPDATE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND (om.role = 'admin' OR om.role = 'designer' OR om.role = 'foreman')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELETE: admin only
DO $$ BEGIN
  CREATE POLICY "schedule_entries_delete" ON schedule_entries
    FOR DELETE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND om.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Crew Status Table (for future crew app — Sprint 17+)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crew_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  crew_member_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'off_duty'
    CHECK (status IN ('off_duty', 'en_route', 'on_site', 'on_break', 'done')),
  schedule_entry_id UUID REFERENCES schedule_entries(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_status_org
  ON crew_status (org_id);

CREATE INDEX IF NOT EXISTS idx_crew_status_crew
  ON crew_status (crew_member_id);

-- RLS for crew_status (same org isolation pattern)
ALTER TABLE crew_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "crew_status_select" ON crew_status
    FOR SELECT USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "crew_status_insert" ON crew_status
    FOR INSERT WITH CHECK (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "crew_status_update" ON crew_status
    FOR UPDATE USING (
      org_id IN (
        SELECT om.org_id FROM organization_members om
        WHERE om.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Verification: confirm tables exist
-- ═══════════════════════════════════════════════════════════════════════════════
-- After running, check in Supabase Table Editor that:
-- 1. schedule_entries table exists with all columns
-- 2. crew_status table exists with all columns
-- 3. RLS is enabled on both tables (shield icon visible)
