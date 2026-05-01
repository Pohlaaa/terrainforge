# AI Placement Scorecard

Generated: 2026-05-01T21:10:25.756Z

**Mean accuracy (operational entries only):** 53.3% (8/15 elements across 10 operational fixtures)

**Threshold:** 70% — ❌ BELOW

Corpus: 15 total, 10 scored, 5 placeholder (need authoring), 2 imagery-poor

## Per-entry

| ID | Label | Source | Matched | Score | Imagery |
|---|---|---|---|---|---|
| 01-suburban-asheville | Asheville suburban / large lawn (baseline) | manual | 1/2 | 50% | ok |
| 02-urban-rowhouse | Urban rowhouse with tiny yard | heuristic | 0/2 | 0% | ⚠️ poor |
| 03-rural-multi-acre | Rural multi-acre property | manual | 2/2 | 100% | ok |
| 04-commercial-strip-mall | Commercial parking lot redesign | manual | 1/2 | 50% | ok |
| 05-recently-built-sparse | Recently-built / sparse imagery | placeholder | 0/1 | _skipped_ | — |
| 06-heavily-treed | Heavily-treed lot | manual | 0/2 | 0% | ok |
| 07-corner-lot | Corner lot (2 street faces) | placeholder | 0/2 | _skipped_ | — |
| 08-house-on-slope | House on slope | placeholder | 0/2 | _skipped_ | — |
| 09-driveway-front-yard | Driveway-dominant front yard | manual | 1/1 | 100% | ok |
| 10-waterfront | Lakefront / waterfront property | manual | 0/1 | 0% | ok |
| 11-hoa-tract | HOA-style identical lots | manual | 1/1 | 100% | ok |
| 12-apartment-complex | Apartment / multi-family complex | placeholder | 0/1 | _skipped_ | — |
| 13-townhouse-shared | Townhouse with shared driveway | placeholder | 0/1 | _skipped_ | — |
| 14-flat-suburban-baseline | Generic flat suburban (regression baseline) | manual | 2/2 | 100% | ok |
| 15-bad-address | Invalid address — graceful failure path | manual | 0/0 | 100% | ⚠️ poor |

## Failure detail

### 01-suburban-asheville — Asheville suburban / large lawn (baseline)
- `edging`: outside all 1 zone; nearest "around geocode point" is 46 ft past its boundary

### 02-urban-rowhouse — Urban rowhouse with tiny yard
- `patio`: outside all 1 zone; nearest is 7 ft past its boundary
- `bed`: outside all 1 zone; nearest is 6 ft past its boundary

### 04-commercial-strip-mall — Commercial parking lot redesign
- `island`: outside all 3 zones; nearest "west bay" is 96 ft past its boundary

### 06-heavily-treed — Heavily-treed lot
- `patio`: outside all 2 zones; nearest "west clearing" is 22 ft past its boundary
- `firepit`: outside all 2 zones; nearest "near south patio" is 37 ft past its boundary

### 10-waterfront — Lakefront / waterfront property
- `patio`: outside all 2 zones; nearest "east of cluster" is 51 ft past its boundary
