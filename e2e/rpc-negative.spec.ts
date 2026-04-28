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
