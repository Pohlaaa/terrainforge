/**
 * proxy-claude  (Sprint S)
 *
 * Server-side proxy for the Anthropic Messages API. Replaces the prior
 * direct-from-browser pattern (VITE_ANTHROPIC_API_KEY) so the secret never
 * ships to clients.
 *
 * Auth model:
 *   - verify_jwt = true (platform validates Supabase user JWT before invoking)
 *   - We additionally enforce that the user belongs to an org and apply a
 *     simple per-org rate limit using the audit_log table as a counter.
 *
 * Request body:
 *   {
 *     prompt: string,
 *     model?: string,        // defaults to claude-haiku-4-5-20251001
 *     max_tokens?: number,   // defaults to 1024, capped at 8192
 *     system?: string,       // optional system prompt
 *     images?: string[],     // optional vision input (Sprint AI-Place):
 *                            // each entry is a URL the proxy fetches +
 *                            // base64-encodes server-side so the
 *                            // upstream URL (e.g. with Mapbox token)
 *                            // never touches Anthropic's logs. Cap of
 *                            // 4 images per call to keep payloads sane.
 *   }
 *
 * Response body (success):
 *   { content: Array<{ type: 'text'; text: string }> }
 *
 * Response body (error):
 *   { error: string }
 *
 * Environment:
 *   - SUPABASE_URL              (platform)
 *   - SUPABASE_SERVICE_ROLE_KEY (platform)
 *   - ANTHROPIC_API_KEY         (sprint S secret — set via Supabase dashboard)
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS_CAP = 8192

// Per-org rate limit window (rough — keeps a runaway client from burning
// through the API key while we measure real usage). Tightenable later.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  prompt?: string
  model?: string
  max_tokens?: number
  system?: string
  images?: string[]
  /** F-PLAC-01 Phase A: caller-provided temperature override. Vision
   *  calls default to 0 server-side; text-only calls use Anthropic's
   *  default unless this field is set. */
  temperature?: number
}

// Sprint AI-Place: cap on inline image attachments. Each Mapbox satellite
// tile is ~700 KB at 1200x1200@2x, so 4 is a reasonable upper bound on
// payload size before we hit Anthropic's per-request limits.
const MAX_IMAGES = 4
const IMAGE_FETCH_TIMEOUT_MS = 8000

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResp({ error: 'Method not allowed' }, 405)
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('proxy-claude: ANTHROPIC_API_KEY not configured')
    return jsonResp({ error: 'AI proxy not configured' }, 500)
  }

  // Auth: pull the JWT from the Authorization header so we can identify the
  // user. The function is deployed with verify_jwt=true so the gateway has
  // already validated signature + expiry by the time we run.
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResp({ error: 'Missing bearer token' }, 401)
  }
  const userJwt = authHeader.slice('Bearer '.length)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // IMPORTANT: do NOT call admin.auth.getUser(userJwt) here — that API is
  // for anon-keyed clients and returns 401 against a service-role client.
  // The Supabase gateway has already verified the signature + expiry; we
  // just decode the payload to extract the sub claim. Same pattern as
  // send-proposal-email Edge Function.
  let userId: string
  try {
    const parts = userJwt.split('.')
    if (parts.length !== 3) throw new Error('malformed JWT')
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub) throw new Error('no sub claim')
    userId = payload.sub as string
  } catch (err) {
    console.error('proxy-claude: JWT decode failed', err)
    return jsonResp({ error: 'Unauthorized' }, 401)
  }

  // Find the user's org (organization_members → org_id). A user could in
  // theory belong to multiple orgs; pick the most recently accepted one.
  const { data: membership, error: memberErr } = await admin
    .from('organization_members')
    .select('org_id, accepted_at')
    .eq('user_id', userId)
    .order('accepted_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  if (memberErr || !membership?.org_id) {
    return jsonResp({ error: 'No org membership' }, 403)
  }
  const orgId = membership.org_id as string

  // Rate limit: count proxy-claude audit rows in the past minute for this org.
  // We log AI invocations as action='view', entity_type='proxy-claude' to fit
  // the audit_action enum; rate-limit query mirrors that shape.
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error: countErr } = await admin
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('action', 'view')
    .eq('entity_type', 'proxy-claude')
    .gte('created_at', windowStart)
  if (countErr) {
    console.warn('proxy-claude: rate-limit count failed', countErr.message)
    // Fail open — don't block legitimate users on a metering glitch.
  } else if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return jsonResp({ error: 'Rate limit exceeded — try again in a minute' }, 429)
  }

  // Parse + validate body.
  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return jsonResp({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.prompt || typeof body.prompt !== 'string') {
    return jsonResp({ error: 'prompt is required' }, 400)
  }

  const model = typeof body.model === 'string' ? body.model : DEFAULT_MODEL
  const maxTokens = Math.min(
    typeof body.max_tokens === 'number' && body.max_tokens > 0 ? body.max_tokens : 1024,
    MAX_TOKENS_CAP,
  )

  // Sprint AI-Place: if `images` was passed, fetch each URL server-side,
  // base64-encode, and construct a multi-block user message. This keeps
  // the Mapbox token (and any other URL secrets) out of Anthropic's
  // request logs. Falls back to a clear error so the client can degrade
  // to non-vision flow.
  let userContent: unknown = body.prompt
  if (Array.isArray(body.images) && body.images.length > 0) {
    if (body.images.length > MAX_IMAGES) {
      return jsonResp({ error: `Too many images (max ${MAX_IMAGES})` }, 400)
    }
    const blocks: Array<Record<string, unknown>> = []
    for (const url of body.images) {
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return jsonResp({ error: 'images[] must be http(s) URLs' }, 400)
      }
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), IMAGE_FETCH_TIMEOUT_MS)
        const imgResp = await fetch(url, { signal: ctrl.signal })
        clearTimeout(timer)
        if (!imgResp.ok) {
          console.warn(`proxy-claude: image fetch ${imgResp.status} for ${truncate(url)}`)
          return jsonResp({ error: `Image fetch failed (${imgResp.status})` }, 502)
        }
        const mediaType = imgResp.headers.get('content-type') || 'image/png'
        if (!/^image\//.test(mediaType)) {
          return jsonResp({ error: `Image URL returned non-image content (${mediaType})` }, 400)
        }
        const buf = new Uint8Array(await imgResp.arrayBuffer())
        const b64 = base64Encode(buf)
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: b64 },
        })
      } catch (err) {
        console.error('proxy-claude: image fetch error', (err as Error).message)
        return jsonResp({ error: 'Image fetch failed' }, 502)
      }
    }
    blocks.push({ type: 'text', text: body.prompt })
    userContent = blocks
  }

  // Build Anthropic payload.
  // F-PLAC-01 Phase A: vision calls (with images) get temperature: 0 to
  // remove the "same intent, different pixels" jitter we measured at
  // ~50 ft per placement. Text-only calls (planning recommendations,
  // material inference) keep the API default since they benefit from
  // some creative variation. Body can override via `body.temperature`.
  const isVisionCall = Array.isArray(userContent)
  const defaultTemperature = isVisionCall ? 0 : undefined
  const payload: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: userContent }],
  }
  if (body.system) payload.system = body.system
  if (typeof body.temperature === 'number') {
    payload.temperature = body.temperature
  } else if (defaultTemperature !== undefined) {
    payload.temperature = defaultTemperature
  }

  // Forward to Anthropic.
  let anthropicResp: Response
  try {
    anthropicResp = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('proxy-claude: upstream fetch failed', (err as Error).message)
    return jsonResp({ error: 'Upstream request failed' }, 502)
  }

  if (!anthropicResp.ok) {
    let upstreamMsg = `Anthropic ${anthropicResp.status}`
    try {
      const errBody = await anthropicResp.json()
      if (errBody?.error?.message) upstreamMsg = errBody.error.message
    } catch {
      /* ignore */
    }
    console.warn('proxy-claude: upstream error', anthropicResp.status, upstreamMsg)
    return jsonResp({ error: upstreamMsg }, anthropicResp.status)
  }

  const anthropicData = await anthropicResp.json()

  // Best-effort audit log entry. Non-fatal on failure.
  admin
    .from('audit_log')
    .insert({
      org_id: orgId,
      user_id: userId,
      action: 'view',
      entity_type: 'proxy-claude',
      entity_id: null,
      metadata: { model, max_tokens: maxTokens, prompt_chars: body.prompt.length },
    })
    .then(({ error }) => {
      if (error) console.warn('proxy-claude: audit insert failed', error.message)
    })

  return jsonResp({ content: anthropicData.content }, 200)
})

function jsonResp(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/**
 * Base64-encode a Uint8Array. Deno has built-in encoders but we keep
 * this inline to avoid an extra import and to make the function fully
 * self-contained for the deploy bundle. ~5 ms for a 1 MB tile.
 */
function base64Encode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/**
 * Truncate a URL for log readability. Strips query strings (where
 * tokens live) and caps overall length.
 */
function truncate(url: string): string {
  const queryIdx = url.indexOf('?')
  const base = queryIdx === -1 ? url : url.slice(0, queryIdx)
  return base.length > 80 ? base.slice(0, 80) + '...' : base
}
