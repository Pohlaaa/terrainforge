-- Migration 017: Supplier Price History Tracking
-- Track historical supplier prices for trend analysis
-- Entries are created automatically when supplier_prices are upserted

CREATE TABLE IF NOT EXISTS supplier_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  unit_cost NUMERIC(12,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'quote', 'import'))
);

-- Index for efficient lookup by material + supplier + time
CREATE INDEX IF NOT EXISTS idx_price_history_material_supplier
  ON supplier_price_history(material_id, supplier_id, recorded_at DESC);

-- Index for lookups by org
CREATE INDEX IF NOT EXISTS idx_price_history_org
  ON supplier_price_history(org_id, recorded_at DESC);

-- RLS
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view price history"
  ON supplier_price_history FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and designers can insert price history"
  ON supplier_price_history FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));
