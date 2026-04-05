/**
 * TerrainForge Constants
 */

import type { MaterialCategory } from '../types';
// Re-export from canonical categories module for backward compat
export { CATEGORY_RESERVES as RESERVE, CATEGORY_LABELS as CAT_LABELS, CATEGORY_BADGES as CAT_BADGE, MATERIAL_CATEGORIES } from './categories';

export const UNIT_TYPES = [
  { id: 'sqft', label: 'Square Feet' },
  { id: 'sqyd', label: 'Square Yards' },
  { id: 'lnft', label: 'Linear Feet' },
  { id: 'each', label: 'Each / Unit' },
  { id: 'bag', label: 'Bags' },
  { id: 'cuyd', label: 'Cubic Yards' },
  { id: 'ton', label: 'Tons' },
];

export const SKILL_OPTIONS = [
  { id: 'hardscape', label: 'Hardscape / Pavers' },
  { id: 'softscape', label: 'Softscape / Planting' },
  { id: 'irrigation', label: 'Irrigation' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'concrete', label: 'Concrete' },
  { id: 'grading', label: 'Grading / Excavation' },
  { id: 'sod', label: 'Sod / Lawn' },
  { id: 'walls', label: 'Retaining Walls' },
  { id: 'drainage', label: 'Drainage' },
  { id: 'trees', label: 'Trees / Large Planting' },
  { id: 'carpentry', label: 'Carpentry / Structures' },
  { id: 'cleanup', label: 'Cleanup / Maintenance' },
];

export const CREW_ROLES = ['foreman', 'supervisor', 'installer', 'laborer', 'operator'];

export const EQUIP_CERT_MAP = [
  { equipType: 'excavator', certId: 'cert-excavator', label: 'Excavator Operation', requiresLicense: false },
  { equipType: 'mini-excavator', certId: 'cert-mini-exc', label: 'Mini Excavator Operation', requiresLicense: false },
  { equipType: 'skid-steer', certId: 'cert-skid-steer', label: 'Skid Steer / Bobcat', requiresLicense: false },
  { equipType: 'tractor', certId: 'cert-tractor', label: 'Tractor Operation', requiresLicense: false },
  { equipType: 'dump-truck', certId: 'cert-dump-truck', label: 'Dump Truck (CDL-B)', requiresLicense: true },
  { equipType: 'trailer', certId: 'cert-trailer', label: 'Trailer Towing', requiresLicense: false },
  { equipType: 'compactor', certId: 'cert-compactor', label: 'Plate Compactor / Roller', requiresLicense: false },
  { equipType: 'concrete-saw', certId: 'cert-conc-saw', label: 'Concrete / Masonry Saw', requiresLicense: false },
  { equipType: 'auger', certId: 'cert-auger', label: 'Power Auger / Drill', requiresLicense: false },
  { equipType: 'trencher', certId: 'cert-trencher', label: 'Trencher', requiresLicense: false },
  { equipType: 'sprayer', certId: 'cert-sprayer', label: 'Pesticide / Herbicide Sprayer', requiresLicense: true },
  { equipType: 'zero-turn', certId: 'cert-zero-turn', label: 'Zero Turn Mower', requiresLicense: false },
];

export const EQUIP_CAPABILITIES = [
  { id: 'grading', label: 'Grading / Earthwork' },
  { id: 'excavation', label: 'Excavation / Digging' },
  { id: 'hauling', label: 'Hauling / Transport' },
  { id: 'compaction', label: 'Compaction' },
  { id: 'lifting', label: 'Lifting / Loading' },
  { id: 'concrete', label: 'Concrete Work' },
  { id: 'cutting', label: 'Cutting / Sawing' },
  { id: 'drilling', label: 'Drilling / Augering' },
  { id: 'trenching', label: 'Trenching' },
  { id: 'irrigation', label: 'Irrigation Install' },
  { id: 'planting', label: 'Tree / Large Planting' },
  { id: 'mowing', label: 'Mowing / Turf' },
  { id: 'spraying', label: 'Spraying / Treating' },
  { id: 'paving', label: 'Paving / Hardscape' },
];

export const EQUIPMENT_STATUS = [
  { id: 'available', label: 'Available', color: '#74C69D' },
  { id: 'in-use', label: 'In Use', color: '#60A5FA' },
  { id: 'maintenance', label: 'Maintenance', color: '#FCD34D' },
  { id: 'out-of-service', label: 'Out of Service', color: '#F87171' },
];

export const MAINTENANCE_TYPES = [
  'oil-change', 'filter', 'hydraulic', 'tracks', 'blade',
  'inspection', 'repair', 'warranty', 'other',
];

export const DEFAULT_MATERIALS = [
  { name: 'Bluestone Pavers 12"×12"', category: 'paver', unit: 'each', cost: 4.80, coverage: 1, sku: 'BS-1212-GRY' },
  { name: 'Polymeric Sand (50 lb bag)', category: 'sand', unit: 'bag', cost: 28.00, coverage: 65, sku: 'PS-50-STD' },
  { name: 'Granite Steppers 24"×24"', category: 'stone', unit: 'each', cost: 65.00, sku: 'GS-2424-LT' },
  { name: 'Steel Landscape Edging 5"', category: 'edging', unit: 'lnft', cost: 2.10, sku: 'SLE-5-BLK' },
  { name: 'Zoysia Sod (sq ft)', category: 'sod', unit: 'sqft', cost: 0.55, sku: 'SOD-ZOY' },
  { name: 'Black Mulch (2 cu ft bag)', category: 'mulch', unit: 'bag', cost: 6.20, coverage: 2, depthIn: 3 },
  { name: 'Triple Mix Topsoil (cu yd)', category: 'soil', unit: 'cuyd', cost: 45.00 },
  { name: 'Pea Gravel (50 lb bag)', category: 'gravel', unit: 'bag', cost: 7.50, coverage: 20, depthIn: 2 },
  { name: 'Japanese Maple 6 ft', category: 'tree', unit: 'each', cost: 320.00 },
  { name: 'Boxwood Shrub 3 gal', category: 'shrub', unit: 'each', cost: 48.00 },
  { name: 'Ornamental Grass 1 gal', category: 'plant', unit: 'each', cost: 18.00 },
  { name: 'Low-Volt Path Light', category: 'lighting', unit: 'each', cost: 38.00 },
  { name: 'Drip Irrigation (per zone)', category: 'irrigation', unit: 'each', cost: 180.00 },
  { name: 'Weed Barrier Fabric (sqft)', category: 'misc', unit: 'sqft', cost: 0.18 },
  { name: 'Concrete (per cuyd)', category: 'concrete', unit: 'cuyd', cost: 165.00 },
  { name: 'Pressure-Treated Lumber 4×6', category: 'lumber', unit: 'lnft', cost: 4.50 },
];

export const CHECKLIST_ITEMS = [
  { key: 'permit', label: 'Permit' },
  { key: 'utility', label: 'Utility Locate' },
  { key: 'deposit', label: 'Deposit' },
  { key: 'design', label: 'Design OK' },
  { key: 'access', label: 'Site Access' },
  { key: 'materials', label: 'Materials' },
  { key: 'crew', label: 'Crew Set' },
  { key: 'equipment', label: 'Equip.' },
];

export const ALERT_THRESHOLDS = {
  CERT_EXPIRY_DAYS: 60,
  EQUIPMENT_SERVICE_DAYS: 30,
  EQUIPMENT_SERVICE_HOURS: 50,
  LOW_STOCK_REORDER_PCT: 1,
};

export const ZONE_COLORS = ['#74C69D', '#60A5FA', '#A78BFA', '#FCD34D', '#F87171', '#5EEAD4', '#FB923C'];

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', projects: 'Projects', materials: 'Material Library',
  manifest: 'Materials Manifest', workorders: 'Work Orders', pricing: 'Price Research',
  crew: 'Crew Manager', equipment: 'Equipment',
};

export const ACTION_BTNS: Record<string, { label: string; fn: string }> = {
  dashboard: { label: '⚙ Customize', fn: 'openDashboardSettings()' },
  projects: { label: '+ New Project', fn: 'openNewProjectModal()' },
  materials: { label: '+ Add Material', fn: 'openMaterialModal()' },
  manifest: { label: '⎙ Print Manifest', fn: 'printPage()' },
  workorders: { label: '⎙ Print Work Orders', fn: 'printPage()' },
  pricing: { label: '⎙ Print Research', fn: 'printPage()' },
  crew: { label: '+ Add Crew Member', fn: 'openCrewModal()' },
  equipment: { label: '+ Add Equipment', fn: 'openEquipmentModal()' },
};

export const ZONE_EQUIP_RULES = [
  { keywords: ['patio', 'paver', 'hardscape'], matCats: ['paver', 'stone', 'brick', 'concrete'], caps: ['grading', 'excavation', 'compaction'] },
  { keywords: ['garden', 'planting', 'softscape'], matCats: ['plant', 'shrub', 'tree', 'mulch', 'soil'], caps: ['grading', 'hauling'] },
  { keywords: ['lawn', 'sod', 'seed'], matCats: ['sod', 'seed', 'soil'], caps: ['grading'] },
  { keywords: ['gravel'], matCats: ['gravel', 'sand', 'edging'], caps: ['grading', 'hauling', 'compaction'] },
  { keywords: ['irrigation'], matCats: ['irrigation'], caps: [] },
  { keywords: ['lighting'], matCats: ['lighting'], caps: [] },
];
