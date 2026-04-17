-- Migration 020: Project Lifecycle & Man Hours
-- Adds status column with lifecycle states, completed_at timestamp.
-- Backfills existing projects to 'estimate' status.

-- 1. Add status column with lifecycle CHECK constraint
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'estimate'
  CHECK (status IS NULL OR status IN (
    'estimate', 'approved', 'scheduled', 'in_progress', 'completed', 'on_hold'
  ));

-- 2. Add completed_at timestamp
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Add approved_at and started_at for lifecycle tracking
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 4. Backfill any existing projects to 'estimate' (they have no status yet)
UPDATE projects SET status = 'estimate' WHERE status IS NULL;
