/**
 * TerrainForge Persistence Diagnostic Script
 *
 * Tests the entire org→project write chain against the live Supabase instance.
 * Run with: npx ts-node scripts/test-persistence.ts
 *
 * Requires .env.local (or .env) with:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Alternatively, use the /debug route in the running app for browser-based diagnostics.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load env — try .env.local first, then .env
const envPath = fs.existsSync('.env.local') ? '.env.local' : '.env'
dotenv.config({ path: path.resolve(process.cwd(), envPath) })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const TEST_EMAIL = 'woodsrider82+test4@gmail.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('FAIL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  console.log('=== TerrainForge Persistence Diagnostic ===\n')

  // Auth
  console.log('Signing in as', TEST_EMAIL, '...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })
  if (authError || !authData.user) {
    console.error('FAIL: Auth error:', authError?.message)
    console.error('Set TEST_PASSWORD env var to run this script.')
    process.exit(1)
  }
  const userId = authData.user.id
  console.log('PASS: Signed in. user.id =', userId, '\n')

  // TEST 1
  console.log('TEST 1: SELECT from organizations WHERE id = user.id')
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userId)
    .single()
  if (orgErr) {
    console.error('FAIL:', orgErr)
  } else {
    console.log('PASS: org =', org)
  }
  console.log()

  // TEST 2
  console.log('TEST 2: SELECT from organization_members WHERE user_id = user.id')
  const { data: member, error: memberErr } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', userId)
  if (memberErr) {
    console.error('FAIL:', memberErr)
  } else {
    console.log('PASS: members =', member)
  }
  console.log()

  // TEST 3
  console.log('TEST 3: user_has_role check (via projects INSERT dry-run — see TEST 4)')
  console.log()

  // TEST 4
  const testId = crypto.randomUUID()
  const orgId = org?.id ?? userId
  console.log('TEST 4: INSERT into projects with org_id =', orgId)
  const { data: newProject, error: projErr } = await supabase
    .from('projects')
    .insert([{
      id: testId,
      org_id: orgId,
      name: 'DIAGNOSTIC TEST PROJECT',
      address: '123 Test St',
      total_area_sqft: 100,
      start_date: new Date().toISOString().split('T')[0],
      target_date: new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0],
      budget: 1000,
      notes: 'Auto-created by test-persistence.ts — safe to delete',
    }])
    .select()
    .single()
  if (projErr) {
    console.error('FAIL:', projErr)
  } else {
    console.log('PASS: inserted project =', newProject?.id)
  }
  console.log()

  // TEST 5
  if (!projErr) {
    console.log('TEST 5: SELECT back the test project')
    const { data: fetched, error: fetchErr } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', testId)
      .single()
    if (fetchErr) {
      console.error('FAIL:', fetchErr)
    } else {
      console.log('PASS: fetched =', fetched)
    }
    console.log()

    // TEST 6
    console.log('TEST 6: DELETE the test project')
    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', testId)
    if (delErr) {
      console.error('FAIL:', delErr)
    } else {
      console.log('PASS: deleted')
    }
    console.log()
  }

  await supabase.auth.signOut()
  console.log('=== Done ===')
}

run().catch(console.error)
