import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, sanitizeTimestamps, onSupabaseError } from './supabaseCore'
import type { Supplier, SupplierPrice, MaterialCategory, PriceHistoryEntry } from '@/types'

// ===== SUPPLIERS =====

const SUPPLIER_TIMESTAMP_FIELDS = ['created_at', 'updated_at']

export async function fetchSuppliers(orgId: string): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('org_id', orgId)
      .order('name')

    if (error) throw error

    return (data || []).map(row => {
      const s = toCamelCase(row) as Record<string, unknown>
      // categories comes back as TEXT[] from Postgres — cast to MaterialCategory[]
      s.categories = (s.categories as string[] || []) as MaterialCategory[]
      return s as unknown as Supplier
    })
  } catch (err) {
    onSupabaseError('SELECT', 'suppliers', err)
    return []
  }
}

export async function createSupplier(
  orgId: string,
  supplier: Partial<Supplier>
): Promise<Supplier | null> {
  try {
    const snakeData = toSnakeCase(supplier as unknown as Record<string, unknown>) as Record<string, unknown>
    snakeData.org_id = orgId
    snakeData.id = crypto.randomUUID()
    const cleanData = sanitizeTimestamps(snakeData, SUPPLIER_TIMESTAMP_FIELDS)

    const { data, error } = await supabase
      .from('suppliers')
      .insert([cleanData])
      .select()
      .single()

    if (error) throw error
    return toCamelCase(data) as unknown as Supplier
  } catch (err) {
    onSupabaseError('INSERT', 'suppliers', err)
    return null
  }
}

export async function updateSupplier(
  id: string,
  updates: Partial<Supplier>
): Promise<Supplier | null> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>) as Record<string, unknown>
    snakeData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('suppliers')
      .update(snakeData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return toCamelCase(data) as unknown as Supplier
  } catch (err) {
    onSupabaseError('UPDATE', 'suppliers', err)
    return null
  }
}

export async function deleteSupplier(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    onSupabaseError('DELETE', 'suppliers', err)
    return false
  }
}

// ===== SUPPLIER PRICES =====

const PRICE_TIMESTAMP_FIELDS = ['quoted_at', 'created_at', 'updated_at']

export async function fetchSupplierPrices(
  orgId: string,
  materialId?: string
): Promise<SupplierPrice[]> {
  try {
    let query = supabase
      .from('supplier_prices')
      .select('*, suppliers(name)')
      .eq('org_id', orgId)

    if (materialId) {
      query = query.eq('material_id', materialId)
    }

    const { data, error } = await query.order('is_preferred', { ascending: false })

    if (error) throw error

    return (data || []).map(row => {
      const sp = toCamelCase(row) as Record<string, unknown>
      // Extract joined supplier name
      const suppliers = sp.suppliers as Record<string, unknown> | null
      sp.supplierName = suppliers?.name ?? null
      delete sp.suppliers
      return sp as unknown as SupplierPrice
    })
  } catch (err) {
    onSupabaseError('SELECT', 'supplier_prices', err)
    return []
  }
}

export async function upsertSupplierPrice(
  orgId: string,
  price: Partial<SupplierPrice>
): Promise<SupplierPrice | null> {
  try {
    const snakeData = toSnakeCase(price as unknown as Record<string, unknown>) as Record<string, unknown>
    snakeData.org_id = orgId
    if (!snakeData.id) snakeData.id = crypto.randomUUID()
    const cleanData = sanitizeTimestamps(snakeData, PRICE_TIMESTAMP_FIELDS)

    // Remove joined fields that aren't DB columns
    delete cleanData.supplier_name
    delete cleanData.material_name

    const { data, error } = await supabase
      .from('supplier_prices')
      .upsert([cleanData], { onConflict: 'material_id,supplier_id' })
      .select()
      .single()

    if (error) throw error
    return toCamelCase(data) as unknown as SupplierPrice
  } catch (err) {
    onSupabaseError('UPSERT', 'supplier_prices', err)
    return null
  }
}

export async function deleteSupplierPrice(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('supplier_prices')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    onSupabaseError('DELETE', 'supplier_prices', err)
    return false
  }
}

export async function getPreferredPrice(
  orgId: string,
  materialId: string
): Promise<SupplierPrice | null> {
  try {
    const { data, error } = await supabase
      .from('supplier_prices')
      .select('*, suppliers(name)')
      .eq('org_id', orgId)
      .eq('material_id', materialId)
      .eq('is_preferred', true)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const sp = toCamelCase(data) as Record<string, unknown>
    const suppliers = sp.suppliers as Record<string, unknown> | null
    sp.supplierName = suppliers?.name ?? null
    delete sp.suppliers
    return sp as unknown as SupplierPrice
  } catch (err) {
    onSupabaseError('SELECT', 'supplier_prices', err)
    return null
  }
}

// ===== SUPPLIER PRICE HISTORY =====

export async function recordPriceHistory(
  orgId: string,
  materialId: string,
  supplierId: string,
  unitCost: number,
  source: 'manual' | 'quote' | 'import' = 'manual'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('supplier_price_history')
      .insert([{
        org_id: orgId,
        material_id: materialId,
        supplier_id: supplierId,
        unit_cost: unitCost,
        source,
      }])

    if (error) throw error
    return true
  } catch (err) {
    onSupabaseError('INSERT', 'supplier_price_history', err)
    return false
  }
}

export async function fetchPriceHistory(
  orgId: string,
  materialId: string,
  supplierId?: string,
  limit: number = 20
): Promise<PriceHistoryEntry[]> {
  try {
    let query = supabase
      .from('supplier_price_history')
      .select('*')
      .eq('org_id', orgId)
      .eq('material_id', materialId)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (supplierId) {
      query = query.eq('supplier_id', supplierId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map(d => toCamelCase(d) as unknown as PriceHistoryEntry)
  } catch (err) {
    onSupabaseError('SELECT', 'supplier_price_history', err)
    return []
  }
}
