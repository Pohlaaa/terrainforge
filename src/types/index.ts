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
  isDemo?: boolean;
  lat?: number;
  lng?: number;
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

  // ── M1.5 Project Intelligence fields (all nullable) ──────────────────────

  // Step 1: Client info (inline)
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  propertyType?: PropertyType | null;

  // Project classification
  projectType?: ProjectType | null;
  scopeSize?: ScopeSize | null;
  description?: string | null;

  // Step 2: Site intelligence
  climateZone?: string | null;
  soilType?: string | null;
  permitZone?: string | null;
  hoaFlag?: boolean;
  slopeGrade?: string | null;
  existingVegetation?: string | null;
  sunExposure?: SunExposure | null;
  drainagePattern?: string | null;

  // Access & logistics
  gateCode?: string | null;
  parkingRestrictions?: string | null;
  permittedHours?: string | null;
  utilityLocations?: string | null;
  hoaRules?: string | null;

  // Step 5: Budget breakdown
  laborBudget?: number | null;
  materialsBudget?: number | null;
  equipmentBudget?: number | null;
  subcontractorBudget?: number | null;
  overheadPct?: number | null;
  clientQuote?: number | null;
  profitMargin?: number | null;
  estimatedHours?: number | null;

  // Step 6: Compliance
  complianceNotes?: string | null;
  permitStatus?: PermitStatus | null;

  // Step 7: Wizard state
  wizardStep?: number;
  wizardCompletedAt?: string | null;
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

export interface NotificationSettings {
  deadlineReminders: boolean;
  lowStockAlerts: boolean;
  certExpiry: boolean;
  maintenanceDue: boolean;
  weeklyDigest: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;
  orgId: string;
  businessType: string | null;
  companyName: string | null;
  teamSize: string | null;
  userRole: string | null;
  priorities: string[];
  onboardingCompletedAt: string | null;
  selectedKpis: string[];
  customKpis: Array<{ name: string; description: string; valueSource?: string }>;
  widgetLayout: Array<{ widgetId: string; type: string; position: number; config?: Record<string, unknown> }>;
  notificationSettings: NotificationSettings;
  theme: 'light' | 'dark' | 'system';
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

/** Per-project material assignment (junction: project ↔ material with qty) */
export interface ProjectMaterialEntry {
  id: string;
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

/** Per-project crew assignment */
export interface ProjectCrewEntry {
  id: string;
  crewMemberId: string;
  name: string;
  role: string;
  roleOnProject: string;
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

// ── Scheduling ────────────────────────────────────────────────────────────────

export type ScheduleEntryStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface ScheduleEntry {
  id: string;
  orgId: string;
  projectId: string;
  crewMemberId: string;
  equipmentId: string | null;
  scheduledDate: string;       // 'YYYY-MM-DD'
  startTime: string | null;    // 'HH:MM'
  endTime: string | null;      // 'HH:MM'
  notes: string;
  status: ScheduleEntryStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard customization types ─────────────────────────────────────────────

export type WidgetType = 'projects' | 'crew' | 'fleet' | 'alerts' | 'map' | 'schedule';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  visible: boolean;
  collapsed: boolean;
  order: number;
  /** 'full' spans both columns, 'half' takes one column. Default: 'half'. */
  size?: 'half' | 'full';
}

export interface KPIDefinition {
  id: string;
  label: string;
  category: 'projects' | 'financial' | 'crew' | 'equipment' | 'materials';
  icon: string;
  compute: (state: AppState) => { value: number; subtitle?: string };
  colorVar: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  navigateTo?: string;
  navigateParams?: string;
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

// ── AI / Price Research ───────────────────────────────────────────────────────

/**
 * One row in the structured price estimate returned by Claude.
 * Mirrors the JSON schema specified in the price research prompt.
 */
export interface PriceEstimate {
  supplierType: string;
  unit: string;
  priceLow: number;
  priceHigh: number;
  notes: string;
}

/**
 * A cached price research result stored in localStorage.
 */
export interface PriceCacheEntry {
  timestamp: number;
  results: PriceEstimate[];
}

// ── Organisation ─────────────────────────────────────────────────────────────

/**
 * Row shape for the `organizations` table after snake_case → camelCase mapping.
 * Subscription columns are added by migration 002_stripe_billing.sql.
 */
export interface Organization {
  id: string;
  name: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionTier: SubscriptionTier;
  /** ISO timestamp — when the 14-day free trial expires. */
  trialEndsAt: string | null;
  /** ISO timestamp — when paid access expires after cancellation. */
  subscriptionEndsAt: string | null;
  stripeCustomerId: string | null;
}

// ── Billing ───────────────────────────────────────────────────────────────────

/** Mirrors the subscription_status column on the organizations table. */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

/** Mirrors the subscription_tier column on the organizations table. */
export type SubscriptionTier = 'starter' | 'pro' | 'business';

// ── Project Intelligence (M1.5) ─────────────────────────────────────────────

export type ProjectType =
  | 'full_install' | 'renovation' | 'hardscape' | 'softscape'
  | 'drainage' | 'irrigation' | 'maintenance' | 'mixed';

export type ScopeSize = 'small' | 'medium' | 'large' | 'commercial';

export type PropertyType =
  | 'residential' | 'commercial' | 'hoa' | 'municipal' | 'multi_family' | 'other';

export type SunExposure = 'full_sun' | 'partial_shade' | 'full_shade' | 'mixed';

export type PermitStatus = 'not_started' | 'applied' | 'approved' | 'denied' | 'not_required';

export type TaskPhase =
  | 'demo_prep' | 'rough_grade' | 'hardscape' | 'softscape'
  | 'irrigation' | 'lighting' | 'cleanup_punchlist' | 'custom';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export type SiteConditionType =
  | 'slope' | 'soil' | 'drainage' | 'vegetation' | 'sun_exposure'
  | 'utilities' | 'access' | 'hazard' | 'custom';

export interface ProjectTask {
  id: string;
  orgId: string;
  projectId: string;
  zoneId: string | null;
  name: string;
  description: string | null;
  phase: TaskPhase;
  sequenceNumber: number;
  status: TaskStatus;
  assignedCrewId: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  dependsOn: string[];
  scheduledDate: string | null;
  completedAt: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSiteCondition {
  id: string;
  orgId: string;
  projectId: string;
  conditionType: SiteConditionType;
  label: string;
  value: string;
  aiInferred: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SubcontractorStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type DocumentType =
  | 'site_photo' | 'permit' | 'contract' | 'proposal' | 'invoice'
  | 'plan' | 'inspection' | 'receipt' | 'other';

export type PermitLifecycleStatus = 'needed' | 'applied' | 'approved' | 'denied' | 'not_required' | 'expired';

export type InspectionResult = 'passed' | 'failed' | 'conditional' | 'pending';

export interface ProjectSubcontractor {
  id: string;
  orgId: string;
  projectId: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  trade: string | null;
  scopeDescription: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  quotedCost: number | null;
  actualCost: number | null;
  status: SubcontractorStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  orgId: string;
  projectId: string;
  fileName: string;
  storagePath: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  documentType: DocumentType;
  description: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface ProjectPermit {
  id: string;
  orgId: string;
  projectId: string;
  permitType: string;
  jurisdiction: string | null;
  permitNumber: string | null;
  status: PermitLifecycleStatus;
  appliedDate: string | null;
  approvedDate: string | null;
  expiryDate: string | null;
  inspectionDate: string | null;
  inspectionResult: InspectionResult | null;
  inspectionNotes: string | null;
  fee: number | null;
  aiSuggested: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
