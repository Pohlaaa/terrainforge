import { supabase } from './supabase'
import { toCamelCase } from './supabaseCore'
import type { ShareToken, Project, ProjectElement, ProjectElementMaterial, Material } from '@/types'

// ===== SHARE TOKENS (migration 028) =====
//
// Backs the /share/:token public viewer. Authenticated org members create
// tokens; anon reads them via URL lookup. The migration's RLS policies
// widen projects / project_elements / project_element_materials / materials
// for anon when a valid token row exists for the project.

/**
 * Random url-safe token. 32 bytes → 64 hex chars. Long enough to be
 * infeasible to guess and keeps the URL monospace-friendly.
 */
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function createShareToken(
  projectId: string,
  orgId: string,
  opts: { expiresInDays?: number; role?: 'client_view' | 'client_approve' } = {},
): Promise<ShareToken | null> {
  const token = generateToken()
  const expiresAt = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await supabase
    .from('project_share_tokens')
    .insert({
      project_id: projectId,
      org_id: orgId,
      token,
      role: opts.role ?? 'client_view',
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) {
    console.error('createShareToken error:', error)
    return null
  }
  return toCamelCase(data) as unknown as ShareToken
}

export async function fetchShareTokensForProject(projectId: string): Promise<ShareToken[]> {
  const { data, error } = await supabase
    .from('project_share_tokens')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchShareTokensForProject error:', error)
    return []
  }
  return (data || []).map((r) => toCamelCase(r) as unknown as ShareToken)
}

export async function revokeShareToken(tokenId: string): Promise<boolean> {
  const { error } = await supabase
    .from('project_share_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId)

  if (error) {
    console.error('revokeShareToken error:', error)
    return false
  }
  return true
}

// ===== ANON-SIDE READ (drives /share/:token) =====

/**
 * Fetches everything the public viewer needs in one pass: the token row
 * (confirms validity), the project, its elements, each element's materials,
 * and the referenced material details. Anon-safe — RLS policies from
 * migration 028 scope every SELECT through the token.
 *
 * Returns null if the token is invalid, revoked, or expired.
 */
export async function fetchSharedProjectByToken(token: string): Promise<{
  token: ShareToken
  project: Project
  elements: ProjectElement[]
  /** Sprint 7c: map of materialId → Material for texture URL lookup in PlanView3D. */
  materialsById: Record<string, Material>
} | null> {
  // 1. Token validity check
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('project_share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr || !tokenRow) {
    if (tokenErr) console.error('fetchSharedProjectByToken token error:', tokenErr)
    return null
  }

  const shareToken = toCamelCase(tokenRow) as unknown as ShareToken

  // 2. Project
  const { data: projectRow, error: projectErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', shareToken.projectId)
    .maybeSingle()

  if (projectErr || !projectRow) {
    if (projectErr) console.error('fetchSharedProjectByToken project error:', projectErr)
    return null
  }
  const project = toCamelCase(projectRow) as unknown as Project

  // 3. Elements + their materials (separate queries, joined client-side).
  //    Each table is independently RLS-scoped, so we can't rely on a single
  //    nested select reaching everything without the join blowing up.
  const { data: elementRows, error: elementsErr } = await supabase
    .from('project_elements')
    .select('*')
    .eq('project_id', shareToken.projectId)
    .order('sequence', { ascending: true })

  if (elementsErr) {
    console.error('fetchSharedProjectByToken elements error:', elementsErr)
    return null
  }

  const elementIds = (elementRows || []).map((e: { id: string }) => e.id)

  // Junction column is `element_id` per migration 021.
  let elementMaterialRows: Array<Record<string, unknown>> = []
  if (elementIds.length > 0) {
    const { data: emData, error: emErr } = await supabase
      .from('project_element_materials')
      .select('*')
      .in('element_id', elementIds)
    if (emErr) {
      console.error('fetchSharedProjectByToken element_materials error:', emErr)
    } else {
      elementMaterialRows = emData || []
    }
  }

  const elements: ProjectElement[] = (elementRows || []).map((row) => {
    const el = toCamelCase(row as Record<string, unknown>) as unknown as ProjectElement
    const materials = elementMaterialRows
      .filter((m) => (m as { element_id?: string }).element_id === el.id)
      .map((m) => toCamelCase(m as Record<string, unknown>) as unknown as ProjectElementMaterial)
    return { ...el, materials }
  })

  // 4. Fetch Material catalog rows for texture lookup (Sprint 7c).
  //    Anon RLS via migration 028 restricts SELECT to materials referenced
  //    by elements in a shared project, so this is safe to call without auth.
  const materialIds = Array.from(
    new Set(
      elementMaterialRows
        .map((m) => (m as { material_id?: string | null }).material_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  )
  const materialsById: Record<string, Material> = {}
  if (materialIds.length > 0) {
    const { data: matRows, error: matErr } = await supabase
      .from('materials')
      .select('*')
      .in('id', materialIds)
    if (matErr) {
      console.error('fetchSharedProjectByToken materials error:', matErr)
    } else {
      for (const row of matRows || []) {
        const m = toCamelCase(row as Record<string, unknown>) as unknown as Material
        materialsById[m.id] = m
      }
    }
  }

  // 5. Fire-and-forget view bump (RPC; doesn't block render).
  supabase.rpc('bump_share_token_view', { p_token: token }).then(({ error }) => {
    if (error) console.warn('bump_share_token_view:', error.message)
  })

  return { token: shareToken, project, elements, materialsById }
}

/** Builds the absolute URL a contractor copies to share. */
export function buildShareUrl(token: string): string {
  if (typeof window === 'undefined') return `/share/${token}`
  return `${window.location.origin}/share/${token}`
}

/**
 * Emails the share link + optional custom message to a client via the
 * send-proposal-email Edge Function. Requires Supabase auth session.
 *
 * Returns:
 *   - { ok: true, emailed: true } — Resend delivered
 *   - { ok: true, emailed: false, reason } — function reached but backend
 *     not configured (RESEND_API_KEY missing). Still counts as "flow worked."
 *   - { ok: false, error } — call failed before reaching the function
 */
export async function sendProposalEmail(params: {
  token: string
  clientEmail: string
  message?: string
  shareUrl: string
}): Promise<{ ok: true; emailed: boolean; reason?: string } | { ok: false; error: string }> {
  const { data: session } = await supabase.auth.getSession()
  const jwt = session.session?.access_token
  if (!jwt) {
    return { ok: false, error: 'Not signed in' }
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!supabaseUrl) {
    return { ok: false, error: 'VITE_SUPABASE_URL not configured' }
  }
  const url = `${supabaseUrl}/functions/v1/send-proposal-email`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${jwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token: params.token,
        client_email: params.clientEmail,
        message: params.message,
        share_url: params.shareUrl,
      }),
    })
    const data = (await res.json()) as {
      ok?: boolean
      emailed?: boolean
      reason?: string
    }
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.reason ?? `HTTP ${res.status}` }
    }
    return { ok: true, emailed: data.emailed ?? false, reason: data.reason }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ===== CLIENT RESPONSE (migration 029) =====

/**
 * Writes a client approve/request-changes response back to the share token.
 * Calls the respond_to_share_token RPC (SECURITY DEFINER) so an anon
 * session doesn't need a broad UPDATE policy.
 *
 * Sprint 7d: after a successful response write, fire a best-effort HTTP
 * POST to the notify-client-response Edge Function if configured. The
 * function emails the contractor via Resend. Failures are silent — a
 * missing env var or Edge Function downtime never blocks the primary
 * client flow of "leave response, see confirmation."
 */
export async function respondToShareToken(
  token: string,
  response: 'approved' | 'changes_requested',
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc('respond_to_share_token', {
    p_token: token,
    p_response: response,
    p_note: note ?? null,
  })
  if (error) {
    console.error('respondToShareToken error:', error)
    return { ok: false, error: error.message }
  }

  // Fire-and-forget contractor notification. Activates once the Edge
  // Function is deployed and VITE_RESPONSE_NOTIFY_URL is set in .env.
  const notifyUrl = import.meta.env.VITE_RESPONSE_NOTIFY_URL as string | undefined
  if (notifyUrl) {
    fetch(notifyUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, response, note: note ?? null }),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.warn('notify-client-response non-2xx', res.status, await res.text())
        }
      })
      .catch((err) => {
        console.warn('notify-client-response failed', err)
      })
  }

  return { ok: true }
}
