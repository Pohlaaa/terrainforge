# TerrainForge — Testing Protocol

## Philosophy
Testing at this stage has two jobs: catch regressions before they reach a contractor, and surface workflow friction before it becomes a first-impression problem. We don't need 100% coverage — we need the core contractor workflow to work every time.

## Testing Tiers

### Tier 1 — Core Workflow (run after every sprint)
The money path. If this breaks, nothing else matters.
1. Sign up / log in
2. Create a new project (name, client, address, budget)
3. Add 2+ zones to the project (name, area, perimeter)
4. Navigate to Manifest Engine → confirm zones and materials appear
5. Generate manifest → confirm cost calculations
6. Export manifest as PDF → open and verify content
7. Navigate to Work Orders → confirm zone steps generated
8. Export crew packet as PDF → open and verify content

### Tier 2 — Feature Tests (run after relevant sprint tasks)
Run the specific features touched in the sprint.

### Tier 3 — Regression Checks (run before any pilot demo)
Known bugs that were fixed and must stay fixed:
- [ ] `toggleChecklist` syncs to Supabase (was broken in S1-10)
- [ ] Zones with no materials don't get dropped from Supabase queries (was `!inner` bug)
- [ ] Crew with no certifications still loads (was `!inner` bug)
- [ ] Equipment with no logs still loads (was `!inner` bug)
- [ ] Add Crew Member button is functional (was broken in S1-7)

---

## Core Workflow Test — Full Script

**Setup:** Use a fresh project with your own data, not seed data.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Log in with valid credentials | Redirected to Dashboard | |
| 2 | Dashboard loads KPI widgets | Active projects, crew, equipment counts visible | |
| 3 | Click "New Project" | Modal opens with form fields | |
| 4 | Fill in name, client, address, budget → Submit | Project appears in list | |
| 5 | Click project to open detail view | Project detail panel visible | |
| 6 | Click "Add Zone" | Zone form appears | |
| 7 | Enter zone name + area + perimeter → Save | Zone appears in list | |
| 8 | Add a second zone | Both zones visible | |
| 9 | Edit zone 1 name | Name updates | |
| 10 | Navigate to Manifest Engine | Both zones appear in zone selector | |
| 11 | Select project → view manifest | Manifest table renders (may be empty if no materials assigned yet) | |
| 12 | Navigate to Work Orders | Zone steps generated for both zones | |
| 13 | Check off a step | Step marked complete, progress updates | |
| 14 | Export manifest PDF | File downloads, opens correctly, shows project name | |
| 15 | Export crew packet PDF | File downloads, opens correctly, shows zone steps | |
| 16 | Navigate to Price Research | Search field visible | |
| 17 | Enter material type + location → Search | AI results return within 10s | |
| 18 | Repeat same search | Results load instantly from cache | |
| 19 | Navigate to Billing | Plan cards visible, trial status shown | |
| 20 | Navigate to Crew Manager | Crew list visible, Add button functional | |
| 21 | Navigate to Equipment Manager | Equipment list visible | |
| 22 | Navigate to Material Library | Materials list visible, search functional | |
| 23 | Log out | Redirected to login, session cleared | |

---

## Agentic Testing (Future)

The goal is to run Tier 1 automatically using browser automation on every sprint completion. Two paths:

### Path A — Claude in Chrome (available now)
When Chrome is connected, I can navigate to localhost and run the core workflow test programmatically — clicking buttons, filling forms, checking that expected elements appear. No setup required beyond Chrome being open and connected. Ask me to "run the automated test" and I'll execute the Tier 1 script.

### Path B — Playwright (Sprint 5 candidate)
Install Playwright (`npm install -D playwright`) and write persistent test scripts in `tests/e2e/`. These run headlessly, integrate with CI, and produce a test report. Worth adding once the core workflow is stable enough that the tests won't need constant updating.

---

## How to Update This File
After each sprint, add a new section to SPRINT_FINDINGS.md with what was tested and what was found. Update the Regression Checks table if a new bug is fixed. Update the Core Workflow table if the workflow changes (new steps, removed steps).
