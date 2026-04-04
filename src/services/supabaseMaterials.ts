import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, sanitizeTimestamps } from './supabaseCore'
import type { Material } from '@/types'

// ===== MATERIALS =====

export async function fetchMaterials(orgId: string): Promise<Material[]> {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('org_id', orgId)

    if (error) throw error

    return (data || []).map(material => {
      const m = toCamelCase(material) as Record<string, unknown>
      // Map DB column names → frontend field names
      // After migration 006: DB column is `unit` (TEXT), no longer `unit_type` (ENUM)
      m.reserveOverride = (m.reserveOverridePct as number | null) ?? (m.reserveOverride as number | null) ?? null
      return m as unknown as Material
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('fetchMaterials error:', message)
    return []
  }
}

export async function createMaterial(material: Omit<Material, 'id'>, id: string, orgId: string): Promise<Material | null> {
  try {
    const snakeData = toSnakeCase(material as unknown as Record<string, unknown>) as Record<string, unknown>
    snakeData.id = id
    snakeData.org_id = orgId
    // Field fixups: frontend name → DB column name
    // After migration 006: DB column is `unit` (TEXT), matches frontend — no rename needed
    if ('reserve_override' in snakeData) { snakeData.reserve_override_pct = snakeData.reserve_override; delete snakeData.reserve_override }

    // Sanitize empty strings for timestamp columns — Postgres rejects "" for TIMESTAMPTZ
    const MATERIAL_TIMESTAMP_FIELDS = ['last_restocked', 'created_at', 'updated_at'];
    const cleanData = sanitizeTimestamps(snakeData, MATERIAL_TIMESTAMP_FIELDS);

    const { data, error } = await supabase
      .from('materials')
      .insert([cleanData])
      .select()
      .single()

    if (error) throw error

    return toCamelCase(data) as unknown as Material
  } catch (err: unknown) {
    console.error('createMaterial error:', err)
    return null
  }
}

export async function updateMaterial(id: string, updates: Partial<Material>): Promise<Material | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>) as Record<string, unknown>
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

    return toCamelCase(data) as unknown as Material
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('updateMaterial error:', message)
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
  } catch {
    return false
  }
}
