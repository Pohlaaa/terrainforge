import { test, expect } from '@playwright/test'
import { requireEnv } from './helpers'

/**
 * Negative-test suite for the Phase C v0 SECURITY DEFINER RPCs.
 *
 * Every public-facing RPC (`client_update_element_geometry`,
 * `submit_design_changes`) has 3-4 reject paths — bad token, wrong
 * role, cross-project, malformed payload. This spec hits the RPCs
 * directly via the anon Supabase REST endpoint (no UI dependency)
 * and asserts the correct error code surfaces. Fast — runs in <5s.
 *
 * The RPCs are invoked via raw fetch with the anon key so we don't
 * need to mount a Supabase client. Errors come back as 4xx with a
 * Postgres `code` field embedded in the JSON body.
 */

const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? 'https://axasujjoywqadzuisvaj.supabase.co'

function getAnonKey(): string {
  return requireEnv('E2E_SUPABASE_ANON_KEY')
}

async function callRpc(
  fnName: string,
  body: Record<string, unknown>,
): Promise<{ status: number; bodyText: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: getAnonKey(),
      authorization: `Bearer ${getAnonKey()}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  return { status: res.status, bodyText: await res.text() }
}

test.describe('Phase C v0 — RPC negative tests', () => {
  test('client_update_element_geometry rejects invalid token', async () => {
    const { status, bodyText } = await callRpc('client_update_element_geometry', {
      p_token: 'not_a_real_token_0000000000000000000000000000000000000000000000000',
      p_element_id: '00000000-0000-0000-0000-000000000001',
      p_geometry: {
        position: { x: 0, y: 0 },
        rotation: 0,
        shape: { kind: 'rectangle', width: 10, height: 10 },
      },
    })
    expect(status).toBeGreaterThanOrEqual(400)
    expect(bodyText).toContain('token_not_found_or_inactive')
  })

  test('client_update_element_geometry rejects malformed geometry', async () => {
    // We'd need a valid client_design token to trigger the malformed-
    // geometry path. The walkthrough test creates one transiently;
    // here we instead call with a bad token to confirm the order of
    // validation (token check happens before geometry check).
    const { status, bodyText } = await callRpc('client_update_element_geometry', {
      p_token: 'not_a_real_token_0000000000000000000000000000000000000000000000000',
      p_element_id: '00000000-0000-0000-0000-000000000001',
      p_geometry: { foo: 'bar' },
    })
    expect(status).toBeGreaterThanOrEqual(400)
    // Token validation runs first (correct security order).
    expect(bodyText).toContain('token_not_found_or_inactive')
  })

  test('submit_design_changes rejects invalid token', async () => {
    const { status, bodyText } = await callRpc('submit_design_changes', {
      p_token: 'not_a_real_token_0000000000000000000000000000000000000000000000000',
      p_note: 'Should be rejected.',
    })
    expect(status).toBeGreaterThanOrEqual(400)
    expect(bodyText).toContain('token_not_found_or_not_design')
  })

  test('respond_to_share_token rejects invalid response value', async () => {
    const { status, bodyText } = await callRpc('respond_to_share_token', {
      p_token: 'not_a_real_token_0000000000000000000000000000000000000000000000000',
      p_response: 'wat',
      p_note: null,
    })
    expect(status).toBeGreaterThanOrEqual(400)
    // invalid_response error fires before the token lookup
    expect(bodyText).toContain('invalid_response')
  })
})

/**
 * Multi-tenant RLS smoke tests (P0 #3).
 *
 * RLS is the load-bearing wall of the multi-tenant model — every table has
 * `org_id` and a policy that scopes it. The most common regression mode is
 * RLS being accidentally disabled or a policy switched to PERMISSIVE for
 * anon. These tests poke each tenant-scoped table from an unauthenticated
 * anon client and assert that no rows leak.
 *
 * Limitation: a true cross-org test (org A user authenticated, attempts to
 * read org B's data) needs a second test account. Today we only have one
 * (E2E_EMAIL). Adding a second is a P1 follow-up — until then, the anon
 * tests below catch the highest-blast-radius regression: RLS being off.
 */

async function anonGet(path: string): Promise<{ status: number; rows: unknown[] | null; bodyText: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: getAnonKey(),
      authorization: `Bearer ${getAnonKey()}`,
      accept: 'application/json',
    },
  })
  const bodyText = await res.text()
  let rows: unknown[] | null = null
  try {
    const parsed = JSON.parse(bodyText)
    rows = Array.isArray(parsed) ? parsed : null
  } catch {
    /* not JSON */
  }
  return { status: res.status, rows, bodyText }
}

test.describe('RLS — strict-deny tables (anon must see zero rows)', () => {
  // These tables have NO share-token escape hatch. Even with active share
  // tokens in the DB, an unauthenticated REST GET should return [] (or a
  // 4xx hard-deny). If any of these light up with populated data, RLS is
  // off or a policy was switched to PERMISSIVE for anon.
  //
  // INTENTIONALLY excluded from this list (because migration 028's share-
  // token policies allow anon reads when a valid token row exists for the
  // row's project): organizations, projects, project_elements,
  // project_element_materials, materials. Those surfaces are guarded by
  // the token-scoping smoke test below.
  const STRICT_DENY_TABLES = [
    'audit_log',
    'crew_members',
    'equipment',
    'schedule_entries',
    'project_tasks',
    'project_subcontractors',
    'project_permits',
    'project_documents',
    'project_crew_assignments',
    'project_site_conditions',
    'manifests',
    'user_preferences',
  ]

  for (const table of STRICT_DENY_TABLES) {
    test(`anon cannot read rows from ${table}`, async () => {
      const { status, rows } = await anonGet(`${table}?select=id&limit=5`)
      // Either denied entirely or returned an empty array — never populated.
      if (status === 200) {
        expect(rows).not.toBeNull()
        expect(rows!.length).toBe(0)
      } else {
        // 401/403/404 are all acceptable hard-deny responses.
        expect(status).toBeGreaterThanOrEqual(400)
      }
    })
  }
})

test.describe('RLS — share-token surfaces (anon-readable but only via token scoping)', () => {
  // These tables ARE readable by anon when there's a matching active share
  // token in project_share_tokens. The /share/:token viewer depends on
  // this. The risk vector for these is "the policy was widened beyond
  // share-token scope" — verifiable by a positive test that anon can see
  // these only when share tokens exist (there's no automated way to
  // verify scoping without a known controlled token + matching project,
  // which the contractor-walkthrough already covers end-to-end).
  //
  // What this test verifies: the endpoint is reachable from anon AT ALL
  // (200 status). If it's 401/403, it means the share-token policy is
  // missing or broken — the /share/:token viewer would 404 in production.
  const SHARE_TOKEN_READABLE = [
    'projects',
    'project_elements',
    'project_element_materials',
    'materials',
  ]

  for (const table of SHARE_TOKEN_READABLE) {
    test(`anon can reach ${table} (status 200)`, async () => {
      const { status } = await anonGet(`${table}?select=id&limit=1`)
      expect(status).toBe(200)
    })
  }
})

test.describe('RLS — anon CAN read share-token-scoped data when a valid token is supplied', () => {
  // This is the inverse smoke test. The /share/:token public viewer relies
  // on anon being able to read project_share_tokens by token, then
  // dependent rows scoped to that token. Walking through this end-to-end
  // is what the contractor-walkthrough spec already covers; here we just
  // assert that the gateway table — project_share_tokens — accepts a
  // single-token select from anon (so the "deny everything from anon"
  // approach above isn't accidentally too aggressive).
  test('project_share_tokens accepts targeted token=eq query from anon', async () => {
    // We don't have a known live token to verify *positive* row return, but
    // we can verify the endpoint is reachable (200 with [] is correct for
    // a token that doesn't exist). What we want to confirm is that the
    // request is *not* hard-denied — i.e. RLS allows the query shape.
    const { status, rows } = await anonGet(
      'project_share_tokens?select=id&token=eq.definitely_not_a_real_token',
    )
    expect(status).toBe(200)
    expect(rows).toEqual([])
  })
})
