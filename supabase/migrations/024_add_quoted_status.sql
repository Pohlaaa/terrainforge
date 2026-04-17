-- Migration 024: Add 'quoted' project status
-- New lifecycle: estimate → quoted → approved → scheduled → in_progress → completed (+ on_hold)
-- 'quoted' means the contractor has sent the quote to the client and is awaiting approval.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN (
    'estimate', 'quoted', 'approved', 'scheduled', 'in_progress', 'completed', 'on_hold'
  ));
