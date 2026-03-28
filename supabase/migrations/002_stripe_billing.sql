-- Migration: 002_stripe_billing
-- Adds Stripe billing columns to the organizations table.
-- Run in the Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_tier     TEXT DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS trial_ends_at         TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS subscription_ends_at  TIMESTAMPTZ;

-- Index for fast webhook lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Constrain status to known values so bad webhook data can't corrupt the column
ALTER TABLE organizations
  ADD CONSTRAINT chk_subscription_status
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'none'))
  NOT VALID;   -- NOT VALID skips locking existing rows; validate separately if needed

ALTER TABLE organizations
  ADD CONSTRAINT chk_subscription_tier
    CHECK (subscription_tier IN ('starter', 'pro', 'business'))
  NOT VALID;
