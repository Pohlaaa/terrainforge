/**
 * Sample data for the "Load Sample Company" feature.
 * All data is realistic landscaping contractor data for the Austin TX area.
 * org_id is NOT included — it's added at insert time.
 */

import type { Project, Material, CrewMember, Equipment, TaskPhase, TaskStatus, ScheduleEntryStatus } from '@/types';

// ── Date helpers ─────────────────────────────────────────────────────────────

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ── Projects ─────────────────────────────────────────────────────────────────

export function getSampleProjects(): Omit<Project, 'id' | 'createdAt'>[] {
  return [
    {
      name: 'Riverside Patio & Firepit',
      client: 'Mike & Laura Chen',
      address: '2418 Riverside Dr, Austin TX 78741',
      lat: 30.2432,
      lng: -97.7280,
      totalArea: 2800,
      startDate: daysFromNow(-14),
      targetDate: daysFromNow(28),
      budget: 38000,
      notes: '[SAMPLE] Full backyard renovation with stone patio, gas firepit, and pathway lighting.',
      checklist: {
        permit: true,
        utility: true,
        deposit: true,
        design: true,
        access: true,
        materials: true,
        crew: false,
        equipment: false,
      },
      materials: [],
      zones: [
        {
          id: '', name: 'Main Patio', area: 1200, perimeter: 140, sequence: 1,
          crew: '', dependencies: [], notes: 'Belgard pavers on compacted base',
          materials: [], equipment: [], createdAt: '',
        },
        {
          id: '', name: 'Firepit Area', area: 400, perimeter: 72, sequence: 2,
          crew: '', dependencies: [], notes: 'Circular firepit with limestone surround',
          materials: [], equipment: [], createdAt: '',
        },
        {
          id: '', name: 'Pathway', area: 1200, perimeter: 320, sequence: 3,
          crew: '', dependencies: [], notes: 'Stepping stone path with low-voltage lighting',
          materials: [], equipment: [], createdAt: '',
        },
      ],
    },
    {
      name: 'Cedar Park Front Yard',
      client: 'Oakridge HOA',
      address: '1205 Brushy Creek Rd, Cedar Park TX 78613',
      lat: 30.5052,
      lng: -97.8203,
      totalArea: 3400,
      startDate: daysFromNow(7),
      targetDate: daysFromNow(42),
      budget: 22000,
      notes: '[SAMPLE] Front yard renovation for HOA compliance — new sod, edging, and garden beds.',
      checklist: {
        permit: false,
        utility: false,
        deposit: true,
        design: true,
        access: false,
        materials: false,
        crew: false,
        equipment: false,
      },
      materials: [],
      zones: [
        {
          id: '', name: 'Driveway Border', area: 800, perimeter: 120, sequence: 1,
          crew: '', dependencies: [], notes: 'Steel edging with mulch beds',
          materials: [], equipment: [], createdAt: '',
        },
        {
          id: '', name: 'Garden Beds', area: 2600, perimeter: 200, sequence: 2,
          crew: '', dependencies: [], notes: 'Native plantings with drip irrigation',
          materials: [], equipment: [], createdAt: '',
        },
      ],
    },
    {
      name: 'Thompson Pool Deck',
      client: 'James Thompson',
      address: '4500 Lago Vista Blvd, Lago Vista TX 78645',
      lat: 30.4628,
      lng: -97.9883,
      totalArea: 4200,
      startDate: daysFromNow(21),
      targetDate: daysFromNow(70),
      budget: 55000,
      notes: '[SAMPLE] Premium pool deck with travertine pavers and landscape ring — high-end residential.',
      checklist: {
        permit: false,
        utility: false,
        deposit: false,
        design: true,
        access: false,
        materials: false,
        crew: false,
        equipment: false,
      },
      materials: [],
      zones: [
        {
          id: '', name: 'Pool Deck', area: 2800, perimeter: 210, sequence: 1,
          crew: '', dependencies: [], notes: 'Travertine pavers with non-slip finish',
          materials: [], equipment: [], createdAt: '',
        },
        {
          id: '', name: 'Landscape Ring', area: 1400, perimeter: 180, sequence: 2,
          crew: '', dependencies: [], notes: 'Ornamental grasses and specimen trees',
          materials: [], equipment: [], createdAt: '',
        },
      ],
    },
  ];
}

// ── Sample Tasks ────────────────────────────────────────────────────────────

export interface SampleTask {
  name: string;
  description: string;
  phase: TaskPhase;
  status: TaskStatus;
  sequenceNumber: number;
  aiGenerated: boolean;
}

/** Returns sample tasks keyed by project name */
export function getSampleTasks(): Record<string, SampleTask[]> {
  return {
    'Riverside Patio & Firepit': [
      { name: 'Clear existing vegetation', description: 'Remove grass, weeds, and small shrubs from the patio footprint', phase: 'rough_grade', status: 'pending', sequenceNumber: 1, aiGenerated: false },
      { name: 'Grade and level patio area', description: 'Establish proper slope for drainage (1% away from house)', phase: 'rough_grade', status: 'pending', sequenceNumber: 2, aiGenerated: false },
      { name: 'Install gravel base', description: 'Lay 4" compacted #57 limestone base across all zones', phase: 'rough_grade', status: 'pending', sequenceNumber: 3, aiGenerated: false },
      { name: 'Lay paver base and edge restraints', description: 'Set 1" sand bedding layer and install poly edge restraints', phase: 'hardscape', status: 'pending', sequenceNumber: 4, aiGenerated: false },
      { name: 'Install flagstone pavers', description: 'Lay Belgard Cambridge pavers in running bond pattern', phase: 'hardscape', status: 'pending', sequenceNumber: 5, aiGenerated: false },
      { name: 'Build firepit structure', description: 'Construct circular gas firepit with limestone surround', phase: 'hardscape', status: 'pending', sequenceNumber: 6, aiGenerated: false },
      { name: 'Apply polymeric sand', description: 'Fill paver joints and activate with water', phase: 'cleanup_punchlist', status: 'pending', sequenceNumber: 7, aiGenerated: false },
      { name: 'Final grading and cleanup', description: 'Dress edges, clean pavers, haul debris', phase: 'cleanup_punchlist', status: 'pending', sequenceNumber: 8, aiGenerated: false },
    ],
    'Cedar Park Front Yard': [
      { name: 'Remove existing lawn and shrubs', description: 'Strip old bermuda sod and remove overgrown foundation plantings', phase: 'demo_prep', status: 'pending', sequenceNumber: 1, aiGenerated: false },
      { name: 'Clear planting beds', description: 'Remove old mulch and amend soil in garden bed areas', phase: 'demo_prep', status: 'pending', sequenceNumber: 2, aiGenerated: false },
      { name: 'Install drip irrigation lines', description: 'Run drip tubing through all garden beds with Hunter MP rotators', phase: 'irrigation', status: 'pending', sequenceNumber: 3, aiGenerated: false },
      { name: 'Connect to main water supply', description: 'Tie drip system into existing irrigation mainline', phase: 'irrigation', status: 'pending', sequenceNumber: 4, aiGenerated: false },
      { name: 'Plant trees and large shrubs', description: 'Install Live Oaks and specimen shrubs per design plan', phase: 'softscape', status: 'pending', sequenceNumber: 5, aiGenerated: false },
      { name: 'Install sod', description: 'Lay premium bermuda sod in all lawn areas', phase: 'softscape', status: 'pending', sequenceNumber: 6, aiGenerated: false },
      { name: 'Mulch all beds', description: 'Apply 3" hardwood mulch to all planting beds', phase: 'softscape', status: 'pending', sequenceNumber: 7, aiGenerated: false },
      { name: 'Install landscape lighting', description: 'Place low-voltage path lights and uplights on trees', phase: 'lighting', status: 'pending', sequenceNumber: 8, aiGenerated: false },
      { name: 'Final walkthrough', description: 'HOA compliance check and client sign-off', phase: 'cleanup_punchlist', status: 'pending', sequenceNumber: 9, aiGenerated: false },
    ],
    'Thompson Pool Deck': [
      { name: 'Excavate deck area', description: 'Remove 6" of soil across pool deck footprint', phase: 'rough_grade', status: 'pending', sequenceNumber: 1, aiGenerated: false },
      { name: 'Compact subgrade', description: 'Plate-compact native soil to 95% density', phase: 'rough_grade', status: 'pending', sequenceNumber: 2, aiGenerated: false },
      { name: 'Install drainage', description: 'Set channel drains at deck perimeter for pool splash runoff', phase: 'rough_grade', status: 'pending', sequenceNumber: 3, aiGenerated: false },
      { name: 'Pour concrete pad', description: 'Place 4" reinforced concrete slab as paver substrate', phase: 'hardscape', status: 'pending', sequenceNumber: 4, aiGenerated: false },
      { name: 'Install stone veneer on pool edge', description: 'Apply travertine coping stones to pool beam', phase: 'hardscape', status: 'pending', sequenceNumber: 5, aiGenerated: false },
      { name: 'Lay deck pavers', description: 'Set travertine pavers with non-slip finish on mortar bed', phase: 'hardscape', status: 'pending', sequenceNumber: 6, aiGenerated: false },
      { name: 'Seal all surfaces', description: 'Apply penetrating sealer to deck and coping', phase: 'cleanup_punchlist', status: 'pending', sequenceNumber: 7, aiGenerated: false },
      { name: 'Install pool fence sections', description: 'Mount aluminum fence panels per code requirements', phase: 'cleanup_punchlist', status: 'pending', sequenceNumber: 8, aiGenerated: false },
      { name: 'Final inspection', description: 'City inspection for pool barrier compliance', phase: 'cleanup_punchlist', status: 'pending', sequenceNumber: 9, aiGenerated: false },
    ],
  };
}

// ── Zone → Material Mappings ────────────────────────────────────────────────
// Maps project name → zone name → array of material names (must match getSampleMaterials names)

export function getSampleZoneMaterials(): Record<string, Record<string, string[]>> {
  return {
    'Riverside Patio & Firepit': {
      'Main Patio': ['Belgard Cambridge Pavers', '#57 Limestone Gravel'],
      'Firepit Area': ['Austin Cream Limestone', '#57 Limestone Gravel'],
      'Pathway': ['Belgard Cambridge Pavers', 'Steel Landscape Edging'],
    },
    'Cedar Park Front Yard': {
      'Driveway Border': ['Steel Landscape Edging', 'Hardwood Mulch'],
      'Garden Beds': ['Bermuda Sod (premium)', 'Hardwood Mulch', 'Live Oak (30gal)', 'Hunter MP Rotator'],
    },
    'Thompson Pool Deck': {
      'Pool Deck': ['Austin Cream Limestone', '#57 Limestone Gravel'],
      'Landscape Ring': ['Hardwood Mulch', 'Live Oak (30gal)'],
    },
  };
}

// ── Crew ─────────────────────────────────────────────────────────────────────

export function getSampleCrew(): Omit<CrewMember, 'id'>[] {
  return [
    {
      name: 'Marco Gutierrez',
      role: 'foreman',
      phone: '(512) 555-0101',
      skills: ['hardscape', 'grading'],
      availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
      maxProjects: 2,
      notes: '[SAMPLE] 12 years experience, bilingual.',
      bookedDates: [],
      certs: [{ certId: 'cert-1', label: 'ICPI Certified', expiry: daysFromNow(180) }],
    },
    {
      name: 'James Wilson',
      role: 'lead',
      phone: '(512) 555-0102',
      skills: ['hardscape', 'concrete'],
      availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
      maxProjects: 2,
      notes: '[SAMPLE] Concrete finishing specialist.',
      bookedDates: [],
      certs: [],
    },
    {
      name: 'Sofia Reyes',
      role: 'specialist',
      phone: '(512) 555-0103',
      skills: ['planting', 'irrigation'],
      availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
      maxProjects: 3,
      notes: '[SAMPLE] Horticulture degree, irrigation design.',
      bookedDates: [],
      certs: [{ certId: 'cert-2', label: 'Irrigation Assoc. Certified', expiry: daysFromNow(365) }],
    },
    {
      name: 'Tyler Brooks',
      role: 'installer',
      phone: null,
      skills: ['grading', 'demolition'],
      availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
      maxProjects: 2,
      notes: '[SAMPLE] Heavy equipment operator.',
      bookedDates: [],
      certs: [],
    },
    {
      name: 'David Chen',
      role: 'apprentice',
      phone: null,
      skills: ['general labor'],
      availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
      maxProjects: 1,
      notes: '[SAMPLE] First year apprentice, eager learner.',
      bookedDates: [],
      certs: [],
    },
    {
      name: 'Ana Martinez',
      role: 'specialist',
      phone: '(512) 555-0106',
      skills: ['design', 'estimation'],
      availability: { mon: true, tue: true, wed: true, thu: true, fri: false, sat: false, sun: false },
      maxProjects: 3,
      notes: '[SAMPLE] Landscape designer / project manager.',
      bookedDates: [],
      certs: [],
    },
  ];
}

// ── Equipment ────────────────────────────────────────────────────────────────

export function getSampleEquipment(): Omit<Equipment, 'id'>[] {
  return [
    {
      name: 'CAT 303.5 Mini Excavator',
      type: 'Excavator',
      hourlyCost: 85,
      equipmentType: 'excavator',
      makeModel: 'Caterpillar 303.5',
      year: 2022,
      serial: 'CAT303-2022-4871',
      plate: '',
      status: 'available',
      assignedProject: '',
      location: 'Main yard',
      operator: '',
      hours: 1240,
      serviceDueHours: 1500,
      lastService: daysFromNow(-30),
      nextService: daysFromNow(60),
      maintNotes: '[SAMPLE]',
      value: 62000,
      dailyRate: 350,
      insurance: 'State Farm Commercial',
      insuranceExpiry: daysFromNow(180),
      regExpiry: daysFromNow(270),
      inspectionDue: daysFromNow(90),
      notes: '[SAMPLE] Primary excavation unit for residential jobs.',
      capabilities: ['excavation', 'grading', 'trenching'],
      maintenanceLog: [],
    },
    {
      name: 'Bobcat S570 Skid Steer',
      type: 'Skid Steer',
      hourlyCost: 65,
      equipmentType: 'skid-steer',
      makeModel: 'Bobcat S570',
      year: 2023,
      serial: 'BOB570-2023-1192',
      plate: '',
      status: 'in-use',
      assignedProject: '',
      location: 'Riverside job site',
      operator: '',
      hours: 680,
      serviceDueHours: 1000,
      lastService: daysFromNow(-15),
      nextService: daysFromNow(75),
      maintNotes: '[SAMPLE]',
      value: 48000,
      dailyRate: 275,
      insurance: 'State Farm Commercial',
      insuranceExpiry: daysFromNow(180),
      regExpiry: daysFromNow(270),
      inspectionDue: daysFromNow(120),
      notes: '[SAMPLE] Versatile loader for material handling.',
      capabilities: ['loading', 'grading', 'material handling'],
      maintenanceLog: [],
    },
    {
      name: 'Ford F-350 Dump Truck',
      type: 'Truck',
      hourlyCost: 45,
      equipmentType: 'dump-truck',
      makeModel: 'Ford F-350 XL',
      year: 2021,
      serial: '1FTRF3B6XMEC18472',
      plate: 'TX-LND-4821',
      status: 'available',
      assignedProject: '',
      location: 'Main yard',
      operator: '',
      hours: 28500,
      serviceDueHours: 30000,
      lastService: daysFromNow(-20),
      nextService: daysFromNow(40),
      maintNotes: '[SAMPLE]',
      value: 38000,
      dailyRate: 150,
      insurance: 'Progressive Commercial',
      insuranceExpiry: daysFromNow(240),
      regExpiry: daysFromNow(180),
      inspectionDue: daysFromNow(60),
      notes: '[SAMPLE] Daily hauling — material delivery and debris removal.',
      capabilities: ['hauling', 'material delivery'],
      maintenanceLog: [],
    },
    {
      name: 'Wacker Neuson WP1550 Compactor',
      type: 'Compactor',
      hourlyCost: 25,
      equipmentType: 'other',
      makeModel: 'Wacker Neuson WP1550',
      year: 2024,
      serial: 'WN1550-2024-0337',
      plate: '',
      status: 'available',
      assignedProject: '',
      location: 'Main yard',
      operator: '',
      hours: 220,
      serviceDueHours: 500,
      lastService: daysFromNow(-45),
      nextService: daysFromNow(120),
      maintNotes: '[SAMPLE]',
      value: 5800,
      dailyRate: 75,
      insurance: '',
      insuranceExpiry: '',
      regExpiry: '',
      inspectionDue: '',
      notes: '[SAMPLE] Plate compactor for paver base.',
      capabilities: ['compaction'],
      maintenanceLog: [],
    },
    {
      name: 'Vermeer BC700XL Chipper',
      type: 'Chipper',
      hourlyCost: 55,
      equipmentType: 'other',
      makeModel: 'Vermeer BC700XL',
      year: 2020,
      serial: 'VER700-2020-8814',
      plate: '',
      status: 'maintenance',
      assignedProject: '',
      location: 'Main yard — service bay',
      operator: '',
      hours: 1950,
      serviceDueHours: 2000,
      lastService: daysFromNow(-5),
      nextService: daysFromNow(5),
      maintNotes: '[SAMPLE] Blade sharpening in progress.',
      value: 24000,
      dailyRate: 200,
      insurance: 'State Farm Commercial',
      insuranceExpiry: daysFromNow(180),
      regExpiry: '',
      inspectionDue: daysFromNow(30),
      notes: '[SAMPLE] Wood chipper — scheduled for blade maintenance.',
      capabilities: ['chipping', 'brush removal'],
      maintenanceLog: [],
    },
  ];
}

// ── Materials ────────────────────────────────────────────────────────────────

export function getSampleMaterials(): Omit<Material, 'id'>[] {
  return [
    {
      name: 'Belgard Cambridge Pavers',
      category: 'paver',
      unit: 'sqft',
      cost: 4.50,
      reserveOverride: null,
      coverage: 1,
      depthIn: null,
      notes: '[SAMPLE]',
      qtyOnHand: 2400,
      minStockLevel: 500,
      storageLocation: 'Yard A - Pallet 3',
      lastRestocked: daysFromNow(-7),
    },
    {
      name: 'Austin Cream Limestone',
      category: 'stone',
      unit: 'sqft',
      cost: 8.75,
      reserveOverride: null,
      coverage: 1,
      depthIn: null,
      notes: '[SAMPLE]',
      qtyOnHand: 800,
      minStockLevel: 200,
      storageLocation: 'Yard A - Pallet 7',
      lastRestocked: daysFromNow(-14),
    },
    {
      name: 'Bermuda Sod (premium)',
      category: 'sod',
      unit: 'sqft',
      cost: 0.85,
      reserveOverride: null,
      coverage: 1,
      depthIn: null,
      notes: '[SAMPLE]',
      qtyOnHand: 0,
      minStockLevel: 0,
      storageLocation: '',
      lastRestocked: '',
    },
    {
      name: 'Hardwood Mulch',
      category: 'mulch',
      unit: 'cuyd',
      cost: 45,
      reserveOverride: null,
      coverage: 324,
      depthIn: 3,
      notes: '[SAMPLE]',
      qtyOnHand: 12,
      minStockLevel: 5,
      storageLocation: 'Yard B - Bin 2',
      lastRestocked: daysFromNow(-5),
    },
    {
      name: '#57 Limestone Gravel',
      category: 'gravel',
      unit: 'ton',
      cost: 38,
      reserveOverride: null,
      coverage: 100,
      depthIn: 4,
      notes: '[SAMPLE]',
      qtyOnHand: 8,
      minStockLevel: 3,
      storageLocation: 'Yard B - Pile 1',
      lastRestocked: daysFromNow(-20),
    },
    {
      name: 'Steel Landscape Edging',
      category: 'edging',
      unit: 'lnft',
      cost: 3.25,
      reserveOverride: null,
      coverage: 1,
      depthIn: null,
      notes: '[SAMPLE]',
      qtyOnHand: 200,
      minStockLevel: 50,
      storageLocation: 'Yard A - Rack 1',
      lastRestocked: daysFromNow(-10),
    },
    {
      name: 'Live Oak (30gal)',
      category: 'tree',
      unit: 'each',
      cost: 285,
      reserveOverride: null,
      coverage: null,
      depthIn: null,
      notes: '[SAMPLE]',
      qtyOnHand: 0,
      minStockLevel: 0,
      storageLocation: '',
      lastRestocked: '',
    },
    {
      name: 'Hunter MP Rotator',
      category: 'irrigation',
      unit: 'each',
      cost: 12.50,
      reserveOverride: null,
      coverage: null,
      depthIn: null,
      notes: '[SAMPLE]',
      qtyOnHand: 48,
      minStockLevel: 12,
      storageLocation: 'Warehouse - Shelf C4',
      lastRestocked: daysFromNow(-8),
    },
  ];
}

// ── Schedule Entries ────────────────────────────────────────────────────────

export interface SampleScheduleEntry {
  crewName: string;
  projectName: string;
  dayOffset: number;   // relative to today
  startTime: string;   // 'HH:MM'
  endTime: string;     // 'HH:MM'
  notes: string;
  status: ScheduleEntryStatus;
  equipmentName?: string;  // optional — maps to equipment name for assignment
}

/** Returns sample schedule entries spread across the current week */
export function getSampleScheduleEntries(): SampleScheduleEntry[] {
  return [
    // Marco → Riverside Patio (Mon–Wed)
    { crewName: 'Marco Gutierrez', projectName: 'Riverside Patio & Firepit', dayOffset: 0, startTime: '07:00', endTime: '16:00', notes: 'Patio base prep and gravel', status: 'scheduled', equipmentName: 'Wacker Neuson WP1550 Compactor' },
    { crewName: 'Marco Gutierrez', projectName: 'Riverside Patio & Firepit', dayOffset: 1, startTime: '07:00', endTime: '16:00', notes: 'Paver installation', status: 'scheduled' },
    { crewName: 'Marco Gutierrez', projectName: 'Riverside Patio & Firepit', dayOffset: 2, startTime: '07:00', endTime: '16:00', notes: 'Firepit surround', status: 'scheduled' },
    // James → Cedar Park (Mon–Fri)
    { crewName: 'James Wilson', projectName: 'Cedar Park Front Yard', dayOffset: 0, startTime: '07:00', endTime: '15:00', notes: 'Sod removal and grading', status: 'scheduled' },
    { crewName: 'James Wilson', projectName: 'Cedar Park Front Yard', dayOffset: 1, startTime: '07:00', endTime: '15:00', notes: 'Irrigation line trenching', status: 'scheduled' },
    { crewName: 'James Wilson', projectName: 'Cedar Park Front Yard', dayOffset: 2, startTime: '07:00', endTime: '15:00', notes: 'Bed prep and edging', status: 'scheduled' },
    { crewName: 'James Wilson', projectName: 'Cedar Park Front Yard', dayOffset: 3, startTime: '07:00', endTime: '15:00', notes: 'Planting day 1', status: 'scheduled' },
    { crewName: 'James Wilson', projectName: 'Cedar Park Front Yard', dayOffset: 4, startTime: '07:00', endTime: '15:00', notes: 'Sod install and mulch', status: 'scheduled' },
    // Tyler → Thompson Pool Deck (Thu–Fri)
    { crewName: 'Tyler Brooks', projectName: 'Thompson Pool Deck', dayOffset: 3, startTime: '08:00', endTime: '17:00', notes: 'Deck excavation', status: 'scheduled', equipmentName: 'CAT 303.5 Mini Excavator' },
    { crewName: 'Tyler Brooks', projectName: 'Thompson Pool Deck', dayOffset: 4, startTime: '08:00', endTime: '17:00', notes: 'Subgrade compaction', status: 'scheduled', equipmentName: 'Wacker Neuson WP1550 Compactor' },
    // Sofia → Riverside Patio (Thu–Fri)
    { crewName: 'Sofia Reyes', projectName: 'Riverside Patio & Firepit', dayOffset: 3, startTime: '07:00', endTime: '16:00', notes: 'Pathway lighting layout', status: 'scheduled' },
    { crewName: 'Sofia Reyes', projectName: 'Riverside Patio & Firepit', dayOffset: 4, startTime: '07:00', endTime: '16:00', notes: 'Lighting install and test', status: 'scheduled' },
  ];
}
