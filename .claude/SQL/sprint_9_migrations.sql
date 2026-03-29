-- ============================================================
-- Sprint 9 Migrations — user_preferences table
-- Run in Supabase SQL Editor BEFORE testing Sprint 9 features
-- Idempotent: safe to run multiple times
-- ============================================================

-- 1. Create the user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Onboarding data
  business_type TEXT,
  company_name TEXT,
  team_size TEXT,
  user_role TEXT,
  priorities TEXT[] DEFAULT '{}',
  onboarding_completed_at TIMESTAMPTZ,

  -- Dashboard preferences
  selected_kpis TEXT[] DEFAULT '{active_projects,pipeline_value,crew_available,low_stock_alerts}',
  custom_kpis JSONB DEFAULT '[]'::jsonb,
  widget_layout JSONB DEFAULT '[]'::jsonb,

  -- Notification preferences
  notification_settings JSONB DEFAULT '{
    "deadline_reminders": true,
    "low_stock_alerts": true,
    "cert_expiry": true,
    "maintenance_due": true,
    "weekly_digest": false
  }'::jsonb,

  -- Theme
  theme TEXT DEFAULT 'light',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies — users can only read/write their own preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Updated_at trigger (reuse existing function if it exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_org_id ON user_preferences(org_id);
