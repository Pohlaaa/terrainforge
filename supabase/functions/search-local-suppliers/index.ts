import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Search terms that a landscaping contractor would buy from
const SEARCH_QUERIES = [
  'garden center',
  'nursery',
  'landscape supply',
  'hardware store',
  'building supply',
  'stone yard',
  'lumber yard',
  'concrete supply',
  'mulch',
  'sod farm',
  'equipment rental',
  'irrigation supply',
]

/**
 * v5: Switched from Overpass API (too slow/unreliable) to Nominatim search.
 * Runs 12 parallel bounded searches for different business types.
 * Nominatim is fast (<2s per query) and handles large areas without timeouts.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const { location, lat, lon } = await req.json()

    let searchLat = lat
    let searchLon = lon

    // Geocode text location if no coordinates provided
    if (!searchLat && location) {
      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=us`,
        { headers: { 'User-Agent': 'TerrainForge/1.0' } }
      )
      if (geoResp.ok) {
        const geoData = await geoResp.json()
        if (geoData.length > 0) {
          searchLat = parseFloat(geoData[0].lat)
          searchLon = parseFloat(geoData[0].lon)
        }
      }
    }

    if (!searchLat || !searchLon) {
      return new Response(
        JSON.stringify({ results: [], error: 'Could not geocode location' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Searching at ${searchLat}, ${searchLon} for: ${location || 'coordinates'}`)

    // Bounding box: ~50 miles in each direction
    const latOffset = 0.72  // ~50 miles
    const lonOffset = 0.90  // ~50 miles at mid-latitudes
    const viewbox = `${searchLon - lonOffset},${searchLat + latOffset},${searchLon + lonOffset},${searchLat - latOffset}`

    // Run multiple Nominatim searches in parallel for different business types
    const searchPromises = SEARCH_QUERIES.map(async (query) => {
      try {
        // Small delay to be polite to Nominatim (stagger requests)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500))

        const url = `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `limit=10&` +
          `countrycodes=us&` +
          `viewbox=${viewbox}&` +
          `bounded=1&` +
          `addressdetails=1&` +
          `extratags=1`

        const resp = await fetch(url, {
          headers: { 'User-Agent': 'TerrainForge/1.0' }
        })

        if (!resp.ok) return []
        const data = await resp.json()
        return data.map((item: any) => ({ ...item, _searchQuery: query }))
      } catch {
        return []
      }
    })

    const allResults = await Promise.all(searchPromises)
    const flatResults = allResults.flat()
    console.log(`Nominatim returned ${flatResults.length} total results across ${SEARCH_QUERIES.length} queries`)

    // Process and deduplicate results
    const seen = new Set<string>()
    const processed: Array<{
      name: string
      address: string
      phone: string
      website: string
      categories: string[]
      shopType: string
      lat: number
      lon: number
    }> = []

    for (const item of flatResults) {
      const name = item.name || item.display_name?.split(',')[0] || ''
      if (!name || name.length < 3) continue

      // Deduplicate by normalized name
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seen.has(key)) continue
      seen.add(key)

      // Skip if it's clearly not a business (residential, parks, etc.)
      const type = item.type || ''
      const cls = item.class || ''
      const skipTypes = ['residential', 'suburb', 'city', 'town', 'village', 'county',
        'state', 'country', 'postcode', 'neighbourhood', 'house', 'apartments',
        'school', 'university', 'hospital', 'church', 'park', 'forest',
        'stream', 'river', 'lake', 'cemetery']
      if (skipTypes.includes(type)) continue
      if (cls === 'boundary' || cls === 'place' || cls === 'waterway') continue

      const addr = item.address || {}
      const extratags = item.extratags || {}
      const searchQuery = item._searchQuery || ''

      const address = buildAddress(addr)
      const categories = inferCategories(name, searchQuery, type, cls, extratags)
      const shopType = describeShopType(name, searchQuery, type, cls)

      // Only include if we can identify it as something useful
      if (categories.length === 0 && !isLikelySupplier(name, type, cls)) continue

      processed.push({
        name,
        address,
        phone: extratags.phone || extratags['contact:phone'] || '',
        website: extratags.website || extratags['contact:website'] || '',
        categories,
        shopType,
        lat: parseFloat(item.lat) || 0,
        lon: parseFloat(item.lon) || 0,
      })
    }

    // Sort by relevance
    processed.sort((a, b) => {
      const relA = relevanceScore(a)
      const relB = relevanceScore(b)
      if (relA !== relB) return relB - relA
      const dataA = (a.phone ? 1 : 0) + (a.website ? 1 : 0) + (a.address ? 1 : 0) + a.categories.length
      const dataB = (b.phone ? 1 : 0) + (b.website ? 1 : 0) + (b.address ? 1 : 0) + b.categories.length
      return dataB - dataA
    })

    const final = processed.slice(0, 25)
    console.log(`Returning ${final.length} deduplicated results`)

    return new Response(
      JSON.stringify({ results: final }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', (err as Error).message)
    return new Response(
      JSON.stringify({ results: [], error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function isLikelySupplier(name: string, type: string, cls: string): boolean {
  const n = name.toLowerCase()
  const bizTypes = ['shop', 'commercial', 'industrial', 'retail', 'trade']
  if (bizTypes.includes(cls) || bizTypes.includes(type)) return true
  const keywords = [
    'supply', 'supplies', 'center', 'centre', 'yard', 'depot',
    'farm', 'nursery', 'garden', 'greenhouse', 'lumber', 'rental',
    'material', 'stone', 'mulch', 'sod', 'aggregate', 'concrete',
    'landscape', 'hardscape', 'paver', 'irrigation', 'fencing',
    'lighting', 'hardware', 'building', 'gravel', 'sand', 'compost',
    'equipment', 'tool', 'home depot', 'lowe', 'menard', 'ace',
    'gertens', 'bachman', 'dundee', 'siteone', 'ewing',
  ]
  return keywords.some(kw => n.includes(kw))
}

function relevanceScore(r: { name: string; shopType: string; categories: string[] }): number {
  let score = 0
  const name = r.name.toLowerCase()
  const high = ['landscape', 'nursery', 'garden center', 'garden centre',
    'stone', 'mulch', 'sod', 'hardscape', 'paver', 'irrigation',
    'aggregate', 'gravel', 'gertens', 'bachman', 'siteone']
  for (const kw of high) {
    if (name.includes(kw)) { score += 10; break }
  }
  const med = ['supply', 'lumber', 'building', 'hardware', 'concrete',
    'material', 'fencing', 'lighting', 'rental']
  for (const kw of med) {
    if (name.includes(kw)) { score += 5; break }
  }
  score += Math.min(r.categories.length * 2, 10)
  if (r.shopType.includes('Garden') || r.shopType.includes('Nursery')) score += 8
  if (r.shopType.includes('Building') || r.shopType.includes('Landscape')) score += 5
  // Big box ranked lower than specialty
  if (name.includes('home depot') || name.includes('lowe') || name.includes('menard')) score -= 3
  return score
}

function describeShopType(name: string, searchQuery: string, type: string, cls: string): string {
  const n = name.toLowerCase()
  if (n.includes('nursery') || n.includes('garden')) return 'Garden Center / Nursery'
  if (n.includes('stone') || n.includes('masonry')) return 'Stone & Masonry'
  if (n.includes('mulch') || n.includes('soil') || n.includes('compost')) return 'Soil & Mulch'
  if (n.includes('sod') || n.includes('turf')) return 'Sod & Turf'
  if (n.includes('lumber')) return 'Lumber Yard'
  if (n.includes('concrete') || n.includes('ready mix')) return 'Concrete Supplier'
  if (n.includes('landscape')) return 'Landscape Supply'
  if (n.includes('irrigation') || n.includes('sprinkler')) return 'Irrigation Supply'
  if (n.includes('paver') || n.includes('hardscape')) return 'Hardscape Supply'
  if (n.includes('home depot') || n.includes('lowe') || n.includes('menard')) return 'Home Improvement'
  if (n.includes('rental') || n.includes('equipment')) return 'Equipment Rental'
  if (n.includes('hardware') || n.includes('ace')) return 'Hardware Store'
  if (n.includes('building') || n.includes('supply')) return 'Building Supply'
  // Fall back to search query context
  if (searchQuery.includes('garden') || searchQuery.includes('nursery')) return 'Garden Center / Nursery'
  if (searchQuery.includes('landscape')) return 'Landscape Supply'
  if (searchQuery.includes('hardware')) return 'Hardware Store'
  if (searchQuery.includes('building')) return 'Building Supply'
  if (searchQuery.includes('stone')) return 'Stone & Masonry'
  if (searchQuery.includes('lumber')) return 'Lumber Yard'
  if (searchQuery.includes('concrete')) return 'Concrete Supplier'
  if (searchQuery.includes('equipment') || searchQuery.includes('rental')) return 'Equipment Rental'
  if (searchQuery.includes('irrigation')) return 'Irrigation Supply'
  if (searchQuery.includes('mulch')) return 'Soil & Mulch'
  if (searchQuery.includes('sod')) return 'Sod & Turf'
  return 'Supplier'
}

function inferCategories(name: string, searchQuery: string, type: string, cls: string, extratags: Record<string, string>): string[] {
  const cats: string[] = []
  const n = name.toLowerCase()

  // Name-based
  if (n.includes('stone') || n.includes('masonry') || n.includes('paver')) cats.push('paver', 'stone', 'brick')
  if (n.includes('hardscape')) cats.push('paver', 'stone', 'brick', 'edging', 'sand', 'gravel')
  if (n.includes('nursery') || n.includes('garden') || n.includes('greenhouse')) cats.push('plant', 'shrub', 'tree', 'mulch', 'soil')
  if (n.includes('landscape') && (n.includes('supply') || n.includes('material') || n.includes('center'))) {
    cats.push('mulch', 'soil', 'gravel', 'sand', 'paver', 'stone', 'edging', 'sod')
  }
  if (n.includes('mulch')) cats.push('mulch', 'soil')
  if (n.includes('soil') || n.includes('compost')) cats.push('soil', 'mulch')
  if (n.includes('irrigation') || n.includes('sprinkler')) cats.push('irrigation')
  if (n.includes('lumber') || n.includes('timber')) cats.push('lumber')
  if (n.includes('gravel') || n.includes('sand') || n.includes('aggregate')) cats.push('gravel', 'sand')
  if (n.includes('sod') || n.includes('turf')) cats.push('sod', 'seed')
  if (n.includes('concrete') || n.includes('cement') || n.includes('ready mix')) cats.push('concrete')
  if (n.includes('fenc')) cats.push('lumber', 'misc')
  if (n.includes('hardware')) cats.push('lumber', 'concrete', 'misc')
  // Known regional garden centers
  if (n.includes('gertens') || n.includes('bachman') || n.includes('dundee')) {
    cats.push('plant', 'shrub', 'tree', 'mulch', 'soil', 'paver', 'stone', 'edging', 'sod')
  }
  // Big box
  if (n.includes('home depot') || n.includes('lowe') || n.includes('menard')) {
    cats.push('paver', 'stone', 'mulch', 'soil', 'gravel', 'sand', 'lumber', 'concrete', 'irrigation', 'lighting', 'edging', 'misc')
  }

  // Search query fallback if no name matches
  if (cats.length === 0) {
    if (searchQuery.includes('garden') || searchQuery.includes('nursery')) cats.push('plant', 'shrub', 'tree', 'mulch', 'soil')
    if (searchQuery.includes('landscape')) cats.push('mulch', 'soil', 'gravel', 'sand', 'paver', 'stone', 'edging', 'sod')
    if (searchQuery.includes('hardware') || searchQuery.includes('building')) cats.push('lumber', 'concrete', 'misc')
    if (searchQuery.includes('stone')) cats.push('paver', 'stone', 'brick')
    if (searchQuery.includes('lumber')) cats.push('lumber')
    if (searchQuery.includes('concrete')) cats.push('concrete')
    if (searchQuery.includes('mulch')) cats.push('mulch', 'soil')
    if (searchQuery.includes('sod')) cats.push('sod', 'seed')
    if (searchQuery.includes('equipment') || searchQuery.includes('rental')) cats.push('misc')
    if (searchQuery.includes('irrigation')) cats.push('irrigation')
  }

  return [...new Set(cats)]
}

function buildAddress(addr: Record<string, string>): string {
  const num = addr.house_number || ''
  const street = addr.road || ''
  const city = addr.city || addr.town || addr.village || ''
  const state = addr.state || ''
  const zip = addr.postcode || ''
  const streetLine = [num, street].filter(Boolean).join(' ')
  const cityLine = [city, state].filter(Boolean).join(', ')
  return [streetLine, cityLine, zip].filter(Boolean).join(', ')
}
