import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Equipment, MaintenanceEntry } from '@/types'
import { useOrgStore } from './orgStore'
import * as db from '@/services/supabaseData'

interface EquipmentStore {
  equipment: Equipment[]
  isLoading: boolean
  error: string | null
  reset: () => void
  addEquipment: (equip: Omit<Equipment, 'id'>) => Promise<void>
  updateEquipment: (id: string, updates: Partial<Equipment>) => Promise<void>
  deleteEquipment: (id: string) => Promise<void>
  addMaintenanceEntry: (equipId: string, entry: Omit<MaintenanceEntry, 'id'>) => Promise<void>
  getByStatus: (status: Equipment['status']) => Equipment[]
  getByType: (type: string) => Equipment[]
  getEquipmentAlerts: () => string[]
  fetchEquipment: () => Promise<void>
  setEquipment: (equipment: Equipment[]) => void
}

const seedEquipment: Equipment[] = [
  {
    id: 'eq_001',
    name: 'CAT 303.5 Mini Excavator',
    type: 'mini-excavator',
    makeModel: 'Caterpillar 303.5',
    year: 2021,
    serial: 'CAT-2021-0334',
    plate: 'TEX-EXC-001',
    status: 'available',
    assignedProject: '',
    location: 'Yard A, Bay 1',
    operator: 'crew_001',
    hours: 1240,
    serviceDueHours: 2000,
    lastService: '2026-02-15',
    nextService: '2026-06-15',
    maintNotes: 'Tracks replaced Feb 2026, running smoothly',
    value: 65000,
    dailyRate: 350,
    insurance: 'Hartford Equipment Insurance',
    insuranceExpiry: '2026-09-30',
    regExpiry: '2026-12-31',
    inspectionDue: '2026-09-15',
    notes: 'Primary excavator for site prep and grading work',
    capabilities: ['excavation', 'grading'],
    maintenanceLog: [
      {
        id: 'maint_001',
        date: '2026-02-15',
        type: 'track-replacement',
        hours: 1200,
        notes: 'Replaced worn tracks, full inspection completed',
        cost: 3200,
        by: 'Mike Reeves',
        nextDue: '2026-08-15',
      },
    ],
  },
  {
    id: 'eq_002',
    name: 'Bobcat S650 Skid Steer',
    type: 'skid-steer',
    makeModel: 'Bobcat S650',
    year: 2020,
    serial: 'BOB-2020-4521',
    plate: 'TEX-BOB-001',
    status: 'in-use',
    assignedProject: 'proj_001',
    location: 'Henderson Project Site',
    operator: 'crew_003',
    hours: 890,
    serviceDueHours: 1500,
    lastService: '2026-01-20',
    nextService: '2026-04-20',
    maintNotes: 'Due for 1000 hr service soon',
    value: 45000,
    dailyRate: 250,
    insurance: 'Hartford Equipment Insurance',
    insuranceExpiry: '2026-09-30',
    regExpiry: '2026-11-15',
    inspectionDue: '2026-08-01',
    notes: 'Workhorse for grading, hauling, and excavation tasks',
    capabilities: ['grading', 'hauling', 'excavation'],
    maintenanceLog: [
      {
        id: 'maint_002',
        date: '2026-01-20',
        type: 'oil-change',
        hours: 850,
        notes: 'Oil and filter change, fluid levels all good',
        cost: 350,
        by: 'Carlos Mendez',
        nextDue: '2026-04-20',
      },
    ],
  },
  {
    id: 'eq_003',
    name: 'Ford F-350 Dump Truck',
    type: 'dump-truck',
    makeModel: 'Ford F-350 Super Duty',
    year: 2019,
    serial: 'FORD-2019-8765',
    plate: 'TEX-DMP-001',
    status: 'available',
    assignedProject: '',
    location: 'Yard B, Parking',
    operator: 'crew_001',
    hours: 45000,
    serviceDueHours: 50000,
    lastService: '2026-03-01',
    nextService: '2026-06-01',
    maintNotes: 'Recent service, all systems functioning',
    value: 55000,
    dailyRate: 300,
    insurance: 'Hartford Equipment Insurance',
    insuranceExpiry: '2026-12-31',
    regExpiry: '2026-10-01',
    inspectionDue: '2026-07-15',
    notes: 'Primary hauling vehicle for materials and debris removal',
    capabilities: ['hauling'],
    maintenanceLog: [
      {
        id: 'maint_003',
        date: '2026-03-01',
        type: 'oil-change',
        hours: 44000,
        notes: 'Full service - oil, filters, brake inspection',
        cost: 450,
        by: 'Mike Reeves',
        nextDue: '2026-06-01',
      },
    ],
  },
  {
    id: 'eq_004',
    name: 'Wacker Neuson WP1550 Compactor',
    type: 'compactor',
    makeModel: 'Wacker Neuson WP1550 Plate',
    year: 2022,
    serial: 'WACK-2022-1155',
    plate: 'TEX-CMP-001',
    status: 'available',
    assignedProject: '',
    location: 'Yard A, Bay 3',
    operator: 'crew_002',
    hours: 320,
    serviceDueHours: 1000,
    lastService: '2026-03-10',
    nextService: '2026-09-10',
    maintNotes: 'New machine, excellent condition',
    value: 8500,
    dailyRate: 120,
    insurance: 'Hartford Equipment Insurance',
    insuranceExpiry: '2026-09-30',
    regExpiry: '2026-11-30',
    inspectionDue: '2026-10-01',
    notes: 'Plate compactor for base compaction on paver jobs',
    capabilities: ['compaction'],
    maintenanceLog: [
      {
        id: 'maint_004',
        date: '2026-03-10',
        type: 'inspection',
        hours: 320,
        notes: 'Pre-season inspection completed, all systems go',
        cost: 150,
        by: 'Carlos Mendez',
        nextDue: '2026-09-10',
      },
    ],
  },
  {
    id: 'eq_005',
    name: 'Stihl TS420 Concrete Saw',
    type: 'concrete-saw',
    makeModel: 'Stihl TS 420',
    year: 2023,
    serial: 'STIHL-2023-0420',
    plate: 'TEX-SAW-001',
    status: 'maintenance',
    assignedProject: '',
    location: 'Yard A, Tool Storage',
    operator: 'crew_003',
    hours: 180,
    serviceDueHours: 500,
    lastService: '2026-03-18',
    nextService: '2026-06-18',
    maintNotes: 'Blade wear, scheduled for blade replacement this week',
    value: 4200,
    dailyRate: 85,
    insurance: 'Inventory Coverage',
    insuranceExpiry: '2027-03-01',
    regExpiry: '',
    inspectionDue: '2026-12-01',
    notes: 'Wet-cut capable for masonry and concrete cutting',
    capabilities: ['cutting', 'concrete'],
    maintenanceLog: [
      {
        id: 'maint_005',
        date: '2026-03-18',
        type: 'blade',
        hours: 175,
        notes: 'Diamond blade replaced, water hose inspected',
        cost: 380,
        by: 'Jake Turner',
        nextDue: '2026-06-18',
      },
    ],
  },
  {
    id: 'eq_006',
    name: '20ft Tandem Axle Trailer',
    type: 'trailer',
    makeModel: 'PJ Trailers Gooseneck',
    year: 2018,
    serial: 'PJ-2018-8844',
    plate: 'TEX-TRL-001',
    status: 'available',
    assignedProject: '',
    location: 'Yard B, Lot 2',
    operator: '',
    hours: 0,
    serviceDueHours: 0,
    lastService: '2026-02-20',
    nextService: '2026-08-20',
    maintNotes: 'Annual safety inspection passed, brakes serviced',
    value: 18000,
    dailyRate: 150,
    insurance: 'Hartford Equipment Insurance',
    insuranceExpiry: '2026-09-30',
    regExpiry: '2026-12-31',
    inspectionDue: '2026-12-01',
    notes: 'Heavy-duty hauling, 20 ton capacity, tandem axle with brakes',
    capabilities: ['hauling'],
    maintenanceLog: [
      {
        id: 'maint_006',
        date: '2026-02-20',
        type: 'inspection',
        hours: 0,
        notes: 'Annual safety inspection, brake service, light check',
        cost: 600,
        by: 'Mike Reeves',
        nextDue: '2027-02-20',
      },
    ],
  },
]

export const useEquipmentStore = create<EquipmentStore>()(
  persist(
    (set, get) => ({
      equipment: seedEquipment,
      isLoading: false,
      error: null,
      reset: () => set({ equipment: [], isLoading: false, error: null }),
      setEquipment: (equipment) => set({ equipment }),
      fetchEquipment: async () => {
        set({ isLoading: true, error: null })
        try {
          const equipment = await db.fetchEquipment()
          set({ equipment, isLoading: false })
        } catch (err: any) {
          set({ isLoading: false, error: err.message })
        }
      },
      addEquipment: async (equipData) => {
        const orgId = useOrgStore.getState().org?.id
        if (!orgId) {
          console.error('addEquipment: no org_id available')
          return
        }
        const newEquipment: Equipment = {
          ...equipData,
          id: crypto.randomUUID(),
        }
        set((state) => ({ equipment: [...state.equipment, newEquipment] }))
        try {
          await db.createEquipment(equipData, newEquipment.id, orgId)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      updateEquipment: async (id, updates) => {
        set((state) => ({
          equipment: state.equipment.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        }))
        try {
          await db.updateEquipment(id, updates)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      deleteEquipment: async (id) => {
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
        }))
        try {
          await db.deleteEquipment(id)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      addMaintenanceEntry: async (equipId, entryData) => {
        const newEntry: MaintenanceEntry = {
          ...entryData,
          id: crypto.randomUUID(),
        }
        set((state) => ({
          equipment: state.equipment.map((e) =>
            e.id === equipId
              ? { ...e, maintenanceLog: [...e.maintenanceLog, newEntry] }
              : e
          ),
        }))
        try {
          await db.addMaintenanceEntry(equipId, entryData)
        } catch (err: any) {
          set((state) => ({ error: err.message }))
        }
      },
      getByStatus: (status) => {
        return get().equipment.filter((e) => e.status === status)
      },
      getByType: (type) => {
        return get().equipment.filter((e) => e.type === type)
      },
      getEquipmentAlerts: () => {
        const alerts: string[] = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        get().equipment.forEach((eq) => {
          if (eq.insuranceExpiry) {
            const insExpiry = new Date(eq.insuranceExpiry)
            if (insExpiry < today) {
              alerts.push(`${eq.name}: Insurance EXPIRED`)
            }
          }
          if (eq.regExpiry) {
            const regExpiry = new Date(eq.regExpiry)
            if (regExpiry < today) {
              alerts.push(`${eq.name}: Registration EXPIRED`)
            }
          }
          if (eq.inspectionDue) {
            const inspDue = new Date(eq.inspectionDue)
            if (inspDue < today) {
              alerts.push(`${eq.name}: Inspection OVERDUE`)
            }
          }
          if (eq.serviceDueHours && eq.hours >= eq.serviceDueHours) {
            const hoursOver = eq.hours - eq.serviceDueHours
            alerts.push(`${eq.name}: Service OVERDUE by ${Math.round(hoursOver)} hours`)
          }
        })

        return alerts
      },
    }),
    {
      name: 'tf_equipment',
    }
  )
)
