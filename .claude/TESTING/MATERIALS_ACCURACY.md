# Materials engine accuracy harness — Sprint M

**Generated**: 2026-04-28T12:17:34.886Z

## Headline

| Metric | Value |
|---|---|
| Scenarios run | 30 |
| Mean score | 87.0% |
| Worst-case score | 50.0% |
| Best-case score | 100.0% |
| Forbidden-category hits (goal: 0) | 0 |

Threshold per ROADMAP.md is ≥ 80% mean score. Forbidden hits — categories like "sod has crushed-stone base" — are the loudest signal that the prompt is leaking hardscape rules into softscape (or vice-versa).

## Per-scenario breakdown

| Scenario | Tier | Score | Required | Forbidden | Qty checks | Notes |
|---|---|---|---|---|---|---|
| patio_small | small | 83.3% | 3/3 | ✓ | 2/3 | Smallest hardscape. Should NOT include softscape/organic materials. |
| patio_medium | medium | 100.0% | 3/3 | ✓ | 3/3 | Median patio size from contractor walkthroughs. |
| patio_large | large | 60.0% | 3/3 | ✓ | 0/2 | Thompson-scale patio. |
| walkway_small | small | 66.7% | 2/2 | ✓ | 0/1 | Long narrow walkway. Edging optional but base + paver required. |
| walkway_medium | medium | 66.7% | 2/2 | ✓ | 0/1 | Medium walkway. |
| walkway_large | large | 66.7% | 2/2 | ✓ | 0/1 | Large walkway loop. |
| sod_small | small | 66.7% | 2/2 | ✓ | 0/1 | F-PHB-02 regression: must NOT include gravel/crushed-stone base. |
| sod_medium | medium | 100.0% | 2/2 | ✓ | 1/1 | Medium sod patch. F-PHB-02 regression check. |
| sod_large | large | 100.0% | 2/2 | ✓ | 1/1 | Large sod install. F-PHB-02 regression check. |
| garden_bed_small | small | 50.0% | 2/2 | ✓ | 0/2 | Small garden bed. No gravel/concrete. |
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

### patio_large — 60.0%

- QTY out-of-range: Crushed Stone Base (3/4" minus) returned 2.4 cuyd; expected [4.80, 13.80] cuyd (432 sqft × 6" ≈ 8 cuyd)
- QTY out-of-range: Paver Base Sand (mason sand) returned 0.95 cuyd; expected [5.00, 9.00] bag (432 / 65 ≈ 7 bags)

**Returned materials** (7):
- Crushed Stone Base (3/4" minus) (gravel) — 2.4 cuyd
- Paver Base Sand (mason sand) (sand) — 0.95 cuyd
- Concrete Pavers (2.25" thick, 4×8 in nominal) (paver) — 432 sqft
- Polymeric Sand (jointing, 50 lb bag) (sand) — 7 bag
- Landscape Geotextile Fabric (non-woven, 3 oz) (misc) — 475 sqft
- Plastic Paver Edge Restraint (12" tall, 1/16" thick) (edging) — 84 lnft
- Landscape Spikes / Stakes (6 in, galvanized steel) (misc) — 28 each

### walkway_small — 66.7%

- QTY out-of-range: Crushed Stone Base (3/4"), 6" depth returned 3.33 cuyd; expected [0.67, 1.92] cuyd (60 sqft × 6" ≈ 1.1 cuyd)

**Returned materials** (6):
- Crushed Stone Base (3/4"), 6" depth (gravel) — 3.33 cuyd
- Polymeric Sand, Jointing (sand) — 1 bag
- Concrete Pavers, 12" × 12" × 2", Standard (paver) — 60 each
- Landscape Geotextile Fabric, Weed Barrier (misc) — 66 sqft
- Plastic Paver Edge Restraint, 12" H (edging) — 46 lnft
- Landscape Spikes for Edging, 6" (misc) — 24 each

### walkway_medium — 66.7%

- QTY out-of-range: Crushed Stone Base (4" minus) returned 4.4 cuyd; expected [1.33, 3.83] cuyd (120 sqft × 6" ≈ 2.2 cuyd)

**Returned materials** (6):
- Crushed Stone Base (4" minus) (gravel) — 4.4 cuyd
- Polymeric Sand (jointing) (sand) — 2 bag
- Concrete Pavers (6" × 6", grey) (paver) — 480 each
- Steel Edge Restraint (landscape edging) (edging) — 68 lnft
- Steel Landscape Edging Stakes (6") (misc) — 34 each
- Landscape Fabric (4 oz woven, geotextile) (misc) — 132 sqft

### walkway_large — 66.7%

- QTY out-of-range: Crushed Stone Base (4" nominal) returned 1.78 cuyd; expected [2.67, 7.67] cuyd (240 sqft × 6" ≈ 4.4 cuyd)

**Returned materials** (6):
- Crushed Stone Base (4" nominal) (gravel) — 1.78 cuyd
- Concrete Pavers (4" × 8", grey) (paver) — 245 each
- Polymeric Jointing Sand (sand) — 4 bag
- Bedding Sand (mason/paver-grade) (sand) — 0.45 cuyd
- Steel Edge Restraint (landscape edging, 4" height) (edging) — 128 lnft
- Steel Landscape Spikes (8", galvanized) (misc) — 64 each

### sod_small — 66.7%

- QTY out-of-range: Sod (Kentucky Bluegrass blend, 1 pallet = 450–500 sqft) returned 1 pallet; expected [170.00, 345.00] sqft (200 sqft × waste ≈ 200–230)

**Returned materials** (5):
- Topsoil (prepared base layer) (soil) — 1.2 cuyd
- Sod (Kentucky Bluegrass blend, 1 pallet = 450–500 sqft) (sod) — 1 pallet
- Soil amendments (compost/peat mix) (soil) — 0.3 cuyd
- Landscape fabric/weed barrier (4 oz nonwoven) (misc) — 220 sqft
- Starter fertilizer (slow-release, lawn blend) (misc) — 1 bag

### garden_bed_small — 50.0%

- QTY out-of-range: Topsoil (garden-grade) returned 0.89 cuyd; expected [0.27, 0.77] cuyd (24 sqft × 6" topsoil ≈ 0.45 cuyd)
- QTY out-of-range: Mulch (shredded hardwood, 3" depth) returned 0.93 cuyd; expected [0.13, 0.38] cuyd (24 sqft × 3" mulch ≈ 0.22 cuyd)

**Returned materials** (7):
- Topsoil (garden-grade) (soil) — 0.89 cuyd
- Mulch (shredded hardwood, 3" depth) (mulch) — 0.93 cuyd
- Landscape fabric (weed barrier) (misc) — 26.4 sqft
- Soil amendment (compost or aged bark) (soil) — 0.5 cuyd
- Garden edging (steel or composite strip) (edging) — 20 lnft
- Edging stakes or spikes (galvanized steel) (misc) — 8 each
- Perennial/shrub plantings (assorted, qty TBD) (plant) — 4 each

### gravel_large — 50.0%

- QTY out-of-range: Crushed Stone Base (Gravel, 3/4-inch) returned 2.8 cuyd; expected [2.84, 8.18] cuyd (384 sqft × 4" gravel ≈ 4.7 cuyd)

**Returned materials** (5):
- Landscape Geotextile Fabric (Non-Woven, 4 oz) (misc) — 423 sqft
- Crushed Stone Base (Gravel, 3/4-inch) (gravel) — 2.8 cuyd
- Crushed Stone Topping (Pea Gravel, 3/8-inch) (gravel) — 1.4 cuyd
- Steel Edge Restraint (6-inch height, galvanized) (edging) — 80 lnft
- Steel Landscape Spikes (8-inch, galvanized) (misc) — 40 each

### fence_medium — 50.0%

- QTY out-of-range: Pressure-treated 2×6 horizontal rails returned 960 lnft; expected [10.00, 600.00] each (medium fence material count)

**Returned materials** (6):
- Pressure-treated 2×6 horizontal rails (lumber) — 960 lnft
- Pressure-treated 4×4 fence posts (lumber) — 11 each
- Concrete (bagged, 80 lb bags for post footings) (concrete) — 22 bag
- Cedar or pine 1×6 vertical pickets (or boards) (lumber) — 160 each
- Galvanized deck screws (2.5 in, 5 lb box) (misc) — 2 box
- Gravel (crushed stone for post holes) (gravel) — 0.5 cuyd

### fence_large — 50.0%

- QTY out-of-range: Pressure-treated 4x4 fence post returned 15 each; expected [25.00, 1500.00] each (large fence material count)

**Returned materials** (6):
- Pressure-treated 4x4 fence post (lumber) — 15 each
- 2x6 pressure-treated fence board (lumber) — 400 lnft
- 2x4 pressure-treated rails (lumber) — 200 lnft
- Concrete for post footings (80 lb bag) (concrete) — 26 bag
- Galvanized 3-inch deck screws (misc) — 15 lb
- Post hole gravel / drainage stone (gravel) — 0.5 cuyd
