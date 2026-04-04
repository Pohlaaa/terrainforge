-- Migration 016: Suppliers, Supplier Pricing, and Quote Requests
-- Adds first-class supplier entities, multi-supplier pricing on materials,
-- and RFQ tracking for project manifests.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SUPPLIERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_name  TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  website       TEXT DEFAULT '',
  categories    TEXT[] DEFAULT '{}',
  notes         TEXT DEFAULT '',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view suppliers"
  ON suppliers FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and designers can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer'))
  );

CREATE POLICY "Admins and designers can update suppliers"
  ON suppliers FOR UPDATE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));

CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SUPPLIER PRICES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE supplier_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  unit_cost       NUMERIC(12,2) NOT NULL,
  sku             TEXT DEFAULT '',
  lead_time_days  INTEGER DEFAULT NULL,
  min_order_qty   NUMERIC(10,2) DEFAULT NULL,
  notes           TEXT DEFAULT '',
  is_preferred    BOOLEAN DEFAULT false,
  quoted_at       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(material_id, supplier_id)
);

ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view supplier_prices"
  ON supplier_prices FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and designers can insert supplier_prices"
  ON supplier_prices FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer'))
  );

CREATE POLICY "Admins and designers can update supplier_prices"
  ON supplier_prices FOR UPDATE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));

CREATE POLICY "Admins can delete supplier_prices"
  ON supplier_prices FOR DELETE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. QUOTE REQUESTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE quote_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'sent', 'received', 'accepted', 'declined', 'expired')),
  sent_at       TIMESTAMPTZ DEFAULT NULL,
  responded_at  TIMESTAMPTZ DEFAULT NULL,
  expires_at    TIMESTAMPTZ DEFAULT NULL,
  total_quoted  NUMERIC(12,2) DEFAULT NULL,
  notes         TEXT DEFAULT '',
  pdf_url       TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view quote_requests"
  ON quote_requests FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and designers can insert quote_requests"
  ON quote_requests FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer'))
  );

CREATE POLICY "Admins and designers can update quote_requests"
  ON quote_requests FOR UPDATE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));

CREATE POLICY "Admins and designers can delete quote_requests"
  ON quote_requests FOR DELETE
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. QUOTE REQUEST ITEMS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE quote_request_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id  UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  material_id       UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_name     TEXT NOT NULL,
  quantity          NUMERIC(10,2) NOT NULL,
  unit              TEXT NOT NULL,
  estimated_cost    NUMERIC(12,2) DEFAULT NULL,
  quoted_cost       NUMERIC(12,2) DEFAULT NULL,
  quoted_total      NUMERIC(12,2) DEFAULT NULL,
  notes             TEXT DEFAULT ''
);

ALTER TABLE quote_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access quote_request_items via quote_request org"
  ON quote_request_items FOR ALL
  USING (
    quote_request_id IN (
      SELECT id FROM quote_requests
      WHERE org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. MATERIAL TABLE CLEANUP
-- Remove deprecated supplier columns (data moves to suppliers + supplier_prices)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE materials
  DROP COLUMN IF EXISTS supplier_name,
  DROP COLUMN IF EXISTS supplier_sku,
  DROP COLUMN IF EXISTS supplier_phone,
  DROP COLUMN IF EXISTS supplier_contact,
  DROP COLUMN IF EXISTS lead_time_days,
  DROP COLUMN IF EXISTS price_update_date,
  DROP COLUMN IF EXISTS supplier_notes;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ZONE MATERIALS CLEANUP (documentation only)
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON COLUMN zone_materials.quantity IS 'DEPRECATED: Always 1. Real qty computed by manifest engine from zone geometry + material specs.';
