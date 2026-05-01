# AI Placement Scorecard

Generated: 2026-05-01T20:36:10.361Z

**Mean accuracy (operational entries only):** 26.7% (4/15 elements across 10 operational fixtures)

**Threshold:** 70% — ❌ BELOW

Corpus: 15 total, 10 scored, 5 placeholder (need authoring), 2 imagery-poor

## Per-entry

| ID | Label | Source | Matched | Score | Imagery |
|---|---|---|---|---|---|
| 01-suburban-asheville | Asheville suburban / large lawn (baseline) | manual | 0/2 | 0% | ok |
| 02-urban-rowhouse | Urban rowhouse with tiny yard | heuristic | 0/2 | 0% | ⚠️ poor |
| 03-rural-multi-acre | Rural multi-acre property | manual | 1/2 | 50% | ok |
| 04-commercial-strip-mall | Commercial parking lot redesign | manual | 0/2 | 0% | ok |
| 05-recently-built-sparse | Recently-built / sparse imagery | placeholder | 0/1 | _skipped_ | — |
| 06-heavily-treed | Heavily-treed lot | manual | 0/2 | 0% | ok |
| 07-corner-lot | Corner lot (2 street faces) | placeholder | 0/2 | _skipped_ | — |
| 08-house-on-slope | House on slope | placeholder | 0/2 | _skipped_ | — |
| 09-driveway-front-yard | Driveway-dominant front yard | manual | 1/1 | 100% | ok |
| 10-waterfront | Lakefront / waterfront property | manual | 1/1 | 100% | ok |
| 11-hoa-tract | HOA-style identical lots | manual | 1/1 | 100% | ok |
| 12-apartment-complex | Apartment / multi-family complex | placeholder | 0/1 | _skipped_ | — |
| 13-townhouse-shared | Townhouse with shared driveway | placeholder | 0/1 | _skipped_ | — |
| 14-flat-suburban-baseline | Generic flat suburban (regression baseline) | manual | 0/2 | 0% | ok |
| 15-bad-address | Invalid address — graceful failure path | manual | 0/0 | 100% | ⚠️ poor |

## Failure detail

### 01-suburban-asheville — Asheville suburban / large lawn (baseline)
- `patio`: 235 ft from expected (tolerance 150 ft)
- `edging`: 193 ft from expected (tolerance 50 ft)

### 02-urban-rowhouse — Urban rowhouse with tiny yard
- `patio`: 15 ft from expected (tolerance 8 ft)
- `bed`: 14 ft from expected (tolerance 8 ft)

### 03-rural-multi-acre — Rural multi-acre property
- `walkway`: 562 ft from expected (tolerance 400 ft)

### 04-commercial-strip-mall — Commercial parking lot redesign
- `island`: 831 ft from expected (tolerance 100 ft)
- `tree-row`: 389 ft from expected (tolerance 100 ft)

### 06-heavily-treed — Heavily-treed lot
- `patio`: 177 ft from expected (tolerance 150 ft)
- `firepit`: 176 ft from expected (tolerance 100 ft)

### 14-flat-suburban-baseline — Generic flat suburban (regression baseline)
- `patio`: 118 ft from expected (tolerance 75 ft)
- `walkway`: 187 ft from expected (tolerance 125 ft)
