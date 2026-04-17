-- Migration 025: Add 'owner' to crew_members role CHECK constraint
-- Contractors need to add themselves as Owner/Operator on their crew roster.

ALTER TABLE crew_members DROP CONSTRAINT IF EXISTS crew_members_role_check;
ALTER TABLE crew_members ADD CONSTRAINT crew_members_role_check
  CHECK (role IN ('owner', 'foreman', 'lead', 'installer', 'laborer', 'specialist', 'apprentice'));
