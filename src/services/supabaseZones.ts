import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, onSupabaseError } from './supabaseCore'
import type { Zone, ZoneMaterial, ZoneMaterialDetail, ZoneEquipment } from '@/types'

// ===== ZONES =====

export async function createZone(projectId: string, zone: Omit<Zone, 'id' | 'createdAt'>, orgId: string): Promise<Zone | null> {
  try {
    const { materials, equipment, ...zoneData } = zone
    const snakeData = toSnakeCase(zoneData as unknown as Record<string, unknown>) as Record<string, unknown>
    snakeData.project_id = projectId
    snakeData.org_id = orgId
    snakeData.dependencies = zone.dependencies // Keep as array
    // Field fixups: frontend name → DB column name
    snakeData.area_sqft = snakeData.area; delete snakeData.area
    snakeData.perimeter_lnft = snakeData.perimeter; delete snakeData.perimeter
    snakeData.sequence_number = snakeData.sequence; delete snakeData.sequence
    snakeData.crew_assignment = snakeData.crew; delete snakeData.crew
    // CHECK constraints reject 0 but pass on NULL — coerce 0/falsy to null
    if (!snakeData.area_sqft || (snakeData.area_sqft as number) <= 0) snakeData.area_sqft = null
    if (!snakeData.perimeter_lnft || (snakeData.perimeter_lnft as number) <= 0) snakeData.perimeter_lnft = null

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
  } catch (err: unknown) {
    onSupabaseError('INSERT', 'zones', err)
    return null
  }
}

export async function updateZone(zoneId: string, updates: Partial<Zone>): Promise<Zone | null> {
  try {
    const { materials, equipment, ...updateData } = updates
    const snakeData = toSnakeCase(updateData as unknown as Record<string, unknown>) as Record<string, unknown>
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('setZoneMaterials error:', message)
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('setZoneEquipment error:', message)
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

    return (data || []).map((row: Record<string, unknown>) => {
      const zones = row.zones as Record<string, unknown> | null;
      const materials = row.materials as Record<string, unknown> | null;
      return {
        zoneId: row.zone_id as string,
        zoneName: (zones?.name as string) || '',
        materialId: row.material_id as string,
        materialName: (materials?.name as string) || '',
        category: (materials?.category as string) || '',
        quantity: (row.quantity as number) ?? 1,
        unit: (materials?.unit as string) || '',
        unitCost: (materials?.cost as number) ?? 0,
      };
    });
  } catch (err: unknown) {
    onSupabaseError('SELECT', 'zone_materials', err);
    return [];
  }
}
