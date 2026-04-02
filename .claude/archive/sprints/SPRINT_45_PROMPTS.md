# Sprint 45 — Landing Page Visual Upgrade

> **Goal**: Transform the landing page from text-only to a polished, visually compelling marketing page. No new features — purely design and content improvements to the existing sections. The page should look professional enough to share with contractors and get feedback.
>
> **Single sprint**. Create a PR when done.
> **Branch**: `sprint-45-landing-page-polish`
> **Design reference**: `.claude/DESIGN_SYSTEM.md` for color tokens. Dark theme, green (#2D6A4F) brand color.
> **SQL migrations**: None
> **PR command**: `"C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head sprint-45-landing-page-polish --title "Sprint 45: Landing page visual upgrade" --body "Visual overhaul of landing page — hero gradient + badge, icon cards with hover, feature grid with SVG icons, enhanced pricing cards, social proof section, scroll animations, responsive polish."`

---

## CRITICAL CONTEXT

> - Landing page is at `src/pages/Landing.tsx` (365 lines, all inline styles)
> - Currently: all text, emoji icons, no images, no animations, no social proof
> - Dark theme only (#0A0A0A bg, #2D6A4F green brand)
> - Uses inline styles (NOT Tailwind, NOT CSS modules) — keep this pattern
> - The component is a single file with sub-components: Navbar, Hero, PainPoints, Features, Pricing, Footer
> - Route: `/` for unauthenticated users, `/landing` as explicit route
> - No external images or assets exist yet (only `public/favicon.svg`)
> - Per MARKETING.md messaging rules: talk like a contractor, lead with pain not features, use numbers, no buzzwords
> - Per DESIGN_SYSTEM.md: `prefers-reduced-motion` must be respected for all animations
> - This page is the FIRST thing a potential customer sees — it must look professional
> - Keep all changes within `src/pages/Landing.tsx` — do NOT create new component files

---

## REGRESSION CHECKLIST

> - [ ] Landing page renders at `/` for unauthenticated users
> - [ ] Authenticated users still redirect to `/dashboard`
> - [ ] "Login" button navigates to `/login`
> - [ ] "Start Free Trial" buttons navigate to `/signup`
> - [ ] All 6 sections still render (Navbar, Hero, Pain Points, Features, Pricing, Footer)
> - [ ] Page is responsive on mobile widths (375px+)
> - [ ] `npm run build` passes

---

## S45-1: Hero Section — Visual Impact

**Problem**: Hero is plain white text on black. Needs visual weight to stop a scrolling visitor.

**Current state**: h1 "Stop losing money on every job." + subtitle + CTA button + "14 days free" text. Centered, 80vh.

**Changes**:

1. **Add a subtle radial gradient behind the hero**: A green-tinted radial glow behind the heading to draw the eye. Not overpowering — think a soft spotlight effect.
   ```
   background: radial-gradient(ellipse at 50% 40%, rgba(45,106,79,0.15) 0%, transparent 70%), #0A0A0A
   ```

2. **Add a "badge" above the headline**: A small pill/chip that establishes credibility. Example: "Built for landscaping contractors" in a bordered pill with a green dot.
   ```
   ● Built for landscaping contractors
   ```
   Style: `display: inline-flex`, `border: 1px solid rgba(45,106,79,0.4)`, `borderRadius: 20px`, `padding: 6px 16px`, `fontSize: 13px`, `color: rgba(255,255,255,0.6)`, `marginBottom: 24px`. Green dot is a `6px` inline circle.

3. **Improve CTA button**: Add a subtle glow/shadow to make it pop:
   ```
   boxShadow: '0 0 20px rgba(45,106,79,0.3), 0 4px 12px rgba(0,0,0,0.3)'
   ```

4. **Add a subtle down-scroll indicator**: A small animated chevron below the "14 days free" text that hints there's more content below. CSS-only animation (bounce). Respect `prefers-reduced-motion`.

**Self-verification**:
- [ ] Hero has visible gradient glow behind heading
- [ ] Badge pill renders above headline
- [ ] CTA button has subtle green glow
- [ ] Scroll indicator animates (or is static if `prefers-reduced-motion`)
- [ ] `npm run build` passes

---

## S45-2: Pain Points — Card Visual Upgrade

**Problem**: Pain point cards are flat dark rectangles with text. No visual distinction between the pain and the solution.

**Current state**: 3 cards in a grid. Each has a quoted pain text (gray) and a solution text (white).

**Changes**:

1. **Add a colored top border accent** to each card: 3px solid top border using the green brand color. Makes cards feel intentional.

2. **Add a number/step indicator**: Top-left of each card, a muted circle with "01", "02", "03". Style: `width: 32px`, `height: 32px`, `borderRadius: 50%`, `background: rgba(45,106,79,0.15)`, `color: rgba(45,106,79,0.8)`, `fontSize: 13px`, `fontWeight: 700`, centered text. Adds visual rhythm.

3. **Add hover effect**: On hover, card lifts slightly and border glows. `transform: translateY(-2px)`, `borderColor: rgba(45,106,79,0.3)`, `transition: all 0.2s ease`. Respect `prefers-reduced-motion` (no transform if reduced motion).

4. **Visual separator between pain and solution**: A thin horizontal line or a `→` arrow icon between the pain quote and the solution text. Makes the before/after relationship clearer.

**Self-verification**:
- [ ] Cards have green top border accent
- [ ] Number indicators (01, 02, 03) visible
- [ ] Hover lifts card (unless reduced motion)
- [ ] Pain→solution visual separator present

---

## S45-3: Features — SVG Icons + Better Grid

**Problem**: Features use emoji icons (🤖, 📦, 📅, 💰, 🚛, 📋). These render inconsistently across platforms, look unprofessional, and can't be styled with the brand color.

**Current state**: 6 features in a 3-column auto-fit grid. Each has emoji, title, description.

**Changes**:

1. **Replace emojis with simple inline SVG icons** styled with the brand green. Each icon should be a `40px` square with `stroke` or `fill` in `#2D6A4F` or `#34D399` (lighter green for dark bg). Use simple, recognizable shapes:
   - AI Project Setup → brain/sparkles icon (a circle with lines radiating, or a magic wand)
   - Material Manifests → box/package icon
   - Crew Scheduling → calendar icon
   - Budget Tracking → dollar/chart icon
   - Equipment & Fleet → truck icon
   - Work Orders → clipboard/checklist icon

   Keep SVGs simple — 1-2 paths max. Do NOT use an icon library. Define them inline in the component.

2. **Add icon containers**: Each SVG sits inside a `48px × 48px` rounded container with `background: rgba(45,106,79,0.1)`, `borderRadius: 10px`. Centers the icon and gives it weight.

3. **Add hover effect** to feature cards: subtle background highlight on hover, `background: rgba(255,255,255,0.03)`, `borderRadius: 12px`, `transition: background 0.2s`. Respect `prefers-reduced-motion`.

4. **Add section subtitle**: Below "Everything you need to run your jobs", add a muted subtitle: "From the first quote to the last walkthrough — one app for the whole job."

**Self-verification**:
- [ ] All 6 features render SVG icons (no emojis)
- [ ] Icons are green and inside rounded containers
- [ ] Hover effect on feature cards
- [ ] Section subtitle appears
- [ ] `npm run build` passes

---

## S45-4: Pricing — Enhanced Cards

**Problem**: Pricing cards are functional but flat. The "Most Popular" badge and pricing hierarchy need more visual punch.

**Current state**: 3 pricing cards in a grid. Pro has green border + "Most Popular" badge. All have plan name, tagline, price, feature list, CTA.

**Changes**:

1. **Add checkmark icons to feature list items**: Replace plain text list items with `✓ item text`. The checkmark should be in brand green (#34D399 for contrast on dark). This is a standard SaaS pricing pattern.

2. **Visually elevate the Pro card**: In addition to the green border, give it a subtle glow background:
   ```
   boxShadow: '0 0 30px rgba(45,106,79,0.15)'
   background: 'linear-gradient(to bottom, #1A1A1A, #151A17)'
   ```
   Make it slightly larger or add extra padding vs. Starter/Business.

3. **Add annual pricing nudge**: Below each monthly price, add small text: "or $XX/yr (save 2 months)" — e.g., "$490/yr" for Starter, "$990/yr" for Pro, "$1,990/yr" for Business. Color: `text40`.

4. **Divider between features and CTA**: A subtle horizontal line before the CTA button to separate the feature list from the action area.

**Self-verification**:
- [ ] Feature list items have green checkmarks
- [ ] Pro card has glow effect
- [ ] Annual pricing text shows below monthly price
- [ ] Divider above CTA buttons

---

## S45-5: Social Proof Section (New)

**Problem**: No social proof at all. Visitors have no reason to trust this product. Even without real testimonials, we need something.

**Current state**: No social proof section exists.

**Add a new section between Features and Pricing** with a simple social proof block:

1. **Section heading**: "Built by a contractor, for contractors"

2. **Stat cards**: 3 horizontal stats in a row (these are aspirational/descriptive, not fake metrics):
   - "AI-Powered" with subtitle "Project setup in under 5 minutes"
   - "6 Tools in 1" with subtitle "Replace spreadsheets, texts, and paper tickets"
   - "14-Day Trial" with subtitle "No credit card. Cancel anytime."

   Style each as a compact card: `background: transparent`, `textAlign: center`, large bold number/label (24px, white), smaller subtitle (14px, text60). Separated by subtle vertical dividers on desktop.

3. **A single testimonial placeholder**: A styled quote block with placeholder text:
   > "I used to spend half my Sunday doing material lists. Now I describe the job and TerrainForge does it in minutes."
   > — Landscaping contractor, Texas

   Style: italic, `fontSize: 18px`, `color: text70`, centered, with a decorative quote mark (large `"` in brand green, 48px) above the text. Max-width 600px.

   **This is a placeholder** — Charlie will replace it with a real testimonial when he has one. Add an HTML comment: `{/* Replace with real testimonial when available */}`

**Self-verification**:
- [ ] Social proof section renders between Features and Pricing
- [ ] 3 stat cards visible
- [ ] Testimonial quote renders with decorative quote mark
- [ ] Section looks balanced and professional

---

## S45-6: Scroll Animations + Polish

**Problem**: Page feels static. Every section appears fully formed. Subtle entrance animations add perceived quality.

**Changes**:

1. **Fade-in-up on scroll** for each major section (Pain Points, Features, Social Proof, Pricing). Use IntersectionObserver to trigger a CSS class when the section enters the viewport.

   Implementation:
   - Create a small `useFadeIn` hook or wrapper component inside Landing.tsx:
     ```typescript
     function FadeInSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
       const ref = useRef<HTMLDivElement>(null);
       const [visible, setVisible] = useState(false);
       useEffect(() => {
         const el = ref.current;
         if (!el) return;
         const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
         obs.observe(el);
         return () => obs.disconnect();
       }, []);
       const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
       return (
         <div
           ref={ref}
           style={{
             opacity: reducedMotion ? 1 : visible ? 1 : 0,
             transform: reducedMotion ? 'none' : visible ? 'translateY(0)' : 'translateY(20px)',
             transition: reducedMotion ? 'none' : 'opacity 0.5s ease, transform 0.5s ease',
             ...style,
           }}
         >
           {children}
         </div>
       );
     }
     ```
   - Wrap each section body (not the full section container — just the content inside) with `<FadeInSection>`.

2. **Smooth scroll behavior**: Add `scroll-behavior: smooth` to the page container so any anchor links (future) scroll smoothly.

3. **Footer polish**: Add a subtle top gradient fade from the last section into the footer, so the transition isn't abrupt.

**Self-verification**:
- [ ] Sections fade in when scrolling into view
- [ ] Animations are disabled with `prefers-reduced-motion: reduce`
- [ ] Footer transition is smooth
- [ ] No jank or layout shift during animations
- [ ] `npm run build` passes

---

## Execution Order

1. **S45-6 first** — Create `FadeInSection` wrapper (needed by other tasks)
2. **S45-1** — Hero visual upgrade
3. **S45-2** — Pain Points card upgrade
4. **S45-3** — Features SVG icons
5. **S45-5** — Social Proof section (new)
6. **S45-4** — Pricing card upgrade

---

## SQL Migrations Required

**None.**

---

## Post-Sprint Checklist

### Code Self-Verification (before PR):
- [ ] All 7 sections render (Navbar, Hero, Pain Points, Features, Social Proof, Pricing, Footer)
- [ ] SVG icons render for all 6 features (no emojis)
- [ ] Scroll animations work and respect `prefers-reduced-motion`
- [ ] All CTA buttons navigate to `/signup`
- [ ] Login button navigates to `/login`
- [ ] Page is responsive at 375px, 768px, 1024px widths
- [ ] All changes are within `src/pages/Landing.tsx` (single file)
- [ ] `npm run build` passes clean
- [ ] No console errors
- [ ] No `console.log` debug statements

### Charlie's Test Plan (after merge):
> Open `http://localhost:3000` in **incognito** (unauthenticated).

1. Landing page loads — hero has gradient glow, badge pill, glowing CTA
2. Scroll down — sections fade in smoothly
3. Pain Points — cards have green top border, numbered indicators, hover lift
4. Features — SVG icons (not emojis), icon containers, hover highlight
5. Social Proof — stat cards + testimonial quote between Features and Pricing
6. Pricing — green checkmarks, Pro card glows, annual pricing shown
7. Footer — smooth transition from Pricing section
8. Click "Start Free Trial" → navigates to `/signup`
9. Click "Login" → navigates to `/login`
10. Resize browser to mobile width → responsive layout, no overflow
11. Console: no errors

### Merge commands:
```powershell
cd "C:\Users\PohlaDesk\Documents\AI\Terrain Forge\terrainforge"
git checkout main
git merge sprint-45-landing-page-polish
git push origin main
git branch -d sprint-45-landing-page-polish
npm run build
npm run dev
```

### Post-Sprint Wrap-Up:
> Code: update CONTEXT.md, archive sprint prompt to `.claude/archive/sprints/`
> Charlie: update SPRINT_LOG.md (~2 min)
