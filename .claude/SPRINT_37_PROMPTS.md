# Sprint 37 — Landing Page & Production Deploy

> **Goal**: Build a marketing landing page that sells TerrainForge to landscaping contractors, and configure Netlify for production deployment. After this sprint, the app has a public face and is accessible at the production URL.
>
> **Branch**: `sprint-37-landing-page`
> **Design reference**: `.claude/DESIGN_SYSTEM.md` — brand colors, typography
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-37-landing-page --title "Sprint 37: Landing Page & Production Deploy" --body "Marketing landing page at /landing, production Netlify config, meta tags for social sharing."`

---

## CRITICAL CONTEXT

> - The app uses React 18 + Vite + TypeScript + Tailwind CSS
> - Brand color: `#2D6A4F` (green). Dark theme is primary.
> - The landing page should be a SEPARATE route (`/landing` or `/`) that does NOT require authentication
> - Currently, unauthenticated users are redirected to `/login`. The landing page needs to be accessible without auth.
> - The landing page should feel like a polished marketing site, not like the app's UI. It can use the same design tokens but should have its own layout (no sidebar, no icon rail).
> - Pricing tiers from BUSINESS.md: Starter $49/mo, Pro $99/mo, Business $199/mo
> - Value props from MARKETING.md: "Quote faster, waste less", "Your crew knows what to do", "Stop losing money on materials", "Everything in one place"
> - Messaging rules: talk like a contractor (job, crew, quote — not project, team, estimate). Lead with pain, not features.
> - Netlify site ID: `d8efdf00-91f7-4717-aabd-d1c65372a634`
> - Netlify auto-deploy is OFF (build minute budget renews 4/19)

---

## REGRESSION CHECKLIST

> Code must verify these still work after all tasks are complete:
> - [ ] `/login` page still renders and login works
> - [ ] `/signup` page still renders
> - [ ] Authenticated users can still access `/` (Dashboard)
> - [ ] Project wizard at `/projects/wizard` still loads
> - [ ] Crew app at `/crew/login` still loads

---

## S37-1: Landing Page Component

**Problem/Goal**: Create a marketing landing page that converts landscaping contractors into signups. This is the first thing a potential customer sees.

**Current state**: No landing page exists. Unauthenticated users see the login page. The app has no public-facing marketing content.

**Files to create**:
- `src/pages/Landing.tsx` — **NEW FILE** — the full landing page

**Files to modify**:
- `src/App.tsx` — add landing page route, adjust auth redirect logic

**Implementation details**:

### Route Setup (App.tsx)
- Add route: `<Route path="/landing" element={<Landing />} />`
- Unauthenticated users visiting `/` should see the landing page (not redirect to `/login`)
- Authenticated users visiting `/` should see the Dashboard (current behavior)
- `/login` and `/signup` remain accessible directly
- The landing page does NOT use `AppLayout` — it has its own standalone layout

### Landing Page Layout (Landing.tsx)

The page is a single-file component with these sections, scrolling vertically:

**1. Navigation Bar** (fixed top):
- Left: "TerrainForge" logo text in `var(--brand-primary)` (#2D6A4F), bold, 20px
- Right: "Login" and "Start Free Trial" buttons
- "Login" = ghost style, navigates to `/login`
- "Start Free Trial" = primary green button, navigates to `/signup`
- Background: `#0A0A0A` (near-black), height 64px, padding 0 24px
- Sticky on scroll with subtle border-bottom: `1px solid rgba(255,255,255,0.1)`

**2. Hero Section**:
- Full-width, min-height 80vh, dark background (`#0A0A0A`)
- Headline: "Stop losing money on every job." — white, 48px, bold, max-width 720px, centered
- Subheadline: "TerrainForge helps landscaping contractors quote faster, track materials, and keep crews on the same page — all in one app." — `rgba(255,255,255,0.7)`, 20px, max-width 600px, centered
- CTA button: "Start Your Free Trial" — green (#2D6A4F) background, white text, 18px, padding 16px 32px, border-radius 8px, centered below subheadline
- Below CTA: "14 days free. No credit card required." — `rgba(255,255,255,0.4)`, 14px

**3. Pain Points Section**:
- Background: `#111111`
- Section title: "Sound familiar?" — white, 32px, centered
- 3-column grid (stacks on mobile) of pain point cards:
  - Card 1: "Your material lists take 3+ hours per job" / "TerrainForge generates manifests from a project description in minutes. Waste reserve built in."
  - Card 2: "Your crew calls you 5 times a day asking what to do" / "Auto-generated work orders with checklists. Crew checks in from their phone."
  - Card 3: "You have no idea if you're making money until the job is done" / "Real-time budget tracking with margin guidance. Know your profit before you start."
- Card styling: `#1A1A1A` background, `1px solid rgba(255,255,255,0.1)` border, border-radius 12px, padding 32px
- Pain text: `rgba(255,255,255,0.5)`, 16px. Solution text: white, 16px, font-weight 500

**4. Features Section**:
- Background: `#0A0A0A`
- Section title: "Everything you need to run your jobs" — white, 32px, centered
- 2x3 feature grid:
  - "AI Project Setup" — "Describe a job, get a full project plan with tasks, materials, and budget in minutes."
  - "Material Manifests" — "Zone-by-zone material calculations with waste reserve. Export PDF crew packets."
  - "Crew Scheduling" — "Weekly drag-and-drop schedule. Crew sees their day on their phone."
  - "Budget Tracking" — "Quote vs. actual costs. Margin guidance so you price every job right."
  - "Equipment & Fleet" — "Track maintenance, insurance, and which truck is on which job."
  - "Work Orders" — "Auto-generated step-by-step checklists from your project zones."
- Feature cards: icon (use emoji — keep it simple), title (white, 18px bold), description (`rgba(255,255,255,0.6)`, 15px)
- Grid gap: 24px. Max-width: 1000px, centered.

**5. Pricing Section**:
- Background: `#111111`
- Section title: "Simple pricing. Cancel anytime." — white, 32px, centered
- 3-column pricing cards:
  - **Starter** ($49/mo): "For solo operators" — 5 active projects, 1 user, all features
  - **Pro** ($99/mo): "For small companies" — 25 active projects, 5 users, all features, priority support. **Highlighted card** (green border, "Most Popular" badge)
  - **Business** ($199/mo): "For established contractors" — Unlimited projects, 15 users, all features, onboarding call
- Card styling: `#1A1A1A` background, border-radius 12px, padding 32px
- Pro card: `2px solid #2D6A4F` border, "Most Popular" badge in green above card
- Price: white, 40px bold. "/mo" in `rgba(255,255,255,0.5)`, 16px
- Each card has "Start Free Trial" button (same green CTA style)
- Below pricing: "All plans include a 14-day free trial. No credit card required." — centered, `rgba(255,255,255,0.4)`

**6. Footer**:
- Background: `#0A0A0A`, border-top: `1px solid rgba(255,255,255,0.1)`
- Left: "TerrainForge" + "Built for contractors who build." in `rgba(255,255,255,0.4)`
- Right: links to Login, Signup (navigates to `/login`, `/signup`)
- Padding: 40px 24px

### Responsive Behavior
- Desktop: max-width 1200px centered, multi-column grids
- Tablet (<768px): 2-column grids become 1-column for pain points, 2-column for features
- Mobile (<480px): everything single-column, headline 32px, reduced padding

### SEO Meta Tags
Add to `index.html`:
- `<title>TerrainForge — Project Management for Landscaping Contractors</title>`
- `<meta name="description" content="Quote faster, track materials, and keep your crew on the same page. AI-powered project management built for landscaping contractors.">`
- Open Graph tags for social sharing:
  - `og:title` = "TerrainForge — Project Management for Landscaping Contractors"
  - `og:description` = "Quote faster, track materials, and keep your crew on the same page."
  - `og:type` = "website"

**Supabase considerations**: None — static marketing page, no data fetching.

**Self-verification**:
- [ ] `npm run build` passes
- [ ] Landing page component has no TypeScript errors
- [ ] Route `/landing` is defined in App.tsx
- [ ] No circular dependencies introduced

**Acceptance criteria**:
- [ ] Unauthenticated user visiting `/` sees the landing page (not login redirect)
- [ ] Landing page has all 6 sections (nav, hero, pain points, features, pricing, footer)
- [ ] "Start Free Trial" buttons navigate to `/signup`
- [ ] "Login" button navigates to `/login`
- [ ] Page is responsive (stacks correctly on mobile)
- [ ] Authenticated user visiting `/` still sees Dashboard
- [ ] Meta tags present in index.html
- [ ] `npm run build` passes

---

## S37-2: Netlify Production Configuration

**Problem/Goal**: Configure the Netlify deployment for production readiness. Ensure SPA routing works, redirects are correct, and headers are set.

**Current state**: App deploys to Netlify but auto-deploy is OFF. Site exists at terrainforge-staging.netlify.app. No `_redirects` or `netlify.toml` configured for SPA routing.

**Files to create**:
- `public/_redirects` — **NEW FILE** — Netlify SPA redirect rule

**Files to modify**:
- `netlify.toml` (if it exists at project root, otherwise create) — build settings and headers

**Implementation details**:

### SPA Redirect (`public/_redirects`)
```
/*    /index.html   200
```
This ensures all routes (including `/projects/some-uuid`) serve the React app instead of 404.

### Netlify Config (`netlify.toml`)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Verify existing Edge Functions
Check if `netlify/edge-functions/` exists for Stripe webhooks. If so, ensure the netlify.toml doesn't conflict with it.

**Supabase considerations**: None — infrastructure only.

**Self-verification**:
- [ ] `public/_redirects` file exists
- [ ] `netlify.toml` has valid syntax
- [ ] `npm run build` passes (output goes to `dist/`)

**Acceptance criteria**:
- [ ] `_redirects` file is in `public/` (gets copied to `dist/` on build)
- [ ] `netlify.toml` is at project root
- [ ] Security headers are configured
- [ ] Asset caching is configured for long-lived hashes
- [ ] `npm run build` passes

---

## Execution Order

1. **S37-1** — Landing page (the main deliverable, most code)
2. **S37-2** — Netlify config (quick, standalone, builds on S37-1 being done)

---

## SQL Migrations Required

**None.** This sprint is entirely frontend + infrastructure config.

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] Landing page renders at `/landing` without console errors
- [ ] Unauthenticated `/` shows landing page
- [ ] Authenticated `/` shows Dashboard
- [ ] All regression checklist items pass
- [ ] `npm run build` passes clean

### Charlie's Test Plan (after merge):
1. Open `http://localhost:3000` in incognito — should see landing page (not login)
2. Scroll through all 6 sections — check responsive layout
3. Click "Start Free Trial" — should go to `/signup`
4. Click "Login" — should go to `/login`
5. Sign in — should go to Dashboard (not landing page)
6. Sign out — should go back to landing page
7. Navigate directly to `/projects/wizard` while not logged in — should redirect to login
8. Check mobile layout (Chrome DevTools responsive mode, 375px width)
9. View page source — verify meta tags in `<head>`
10. Console check: no errors on landing page

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
