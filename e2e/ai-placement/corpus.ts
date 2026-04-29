/**
 * Sprint AI-Place — placement test corpus.
 *
 * 15 properties spanning the failure modes the production system has
 * to handle: urban / rural / commercial / waterfront / sloped /
 * heavily-treed / sparse-imagery / corner-lot / and the bad-address
 * graceful-failure case.
 *
 * For each property the harness:
 *   1) Fetches the Mapbox satellite tile via the address geocode
 *   2) Runs `inferElementPlacements` with a representative element
 *      list for that property type
 *   3) Scores the returned positions against the contractor-authored
 *      `expected` placements using a tolerance-band match
 *
 * Threshold for the suite: ≥ 70% mean accuracy across the 15 entries.
 *
 * **Hard requirement reminder** (from ROADMAP.md "Sprint AI-Place"):
 * this suite is the gate that says we work for any address. New
 * failure modes discovered in production go in here as new fixtures.
 *
 * The `expected` arrays are seeded with sensible defaults but the
 * contractor (Charlie) needs to author them by hand for each entry
 * before the harness becomes meaningful — see
 * `.claude/TESTING/AI_PLACEMENT_NOTES.md` for the authoring protocol.
 */

import type { ElementType } from '../../src/types'

export interface CorpusElement {
  /** Stable key per element within the entry. */
  key: string
  elementType: ElementType
  name: string
  /** Best-known dimensions in feet (or LF for linear elements). */
  lengthFt: number | null
  widthFt: number | null
  linearFt: number | null
}

export interface ExpectedPlacement {
  /** Matches CorpusElement.key. */
  key: string
  /** Plan-feet, origin = tile center. The contractor's "this is where
   *  this element should land on the property". */
  expectedX: number
  expectedY: number
  /** Tolerance radius in feet. Elements that land within this radius
   *  count as a match. Default 25 ft for a typical suburban yard,
   *  scaled per fixture (commercial = 50 ft, urban rowhouse = 8 ft). */
  toleranceFt: number
}

export interface CorpusEntry {
  id: string
  /** Human-readable label for the scorecard. */
  label: string
  /** Real, public address. */
  address: string
  lat: number
  lng: number
  /** Mapbox zoom (typically 19, lower for rural / large lots). */
  zoom: number
  /** Tile pixel width = height; 1200 matches PlanView3D BACKDROP_IMAGE_PX. */
  tilePxWide: number
  /** Why this entry is in the corpus — what failure mode it stresses. */
  rationale: string
  /** Element list to place on this property. Pre-authored to match
   *  the property type. */
  elements: CorpusElement[]
  /** Contractor-authored expected placements. Initial values are
   *  rough; contractor refines by visually placing the elements on
   *  the actual tile and reading off plan-feet from the 2D viewer.
   *  TODO marker means "needs Charlie's review". */
  expected: ExpectedPlacement[]
}

/* ============================================================
 * NOTE ON AUTHORSHIP
 * Each entry's `expected` array starts as ground-truth-pending —
 * the values below are sensible-but-unverified guesses. Before this
 * harness becomes a real CI gate, Charlie should:
 *   1) Run `npm run placement:visualize <id>` (TODO: harness command)
 *   2) Drag each element to the right spot on the live satellite
 *   3) Update this file with the actual plan-feet coordinates from
 *      the 2D viewer's coord readout
 * Until then, treat any score ≥ 50% as "model is doing something
 * sensible" and any score < 50% as "model is broken".
 * ============================================================ */

const DEFAULT_TOLERANCE = 25
const URBAN_TOLERANCE = 8
const COMMERCIAL_TOLERANCE = 50

export const CORPUS: CorpusEntry[] = [
  {
    id: '01-suburban-asheville',
    label: 'Asheville suburban / large lawn (baseline)',
    address: '100 Tunnel Road, Asheville, NC 28805',
    lat: 35.5905,
    lng: -82.516,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Existing E2E baseline. Should be the easiest case: clear backyard, single house, no occlusions.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Paver Patio', lengthFt: 16, widthFt: 12, linearFt: null },
      { key: 'edging', elementType: 'edging', name: 'Garden Bed Edging', lengthFt: null, widthFt: null, linearFt: 60 },
    ],
    expected: [
      { key: 'patio', expectedX: 0, expectedY: 30, toleranceFt: DEFAULT_TOLERANCE },
      { key: 'edging', expectedX: -20, expectedY: 35, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '02-urban-rowhouse',
    label: 'Urban rowhouse with tiny yard',
    address: 'TBD — Boston/Philadelphia rowhouse',
    lat: 0,
    lng: 0,
    zoom: 20,
    tilePxWide: 1200,
    rationale: 'Tests the case where buildable area is ~200 sqft. Tight tolerance.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Small back patio', lengthFt: 10, widthFt: 8, linearFt: null },
      { key: 'bed', elementType: 'garden_bed', name: 'Side garden bed', lengthFt: 6, widthFt: 2, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: 0, expectedY: 15, toleranceFt: URBAN_TOLERANCE },
      { key: 'bed', expectedX: -8, expectedY: 12, toleranceFt: URBAN_TOLERANCE },
    ],
  },
  {
    id: '03-rural-multi-acre',
    label: 'Rural multi-acre property',
    address: 'TBD — upstate NY / VT rural',
    lat: 0,
    lng: 0,
    zoom: 17,
    tilePxWide: 1200,
    rationale: 'Tests zoomed-out tiles where the house occupies <5% of the image.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Patio off back deck', lengthFt: 20, widthFt: 16, linearFt: null },
      { key: 'walkway', elementType: 'walkway', name: 'Front walkway', lengthFt: 30, widthFt: 4, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: 0, expectedY: 60, toleranceFt: DEFAULT_TOLERANCE * 2 },
      { key: 'walkway', expectedX: -10, expectedY: -40, toleranceFt: DEFAULT_TOLERANCE * 2 },
    ],
  },
  {
    id: '04-commercial-strip-mall',
    label: 'Commercial parking lot redesign',
    address: 'TBD — strip mall plaza',
    lat: 0,
    lng: 0,
    zoom: 18,
    tilePxWide: 1200,
    rationale:
      'No lawn. Element placement is about which corner of the parking lot to landscape.',
    elements: [
      { key: 'island', elementType: 'garden_bed', name: 'Parking-lot island', lengthFt: 30, widthFt: 8, linearFt: null },
      { key: 'tree-row', elementType: 'tree_planting', name: 'Frontage tree row', lengthFt: 80, widthFt: 6, linearFt: null },
    ],
    expected: [
      { key: 'island', expectedX: 0, expectedY: 0, toleranceFt: COMMERCIAL_TOLERANCE },
      { key: 'tree-row', expectedX: 0, expectedY: -40, toleranceFt: COMMERCIAL_TOLERANCE },
    ],
  },
  {
    id: '05-recently-built-sparse',
    label: 'Recently-built / sparse imagery',
    address: 'TBD — new development',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Tests stale satellite. The house may not even be in the tile yet.',
    elements: [
      { key: 'sod', elementType: 'sod_area', name: 'Lawn install', lengthFt: 40, widthFt: 30, linearFt: null },
    ],
    expected: [
      { key: 'sod', expectedX: 0, expectedY: 30, toleranceFt: DEFAULT_TOLERANCE * 1.5 },
    ],
  },
  {
    id: '06-heavily-treed',
    label: 'Heavily-treed lot',
    address: 'TBD — wooded NC/PA',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Mature tree canopy occludes the ground. Model should still place in clearings.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Forest patio', lengthFt: 14, widthFt: 14, linearFt: null },
      { key: 'firepit', elementType: 'fire_pit', name: 'Fire pit', lengthFt: 5, widthFt: 5, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: 10, expectedY: 25, toleranceFt: DEFAULT_TOLERANCE },
      { key: 'firepit', expectedX: 15, expectedY: 35, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '07-corner-lot',
    label: 'Corner lot (2 street faces)',
    address: 'TBD — corner suburban',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Tests setback awareness — element must avoid both road frontages.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Backyard patio', lengthFt: 16, widthFt: 12, linearFt: null },
      { key: 'fence', elementType: 'fence', name: 'Privacy fence', lengthFt: null, widthFt: null, linearFt: 60 },
    ],
    expected: [
      { key: 'patio', expectedX: 15, expectedY: 25, toleranceFt: DEFAULT_TOLERANCE },
      { key: 'fence', expectedX: 5, expectedY: 30, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '08-house-on-slope',
    label: 'House on slope',
    address: 'TBD — foothills',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Slope causes imagery distortion + driveway runs uphill. Model should not place patio on slope.',
    elements: [
      { key: 'wall', elementType: 'retaining_wall', name: 'Retaining wall', lengthFt: null, widthFt: null, linearFt: 30 },
      { key: 'patio', elementType: 'patio', name: 'Upper patio', lengthFt: 12, widthFt: 10, linearFt: null },
    ],
    expected: [
      { key: 'wall', expectedX: 0, expectedY: 20, toleranceFt: DEFAULT_TOLERANCE },
      { key: 'patio', expectedX: 0, expectedY: 25, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '09-driveway-front-yard',
    label: 'Driveway-dominant front yard',
    address: 'TBD — suburb with long driveway',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Front yard is mostly paving. Garden bed should hug the house, not the driveway.',
    elements: [
      { key: 'bed', elementType: 'garden_bed', name: 'Front foundation bed', lengthFt: 25, widthFt: 4, linearFt: null },
    ],
    expected: [
      { key: 'bed', expectedX: 0, expectedY: -15, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '10-waterfront',
    label: 'Lakefront / waterfront property',
    address: 'TBD — any lake property',
    lat: 0,
    lng: 0,
    zoom: 18,
    tilePxWide: 1200,
    rationale: 'Water is an obstacle. Patio must not float on the lake.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Lakeside patio', lengthFt: 18, widthFt: 14, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: 0, expectedY: 30, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '11-hoa-tract',
    label: 'HOA-style identical lots',
    address: 'TBD — any tract development',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Tests neighbor-property bleed. Patio should land on THIS lot, not the neighbor.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Backyard patio', lengthFt: 14, widthFt: 12, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: 0, expectedY: 30, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '12-apartment-complex',
    label: 'Apartment / multi-family complex',
    address: 'TBD',
    lat: 0,
    lng: 0,
    zoom: 18,
    tilePxWide: 1200,
    rationale: 'Tests scale-confusion (multiple buildings, large parking).',
    elements: [
      { key: 'island', elementType: 'mulch_area', name: 'Mulched courtyard', lengthFt: 20, widthFt: 20, linearFt: null },
    ],
    expected: [
      { key: 'island', expectedX: 0, expectedY: 0, toleranceFt: COMMERCIAL_TOLERANCE },
    ],
  },
  {
    id: '13-townhouse-shared',
    label: 'Townhouse with shared driveway',
    address: 'TBD',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Parcel-line ambiguity. Model needs to read fence + walkway cues to find this unit.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Back patio', lengthFt: 10, widthFt: 8, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: 0, expectedY: 15, toleranceFt: URBAN_TOLERANCE * 1.5 },
    ],
  },
  {
    id: '14-flat-suburban-baseline',
    label: 'Generic flat suburban (regression baseline)',
    address: 'TBD',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Easiest case. If this regresses, something fundamental broke.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Backyard patio', lengthFt: 14, widthFt: 12, linearFt: null },
      { key: 'walkway', elementType: 'walkway', name: 'Front walkway', lengthFt: 20, widthFt: 4, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: 0, expectedY: 25, toleranceFt: DEFAULT_TOLERANCE },
      { key: 'walkway', expectedX: -5, expectedY: -20, toleranceFt: DEFAULT_TOLERANCE },
    ],
  },
  {
    id: '15-bad-address',
    label: 'Invalid address — graceful failure path',
    address: '999999 Nowhere Street, Atlantis, ZZ 00000',
    lat: 0,
    lng: 0,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Tests the fallback path: invalid geocode → no tile → autoLayout. Harness expects ZERO placements + a graceful error.',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Phantom patio', lengthFt: 12, widthFt: 10, linearFt: null },
    ],
    expected: [], // empty by design — fallback should kick in
  },
]

/**
 * Score a model placement against the corpus expected. Returns 1 if
 * within tolerance, 0 otherwise. Per-element averaged for the entry's
 * accuracy, then the entries are mean-averaged for the corpus score.
 */
export function scorePlacement(
  modelXY: { x: number; y: number } | null,
  expected: ExpectedPlacement,
): number {
  if (!modelXY) return 0
  const dx = modelXY.x - expected.expectedX
  const dy = modelXY.y - expected.expectedY
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance <= expected.toleranceFt ? 1 : 0
}
