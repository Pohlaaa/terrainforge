import { supabase } from './supabase'
import type { Project, Zone, ZoneMaterial, ZoneMaterialDetail, ZoneEquipment, Material, CrewMember, Equipment, MaintenanceEntry, CrewCert, ScheduleEntry, ProjectTask, ProjectSiteCondition, ProjectSubcontractor, ProjectDocument, ProjectPermit } from '@/types'

// ===== ERROR REPORTING =====

type ErrorReporter = (operation: string, table: string, error: any) => void;
let onSupabaseError: ErrorReporter = (op, table, err) => {
  console.error(`[TF-SUPABASE] ${op} on ${table} failed:`, err?.message || err, err?.details || '', err?.hint || '');
};

export function setSupabaseErrorReporter(reporter: ErrorReporter) {
  onSupabaseError = reporter;
}

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

export async function fetchProjects(orgId: string): Promise<Project[]> {
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
      .eq('org_id', orgId)

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

      // Parse project-level materials from JSONB
      if (typeof camelProject.materials === 'string') {
        try { camelProject.materials = JSON.parse(camelProject.materials) } catch { camelProject.materials = [] }
      }
      if (!Array.isArray(camelProject.materials)) {
        camelProject.materials = []
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
    const { zones, materials: projectMaterials, ...projectData } = project as any
    const snakeData = toSnakeCase(projectData) as any
    snakeData.id = id
    snakeData.org_id = orgId
    snakeData.checklist = project.checklist // Keep as object, Supabase will handle JSONB
    // Field fixups: frontend name → DB column name
    delete snakeData.client       // string, DB expects client_id UUID FK (unused)
    delete snakeData.is_demo      // frontend-only flag, no DB column
    snakeData.total_area_sqft = snakeData.total_area; delete snakeData.total_area
    if (snakeData.start_date === '') snakeData.start_date = null
    if (snakeData.target_date === '') snakeData.target_date = null


    const { data, error } = await supabase
      .from('projects')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    // Persist project-level materials if provided
    if (projectMaterials && projectMaterials.length > 0) {
      await supabase
        .from('projects')
        .update({ materials: projectMaterials })
        .eq('id', id)
    }

    // Write zones to the zones table now that the project row exists
    if (zones && zones.length > 0) {
      for (const { id: _zoneId, createdAt: _createdAt, ...zoneData } of zones) {
        const result = await createZone(id, zoneData, orgId)
        if (!result) {
          console.warn(`[TF-SUPABASE] Zone "${zoneData.name}" failed to persist for project ${id}`)
        }
      }
    }

    return {
      ...toCamelCase(data),
      zones: []
    } as unknown as Project
  } catch (err: any) {
    onSupabaseError('INSERT', 'projects', err)
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
    onSupabaseError('UPDATE', 'projects', err)
    return null
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
    return true
  } catch (err: any) {
    onSupabaseError('DELETE', 'projects', err)
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
    // CHECK constraints reject 0 but pass on NULL — coerce 0/falsy to null
    if (!snakeData.area_sqft || snakeData.area_sqft <= 0) snakeData.area_sqft = null
    if (!snakeData.perimeter_lnft || snakeData.perimeter_lnft <= 0) snakeData.perimeter_lnft = null

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
    onSupabaseError('INSERT', 'zones', err)
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
    onSupabaseError('UPDATE', 'zones', err)
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
    onSupabaseError('DELETE', 'zones', err)
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

// ===== ZONE MATERIAL DETAILS (for Materials tab) =====

export async function fetchZoneMaterialDetails(
  projectId: string
): Promise<ZoneMaterialDetail[]> {
  try {
    const { data, error } = await supabase
      .from('zone_materials')
      .select(`
        zone_id,
        material_id,
        quantity,
        zones!inner (id, name, project_id),
        materials!inner (name, category, unit, cost)
      `)
      .eq('zones.project_id', projectId);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      zoneId: row.zone_id,
      zoneName: row.zones?.name || '',
      materialId: row.material_id,
      materialName: row.materials?.name || '',
      category: row.materials?.category || '',
      quantity: row.quantity ?? 1,
      unit: row.materials?.unit || '',
      unitCost: row.materials?.cost ?? 0,
    }));
  } catch (err: any) {
    onSupabaseError('SELECT', 'zone_materials', err);
    return [];
  }
}

// ===== MATERIALS =====

export async function fetchMaterials(orgId: string): Promise<Material[]> {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('org_id', orgId)

    if (error) throw error

    return (data || []).map(material => {
      const m = toCamelCase(material) as any
      // Map DB column names → frontend field names
      // After migration 006: DB column is `unit` (TEXT), no longer `unit_type` (ENUM)
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
    // After migration 006: DB column is `unit` (TEXT), matches frontend — no rename needed
    if ('reserve_override' in snakeData) { snakeData.reserve_override_pct = snakeData.reserve_override; delete snakeData.reserve_override }

    const { data, error } = await supabase
      .from('materials')
      .insert([snakeData])
      .select()
      .single()

    if (error) throw error

    return toCamelCase(data) as Material
  } catch (err: any) {
    console.error('createMaterial error:', err)
    return null
  }
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material | null> {
  try {
    const snakeData = toSnakeCase(updates) as any
    // Field fixups
    // After migration 006: DB column is `unit` (TEXT), matches frontend — no rename needed
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

    if (error) {
      throw error
    }
    return true
  } catch (err: any) {
    return false
  }
}

// ===== CREW =====

export async function fetchCrew(orgId: string): Promise<CrewMember[]> {
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
      .eq('org_id', orgId)

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
    console.error('createCrewMember error:', err)
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

export async function fetchEquipment(orgId: string): Promise<Equipment[]> {
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
      .eq('org_id', orgId)

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
    if ('last_service' in snakeData) { snakeData.last_service_date = snakeData.last_service || null; delete snakeData.last_service }
    if ('next_service' in snakeData) { snakeData.next_service_date = snakeData.next_service || null; delete snakeData.next_service }
    if ('value' in snakeData) { snakeData.equipment_value = snakeData.value; delete snakeData.value }
    if ('insurance' in snakeData) { snakeData.insurance_provider = snakeData.insurance; delete snakeData.insurance }
    if ('insurance_expiry' in snakeData && !snakeData.insurance_expiry) snakeData.insurance_expiry = null
    if ('reg_expiry' in snakeData) { snakeData.registration_expiry = snakeData.reg_expiry || null; delete snakeData.reg_expiry }
    if ('inspection_due' in snakeData) { snakeData.inspection_due_date = snakeData.inspection_due || null; delete snakeData.inspection_due }
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
    console.error('createEquipment error:', err)
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
    if ('last_service' in snakeData) { snakeData.last_service_date = snakeData.last_service || null; delete snakeData.last_service }
    if ('next_service' in snakeData) { snakeData.next_service_date = snakeData.next_service || null; delete snakeData.next_service }
    if ('value' in snakeData) { snakeData.equipment_value = snakeData.value; delete snakeData.value }
    if ('insurance' in snakeData) { snakeData.insurance_provider = snakeData.insurance; delete snakeData.insurance }
    if ('insurance_expiry' in snakeData && !snakeData.insurance_expiry) snakeData.insurance_expiry = null
    if ('reg_expiry' in snakeData) { snakeData.registration_expiry = snakeData.reg_expiry || null; delete snakeData.reg_expiry }
    if ('inspection_due' in snakeData) { snakeData.inspection_due_date = snakeData.inspection_due || null; delete snakeData.inspection_due }
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

    if (error) {
      throw error
    }
    return true
  } catch (err: any) {
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

// ===== SCHEDULE ENTRIES =====

export async function fetchScheduleEntries(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<ScheduleEntry[]> {
  try {
    const { data, error } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('org_id', orgId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as ScheduleEntry);
  } catch (err: any) {
    onSupabaseError('SELECT', 'schedule_entries', err);
    return [];
  }
}

export async function createScheduleEntry(
  data: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<void> {
  try {
    const snakeData = toSnakeCase(data as Record<string, any>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { error } = await supabase.from('schedule_entries').insert([snakeData]);
    if (error) throw error;
  } catch (err: any) {
    onSupabaseError('INSERT', 'schedule_entries', err);
  }
}

export async function updateScheduleEntry(
  id: string,
  updates: Partial<ScheduleEntry>
): Promise<void> {
  try {
    const snakeData = toSnakeCase(updates as Record<string, any>);
    snakeData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('schedule_entries')
      .update(snakeData)
      .eq('id', id);

    if (error) throw error;
  } catch (err: any) {
    onSupabaseError('UPDATE', 'schedule_entries', err);
  }
}

export async function deleteScheduleEntry(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (err: any) {
    onSupabaseError('DELETE', 'schedule_entries', err);
  }
}

// ===== CREW STATUS =====

export async function fetchCrewStatus(crewMemberId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('crew_status')
      .select('status')
      .eq('crew_member_id', crewMemberId)
      .single();
    if (error) return 'off_duty';
    return data?.status || 'off_duty';
  } catch {
    return 'off_duty';
  }
}

export async function upsertCrewStatus(
  orgId: string,
  crewMemberId: string,
  scheduleEntryId: string,
  status: string,
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('crew_status')
      .select('id')
      .eq('crew_member_id', crewMemberId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('crew_status')
        .update({
          status,
          schedule_entry_id: scheduleEntryId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('crew_status')
        .insert([{
          org_id: orgId,
          crew_member_id: crewMemberId,
          schedule_entry_id: scheduleEntryId,
          status,
        }]);
      if (error) throw error;
    }
  } catch (err: any) {
    onSupabaseError('UPSERT', 'crew_status', err);
  }
}

// ===== CREW CHECKLIST PROGRESS =====

export async function fetchChecklistProgress(
  scheduleEntryId: string,
): Promise<Array<{ zoneId: string; stepNumber: number }>> {
  try {
    const { data, error } = await supabase
      .from('crew_checklist_progress')
      .select('zone_id, step_number')
      .eq('schedule_entry_id', scheduleEntryId);
    if (error) throw error;
    return (data || []).map(row => ({
      zoneId: row.zone_id,
      stepNumber: row.step_number,
    }));
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_checklist_progress', err);
    return [];
  }
}

export async function saveChecklistStep(
  orgId: string,
  scheduleEntryId: string,
  crewMemberId: string,
  zoneId: string,
  stepNumber: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('crew_checklist_progress')
      .insert([{
        org_id: orgId,
        schedule_entry_id: scheduleEntryId,
        crew_member_id: crewMemberId,
        zone_id: zoneId,
        step_number: stepNumber,
      }]);
    if (error) throw error;
  } catch (err: any) {
    if (err?.code === '23505') return; // unique constraint — step already saved
    onSupabaseError('INSERT', 'crew_checklist_progress', err);
  }
}

export async function removeChecklistStep(
  scheduleEntryId: string,
  zoneId: string,
  stepNumber: number,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('crew_checklist_progress')
      .delete()
      .eq('schedule_entry_id', scheduleEntryId)
      .eq('zone_id', zoneId)
      .eq('step_number', stepNumber);
    if (error) throw error;
  } catch (err: any) {
    onSupabaseError('DELETE', 'crew_checklist_progress', err);
  }
}

// ===== CREW PHOTOS =====

export interface CrewPhoto {
  id: string;
  storagePath: string;
  caption: string;
  zoneId: string | null;
  stepNumber: number | null;
  uploadedAt: string;
}

export async function uploadCrewPhoto(
  orgId: string,
  scheduleEntryId: string,
  crewMemberId: string,
  file: File,
  zoneId?: string,
  stepNumber?: number,
  caption?: string,
): Promise<CrewPhoto | null> {
  try {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${orgId}/${scheduleEntryId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('crew-photos')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('crew_photos')
      .insert([{
        org_id: orgId,
        schedule_entry_id: scheduleEntryId,
        crew_member_id: crewMemberId,
        zone_id: zoneId || null,
        step_number: stepNumber || null,
        storage_path: path,
        caption: caption || '',
      }])
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      storagePath: data.storage_path,
      caption: data.caption,
      zoneId: data.zone_id,
      stepNumber: data.step_number,
      uploadedAt: data.uploaded_at,
    };
  } catch (err: any) {
    onSupabaseError('UPLOAD', 'crew_photos', err);
    return null;
  }
}

export async function fetchCrewPhotos(
  scheduleEntryId: string,
): Promise<CrewPhoto[]> {
  try {
    const { data, error } = await supabase
      .from('crew_photos')
      .select('id, storage_path, caption, zone_id, step_number, uploaded_at')
      .eq('schedule_entry_id', scheduleEntryId)
      .order('uploaded_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      storagePath: row.storage_path,
      caption: row.caption,
      zoneId: row.zone_id,
      stepNumber: row.step_number,
      uploadedAt: row.uploaded_at,
    }));
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_photos', err);
    return [];
  }
}

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('crew-photos')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl || '';
}

export async function deleteCrewPhoto(id: string, storagePath: string): Promise<boolean> {
  try {
    await supabase.storage.from('crew-photos').remove([storagePath]);
    const { error } = await supabase.from('crew_photos').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err: any) {
    onSupabaseError('DELETE', 'crew_photos', err);
    return false;
  }
}

// ===== CREW STATUS (BATCH) =====

export async function fetchAllCrewStatuses(
  orgId: string,
): Promise<Array<{ crewMemberId: string; status: string }>> {
  try {
    const { data, error } = await supabase
      .from('crew_status')
      .select('crew_member_id, status')
      .eq('org_id', orgId);
    if (error) throw error;
    return (data || []).map(row => ({
      crewMemberId: row.crew_member_id,
      status: row.status,
    }));
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_status', err);
    return [];
  }
}

export async function fetchChecklistProgressCounts(
  scheduleEntryIds: string[],
): Promise<Record<string, number>> {
  if (scheduleEntryIds.length === 0) return {};
  try {
    const { data, error } = await supabase
      .from('crew_checklist_progress')
      .select('schedule_entry_id')
      .in('schedule_entry_id', scheduleEntryIds);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.schedule_entry_id] = (counts[row.schedule_entry_id] || 0) + 1;
    }
    return counts;
  } catch (err: any) {
    onSupabaseError('SELECT', 'crew_checklist_progress', err);
    return {};
  }
}

// ===== DIAGNOSTICS =====

// ===== SAMPLE DATA =====

interface SampleIds {
  projects: string[];
  crew: string[];
  equipment: string[];
  materials: string[];
  tasks: string[];
}

export async function insertSampleData(orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { getSampleProjects, getSampleCrew, getSampleEquipment, getSampleMaterials, getSampleTasks } = await import('@/lib/sampleData');
    const ids: SampleIds = { projects: [], crew: [], equipment: [], materials: [], tasks: [] };

    // Materials first (no deps)
    for (const mat of getSampleMaterials()) {
      const id = crypto.randomUUID();
      const result = await createMaterial(mat, id, orgId);
      if (result) ids.materials.push(id);
    }

    // Crew
    for (const member of getSampleCrew()) {
      const id = crypto.randomUUID();
      const result = await createCrewMember(member, id, orgId);
      if (result) ids.crew.push(id);
    }

    // Equipment
    for (const equip of getSampleEquipment()) {
      const id = crypto.randomUUID();
      const result = await createEquipment(equip, id, orgId);
      if (result) ids.equipment.push(id);
    }

    // Projects (with zones)
    const sampleTasks = getSampleTasks();
    for (const proj of getSampleProjects()) {
      const id = crypto.randomUUID();
      const result = await createProject(proj, id, orgId);
      if (result) {
        ids.projects.push(id);
        // Insert tasks for this project
        const tasks = sampleTasks[proj.name];
        if (tasks) {
          for (const task of tasks) {
            const taskId = crypto.randomUUID();
            const taskResult = await createProjectTask(
              {
                orgId,
                projectId: id,
                zoneId: null,
                name: task.name,
                description: task.description,
                phase: task.phase,
                sequenceNumber: task.sequenceNumber,
                status: task.status,
                assignedCrewId: null,
                estimatedHours: null,
                actualHours: null,
                dependsOn: [],
                scheduledDate: null,
                completedAt: null,
                aiGenerated: task.aiGenerated,
                aiConfidence: null,
              },
              taskId,
              orgId,
            );
            if (taskResult) ids.tasks.push(taskId);
          }
        }
      }
    }

    // Persist IDs for cleanup
    localStorage.setItem('tf-sample-ids', JSON.stringify(ids));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

export async function clearSampleData(orgId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const raw = localStorage.getItem('tf-sample-ids');
    if (!raw) return { success: true };
    const ids: SampleIds = JSON.parse(raw);

    // Delete in reverse dependency order: tasks, projects (zones cascade), equipment, crew, materials
    if (ids.tasks) {
      for (const id of ids.tasks) {
        await deleteProjectTask(id);
      }
    }
    for (const id of ids.projects) {
      await deleteProject(id);
    }
    for (const id of ids.equipment) {
      await deleteEquipment(id);
    }
    for (const id of ids.crew) {
      await deleteCrewMember(id);
    }
    for (const id of ids.materials) {
      await deleteMaterial(id);
    }

    localStorage.removeItem('tf-sample-ids');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

export async function diagnoseUserRole(): Promise<void> {
  if (!import.meta.env.DEV) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[TF-DIAG] No authenticated user');
      return;
    }

    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id);

    if (error) {
      console.warn('[TF-DIAG] Could not fetch memberships:', error.message);
      return;
    }

    if (memberships && memberships.length > 0) {
      const hasAdmin = memberships.some((m: any) => m.role === 'admin');
      const hasForeman = memberships.some((m: any) => m.role === 'foreman');

      if (!hasAdmin && !hasForeman) {
        console.warn('[TF-DIAG] ⚠️  User has no admin or foreman role. Zone and crew operations will be blocked by RLS.');
        console.warn('[TF-DIAG] Current roles:', memberships.map((m: any) => m.role).join(', '));
        console.warn('[TF-DIAG] Fix: Run in Supabase SQL Editor:');
        console.warn(`[TF-DIAG]   UPDATE organization_members SET role = 'admin' WHERE user_id = '${user.id}';`);
      }
    } else {
      console.warn('[TF-DIAG] ⚠️  User has NO organization memberships. All RLS checks will fail.');
    }
  } catch (err: any) {
    console.warn('[TF-DIAG] Role check failed:', err.message);
  }
}

// ===== PROJECT TASKS =====

export async function fetchProjectTasks(
  orgId: string,
  projectId: string
): Promise<ProjectTask[]> {
  try {
    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('sequence_number', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => {
      const camel = toCamelCase(row) as ProjectTask;
      // Ensure depends_on comes back as an array even if null
      if (!camel.dependsOn) camel.dependsOn = [];
      return camel;
    });
  } catch (err: any) {
    onSupabaseError('SELECT', 'project_tasks', err);
    return [];
  }
}

export async function createProjectTask(
  task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectTask | null> {
  try {
    const snakeData = toSnakeCase(task as unknown as Record<string, any>);
    snakeData.id = id;
    snakeData.org_id = orgId;
    // depends_on is a UUID[] — keep as-is
    snakeData.depends_on = task.dependsOn || [];

    const { data, error } = await supabase
      .from('project_tasks')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    const result = toCamelCase(data) as ProjectTask;
    if (!result.dependsOn) result.dependsOn = [];
    return result;
  } catch (err: any) {
    onSupabaseError('INSERT', 'project_tasks', err);
    return null;
  }
}

export async function updateProjectTask(
  id: string,
  updates: Partial<ProjectTask>
): Promise<ProjectTask | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, any>);
    if (updates.dependsOn !== undefined) {
      snakeData.depends_on = updates.dependsOn;
    }

    const { data, error } = await supabase
      .from('project_tasks')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const result = toCamelCase(data) as ProjectTask;
    if (!result.dependsOn) result.dependsOn = [];
    return result;
  } catch (err: any) {
    onSupabaseError('UPDATE', 'project_tasks', err);
    return null;
  }
}

export async function deleteProjectTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: any) {
    onSupabaseError('DELETE', 'project_tasks', err);
    return false;
  }
}

// ===== PROJECT SITE CONDITIONS =====

export async function fetchProjectSiteConditions(
  orgId: string,
  projectId: string
): Promise<ProjectSiteCondition[]> {
  try {
    const { data, error } = await supabase
      .from('project_site_conditions')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as ProjectSiteCondition);
  } catch (err: any) {
    onSupabaseError('SELECT', 'project_site_conditions', err);
    return [];
  }
}

export async function createProjectSiteCondition(
  condition: Omit<ProjectSiteCondition, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectSiteCondition | null> {
  try {
    const snakeData = toSnakeCase(condition as unknown as Record<string, any>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_site_conditions')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectSiteCondition;
  } catch (err: any) {
    onSupabaseError('INSERT', 'project_site_conditions', err);
    return null;
  }
}

export async function updateProjectSiteCondition(
  id: string,
  updates: Partial<ProjectSiteCondition>
): Promise<ProjectSiteCondition | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, any>);

    const { data, error } = await supabase
      .from('project_site_conditions')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectSiteCondition;
  } catch (err: any) {
    onSupabaseError('UPDATE', 'project_site_conditions', err);
    return null;
  }
}

export async function deleteProjectSiteCondition(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_site_conditions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: any) {
    onSupabaseError('DELETE', 'project_site_conditions', err);
    return false;
  }
}

// ===== PROJECT SUBCONTRACTORS =====

export async function fetchProjectSubcontractors(
  orgId: string,
  projectId: string
): Promise<ProjectSubcontractor[]> {
  try {
    const { data, error } = await supabase
      .from('project_subcontractors')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as ProjectSubcontractor);
  } catch (err: any) {
    onSupabaseError('SELECT', 'project_subcontractors', err);
    return [];
  }
}

export async function createProjectSubcontractor(
  sub: Omit<ProjectSubcontractor, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectSubcontractor | null> {
  try {
    const snakeData = toSnakeCase(sub as unknown as Record<string, any>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_subcontractors')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectSubcontractor;
  } catch (err: any) {
    onSupabaseError('INSERT', 'project_subcontractors', err);
    return null;
  }
}

export async function updateProjectSubcontractor(
  id: string,
  updates: Partial<ProjectSubcontractor>
): Promise<ProjectSubcontractor | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, any>);

    const { data, error } = await supabase
      .from('project_subcontractors')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectSubcontractor;
  } catch (err: any) {
    onSupabaseError('UPDATE', 'project_subcontractors', err);
    return null;
  }
}

export async function deleteProjectSubcontractor(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_subcontractors')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: any) {
    onSupabaseError('DELETE', 'project_subcontractors', err);
    return false;
  }
}

// ===== PROJECT DOCUMENTS =====

export async function fetchProjectDocuments(
  orgId: string,
  projectId: string
): Promise<ProjectDocument[]> {
  try {
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as ProjectDocument);
  } catch (err: any) {
    onSupabaseError('SELECT', 'project_documents', err);
    return [];
  }
}

export async function createProjectDocument(
  doc: Omit<ProjectDocument, 'id' | 'createdAt'>,
  id: string,
  orgId: string
): Promise<ProjectDocument | null> {
  try {
    const snakeData = toSnakeCase(doc as unknown as Record<string, any>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_documents')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectDocument;
  } catch (err: any) {
    onSupabaseError('INSERT', 'project_documents', err);
    return null;
  }
}

export async function updateProjectDocument(
  id: string,
  updates: Partial<ProjectDocument>
): Promise<ProjectDocument | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, any>);

    const { data, error } = await supabase
      .from('project_documents')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectDocument;
  } catch (err: any) {
    onSupabaseError('UPDATE', 'project_documents', err);
    return null;
  }
}

export async function deleteProjectDocument(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: any) {
    onSupabaseError('DELETE', 'project_documents', err);
    return false;
  }
}

// ===== PROJECT PERMITS =====

export async function fetchProjectPermits(
  orgId: string,
  projectId: string
): Promise<ProjectPermit[]> {
  try {
    const { data, error } = await supabase
      .from('project_permits')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => toCamelCase(row) as ProjectPermit);
  } catch (err: any) {
    onSupabaseError('SELECT', 'project_permits', err);
    return [];
  }
}

export async function createProjectPermit(
  permit: Omit<ProjectPermit, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  orgId: string
): Promise<ProjectPermit | null> {
  try {
    const snakeData = toSnakeCase(permit as unknown as Record<string, any>);
    snakeData.id = id;
    snakeData.org_id = orgId;

    const { data, error } = await supabase
      .from('project_permits')
      .insert([snakeData])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectPermit;
  } catch (err: any) {
    onSupabaseError('INSERT', 'project_permits', err);
    return null;
  }
}

export async function updateProjectPermit(
  id: string,
  updates: Partial<ProjectPermit>
): Promise<ProjectPermit | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, any>);

    const { data, error } = await supabase
      .from('project_permits')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as ProjectPermit;
  } catch (err: any) {
    onSupabaseError('UPDATE', 'project_permits', err);
    return null;
  }
}

export async function deleteProjectPermit(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_permits')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err: any) {
    onSupabaseError('DELETE', 'project_permits', err);
    return false;
  }
}
