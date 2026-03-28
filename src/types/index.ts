/**
 * TerrainForge Data Types
 * All TypeScript interfaces and types for the data model
 */

// Material category union type
export type MaterialCategory =
  | 'paver' | 'stone' | 'tile' | 'brick' | 'concrete'
  | 'sod' | 'seed' | 'mulch' | 'gravel' | 'sand' | 'soil'
  | 'edging' | 'plant' | 'shrub' | 'tree'
  | 'lighting' | 'irrigation' | 'lumber' | 'misc';

// Core data models
export interface Project {
  id: string;
  name: string;
  client: string;
  address: string;
  totalArea: number;
  startDate: string;
  targetDate: string;
  budget: number;
  notes: string;
  createdAt: string;
  checklist: {
    permit: boolean;
    utility: boolean;
    deposit: boolean;
    design: boolean;
    access: boolean;
    materials: boolean;
    crew: boolean;
    equipment: boolean;
  };
  zones: Zone[];
}

export interface Zone {
  id: string;
  name: string;
  area: number;
  perimeter: number;
  sequence: number;
  crew: string;
  dependencies: string[];
  notes: string;
  materials: ZoneMaterial[];
  equipment: ZoneEquipment[];
  createdAt: string;
}

export interface ZoneMaterial {
  materialId: string;
  name: string;
}

export interface ZoneEquipment {
  equipId: string;
  name: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  reserveOverride: number | null;
  coverage: number | null;
  depthIn: number | null;
  notes: string;
  supplier_name: string;
  supplier_sku: string;
  supplier_phone: string;
  supplier_contact: string;
  lead_time_days: number | null;
  price_update_date: string;
  supplier_notes: string;
  qtyOnHand: number;
  minStockLevel: number;
  storageLocation: string;
  lastRestocked: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: 'foreman' | 'lead' | 'installer' | 'laborer' | 'specialist' | 'apprentice';
  skills: string[];
  availability: { mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean };
  maxProjects: number;
  notes: string;
  bookedDates: string[];
  certs: CrewCert[];
}

export interface CrewCert {
  certId: string;
  label: string;
  expiry: string | null;
}

export interface Equipment {
  id: string;
  name: string;
  type: string;
  makeModel: string;
  year: number | null;
  serial: string;
  plate: string;
  status: 'available' | 'in-use' | 'maintenance' | 'out-of-service';
  assignedProject: string;
  location: string;
  operator: string;
  hours: number;
  serviceDueHours: number;
  lastService: string;
  nextService: string;
  maintNotes: string;
  value: number;
  dailyRate: number;
  insurance: string;
  insuranceExpiry: string;
  regExpiry: string;
  inspectionDue: string;
  notes: string;
  capabilities: string[];
  maintenanceLog: MaintenanceEntry[];
}

export interface MaintenanceEntry {
  id: string;
  date: string;
  type: string;
  hours: number;
  notes: string;
  cost: number;
  by: string;
  nextDue: string;
}

export interface ManifestItem {
  materialId: string;
  materialName: string;
  zoneName: string;
  zoneId: string;
  qtyNeeded: number;
  reserveQty: number;
  totalOrder: number;
  unitCost: number;
  subtotal: number;
  unit: string;
}

export interface Alert {
  level: 'red' | 'amber' | 'info';
  title: string;
  msg: string;
  icon?: string;
}

// Aggregate state shape used by getAllAlerts
export interface AppState {
  projects: Project[];
  crew: CrewMember[];
  equipment: Equipment[];
  materials: Material[];
}

export interface Activity {
  id: string;
  message: string;
  timestamp: string;
}

export interface DashboardKPI {
  activeProjects: number;
  totalProjectValue: number;
  teamSize: number;
  fleetSize: number;
  alertsCount: number;
}

export interface DashboardConfig {
  showKpis: boolean;
  showMap: boolean;
  showAlerts: boolean;
  showCrewUtilization: boolean;
  showEquipStatus: boolean;
  showRecentActivity: boolean;
}

// Additional types for pages
export interface InventoryItem {
  id: string;
  materialId: string;
  qtyOnHand: number;
  minStockLevel: number;
  lastRestocked: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  notes: string;
}

export interface ProjectMaterial {
  id: string;
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
  subtotal: number;
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  date: string;
  type: string;
  cost: number;
  notes: string;
}

export interface PriceResult {
  id: string;
  materialId: string;
  supplier: string;
  price: number;
  unit: string;
  date: string;
}

export interface WorkOrder {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'draft' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  assignedTo: string[];
  estimatedHours: number;
  actualHours?: number;
  createdAt: string;
}

// Type aliases for formatting and display
export interface ChecklistProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface BudgetStatus {
  estimate: number;
  budget: number;
  percentage: number;
  isOver: boolean;
}

export interface WorkOrderStep {
  n: number;
  text: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────

/** Mirrors the subscription_status column on the organizations table. */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

/** Mirrors the subscription_tier column on the organizations table. */
export type SubscriptionTier = 'starter' | 'pro' | 'business';
