-- Migration 036: supplier short_code for SKU prefixing
--
-- jbluhm-V6: "When these CSVs get imported the program needs to make
-- an ID based off the supplier. I.E. Rock Hard Landscaping Item
-- number should start with RH- or a variation so the system can keep
-- similar titled products separate from one supplier to another."
--
-- Adds a short identifier (e.g. "RH" for Rock Hard, "SO" for Site
-- One) used to prefix material SKUs at CSV import time. Unique per
-- org so a contractor can't accidentally collide two of their
-- suppliers on the same prefix.
--
-- Nullable on purpose — only suppliers that get used for CSV
-- imports need a short_code, and existing rows get nothing on
-- backfill.

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS short_code TEXT;

-- Org-scoped uniqueness. Two orgs can both have a "RH" short_code,
-- but within one org the codes are unique. Allows nulls (multiple
-- suppliers without a code is fine).
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_short_code_org_unique
  ON suppliers (org_id, short_code)
  WHERE short_code IS NOT NULL;

COMMENT ON COLUMN suppliers.short_code IS
  'Optional 2-6 character supplier code (e.g. ''RH'' for Rock Hard) used to prefix material SKUs at CSV import time. Lets the contractor distinguish similarly-named products across suppliers. Org-scoped unique.';
