import { supabase } from './supabase'
import { toCamelCase, toSnakeCase } from './supabaseCore'
import type { Equipment, MaintenanceEntry } from '@/types'

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
      const camelEquip = toCamelCase(equip) as Record<string, unknown>

      // Map maintenance_log to maintenanceLog
      const logEntries = camelEquip.maintenanceLog as Array<Record<string, unknown>> | undefined;
      camelEquip.maintenanceLog = (logEntries || []).map((entry) => {
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
        camelEquip.capabilities = JSON.parse(camelEquip.capabilities as string)
      }

      // Map DB column names → frontend field names
      camelEquip.serial = (camelEquip.serialNumber as string) ?? (camelEquip.serial as string) ?? ''
      camelEquip.plate = (camelEquip.licensePlate as string) ?? (camelEquip.plate as string) ?? ''
      camelEquip.lastService = (camelEquip.lastServiceDate as string) ?? (camelEquip.lastService as string) ?? ''
      camelEquip.nextService = (camelEquip.nextServiceDate as string) ?? (camelEquip.nextService as string) ?? ''
      camelEquip.value = (camelEquip.equipmentValue as number) ?? (camelEquip.value as number) ?? 0
      camelEquip.insurance = (camelEquip.insuranceProvider as string) ?? (camelEquip.insurance as string) ?? ''
      camelEquip.regExpiry = (camelEquip.registrationExpiry as string) ?? (camelEquip.regExpiry as string) ?? ''
      camelEquip.inspectionDue = (camelEquip.inspectionDueDate as string) ?? (camelEquip.inspectionDue as string) ?? ''
      camelEquip.assignedProject = (camelEquip.assignedProjectId as string) ?? (camelEquip.assignedProject as string) ?? ''
      camelEquip.operator = (camelEquip.operatorId as string) ?? (camelEquip.operator as string) ?? ''

      return camelEquip as unknown as Equipment
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('fetchEquipment error:', message)
    return []
  }
}

export async function createEquipment(equip: Omit<Equipment, 'id'>, id: string, orgId: string): Promise<Equipment | null> {
  try {
    const { maintenanceLog, ...equipData } = equip
    const snakeData = toSnakeCase(equipData as unknown as Record<string, unknown>) as Record<string, unknown>
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
  } catch (err: unknown) {
    console.error('createEquipment error:', err)
    return null
  }
}

export async function updateEquipment(id: string, updates: Partial<Equipment>): Promise<Equipment | null> {
  try {
    const { maintenanceLog, ...updateData } = updates
    const snakeData = toSnakeCase(updateData as unknown as Record<string, unknown>) as Record<string, unknown>
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
    // F-CW-46: column is assigned_project_id (uuid). Camel→snake produces
    // `assigned_project`, which previously got deleted (so wizard's
    // equipment-accept never persisted the assignment). Rename it instead
    // and coerce empty string → null so we can also clear an assignment.
    if ('assigned_project' in snakeData) {
      const v = snakeData.assigned_project
      snakeData.assigned_project_id = typeof v === 'string' && v.length > 0 ? v : null
      delete snakeData.assigned_project
    }
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('updateEquipment error:', message)
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
  } catch {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('addMaintenanceEntry error:', message)
    return null
  }
}
