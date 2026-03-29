/**
 * /debug — Persistence diagnostic page (temporary; remove before production).
 *
 * Shows auth state, org store state, and runs live Supabase read/write tests.
 * Navigate to /debug in the browser to see results.
 */

import React, { useState } from 'react'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgStore } from '@/stores/orgStore'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'running' | 'pending'
  detail: string
}

export default function Debug() {
  const { user } = useAuth()
  const org = useOrgStore((s) => s.org)
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)

  const lsKeys = Object.keys(localStorage).map(k => ({
    key: k,
    size: `${localStorage.getItem(k)?.length ?? 0} chars`,
  }))

  function updateResult(idx: number, update: Partial<TestResult>) {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, ...update } : r))
  }

  async function runTests() {
    if (!user?.id) return
    setRunning(true)

    const tests: TestResult[] = [
      { name: 'SELECT organizations WHERE id = user.id', status: 'pending', detail: '' },
      { name: 'SELECT organization_members WHERE user_id = user.id', status: 'pending', detail: '' },
      { name: 'INSERT test project', status: 'pending', detail: '' },
      { name: 'SELECT back test project', status: 'pending', detail: '' },
      { name: 'DELETE test project', status: 'pending', detail: '' },
    ]
    setResults(tests)

    // TEST 1
    updateResult(0, { status: 'running' })
    const { data: orgData, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, subscription_status')
      .eq('id', user.id)
      .single()
    updateResult(0, orgErr
      ? { status: 'fail', detail: JSON.stringify(orgErr) }
      : { status: 'pass', detail: JSON.stringify(orgData) }
    )

    // TEST 2
    updateResult(1, { status: 'running' })
    const { data: memberData, error: memberErr } = await supabase
      .from('organization_members')
      .select('org_id, user_id, role')
      .eq('user_id', user.id)
    updateResult(1, memberErr
      ? { status: 'fail', detail: JSON.stringify(memberErr) }
      : { status: 'pass', detail: JSON.stringify(memberData) }
    )

    // TEST 3
    const testId = crypto.randomUUID()
    const orgId = orgData?.id ?? org?.id ?? user.id
    const today = new Date().toISOString().split('T')[0]
    const future = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0]

    updateResult(2, { status: 'running' })
    const { data: projData, error: projErr } = await supabase
      .from('projects')
      .insert([{
        id: testId,
        org_id: orgId,
        name: 'DEBUG TEST PROJECT — safe to delete',
        address: '123 Debug St',
        total_area_sqft: 100,
        start_date: today,
        target_date: future,
        budget: 0,
        notes: 'Auto-created by /debug route',
      }])
      .select('id, name')
      .single()
    updateResult(2, projErr
      ? { status: 'fail', detail: JSON.stringify(projErr) }
      : { status: 'pass', detail: JSON.stringify(projData) }
    )

    // TEST 4
    if (!projErr) {
      updateResult(3, { status: 'running' })
      const { data: fetched, error: fetchErr } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', testId)
        .single()
      updateResult(3, fetchErr
        ? { status: 'fail', detail: JSON.stringify(fetchErr) }
        : { status: 'pass', detail: JSON.stringify(fetched) }
      )

      // TEST 5
      updateResult(4, { status: 'running' })
      const { error: delErr } = await supabase
        .from('projects')
        .delete()
        .eq('id', testId)
      updateResult(4, delErr
        ? { status: 'fail', detail: JSON.stringify(delErr) }
        : { status: 'pass', detail: 'deleted' }
      )
    } else {
      updateResult(3, { status: 'pending', detail: 'skipped (INSERT failed)' })
      updateResult(4, { status: 'pending', detail: 'skipped (INSERT failed)' })
    }

    setRunning(false)
  }

  const statusColor = (s: TestResult['status']) =>
    s === 'pass' ? '#74C69D' : s === 'fail' ? '#F87171' : s === 'running' ? '#F0CC7A' : '#6B7E67'

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 13, padding: 24, maxWidth: 900 }}>
      <h1 style={{ color: '#74C69D', marginBottom: 16 }}>TerrainForge — Persistence Debugger</h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#A8BAA3', marginBottom: 8 }}>Auth State</h2>
        <pre style={{ background: '#161E14', padding: 12, borderRadius: 6 }}>
          {JSON.stringify({ uid: user?.id, email: user?.email }, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#A8BAA3', marginBottom: 8 }}>Org Store State</h2>
        <pre style={{ background: '#161E14', padding: 12, borderRadius: 6 }}>
          {JSON.stringify(org, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#A8BAA3', marginBottom: 8 }}>localStorage Keys</h2>
        <pre style={{ background: '#161E14', padding: 12, borderRadius: 6 }}>
          {JSON.stringify(lsKeys, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#A8BAA3', marginBottom: 8 }}>Supabase Write Chain Tests</h2>
        <button
          onClick={runTests}
          disabled={running || !user?.id}
          style={{
            background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 6,
            padding: '8px 16px', cursor: 'pointer', marginBottom: 12, fontSize: 13,
          }}
        >
          {running ? 'Running...' : 'Run Tests'}
        </button>
        {results.map((r, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <span style={{ color: statusColor(r.status), fontWeight: 700 }}>
              [{r.status.toUpperCase()}]
            </span>
            {' '}{r.name}
            {r.detail && (
              <pre style={{ background: '#161E14', padding: 8, borderRadius: 4, marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {r.detail}
              </pre>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
