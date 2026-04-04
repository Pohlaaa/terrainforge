/**
 * TerrainForge Business Logic & Types
 * 
 * Main entry point for all extracted modules.
 * Use named imports from specific modules for tree-shaking.
 */

// Type definitions
export type {
  Material,
  Zone,
  Project,
  Equipment,
  CrewMember,
  Alert,
  AppState,
  ChecklistProgress,
  BudgetStatus,
  ManifestItem,
  WorkOrderStep,
  MaterialCategory,
} from '@/types';

// Constants
export {
  RESERVE,
  CAT_LABELS,
  CAT_BADGE,
  MATERIAL_CATEGORIES,
  UNIT_TYPES,
  SKILL_OPTIONS,
  CREW_ROLES,
  EQUIP_CERT_MAP,
  EQUIP_CAPABILITIES,
  EQUIPMENT_STATUS,
  MAINTENANCE_TYPES,
  DEFAULT_MATERIALS,
  CHECKLIST_ITEMS,
  ALERT_THRESHOLDS,
  ZONE_COLORS,
  PAGE_TITLES,
  ACTION_BTNS,
  ZONE_EQUIP_RULES,
} from './constants';

// Categories (canonical module)
export {
  CATEGORY_LABELS,
  CATEGORY_BADGES,
  CATEGORY_RESERVES,
  CATEGORY_GROUPS,
  getCategoryLabel,
  getCategoryBadge,
  getCategoryReserve,
  getCategoryGroup,
  normalizeCategory,
  scoreSuppliers,
  scoreSuppliersForGroup,
  type CategoryGroupDef,
  type CategoryGroupKey,
  type SupplierMatchScore,
} from './categories';

// Manifest & calculations
export {
  computeQty,
  getReservePct,
  generateManifest,
  computeProjectCostRaw,
  computeProjectCostFormatted,
} from './manifest';

// Work orders
export { generateSteps } from './workorders';

// Alerts
export {
  getEquipAlerts,
  getCrewCertAlerts,
  getInventoryAlerts,
  getProjectAlerts,
  getAllAlerts,
} from './alerts';

// Inventory
export {
  getMatAllocated,
  getAvailable,
  isLowStock,
  hasShortfall,
} from './inventory';

// Suggestions
export {
  suggestMaterials,
  scoreEquipment,
  suggestEquipment,
  getCertifiedCrew,
} from './suggestions';

// Formatting
export {
  formatCurrency,
  formatDate,
  formatNumber,
  formatQty,
  getChecklistProgress,
  getBudgetStatus,
} from './formatting';
