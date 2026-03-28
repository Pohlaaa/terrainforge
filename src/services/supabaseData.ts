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

export async function createZone(projectId: string, zone: Omit<Zone, 'id' | 'createdAt'>): Promise<Zone | null> {
  try {
    const { materials, equipment, ...zoneData } = zone
    const snakeData = toSnakeCase(zoneData) as any
    snakeData.project_id = projectId
    snakeData.dependencies = zone.dependencies // Keep as array

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

    return (data || []).map(material => toCamelCase(material)) as Material[]
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
