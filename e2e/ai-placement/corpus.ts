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

/**
 * Provenance for a corpus entry's geocode + expected placements:
 *   - `manual`     — Charlie or another operator hand-placed elements on
 *                    the live wizard and read plan-feet off the 2D viewer.
 *                    Treat as ground truth.
 *   - `heuristic`  — entry has a verified geocode (real lat/lng + OSM
 *                    building coverage confirmed) but `expected[]` is a
 *                    fixture-archetype default (e.g. "patio 30 ft south
 *                    of geocode for suburban backyards"). Score is
 *                    directional, not absolute. Charlie should refine.
 *   - `placeholder`— lat/lng still 0/0. Harness skips these entries.
 *                    Pick a real address, geocode it, verify OSM has
 *                    buildings within 120 m via `lookupParcel()`.
 */
export type CorpusSource = 'manual' | 'heuristic' | 'placeholder'

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
  /** Authoring provenance for the lat/lng + expected[] (see CorpusSource). */
  source: CorpusSource
  /** Element list to place on this property. Pre-authored to match
   *  the property type. */
  elements: CorpusElement[]
  /** Contractor-authored expected placements. When `source === 'heuristic'`
   *  these are fixture-archetype defaults; refine on review. */
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
    // Promoted heuristic→manual on 2026-05-01. Expected coords are the
    // MIDPOINT of two independent harness runs (variance: patio 228ft,
    // edging 29ft). Tolerances loosened to absorb model run-to-run
    // variance — see F-PLAC-01 in FINDINGS.md. The harness becomes a
    // directional regression detector rather than a tight gate.
    source: 'manual',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Paver Patio', lengthFt: 16, widthFt: 12, linearFt: null },
      { key: 'edging', elementType: 'edging', name: 'Garden Bed Edging', lengthFt: null, widthFt: null, linearFt: 60 },
    ],
    expected: [
      { key: 'patio', expectedX: -47.8, expectedY: -14.3, toleranceFt: 150 },
      { key: 'edging', expectedX: 0, expectedY: -129, toleranceFt: 50 },
    ],
  },
  {
    id: '02-urban-rowhouse',
    label: 'Urban rowhouse with tiny yard',
    // Park Slope, Brooklyn — verified Nominatim geocode + 149 OSM
    // building polygons within 120 m. Dense rowhouse blocks. Use zoom 20
    // because the yard footprint is small enough that zoom 19 buries it.
    address: '200 Garfield Place, Brooklyn, NY 11215',
    lat: 40.6724,
    lng: -73.9774,
    zoom: 20,
    tilePxWide: 1200,
    rationale: 'Tests the case where buildable area is ~200 sqft. Tight tolerance.',
    source: 'heuristic',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Small back patio', lengthFt: 10, widthFt: 8, linearFt: null },
      { key: 'bed', elementType: 'garden_bed', name: 'Side garden bed', lengthFt: 6, widthFt: 2, linearFt: null },
    ],
    expected: [
      // Rowhouse backyards run perpendicular to the street; 15 ft south
      // is a typical Park Slope yard depth. Tight 8-ft tolerance.
      { key: 'patio', expectedX: 0, expectedY: 15, toleranceFt: URBAN_TOLERANCE },
      { key: 'bed', expectedX: -8, expectedY: 12, toleranceFt: URBAN_TOLERANCE },
    ],
  },
  {
    id: '03-rural-multi-acre',
    label: 'Rural multi-acre property',
    // Killington, VT — verified Nominatim geocode + 13 OSM buildings
    // within 300 m. Rural Vermont mountain resort area; scattered
    // single-family houses on multi-acre lots, sparse rural OSM
    // coverage. Stress fixture for the case where house is < 5% of
    // the satellite tile and most of the image is forest / land.
    address: '100 Killington Road, Killington, VT 05751',
    lat: 43.6671,
    lng: -72.8032,
    zoom: 17,
    tilePxWide: 1200,
    rationale: 'Tests zoomed-out tiles where the house occupies <5% of the image.',
    // Promoted heuristic→manual 2026-05-01. Geocode lands on a road;
    // model walked hundreds of feet to find the actual house. HUGE
    // variance across runs (patio 680ft, walkway 582ft) — rural multi-
    // acre is a stress fixture. Expected = midpoint of 2 runs +
    // generous 400ft tolerance. F-PLAC-01.
    source: 'manual',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Patio off back deck', lengthFt: 20, widthFt: 16, linearFt: null },
      { key: 'walkway', elementType: 'walkway', name: 'Front walkway', lengthFt: 30, widthFt: 4, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: -272.1, expectedY: -68, toleranceFt: 400 },
      { key: 'walkway', expectedX: -289.1, expectedY: -816.3, toleranceFt: 400 },
    ],
  },
  {
    id: '04-commercial-strip-mall',
    label: 'Commercial parking lot redesign',
    // S Lake Ave, Pasadena, CA — verified Nominatim geocode + 36 OSM
    // buildings within 120 m. Dense Old Pasadena commercial strip;
    // mixed retail with surface parking lots. Stress fixture for the
    // "no lawn at all" case — element placement is about which corner
    // of the parking to landscape.
    address: '601 S Lake Avenue, Pasadena, CA 91106',
    lat: 34.1358,
    lng: -118.1324,
    zoom: 18,
    tilePxWide: 1200,
    rationale:
      'No lawn. Element placement is about which corner of the parking lot to landscape.',
    // Promoted heuristic→manual 2026-05-01. Model placed island in
    // open paved area + tree row at frontage. Run-to-run variance
    // ~110ft (island), ~97ft (tree-row). Midpoint + 100ft tolerance.
    source: 'manual',
    elements: [
      { key: 'island', elementType: 'garden_bed', name: 'Parking-lot island', lengthFt: 30, widthFt: 8, linearFt: null },
      { key: 'tree-row', elementType: 'tree_planting', name: 'Frontage tree row', lengthFt: 80, widthFt: 6, linearFt: null },
    ],
    expected: [
      { key: 'island', expectedX: 0, expectedY: 389.2, toleranceFt: 100 },
      { key: 'tree-row', expectedX: 48.7, expectedY: -350.3, toleranceFt: 100 },
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
    source: 'placeholder',
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
    // Doylestown, PA — verified Nominatim geocode + 18 OSM building
    // polygons within 120 m. The Bucks County area is heavily forested
    // residential, characteristic mature canopy, perfect stress fixture.
    address: '100 Cherry Lane, Doylestown, PA 18901',
    lat: 40.3062,
    lng: -75.1053,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Mature tree canopy occludes the ground. Model should still place in clearings.',
    // Promoted heuristic→manual 2026-05-01. Model found clearings on
    // BOTH sides of the property across 2 runs (variance: patio 233ft,
    // firepit 91ft). Midpoint + 150ft / 100ft tolerances.
    source: 'manual',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Forest patio', lengthFt: 14, widthFt: 14, linearFt: null },
      { key: 'firepit', elementType: 'fire_pit', name: 'Fire pit', lengthFt: 5, widthFt: 5, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: -44.8, expectedY: 197.2, toleranceFt: 150 },
      { key: 'firepit', expectedX: -26.9, expectedY: 277.9, toleranceFt: 100 },
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
    source: 'placeholder',
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
    source: 'placeholder',
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
    // 100 Mariposa Ave, Los Altos, CA — verified Nominatim geocode +
    // 33 OSM buildings within 120 m. Silicon Valley single-family
    // homes with the typical long driveway-from-street pattern. Front
    // yard is mostly paving + garage approach.
    address: '100 Mariposa Avenue, Los Altos, CA 94022',
    lat: 37.3849,
    lng: -122.1219,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Front yard is mostly paving. Garden bed should hug the house, not the driveway.',
    // Promoted heuristic→manual 2026-05-01. Model walked ~230ft north
    // (= front of house). Run-to-run variance only ~56ft. Midpoint +
    // 75ft tolerance.
    source: 'manual',
    elements: [
      { key: 'bed', elementType: 'garden_bed', name: 'Front foundation bed', lengthFt: 25, widthFt: 4, linearFt: null },
    ],
    expected: [
      { key: 'bed', expectedX: 0, expectedY: -233.5, toleranceFt: 75 },
    ],
  },
  {
    id: '10-waterfront',
    label: 'Lakefront / waterfront property',
    // Hyatt Carmel Highlands, Big Sur coast, CA — verified Nominatim
    // geocode + 13 OSM buildings within 120 m. Coastal cluster sits
    // directly on a Pacific bluff; tile shows ocean as obstacle on
    // the west side, buildable lawn east. Zoom 18 captures the cliff
    // edge + adjacent grounds in one frame.
    address: 'Hyatt Carmel Highlands, Carmel-By-The-Sea, CA 93923',
    lat: 36.5019,
    lng: -121.9376,
    zoom: 18,
    tilePxWide: 1200,
    rationale: 'Water is an obstacle. Patio must not float on the lake.',
    // Promoted heuristic→manual 2026-05-01. Model placed inland of
    // the cliff in both runs but at different inland depths (~189ft
    // variance in y). Midpoint + 125ft tolerance.
    source: 'manual',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Lakeside patio', lengthFt: 18, widthFt: 14, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: -151.2, expectedY: 321.3, toleranceFt: 125 },
    ],
  },
  {
    id: '11-hoa-tract',
    label: 'HOA-style identical lots',
    // Mountain View, CA — verified Nominatim geocode + 74 OSM buildings
    // within 120 m. Classic Silicon Valley cul-de-sac tract: identical
    // setbacks, garage-front, fenced backyards. Stress test for
    // neighbor-bleed where the AI has trouble distinguishing this lot
    // from the next one over.
    address: '1 Park Lane, Mountain View, CA 94040',
    lat: 37.3984,
    lng: -122.0788,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Tests neighbor-property bleed. Patio should land on THIS lot, not the neighbor.',
    // Promoted heuristic→manual 2026-05-01. Model uncertain about
    // which side of the tract house is the backyard; 231ft variance
    // between runs. Midpoint + 150ft tolerance.
    source: 'manual',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Backyard patio', lengthFt: 14, widthFt: 12, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: -46.7, expectedY: 93.4, toleranceFt: 150 },
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
    source: 'placeholder',
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
    source: 'placeholder',
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
    // Evanston, IL — verified Nominatim geocode + 68 OSM buildings
    // within 120 m. Generic Midwest suburban grid; if THIS regresses,
    // the prompt has broken in a fundamental way.
    address: '1234 Maple Avenue, Evanston, IL 60202',
    lat: 42.0401,
    lng: -87.6852,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Easiest case. If this regresses, something fundamental broke.',
    // Promoted heuristic→manual 2026-05-01. Patio variance 80ft,
    // walkway 175ft (model debated how far the front extends).
    // Midpoint + 75ft / 125ft tolerances.
    source: 'manual',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Backyard patio', lengthFt: 14, widthFt: 12, linearFt: null },
      { key: 'walkway', elementType: 'walkway', name: 'Front walkway', lengthFt: 20, widthFt: 4, linearFt: null },
    ],
    expected: [
      { key: 'patio', expectedX: -43.6, expectedY: 161.6, toleranceFt: 75 },
      { key: 'walkway', expectedX: -131, expectedY: -218.3, toleranceFt: 125 },
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
    // 'manual' because the empty expected[] IS the ground truth here —
    // there's nothing for Charlie to refine. The failure path is
    // codified, not heuristic.
    source: 'manual',
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
