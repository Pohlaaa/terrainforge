import { supabase } from './supabase'
import type { UserPreferences } from '@/types'

// ── snake_case ↔ camelCase helpers (same pattern as supabaseData.ts) ──────────

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    result[camel] = obj[key]
  }
  return result
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    result[snake] = obj[key]
  }
  return result
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('[TF-DEBUG] fetchUserPreferences error:', error)
      return null
    }
    if (!data) return null
    return toCamelCase(data as Record<string, unknown>) as unknown as UserPreferences
  } catch {
    return null
  }
}

export async function upsertUserPreferences(
  userId: string,
  orgId: string,
  prefs: Partial<Record<string, unknown>>
): Promise<UserPreferences | null> {
  try {
    const payload = toSnakeCase({ ...prefs, userId, orgId })
    console.log('[TF-DEBUG] upsertUserPreferences payload:', payload)
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()
    console.log('[TF-DEBUG] upsertUserPreferences response:', { data, error })
    if (error) {
      console.error('[TF-DEBUG] upsertUserPreferences error:', error)
      return null
    }
    return toCamelCase(data as Record<string, unknown>) as unknown as UserPreferences
  } catch {
    return null
  }
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('onboarding_completed_at')
      .eq('user_id', userId)
      .maybeSingle()
    console.log('[TF-DEBUG] hasCompletedOnboarding result:', { data, error })
    if (error || !data) return false
    return (data as { onboarding_completed_at: string | null }).onboarding_completed_at !== null
  } catch {
    // Table might not exist yet — treat as not completed
    return false
  }
}
