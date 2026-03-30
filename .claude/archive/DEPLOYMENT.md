# TerrainForge — Deployment & Infrastructure

## Infrastructure Philosophy
Start as cheap as possible. Netlify + Supabase free tiers can support the first 20–30 customers without any cost. Scale only when a tier limit is actually hit, not in anticipation.

## Current Stack
| Layer | Service | Tier | Cost |
|---|---|---|---|
| Frontend hosting | Netlify | Free (100GB bandwidth) | $0 |
| Database + Auth | Supabase | Free (500MB, 50k MAU) | $0 |
| File storage | Supabase Storage | Free (1GB) | $0 |
| Domain | Custom (terrainforge.io or similar) | ~$12/yr | ~$1/mo |
| **Total** | | | **~$1/mo** |

## Environments
Three environments, all pointing to different Supabase projects:

| Environment | URL | Supabase Project | When to Use |
|---|---|---|---|
| **Local dev** | localhost:3000 | dev project | Daily development |
| **Staging** | staging.terrainforge.io | staging project | Pre-release testing, demo to pilots |
| **Production** | app.terrainforge.io | production project | Live customers |

Never test against production. Never run migrations against production without testing on staging first.

## Environment Variables
```
# Required for all environments
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Required for billing
VITE_STRIPE_PK=

# Required for AI features
VITE_ANTHROPIC_API_KEY=

# Analytics (production only)
VITE_POSTHOG_KEY=
VITE_SENTRY_DSN=
```

Variables are set in:
- Local: `.env.local` (never committed)
- Staging/Production: Netlify environment variable settings in the dashboard

## Netlify Configuration
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18
- Add `_redirects` file in `public/`: `/* /index.html 200` (required for React Router)

## Supabase Migration Process
1. Write SQL in `supabase/migrations/[NNN]_description.sql`
2. Test locally against dev project via Supabase dashboard SQL editor
3. Apply to staging, test for 24h
4. Apply to production during low-traffic window
5. Update `supabase/README.md` with schema changes

Current migration: `001_initial_schema.sql` — run and live in dev Supabase project (15 tables, 55 RLS policies active). Staging and production not yet deployed.

## Scaling Triggers
Take action when these thresholds are hit (not before):

| Metric | Threshold | Action |
|---|---|---|
| Supabase DB size | >400MB | Upgrade to Supabase Pro ($25/mo) |
| Supabase MAU | >40,000 | Upgrade to Supabase Pro |
| Netlify bandwidth | >80GB/month | Upgrade to Netlify Pro ($19/mo) |
| Paying customers | >50 | Add Redis caching layer for AI responses |
| Paying customers | >200 | Evaluate dedicated DB connection pooling |

## Pre-Deployment Checklist
Before any production deploy:
- [ ] `npm run build` passes with no errors
- [ ] All new env vars added to Netlify dashboard
- [ ] Supabase migrations run on staging first
- [ ] RLS policies tested with 2+ accounts (tenant isolation confirmed)
- [ ] Stripe webhook endpoints updated if billing changed (Sprint 3 adds webhook handlers)
- [ ] No API keys or secrets in the codebase (`git grep -i "sk-ant\|supabase\|stripe_sk"`)

## Rollback Strategy
Netlify keeps the last 25 deploys. If a production deploy breaks something:
1. Go to Netlify dashboard → Deploys → find the last good deploy
2. Click "Publish deploy" to instant-rollback
3. Investigate the issue on staging before redeploying

## Custom Domain Setup
1. Buy domain (Namecheap recommended for cost)
2. Add custom domain in Netlify: `app.terrainforge.io`
3. Marketing site: `www.terrainforge.io` (already deployed on Netlify)
4. Update Supabase Auth allowed redirect URLs to include production domain

## Performance Budget
- Initial JS bundle: <500KB gzipped
- Largest contentful paint: <2.5s on 4G
- Time to interact