/**
 * Sprint Provider Catalog — searchSuppliers token logic.
 *
 * Closes jbluhm V6: contractor types "rock hard" and gets Rock Hard
 * Landscape Supply at the top, not a national chain. Token-aware search
 * means "rock hard" (two tokens) requires both to appear somewhere on
 * an entry — exact full-name matches still rank highest.
 */

import { describe, it, expect } from 'vitest'
import { searchSuppliers, SUPPLIER_DIRECTORY } from './supplierDirectory'

describe('searchSuppliers', () => {
  it('returns the full directory when called with empty query', () => {
    const empty = searchSuppliers('', 100)
    expect(empty.length).toBe(Math.min(100, SUPPLIER_DIRECTORY.length))
    expect(empty[0].name).toBe(SUPPLIER_DIRECTORY[0].name)
  })

  it('returns the full directory when called with whitespace-only query', () => {
    const ws = searchSuppliers('   ', 5)
    expect(ws).toHaveLength(5)
  })

  it('ranks Rock Hard at the top for the V6-named "rock hard" search', () => {
    const out = searchSuppliers('rock hard', 5)
    expect(out[0].name).toBe('Rock Hard Landscape Supply')
  })

  it('finds Gertens by partial name', () => {
    const out = searchSuppliers('gerten', 3)
    expect(out[0].name).toBe('Gertens')
  })

  it('finds SiteOne by partial name', () => {
    const out = searchSuppliers('siteone', 3)
    expect(out[0].name).toMatch(/SiteOne/i)
  })

  it('matches by region tag', () => {
    const out = searchSuppliers('twin cities', 50)
    // All Twin Cities-tagged entries should surface; nationals should not.
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((s) => (s.region ?? '').toLowerCase().includes('twin cities'))).toBe(true)
  })

  it('matches by category', () => {
    const out = searchSuppliers('irrigation', 100)
    expect(out.length).toBeGreaterThan(0)
    // Every result should have irrigation in its categories OR description
    for (const s of out) {
      const hit =
        s.categories.includes('irrigation') ||
        s.description.toLowerCase().includes('irrigation')
      expect(hit).toBe(true)
    }
  })

  it('rejects entries that do not match every token (token AND-logic)', () => {
    // "siteone twin" — Site One is national, has no Twin Cities region tag.
    // Should NOT show in results.
    const out = searchSuppliers('siteone twin', 10)
    expect(out.find((s) => s.name.includes('SiteOne'))).toBeUndefined()
  })

  it('full-phrase name match outranks single-token matches', () => {
    // Querying "Rain Bird" should put the actual Rain Bird entry above
    // anything that just contains "rain" in description.
    const out = searchSuppliers('rain bird', 5)
    expect(out[0].name).toBe('Rain Bird')
  })

  it('respects the limit param', () => {
    const out = searchSuppliers('paver', 3)
    expect(out.length).toBeLessThanOrEqual(3)
  })

  it('includes the V6-named regional suppliers in the directory', () => {
    const names = SUPPLIER_DIRECTORY.map((s) => s.name)
    expect(names).toContain('Gertens')
    expect(names).toContain('Frador')
    expect(names).toContain('Bachman’s')
    expect(names).toContain('Rock Hard Landscape Supply')
  })
})
