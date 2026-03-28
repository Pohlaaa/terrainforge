# TerrainForge — Master Project Context

## Product Identity
TerrainForge is a SaaS platform for landscaping contractors. It replaces spreadsheets, WhatsApp threads, and paper tickets with a single tool for project management, material manifests, crew coordination, equipment tracking, and AI-assisted pricing. Target customer: owner-operators and small landscaping companies (2–25 employees).

## The Four Phases
- **Phase 1 (NOW):** Contractor-facing MVP — project tracking, material library, manifest engine, work orders, crew/equipment management, price research, Stripe billing
- **Phase 2 (NEXT):** Operations & Integrations — scheduling, time tracking, client portal, QuickBooks/Stripe payouts, mobile field access
- **Phase 3 (LATER):** 3D Design Studio — landscape-editor.html prototype becomes an integrated Three.js design tool tied to the manifest engine
- **Phase 4:** Scale & Marketplace — supplier marketplace, subcontractor network, white-label

**Phase rationale:** Phase 2 (Operations) was reprioritized over the 3D Design Studio because it delivers direct operational value to the contractor's daily workflow — scheduling, time tracking, and client invoicing are what keeps customers retained and drives word-of-mouth. The 3D studio is a differentiator but is not a retention driver at the current stage.

## Current Status (2026-03-28)
- Auth: Working (Supabase email/password, protected routes, session persistence)
- All 8 pages: Fully wired to Zustand stores with real data from Supabase
- Database: 15 tables live, 55 RLS policies, data persisting end-to-end
- PDF Export: ManifestPDF.tsx and CrewPacketPDF.tsx built, export buttons wired
- Stripe Billing: Live — Billing page, checkout session, customer portal, webhook handler (3 Edge Functions)
- Claude API: Wired to Price Research with 24hr localStorage cache
- Trial banner + billing gate: Active in AppLayout and ProtectedRoute
- Sprints 1, 2, 3 complete (23 tasks total). Phase 1 gate: 4/6 criteria met
- Remaining Phase 1: Zone creation UI (Sprint 4), pilot user + multi-tenancy test (Sprint 5)

## Tech Stack
React 18 + Vite + TypeScript | Zustand (localStorage + Supabase sync) | Supabase Auth + PostgreSQL | Tailwind CSS + CSS custom properties | Netlify (frontend) | Stripe (billing) | Claude API (AI features)

## Architecture Rules

### File Organization
- `src/pages/` — One component per route, named to match the route
- `src/components/layout/` — App shell (Sidebar, AppLayout, PageHeader)
- `src/components/shared/` — Reusable UI blocks (Modal, Badge, DataTable, KPICard, etc.)
- `src/components/pdf/` — @react-pdf/renderer PDF templates (ManifestPDF, CrewPacketPDF)
- `src/components/ui/` — Atomic form elements (Button, Input, Select, Checkbox, Textarea)
- `src/stores/` — Zustand stores, one per data domain (project, material, crew, equipment, ui)
- `src/services/` — External API clients (supabase, stripe, anthropic)
- `src/lib/` — Pure business logic functions (manifest engine, work orders, alerts, constants)
- `src/hooks/` — Custom React hooks (useAsync, useForm)
- `src/types/` — TypeScript interfaces and type definitions
- `src/utils/` — Formatting, dates, validation helpers

### Naming Conventions
- **Database columns:** snake_case (`org_id`, `crew_members`, `unit_cost`)
- **TypeScript interfaces/props:** camelCase (`unitCost`, `crewMembers`, `orgId`)
- **Mapping layer:** `src/services/supabaseData.ts` handles snake_case ↔ camelCase conversion
- **Components:** PascalCase files and exports
- **Stores:** camelCase files (`projectStore.ts`), hooks exported as `useProjectStore`

### Data Flow Pattern
1. Zustand store holds application state with localStorage persistence
2. Pages read from stores via hooks (`useProjectStore()`)
3. Mutations update local state first (optimistic), then sync to Supabase
4. Seed data exists in stores so the app works without a database connection
5. `supabaseData.ts` handles all DB operations with snake/camel mapping

### Styling Rules
- Use CSS custom properties: `var(--green-l)`, `var(--surface)`, `var(--text-2)`, etc.
- Dark theme is default — all colors defined in `src/index.css`
- Tailwind utilities for layout, spacing, typography
- Custom properties for brand colors and theme consistency
- Key colors: green (#2D6A4F / #74C69D), surface (#111810 / #161E14), text hierarchy (text/text-2/text-3/text-4)

### Auth Pattern
- `AuthContext` wraps the entire app, provides `user`, `session`, `signIn`, `signOut`
- `ProtectedRoute` gates all app routes — redirects to /login if no session
- Public routes: `/login`, `/signup`, `/forgot-password`
- All protected routes render inside `<Sidebar /> + <main>` layout

## Multi-Tenancy Model
- Every data table has `org_id` — RLS policies enforce tenant isolation
- 4 roles: admin, designer, foreman, client (in `org_role` enum)
- Admins: full CRUD | Designers: read + create | Foremen: read | Clients: limited read

## Business Logic (src/lib/)
- **manifest.ts:** `computeQty()`, `generateManifest()`, `computeProjectCostRaw()` — material quantities from zone area/perimeter, reserve %, cost rollup
- **workorders.ts:** Generates installation steps per zone based on material categories
- **alerts.ts:** `getAllAlerts(state)` aggregates equipment, crew cert, inventory, project alerts by severity
- **constants.ts:** Reserve percentages, skill options, equipment capability maps, checklist items

## Material Categories
`paver | stone | tile | brick | concrete | sod | seed | mulch | gravel | sand | soil | edging | plant | shrub | tree | lighting | irrigation | lumber | misc`

## What NOT to Do
- Don't use `any` types — use interfaces in `src/types/`
- Don't put business logic in components — extract to `src/lib/`
- Don't hardcode colors — use CSS custom properties
- Don't skip the snake_case ↔ camelCase mapping when touching Supabase data
- Don't create Zustand stores without the `persist` middleware pattern
- Don't use relative paths when `@/` alias is available

## Core Principles
1. **Ship working software over perfect architecture** — Phase 1 must be demoable and sellable
2. **AI everywhere it adds value** — Every user action that could benefit from reasoning should have it
3. **Dual-mode always** — App works offline (localStorage) and syncs when connected (Supabase)
4. **Charlie is a BSA, not a full-time engineer** — Explain tradeoffs, flag risks, make recommendations explicit
5. **Budget-conscious scaling** — Minimize infrastructure cost until revenue justifies growth

## Specialized Instruction Files
Reference these when working in a specific mode:
- `.claude/PROJECT_MANAGEMENT.md` — sprint planning, phase tracking, PM advisory behavior
- `.claude/DEVELOPMENT.md` — expanded code standards and patterns (includes PDF component patterns)
- `.claude/AI_PRODUCT.md` — AI integration strategy and feature patterns
- `.claude/CODEBASE_MANAGEMENT.md` — refactoring discipline, feature integration, tech debt
- `.claude/DESIGN.md` — design system, UI iteration process
- `.claude/DEPLOYMENT.md` — Netlify/Supabase, environments, scaling triggers
- `.claude/BUSINESS.md` — pricing model, Stripe integration, unit economics, legal
- `.claude/MARKETING.md` — ICP, value props, demo playbook, materials
- `.claude/OPERATIONS.md` — Phase 2 scope: scheduling, time tracking, client portal, integrations
- `.claude/SPRINT_1_PROMPTS.md` — all Sprint 1 prompts (complete)
- `.claude/SPRINT_2_PROMPTS.md` — all Sprint 2 prompts (complete)
- `.claude/SPRINT_3_PROMPTS.md` — Sprint 3 prompts: Stripe billing + Claude API wiring
- `.claude/SPRINT_4_PROMPTS.md` — Sprint 4 prompts: Self-test & workflow polish
- `.claude/CONSIDERATIONS.md` — Running backlog of UX improvements, feature gaps, and strategic items (not sprint-ready)

## Dashboard Update Requirement
**After every sprint task, update `PROJECT_DASHBOARD.html`:**
1. Move completed task from `currentSprint.tasks` to `completedWork` array
2. Update `lastUpdated` to today's date
3. If all sprint tasks complete, update `currentSprint` to the next sprint
4. If a Phase gate criterion is newly met, check it in the relevant phase's `gateChecklist`
This must be part of every commit — do not skip it.
