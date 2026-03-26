-- TerrainForge SaaS Platform - Initial Schema Migration
-- Multi-tenant database with Row Level Security (RLS)
-- Run this migration against a Supabase PostgreSQL database
-- Created: 2026-03-25

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS (Check constraints for type safety)
-- ============================================================================

-- Organization subscription tiers
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');

-- User roles within an organization
CREATE TYPE org_role AS ENUM ('admin', 'designer', 'foreman', 'client');

-- Project checklist statuses
CREATE TYPE checklist_item AS ENUM (
  'permit',
  'utility_locate',
  'deposit',
  'design',
  'site_access',
  'materials',
  'crew',
  'equipment'
);

-- Crew member roles
CREATE TYPE crew_role AS ENUM ('foreman', 'lead', 'installer', 'laborer', 'specialist', 'apprentice');

-- Equipment status
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service');

-- Maintenance service types
CREATE TYPE maintenance_type AS ENUM (
  'oil_change',
  'filter_replacement',
  'inspection',
  'repair',
  'calibration',
  'wheel_alignment',
  'certification',
  'cleaning',
  'preventive'
);

-- Equipment types
CREATE TYPE equipment_type AS ENUM (
  'excavator',
  'loader',
  'compactor',
  'grader',
  'skid_steer',
  'telehandler',
  'roller',
  'trencher',
  'blower',
  'generator',
  'pump',
  'sprayer',
  'utility_vehicle',
  'trailer'
);

-- Material categories
CREATE TYPE material_category AS ENUM (
  'soil_amendments',
  'mulch',
  'stone',
  'sand',
  'gravel',
  'hardscape',
  'pavers',
  'stone_slab',
  'edging',
  'geotextile',
  'landscape_fabric',
  'plants',
  'trees',
  'shrubs',
  'turf_seed',
  'fertilizer',
  'pesticide',
  'irrigation',
  'misc_supplies'
);

-- Unit types for materials
CREATE TYPE unit_type AS ENUM ('sqft', 'lnft', 'bag', 'cuyd', 'ton', 'each', 'gallon', 'lb');

-- Audit log actions
CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'view',
  'export',
  'import',
  'share',
  'unshare'
);

-- ============================================================================
-- ORGANIZATIONS & AUTHENTICATION
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier subscription_tier NOT NULL DEFAULT 'starter',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')
);

CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Organization membership
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'designer',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON organization_members(org_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- Invitations for new team members
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_role NOT NULL DEFAULT 'designer',
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);

-- ============================================================================
-- CLIENTS (Landscaping company's customers)
-- ============================================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT email_format CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_clients_org_id ON clients(org_id);
CREATE INDEX idx_clients_email ON clients(email);

-- ============================================================================
-- MATERIALS LIBRARY
-- ============================================================================

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category material_category NOT NULL,
  unit_type unit_type NOT NULL,
  cost NUMERIC(12, 2) NOT NULL CHECK (cost >= 0),
  reserve_override_pct NUMERIC(5, 2) DEFAULT 0 CHECK (reserve_override_pct >= 0 AND reserve_override_pct <= 100),
  coverage NUMERIC(10, 2),
  depth_in NUMERIC(5, 2),
  notes TEXT,

  -- Supplier information
  supplier_name TEXT,
  supplier_sku TEXT,
  supplier_phone TEXT,
  supplier_contact TEXT,
  lead_time_days INTEGER CHECK (lead_time_days >= 0),
  price_update_date DATE,
  supplier_notes TEXT,

  -- Inventory
  qty_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (qty_on_hand >= 0),
  min_stock_level NUMERIC(12, 2) DEFAULT 0 CHECK (min_stock_level >= 0),
  storage_location TEXT,
  last_restocked TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_materials_org_id ON materials(org_id);
CREATE INDEX idx_materials_category ON materials(category);
CREATE INDEX idx_materials_name ON materials(org_id, name);

-- ============================================================================
-- CREW MANAGEMENT
-- ============================================================================

CREATE TABLE crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role crew_role NOT NULL,
  skills JSONB DEFAULT '[]'::jsonb,
  availability JSONB DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false,"sun":false}'::jsonb,
  max_projects INTEGER DEFAULT 5 CHECK (max_projects > 0),
  notes TEXT,
  booked_dates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crew_members_org_id ON crew_members(org_id);
CREATE INDEX idx_crew_members_role ON crew_members(role);

-- Crew certifications
CREATE TABLE crew_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crew_certifications_crew_id ON crew_certifications(crew_id);

-- ============================================================================
-- EQUIPMENT MANAGEMENT
-- ============================================================================

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type equipment_type NOT NULL,
  make_model TEXT,
  year INTEGER CHECK (year >= 1990 AND year <= extract(year from now())::integer + 1),
  serial_number TEXT,
  license_plate TEXT,
  status equipment_status NOT NULL DEFAULT 'available',
  assigned_project_id UUID,
  location TEXT,
  operator_id UUID REFERENCES crew_members(id) ON DELETE SET NULL,
  hours NUMERIC(10, 2) DEFAULT 0 CHECK (hours >= 0),
  service_due_hours NUMERIC(10, 2) CHECK (service_due_hours >= 0),
  last_service_date DATE,
  next_service_date DATE,
  maint_notes TEXT,
  equipment_value NUMERIC(15, 2) CHECK (equipment_value >= 0),
  daily_rate NUMERIC(10, 2) CHECK (daily_rate >= 0),
  insurance_provider TEXT,
  insurance_expiry DATE,
  registration_expiry DATE,
  inspection_due_date DATE,
  notes TEXT,
  capabilities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_org_id ON equipment(org_id);
CREATE INDEX idx_equipment_type ON equipment(type);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_assigned_project ON equipment(assigned_project_id);
CREATE INDEX idx_equipment_operator ON equipment(operator_id);

-- Maintenance log for equipment
CREATE TABLE maintenance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type maintenance_type NOT NULL,
  hours NUMERIC(10, 2) CHECK (hours >= 0),
  notes TEXT,
  cost NUMERIC(12, 2) DEFAULT 0 CHECK (cost >= 0),
  performed_by UUID REFERENCES crew_members(id) ON DELETE SET NULL,
  next_due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_log_equipment_id ON maintenance_log(equipment_id);
CREATE INDEX idx_maintenance_log_service_date ON maintenance_log(service_date);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  address TEXT,
  total_area_sqft NUMERIC(12, 2) CHECK (total_area_sqft > 0),
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  budget NUMERIC(15, 2) CHECK (budget >= 0),
  notes TEXT,

  -- Checklist items (replaced boolean flags with JSONB for flexibility)
  checklist JSONB DEFAULT '{
    "permit": false,
    "utility_locate": false,
    "deposit": false,
    "design": false,
    "site_access": false,
    "materials": false,
    "crew": false,
    "equipment": false
  }'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_dates CHECK (target_date >= start_date)
);

CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_target_date ON projects(target_date);

-- ============================================================================
-- ZONES (Project subdivisions)
-- ============================================================================

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_sqft NUMERIC(12, 2) CHECK (area_sqft > 0),
  perimeter_lnft NUMERIC(12, 2) CHECK (perimeter_lnft > 0),
  sequence_number INTEGER DEFAULT 0,
  crew_assignment TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_zones_org_id ON zones(org_id);
CREATE INDEX idx_zones_project_id ON zones(project_id);
CREATE INDEX idx_zones_sequence ON zones(project_id, sequence_number);

-- Zone materials (many-to-many)
CREATE TABLE zone_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(zone_id, material_id)
);

CREATE INDEX idx_zone_materials_zone_id ON zone_materials(zone_id);
CREATE INDEX idx_zone_materials_material_id ON zone_materials(material_id);

-- Zone equipment (many-to-many)
CREATE TABLE zone_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(zone_id, equipment_id)
);

CREATE INDEX idx_zone_equipment_zone_id ON zone_equipment(zone_id);
CREATE INDEX idx_zone_equipment_equipment_id ON zone_equipment(equipment_id);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- DASHBOARD CONFIGURATION (per user, per organization)
-- ============================================================================

CREATE TABLE dashboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_config JSONB DEFAULT '{
    "projects": true,
    "zones": true,
    "crew": true,
    "equipment": true,
    "materials": true,
    "upcoming_tasks": true,
    "maintenance_alerts": true,
    "budget_overview": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_dashboard_config_org_id ON dashboard_config(org_id);
CREATE INDEX idx_dashboard_config_user_id ON dashboard_config(user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get the organization ID for the current user
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT org_id
    FROM organization_members
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has a specific role in the organization
CREATE OR REPLACE FUNCTION user_has_role(p_org_id UUID, p_role org_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND (
        role = p_role
        OR role = 'admin'
      )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is admin in organization
CREATE OR REPLACE FUNCTION user_is_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(p_org_id, 'admin');
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
BEFORE UPDATE ON materials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_members_updated_at
BEFORE UPDATE ON crew_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crew_certifications_updated_at
BEFORE UPDATE ON crew_certifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON equipment
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_log_updated_at
BEFORE UPDATE ON maintenance_log
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at
BEFORE UPDATE ON zones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_config_updated_at
BEFORE UPDATE ON dashboard_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS RLS
-- ============================================================================

-- Users can view their own organizations
CREATE POLICY org_view_own
ON organizations FOR SELECT
USING (
  auth.uid() = owner_id
  OR EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = organizations.id
      AND user_id = auth.uid()
  )
);

-- Only owners can update organizations
CREATE POLICY org_update_own
ON organizations FOR UPDATE
USING (auth.uid() = owner_id);

-- Only owners can delete organizations
CREATE POLICY org_delete_own
ON organizations FOR DELETE
USING (auth.uid() = owner_id);

-- ============================================================================
-- ORGANIZATION MEMBERS RLS
-- ============================================================================

-- Users can view members of their organizations
CREATE POLICY org_members_view
ON organization_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.org_id = organization_members.org_id
      AND om.user_id = auth.uid()
  )
);

-- Admins can insert new members
CREATE POLICY org_members_insert
ON organization_members FOR INSERT
WITH CHECK (
  user_is_admin(org_id)
);

-- Admins can update member roles
CREATE POLICY org_members_update
ON organization_members FOR UPDATE
USING (
  user_is_admin(org_id)
);

-- Admins can delete members
CREATE POLICY org_members_delete
ON organization_members FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- INVITATIONS RLS
-- ============================================================================

-- Users can view invitations for their organizations (or emails they're invited to)
CREATE POLICY invitations_view
ON invitations FOR SELECT
USING (
  user_is_admin(org_id)
  OR email = auth.jwt() ->> 'email'
);

-- Admins can create invitations
CREATE POLICY invitations_create
ON invitations FOR INSERT
WITH CHECK (
  user_is_admin(org_id)
);

-- Admins can delete invitations
CREATE POLICY invitations_delete
ON invitations FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- CLIENTS RLS
-- ============================================================================

-- Users in organization can view clients
CREATE POLICY clients_view
ON clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = clients.org_id
      AND user_id = auth.uid()
  )
);

-- Designers and admins can create clients
CREATE POLICY clients_create
ON clients FOR INSERT
WITH CHECK (
  user_has_role(org_id, 'designer')
);

-- Designers and admins can update clients
CREATE POLICY clients_update
ON clients FOR UPDATE
USING (
  user_has_role(org_id, 'designer')
);

-- Admins can delete clients
CREATE POLICY clients_delete
ON clients FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- MATERIALS RLS
-- ============================================================================

-- Users in organization can view materials
CREATE POLICY materials_view
ON materials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = materials.org_id
      AND user_id = auth.uid()
  )
);

-- Designers and admins can create/update materials
CREATE POLICY materials_create
ON materials FOR INSERT
WITH CHECK (
  user_has_role(org_id, 'designer')
);

CREATE POLICY materials_update
ON materials FOR UPDATE
USING (
  user_has_role(org_id, 'designer')
);

-- Admins can delete materials
CREATE POLICY materials_delete
ON materials FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- CREW MEMBERS RLS
-- ============================================================================

-- Users in organization can view crew members
CREATE POLICY crew_view
ON crew_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = crew_members.org_id
      AND user_id = auth.uid()
  )
);

-- Foremen and admins can create/update crew
CREATE POLICY crew_create
ON crew_members FOR INSERT
WITH CHECK (
  user_has_role(org_id, 'foreman')
);

CREATE POLICY crew_update
ON crew_members FOR UPDATE
USING (
  user_has_role(org_id, 'foreman')
);

-- Admins can delete crew
CREATE POLICY crew_delete
ON crew_members FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- CREW CERTIFICATIONS RLS
-- ============================================================================

-- Users in organization can view certifications
CREATE POLICY crew_certs_view
ON crew_certifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM crew_members cm
    INNER JOIN organization_members om ON om.org_id = cm.org_id
    WHERE cm.id = crew_certifications.crew_id
      AND om.user_id = auth.uid()
  )
);

-- Foremen and admins can manage certifications
CREATE POLICY crew_certs_create
ON crew_certifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crew_members
    WHERE id = crew_id
      AND user_has_role(org_id, 'foreman')
  )
);

CREATE POLICY crew_certs_update
ON crew_certifications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM crew_members
    WHERE id = crew_certifications.crew_id
      AND user_has_role(org_id, 'foreman')
  )
);

CREATE POLICY crew_certs_delete
ON crew_certifications FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM crew_members
    WHERE id = crew_certifications.crew_id
      AND user_has_role(org_id, 'foreman')
  )
);

-- ============================================================================
-- EQUIPMENT RLS
-- ============================================================================

-- Users in organization can view equipment
CREATE POLICY equipment_view
ON equipment FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = equipment.org_id
      AND user_id = auth.uid()
  )
);

-- Foremen and admins can create/update equipment
CREATE POLICY equipment_create
ON equipment FOR INSERT
WITH CHECK (
  user_has_role(org_id, 'foreman')
);

CREATE POLICY equipment_update
ON equipment FOR UPDATE
USING (
  user_has_role(org_id, 'foreman')
);

-- Admins can delete equipment
CREATE POLICY equipment_delete
ON equipment FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- MAINTENANCE LOG RLS
-- ============================================================================

-- Users in organization can view maintenance logs
CREATE POLICY maint_log_view
ON maintenance_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM equipment e
    INNER JOIN organization_members om ON om.org_id = e.org_id
    WHERE e.id = maintenance_log.equipment_id
      AND om.user_id = auth.uid()
  )
);

-- Foremen and admins can create/update maintenance logs
CREATE POLICY maint_log_create
ON maintenance_log FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM equipment
    WHERE id = equipment_id
      AND user_has_role(org_id, 'foreman')
  )
);

CREATE POLICY maint_log_update
ON maintenance_log FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM equipment
    WHERE id = maintenance_log.equipment_id
      AND user_has_role(org_id, 'foreman')
  )
);

-- Admins can delete maintenance logs
CREATE POLICY maint_log_delete
ON maintenance_log FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM equipment e
    WHERE e.id = maintenance_log.equipment_id
      AND user_is_admin(e.org_id)
  )
);

-- ============================================================================
-- PROJECTS RLS
-- ============================================================================

-- Users in organization can view projects
-- Clients can only view projects where they're the client
CREATE POLICY projects_view
ON projects FOR SELECT
USING (
  (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = projects.org_id
        AND user_id = auth.uid()
        AND role != 'client'
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM clients c
      INNER JOIN organization_members om ON om.org_id = c.org_id
      WHERE c.id = projects.client_id
        AND c.org_id = projects.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'client'
    )
  )
);

-- Designers and admins can create projects
CREATE POLICY projects_create
ON projects FOR INSERT
WITH CHECK (
  user_has_role(org_id, 'designer')
);

-- Designers and admins can update projects
CREATE POLICY projects_update
ON projects FOR UPDATE
USING (
  user_has_role(org_id, 'designer')
);

-- Admins can delete projects
CREATE POLICY projects_delete
ON projects FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- ZONES RLS
-- ============================================================================

-- Users can view zones of projects they can see
CREATE POLICY zones_view
ON zones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = zones.project_id
      AND (
        EXISTS (
          SELECT 1 FROM organization_members
          WHERE org_id = zones.org_id
            AND user_id = auth.uid()
            AND role != 'client'
        )
        OR
        EXISTS (
          SELECT 1 FROM clients c
          INNER JOIN organization_members om ON om.org_id = c.org_id
          WHERE c.id = p.client_id
            AND c.org_id = zones.org_id
            AND om.user_id = auth.uid()
            AND om.role = 'client'
        )
      )
  )
);

-- Foremen can create/update zones
CREATE POLICY zones_create
ON zones FOR INSERT
WITH CHECK (
  user_has_role(org_id, 'foreman')
);

CREATE POLICY zones_update
ON zones FOR UPDATE
USING (
  user_has_role(org_id, 'foreman')
);

-- Admins can delete zones
CREATE POLICY zones_delete
ON zones FOR DELETE
USING (
  user_is_admin(org_id)
);

-- ============================================================================
-- ZONE MATERIALS RLS
-- ============================================================================

-- Users can view zone materials if they can see the zone
CREATE POLICY zone_materials_view
ON zone_materials FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM zones z
    WHERE z.id = zone_materials.zone_id
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = z.project_id
          AND (
            EXISTS (
              SELECT 1 FROM organization_members
              WHERE org_id = z.org_id
                AND user_id = auth.uid()
                AND role != 'client'
            )
            OR
            EXISTS (
              SELECT 1 FROM clients c
              INNER JOIN organization_members om ON om.org_id = c.org_id
              WHERE c.id = p.client_id
                AND c.org_id = z.org_id
                AND om.user_id = auth.uid()
                AND om.role = 'client'
            )
          )
      )
  )
);

-- Foremen can manage zone materials
CREATE POLICY zone_materials_create
ON zone_materials FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM zones
    WHERE id = zone_id
      AND user_has_role(org_id, 'foreman')
  )
);

CREATE POLICY zone_materials_update
ON zone_materials FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM zones
    WHERE id = zone_materials.zone_id
      AND user_has_role(org_id, 'foreman')
  )
);

CREATE POLICY zone_materials_delete
ON zone_materials FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM zones z
    WHERE z.id = zone_materials.zone_id
      AND user_is_admin(z.org_id)
  )
);

-- ============================================================================
-- ZONE EQUIPMENT RLS
-- ============================================================================

-- Users can view zone equipment if they can see the zone
CREATE POLICY zone_equipment_view
ON zone_equipment FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM zones z
    WHERE z.id = zone_equipment.zone_id
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = z.project_id
          AND (
            EXISTS (
              SELECT 1 FROM organization_members
              WHERE org_id = z.org_id
                AND user_id = auth.uid()
                AND role != 'client'
            )
            OR
            EXISTS (
              SELECT 1 FROM clients c
              INNER JOIN organization_members om ON om.org_id = c.org_id
              WHERE c.id = p.client_id
                AND c.org_id = z.org_id
                AND om.user_id = auth.uid()
                AND om.role = 'client'
            )
          )
      )
  )
);

-- Foremen can manage zone equipment
CREATE POLICY zone_equipment_create
ON zone_equipment FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM zones
    WHERE id = zone_id
      AND user_has_role(org_id, 'foreman')
  )
);

CREATE POLICY zone_equipment_update
ON zone_equipment FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM zones
    WHERE id = zone_equipment.zone_id
      AND user_has_role(org_id, 'foreman')
  )
);

CREATE POLICY zone_equipment_delete
ON zone_equipment FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM zones z
    WHERE z.id = zone_equipment.zone_id
      AND user_is_admin(z.org_id)
  )
);

-- ============================================================================
-- AUDIT LOG RLS
-- ============================================================================

-- Users can view audit logs for their organization (admins only)
CREATE POLICY audit_log_view
ON audit_log FOR SELECT
USING (
  user_is_admin(org_id)
);

-- System can insert audit logs
CREATE POLICY audit_log_insert
ON audit_log FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- DASHBOARD CONFIG RLS
-- ============================================================================

-- Users can only view/update their own dashboard config
CREATE POLICY dashboard_config_view
ON dashboard_config FOR SELECT
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = dashboard_config.org_id
      AND user_id = auth.uid()
  )
);

-- Users can create their own config
CREATE POLICY dashboard_config_create
ON dashboard_config FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = dashboard_config.org_id
      AND user_id = auth.uid()
  )
);

-- Users can only update their own config
CREATE POLICY dashboard_config_update
ON dashboard_config FOR UPDATE
USING (
  user_id = auth.uid()
);

-- ============================================================================
-- SEED DATA COMMENTS (Manual inserts)
-- ============================================================================

/*
To seed reference data after initial migration, run these queries:

-- Material Categories (already defined as enum, but for reference):
-- soil_amendments, mulch, stone, sand, gravel, hardscape, pavers, stone_slab,
-- edging, geotextile, landscape_fabric, plants, trees, shrubs, turf_seed,
-- fertilizer, pesticide, irrigation, misc_supplies

-- Equipment Types (already defined as enum, but for reference):
-- excavator, loader, compactor, grader, skid_steer, telehandler, roller, trencher,
-- blower, generator, pump, sprayer, utility_vehicle, trailer

-- Maintenance Service Types (already defined as enum, but for reference):
-- oil_change, filter_replacement, inspection, repair, calibration, wheel_alignment,
-- certification, cleaning, preventive

-- Crew Member Roles (already defined as enum, but for reference):
-- foreman, lead, installer, laborer, specialist, apprentice

-- Organization Subscription Tiers (already defined as enum, but for reference):
-- starter, professional, enterprise

-- User Roles (already defined as enum, but for reference):
-- admin, designer, foreman, client

-- Sample insert for demonstration:
INSERT INTO organizations (name, slug, owner_id, subscription_tier)
VALUES (
  'Sample Landscaping Co',
  'sample-landscaping',
  auth.uid(),
  'professional'
);

INSERT INTO clients (org_id, name, email, phone, address)
VALUES (
  (SELECT id FROM organizations WHERE slug = 'sample-landscaping'),
  'John Residential',
  'john@example.com',
  '555-0123',
  '123 Oak Street, Denver, CO 80210'
);

INSERT INTO materials (org_id, name, category, unit_type, cost, coverage)
VALUES (
  (SELECT id FROM organizations WHERE slug = 'sample-landscaping'),
  'Premium Mulch - Dark',
  'mulch',
  'cuyd',
  45.00,
  110
);

INSERT INTO crew_members (org_id, name, role, skills, max_projects)
VALUES (
  (SELECT id FROM organizations WHERE slug = 'sample-landscaping'),
  'Juan Garcia',
  'foreman',
  '["grading", "drainage", "hardscape", "planting"]'::jsonb,
  4
);
*/

-- ============================================================================
-- GRANTS (Supabase-specific)
-- ============================================================================

-- Grant anon role minimal permissions (required by Supabase)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- All table permissions handled by RLS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
