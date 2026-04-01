-- 012_trial_columns.sql
-- Adds trial tracking columns to organizations table.
-- Trial is managed locally (not via Stripe) because no credit card is required.
--
-- Run this in Supabase SQL Editor BEFORE starting the Sprint 38-40 batch.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Set default trial for new orgs: 14 days from creation
-- This trigger fires on INSERT to organizations and sets trial columns + status
CREATE OR REPLACE FUNCTION set_trial_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_starts_at IS NULL THEN
    NEW.trial_starts_at := NOW();
    NEW.trial_ends_at := NOW() + INTERVAL '14 days';
    NEW.subscription_status := 'trialing';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_trial_defaults ON organizations;
CREATE TRIGGER trigger_set_trial_defaults
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_trial_defaults();

-- Backfill existing orgs: if subscription_status is 'none' or NULL and no trial dates,
-- give them a trial starting now (so Charlie's test account gets a trial)
UPDATE organizations
SET
  trial_starts_at = NOW(),
  trial_ends_at = NOW() + INTERVAL '14 days',
  subscription_status = 'trialing'
WHERE (subscription_status IS NULL OR subscription_status = 'none')
  AND trial_starts_at IS NULL;
