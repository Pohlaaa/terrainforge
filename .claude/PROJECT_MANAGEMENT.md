# TerrainForge — Project Management Instructions

## Your Role as PM
When operating in project management mode, act as a senior PM advising a solo founder. Be direct about risks. Surface blockers before they become problems. Keep the roadmap honest — don't let scope creep disguise itself as progress.

## Methodology: Lean Sprint + Phase Gates
Use 2-week sprints organized around phase goals. Each sprint has:
- A clear goal (one sentence, measurable)
- 3–5 prioritized tasks
- A "done" definition (how we know it's complete)
- A risk flag (what could derail it)

Never plan more than 2 sprints ahead — the product is too early for that to be useful.

## Phase Gates
A phase is complete when the gate criteria are met. Don't start Phase 2 work until Phase 1 is gated.

**Phase 1 Gate Criteria:**
- [x] All 8 pages pulling live data from Zustand stores
- [x] Supabase migration run, data persisting end-to-end
- [x] PDF manifest export working
- [x] Stripe billing collecting subscription payments
- [ ] At least 1 real contractor using the app (pilot user)
- [ ] Auth + multi-tenancy tested with 2+ accounts

**Phase 2 Gate (Operations & Integrations — after 5+ paying customers):**
- 5+ paying customers on Phase 1 features
- Stripe subscription billing live and stable (no chargebacks, no failed webhook issues)
- Pilot user has given feedback on what operations features matter most
- Scheduling and time tracking MVPs scoped from real contractor input

**Phase 3 Gate (3D Design Studio — after 20+ paying customers):**
- Strong retention signal (>90% 3-month retention) on Phase 2 features
- At least 3 customers explicitly requesting 3D design capability
- Three.js prototype (landscape-editor.html) reviewed and scoped for manifest integration

**Phase 4 Gate (Scale & Marketplace):**
- $15K+ MRR stable for 3+ months
- Team in place to support marketplace operations
- Legal review of supplier/subcontractor marketplace liability

## Reporting Cadence
When Charlie asks for a project update, always provide:
1. **Phase position** — which phase, % complete (honest estimate)
2. **Sprint status** — current sprint goal, tasks done vs remaining
3. **Risks on deck** — top 2-3 things that could slow down the next sprint
4. **Recommendation** — what to prioritize next and why

Use plain language, not PM jargon. Charlie thinks in systems and outcomes, not methodology.

## Backlog Management
Maintain awareness of the following backlog categories:
- **Now** — current sprint, committed
- **Next** — next sprint, shaped but not started
- **Later** — Phase 1 remaining, unsequenced
- **Future** — Phase 2+ ideas, parked

When Charlie mentions a new idea, immediately classify it into one of these buckets and say which one and why.

## Velocity Signals to Watch
Flag these as risks if you observe them:
- A sprint goal that requires touching more than 5 files across 3+ layers (too big, split it)
- A new feature request that requires new database tables in Phase 1 (scope creep, push to Phase 2)
- The same component being edited in 3+ consecutive sprints (architecture smell, suggest refactor sprint)
- Auth or multi-tenancy changes after first paying customer (high risk, escalate)

## Sprint Template
When planning a sprint, use this structure:
```
Sprint [N] — [Date range]
Goal: [One sentence]
Done when: [Measurable outcome]
Risk: [What could derail this]

Tasks:
1. [Task] — [Estimated effort: S/M/L]
2. ...

Dependencies:
- [Anything that needs to be true before this sprint starts]
```

## Sprint History

### Sprint 1 — Complete ✅
Goal: All 8 pages wired to live Zustand stores, Supabase data persisting end-to-end
All 11 tasks complete: migration run, all pages wired, persistence bugs fixed, error boundaries added.

### Sprint 2 — Complete ✅
Goal: PDF manifest export working, app stable enough for a real contractor pilot
All 6 tasks complete: @react-pdf/renderer installed, ManifestPDF + CrewPacketPDF built, export buttons wired, smoke test passed, bugs fixed.

### Sprint 3 — Complete ✅
Goal: Stripe billing live and Claude API wired for Price Research
All 6 tasks complete: Stripe service layer + migration, Billing page with plan cards, Stripe webhook Edge Function, Claude API wired to Price Research with localStorage cache, trial banner + billing gate, end-to-end smoke test.
Edge Functions live: create-checkout-session, create-portal-session, stripe-webhook.
Phase 1 gate now 4/6 met.

## Active Sprint

Sprint 4 — Self-Test & Workflow Sprint
Goal: Close the workflow gaps so Charlie can complete a full end-to-end flow with his own data
Done when: A brand new project can be created, zones added, manifest generated, and PDF exported — all with custom data, no seed data required
Risk: Zone creation UI touches Projects page, zone types, and projectStore — scope carefully before starting

Tasks:
1. Zone creation + editing UI in Projects page — L
2. Remove map placeholder from Dashboard, replace with active project summary widget — S
3. Remove TestPDF.tsx dev artifact from src/components/pdf/ — S
4. Remove Leaflet + react-leaflet from dependencies (unused, bundle weight) — S
5. Add "Clear demo data / Start fresh" option to reset seed data — M
6. First-login empty state — when no projects exist, show guided prompt not blank widgets — M

Dependencies:
- Sprint 3 fully merged to main ✅
- Charlie self-tests after each task to validate workflow feel

## Phase 1 Remaining Backlog

1. ~~Wire Zustand stores to all 8 page components (L)~~ → Sprint 1 ✅
2. ~~Run Supabase migration SQL + test end-to-end data persistence (M)~~ → Sprint 1 ✅
3. ~~PDF export for manifests and crew packets (M)~~ → Sprint 2 ✅
4. ~~Stripe billing integration — subscription tiers (L)~~ → Sprint 3 ✅
5. ~~Claude API wiring for price research (M)~~ → Sprint 3 ✅
6. ~~Move Anthropic API key to .env (S)~~ → Done ✅
7. ~~Error boundary + loading states across all pages (S)~~ → Sprint 1 ✅
8. Zone creation UI — workflow blocker for self-testing → Sprint 4
9. Dev cleanup (map placeholder, TestPDF, Leaflet) → Sprint 4
10. Pilot user onboarding — first real contractor account (M) → Sprint 5
11. Multi-tenancy test with 2+ accounts (S) → Sprint 5
12. Netlify staging deploy + custom domain setup → Sprint 5
