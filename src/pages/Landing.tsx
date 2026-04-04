import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── reduced-motion helper ─── */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/* ─── FadeInSection wrapper ─── */
function FadeInSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: reducedMotion ? 1 : visible ? 1 : 0,
        transform: reducedMotion ? 'none' : visible ? 'translateY(0)' : 'translateY(20px)',
        transition: reducedMotion ? 'none' : 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {children}
    </div>
  )
}

/* ─── Navbar ─── */
function Navbar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between h-16 px-6 bg-[var(--surface-bg)] border-b border-[var(--border-default)]">
      <span className="text-[var(--brand-primary)] font-bold text-xl">TerrainForge</span>
      <div className="flex gap-3 items-center">
        <button
          onClick={onLogin}
          className="bg-transparent text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg px-5 py-2 text-sm font-medium cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
        >
          Login
        </button>
        <button
          onClick={onSignup}
          className="btn-primary btn-primary-gold rounded-lg px-5 py-2 text-sm font-semibold cursor-pointer border-none"
        >
          Start Free Trial
        </button>
      </div>
    </nav>
  )
}

/* ─── Hero ─── */
function Hero({ onSignup }: { onSignup: () => void }) {
  const reducedMotion = useReducedMotion()

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-20 bg-transparent">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 border border-[var(--brand-primary)]/40 rounded-full px-4 py-1.5 text-[13px] text-[var(--text-tertiary)] mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-green)] inline-block" />
        Built for landscaping contractors
      </div>

      <h1 className="text-[var(--text-primary)] text-[clamp(32px,5vw,48px)] font-bold max-w-[720px] leading-tight mb-6">
        Stop losing money on every job.
      </h1>
      <p className="text-[var(--text-secondary)] text-[clamp(16px,2.5vw,20px)] max-w-[600px] leading-relaxed mb-10">
        TerrainForge helps landscaping contractors quote faster, track materials, and keep crews on the same page — all in one app.
      </p>
      <button
        onClick={onSignup}
        className="btn-primary btn-primary-gold rounded-lg px-8 py-4 text-lg font-semibold cursor-pointer border-none shadow-[0_0_20px_rgba(45,106,79,0.3),0_4px_12px_rgba(0,0,0,0.3)]"
      >
        Start Your Free Trial
      </button>
      <p className="text-[var(--text-tertiary)] text-sm mt-4">
        14 days free. No credit card required.
      </p>

      {/* Scroll indicator */}
      <div
        className="mt-10 opacity-40"
        style={{ animation: reducedMotion ? 'none' : 'bounceDown 2s infinite' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <style>{`
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
      `}</style>
    </section>
  )
}

/* ─── Pain Points ─── */
const painPoints = [
  {
    pain: 'Your material lists take 3+ hours per job',
    solution: 'TerrainForge generates manifests from a project description in minutes. Waste reserve built in.',
  },
  {
    pain: 'Your crew calls you 5 times a day asking what to do',
    solution: 'Auto-generated work orders with checklists. Crew checks in from their phone.',
  },
  {
    pain: "You have no idea if you're making money until the job is done",
    solution: 'Real-time budget tracking with margin guidance. Know your profit before you start.',
  },
]

function PainPointCard({ pain, solution, index }: { pain: string; solution: string; index: number }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] border-t-[3px] border-t-[var(--brand-primary)] rounded-xl p-8 hover:-translate-y-0.5 transition-transform card-interactive">
      <div className="w-8 h-8 rounded-full bg-[var(--brand-primary-bg)] text-[var(--brand-primary)] text-[13px] font-bold flex items-center justify-center mb-4">
        {String(index + 1).padStart(2, '0')}
      </div>
      <p className="text-[var(--text-tertiary)] text-base leading-relaxed mb-4 italic">
        &ldquo;{pain}&rdquo;
      </p>
      <div className="text-[var(--status-green)] text-lg mb-3">&#8595;</div>
      <p className="text-[var(--text-primary)] text-base font-medium leading-relaxed">
        {solution}
      </p>
    </div>
  )
}

function PainPoints() {
  return (
    <section className="bg-[var(--surface-bg)] py-20 px-6">
      <FadeInSection>
        <h2 className="text-[var(--text-primary)] text-[32px] font-bold text-center mb-12">
          Sound familiar?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {painPoints.map((p, i) => (
            <PainPointCard key={i} pain={p.pain} solution={p.solution} index={i} />
          ))}
        </div>
      </FadeInSection>
    </section>
  )
}

/* ─── Feature Icons ─── */
const featureIcons: Record<string, React.ReactNode> = {
  'AI Project Setup': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8Z" />
    </svg>
  ),
  'Material Manifests': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73L13 2.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  'Crew Scheduling': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  'Budget Tracking': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  'Equipment & Fleet': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  'Work Orders': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  ),
}

const features = [
  { title: 'AI Project Setup', desc: 'Describe a job, get a full project plan with tasks, materials, and budget in minutes.' },
  { title: 'Material Manifests', desc: 'Zone-by-zone material calculations with waste reserve. Export PDF crew packets.' },
  { title: 'Crew Scheduling', desc: 'Weekly drag-and-drop schedule. Crew sees their day on their phone.' },
  { title: 'Budget Tracking', desc: 'Quote vs. actual costs. Margin guidance so you price every job right.' },
  { title: 'Equipment & Fleet', desc: 'Track maintenance, insurance, and which truck is on which job.' },
  { title: 'Work Orders', desc: 'Auto-generated step-by-step checklists from your project zones.' },
]

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6 rounded-xl hover:bg-[var(--surface-hover)] transition-colors">
      <div className="w-12 h-12 rounded-[10px] bg-[var(--brand-primary-bg)] flex items-center justify-center mb-3">
        {featureIcons[title]}
      </div>
      <h3 className="text-[var(--text-primary)] text-lg font-bold mb-2">{title}</h3>
      <p className="text-[var(--text-tertiary)] text-[15px] leading-relaxed">{desc}</p>
    </div>
  )
}

function Features() {
  return (
    <section className="bg-transparent py-20 px-6">
      <FadeInSection>
        <h2 className="text-[var(--text-primary)] text-[32px] font-bold text-center mb-2">
          Everything you need to run your jobs
        </h2>
        <p className="text-[var(--text-tertiary)] text-base text-center mb-12">
          From the first quote to the last walkthrough — one app for the whole job.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
          {features.map((f) => (
            <FeatureCard key={f.title} title={f.title} desc={f.desc} />
          ))}
        </div>
      </FadeInSection>
    </section>
  )
}

/* ─── Social Proof ─── */
function SocialProof() {
  const stats = [
    { label: 'AI-Powered', subtitle: 'Project setup in under 5 minutes' },
    { label: '6 Tools in 1', subtitle: 'Replace spreadsheets, texts, and paper tickets' },
    { label: '14-Day Trial', subtitle: 'No credit card. Cancel anytime.' },
  ]

  return (
    <section className="bg-[var(--surface-bg)] py-20 px-6">
      <FadeInSection>
        <h2 className="text-[var(--text-primary)] text-[32px] font-bold text-center mb-12">
          Built by a contractor, for contractors
        </h2>

        <div className="flex justify-center items-start gap-0 max-w-[800px] mx-auto mb-16 flex-wrap">
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex-1 basis-[200px] text-center px-6 py-4">
                <div className="text-[var(--text-primary)] text-2xl font-bold mb-2">{s.label}</div>
                <div className="text-[var(--text-tertiary)] text-sm leading-snug">{s.subtitle}</div>
              </div>
              {i < stats.length - 1 && (
                <div className="w-px h-[60px] bg-[var(--border-default)] self-center flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="max-w-[600px] mx-auto text-center">
          <div className="text-[var(--brand-primary)] text-5xl leading-none mb-4">&ldquo;</div>
          <p className="text-[var(--text-secondary)] text-lg italic leading-relaxed mb-4">
            I used to spend half my Sunday doing material lists. Now I describe the job and TerrainForge does it in minutes.
          </p>
          <p className="text-[var(--text-tertiary)] text-sm">
            — Landscaping contractor, Texas
          </p>
        </div>
      </FadeInSection>
    </section>
  )
}

/* ─── Pricing ─── */
const plans = [
  {
    name: 'Starter',
    price: 49,
    annual: 490,
    tagline: 'For solo operators',
    features: ['5 active projects', '1 user', 'All features included'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: 99,
    annual: 990,
    tagline: 'For small companies',
    features: ['25 active projects', '5 users', 'All features included', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Business',
    price: 199,
    annual: 1990,
    tagline: 'For established contractors',
    features: ['Unlimited projects', '15 users', 'All features included', 'Onboarding call'],
    highlight: false,
  },
]

function Pricing({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="bg-transparent py-20 px-6">
      <FadeInSection>
        <h2 className="text-[var(--text-primary)] text-[32px] font-bold text-center mb-12">
          Simple pricing. Cancel anytime.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-[var(--surface-card)] rounded-xl relative ${
                plan.highlight
                  ? 'border-2 border-[var(--brand-primary)] pt-10 px-8 pb-8 shadow-[0_0_30px_rgba(45,106,79,0.15)]'
                  : 'border border-[var(--border-default)] p-8'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--brand-primary)] text-[var(--text-on-primary)] text-xs font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-[var(--text-primary)] text-[22px] font-bold mb-1">{plan.name}</h3>
              <p className="text-[var(--text-tertiary)] text-sm mb-5">{plan.tagline}</p>
              <div className="mb-1">
                <span className="text-[var(--text-primary)] text-[40px] font-bold">${plan.price}</span>
                <span className="text-[var(--text-tertiary)] text-base">/mo</span>
              </div>
              <p className="text-[var(--text-disabled)] text-[13px] mb-6">
                or ${plan.annual.toLocaleString()}/yr (save 2 months)
              </p>
              <ul className="list-none p-0 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="text-[var(--text-secondary)] text-sm py-1.5 flex items-center gap-2">
                    <span className="text-[var(--status-green)] font-bold">&#10003;</span>
                    {feat}
                  </li>
                ))}
              </ul>
              <div className="h-px bg-[var(--border-default)] mb-6" />
              <button
                onClick={onSignup}
                className="btn-primary btn-primary-gold w-full rounded-lg py-3 px-6 text-[15px] font-semibold cursor-pointer border-none"
              >
                Start Free Trial
              </button>
            </div>
          ))}
        </div>
        <p className="text-[var(--text-tertiary)] text-sm text-center mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </FadeInSection>
    </section>
  )
}

/* ─── Footer ─── */
function Footer({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <>
      <div className="h-20 bg-transparent" />
      <footer className="bg-[var(--surface-bg)] border-t border-[var(--border-default)] py-10 px-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <span className="text-[var(--brand-primary)] font-bold text-lg">TerrainForge</span>
          <p className="text-[var(--text-tertiary)] text-[13px] mt-1">Built for contractors who build.</p>
        </div>
        <div className="flex gap-6">
          <button onClick={onLogin} className="bg-transparent border-none text-[var(--text-tertiary)] text-sm cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
            Login
          </button>
          <button onClick={onSignup} className="bg-transparent border-none text-[var(--text-tertiary)] text-sm cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
            Sign Up
          </button>
        </div>
      </footer>
    </>
  )
}

/* ─── Landing Page ─── */
export default function Landing() {
  const navigate = useNavigate()
  const goLogin = () => navigate('/login')
  const goSignup = () => navigate('/signup')

  return (
    <div className="bg-[var(--surface-bg)] min-h-screen text-[var(--text-primary)]" style={{ scrollBehavior: 'smooth' }}>
      <Navbar onLogin={goLogin} onSignup={goSignup} />
      <Hero onSignup={goSignup} />
      <PainPoints />
      <Features />
      <SocialProof />
      <Pricing onSignup={goSignup} />
      <Footer onLogin={goLogin} onSignup={goSignup} />
    </div>
  )
}
