# Performance budget — Sprint P

Bundle-size targets + observed values for the TerrainForge frontend.
Updated after Sprint P (commit pending). Compare future builds against
these numbers; if a chunk exceeds its budget, the change must justify
the cost (or split further).

## Initial-paint budget (eager chunks)

These chunks load on first paint. Total wall-clock JS download +
parse time on a 4G connection should target < 1 second.

| Chunk | Before Sprint P | After Sprint P | Budget | Notes |
|---|---|---|---|---|
| `index-*.js`           | 2,681 KB | **519 KB** | ≤ 600 KB | App shell + Dashboard + auth pages |
| `vendor-react-*.js`    | bundled | **163 KB** | ≤ 200 KB | react + react-dom + react-router-dom |
| `vendor-supabase-*.js` | bundled | **194 KB** | ≤ 250 KB | @supabase/supabase-js + auth helpers |
| **Eager total**         | **2,681 KB** | **876 KB** | **≤ 1,050 KB** | 67% reduction |
| **Eager gzip total**    | ~830 KB  | ~252 KB    | ≤ 320 KB    | What the browser actually downloads |

## Lazy chunks (load on demand)

These chunks load when the corresponding route, component, or feature
mounts. Their size matters for the *second* paint experience —
contractor opens a project → ProjectDashboard chunk loads → first paint
of the project page.

| Chunk | Size | Triggered by | Budget |
|---|---|---|---|
| `ProjectDashboard-*.js`     | 128 KB | route `/projects/:id` | ≤ 200 KB |
| `ProjectWizard-*.js`        | 109 KB | route `/projects/wizard` | ≤ 150 KB |
| `BudgetHub-*.js`            |  54 KB | route `/budget` | ≤ 100 KB |
| `MaterialLibrary-*.js`      |  52 KB | route `/materials` | ≤ 100 KB |
| `Onboarding-*.js`           |  47 KB | route `/onboarding` | ≤ 100 KB |
| `Landing-*.js`              |  38 KB | unauth root | ≤ 80 KB  |
| `CrewEquipmentHub-*.js`     |  30 KB | route `/crew-hub` | ≤ 80 KB  |
| `Settings-*.js`             |  24 KB | route `/settings` | ≤ 80 KB  |
| `WorkOrders-*.js`           |  22 KB | route `/work-orders` | ≤ 80 KB |
| `PriceResearch-*.js`        |  17 KB | route `/price-research` | ≤ 80 KB |
| `SharedProjectView-*.js`    |  14 KB | route `/share/:token` | ≤ 80 KB |
| `CrewJobDetail-*.js`        |   8 KB | route `/crew/job/:id` | ≤ 50 KB |
| `CrewDashboard-*.js`        |   5 KB | route `/crew` | ≤ 50 KB |

## Heavy library chunks

These are libraries we'd love to be smaller but where there's no
clear lever short of swapping out the dependency entirely. Each is
already in its own named chunk so it caches independently across
deploys, and each is loaded on demand (never on first paint).

| Chunk | Size | Loaded by | Notes |
|---|---|---|---|
| `mapbox-gl-*.js`  | 1,703 KB | PlanView2D + PlanView3D       | Required for satellite backdrop. Considered alternatives: MapLibre GL (slightly smaller but loses Mapbox tile services), Leaflet (much smaller but no 3D). Sticking with Mapbox; it's good enough and only loads on canvas mount. |
| `vendor-pdf-*.js` | 1,573 KB | MaterialsTab + WorkOrders     | @react-pdf/renderer. Used for proposal + manifest PDFs. Heavyweight but defers correctly to its consumer routes. Future: server-side render via Edge Function. |
| `PlanView3D-*.js` |   898 KB | OverviewTab + WizardStep2 + SharedProjectView | three.js + @react-three/fiber + @react-three/drei. Loads only when a 3D-capable view mounts. Would be reduced if we replaced TransformControls or stripped unused drei modules; tracked in the 3D primitives sprint backlog. |
| `vendor-stripe-*.js` | varies | Billing | Stripe.js. Loaded only when /billing route renders. |

## Manual chunks strategy (vite.config.ts)

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-stripe':   ['@stripe/stripe-js'],
        'vendor-pdf':      ['@react-pdf/renderer'],
      },
    },
  },
  chunkSizeWarningLimit: 1024,
},
```

The choice of which packages to pull out into `vendor-*` chunks is
about **deploy cache invalidation**, not initial-paint size. React,
Supabase, Stripe, and PDF are all stable across our weekly deploys —
splitting them means a Sprint A change ships a fresh `index-*.js`
without re-busting the 1.5 MB PDF chunk (or the others).

The mapbox-gl chunk is split implicitly by Vite because it's only
imported by lazy-loaded routes (PlanView2D / PlanView3D). Same for
PlanView3D itself.

## How to re-audit

```
npm run build
ls -la dist/assets/ | sort -rn -k 5
```

The Vite output also prints chunk sizes (with gzip) at the end of
every build. CI could enforce this by parsing the build log; we
don't gate on it today.

## Lighthouse expectations (mobile, simulated 4G)

Not yet automated. Manual baseline + post-Sprint-P targets:

| Metric | Pre-Sprint-P | Post-Sprint-P target |
|---|---|---|
| Performance score | ~50 | ≥ 75 |
| First Contentful Paint | ~3.5 s | ≤ 1.8 s |
| Largest Contentful Paint | ~5.0 s | ≤ 2.5 s |
| Total Blocking Time | ~600 ms | ≤ 200 ms |

(Run via Chrome DevTools → Lighthouse → Mobile, simulated 4G,
incognito to avoid extension noise.)

## What's NOT in scope for Sprint P

- **Bundle the auth pages** (Login, Signup, ForgotPassword, AuthCallback,
  ResetPassword). They're still eager on the index chunk because they're
  the first-paint fallback for unauthenticated visitors. Adding lazy
  here trades 5–10 KB of bundle for a noticeable flash of blank screen
  on `/login`.
- **Preload hints**. Vite doesn't add `<link rel="modulepreload">` for
  lazy chunks by default; we'd need a Vite plugin. Considered
  premature; revisit if real-world TTI is poor.
- **Image audit**. Few raster images in the app — Mapbox satellite tiles
  are the main raster asset and they're served by Mapbox CDN, out of
  our bundle.
- **CSS code-splitting**. Tailwind already tree-shakes; the 92 KB CSS
  chunk is shared across all pages and gzip-compressed to ~16 KB. Not
  a meaningful target.
