/**
 * send-proposal-email  (Phase 2a of the cleanup + contractor test)
 *
 * Contractor-initiated: emails a client the share link + optional personal
 * message, so the proposal lands in the client's inbox rather than requiring
 * the contractor to copy/paste the URL into their own mail app.
 *
 * Request body:
 *   { token: string, client_email: string, message?: string, share_url: string }
 *
 * Security: the caller MUST be authenticated. We verify by passing the
 * caller's JWT through to a Supabase client bound to auth; the token row
 * has to be owned by the caller's org.
 *
 * Response:
 *   { ok: true, emailed: boolean, reason?: string }
 *
 * Environment:
 *   - SUPABASE_URL (platform)
 *   - SUPABASE_SERVICE_ROLE_KEY (platform)
 *   - RESEND_API_KEY (operator)
 *   - NOTIFY_FROM_EMAIL (operator, e.g. "TerrainForge <proposals@domain.com>")
 *
 * When RESEND_API_KEY / NOTIFY_FROM_EMAIL missing: returns ok=true,
 * emailed=false, reason='not configured' so the UI can show a helpful
 * message but the flow doesn't crash.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

interface RequestBody {
  token?: string
  client_email?: string
  message?: string
  share_url?: string
}

interface ShareTokenRow {
  id: string
  project_id: string
  org_id: string
}

interface ProjectRow {
  name: string
  client: string | null
  address: string | null
}

interface OrgOwnerRow {
  email: string | null
  display_name: string | null
}

const jsonHeaders = {
  'content-type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
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
      headers: jsonHeaders,
    })
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid body' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  if (!body.token || !body.client_email || !body.share_url) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'missing token, client_email, or share_url' }),
      { status: 400, headers: jsonHeaders },
    )
  }

  // Validate email format — lightweight; Resend will reject malformed anyway
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.client_email)) {
    return new Response(JSON.stringify({ ok: false, reason: 'invalid email' }), {
      status: 400,
      headers: jsonHeaders,
    })
  }

  // ── Auth check: the caller must be signed in + own the token's org ────
  const authHeader = req.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ ok: false, reason: 'auth required' }), {
      status: 401,
      headers: jsonHeaders,
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { authorization: authHeader } },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(
    authHeader.replace(/^Bearer\s+/i, ''),
  )
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ ok: false, reason: 'auth invalid' }), {
      status: 401,
      headers: jsonHeaders,
    })
  }
  const userId = userData.user.id

  // Look up token + verify the caller is a member of the token's org
  const { data: tokenRow } = await supabase
    .from('project_share_tokens')
    .select('id, project_id, org_id')
    .eq('token', body.token)
    .maybeSingle<ShareTokenRow>()

  if (!tokenRow) {
    return new Response(JSON.stringify({ ok: false, reason: 'token not found' }), {
      status: 404,
      headers: jsonHeaders,
    })
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('org_id', tokenRow.org_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) {
    return new Response(JSON.stringify({ ok: false, reason: 'not a member of this org' }), {
      status: 403,
      headers: jsonHeaders,
    })
  }

  // ── Compose email ─────────────────────────────────────────────────────
  const { data: projectRow } = await supabase
    .from('projects')
    .select('name, client, address')
    .eq('id', tokenRow.project_id)
    .maybeSingle<ProjectRow>()

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('owner_id, name')
    .eq('id', tokenRow.org_id)
    .maybeSingle<{ owner_id: string; name: string | null }>()

  let contractorName: string | null = null
  if (orgRow?.owner_id) {
    const { data: ownerRow } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', orgRow.owner_id)
      .maybeSingle<OrgOwnerRow>()
    contractorName = ownerRow?.display_name ?? null
  }

  const companyName = orgRow?.name ?? 'Your contractor'
  const projectName = projectRow?.name ?? 'your project'
  const clientGreeting = projectRow?.client ? `Hi ${projectRow.client}` : 'Hello'

  // Log for debugging
  console.log('send-proposal-email', {
    to: body.client_email,
    project: projectRow?.name,
    org: orgRow?.name,
    share_url: body.share_url,
  })

  if (!resendApiKey || !notifyFromEmail) {
    const reason = !resendApiKey ? 'RESEND_API_KEY not set' : 'NOTIFY_FROM_EMAIL not set'
    return new Response(JSON.stringify({ ok: true, emailed: false, reason }), {
      status: 200,
      headers: jsonHeaders,
    })
  }

  const customBlock = body.message
    ? `<p style="background:#f8fafc;border-left:3px solid #10B981;padding:10px 14px;color:#334155;white-space:pre-wrap;">${escapeHtml(body.message.trim())}</p>`
    : ''

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
        <h1 style="color:#10B981;font-size:20px;margin:0 0 20px 0;">Your design proposal</h1>
        <p>${clientGreeting},</p>
        <p>${contractorName ? contractorName + ' from ' : ''}${companyName} has prepared a design for <strong>${escapeHtml(projectName)}</strong>${projectRow?.address ? ` at ${escapeHtml(projectRow.address)}` : ''}.</p>
        ${customBlock}
        <p>Click the link below to preview the design in 2D or 3D. You can approve it or request changes right from the browser — no account or install needed.</p>
        <p style="margin:28px 0;">
          <a href="${body.share_url}" style="background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View your design</a>
        </p>
        <p style="font-size:12px;color:#64748b;word-break:break-all;">Direct link: <a href="${body.share_url}" style="color:#10B981;">${body.share_url}</a></p>
        <p style="margin-top:32px;font-size:12px;color:#64748b;">This email was sent by ${escapeHtml(companyName)} via TerrainForge.</p>
      </body>
    </html>
  `

  const subject = `Your design proposal: ${projectName}`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: notifyFromEmail,
      to: body.client_email,
      subject,
      html,
    }),
  })

  if (!resendRes.ok) {
    const errBody = await resendRes.text()
    console.error('Resend send failed', resendRes.status, errBody)
    return new Response(
      JSON.stringify({ ok: true, emailed: false, reason: `resend ${resendRes.status}` }),
      { status: 200, headers: jsonHeaders },
    )
  }

  return new Response(JSON.stringify({ ok: true, emailed: true }), {
    status: 200,
    headers: jsonHeaders,
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
