/**
 * notify-client-response  (Sprint 7d)
 *
 * Triggered by the /share/:token viewer after a client approves or requests
 * changes on a project. Looks up the contractor's email from the org owner
 * and sends a transactional email via Resend.
 *
 * Request body (client-supplied):
 *   { token: string, response: 'approved' | 'changes_requested', note?: string }
 *
 * Response:
 *   { ok: true, emailed: boolean, reason?: string }
 *
 * Environment:
 *   - SUPABASE_URL (provided by platform)
 *   - SUPABASE_SERVICE_ROLE_KEY (provided by platform)
 *   - RESEND_API_KEY (contractor-provided; required for actual email send)
 *   - NOTIFY_FROM_EMAIL (e.g. "TerrainForge <notifications@terrainforge.app>")
 *
 * When RESEND_API_KEY or NOTIFY_FROM_EMAIL is missing, the function
 * succeeds but returns { emailed: false, reason: 'not configured' } and
 * logs the payload. This lets the client-side integration ship before
 * the email infra is wired up.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

interface RequestBody {
  token?: string
  response?: 'approved' | 'changes_requested'
  note?: string
}

interface ShareTokenRow {
  id: string
  project_id: string
  org_id: string
  client_response: 'approved' | 'changes_requested' | null
  client_note: string | null
}

interface ProjectRow {
  name: string
  client_name: string | null
  address: string | null
}


Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight (client calls this from the browser)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const notifyFromEmail = Deno.env.get('NOTIFY_FROM_EMAIL')

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ ok: false, reason: 'server misconfigured' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid body' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  if (!body.token || !body.response) {
    return new Response(JSON.stringify({ ok: false, reason: 'missing token or response' }), {
      status: 400,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── Look up the token row (SECURITY DEFINER via service role) ─────────
  const { data: tokenRow, error: tokenErr } = await supabase
    .from('project_share_tokens')
    .select('id, project_id, org_id, client_response, client_note')
    .eq('token', body.token)
    .maybeSingle<ShareTokenRow>()

  if (tokenErr || !tokenRow) {
    console.warn('notify-client-response: token not found', { token: body.token, err: tokenErr?.message })
    return new Response(JSON.stringify({ ok: false, reason: 'token not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  // ── Get the project + contractor (org owner) ──────────────────────────
  // Same client_name fix as send-proposal-email + surface errors instead of
  // swallowing them.
  const { data: projectRow, error: projectErr } = await supabase
    .from('projects')
    .select('name, client_name, address')
    .eq('id', tokenRow.project_id)
    .maybeSingle<ProjectRow>()
  if (projectErr) {
    console.error('notify-client-response: project lookup failed', projectErr)
  }

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('owner_id')
    .eq('id', tokenRow.org_id)
    .maybeSingle<{ owner_id: string }>()

  // F-CW-15: query auth.users via the admin API. The `profiles` table never
  // existed in this schema; identity lives in auth.users (email + raw_user_metadata).
  let contractorEmail: string | null = null
  let contractorName: string | null = null
  if (orgRow?.owner_id) {
    const { data: ownerData, error: ownerErr } = await supabase.auth.admin.getUserById(orgRow.owner_id)
    if (ownerErr) {
      console.error('notify-client-response: auth.users lookup failed', ownerErr)
    } else {
      contractorEmail = ownerData?.user?.email ?? null
      const meta = (ownerData?.user?.user_metadata ?? {}) as { full_name?: string; display_name?: string }
      contractorName = meta.display_name ?? meta.full_name ?? null
    }
  }

  // Log for debugging regardless of whether we actually send
  console.log('notify-client-response', {
    project: projectRow?.name,
    client: projectRow?.client_name,
    response: body.response,
    note: body.note,
    contractorEmail,
  })

  // ── Actually send the email (if infra is configured) ──────────────────
  if (!resendApiKey || !notifyFromEmail || !contractorEmail) {
    const reason = !resendApiKey
      ? 'RESEND_API_KEY not set'
      : !notifyFromEmail
        ? 'NOTIFY_FROM_EMAIL not set'
        : 'contractor email not found'
    return new Response(JSON.stringify({ ok: true, emailed: false, reason }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }

  const subject =
    body.response === 'approved'
      ? `✓ ${projectRow?.client_name ?? 'Your client'} approved: ${projectRow?.name ?? 'project'}`
      : `✎ ${projectRow?.client_name ?? 'Your client'} requested changes: ${projectRow?.name ?? 'project'}`

  const noteBlock = body.note
    ? `<p><strong>Their note:</strong></p><blockquote style="border-left:3px solid #10B981;padding:8px 12px;background:#f8fafc;color:#334155;">${escapeHtml(body.note)}</blockquote>`
    : ''

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
        <h1 style="color:#10B981;font-size:20px;margin:0 0 16px 0;">TerrainForge</h1>
        <p>Hi${contractorName ? ` ${contractorName}` : ''},</p>
        <p>${projectRow?.client_name ?? 'Your client'} just ${body.response === 'approved' ? 'approved' : 'requested changes on'} <strong>${projectRow?.name ?? 'their project'}</strong>${projectRow?.address ? ` at ${projectRow.address}` : ''}.</p>
        ${noteBlock}
        <p style="margin-top:24px;font-size:12px;color:#64748b;">This is an automatic notification from TerrainForge.</p>
      </body>
    </html>
  `

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: notifyFromEmail,
      to: contractorEmail,
      subject,
      html,
    }),
  })

  if (!resendRes.ok) {
    const errBody = await resendRes.text()
    console.error('Resend send failed', resendRes.status, errBody)
    return new Response(
      JSON.stringify({ ok: true, emailed: false, reason: `resend ${resendRes.status}` }),
      {
        status: 200,
        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      },
    )
  }

  return new Response(JSON.stringify({ ok: true, emailed: true }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
