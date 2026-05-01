/**
 * P2 #10 — CSV import stress test.
 *
 * Mocks `supabaseData.createMaterialsBulk` + `fetchMaterials` so the test
 * stays in-process, then drives `bulkImportMaterials` with 5000 synthesized
 * material rows to confirm the chunked retry loop:
 *   - actually splits work into BULK_CHUNK_SIZE chunks (100)
 *   - imports every row when no errors are thrown (no gaps)
 *   - retries transient failures with exponential backoff (capped at
 *     BULK_MAX_RETRIES = 2 → 3 attempts total)
 *   - marks the right rows as failed when a chunk exhausts retries
 *
 * Sleeps inside the store are mocked too so a 5000-row test stays under
 * a second instead of taking ~50× the real chunk-retry delay.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Material } from '@/types'

// Mock supabaseData so chunk inserts + fetch don't hit network.
const mockCreate = vi.fn()
const mockFetch = vi.fn()
vi.mock('@/services/supabaseData', () => ({
  setSupabaseErrorReporter: vi.fn(),
  createMaterialsBulk: (...args: unknown[]) => mockCreate(...args),
  fetchMaterials: (...args: unknown[]) => mockFetch(...args),
}))

// Mock orgStore so the store can read an orgId without touching Supabase.
vi.mock('./orgStore', () => ({
  useOrgStore: { getState: () => ({ org: { id: 'test-org' } }) },
}))

// Replace setTimeout so the exponential-backoff sleeps inside the store
// resolve immediately. `bulkImportMaterials` uses `400 * 2^attempt` ms;
// real timing would push the 5000-row test into seconds and the retry
// case into ~3.6s. We assert behaviour, not wall-clock.
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  mockCreate.mockReset()
  mockFetch.mockReset()
  mockFetch.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

function buildRows(n: number): Array<Omit<Material, 'id'>> {
  const out: Array<Omit<Material, 'id'>> = []
  for (let i = 0; i < n; i++) {
    out.push({
      name: `Material ${i}`,
      category: 'misc',
      unit: 'each',
      cost: 1 + (i % 100) * 0.5,
      coverage: null,
      depthIn: null,
      reserveOverride: null,
      notes: '',
      qtyOnHand: 0,
      minStockLevel: 0,
      storageLocation: '',
      lastRestocked: '',
    })
  }
  return out
}

describe('materialStore.bulkImportMaterials — stress + retry', () => {
  it('imports a 5000-row CSV with no gaps when every chunk succeeds', async () => {
    mockCreate.mockResolvedValue(undefined)

    const { useMaterialStore } = await import('./materialStore')
    useMaterialStore.getState().reset()

    const rows = buildRows(5000)
    const result = await useMaterialStore.getState().bulkImportMaterials(rows)

    // Successful path — all 5000 rows imported, no failures.
    expect(result.imported).toBe(5000)
    expect(result.failed).toBe(0)
    expect(result.failedRows).toEqual([])
    expect(result.importedIds).toHaveLength(5000)

    // 5000 / 100 = 50 chunks, each one createMaterialsBulk call.
    expect(mockCreate).toHaveBeenCalledTimes(50)
    // Every chunk should have been size 100 (last one too: 5000 is exact).
    for (const call of mockCreate.mock.calls) {
      expect(call[0]).toHaveLength(100)
    }

    // Reconciling fetch fires once at the end.
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Importer assigns one client-side UUID per input row, paired by index.
    const indices = result.importedIds.map((r) => r.index).sort((a, b) => a - b)
    expect(indices[0]).toBe(0)
    expect(indices[indices.length - 1]).toBe(4999)
    expect(new Set(indices).size).toBe(5000)
  })

  it('handles a non-multiple-of-chunk-size import correctly', async () => {
    mockCreate.mockResolvedValue(undefined)

    const { useMaterialStore } = await import('./materialStore')
    useMaterialStore.getState().reset()

    const rows = buildRows(4523)
    const result = await useMaterialStore.getState().bulkImportMaterials(rows)

    expect(result.imported).toBe(4523)
    expect(result.failed).toBe(0)

    // ceil(4523 / 100) = 46 chunks; last chunk has 23 rows.
    expect(mockCreate).toHaveBeenCalledTimes(46)
    const lastChunk = mockCreate.mock.calls[mockCreate.mock.calls.length - 1][0] as unknown[]
    expect(lastChunk).toHaveLength(23)
  })

  it('retries a transient failure and recovers', async () => {
    let calls = 0
    mockCreate.mockImplementation(async () => {
      calls += 1
      // First call fails (chunk 1, attempt 1), then everything succeeds.
      if (calls === 1) throw new Error('429 Too Many Requests')
    })

    const { useMaterialStore } = await import('./materialStore')
    useMaterialStore.getState().reset()

    const rows = buildRows(250)
    const result = await useMaterialStore.getState().bulkImportMaterials(rows)

    expect(result.imported).toBe(250)
    expect(result.failed).toBe(0)
    // 3 chunks (100/100/50). Chunk 1 takes 2 calls (1 fail + 1 retry),
    // chunks 2 + 3 take 1 call each. Total = 4.
    expect(calls).toBe(4)
  })

  it('gives up after BULK_MAX_RETRIES and marks the failed chunk\'s rows', async () => {
    // First chunk always fails; subsequent chunks succeed.
    mockCreate.mockImplementation(async (chunk: Array<{ id: string }>) => {
      if (chunk[0].id === undefined) throw new Error('shape mismatch')
      // chunk index isn't directly available; use the mock call sequence.
      const callIndex = mockCreate.mock.invocationCallOrder.length
      // Force chunk 1 to fail on every attempt (3 attempts: 1, 2, 3)
      if (callIndex <= 3) throw new Error('502 Bad Gateway')
    })

    const { useMaterialStore } = await import('./materialStore')
    useMaterialStore.getState().reset()

    const rows = buildRows(300) // 3 chunks of 100
    const result = await useMaterialStore.getState().bulkImportMaterials(rows)

    // First 100 rows fail (failed indices 0..99); last 200 import OK.
    expect(result.imported).toBe(200)
    expect(result.failed).toBe(100)
    expect(result.failedRows).toHaveLength(100)
    // All failed rows carry the upstream error message.
    expect(result.failedRows[0].error).toMatch(/502|Bad Gateway/)
    // Failed indices are 0..99.
    const failedIdx = result.failedRows.map((r) => r.index).sort((a, b) => a - b)
    expect(failedIdx[0]).toBe(0)
    expect(failedIdx[failedIdx.length - 1]).toBe(99)
  })
})
