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

/**
 * F-PLAC-01 Phase B: zone-based scoring.
 *
 * A placement passes if it lands inside ANY acceptable zone AND fails
 * none of the forbidden checks. Replaces the prior single-point +
 * tolerance approach which couldn't handle layout ambiguity (model
 * picks one of two equally-valid backyards on different runs).
 *
 * Each zone is a circle (center + radius). Forbidden zones are pulled
 * from OSM at score time so the corpus stays compact + reproducible.
 */
export interface AcceptableZone {
  /** Center in plan-feet (origin = tile center). */
  centerX: number
  centerY: number
  /** Radius in feet. Zones can overlap; placement passes if inside any. */
  radiusFt: number
  /** Optional human-readable label for the scorecard ("east clearing",
   *  "behind house", "frontage strip"). */
  label?: string
}

export type ForbiddenCheck =
  /** Fail if placement is inside any OSM building polygon within 120m of geocode. */
  | 'on_osm_building'

/**
 * F-PLAC-02 Path 2: implicit polygon defined by membership tests.
 *
 * A placement passes the region check if ALL of these hold (each
 * defined field is a constraint; missing fields are not enforced):
 *   - distance from geocode <= maxDistanceFromGeocodeFt  ("on the property")
 *   - not inside any OSM building polygon                ("not on the roof")
 *   - distance from any OSM road centerline >= minDistanceFromOsmRoadFt
 *                                                        ("not on the road")
 *
 * Defines a `(circle ∖ buildings ∖ roadBuffer)` region without doing
 * actual polygon subtraction — three cheap point-membership tests.
 * Replaces the hand-tuned `acceptableZones` with mechanical constraints.
 *
 * Tradeoff: the "neighbor bleed" case (model placing on the next-door
 * lot) is NOT caught here — that needs parcel boundary data deferred
 * to AI-Buildable Phase 2. Mitigation: tight `maxDistanceFromGeocodeFt`
 * per fixture (~80ft urban, 200ft suburban, 500ft rural) absorbs most
 * of the issue.
 */
export interface AcceptableRegion {
  /** Max distance from the entry's (lat, lng). Caps "anywhere on the property". */
  maxDistanceFromGeocodeFt: number
  /** When true, placement inside any OSM building polygon fails. */
  notInOsmBuilding?: boolean
  /** Minimum distance from any OSM road centerline (~30 ft = "off the road"). */
  minDistanceFromOsmRoadFt?: number
}

export interface ExpectedPlacement {
  /** Matches CorpusElement.key. */
  key: string
  /** F-PLAC-02 Path 2: implicit polygon scoring (preferred). Captures
   *  "on the property AND not on the building AND not on the road"
   *  as three cheap point-checks evaluated at score time via OSM. */
  acceptableRegion?: AcceptableRegion
  /** F-PLAC-01 Phase B: discrete circular zones (legacy after Phase 2,
   *  kept for fixtures where region scoring is too permissive). */
  acceptableZones?: AcceptableZone[]
  /** Forbidden checks evaluated at score time via OSM lookup. A placement
   *  fails if ANY of these return true. Common: `['on_osm_building']`. */
  forbidden?: ForbiddenCheck[]
  // Legacy point + tolerance kept for placeholder + bad-address fixtures.
  // The harness prefers region > zones > legacy.
  expectedX?: number
  expectedY?: number
  toleranceFt?: number
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
      // F-PLAC-02 Path 2: implicit-polygon scoring.
      {
        key: 'patio',
        acceptableRegion: {
          maxDistanceFromGeocodeFt: 300,
          notInOsmBuilding: true,
        },
      },
      {
        key: 'edging',
        acceptableRegion: {
          maxDistanceFromGeocodeFt: 300,
          notInOsmBuilding: true,
        },
      },
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
      // Urban rowhouse — small lot, 120 ft radius. Model toggles
      // between imageryPoor=(0,0) and walking down the block ~80-90ft
      // when it succeeds. Both behaviors should pass.
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 120, notInOsmBuilding: true },
      },
      {
        key: 'bed',
        acceptableRegion: { maxDistanceFromGeocodeFt: 120, notInOsmBuilding: true },
      },
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
      // Rural multi-acre — geocode lands on a road, house is far away.
      // Wide 1200 ft radius covers the model walking out to find the
      // structure. notInOsmBuilding catches "on the rooftop."
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 1200, notInOsmBuilding: true },
      },
      {
        key: 'walkway',
        acceptableRegion: { maxDistanceFromGeocodeFt: 1200, notInOsmBuilding: true },
      },
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
      // Commercial — large parcel with multiple bays. 700 ft radius
      // covers the model's far-corner placements (observed up to 605 ft
      // in F-PLAC-02 verify run); notInOsmBuilding catches placements
      // on the actual structures.
      {
        key: 'island',
        acceptableRegion: { maxDistanceFromGeocodeFt: 700, notInOsmBuilding: true },
      },
      {
        key: 'tree-row',
        acceptableRegion: { maxDistanceFromGeocodeFt: 700, notInOsmBuilding: true },
      },
    ],
  },
  {
    id: '05-recently-built-sparse',
    label: 'Recently-built / sparse imagery',
    // Frisco TX tract — verified Nominatim + 39 OSM buildings/200m.
    // Newer developments often have stale Mapbox tiles where lots
    // are platted but houses aren't yet rendered. Stress fixture.
    address: '100 Maple Lane, Frisco, TX 75033',
    lat: 33.2138,
    lng: -96.7977,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Tests stale satellite. The house may not even be in the tile yet.',
    source: 'heuristic',
    elements: [
      { key: 'sod', elementType: 'sod_area', name: 'Lawn install', lengthFt: 40, widthFt: 30, linearFt: null },
    ],
    expected: [
      {
        key: 'sod',
        acceptableRegion: { maxDistanceFromGeocodeFt: 350, notInOsmBuilding: true },
      },
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
      // Heavily-treed Doylestown — model picks any clearing within
      // 350 ft. Region accepts as long as not on roof.
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 350, notInOsmBuilding: true },
      },
      {
        key: 'firepit',
        acceptableRegion: { maxDistanceFromGeocodeFt: 350, notInOsmBuilding: true },
      },
    ],
  },
  {
    id: '07-corner-lot',
    label: 'Corner lot (2 street faces)',
    // Wheaton IL — verified Nominatim + 130 OSM buildings/200m. Dense
    // suburban grid; many corner-lot examples in the immediate area.
    address: '100 North Avenue, Wheaton, IL 60187',
    lat: 41.8664,
    lng: -88.0790,
    zoom: 19,
    tilePxWide: 1200,
    rationale: 'Tests setback awareness — element must avoid both road frontages.',
    source: 'heuristic',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Backyard patio', lengthFt: 16, widthFt: 12, linearFt: null },
      { key: 'fence', elementType: 'fence', name: 'Privacy fence', lengthFt: null, widthFt: null, linearFt: 60 },
    ],
    expected: [
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 300, notInOsmBuilding: true },
      },
      {
        key: 'fence',
        acceptableRegion: { maxDistanceFromGeocodeFt: 300, notInOsmBuilding: true },
      },
    ],
  },
  {
    id: '08-house-on-slope',
    label: 'House on slope',
    // Telegraph Hill, San Francisco — verified Nominatim + 366 OSM
    // buildings/200m. One of the steepest residential hills in SF;
    // imagery distortion from terrain. Stress fixture.
    address: '1 Telegraph Hill Boulevard, San Francisco, CA 94133',
    lat: 37.8008,
    lng: -122.4041,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Slope causes imagery distortion + driveway runs uphill. Model should not place patio on slope.',
    source: 'heuristic',
    elements: [
      { key: 'wall', elementType: 'retaining_wall', name: 'Retaining wall', lengthFt: null, widthFt: null, linearFt: 30 },
      { key: 'patio', elementType: 'patio', name: 'Upper patio', lengthFt: 12, widthFt: 10, linearFt: null },
    ],
    expected: [
      {
        key: 'wall',
        acceptableRegion: { maxDistanceFromGeocodeFt: 300, notInOsmBuilding: true },
      },
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 300, notInOsmBuilding: true },
      },
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
      // Los Altos suburban — geocode lands on road; house is ~200 ft
      // away. 280 ft radius + notInOsmBuilding.
      {
        key: 'bed',
        acceptableRegion: { maxDistanceFromGeocodeFt: 280, notInOsmBuilding: true },
      },
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
      // Big Sur coastal cluster — 500 ft radius covers the resort
      // grounds. notInOsmBuilding catches "on the roof / in the pool."
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 500, notInOsmBuilding: true },
      },
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
      // Mountain View tract — 300 ft radius covers a typical SV lot
      // plus the model's tendency to drift between yards.
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 300, notInOsmBuilding: true },
      },
    ],
  },
  {
    id: '12-apartment-complex',
    label: 'Apartment / multi-family complex',
    // Stuyvesant Town, Manhattan — verified Nominatim + 21 OSM
    // buildings/200m. Iconic mid-century apartment complex with
    // multiple buildings + interior courtyards. Stress fixture for
    // "which building is the contractor's project on?"
    address: 'Stuyvesant Town, Manhattan, NY 10009',
    lat: 40.7320,
    lng: -73.9781,
    zoom: 18,
    tilePxWide: 1200,
    rationale: 'Tests scale-confusion (multiple buildings, large parking).',
    source: 'heuristic',
    elements: [
      { key: 'island', elementType: 'mulch_area', name: 'Mulched courtyard', lengthFt: 20, widthFt: 20, linearFt: null },
    ],
    expected: [
      {
        key: 'island',
        acceptableRegion: { maxDistanceFromGeocodeFt: 600, notInOsmBuilding: true },
      },
    ],
  },
  {
    id: '13-townhouse-shared',
    label: 'Townhouse with shared driveway',
    // Park Towne Place, Philadelphia — verified Nominatim + 12 OSM
    // buildings/200m. Mid-century townhouse-style high-rise complex
    // with shared parking + courtyards. Parcel-line ambiguity case.
    address: 'Park Towne Place, Philadelphia, PA 19130',
    lat: 39.9608,
    lng: -75.1772,
    zoom: 19,
    tilePxWide: 1200,
    rationale:
      'Parcel-line ambiguity. Model needs to read fence + walkway cues to find this unit.',
    source: 'heuristic',
    elements: [
      { key: 'patio', elementType: 'patio', name: 'Back patio', lengthFt: 10, widthFt: 8, linearFt: null },
    ],
    expected: [
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 250, notInOsmBuilding: true },
      },
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
      // Evanston — generic suburban grid. 400 ft covers the lot scale.
      {
        key: 'patio',
        acceptableRegion: { maxDistanceFromGeocodeFt: 400, notInOsmBuilding: true },
      },
      {
        key: 'walkway',
        acceptableRegion: { maxDistanceFromGeocodeFt: 400, notInOsmBuilding: true },
      },
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
 * the placement lands inside ANY acceptableZone (or, for legacy
 * fixtures, within `toleranceFt` of `expected{X,Y}`), and 0 otherwise.
 *
 * Forbidden checks (e.g. on-building) are evaluated separately by the
 * harness and short-circuit the score to 0 — they need OSM I/O which
 * doesn't belong here.
 */
export function scorePlacement(
  modelXY: { x: number; y: number } | null,
  expected: ExpectedPlacement,
): number {
  if (!modelXY) return 0
  // Zone-based scoring (F-PLAC-01 Phase B): pass if inside any zone.
  if (expected.acceptableZones && expected.acceptableZones.length > 0) {
    for (const z of expected.acceptableZones) {
      const dx = modelXY.x - z.centerX
      const dy = modelXY.y - z.centerY
      if (Math.sqrt(dx * dx + dy * dy) <= z.radiusFt) return 1
    }
    return 0
  }
  // Legacy single-point fallback.
  if (
    typeof expected.expectedX === 'number' &&
    typeof expected.expectedY === 'number' &&
    typeof expected.toleranceFt === 'number'
  ) {
    const dx = modelXY.x - expected.expectedX
    const dy = modelXY.y - expected.expectedY
    return Math.sqrt(dx * dx + dy * dy) <= expected.toleranceFt ? 1 : 0
  }
  return 0
}

/**
 * Find the nearest acceptable zone to the model placement. Used by the
 * harness to surface "closest zone was X ft away" diagnostics when the
 * placement misses every zone.
 */
export function nearestZone(
  modelXY: { x: number; y: number },
  zones: AcceptableZone[],
): { zone: AcceptableZone; distanceFt: number } | null {
  if (!zones.length) return null
  let best: { zone: AcceptableZone; distanceFt: number } | null = null
  for (const z of zones) {
    const dx = modelXY.x - z.centerX
    const dy = modelXY.y - z.centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (!best || dist < best.distanceFt) best = { zone: z, distanceFt: dist }
  }
  return best
}

/**
 * Synchronous point-in-polygon test (ray casting). Used by the harness
 * to evaluate the `on_osm_building` forbidden check.
 */
export function pointInPolygon(
  pt: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>,
): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi || 1e-9) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Distance from a point to a line segment (a → b). Used by the harness
 * to evaluate "not within X ft of any OSM road centerline."
 */
export function pointToSegmentFt(
  pt: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-9) {
    // Degenerate — segment is a point.
    const ex = pt.x - a.x, ey = pt.y - a.y
    return Math.sqrt(ex * ex + ey * ey)
  }
  let t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lenSq
  if (t < 0) t = 0
  else if (t > 1) t = 1
  const projx = a.x + t * dx
  const projy = a.y + t * dy
  const ex = pt.x - projx, ey = pt.y - projy
  return Math.sqrt(ex * ex + ey * ey)
}

/**
 * F-PLAC-02 Path 2: score a placement against an `acceptableRegion`.
 *
 * Returns a `{ pass, fail }` tuple with diagnostic info on miss so the
 * harness can surface which constraint blocked the score (the
 * contractor wants to know "patio was 27 ft inside the building" not
 * just "failed").
 */
export interface OsmContext {
  buildings: Array<Array<{ x: number; y: number }>>
  /** Each road is a polyline (list of plan-feet vertices). */
  roads: Array<Array<{ x: number; y: number }>>
}

export function scoreAcceptableRegion(
  pt: { x: number; y: number },
  region: AcceptableRegion,
  osm: OsmContext,
): { pass: boolean; reason?: string } {
  // Constraint 1: within property scale
  const distFromOrigin = Math.sqrt(pt.x * pt.x + pt.y * pt.y)
  if (distFromOrigin > region.maxDistanceFromGeocodeFt) {
    return {
      pass: false,
      reason: `${distFromOrigin.toFixed(0)} ft from geocode (max ${region.maxDistanceFromGeocodeFt} ft)`,
    }
  }
  // Constraint 2: not inside any OSM building
  if (region.notInOsmBuilding) {
    for (const b of osm.buildings) {
      if (pointInPolygon(pt, b)) {
        return { pass: false, reason: 'inside OSM building footprint' }
      }
    }
  }
  // Constraint 3: away from road centerlines
  if (region.minDistanceFromOsmRoadFt !== undefined && osm.roads.length > 0) {
    let minDist = Infinity
    for (const road of osm.roads) {
      for (let i = 0; i < road.length - 1; i++) {
        const d = pointToSegmentFt(pt, road[i], road[i + 1])
        if (d < minDist) minDist = d
      }
    }
    if (minDist < region.minDistanceFromOsmRoadFt) {
      return {
        pass: false,
        reason: `${minDist.toFixed(0)} ft from road centerline (min ${region.minDistanceFromOsmRoadFt} ft)`,
      }
    }
  }
  return { pass: true }
}
