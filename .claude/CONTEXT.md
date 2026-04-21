# TerrainForge — Persistent Context

> **What this file is.** The human layer that CLAUDE.md doesn't cover: partner preferences, project vision, operational choices, and triggers that should influence every session. CLAUDE.md is code rules; this is project reality.
>
> **Audience.** Future-Claude (and future-Charlie after another VSCode session wipe). Read this alongside CLAUDE.md at the start of every session.
>
> **Last synced:** 2026-04-21 (after the stabilization sweep). Edit freely when context shifts.

---

## Project vision

TerrainForge's killer feature is a **3D client-facing design app**. The landscaping
contractor SaaS that exists today (projects, materials engine, scheduling, crew) is
foundation — it's what a contractor uses to capture real measurements and materials,
which then feed the 3D view a client sees.

Don't treat the current code as the product. Treat it as infrastructure for the 3D app.
When in doubt about a feature, ask: does this bring us closer to "contractor captures
element → client sees 3D render → client approves → contractor ships manifest"?

See `.claude/ERD.md` "Extension points for the 3D design app" for the schema-level
roadmap. The `project_elements` + `project_element_materials` tables are already ~90%
of what the 3D app needs as an ingestion layer.

---

## Where the project actually is (reality check)

- **No real clients.** "Production" means Charlie's partner tests it in his browser.
- **Data is wipeable.** The 22 orgs / 17 projects / 555 schedule entries / 68 materials
  in Supabase are disposable test fixtures. Never get precious about preserving them.
- **Frontend deploy is manual.** Charlie rebuilds locally (`npm run build`) and
  drag-deploys `dist/` to Netlify. **Netlify is NOT connected to git.** Commits don't
  trigger builds. Partner sees whatever Charlie last dragged, which may be days behind
  `main`.
- **Supabase schema is the source of truth.** Prefer querying live schema over trusting
  migration files; migrations 021-026 were applied via the SQL editor and don't all
  show up in `supabase_migrations.schema_migrations` (only 019, 020, 027 registered
  through the CLI / MCP).
- **Supabase is on the Free plan.** Some features (HIBP leaked-password protection,
  branching, PITR) are Pro-only. See "Triggers" below.

---

## Partner / operator preferences (Charlie)

Observed over the Apr 16-21 sessions; update as they shift.

- **Commit strategy**: decisive over artisanal. "Just do it" unless the risk is
  destructive. Will approve large fat commits if the narrative is clear; no interest
  in hunk-level splitting just for history aesthetics.
- **Scope pressure**: pushes for "everything else" — wants momentum. Counter by being
  explicit about what's in/out of scope and surfacing deferrals.
- **Testing posture**: happy to let Claude Opus 4.6 do invasive work (schema changes,
  mass refactors) when data isn't precious. Expects verification after (re-run
  advisors, typecheck, build).
- **Netlify auto-deploy**: offered multiple times, declined each. Charlie prefers
  manual control of "when partner sees the new code." Don't push it again.
- **Sessions**: VSCode sessions disappeared once; archives recovered at
  `~/.claude/projects/c--Users-PohlaDesk-Documents-AI-Terrain-Forge/`. If context is
  ever lost again, there are 42+ transcripts there spanning 2026-03-30 → 2026-04-10.

---

## Hard decisions locked in this session

- **WorktreeCreate hook is active** (`~/.claude/settings.json`). Agents cannot silently
  spawn `.claude/worktrees/*` isolated directories. If an agent tries, the hook emits
  `{"continue": false}`. If you need a real worktree, commit WIP first and create it
  manually. This prevents a repeat of the "72 uncommitted files invisible to the agent"
  situation we just dug out of.
- **Git = source of truth for code.** After Apr 17, `main` matches production code.
  Anything uncommitted is drift; commit or stash before starting work.
- **Migration 027 hardening applied.** All 88 RLS policies now wrap `auth.*()` in
  subselects, 12 FK indexes added, 28 unused indexes dropped, 10 functions pinned with
  `search_path`, `audit_log` INSERT tightened. Re-run the Supabase advisors via MCP
  before assuming anything is slow or broken.
- **6-step wizard is canonical.** The old 9-step WizardStep1-7 flow is gone. The new
  steps are Job → Measurements → Plan → Materials → Numbers → Summary. `WizardStep3.tsx`
  orphan was deleted.
- **Materials engine is the manifest source of truth.** `src/lib/manifest.ts` wraps
  `computeElementMaterial()` from `src/materials-engine/` and falls back to legacy
  zone quantities only when `computationModel` is unset. Six models: AREA_COVERAGE,
  UNIT_COVERAGE, LINEAR, POINT_SPACING, LINEAR_DEPTH, SUBSTRATE.

---

## Known quirks (save yourself an hour)

- **Migration 009 is missing on disk** but referenced in CLAUDE.md (org_shortcode
  stuff). Whatever 009 did, it was applied manually to prod and not committed. A fresh
  Supabase would miss it — reconstruct from live schema if you ever need to re-provision.
- **`project_materials` table exists but is redundant** with the `projects.materials`
  JSONB column. The engine reads the JSONB. Deferred drop in a future migration.
- **Zone legacy tables** (`zones`, `zone_materials`, `zone_equipment`) still referenced
  by `src/lib/workorders.ts` `generateSteps()`. Can't drop them until that function is
  ported to elements.
- **`manifests` table exists but nothing writes to it.** Snapshots feature scaffolded
  by migration 026, never wired. Opportunity: status-transition hook writes a
  snapshot on `approved` → `scheduled`.
- **`dependent_material_ids` column on materials is empty everywhere.** Feature
  scaffolded, catalog populated with `[]` for everything. Low priority to populate.
- **`src/pages/Schedule.tsx`, `CrewManager.tsx`, `EquipmentManager.tsx` are gone.** Any
  future work that references them is outdated. The schedule UI lives in
  `CrewEquipmentHub.tsx` and project-dashboard Tasks/Resources tabs.
- **The Anthropic API key is browser-side** (`VITE_ANTHROPIC_API_KEY` with
  `anthropic-dangerous-direct-browser-access: true`). Fine for partner-test, not for
  real contractors. Trigger: before first real contractor signs up, proxy through a
  Supabase Edge Function.
- **`src/index.ts` barrel export exists but nothing imports from it.** Kept for
  possible future library mode. Don't add exports to it without a consumer.

---

## Triggers / reminders (things to do at specific future moments)

| When this happens | Do this |
|---|---|
| Before first real contractor signs up | Upgrade Supabase to Pro ($25/mo org), flip HIBP leaked-password toggle in Auth settings. Move `VITE_ANTHROPIC_API_KEY` server-side via Supabase Edge Function. |
| After 10+ real orgs or any real client data lands | Re-run Supabase performance advisors (`get_advisors type=performance`). 28 unused indexes were dropped in mig 027; some may need to be re-added based on real query patterns. |
| Before committing work that touches `project_elements` dimensions | Remember the 3D app needs `position_x/y`, `rotation_deg` added next — prefer a JSONB `geometry` column so we don't churn migrations. |
| When touching wizard step order | The flow is Job → Measurements → Plan → Materials → Numbers → Summary. The AI fires after Step 0 and feeds Plan/Materials/Numbers. Don't reorder without thinking about the AI dependency. |
| When adding a new Supabase table | RLS SELECT/INSERT/UPDATE/DELETE policies from day one. Wrap every `auth.*()` call in `(select auth.uid())` — the migration 027 pattern. Add `org_id` FK with an index. |
| After wipe-and-reseed | Remember that migration 009 is missing on disk. Apply migrations 001-027 in order; 009 will be skipped. Reconstruct 009 from live schema (likely `organizations.shortcode` column + trigger). |

---

## Session workflow shortcuts

- **Start of session**: read `CLAUDE.md`, `.claude/CONTEXT.md` (this file), `.claude/ROADMAP.md`.
  Skim `.claude/TESTING/FINDINGS.md` and the newest `.claude/feedback/v*.md`.
- **Before a DB change**: query live state via Supabase MCP. The migration files are
  not fully authoritative.
- **Before a migration**: number it correctly (next is 028), apply via the
  `apply_migration` MCP so it registers in the schema_migrations table, re-run advisors
  after.
- **Before committing code**: `npx tsc --noEmit` + `npm run build`. Both need to be
  green.
- **Before declaring anything "done"**: if it's user-facing, open Claude Preview (or
  the Chrome MCP) and actually click through the flow. The audit flagged multiple
  items that pass typecheck but break visibly in-browser.

---

## What's in other docs

- **`CLAUDE.md`** — the master. Product identity, tech stack, architecture, naming
  conventions, what NOT to do, current status. Load every session.
- **`.claude/ARCHITECTURE.md`** — store boundaries, data flow, layout, fetch patterns,
  page composition. The north star for code structure.
- **`.claude/CODE_GUIDE.md`** — execution workflow, git conventions, verification.
- **`.claude/DESIGN_SYSTEM.md`** — design tokens, color system, component specs.
- **`.claude/ERD.md`** — live DB schema reference (refresh against Supabase when stale).
- **`.claude/ROADMAP.md`** — what's next, consolidates all contractor feedback + audit.
- **`.claude/feedback/v*.md`** — raw contractor feedback rounds, for provenance.
- **`.claude/TESTING/FINDINGS.md`** — historical bug log.
- **`.claude/TESTING/PROTOCOL.md`** — test methodology.
- **`.claude/business/*`** — strategic/marketing context, not session-default reading.
- **`.claude/archive/*`** — completed sprints and superseded docs, kept for provenance.
