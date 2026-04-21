-- Migration 027: Performance + Security Hardening
--
-- Addresses findings from Supabase advisors (Apr 17, 2026):
--   - 88 RLS policies re-evaluate auth.uid()/auth.jwt() per row
--     (auth_rls_initplan) → wrap in SELECT subquery so Postgres caches.
--   - 12 foreign-key columns lack supporting indexes → create.
--   - 28 unused indexes (0 scans since creation) → drop. Test data only;
--     safe to recreate later if a query pattern actually needs them.
--   - 10 functions have a role-mutable search_path → pin to public, pg_temp.
--   - audit_log.INSERT allowed with WITH CHECK (true) → tighten to require
--     an authenticated user.
--
-- All operations wrapped in a single transaction so a failure rolls back
-- cleanly. No data is touched. Multiple-permissive-policy consolidation
-- (25 cases) is deliberately left for a follow-up migration — consolidating
-- those correctly requires per-table analysis that shouldn't be rushed into
-- a hardening pass.

BEGIN;

-- ============================================================
-- 1. Wrap auth.uid()/auth.jwt()/auth.role() in subselects on
--    every RLS policy that references them inline.
-- ============================================================

DO $$
DECLARE
  p RECORD;
  new_qual TEXT;
  new_check TEXT;
  stmt TEXT;
  role_clause TEXT;
  rewritten INT := 0;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, cmd, permissive, roles,
           qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        -- matches unwrapped auth.uid() / auth.jwt() / auth.role() / auth.email()
        -- while excluding already-wrapped ( select auth.X() ) patterns.
        (qual ~ 'auth\.(uid|jwt|role|email)\(\)'
          AND qual !~* '\(\s*select\s+auth\.(uid|jwt|role|email)')
        OR
        (with_check ~ 'auth\.(uid|jwt|role|email)\(\)'
          AND with_check !~* '\(\s*select\s+auth\.(uid|jwt|role|email)')
      )
  LOOP
    new_qual := p.qual;
    new_check := p.with_check;

    -- Wrap each auth.X() occurrence. Order matters: do longer matches first
    -- doesn't apply here (all zero-arg), but guard against double-wrap.
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)',   '(SELECT auth.uid())',   'g');
      new_qual := regexp_replace(new_qual, 'auth\.jwt\(\)',   '(SELECT auth.jwt())',   'g');
      new_qual := regexp_replace(new_qual, 'auth\.role\(\)',  '(SELECT auth.role())',  'g');
      new_qual := regexp_replace(new_qual, 'auth\.email\(\)', '(SELECT auth.email())', 'g');
      -- Collapse accidental double-wraps from retry scenarios.
      new_qual := regexp_replace(new_qual,
        '\(\s*SELECT\s+\(\s*SELECT\s+auth\.([a-z]+)\(\)\s*\)\s*\)',
        '(SELECT auth.\1())', 'g');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, 'auth\.uid\(\)',   '(SELECT auth.uid())',   'g');
      new_check := regexp_replace(new_check, 'auth\.jwt\(\)',   '(SELECT auth.jwt())',   'g');
      new_check := regexp_replace(new_check, 'auth\.role\(\)',  '(SELECT auth.role())',  'g');
      new_check := regexp_replace(new_check, 'auth\.email\(\)', '(SELECT auth.email())', 'g');
      new_check := regexp_replace(new_check,
        '\(\s*SELECT\s+\(\s*SELECT\s+auth\.([a-z]+)\(\)\s*\)\s*\)',
        '(SELECT auth.\1())', 'g');
    END IF;

    -- Build the CREATE POLICY statement.
    stmt := format('CREATE POLICY %I ON %I.%I',
                   p.policyname, p.schemaname, p.tablename);
    IF p.permissive = 'PERMISSIVE' THEN
      stmt := stmt || ' AS PERMISSIVE';
    ELSE
      stmt := stmt || ' AS RESTRICTIVE';
    END IF;
    stmt := stmt || ' FOR ' || p.cmd;

    -- Quote each role name; drop the synthetic role named '-' (used when
    -- a policy is visible to all roles).
    IF p.roles IS NOT NULL AND array_length(p.roles, 1) > 0 THEN
      SELECT string_agg(quote_ident(r), ', ')
        INTO role_clause
      FROM unnest(p.roles) AS r
      WHERE r <> '-';
      IF role_clause IS NOT NULL AND role_clause <> '' THEN
        stmt := stmt || ' TO ' || role_clause;
      END IF;
    END IF;

    IF new_qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || new_qual || ')';
    END IF;
    IF new_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || new_check || ')';
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   p.policyname, p.schemaname, p.tablename);
    EXECUTE stmt;
    rewritten := rewritten + 1;
  END LOOP;
  RAISE NOTICE '027: rewrote % policies to wrap auth.* calls', rewritten;
END $$;

-- ============================================================
-- 2. Add missing foreign-key indexes (12 columns).
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_crew_checklist_progress_crew_member_id
  ON crew_checklist_progress (crew_member_id);
CREATE INDEX IF NOT EXISTS idx_crew_checklist_progress_zone_id
  ON crew_checklist_progress (zone_id);
CREATE INDEX IF NOT EXISTS idx_crew_photos_crew_member_id
  ON crew_photos (crew_member_id);
CREATE INDEX IF NOT EXISTS idx_crew_photos_zone_id
  ON crew_photos (zone_id);
CREATE INDEX IF NOT EXISTS idx_crew_status_schedule_entry_id
  ON crew_status (schedule_entry_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_performed_by
  ON maintenance_log (performed_by);
CREATE INDEX IF NOT EXISTS idx_project_element_materials_material_id
  ON project_element_materials (material_id);
CREATE INDEX IF NOT EXISTS idx_project_materials_material_id
  ON project_materials (material_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_crew_id
  ON project_tasks (assigned_crew_id);
CREATE INDEX IF NOT EXISTS idx_quote_request_items_material_id
  ON quote_request_items (material_id);
CREATE INDEX IF NOT EXISTS idx_quote_request_items_quote_request_id
  ON quote_request_items (quote_request_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_equipment_id
  ON schedule_entries (equipment_id);

-- ============================================================
-- 3. Drop 28 unused indexes (0 scans since creation).
--    Safe to recreate later if a query pattern needs one.
-- ============================================================

DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_entity;
DROP INDEX IF EXISTS idx_clients_email;
DROP INDEX IF EXISTS idx_crew_members_email;
DROP INDEX IF EXISTS idx_equipment_assigned_project;
DROP INDEX IF EXISTS idx_invitations_email;
DROP INDEX IF EXISTS idx_invitations_token;
DROP INDEX IF EXISTS idx_maintenance_log_service_date;
DROP INDEX IF EXISTS idx_manifests_org;
DROP INDEX IF EXISTS idx_manifests_project;
DROP INDEX IF EXISTS idx_materials_is_active;
DROP INDEX IF EXISTS idx_org_members_role;
DROP INDEX IF EXISTS idx_organizations_slug;
DROP INDEX IF EXISTS idx_organizations_stripe_customer;
DROP INDEX IF EXISTS idx_project_docs_project;
DROP INDEX IF EXISTS idx_pe_org_id;
DROP INDEX IF EXISTS idx_pm_org_id;
DROP INDEX IF EXISTS idx_pm_project_id;
DROP INDEX IF EXISTS idx_project_permits_project;
DROP INDEX IF EXISTS idx_project_tasks_phase;
DROP INDEX IF EXISTS idx_projects_client_id;
DROP INDEX IF EXISTS idx_projects_start_date;
DROP INDEX IF EXISTS idx_projects_target_date;
DROP INDEX IF EXISTS idx_qr_org_id;
DROP INDEX IF EXISTS idx_qr_project_id;
DROP INDEX IF EXISTS idx_qr_supplier_id;
DROP INDEX IF EXISTS idx_sp_supplier_id;
DROP INDEX IF EXISTS idx_suppliers_org_id;

-- ============================================================
-- 4. Pin search_path on 10 functions flagged by the linter.
--    Prevents a hijacker from shadowing built-ins via a
--    user-controlled schema in search_path.
-- ============================================================

ALTER FUNCTION public.generate_org_shortcode()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_org_id()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.set_trial_defaults()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_project_permits_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_project_site_conditions_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_project_subcontractors_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_project_tasks_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.user_has_role(p_org_id uuid, p_role org_role)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.user_is_admin(p_org_id uuid)
  SET search_path = public, pg_temp;

-- ============================================================
-- 5. Tighten audit_log INSERT policy.
--    The old policy had WITH CHECK (true) which allowed any role
--    (including anon) to write audit entries. Require an
--    authenticated user.
-- ============================================================

DROP POLICY IF EXISTS audit_log_insert ON audit_log;
CREATE POLICY audit_log_insert ON audit_log
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

COMMIT;
