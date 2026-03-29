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

export async function updateSelectedKpis(userId: string, kpis: string[]): Promise<void> {
  try {
    await supabase
      .from('user_preferences')
      .update({ selected_kpis: kpis })
      .eq('user_id', userId)
  } catch {
    // silently fail — localStorage already updated
  }
}

export async function updateWidgetLayout(
  userId: string,
  layout: Array<{ widgetId: string; type: string; position: number; config?: Record<string, unknown> }>,
): Promise<void> {
  try {
    await supabase
      .from('user_preferences')
      .update({ widget_layout: layout })
      .eq('user_id', userId)
  } catch {
    // silently fail — localStorage already updated
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

    // Preferences row exists — use onboarding_completed_at as the source of truth
    if (!error && data) {
      return (data as { onboarding_completed_at: string | null }).onboarding_completed_at !== null
    }

    // No preferences row — check if this is a pre-onboarding user who already has an org
    // membership. If so, skip onboarding; if not, they're genuinely new.
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    console.log('[TF-DEBUG] hasCompletedOnboarding org membership check:', { memberData, memberError })
    if (!memberError && memberData) {
      // Pre-existing user — treat as onboarding complete
      return true
    }

    return false
  } catch {
    // Table might not exist yet — treat as not completed
    return false
  }
}
