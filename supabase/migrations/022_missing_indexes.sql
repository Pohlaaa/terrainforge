-- Migration 022: Add missing indexes on foreign key columns
-- These FK columns lack indexes, causing slow scans as data grows.
-- Identified in the TerrainForge Audit Report (April 2026).

-- project_elements already has idx_pe_project_id but missing org_id
CREATE INDEX IF NOT EXISTS idx_pe_org_id ON project_elements(org_id);

-- project_materials (if table is still used)
CREATE INDEX IF NOT EXISTS idx_pm_org_id ON project_materials(org_id);
CREATE INDEX IF NOT EXISTS idx_pm_project_id ON project_materials(project_id);

-- quote_requests
CREATE INDEX IF NOT EXISTS idx_qr_org_id ON quote_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_qr_project_id ON quote_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_qr_supplier_id ON quote_requests(supplier_id);

-- supplier_prices
CREATE INDEX IF NOT EXISTS idx_sp_org_id ON supplier_prices(org_id);
CREATE INDEX IF NOT EXISTS idx_sp_material_id ON supplier_prices(material_id);
CREATE INDEX IF NOT EXISTS idx_sp_supplier_id ON supplier_prices(supplier_id);

-- suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON suppliers(org_id);
