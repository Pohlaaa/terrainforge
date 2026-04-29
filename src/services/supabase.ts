import { createClient } from '@supabase/supabase-js'

/**
 * Resolve env vars in a way that works in both Vite (browser) and Node
 * (test harnesses, build scripts). The materials-accuracy harness imports
 * the prompt builders + validators from aiRecommendations, which since
 * Sprint S transitively loads this module — and Node has no
 * `import.meta.env`. Falling back to process.env keeps the import chain
 * Node-safe without changing browser behavior.
 *
 * IMPORTANT: Vite's static-replace pass only handles the literal pattern
 * `import.meta.env.VITE_FOO` (property-access). It does NOT replace
 * `import.meta.env[varName]` (dynamic key). Earlier versions of this
 * module used the dynamic form and silently fell through to the
 * placeholder URL on the deployed bundle, breaking auth in production.
 * Always read with literal property access.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const browserEnv = (import.meta as any)?.env as Record<string, string> | undefined
const browserSupabaseUrl: string = browserEnv?.VITE_SUPABASE_URL || ''
const browserSupabaseKey: string = browserEnv?.VITE_SUPABASE_ANON_KEY || ''

function nodeEnv(...names: string[]): string {
  if (typeof process === 'undefined' || !process.env) return ''
  for (const n of names) {
    const v = process.env[n]
    if (v) return v
  }
  return ''
}

// Placeholder used only when neither browser env nor Node test env supplied
// a URL. The materials-accuracy harness imports our prompt builders, which
// transitively pulls this module — but never calls supabase.from(). The
// placeholder URL satisfies createClient's URL validator without ever
// connecting anywhere.
const PLACEHOLDER_URL = 'https://placeholder.supabase.invalid'
const PLACEHOLDER_KEY = 'placeholder.anon.key'

const resolvedUrl =
  browserSupabaseUrl ||
  nodeEnv('VITE_SUPABASE_URL', 'E2E_SUPABASE_URL', 'SUPABASE_URL')
const resolvedKey =
  browserSupabaseKey ||
  nodeEnv('VITE_SUPABASE_ANON_KEY', 'E2E_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY')

const supabaseUrl = resolvedUrl || PLACEHOLDER_URL
const supabaseAnonKey = resolvedKey || PLACEHOLDER_KEY

if (!resolvedUrl || !resolvedKey) {
  // Loud one-line warning so this never silently leaks into a real
  // browser session that's missing config.
  console.warn(
    '[supabase] No VITE_SUPABASE_URL/ANON_KEY in env — using placeholder. ' +
      'Calls will 401/ENOTFOUND. This is expected only in Node test harnesses.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'terrainforge-auth',
    // Session persists across browser restarts.
    // Token auto-refreshes before expiry, preventing unexpected logouts.
  },
})
