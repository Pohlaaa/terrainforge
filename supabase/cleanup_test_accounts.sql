-- ============================================================================
-- CLEANUP: Delete all test accounts except primary (woodsrider82@gmail.com)
-- ============================================================================
-- Run this in Supabase SQL Editor.
-- This script finds the org_id for the primary account and deletes everything else.
--
-- Tables WITHOUT org_id (zone_equipment, zone_materials, crew_certifications,
-- maintenance_log) use ON DELETE CASCADE from their parent — they auto-delete
-- when zones, crew_members, or equipment rows are deleted. No explicit delete needed.
-- ============================================================================

-- ============================================================================
-- STEP 0: VERIFICATION (run these first to see what you're keeping vs deleting)
-- ============================================================================

-- See which user/org will be KEPT:
-- SELECT u.id, u.email, om.org_id, o.name as org_name
-- FROM auth.users u
-- JOIN organization_members om ON om.user_id = u.id
-- JOIN organizations o ON o.id = om.org_id
-- WHERE u.email = 'woodsrider82@gmail.com';

-- See what will be DELETED (all other orgs):
-- SELECT o.id, o.name, o.created_at
-- FROM organizations o
-- WHERE o.id NOT IN (
--   SELECT om.org_id FROM organization_members om
--   JOIN auth.users u ON u.id = om.user_id
--   WHERE u.email = 'woodsrider82@gmail.com'
-- );

-- Count of auth users to be deleted:
-- SELECT count(*) as users_to_delete FROM auth.users WHERE email != 'woodsrider82@gmail.com';

-- ============================================================================
-- STEP 1: DELETE DATA FROM ALL NON-PRIMARY ORGS
-- ============================================================================

DO $$
DECLARE
  keep_org_ids uuid[];
  deleted_user_ids uuid[];
BEGIN
  -- Find org_id(s) belonging to the primary user
  SELECT array_agg(om.org_id) INTO keep_org_ids
  FROM organization_members om
  JOIN auth.users u ON u.id = om.user_id
  WHERE u.email = 'woodsrider82@gmail.com';

  IF keep_org_ids IS NULL THEN
    RAISE EXCEPTION 'Could not find org for woodsrider82@gmail.com — aborting!';
  END IF;

  RAISE NOTICE 'Keeping org_ids: %', keep_org_ids;

  -- Collect user_ids to delete (all users NOT in the kept orgs)
  SELECT array_agg(u.id) INTO deleted_user_ids
  FROM auth.users u
  WHERE u.id NOT IN (
    SELECT om.user_id FROM organization_members om
    WHERE om.org_id = ANY(keep_org_ids)
  );

  RAISE NOTICE 'Will delete % users', coalesce(array_length(deleted_user_ids, 1), 0);

  -- ===================================================================
  -- Tables WITH org_id — delete by org_id directly
  -- Order: deepest children first, then parents
  -- ===================================================================

  -- Project children (all have org_id)
  DELETE FROM project_crew_assignments WHERE org_id != ALL(keep_org_ids);
  DELETE FROM project_site_conditions WHERE org_id != ALL(keep_org_ids);
  DELETE FROM project_subcontractors WHERE org_id != ALL(keep_org_ids);
  DELETE FROM project_documents WHERE org_id != ALL(keep_org_ids);
  DELETE FROM project_permits WHERE org_id != ALL(keep_org_ids);
  DELETE FROM project_tasks WHERE org_id != ALL(keep_org_ids);

  -- Schedule & crew operations (have org_id)
  DELETE FROM schedule_entries WHERE org_id != ALL(keep_org_ids);
  DELETE FROM crew_status WHERE org_id != ALL(keep_org_ids);
  DELETE FROM crew_checklist_progress WHERE org_id != ALL(keep_org_ids);
  DELETE FROM crew_photos WHERE org_id != ALL(keep_org_ids);

  -- Zones — deleting zones will CASCADE to zone_materials and zone_equipment
  DELETE FROM zones WHERE org_id != ALL(keep_org_ids);

  -- Top-level domain tables
  -- Deleting crew_members CASCADEs to crew_certifications
  -- Deleting equipment CASCADEs to maintenance_log
  DELETE FROM projects WHERE org_id != ALL(keep_org_ids);
  DELETE FROM equipment WHERE org_id != ALL(keep_org_ids);
  DELETE FROM crew_members WHERE org_id != ALL(keep_org_ids);
  DELETE FROM materials WHERE org_id != ALL(keep_org_ids);
  DELETE FROM clients WHERE org_id != ALL(keep_org_ids);

  -- Dashboard & audit
  DELETE FROM dashboard_config WHERE org_id != ALL(keep_org_ids);
  DELETE FROM audit_log WHERE org_id != ALL(keep_org_ids);

  -- Org membership & invitations
  DELETE FROM invitations WHERE org_id != ALL(keep_org_ids);
  DELETE FROM organization_members WHERE org_id != ALL(keep_org_ids);

  -- Organizations themselves
  DELETE FROM organizations WHERE id != ALL(keep_org_ids);

  RAISE NOTICE 'All non-primary org data deleted.';

  -- === Delete auth users ===
  IF deleted_user_ids IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = ANY(deleted_user_ids);
    RAISE NOTICE 'Deleted % auth users.', array_length(deleted_user_ids, 1);
  ELSE
    RAISE NOTICE 'No auth users to delete.';
  END IF;

  RAISE NOTICE 'Cleanup complete. Only woodsrider82@gmail.com and its org remain.';
END $$;

-- ============================================================================
-- STEP 2: VERIFY (run after the cleanup)
-- ============================================================================

-- Should show only your account:
SELECT u.email, o.name as org_name, om.role
FROM auth.users u
JOIN organization_members om ON om.user_id = u.id
JOIN organizations o ON o.id = om.org_id;

-- Should show only your org's data:
SELECT 'organizations' as tbl, count(*) FROM organizations
UNION ALL SELECT 'projects', count(*) FROM projects
UNION ALL SELECT 'crew_members', count(*) FROM crew_members
UNION ALL SELECT 'equipment', count(*) FROM equipment
UNION ALL SELECT 'materials', count(*) FROM materials
UNION ALL SELECT 'auth.users', count(*) FROM auth.users;
