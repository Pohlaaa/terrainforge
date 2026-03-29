-- ============================================================================
-- 003_fix_rls_policies.sql — Fix missing RLS INSERT policies
--
-- Run this in Supabase SQL Editor — this project does not use automatic migrations.
-- ============================================================================

-- ── Fix 1: Allow users to create their own organization ───────────────────────
--
-- The original migration has SELECT, UPDATE, and DELETE policies on organizations
-- but NO INSERT policy. Without this, the fetchOrg fallback INSERT (triggered when
-- a new user has no org row) is always blocked by RLS, and org creation silently
-- fails for all new users.

CREATE POLICY org_insert_own
ON organizations FOR INSERT
WITH CHECK (auth.uid() = owner_id);


-- ── Fix 2: Allow users to insert their own membership row ─────────────────────
--
-- The original org_members_insert policy requires user_is_admin(org_id), which
-- is a chicken-and-egg: a brand-new user has no membership row yet, so
-- user_is_admin returns false, so they can never create their first row.
--
-- This policy supplements the existing one by allowing users to insert a row
-- where user_id = their own auth.uid(). The existing admin policy remains for
-- admins adding other users.

CREATE POLICY org_members_insert_self
ON organization_members FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- ── Verify: org_members_view policy ──────────────────────────────────────────
--
-- The existing org_members_view SELECT policy uses a self-referencing subquery:
--   EXISTS (SELECT 1 FROM organization_members om WHERE om.org_id = ... AND om.user_id = auth.uid())
-- This is correct but creates an implicit dependency: a user with no membership
-- row will see an empty result from organization_members (correct behavior, not
-- a bug). No change needed here.
