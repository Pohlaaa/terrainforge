import { supabase } from './supabase'
import type { Project, Zone, ZoneMaterial, ZoneEquipment, Material, CrewMember, Equipment, MaintenanceEntry, CrewCert } from '@/types'

// ===== CASE CONVERSION HELPERS =====

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  if (!obj) return obj
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

    // Handle nested objects and arrays
    if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        typeof item === 'object' && item !== null ? toCamelCase(item) : item
      )
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      result[camelKey] = toCamelCase(value)
    } else {
      result[camelKey] = value
    }
  }

  return result
}

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  if (!obj) return obj
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

    // Handle nested objects and arrays
    if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        typeof item === 'object' && item !== null ? toSnakeCase(item) : item
      )
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      result[snakeKey] = toSnakeCase(value)
    } else {
      result[snakeKey] = value
    }
  }

  return result
}

// ===== PROJECTS =====

export async function fetchProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        zones (
          *,
          zone_materials (
            material_id,
            materials (name)
          ),
          zone_equipment (
            equipment_id,
            equipment (name)
          )
        )
      `)

    if (error) throw error

    return (data || []).map(project => {
      const camelProject = toCamelCase(project) as any

      // Map DB column names → frontend field names for project
      camelProject.totalArea = camelProject.totalAreaSqft ?? camelProject.totalArea ?? 0
      camelProject.client = camelProject.clientId ? '' : ''

      // Build zones with materials and equipment
      camelProject.zones = (camelProject.zones || []).map((zone: any) => {
        zone.materials = (zone.zoneMaterials || []).map((zm: any) => ({
          materialId: zm.materialId,
          name: zm.materials?.name || ''
        }))
        zone.equipment = (zone.zoneEquipment || []).map((ze: any) => ({
          equipId: ze.equipmentId,
          name: ze.equipment?.name || ''
        }))
        delete zone.zoneMaterials
        delete zone.zoneEquipment
        // Map DB zone column names → frontend field names
        zone.area = zone.areaSqft ?? zone.area ?? 0
        zone.perimeter = zone.perimeterLnft ?? zone.perimeter ?? 0
        zone.sequence = zone.sequenceNumber ?? zone.sequence ?? 0
        zone.crew = zone.crewAssignment ?? zone.crew ?? ''
        return zone
      })

      // Parse checklist from JSONB
      if (typeof camelProject.checklist === 'string') {
        camelProject.checklist = JSON.parse(camelProject.checklist)
      }

      return camelProject as Project
    })
  } catch (err: any) {
    console.error('fetchProjects error:', err.message)
    return []
  }
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt'>, id: string, orgId: string): Promise<Project | null> {
  try {
    const { zones, ...projectData } = project
    const snakeData = toSnakeCase(projectData) as any
    snakeData.id = id
    snakeData.org_id = orgId
    snakeData.checklist = project.checklist // Keep as object, Supabase will handle JSONB
    // Field fixups: frontend name → DB column name
    delete snakeData.client       // string, DB expects client_id UUID FK (unused)
    delete snakeData.is_demo      // frontend-only flag, no DB column
    snakeData.total_area_sqft = snakeData.total_area; delete snakeData.total_area

    const { data, error } = await supabase
      .from('projects')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    return {
      ...toCamelCase(data),
      zones: []
    } as unknown as Project
  } catch (err: any) {
    console.error('createProject error:', err.message)
    return null
  }
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
  try {
    const { zones, ...updateData } = updates
    const snakeData = toSnakeCase(updateData) as any
    if (updateData.checklist) {
      snakeData.checklist = updateData.checklist
    }
    // Field fixups
    if ('client' in snakeData) delete snakeData.client
    if ('total_area' in snakeData) { snakeData.total_area_sqft = snakeData.total_area; delete snakeData.total_area }
    if ('is_demo' in snakeData) delete snakeData.is_demo

    const { data, error } = await supabase
      .from('projects')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const project = toCamelCase(data) as Project
    project.zones = []
    return project
  } catch (err: any) {
    console.error('updateProject error:', err.message)
    return null
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err: any) {
    console.error('deleteProject error:', err.message)
    return false
  }
}

// ===== ZONES =====

export async function createZone(projectId: string, zone: Omit<Zone, 'id' | 'createdAt'>, orgId: string): Promise<Zone | null> {
  try {
    const { materials, equipment, ...zoneData } = zone
    const snakeData = toSnakeCase(zoneData) as any
    snakeData.project_id = projectId
    snakeData.org_id = orgId
    snakeData.dependencies = zone.dependencies // Keep as array
    // Field fixups: frontend name → DB column name
    snakeData.area_sqft = snakeData.area; delete snakeData.area
    snakeData.perimeter_lnft = snakeData.perimeter; delete snakeData.perimeter
    snakeData.sequence_number = snakeData.sequence; delete snakeData.sequence
    snakeData.crew_assignment = snakeData.crew; delete snakeData.crew

    const { data, error } = await supabase
      .from('zones')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    return {
      ...toCamelCase(data),
      materials: [],
      equipment: []
    } as unknown as Zone
  } catch (err: any) {
    console.error('createZone error:', err.message)
    return null
  }
}

export async function updateZone(zoneId: string, updates: Partial<Zone>): Promise<Zone | null> {
  try {
    const { materials, equipment, ...updateData } = updates
    const snakeData = toSnakeCase(updateData) as any
    if (updateData.dependencies) {
      snakeData.dependencies = updateData.dependencies
    }
    // Field fixups
    if ('area' in snakeData) { snakeData.area_sqft = snakeData.area; delete snakeData.area }
    if ('perimeter' in snakeData) { snakeData.perimeter_lnft = snakeData.perimeter; delete snakeData.perimeter }
    if ('sequence' in snakeData) { snakeData.sequence_number = snakeData.sequence; delete snakeData.sequence }
    if ('crew' in snakeData) { snakeData.crew_assignment = snakeData.crew; delete snakeData.crew }

    const { data, error } = await supabase
      .from('zones')
      .update(snakeData)
      .eq('id', zoneId)
      .select()
      .single()

    if (error) throw error

    return {
      ...toCamelCase(data),
      materials: [],
      equipment: []
    } as unknown as Zone
  } catch (err: any) {
    console.error('updateZone error:', err.message)
    return null
  }
}

export async function deleteZone(zoneId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', zoneId)

    if (error) throw error
    return true
  } catch (err: any) {
    console.error('deleteZone error:', err.message)
    return false
  }
}

export async function setZoneMaterials(zoneId: string, materials: ZoneMaterial[]): Promise<boolean> {
  try {
    // Delete existing materials for this zone
    const { error: deleteError } = await supabase
      .from('zone_materials')
      .delete()
      .eq('zone_id', zoneId)

    if (deleteError) throw deleteError

    // Insert new materials if any
    if (materials.length > 0) {
      const insertData = materials.map(m => ({
        zone_id: zoneId,
        material_id: m.materialId,
        quantity: 1 // Default quantity
      }))

      const { error: insertError } = await supabase
        .from('zone_materials')
        .insert(insertData)

      if (insertError) throw insertError
    }

    return true
  } catch (err: any) {
    console.error('setZoneMaterials error:', err.message)
    return false
  }
}

export async function setZoneEquipment(zoneId: string, equipment: ZoneEquipment[]): Promise<boolean> {
  try {
    // Delete existing equipment for this zone
    const { error: deleteError } = await supabase
      .from('zone_equipment')
      .delete()
      .eq('zone_id', zoneId)

    if (deleteError) throw deleteError

    // Insert new equipment if any
    if (equipment.length > 0) {
      const insertData = equipment.map(e => ({
        zone_id: zoneId,
        equipment_id: e.equipId
      }))

      const { error: insertError } = await supabase
        .from('zone_equipment')
        .insert(insertData)

      if (insertError) throw insertError
    }

    return true
  } catch (err: any) {
    console.error('setZoneEquipment error:', err.message)
    return false
  }
}

// ===== MATERIALS =====

export async function fetchMaterials(): Promise<Material[]> {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')

    if (error) throw error

    return (data || []).map(material => {
      const m = toCamelCase(material) as any
      // Map DB column names → frontend field names
      m.unit = m.unitType ?? m.unit
      m.reserveOverride = m.reserveOverridePct ?? m.reserveOverride ?? null
      return m as Material
    })
  } catch (err: any) {
    console.error('fetchMaterials error:', err.message)
    return []
  }
}

export async function createMaterial(material: Omit<Material, 'id'>, id: string, orgId: string): Promise<Material | null> {
  try {
    const snakeData = toSnakeCase(material) as any
    snakeData.id = id
    snakeData.org_id = orgId
    // Field fixups: frontend name → DB column name
    if ('unit' in snakeData) { snakeData.unit_type = snakeData.unit; delete snakeData.unit }
    if ('reserve_override' in snakeData) { snakeData.reserve_override_pct = snakeData.reserve_override; delete snakeData.reserve_override }

    const { data, error } = await supabase
      .from('materials')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    return toCamelCase(data) as Material
  } catch (err: any) {
    console.error('createMaterial error:', err.message)
    return null
  }
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material | null> {
  try {
    const snakeData = toSnakeCase(updates) as any
    // Field fixups
    if ('unit' in snakeData) { snakeData.unit_type = snakeData.unit; delete snakeData.unit }
    if ('reserve_override' in snakeData) { snakeData.reserve_override_pct = snakeData.reserve_override; delete snakeData.reserve_override }

    const { data, error } = await supabase
      .from('materials')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return toCamelCase(data) as Material
  } catch (err: any) {
    console.error('updateMaterial error:', err.message)
    return null
  }
}

export async function deleteMaterial(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err: any) {
    console.error('deleteMaterial error:', err.message)
    return false
  }
}

// ===== CREW =====

export async function fetchCrew(): Promise<CrewMember[]> {
  try {
    const { data, error } = await supabase
      .from('crew_members')
      .select(`
        *,
        crew_certifications (
          id,
          label,
          expiry_date
        )
      `)

    if (error) throw error

    return (data || []).map(member => {
      const camelMember = toCamelCase(member) as any

      // Map crew_certifications to certs
      camelMember.certs = (camelMember.crewCertifications || []).map((cert: any) => ({
        certId: cert.id,
        label: cert.label,
        expiry: cert.expiryDate
      }))
      delete camelMember.crewCertifications

      // Parse JSONB fields
      if (typeof camelMember.skills === 'string') {
        camelMember.skills = JSON.parse(camelMember.skills)
      }
      if (typeof camelMember.availability === 'string') {
        camelMember.availability = JSON.parse(camelMember.availability)
      }
      if (typeof camelMember.bookedDates === 'string') {
        camelMember.bookedDates = JSON.parse(camelMember.bookedDates)
      }

      return camelMember as CrewMember
    })
  } catch (err: any) {
    console.error('fetchCrew error:', err.message)
    return []
  }
}

export async function createCrewMember(member: Omit<CrewMember, 'id'>, id: string, orgId: string): Promise<CrewMember | null> {
  try {
    const { certs, ...memberData } = member
    const snakeData = toSnakeCase(memberData) as any
    snakeData.id = id
    snakeData.org_id = orgId
    snakeData.skills = memberData.skills // Keep as array
    snakeData.availability = memberData.availability // Keep as object
    snakeData.booked_dates = memberData.bookedDates // Convert to snake_case

    const { data, error } = await supabase
      .from('crew_members')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    const crewMember = toCamelCase(data) as any
    crewMember.certs = []

    // Insert certifications if provided
    if (certs && certs.length > 0) {
      const certData = certs.map(cert => ({
        crew_id: crewMember.id,
        label: cert.label,
        expiry_date: cert.expiry
      }))

      const { data: certResults, error: certError } = await supabase
        .from('crew_certifications')
        .insert(certData)
        .select()

      if (certError) throw certError

      crewMember.certs = certResults.map((cert: any) => ({
        certId: cert.id,
        label: cert.label,
        expiry: cert.expiryDate
      }))
    }

    return crewMember as CrewMember
  } catch (err: any) {
    console.error('createCrewMember error:', err.message)
    return null
  }
}

export async function updateCrewMember(id: string, updates: Partial<CrewMember>): Promise<CrewMember | null> {
  try {
    const { certs, ...updateData } = updates
    const snakeData = toSnakeCase(updateData) as any
    if (updateData.skills) {
      snakeData.skills = updateData.skills
    }
    if (updateData.availability) {
      snakeData.availability = updateData.availability
    }
    if (updateData.bookedDates) {
      snakeData.booked_dates = updateData.bookedDates
    }

    const { data, error } = await supabase
      .from('crew_members')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const crewMember = toCamelCase(data) as any
    crewMember.certs = []

    // If certs were updated, delete old ones and insert new
    if (certs !== undefined) {
      await supabase.from('crew_certifications').delete().eq('crew_id', id)

      if (certs.length > 0) {
        const certData = certs.map(cert => ({
          crew_id: id,
          label: cert.label,
          expiry_date: cert.expiry
        }))

        const { data: certResults, error: certError } = await supabase
          .from('crew_certifications')
          .insert(certData)
          .select()

        if (certError) throw certError

        crewMember.certs = certResults.map((cert: any) => ({
          certId: cert.id,
          label: cert.label,
          expiry: cert.expiryDate
        }))
      }
    }

    return crewMember as CrewMember
  } catch (err: any) {
    console.error('updateCrewMember error:', err.message)
    return null
  }
}

export async function deleteCrewMember(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('crew_members')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err: any) {
    console.error('deleteCrewMember error:', err.message)
    return false
  }
}

// ===== EQUIPMENT =====

export async function fetchEquipment(): Promise<Equipment[]> {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        maintenance_log (
          id,
          service_date,
          service_type,
          hours,
          notes,
          cost,
          performed_by,
          next_due_date
        )
      `)

    if (error) throw error

    return (data || []).map(equip => {
      const camelEquip = toCamelCase(equip) as any

      // Map maintenance_log to maintenanceLog
      camelEquip.maintenanceLog = (camelEquip.maintenanceLog || []).map((entry: any) => {
        const camelEntry = toCamelCase(entry)
        return {
          ...camelEntry,
          date: camelEntry.serviceDate,
          type: camelEntry.serviceType,
          by: camelEntry.performedBy,
          nextDue: camelEntry.nextDueDate
        }
      })

      // Parse capabilities array
      if (typeof camelEquip.capabilities === 'string') {
        camelEquip.capabilities = JSON.parse(camelEquip.capabilities)
      }

      // Map DB column names → frontend field names
      camelEquip.serial = camelEquip.serialNumber ?? camelEquip.serial ?? ''
      camelEquip.plate = camelEquip.licensePlate ?? camelEquip.plate ?? ''
      camelEquip.lastService = camelEquip.lastServiceDate ?? camelEquip.lastService ?? ''
      camelEquip.nextService = camelEquip.nextServiceDate ?? camelEquip.nextService ?? ''
      camelEquip.value = camelEquip.equipmentValue ?? camelEquip.value ?? 0
      camelEquip.insurance = camelEquip.insuranceProvider ?? camelEquip.insurance ?? ''
      camelEquip.regExpiry = camelEquip.registrationExpiry ?? camelEquip.regExpiry ?? ''
      camelEquip.inspectionDue = camelEquip.inspectionDueDate ?? camelEquip.inspectionDue ?? ''
      camelEquip.assignedProject = camelEquip.assignedProjectId ?? camelEquip.assignedProject ?? ''
      camelEquip.operator = camelEquip.operatorId ?? camelEquip.operator ?? ''

      return camelEquip as Equipment
    })
  } catch (err: any) {
    console.error('fetchEquipment error:', err.message)
    return []
  }
}

export async function createEquipment(equip: Omit<Equipment, 'id'>, id: string, orgId: string): Promise<Equipment | null> {
  try {
    const { maintenanceLog, ...equipData } = equip
    const snakeData = toSnakeCase(equipData) as any
    snakeData.id = id
    snakeData.org_id = orgId
    snakeData.capabilities = equipData.capabilities // Keep as array
    // Field fixups: frontend name → DB column name
    if ('serial' in snakeData) { snakeData.serial_number = snakeData.serial; delete snakeData.serial }
    if ('plate' in snakeData) { snakeData.license_plate = snakeData.plate; delete snakeData.plate }
    if ('last_service' in snakeData) { snakeData.last_service_date = snakeData.last_service; delete snakeData.last_service }
    if ('next_service' in snakeData) { snakeData.next_service_date = snakeData.next_service; delete snakeData.next_service }
    if ('value' in snakeData) { snakeData.equipment_value = snakeData.value; delete snakeData.value }
    if ('insurance' in snakeData) { snakeData.insurance_provider = snakeData.insurance; delete snakeData.insurance }
    if ('reg_expiry' in snakeData) { snakeData.registration_expiry = snakeData.reg_expiry; delete snakeData.reg_expiry }
    if ('inspection_due' in snakeData) { snakeData.inspection_due_date = snakeData.inspection_due; delete snakeData.inspection_due }
    // Strip FK string fields — DB expects UUID, frontend stores string refs
    delete snakeData.assigned_project
    delete snakeData.operator

    const { data, error } = await supabase
      .from('equipment')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    return {
      ...toCamelCase(data),
      maintenanceLog: []
    } as unknown as Equipment
  } catch (err: any) {
    console.error('createEquipment error:', err.message)
    return null
  }
}

export async function updateEquipment(id: string, updates: Partial<Equipment>): Promise<Equipment | null> {
  try {
    const { maintenanceLog, ...updateData } = updates
    const snakeData = toSnakeCase(updateData) as any
    if (updateData.capabilities) {
      snakeData.capabilities = updateData.capabilities
    }
    // Field fixups
    if ('serial' in snakeData) { snakeData.serial_number = snakeData.serial; delete snakeData.serial }
    if ('plate' in snakeData) { snakeData.license_plate = snakeData.plate; delete snakeData.plate }
    if ('last_service' in snakeData) { snakeData.last_service_date = snakeData.last_service; delete snakeData.last_service }
    if ('next_service' in snakeData) { snakeData.next_service_date = snakeData.next_service; delete snakeData.next_service }
    if ('value' in snakeData) { snakeData.equipment_value = snakeData.value; delete snakeData.value }
    if ('insurance' in snakeData) { snakeData.insurance_provider = snakeData.insurance; delete snakeData.insurance }
    if ('reg_expiry' in snakeData) { snakeData.registration_expiry = snakeData.reg_expiry; delete snakeData.reg_expiry }
    if ('inspection_due' in snakeData) { snakeData.inspection_due_date = snakeData.inspection_due; delete snakeData.inspection_due }
    if ('assigned_project' in snakeData) delete snakeData.assigned_project
    if ('operator' in snakeData) delete snakeData.operator

    const { data, error } = await supabase
      .from('equipment')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return {
      ...toCamelCase(data),
      maintenanceLog: []
    } as unknown as Equipment
  } catch (err: any) {
    console.error('updateEquipment error:', err.message)
    return null
  }
}

export async function deleteEquipment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err: any) {
    console.error('deleteEquipment error:', err.message)
    return false
  }
}

export async function addMaintenanceEntry(equipId: string, entry: Omit<MaintenanceEntry, 'id'>): Promise<MaintenanceEntry | null> {
  try {
    const snakeData = {
      equipment_id: equipId,
      service_date: entry.date,
      service_type: entry.type,
      hours: entry.hours,
      notes: entry.notes,
      cost: entry.cost,
      performed_by: entry.by,
      next_due_date: entry.nextDue
    }

    const { data, error } = await supabase
      .from('maintenance_log')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      date: data.service_date,
      type: data.service_type,
      hours: data.hours,
      notes: data.notes,
      cost: data.cost,
      by: data.performed_by,
      nextDue: data.next_due_date
    } as MaintenanceEntry
  } catch (err: any) {
    console.error('addMaintenanceEntry error:', err.message)
    return null
  }
}
