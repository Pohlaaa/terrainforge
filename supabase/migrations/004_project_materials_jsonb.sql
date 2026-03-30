-- ⚠️  RUN THIS IN SUPABASE SQL EDITOR BEFORE DEPLOYING SPRINT 13
-- Add materials JSONB column to projects table
-- Stores project-level material entries (from AI suggestions, etc.)
-- Format: [{ "name": "...", "quantity": 10, "unit": "cuyd", "unitCost": 0 }, ...]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
