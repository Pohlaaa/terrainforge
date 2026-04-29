# Materials engine accuracy harness — Sprint M

**Generated**: 2026-04-29T02:19:06.066Z

## Headline

| Metric | Value |
|---|---|
| Scenarios run | 30 |
| Mean score | 89.6% |
| Worst-case score | 50.0% |
| Best-case score | 100.0% |
| Forbidden-category hits (goal: 0) | 0 |

Threshold per ROADMAP.md is ≥ 80% mean score. Forbidden hits — categories like "sod has crushed-stone base" — are the loudest signal that the prompt is leaking hardscape rules into softscape (or vice-versa).

## Per-scenario breakdown

| Scenario | Tier | Score | Required | Forbidden | Qty checks | Notes |
|---|---|---|---|---|---|---|
| patio_small | small | 83.3% | 3/3 | ✓ | 2/3 | Smallest hardscape. Should NOT include softscape/organic materials. |
| patio_medium | medium | 100.0% | 3/3 | ✓ | 3/3 | Median patio size from contractor walkthroughs. |
| patio_large | large | 80.0% | 3/3 | ✓ | 1/2 | Thompson-scale patio. |
| walkway_small | small | 66.7% | 2/2 | ✓ | 0/1 | Long narrow walkway. Edging optional but base + paver required. |
| walkway_medium | medium | 100.0% | 2/2 | ✓ | 1/1 | Medium walkway. |
| walkway_large | large | 100.0% | 2/2 | ✓ | 1/1 | Large walkway loop. |
| sod_small | small | 66.7% | 2/2 | ✓ | 0/1 | F-PHB-02 regression: must NOT include gravel/crushed-stone base. |
| sod_medium | medium | 100.0% | 2/2 | ✓ | 1/1 | Medium sod patch. F-PHB-02 regression check. |
| sod_large | large | 66.7% | 2/2 | ✓ | 0/1 | Large sod install. F-PHB-02 regression check. |
| garden_bed_small | small | 75.0% | 2/2 | ✓ | 1/2 | Small garden bed. No gravel/concrete. |
| garden_bed_medium | medium | 100.0% | 2/2 | ✓ | 2/2 | Medium garden bed run. |
| garden_bed_large | large | 100.0% | 2/2 | ✓ | 2/2 | Large garden bed. |
| mulch_small | small | 100.0% | 1/1 | ✓ | 1/1 | Pure mulch refresh, small. |
| mulch_medium | medium | 100.0% | 1/1 | ✓ | 1/1 | Medium mulch refresh. |
| mulch_large | large | 100.0% | 1/1 | ✓ | 1/1 | Large mulch refresh. |
| gravel_small | small | 100.0% | 1/1 | ✓ | 1/1 | Small gravel area. |
| gravel_medium | medium | 100.0% | 1/1 | ✓ | 1/1 | Medium gravel pad. |
| gravel_large | large | 50.0% | 1/1 | ✓ | 0/1 | Large gravel install. |
| fence_small | small | 100.0% | 1/1 | ✓ | 1/1 | Short fence run. Should call out posts and boards. |
| fence_medium | medium | 50.0% | 1/1 | ✓ | 0/1 | Standard backyard perimeter fence. |
| fence_large | large | 50.0% | 1/1 | ✓ | 0/1 | Full property perimeter. |
| retaining_wall_small | small | 100.0% | 1/1 | ✓ | 0/0 | Short retaining wall. Block + base + drainage stone all reasonable. |
| retaining_wall_medium | medium | 100.0% | 1/1 | ✓ | 0/0 | Standard retaining wall scope. |
| retaining_wall_large | large | 100.0% | 1/1 | ✓ | 0/0 | Tall retaining wall — drainage materials critical. |
| drainage_small | small | 100.0% | 1/1 | ✓ | 1/1 | Short trench. Drain rock + pipe required. |
| drainage_medium | medium | 100.0% | 1/1 | ✓ | 1/1 | Medium drainage run. |
| drainage_large | large | 100.0% | 1/1 | ✓ | 1/1 | Large multi-zone drainage. |
| edging_small | small | 100.0% | 1/1 | ✓ | 1/1 | Short edging run. |
| edging_medium | medium | 100.0% | 1/1 | ✓ | 1/1 | Medium edging. |
| edging_large | large | 100.0% | 1/1 | ✓ | 1/1 | Large edging. |

## Failure detail (score < 70%)

### walkway_small — 66.7%

- QTY out-of-range: Crushed Stone Base (¾" minus) returned 3.3 cuyd; expected [0.67, 1.92] cuyd (60 sqft × 6" ≈ 1.1 cuyd)

**Returned materials** (5):
- Crushed Stone Base (¾" minus) (gravel) — 3.3 cuyd
- Concrete Pavers (2¼" × 4¾", grey) (paver) — 60 sqft
- Polymeric Sand (joint fill, 50lb bag) (sand) — 1 bag
- Landscape Fabric (3 oz, polypropylene) (misc) — 66 sqft
- Plastic Edge Restraint (8" height, 20 lnft) (edging) — 20 lnft

### sod_small — 66.7%

- QTY out-of-range: Sod (Kentucky Bluegrass or regional blend, 1 pallet = 450 sqft) returned 0.5 pallet; expected [170.00, 345.00] sqft (200 sqft × waste ≈ 200–230)

**Returned materials** (5):
- Topsoil (prepared base for sod) (soil) — 1.2 cuyd
- Sod (Kentucky Bluegrass or regional blend, 1 pallet = 450 sqft) (sod) — 0.5 pallet
- Soil conditioner / organic amendment (compost blend) (soil) — 0.3 cuyd
- Starter fertilizer (turf establishment blend) (misc) — 1 bag
- Landscape fabric / weed barrier (sod underlay, optional) (misc) — 220 sqft

### sod_large — 66.7%

- QTY out-of-range: Sod (Kentucky Bluegrass or regional blend, 1 pallet = 50 sqft) returned 50 pallet; expected [2125.00, 4312.50] sqft (2500 sqft × waste ≈ 2500–3750)

**Returned materials** (5):
- Topsoil (screened, general-purpose) (soil) — 46.3 cuyd
- Sod (Kentucky Bluegrass or regional blend, 1 pallet = 50 sqft) (sod) — 50 pallet
- Soil conditioner / organic amendment (compost blend) (soil) — 9.3 cuyd
- Starter fertilizer (turf, NPK 10-26-26, 50 lb bag) (misc) — 10 bag
- Landscape fabric (non-woven, 3 oz, 4 ft wide roll) (misc) — 2.6 roll

### gravel_large — 50.0%

- QTY out-of-range: Crushed Stone (3/4") Base Material returned 2.4 cuyd; expected [2.84, 8.18] cuyd (384 sqft × 4" gravel ≈ 4.7 cuyd)

**Returned materials** (4):
- Landscape Geotextile Fabric (Non-Woven, 3oz) (misc) — 423 sqft
- Crushed Stone (3/4") Base Material (gravel) — 2.4 cuyd
- Crusher Run / Quarry Process (Dense Grade Aggregate) (gravel) — 2.4 cuyd
- Pea Gravel (Decorative Top Layer) (gravel) — 1.2 cuyd

### fence_medium — 50.0%

- QTY out-of-range: Pressure-treated 2×6 lumber (fence boards) returned 960 lnft; expected [10.00, 600.00] each (medium fence material count)

**Returned materials** (6):
- Pressure-treated 2×6 lumber (fence boards) (lumber) — 960 lnft
- Pressure-treated 4×4 fence posts (lumber) — 12 piece
- Concrete (for post footings) (concrete) — 1.5 cuyd
- 2.5-inch galvanized deck screws (misc) — 5 lb
- Landscape geotextile fabric (optional silt barrier) (misc) — 490 sqft
- 3-inch exterior wood stain or sealant (misc) — 3 gallon

### fence_large — 50.0%

- QTY out-of-range: Pressure-treated 4×4 fence post returned 14 each; expected [25.00, 1500.00] each (large fence material count)

**Returned materials** (7):
- Pressure-treated 4×4 fence post (lumber) — 14 each
- Pressure-treated 2×6 horizontal fence rails (lumber) — 26 piece
- Pressure-treated 1×6 fence boards (vertical pickets) (lumber) — 407 piece
- 3-inch galvanized exterior wood screws (misc) — 12 lb
- Concrete for post footings (80 lb bags) (concrete) — 21 bag
- Post caps (wood or composite, 4×4) (misc) — 14 each
- Landscape geotextile fabric (underlayment at base) (misc) — 420 sqft
