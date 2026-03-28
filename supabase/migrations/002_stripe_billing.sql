-- Migration: 002_stripe_billing
-- Adds Stripe billing columns to the organizations table.
-- Run in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Notes on 001 compatibility:
--  • stripe_customer_id already exists as TEXT UNIQUE — leave it alone.
--  • subscription_tier already exists as an ENUM (starter/professional/enterprise).
--    We migrate it to plain TEXT so the app can use starter/pro/business values.
--  • subscription_status, trial_ends_at, subscription_ends_at are new.

-- ── Step 1: Migrate subscription_tier from ENUM to TEXT ─────────────────────
-- Cast the existing column to text (preserves current values), then drop the
-- now-orphaned ENUM type.

ALTER TABLE organizations
  ALTER COLUMN subscription_tier TYPE TEXT USING subscription_tier::TEXT;

DROP TYPE IF EXISTS subscription_tier;

-- ── Step 2: Rename old ENUM values to the new naming convention ──────────────
-- Old ENUM used 'professional' and 'enterprise'; app now uses 'pro'/'business'.

UPDATE organizations SET subscription_tier = 'pro'      WHERE subscription_tier = 'professional';
UPDATE organizations SET subscription_tier = 'business' WHERE subscription_tier = 'enterprise';

-- ── Step 3: Add new billing columns ─────────────────────────────────────────
-- (stripe_customer_id is already present from 001 — skip it.)

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT        DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS trial_ends_at         TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS subscription_ends_at  TIMESTAMPTZ;

-- ── Step 4: Index for fast webhook lookups by Stripe customer ID ─────────────

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── Step 5: Add CHECK constraints ────────────────────────────────────────────
-- NOT VALID skips locking existing rows; safe to add on a live table.

ALTER TABLE organizations
  ADD CONSTRAINT chk_subscription_status
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'none'))
  NOT VALID;

ALTER TABLE organizations
  ADD CONSTRAINT chk_subscription_tier
    CHECK (subscription_tier IN ('starter', 'pro', 'business'))
  NOT VALID;
