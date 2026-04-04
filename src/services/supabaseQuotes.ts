import { supabase } from './supabase'
import { toCamelCase, toSnakeCase, sanitizeTimestamps, onSupabaseError } from './supabaseCore'
import type { QuoteRequest, QuoteRequestItem, QuoteRequestStatus } from '@/types'

// ===== QUOTE REQUESTS =====

const QR_TIMESTAMP_FIELDS = ['sent_at', 'responded_at', 'expires_at', 'created_at', 'updated_at']

export async function fetchQuoteRequests(
  orgId: string,
  projectId?: string
): Promise<QuoteRequest[]> {
  try {
    let query = supabase
      .from('quote_requests')
      .select('*, suppliers(name), projects(name)')
      .eq('org_id', orgId)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(row => {
      const qr = toCamelCase(row) as Record<string, unknown>
      // Extract joined names
      const suppliers = qr.suppliers as Record<string, unknown> | null
      const projects = qr.projects as Record<string, unknown> | null
      qr.supplierName = suppliers?.name ?? null
      qr.projectName = projects?.name ?? null
      delete qr.suppliers
      delete qr.projects
      return qr as unknown as QuoteRequest
    })
  } catch (err) {
    onSupabaseError('SELECT', 'quote_requests', err)
    return []
  }
}

export async function createQuoteRequest(
  orgId: string,
  request: Partial<QuoteRequest>,
  items: Partial<QuoteRequestItem>[]
): Promise<QuoteRequest | null> {
  try {
    const requestId = crypto.randomUUID()

    // Insert the quote request
    const snakeRequest = toSnakeCase(request as unknown as Record<string, unknown>) as Record<string, unknown>
    snakeRequest.id = requestId
    snakeRequest.org_id = orgId
    const cleanRequest = sanitizeTimestamps(snakeRequest, QR_TIMESTAMP_FIELDS)

    // Remove joined fields
    delete cleanRequest.supplier_name
    delete cleanRequest.project_name

    const { data, error } = await supabase
      .from('quote_requests')
      .insert([cleanRequest])
      .select()
      .single()

    if (error) throw error

    // Insert line items
    if (items.length > 0) {
      const snakeItems = items.map(item => {
        const si = toSnakeCase(item as unknown as Record<string, unknown>) as Record<string, unknown>
        si.id = crypto.randomUUID()
        si.quote_request_id = requestId
        return si
      })

      const { error: itemsError } = await supabase
        .from('quote_request_items')
        .insert(snakeItems)

      if (itemsError) {
        onSupabaseError('INSERT', 'quote_request_items', itemsError)
        // Still return the request — items can be retried
      }
    }

    return toCamelCase(data) as unknown as QuoteRequest
  } catch (err) {
    onSupabaseError('INSERT', 'quote_requests', err)
    return null
  }
}

export async function updateQuoteRequestStatus(
  id: string,
  status: QuoteRequestStatus,
  updates?: Partial<QuoteRequest>
): Promise<boolean> {
  try {
    const snakeData: Record<string, unknown> = { status, updated_at: new Date().toISOString() }

    if (updates) {
      const extra = toSnakeCase(updates as unknown as Record<string, unknown>) as Record<string, unknown>
      Object.assign(snakeData, extra)
    }

    // Set timestamp based on status transition
    if (status === 'sent') snakeData.sent_at = new Date().toISOString()
    if (status === 'received') snakeData.responded_at = new Date().toISOString()

    const { error } = await supabase
      .from('quote_requests')
      .update(snakeData)
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    onSupabaseError('UPDATE', 'quote_requests', err)
    return false
  }
}

// ===== QUOTE REQUEST ITEMS =====

export async function fetchQuoteRequestItems(
  quoteRequestId: string
): Promise<QuoteRequestItem[]> {
  try {
    const { data, error } = await supabase
      .from('quote_request_items')
      .select('*')
      .eq('quote_request_id', quoteRequestId)

    if (error) throw error

    return (data || []).map(row => toCamelCase(row) as unknown as QuoteRequestItem)
  } catch (err) {
    onSupabaseError('SELECT', 'quote_request_items', err)
    return []
  }
}

export async function updateQuoteRequestItem(
  id: string,
  updates: Partial<QuoteRequestItem>
): Promise<boolean> {
  try {
    const snakeData = toSnakeCase(updates as unknown as Record<string, unknown>) as Record<string, unknown>

    const { error } = await supabase
      .from('quote_request_items')
      .update(snakeData)
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    onSupabaseError('UPDATE', 'quote_request_items', err)
    return false
  }
}
