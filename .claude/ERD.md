# TerrainForge — Entity Relationship Diagram

> Complete database schema as of migration 021 (2026-04-07)
> 35 tables, 80+ RLS policies, all tenant-isolated via org_id

---

## Visual ERD

```
                                    ┌─────────────────────┐
                                    │    auth.users        │
                                    │ (Supabase managed)   │
                                    └──────────┬──────────┘
                                               │ owner_id / user_id
                          ┌────────────────────┼────────────────────┐
                          │                    │                    │
                          ▼                    ▼                    ▼
               ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
               │  organizations   │  │ organization_    │  │  dashboard_      │
               │                  │  │ members          │  │  config          │
               │ id (PK)          │  │                  │  │                  │
               │ name             │  │ org_id (FK)──────┤  │ org_id (FK)──────┤
               │ slug (UNIQUE)    │  │ user_id (FK)     │  │ user_id (FK)     │
               │ owner_id (FK)    │  │ role             │  │ widget_config    │
               │ subscription_*   │  │ UNIQUE(org,user) │  │ UNIQUE(org,user) │
               │ trial_*          │  └──────────────────┘  └──────────────────┘
               │ default_rates    │
               │ disposal_rates   │  ┌──────────────────┐
               └────────┬─────────┘  │   invitations    │
                        │            │                  │
            org_id FK on ALL ──────► │ org_id (FK)      │
            tables below             │ email, role      │
                        │            │ token (UNIQUE)   │
         ┌──────────────┼───────────┐└──────────────────┘
         │              │           │
         ▼              ▼           ▼
┌────────────────┐ ┌─────────┐ ┌────────────────┐
│   projects     │ │  crew_  │ │   equipment    │
│                │ │ members │ │                │
│ id (PK)        │ │         │ │ id (PK)        │
│ org_id (FK)    │ │ id (PK) │ │ org_id (FK)    │
│ name           │ │ org_id  │ │ name, type     │
│ client_*       │ │ name    │ │ status         │
│ address, lat/  │ │ role    │ │ assigned_      │
│ lng            │ │ skills  │ │ project_id(FK) │
│ status         │ │ avail.  │ │ operator_id(FK)│
│ start/target   │ │ phone   │ │ hours, rates   │
│ budget fields  │ │ user_id │ │ maintenance_*  │
│ materials JSONB│ │ email   │ │ capabilities   │
│ checklist JSONB│ │ pin_hash│ └───────┬────────┘
│ site intel     │ └────┬────┘         │
│ lifecycle      │      │              │
└───────┬────────┘      │              │
        │               │              │
        │    ┌──────────┴──────────┐   │
        │    │                     │   │
        ▼    ▼                     ▼   ▼
┌────────────────────┐  ┌─────────────────────┐
│ project_crew_      │  │  schedule_entries    │
│ assignments        │  │                     │
│                    │  │ id (PK)             │
│ project_id (FK)    │  │ org_id (FK)         │
│ crew_member_id(FK) │  │ project_id (FK)     │
│ role_on_project    │  │ crew_member_id (FK)  │
│ UNIQUE(proj,crew)  │  │ equipment_id (FK)    │
└────────────────────┘  │ scheduled_date       │
                        │ start/end_time       │
                        │ status               │
                        └──────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
          ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
          │ crew_status  │ │ crew_       │ │ crew_photos  │
          │              │ │ checklist_  │ │              │
          │ crew_member  │ │ progress    │ │ schedule_    │
          │ _id (FK)     │ │             │ │ entry_id(FK) │
          │ schedule_    │ │ schedule_   │ │ crew_member  │
          │ entry_id(FK) │ │ entry_id    │ │ _id (FK)     │
          │ status       │ │ crew_member │ │ storage_path │
          │ lat, lng     │ │ _id (FK)    │ │ caption      │
          └──────────────┘ │ zone_id(FK) │ └──────────────┘
                           │ step_number │
                           └─────────────┘

        ┌──────── projects (continued) ────────┐
        │                                      │
        ▼                                      ▼
┌────────────────┐                    ┌────────────────────┐
│ project_tasks  │                    │ project_elements   │
│                │                    │ (measurement-      │
│ id (PK)        │                    │  driven arch.)     │
│ project_id(FK) │                    │                    │
│ zone_id (FK)   │                    │ id (PK)            │
│ name, desc     │                    │ project_id (FK)    │
│ phase          │                    │ element_type       │
│ sequence_num   │                    │ length/width/area  │
│ status         │                    │ linear/height/depth│
│ assigned_crew  │                    │ computed_area_sqft │
│ est/actual hrs │                    │ name, sequence     │
│ depends_on[]   │                    └────────┬───────────┘
│ ai_generated   │                             │
└────────────────┘                             ▼
                                    ┌──────────────────────┐
                                    │ project_element_     │
                                    │ materials (junction)  │
                                    │                      │
                                    │ element_id (FK)      │
                                    │ material_id (FK)─────┼──┐
                                    │ name, category       │  │
                                    │ quantity, unit       │  │
                                    │ unit_cost, depth_in  │  │
                                    └──────────────────────┘  │
                                                              │
        ┌──────── projects (continued) ────────┐              │
        │              │            │          │              │
        ▼              ▼            ▼          │              │
┌──────────────┐ ┌───────────┐ ┌──────────┐   │              │
│ project_     │ │ project_  │ │ project_ │   │              │
│ subcontract. │ │ permits   │ │ site_    │   │              │
│              │ │           │ │ conditions│  │              │
│ company_name │ │ permit_   │ │           │  │              │
│ trade, scope │ │ type      │ │ condition │  │              │
│ quoted/actual│ │ status    │ │ _type     │  │              │
│ cost         │ │ fee       │ │ label,    │  │              │
│ status       │ │ inspect_* │ │ value     │  │              │
└──────────────┘ └───────────┘ │ ai_infer. │  │              │
                               └───────────┘  │              │
                                              │              │
        ┌──────── projects (continued) ────────┘              │
        │              │                                      │
        ▼              ▼                                      │
┌──────────────┐ ┌───────────────┐                           │
│ project_     │ │   zones       │                           │
│ documents    │ │  (LEGACY)     │                           │
│              │ │               │                           │
│ file_name    │ │ area_sqft     │                           │
│ storage_path │ │ perimeter     │                           │
│ document_type│ │ sequence      │                           │
└──────────────┘ └───────┬───────┘                           │
                         │                                    │
              ┌──────────┼──────────┐                        │
              ▼                     ▼                        │
     ┌────────────────┐  ┌──────────────────┐               │
     │ zone_materials │  │ zone_equipment   │               │
     │ (LEGACY junct.)│  │ (LEGACY junct.)  │               │
     │                │  │                  │               │
     │ zone_id (FK)   │  │ zone_id (FK)     │               │
     │ material_id(FK)│  │ equipment_id(FK) │               │
     └───────┬────────┘  └──────────────────┘               │
             │                                               │
             ▼                                               │
┌──────────────────────┐                                     │
│    materials         │◄────────────────────────────────────┘
│ (org catalog)        │
│                      │
│ id (PK)              │
│ org_id (FK)          │
│ name, category       │
│ unit, cost           │
│ coverage, depth_in   │
│ qty_on_hand          │
│ min_stock_level      │
└──────────┬───────────┘
           │
     ┌─────┼─────────────────────┐
     ▼     ▼                     ▼
┌──────────────┐  ┌────────────────────┐  ┌──────────────────┐
│ supplier_    │  │ supplier_price_    │  │   suppliers      │
│ prices       │  │ history            │  │                  │
│              │  │                    │  │ id (PK)          │
│ material_id  │  │ material_id (FK)   │  │ org_id (FK)      │
│ supplier_id  │  │ supplier_id (FK)   │  │ name, contact    │
│ unit_cost    │  │ unit_cost          │  │ phone, email     │
│ is_preferred │  │ recorded_at        │  │ categories[]     │
│ UNIQUE(m,s)  │  │ source             │  │ is_active        │
└──────────────┘  └────────────────────┘  └────────┬─────────┘
                                                    │
                                          ┌─────────┘
                                          ▼
                                ┌──────────────────┐
                                │ quote_requests   │
                                │                  │
                                │ project_id (FK)  │
                                │ supplier_id (FK) │
                                │ status           │
                                │ total_quoted     │
                                └────────┬─────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │ quote_request_   │
                                │ items            │
                                │                  │
                                │ quote_request_id │
                                │ material_id (FK) │
                                │ quantity, unit   │
                                │ estimated/quoted │
                                └──────────────────┘

┌──────────────────┐  ┌──────────────────┐
│  crew_           │  │ maintenance_log  │
│ certifications   │  │                  │
│                  │  │ equipment_id(FK) │
│ crew_id (FK)     │  │ service_date     │
│ label            │  │ service_type     │
│ expiry_date      │  │ hours, cost      │
└──────────────────┘  │ performed_by(FK) │
                      │ next_due_date    │
┌──────────────────┐  └──────────────────┘
│   audit_log      │
│                  │
│ org_id (FK)      │
│ user_id (FK)     │
│ action           │
│ entity_type/id   │
│ metadata JSONB   │
└──────────────────┘

┌──────────────────┐
│   clients        │
│                  │
│ org_id (FK)      │
│ name, email      │
│ phone, address   │
│ notes            │
└──────────────────┘
```

---

## Table Summary (35 tables)

| # | Table | Purpose | org_id? | Type |
|---|-------|---------|---------|------|
| 1 | organizations | Root tenant entity | IS the org | Root |
| 2 | organization_members | User↔org mapping + roles | FK | Bridge |
| 3 | projects | Project root with budget/lifecycle | Yes | Aggregate Root |
| 4 | project_tasks | Work breakdown by phase | Yes | Child |
| 5 | project_elements | Measurable areas (patio, wall, etc.) | Yes | Child |
| 6 | project_element_materials | Element↔material junction | Yes | Junction |
| 7 | project_subcontractors | Sub-contractor tracking | Yes | Child |
| 8 | project_permits | Permit/inspection tracking | Yes | Child |
| 9 | project_site_conditions | Site intelligence | Yes | Child |
| 10 | project_documents | File uploads | Yes | Child |
| 11 | project_materials | Project-level material entries | Yes | Child (unused?) |
| 12 | project_crew_assignments | Crew↔project mapping | Yes | Junction |
| 13 | zones | Legacy project subdivisions | Yes | Child (LEGACY) |
| 14 | zone_materials | Zone↔material junction | No (via zone FK) | Junction (LEGACY) |
| 15 | zone_equipment | Zone↔equipment junction | No (via zone FK) | Junction (LEGACY) |
| 16 | crew_members | Team roster | Yes | Entity |
| 17 | crew_certifications | Professional licenses | No (via crew FK) | Child |
| 18 | crew_status | Real-time crew tracking | Yes | State |
| 19 | crew_checklist_progress | Work order step tracking | Yes | Junction |
| 20 | crew_photos | Progress photo evidence | Yes | Child |
| 21 | equipment | Machinery inventory | Yes | Entity |
| 22 | maintenance_log | Service history | No (via equip FK) | Child |
| 23 | materials | Org material catalog | Yes | Entity |
| 24 | suppliers | Supplier master list | Yes | Entity |
| 25 | supplier_prices | Current supplier pricing | Yes | Junction |
| 26 | supplier_price_history | Price trend tracking | Yes | Log |
| 27 | quote_requests | RFQ workflow | Yes | Workflow |
| 28 | quote_request_items | RFQ line items | No (via quote FK) | Child |
| 29 | schedule_entries | Crew scheduling | Yes | Entity |
| 30 | clients | Customer profiles | Yes | Entity |
| 31 | dashboard_config | Per-user widget prefs | Yes | Config |
| 32 | invitations | Team onboarding | Yes | Transient |
| 33 | audit_log | Activity tracking | Yes | Log |
| 34 | auth.users | Supabase auth | N/A | System |
| 35 | user_preferences | Onboarding + settings | Yes | Config |

---

## JSONB Columns (embedded structured data)

| Table | Column | Contains |
|-------|--------|----------|
| projects | materials | ProjectMaterial[] — id, materialId, name, category, qty, unit, cost |
| projects | checklist | 8 boolean flags (permit, utility, deposit, design, access, materials, crew, equipment) |
| crew_members | skills | string[] of skill names |
| crew_members | availability | {mon, tue, wed, thu, fri, sat, sun} booleans |
| crew_members | booked_dates | string[] of date ranges |
| equipment | capabilities | string[] |
| organizations | disposal_rates | Record<string, number> |
| dashboard_config | widget_config | WidgetConfig[] |
| audit_log | metadata | arbitrary action context |
| zones | dependencies | string[] of zone IDs |
| project_tasks | depends_on | UUID[] of task IDs |

---

## Identified Inefficiencies

### 1. MATERIALS STORED IN THREE PLACES (Critical)
- `materials` table → org catalog (unit costs, inventory)
- `projects.materials` JSONB → project-level quantities (wizard output)
- `project_element_materials` table → element-attached quantities (measurement-driven)

**Problem:** No automatic sync. A project can have materials in JSONB that don't match element-material rows. The manifest engine picks one source based on priority, but edits on the dashboard only update JSONB, not element-materials.

### 2. LEGACY ZONE SYSTEM (3 tables to remove)
- `zones`, `zone_materials`, `zone_equipment` are fully superseded by `project_elements` + `project_element_materials`
- Still queried by `fetchProjectFull()` and returned in every project load
- Still rendered in some components
- Wastes query time and adds confusion

### 3. REDUNDANT `project_materials` TABLE
- Migration 010 created `project_materials` as a separate table
- Migration 004 added `projects.materials` JSONB column
- Both store the same concept — project-level material entries
- The JSONB column is the one actually used; the table appears unused

### 4. EQUIPMENT HAS TWO TYPE COLUMNS
- `equipment.type` — original, TEXT with CHECK (9 values)
- `equipment.equipment_type` — added in migration 014 with different CHECK (9 slug values)
- Migration 018 expanded the `type` CHECK to 75+ values
- `equipment_type` column is redundant and confusing

### 5. MISSING org_id ON 5 TABLES
- `crew_certifications` — relies on crew_members FK
- `maintenance_log` — relies on equipment FK
- `quote_request_items` — relies on quote_requests FK
- `zone_equipment` — relies on zones FK (legacy)
- `zone_materials` — relies on zones FK (legacy)

RLS policies use JOINs through parent tables, which is slower and more complex.

### 6. MISSING INDEXES ON FK COLUMNS
- `project_elements.org_id`
- `project_materials.org_id`
- `quote_requests.org_id` and `quote_requests.project_id`
- `supplier_prices.org_id`
- `suppliers.org_id`

### 7. CLIENT DATA SPLIT
- `clients` table exists with name, email, phone, address
- `projects` table ALSO has `client_name`, `client_phone`, `client_email` inline
- `projects.client_id` FK to clients table exists but is nullable and rarely used
- Result: client info is duplicated and unsynchronized

### 8. CREW CERTS EMBEDDED AND TABLED
- `crew_certifications` table exists in the DB
- `CrewMember.certs[]` array exists in the TypeScript type
- The frontend reads certs from the embedded array, not the table
- The table may be unused or populated separately
