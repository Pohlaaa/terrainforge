import { createClient } from '@supabase/supabase-js'

/**
 * Resolve env vars in a way that works in both Vite (browser) and Node
 * (test harnesses, build scripts). The materials-accuracy harness imports
 * the prompt builders + validators from aiRecommendations, which since
 * Sprint S transitively loads this module — and Node has no
 * `import.meta.env`. Falling back to process.env keeps the import chain
 * Node-safe without changing browser behavior.
 */
function viteEnv(name: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = import.meta as any
  if (meta?.env && typeof meta.env[name] !== 'undefined') {
    return meta.env[name] || ''
  }
  if (typeof process !== 'undefined' && process.env) {
    // Try in order: VITE_-prefixed → E2E_-prefixed → bare.
    const bare = name.replace(/^VITE_/, '')
    return (
      process.env[name] ||
      process.env[`E2E_${bare}`] ||
      process.env[bare] ||
      ''
    ) as string
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

const resolvedUrl = viteEnv('VITE_SUPABASE_URL')
const resolvedKey = viteEnv('VITE_SUPABASE_ANON_KEY')

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
