/**
 * TerrainForge Data Types
 * All TypeScript interfaces and types for the data model
 */

// ── Project aggregate types (data layer refactor) ───────────────────────────

/** Project with computed summary counts — used by list views and dashboard */
export interface ProjectListItem extends Project {
  taskCount: number;
  completedTaskCount: number;
  crewCount: number;
  nextScheduledDate: string | null;
}

/** Complete project graph — used by ProjectDashboard */
export interface ProjectFull extends Project {
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  crewAssignments: ProjectCrewAssignment[];
  scheduleEntries: ScheduleEntry[];
  siteConditions: ProjectSiteCondition[];
  elements?: ProjectElement[];
}

/** Persisted crew-to-project assignment */
export interface ProjectCrewAssignment {
  id: string;
  orgId: string;
  projectId: string;
  crewMemberId: string;
  roleOnProject: string | null;
  assignedAt: string;
}

// ── Project Elements (measurement-driven architecture) ─────────────────────

export type ElementType =
  | 'patio' | 'wall' | 'garden_bed' | 'sod_area' | 'edging' | 'walkway'
  | 'driveway' | 'retaining_wall' | 'fire_pit' | 'pool_deck'
  | 'parking_lot' | 'steps_stairs' | 'fence' | 'pergola' | 'outdoor_kitchen'
  | 'drainage' | 'tree_planting' | 'shrub_planting' | 'irrigation_zone'
  | 'mulch_area' | 'gravel_area' | 'concrete_slab' | 'curbing'
  | 'other';

export interface ProjectElement {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  elementType: ElementType;
  lengthFt: number | null;
  widthFt: number | null;
  areaSqft: number | null;
  linearFt: number | null;
  heightFt: number | null;
  depthIn: number | null;
  computedAreaSqft: number;
  notes: string;
  sequence: number;
  createdAt: string;
  materials: ProjectElementMaterial[];
  /**
   * Design-app geometry (migration 028). Nullable — the PlanView2D auto-layouts
   * when absent. Position is in property-plane feet (origin = top-left),
   * rotation in degrees clockwise from due-north.
   */
  geometry?: ElementGeometry | null;
}

/**
 * Geometry for a ProjectElement in the design app. Shape discriminator
 * lets us extend to circles / polygons / L-shapes without schema churn.
 */
export interface ElementGeometry {
  position: { x: number; y: number };
  rotation: number; // degrees
  shape:
    | { kind: 'rectangle'; width: number; height: number }
    | { kind: 'circle'; radius: number }
    | { kind: 'polygon'; points: Array<{ x: number; y: number }> }
    | { kind: 'line'; length: number };
}

/**
 * Site-level geometry: property boundary + Mapbox anchor. Powers the
 * eventual satellite backdrop + reference frame for element positions.
 */
export interface SiteGeometry {
  boundary?: Array<{ x: number; y: number }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  elevationSamples?: Array<{ x: number; y: number; z: number }>;
}

/**
 * Shareable client-facing link for a project. Token goes in the URL,
 * anon RLS policies scope reads through this row. See migration 028.
 * Client response columns from migration 029.
 */
export interface ShareToken {
  id: string;
  projectId: string;
  orgId: string;
  token: string;
  role: 'client_view' | 'client_approve';
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  clientResponse?: 'approved' | 'changes_requested' | null;
  clientRespondedAt?: string | null;
  clientNote?: string | null;
}

export interface ProjectElementMaterial {
  id: string;
  orgId: string;
  elementId: string;
  materialId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  depthIn: number | null;
  notes: string;
  createdAt: string;
  // ── Override fields (new) ─────────────────────────────────────────────
  spacingOverrideInches?: number | null;
  wasteFactorOverride?: number | null;
  manualCount?: number | null;
  wallLengthFt?: number | null;
  wallHeightFt?: number | null;
  computationModel?: string;
}

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

  /** Project-level materials (JSONB). Primary source of truth for what materials this project needs. */
  materials: ProjectMaterial[];

  /**
   * Site-level geometry for the design app (migration 028). Nullable —
   * when absent, viewer shows a neutral canvas.
   */
  siteGeometry?: SiteGeometry | null;

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
  disposalCost?: number | null;
  equipmentCost?: number | null;

  // Step 6: Compliance
  complianceNotes?: string | null;
  permitStatus?: PermitStatus | null;

  // Step 4: Resources (crew & equipment metadata on project)
  crewSize?: number | null;
  crewNotes?: string | null;
  equipmentNotes?: string | null;

  // Step 7: Wizard state
  wizardStep?: number;
  wizardCompletedAt?: string | null;

  // Project lifecycle
  status?: ProjectStatus;
  completedAt?: string | null;
  approvedAt?: string | null;
  startedAt?: string | null;
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

/** Zone material with full material details and quantity — used by Materials tab */
export interface ZoneMaterialDetail {
  zoneId: string;
  zoneName: string;
  materialId: string;
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface ZoneEquipment {
  equipId: string;
  name: string;
}

export type ComputationModel = 'AREA_COVERAGE' | 'UNIT_COVERAGE' | 'LINEAR' | 'POINT_SPACING' | 'LINEAR_DEPTH' | 'SUBSTRATE';

export interface ComputeParams {
  depth_inches?: number;
  coverage_sqft_per_unit?: number;
  length_per_unit_ft?: number;
  spacing_inches?: number;
  face_area_sqft_per_unit?: number;
  overlap_factor?: number;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;                    // legacy — use purchaseUnit for new code
  cost: number;                    // legacy — use costPerPurchaseUnit for new code
  reserveOverride: number | null;  // legacy — use defaultWasteFactor for new code
  coverage: number | null;         // legacy — use computeParams for new code
  depthIn: number | null;          // legacy — use computeParams for new code
  notes: string;
  // Inventory tracking
  qtyOnHand: number;
  minStockLevel: number;
  storageLocation: string;
  lastRestocked: string;
  // ── Engine fields (new) ─────────────────────────────────────────────────
  computationModel?: ComputationModel;
  computeParams?: ComputeParams;
  subcategory?: string;
  purchaseUnit?: string;           // each | bag | pallet | cubic_yard | ton | roll | bundle | flat
  qtyPerPurchaseUnit?: number;
  costPerPurchaseUnit?: number;
  defaultWasteFactor?: number;     // 0.05 = 5%
  supplierSku?: string;
  dependentMaterialIds?: string[];
  metadata?: Record<string, unknown>;
  isActive?: boolean;
  // ── PBR textures (migration 030) ────────────────────────────────────────
  textureAlbedoUrl?: string | null;
  textureNormalUrl?: string | null;
  textureRoughnessUrl?: string | null;
}

/** Project-level material entry stored in projects.materials JSONB */
export interface ProjectMaterial {
  id: string;
  materialId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  actualUsage?: number | null;  // recorded when project closes
}

export interface CrewMember {
  id: string;
  name: string;
  role: 'owner' | 'foreman' | 'lead' | 'installer' | 'laborer' | 'specialist' | 'apprentice';
  phone: string | null;
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
  hourlyCost: number | null;
  equipmentType: string | null;
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
  category: string;
  // Supplier info (populated when supplier prices are available)
  supplierId: string | null;
  supplierName: string | null;
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

export interface PriceHistoryEntry {
  id: string;
  orgId: string;
  materialId: string;
  supplierId: string;
  unitCost: number;
  recordedAt: string;
  source: 'manual' | 'quote' | 'import';
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

/** @deprecated Use ProjectMaterial from line ~183 instead */
// Removed duplicate ProjectMaterial and ProjectMaterialEntry — consolidated into single ProjectMaterial interface above

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

// ── AI Recommendation Types ──────────────────────────────────────────────────

export interface AIRecommendationSet {
  tasks: AITaskRecommendation[];
  crew: AICrewRecommendation[];
  equipment: AIEquipmentRecommendation[];
  materials: AIMaterialRecommendation[];
  budget: AIBudgetRecommendation;
  permits: AIPermitRecommendation[];
  generatedAt: string;
}

export interface AITaskRecommendation {
  name: string;
  phase: string;
  sequenceNumber?: number;
  estimatedHours: number;
  description: string;
  suggestedCrewRole?: string;
}

export interface AICrewRecommendation {
  crewMemberId: string;
  crewMemberName: string;
  role: string;
  reason: string;
  availabilityNote: string;
  isAvailable: boolean;
  skills: string[];
}

export interface AIEquipmentRecommendation {
  equipmentId: string;
  equipmentName: string;
  type: string;
  reason: string;
  availabilityNote: string;
  isAvailable: boolean;
  estimatedDays: number;
  dailyRate: number;
}

export interface AIMaterialRecommendation {
  materialId: string | null;
  materialName: string;
  category: string;
  estimatedQuantity: number;
  unit: string;
  unitCost: number;
  reason: string;
  inLibrary: boolean;
}

export interface AIBudgetRecommendation {
  laborBudget: number;
  materialsBudget: number;
  equipmentBudget: number;
  disposalCost: number;
  subcontractorBudget: number;
  overheadPct: number;
  estimatedHours: number;
  clientQuoteRange: { low: number; high: number };
  reasoning: string;
}

export interface AIPermitRecommendation {
  permitType: string;
  reason: string;
  estimatedFee: number | null;
  urgency: 'required' | 'recommended' | 'optional';
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
  shortcode: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionTier: SubscriptionTier;
  /** ISO timestamp — when the 14-day free trial expires. */
  trialEndsAt: string | null;
  /** ISO timestamp — when paid access expires after cancellation. */
  subscriptionEndsAt: string | null;
  stripeCustomerId: string | null;
  defaultLaborRate: number | null;
  defaultEquipmentRate: number | null;
  disposalRates: Record<string, number>;
}

export const EQUIPMENT_TYPES = [
  { value: 'excavator', label: 'Excavator' },
  { value: 'mini-excavator', label: 'Mini-Excavator' },
  { value: 'skid-steer', label: 'Skid Steer' },
  { value: 'mini-skid-steer', label: 'Mini Skid Steer' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'dump-truck', label: 'Dump Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'pickup-truck', label: 'Pickup Truck' },
  { value: 'other', label: 'Other' },
] as const;

// ── Billing ───────────────────────────────────────────────────────────────────

/** Mirrors the subscription_status column on the organizations table. */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'none';

/** Mirrors the subscription_tier column on the organizations table. */
export type SubscriptionTier = 'starter' | 'pro' | 'business';

/** Combined subscription info for components that need the full picture. */
export interface SubscriptionInfo {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  endsAt: string | null;
}

// ── Project Intelligence (M1.5) ─────────────────────────────────────────────

export type ProjectType =
  | 'full_install' | 'renovation' | 'hardscape' | 'softscape'
  | 'drainage' | 'irrigation' | 'maintenance' | 'mixed';

export type ScopeSize = 'small' | 'medium' | 'large' | 'commercial';

export type PropertyType =
  | 'residential' | 'commercial' | 'hoa' | 'municipal' | 'multi_family' | 'other';

export type SunExposure = 'full_sun' | 'partial_shade' | 'full_shade' | 'mixed';

export type PermitStatus = 'not_started' | 'applied' | 'approved' | 'denied' | 'not_required';

/** Project lifecycle pipeline: estimate → quoted → approved → scheduled → in_progress → completed (+ on_hold) */
export type ProjectStatus = 'estimate' | 'quoted' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'on_hold';

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
