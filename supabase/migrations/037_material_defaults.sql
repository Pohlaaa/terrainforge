-- Migration 037: Sprint Materials Settings — fixed-rate defaults
--
-- Closes jbluhm V6 P1: contractor sets per-category default rates and
-- named disposal-fee categories once, AI + engine reuse them every project.
--
-- Schema:
--   organizations.material_defaults JSONB DEFAULT '{"categoryRates":[],"disposalRates":[]}'
--
-- Shape of the JSONB:
--   {
--     "categoryRates": [
--       { "id": "uuid", "label": "Class 5 base", "category": "gravel",
--         "supplierId": "uuid|null", "unitCost": 35, "unit": "cuyd",
--         "notes": "string?" }
--     ],
--     "disposalRates": [
--       { "id": "uuid", "type": "concrete", "unitCost": 80, "unit": "cuyd",
--         "notes": "string?" }
--     ]
--   }
--
-- Backward compat: keep the existing `disposal_rates` (Record<string, number>)
-- column for one release. App reads from material_defaults.disposalRates first;
-- legacy column gets dropped in a future migration once UI no longer references.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS material_defaults JSONB
    NOT NULL
    DEFAULT '{"categoryRates": [], "disposalRates": []}'::JSONB;

COMMENT ON COLUMN organizations.material_defaults IS
  'Sprint Materials Settings (mig 037): per-category default rates + named disposal categories. AI prompt + engine cost fallback consume.';
