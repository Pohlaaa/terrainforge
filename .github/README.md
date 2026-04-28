# GitHub Actions — Setup

Three workflows live in `.github/workflows/`. They run automatically once
the repository secrets are configured. Until secrets are set, the E2E and
materials-accuracy jobs are auto-skipped (they don't fail).

## Workflows

| File | Trigger | What runs | Wall-clock |
|---|---|---|---|
| `pr-checks.yml` | every PR + push to main | tsc, vitest, lint, build, perf budget, walkthrough + rpc-negative E2E | ~10 min |
| `nightly.yml` | daily 07:00 UTC | materials-accuracy harness (full 30 scenarios), bundle trend | ~20 min |
| `pre-deploy.yml` | manual only | everything from pr-checks + materials-accuracy | ~30 min |

All three are **warn-only** today — they post status but don't block merges.
Promote any of them to a required-status check via GitHub UI →
Settings → Branches → Branch protection rules.

## Required secrets

Set in GitHub: **Settings → Secrets and variables → Actions → Repository secrets**.

| Secret | Used by | Notes |
|---|---|---|
| `E2E_EMAIL` | pr-checks, pre-deploy | Test contractor account email (the one in your `.env.e2e`) |
| `E2E_PASSWORD` | pr-checks, pre-deploy | Same account's password |
| `E2E_SUPABASE_URL` | pr-checks, pre-deploy | `https://axasujjoywqadzuisvaj.supabase.co` (or your project URL) |
| `E2E_SUPABASE_ANON_KEY` | pr-checks, pre-deploy | Supabase anon key for the project |
| `E2E_ANTHROPIC_KEY` | nightly, pre-deploy | Anthropic API key — burns ~$1/night on the harness |

## Optional repository variables

Set in GitHub: **Settings → Secrets and variables → Actions → Variables**.

| Variable | Default | Notes |
|---|---|---|
| `E2E_BASE_URL` | `https://terrainforge-staging.netlify.app` | Override only if you point CI at a different deploy |

## Disabling a workflow

Two ways:

1. **Per-workflow**: Settings → Actions → Workflows → click workflow → ⋯ menu → Disable.
2. **Per-file**: rename the `.yml` to `.yml.disabled` (or delete the file). The
   nightly cron is the most likely candidate to disable if you don't want
   ~$1/night of Anthropic credits being spent automatically.

## How this matches the testing plan

The testing plan (`.claude/TESTING/PLAN.md`) calls for "A-level testing"
— light-touch, run-when-asked. These workflows give you that button:

- `pr-checks.yml` runs on its own but is non-blocking — failures show up as
  red but you can still merge.
- `nightly.yml` is opt-in via `E2E_ANTHROPIC_KEY`; if you don't set the
  secret, the accuracy job is skipped automatically.
- `pre-deploy.yml` is fully manual — only runs when you click "Run workflow".

If you want stricter behavior later (block merges on CI failure), promote
`pr-checks.yml` to a required check in branch protection. Nothing in this
setup forces you to do that yet.
