# TerrainForge — Supplier & Materials Overhaul Spec

> **Status**: Ready for implementation
> **Author**: Charlie + Claude
> **Date**: 2026-04-04
> **Scope**: Material data model refactor + Phase 1 Supplier Directory + RFQ Export
> **Depends on**: Current codebase on `main` branch

---

## 1. Problem Statement

Contractors work with 2-5 local suppliers — some cover everything, others specialize (hardscape, plants, soil/aggregates, irrigation). Today, getting a quote means calling each supplier, reading off a material list, writing down numbers, and comparing them in your head or on paper. Then after ordering, there's no structured way to track what was delivered vs. what was ordered.

TerrainForge already generates material manifests. The gap between "I know what I need" and "I have a price and an order" is where contractor time gets wasted.

### Current System Issues

1. **Three overlapping material systems**: Material Library (org-level catalog), Zone Materials (zone_materials junction table), and Project Materials (projects.materials JSONB blob). Unclear ownership and refresh logic.
2. **Supplier data is flat fields on Material**: `supplier_name`, `supplier_sku`, `supplier_phone`, `supplier_contact` — each material can only have one supplier. In reality, the same paver is sold by 3 suppliers at different prices.
3. **Snake_case leak in types**: Material interface uses `supplier_name` instead of camelCase.
4. **No quote or order tracking**: Once a manifest is generated, there's no way to get pricing from suppliers or track procurement.
5. **zone_materials.quantity is dead code**: Always set to 1, never read. Real qty comes from `computeQty()`.
6. **projectStore bypasses supabaseData**: Line ~454 directly calls `supabase.from('projects').update()`.

---

## 2. Phased Roadmap

| Phase | Name | What Ships | Build Estimate |
|-------|------|-----------|----------------|
| **1** | **Supplier Directory + RFQ Export** | Supplier entity, multi-supplier pricing on materials, email RFQ with PDF manifest | 1-2 weeks |
| 2 | Quote Intake + Comparison | AI-parsed quote ingestion, side-by-side supplier comparison, accept → budget flow | 2-3 weeks |
| 3 | Order Tracking + Delivery | Purchase orders, delivery tracking, reconciliation | 2 weeks |
| 4 | Historical Pricing Intelligence | Price trend storage, auto-fill estimates, regional pricing data | 2 weeks |

**This spec covers the data model refactor + Phase 1 only.**

---

## 3. Data Model Changes

### 3.1 New Table: `suppliers`

Suppliers are an org-level entity — a contractor's directory of companies they buy from.

```sql
CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                    -- "ABC Landscape Supply"
  contact_name TEXT DEFAULT '',                 -- "Mike at the counter"
  phone       TEXT DEFAULT '',
  email       TEXT DEFAULT '',                  -- for RFQ delivery
  address     TEXT DEFAULT '',
  website     TEXT DEFAULT '',
  categories  TEXT[] DEFAULT '{}',              -- ['paver','stone','gravel'] — what they carry
  notes       TEXT DEFAULT '',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view suppliers"
  ON suppliers FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and designers can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer'))
  );

CREATE POLICY "Admins and designers can update suppliers"
  ON suppliers FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));

CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'));
```

### 3.2 New Table: `supplier_prices`

Links a material to a supplier with a price. Same material can have multiple supplier-price records.

```sql
CREATE TABLE supplier_prices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  supplier_id   UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  unit_cost     NUMERIC(12,2) NOT NULL,          -- supplier's price per unit
  sku           TEXT DEFAULT '',                  -- supplier's SKU for this item
  lead_time_days INTEGER DEFAULT NULL,
  min_order_qty  NUMERIC(10,2) DEFAULT NULL,      -- minimum order quantity
  notes         TEXT DEFAULT '',
  is_preferred  BOOLEAN DEFAULT false,            -- contractor's preferred supplier for this item
  quoted_at     TIMESTAMPTZ DEFAULT now(),        -- when this price was last confirmed
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(material_id, supplier_id)               -- one price per supplier per material
);

-- RLS (same pattern as suppliers)
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view supplier_prices"
  ON supplier_prices FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and designers can insert supplier_prices"
  ON supplier_prices FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer'))
  );

CREATE POLICY "Admins and designers can update supplier_prices"
  ON supplier_prices FOR UPDATE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));

CREATE POLICY "Admins can delete supplier_prices"
  ON supplier_prices FOR DELETE
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role = 'admin'));
```

### 3.3 New Table: `quote_requests`

Tracks RFQs sent to suppliers for a specific project's manifest.

```sql
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
  total_quoted  NUMERIC(12,2) DEFAULT NULL,       -- supplier's total (filled when quote received)
  notes         TEXT DEFAULT '',
  pdf_url       TEXT DEFAULT '',                   -- stored PDF of the RFQ sent
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS (same org pattern)
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view quote_requests"
  ON quote_requests FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins and designers can manage quote_requests"
  ON quote_requests FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'designer')));
```

### 3.4 New Table: `quote_request_items`

Line items on a quote request — mirrors the manifest but with supplier pricing columns.

```sql
CREATE TABLE quote_request_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  material_name   TEXT NOT NULL,                   -- denormalized for PDF generation
  quantity        NUMERIC(10,2) NOT NULL,
  unit            TEXT NOT NULL,
  estimated_cost  NUMERIC(12,2) DEFAULT NULL,      -- our estimate (from material library)
  quoted_cost     NUMERIC(12,2) DEFAULT NULL,      -- supplier's quoted price per unit
  quoted_total    NUMERIC(12,2) DEFAULT NULL,      -- qty × quoted_cost
  notes           TEXT DEFAULT ''
);

-- No separate RLS needed — cascades from quote_requests
ALTER TABLE quote_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via quote_request"
  ON quote_request_items FOR ALL
  USING (
    quote_request_id IN (
      SELECT id FROM quote_requests
      WHERE org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
    )
  );
```

### 3.5 Material Table Cleanup

Remove supplier fields from `materials` table (they move to `suppliers` + `supplier_prices`):

```sql
-- These columns are being replaced by the suppliers + supplier_prices tables
ALTER TABLE materials
  DROP COLUMN IF EXISTS supplier_name,
  DROP COLUMN IF EXISTS supplier_sku,
  DROP COLUMN IF EXISTS supplier_phone,
  DROP COLUMN IF EXISTS supplier_contact,
  DROP COLUMN IF EXISTS lead_time_days,
  DROP COLUMN IF EXISTS price_update_date,
  DROP COLUMN IF EXISTS supplier_notes;
```

### 3.6 Zone Materials Cleanup

```sql
-- quantity column is dead code — always set to 1, never read
-- Real quantities come from computeQty() in manifest engine
-- Keep column but document it's unused (removing would break existing rows)
COMMENT ON COLUMN zone_materials.quantity IS 'DEPRECATED: Always 1. Real qty computed by manifest engine from zone geometry + material specs.';
```

---

## 4. TypeScript Types

Add to `src/types/index.ts`:

```typescript
// ── Suppliers ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  orgId: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  categories: MaterialCategory[];
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPrice {
  id: string;
  orgId: string;
  materialId: string;
  supplierId: string;
  unitCost: number;
  sku: string;
  leadTimeDays: number | null;
  minOrderQty: number | null;
  notes: string;
  isPreferred: boolean;
  quotedAt: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields (populated by fetch queries)
  supplierName?: string;
  materialName?: string;
}

// ── Quote Requests ───────────────────────────────────────────────────────────

export type QuoteRequestStatus = 'draft' | 'sent' | 'received' | 'accepted' | 'declined' | 'expired';

export interface QuoteRequest {
  id: string;
  orgId: string;
  projectId: string;
  supplierId: string;
  status: QuoteRequestStatus;
  sentAt: string | null;
  respondedAt: string | null;
  expiresAt: string | null;
  totalQuoted: number | null;
  notes: string;
  pdfUrl: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  supplierName?: string;
  projectName?: string;
}

export interface QuoteRequestItem {
  id: string;
  quoteRequestId: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  estimatedCost: number | null;
  quotedCost: number | null;
  quotedTotal: number | null;
  notes: string;
}
```

### Material Interface Cleanup

Replace the existing `Material` interface. Remove snake_case supplier fields, keep everything else:

```typescript
export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost: number;                   // default/catalog cost (used when no supplier price exists)
  reserveOverride: number | null;
  coverage: number | null;
  depthIn: number | null;
  notes: string;
  // Inventory tracking
  qtyOnHand: number;
  minStockLevel: number;
  storageLocation: string;
  lastRestocked: string;
}
```

Remove the existing stub `Supplier` interface (lines 330-336) and replace with the full version above.

---

## 5. Data Access Layer

### 5.1 New File: `src/services/supabaseSuppliers.ts`

```
Functions:
  fetchSuppliers(orgId: string): Promise<Supplier[]>
  createSupplier(orgId: string, supplier: Partial<Supplier>): Promise<Supplier | null>
  updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null>
  deleteSupplier(id: string): Promise<boolean>

  fetchSupplierPrices(orgId: string, materialId?: string): Promise<SupplierPrice[]>
  upsertSupplierPrice(orgId: string, price: Partial<SupplierPrice>): Promise<SupplierPrice | null>
  deleteSupplierPrice(id: string): Promise<boolean>
  getPreferredPrice(orgId: string, materialId: string): Promise<SupplierPrice | null>
```

### 5.2 New File: `src/services/supabaseQuotes.ts`

```
Functions:
  fetchQuoteRequests(orgId: string, projectId?: string): Promise<QuoteRequest[]>
  createQuoteRequest(orgId: string, request: Partial<QuoteRequest>, items: Partial<QuoteRequestItem>[]): Promise<QuoteRequest | null>
  updateQuoteRequestStatus(id: string, status: QuoteRequestStatus, updates?: Partial<QuoteRequest>): Promise<boolean>
  fetchQuoteRequestItems(quoteRequestId: string): Promise<QuoteRequestItem[]>
  updateQuoteRequestItem(id: string, updates: Partial<QuoteRequestItem>): Promise<boolean>
```

### 5.3 Fix: `src/services/supabaseMaterials.ts`

- Remove all `supplier_name`, `supplier_sku`, `supplier_phone`, `supplier_contact`, `lead_time_days`, `price_update_date`, `supplier_notes` field mappings
- Update `toCamelCase` / `toSnakeCase` mappers to exclude removed fields
- Ensure `fetchMaterials()` returns error state (not silent empty array)

### 5.4 Fix: `src/stores/projectStore.ts`

- Extract the direct `supabase.from('projects').update({ materials: ... })` call into `supabaseProjects.ts` as `updateProjectMaterials(projectId, orgId, materials)`
- Store action calls the new function instead of bypassing

---

## 6. Store Design

### 6.1 New Store: `src/stores/supplierStore.ts`

```typescript
interface SupplierState {
  suppliers: Supplier[];
  supplierPrices: SupplierPrice[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSuppliers: () => Promise<void>;
  addSupplier: (supplier: Partial<Supplier>) => Promise<Supplier | null>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  fetchSupplierPrices: (materialId?: string) => Promise<void>;
  upsertSupplierPrice: (price: Partial<SupplierPrice>) => Promise<void>;
  deleteSupplierPrice: (id: string) => Promise<void>;

  // Selectors
  getSupplierById: (id: string) => Supplier | undefined;
  getSuppliersForCategory: (category: MaterialCategory) => Supplier[];
  getPricesForMaterial: (materialId: string) => SupplierPrice[];
  getPreferredSupplier: (materialId: string) => SupplierPrice | undefined;
}
```

### 6.2 New Store: `src/stores/quoteStore.ts`

```typescript
interface QuoteState {
  quoteRequests: QuoteRequest[];
  activeQuoteItems: QuoteRequestItem[];  // items for the currently-viewed quote
  loading: boolean;
  error: string | null;

  // Actions
  fetchQuoteRequests: (projectId?: string) => Promise<void>;
  createQuoteRequest: (projectId: string, supplierId: string, manifestItems: ManifestItem[]) => Promise<QuoteRequest | null>;
  sendQuoteRequest: (quoteRequestId: string) => Promise<boolean>;  // marks as sent, triggers email
  fetchQuoteItems: (quoteRequestId: string) => Promise<void>;
  updateQuoteItem: (itemId: string, updates: Partial<QuoteRequestItem>) => Promise<void>;
  acceptQuote: (quoteRequestId: string) => Promise<void>;  // marks accepted, updates supplier_prices

  // Selectors
  getQuotesForProject: (projectId: string) => QuoteRequest[];
  getQuotesByStatus: (status: QuoteRequestStatus) => QuoteRequest[];
}
```

### 6.3 Update ARCHITECTURE.md Store Ownership Table

```
| Store            | Owns |
|------------------|------|
| `supplierStore`  | Suppliers, supplier prices |
| `quoteStore`     | Quote requests, quote request items |
```

---

## 7. Manifest Engine Updates

### 7.1 `src/lib/manifest.ts` Changes

The manifest engine currently uses `mat.cost` (the catalog default). Update to prefer supplier pricing:

```typescript
// New: Accept optional supplier prices to override catalog cost
export function generateManifest(
  project: Project,
  materials: Material[],
  supplierPrices?: SupplierPrice[]   // optional — falls back to mat.cost
): ManifestItem[] {
  // ... existing zone iteration logic ...

  // When building line items, resolve cost:
  // 1. If supplierPrices provided, find preferred price for this material
  // 2. Fall back to mat.cost (catalog default)
  const preferredPrice = supplierPrices?.find(
    sp => sp.materialId === mat.id && sp.isPreferred
  );
  const unitCost = preferredPrice?.unitCost ?? mat.cost;

  // Add supplier info to ManifestItem
  lineItems.push({
    ...existingFields,
    unitCost,
    supplierId: preferredPrice?.supplierId ?? null,
    supplierName: preferredPrice?.supplierName ?? null,
  });
}
```

### 7.2 ManifestItem Type Update

```typescript
export interface ManifestItem {
  materialId: string;
  materialName: string;
  zoneName: string;
  zoneId: string;            // TODO: populate correctly or remove
  qtyNeeded: number;
  reserveQty: number;
  totalOrder: number;
  unitCost: number;
  subtotal: number;
  unit: string;
  // New fields
  supplierId: string | null;
  supplierName: string | null;
}
```

---

## 8. RFQ PDF Generation

### 8.1 PDF Template

Use the existing `@react-pdf/renderer` setup in `src/components/pdf/`. Create a new template:

**File**: `src/components/pdf/QuoteRequestPDF.tsx`

The PDF should look professional and be easy for a supplier to read:

```
┌─────────────────────────────────────────────────┐
│  TERRAINFORGE                                    │
│  Material Quote Request                          │
│                                                  │
│  From: [Contractor Org Name]                     │
│  To:   [Supplier Name]                          │
│  Date: [Date]                                    │
│  Project: [Project Name] — [Address]             │
│  Requested By: [Date needed by, if set]          │
│                                                  │
│  ┌─────────────────────────────────────────────┐ │
│  │ #  Material           Qty    Unit   Est.$   │ │
│  ├─────────────────────────────────────────────┤ │
│  │ 1  Belgard Pavers     480    sqft   $3,360  │ │
│  │ 2  Concrete Mix 80lb  24     bags   $192    │ │
│  │ 3  Bermuda Sod Rolls  45     rolls  $675    │ │
│  │ ...                                         │ │
│  ├─────────────────────────────────────────────┤ │
│  │                  Estimated Total:  $18,400   │ │
│  └─────────────────────────────────────────────┘ │
│                                                  │
│  Notes: [Any project-specific notes]             │
│                                                  │
│  Please reply with your quoted prices to:        │
│  [contractor email] or [contractor phone]        │
│                                                  │
│  Generated by TerrainForge                       │
└─────────────────────────────────────────────────┘
```

### 8.2 Email Delivery

For Phase 1, use a simple approach: generate the PDF client-side, then open the user's default email client with the PDF attached (via `mailto:` link) or provide a "Copy Email" + "Download PDF" flow.

A Supabase Edge Function for direct email send (via Resend) is a Phase 1.5 stretch goal — only build if time permits.

**Phase 1 flow:**
1. Contractor clicks "Request Quote" on a manifest
2. Picks 1-3 suppliers from their directory
3. TerrainForge generates a PDF per supplier
4. Contractor downloads the PDFs
5. Contractor emails them (their email client, their relationship)
6. Quote request status tracked in TerrainForge

---

## 9. UI Design

### 9.1 Supplier Directory (New Section in Materials Hub)

Add a "Suppliers" sub-tab or section to the Materials hub tab. Keep it simple:

**Supplier List View:**
```
┌─ Suppliers ──────────────────────────────────────────────────────┐
│ [+ Add Supplier]                                    [Search...] │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐│
│ │ ABC Landscape Supply          mike@abcsupply.com    Active  ││
│ │ Hardscape, Stone, Gravel      (214) 555-0123                ││
│ ├──────────────────────────────────────────────────────────────┤│
│ │ Green Valley Nursery          orders@gvnursery.com  Active  ││
│ │ Plants, Shrubs, Trees, Sod    (214) 555-0456                ││
│ ├──────────────────────────────────────────────────────────────┤│
│ │ Dallas Aggregate Co           dispatch@dallagg.com  Active  ││
│ │ Gravel, Sand, Soil, Mulch     (972) 555-0789                ││
│ └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Supplier Form Modal:** Standard form — name, contact, phone, email, address, website, category multi-select, notes.

### 9.2 Material Detail — Supplier Prices

When viewing/editing a material in the library, show a "Supplier Pricing" section:

```
┌─ Belgard Catalina Pavers ────────────────────────────────────────┐
│ Category: Paver    Unit: sqft    Default Cost: $7.00/sqft       │
│                                                                  │
│ ── Supplier Pricing ──────────────────────────────────────────── │
│                                                          [+ Add] │
│  ★ ABC Landscape Supply    $6.80/sqft   SKU: BEL-CAT-12   3 days│
│    Green Valley Nursery    $7.25/sqft   SKU: PAV-001       5 days│
│    Dallas Aggregate Co     $6.95/sqft   —                  7 days│
│                                                                  │
│ ★ = preferred supplier (used in manifest cost calculations)      │
└──────────────────────────────────────────────────────────────────┘
```

The ★ preferred flag determines which price the manifest engine uses by default.

### 9.3 Request Quote Flow (Project Dashboard)

On the Project Dashboard, in the Materials/Manifest section, add a "Request Quotes" button:

**Step 1: Select Suppliers**
```
┌─ Request Quotes — Oak Street Renovation ─────────────────────────┐
│                                                                   │
│ Select suppliers to send this manifest to:                       │
│                                                                   │
│ [✓] ABC Landscape Supply     Hardscape, Stone           ✉ Email │
│ [✓] Green Valley Nursery     Plants, Sod                ✉ Email │
│ [ ] Dallas Aggregate Co      Gravel, Sand               ✉ Email │
│                                                                   │
│ Manifest: 23 line items, estimated total $18,400                 │
│                                                                   │
│                          [Cancel]  [Generate & Download PDFs]    │
└──────────────────────────────────────────────────────────────────┘
```

**Step 2: Download PDFs**
- Generates one PDF per selected supplier
- Each PDF contains the full manifest with quantities
- Contractor downloads and emails them via their own email client

**Step 3: Track Status**
- Quote requests show in a "Quotes" section on the Project Dashboard
- Status badges: Draft → Sent → Received → Accepted/Declined/Expired

### 9.4 Materials Hub Tab Update

The existing Materials tab at `/materials` currently shows: KPI cards → alert banner → material table.

Add a second section or sub-tab navigation:

```
[Material Library]  [Suppliers]
```

- **Material Library**: Existing view (KPIs, table, CRUD) — no change except supplier pricing section on material detail
- **Suppliers**: New supplier directory view

---

## 10. Migration File

**File**: `supabase/migrations/016_suppliers_and_quotes.sql`

Contains all SQL from Section 3 above (tables, RLS, column drops, comments), in order:

1. Create `suppliers` table + RLS
2. Create `supplier_prices` table + RLS
3. Create `quote_requests` table + RLS
4. Create `quote_request_items` table + RLS
5. Drop deprecated supplier columns from `materials`
6. Add deprecation comment to `zone_materials.quantity`

---

## 11. Implementation Order

### Step 1: Data Model + Types (do first, everything depends on this)
1. Write migration `016_suppliers_and_quotes.sql`
2. Update `src/types/index.ts` — add Supplier, SupplierPrice, QuoteRequest, QuoteRequestItem types; clean Material interface
3. Create `src/services/supabaseSuppliers.ts`
4. Create `src/services/supabaseQuotes.ts`
5. Fix `src/services/supabaseMaterials.ts` — remove supplier field mappings
6. Fix `src/stores/projectStore.ts` — extract direct Supabase call to service function

### Step 2: Stores
7. Create `src/stores/supplierStore.ts`
8. Create `src/stores/quoteStore.ts`
9. Update `src/stores/materialStore.ts` if needed (remove supplier field handling)

### Step 3: Manifest Engine
10. Update `src/lib/manifest.ts` — add optional `supplierPrices` param
11. Update `ManifestItem` type with supplier fields
12. Update any pages that call `generateManifest()` to pass supplier prices when available

### Step 4: UI — Supplier Directory
13. Create `src/components/materials/SupplierTable.tsx`
14. Create `src/components/materials/SupplierFormModal.tsx`
15. Update `src/pages/MaterialLibrary.tsx` — add Suppliers sub-tab
16. Create `src/components/materials/SupplierPriceSection.tsx` (for material detail view)
17. Update `MaterialFormModal.tsx` — add supplier pricing section

### Step 5: UI — RFQ Flow
18. Create `src/components/pdf/QuoteRequestPDF.tsx`
19. Create `src/components/project-dashboard/QuoteRequestModal.tsx` (supplier selection + PDF generation)
20. Create `src/components/project-dashboard/QuoteStatusPanel.tsx` (status tracking on project dashboard)
21. Wire into Project Dashboard materials section

### Step 6: Verification
22. Run migration on staging Supabase
23. Verify RLS policies (all 4 roles)
24. Test manifest generation with and without supplier prices
25. Test PDF generation and download
26. Test full RFQ flow: create supplier → add pricing → generate manifest → request quote → download PDF
27. Verify no regressions on existing material library, project wizard, budget tab
28. `npm run build` passes with zero errors

---

## 12. Files to Create

| File | Type | LOC Est. |
|------|------|----------|
| `supabase/migrations/016_suppliers_and_quotes.sql` | Migration | ~120 |
| `src/services/supabaseSuppliers.ts` | Data access | ~180 |
| `src/services/supabaseQuotes.ts` | Data access | ~150 |
| `src/stores/supplierStore.ts` | Zustand store | ~120 |
| `src/stores/quoteStore.ts` | Zustand store | ~100 |
| `src/components/materials/SupplierTable.tsx` | UI component | ~120 |
| `src/components/materials/SupplierFormModal.tsx` | UI component | ~180 |
| `src/components/materials/SupplierPriceSection.tsx` | UI component | ~100 |
| `src/components/pdf/QuoteRequestPDF.tsx` | PDF template | ~150 |
| `src/components/project-dashboard/QuoteRequestModal.tsx` | UI component | ~200 |
| `src/components/project-dashboard/QuoteStatusPanel.tsx` | UI component | ~120 |

## 13. Files to Modify

| File | Change |
|------|--------|
| `src/types/index.ts` | Add new types, clean Material interface, replace Supplier stub |
| `src/services/supabaseMaterials.ts` | Remove supplier field mappings |
| `src/stores/projectStore.ts` | Extract direct Supabase call |
| `src/stores/materialStore.ts` | Remove supplier field handling if needed |
| `src/lib/manifest.ts` | Add optional supplierPrices param |
| `src/pages/MaterialLibrary.tsx` | Add Suppliers sub-tab, supplier price section |
| `src/lib/constants.ts` | No changes needed |
| `.claude/ARCHITECTURE.md` | Update store ownership table |
| `CLAUDE.md` | Update file organization section |

---

## 14. What NOT to Build Yet

- **Supplier portal / login** — Suppliers don't need accounts. They get PDFs via email.
- **Automated email send** — Phase 1 uses download + manual email. Edge Function is Phase 1.5.
- **Quote ingestion / parsing** — Phase 2 feature (AI-powered PDF/email parsing).
- **Quote comparison grid** — Phase 2 (needs quotes to exist first).
- **Purchase orders** — Phase 3.
- **Historical pricing analytics** — Phase 4.
- **Supplier rating/scoring** — Not planned yet.

---

## 15. Naming Conventions Reminder

- **Database columns**: `snake_case` (org_id, unit_cost, lead_time_days)
- **TypeScript interfaces**: `camelCase` (orgId, unitCost, leadTimeDays)
- **Mapping**: All in supabaseSuppliers.ts / supabaseQuotes.ts — no snake_case leaks into types
- **Components**: PascalCase (SupplierTable.tsx, QuoteRequestModal.tsx)
- **Stores**: camelCase (supplierStore.ts), hooks as `useSupplierStore`
- **NEVER use Postgres ENUM types** — TEXT + CHECK constraints only
- **Every table MUST have org_id** and RLS policies
