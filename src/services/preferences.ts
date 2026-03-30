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
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) {
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

    // Preferences row exists — use onboarding_completed_at as the source of truth
    if (!error && data) {
      return (data as { onboarding_completed_at: string | null }).onboarding_completed_at !== null
    }

    // No preferences row — check if this is a pre-onboarding user who already has an org
    // membership AND has data (projects). If so, skip onboarding; if not, they're genuinely new.
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!memberError && memberData) {
      // Has org membership — check if they have any projects (distinguishes
      // pre-onboarding veterans from brand-new signups who just got auto-enrolled)
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', memberData.org_id)
      if (count && count > 0) {
        return true // Existing user with data — skip onboarding
      }
      // Has membership but no projects — genuinely new user, show onboarding
      return false
    }

    return false
  } catch {
    // Table might not exist yet — treat as not completed
    return false
  }
}
