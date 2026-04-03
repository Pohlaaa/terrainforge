import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── inline styles ─── */
const colors = {
  bg: '#0A0A0A',
  bgAlt: '#111111',
  card: '#1A1A1A',
  green: '#2D6A4F',
  greenLight: '#34D399',
  greenHover: '#3A8563',
  white: '#ffffff',
  text70: 'rgba(255,255,255,0.7)',
  text60: 'rgba(255,255,255,0.6)',
  text50: 'rgba(255,255,255,0.5)',
  text40: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.1)',
} as const

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

/* ─── S45-6: FadeInSection wrapper ─── */
function FadeInSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
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
      style={{
        opacity: reducedMotion ? 1 : visible ? 1 : 0,
        transform: reducedMotion ? 'none' : visible ? 'translateY(0)' : 'translateY(20px)',
        transition: reducedMotion ? 'none' : 'opacity 0.5s ease, transform 0.5s ease',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ─── reusable CTA button ─── */
function CTAButton({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: colors.green,
        color: colors.white,
        fontSize: '18px',
        fontWeight: 600,
        padding: '16px 32px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 0.2s',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = colors.greenHover)}
      onMouseLeave={e => (e.currentTarget.style.background = colors.green)}
    >
      {children}
    </button>
  )
}

/* ─── Navbar ─── */
function Navbar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        padding: '0 24px',
        background: colors.bg,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <span style={{ color: colors.green, fontWeight: 700, fontSize: '20px' }}>TerrainForge</span>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={onLogin}
          style={{
            background: 'transparent',
            color: colors.text70,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Login
        </button>
        <button
          onClick={onSignup}
          style={{
            background: colors.green,
            color: colors.white,
            border: 'none',
            borderRadius: '8px',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Start Free Trial
        </button>
      </div>
    </nav>
  )
}

/* ─── S45-1: Hero — Visual Impact ─── */
function Hero({ onSignup }: { onSignup: () => void }) {
  const reducedMotion = useReducedMotion()

  return (
    <section
      style={{
        background: `radial-gradient(ellipse at 50% 40%, rgba(45,106,79,0.15) 0%, transparent 70%), ${colors.bg}`,
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
      }}
    >
      {/* Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid rgba(45,106,79,0.4)',
          borderRadius: '20px',
          padding: '6px 16px',
          fontSize: '13px',
          color: colors.text60,
          marginBottom: '24px',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.greenLight, display: 'inline-block' }} />
        Built for landscaping contractors
      </div>

      <h1
        style={{
          color: colors.white,
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 700,
          maxWidth: '720px',
          lineHeight: 1.15,
          margin: '0 0 24px',
        }}
      >
        Stop losing money on every job.
      </h1>
      <p
        style={{
          color: colors.text70,
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          maxWidth: '600px',
          lineHeight: 1.6,
          margin: '0 0 40px',
        }}
      >
        TerrainForge helps landscaping contractors quote faster, track materials, and keep crews on the same page — all in one app.
      </p>
      <CTAButton
        onClick={onSignup}
        style={{ boxShadow: '0 0 20px rgba(45,106,79,0.3), 0 4px 12px rgba(0,0,0,0.3)' }}
      >
        Start Your Free Trial
      </CTAButton>
      <p style={{ color: colors.text40, fontSize: '14px', marginTop: '16px' }}>
        14 days free. No credit card required.
      </p>

      {/* Scroll indicator */}
      <div
        style={{
          marginTop: '40px',
          opacity: 0.4,
          animation: reducedMotion ? 'none' : 'bounceDown 2s infinite',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.text60} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

/* ─── S45-2: Pain Points — Card Visual Upgrade ─── */
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
  const [hovered, setHovered] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors.card,
        borderLeft: `1px solid ${hovered ? 'rgba(45,106,79,0.3)' : colors.border}`,
        borderRight: `1px solid ${hovered ? 'rgba(45,106,79,0.3)' : colors.border}`,
        borderBottom: `1px solid ${hovered ? 'rgba(45,106,79,0.3)' : colors.border}`,
        borderTop: `3px solid ${colors.green}`,
        borderRadius: '12px',
        padding: '32px',
        transform: !reducedMotion && hovered ? 'translateY(-2px)' : 'none',
        transition: reducedMotion ? 'none' : 'all 0.2s ease',
      }}
    >
      {/* Number indicator */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'rgba(45,106,79,0.15)',
          color: 'rgba(45,106,79,0.8)',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      <p style={{ color: colors.text50, fontSize: '16px', lineHeight: 1.5, margin: '0 0 16px', fontStyle: 'italic' }}>
        &ldquo;{pain}&rdquo;
      </p>

      {/* Separator arrow */}
      <div style={{ color: colors.greenLight, fontSize: '18px', margin: '0 0 12px' }}>&#8595;</div>

      <p style={{ color: colors.white, fontSize: '16px', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
        {solution}
      </p>
    </div>
  )
}

function PainPoints() {
  return (
    <section style={{ background: colors.bgAlt, padding: '80px 24px' }}>
      <FadeInSection>
        <h2 style={{ color: colors.white, fontSize: '32px', fontWeight: 700, textAlign: 'center', margin: '0 0 48px' }}>
          Sound familiar?
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {painPoints.map((p, i) => (
            <PainPointCard key={i} pain={p.pain} solution={p.solution} index={i} />
          ))}
        </div>
      </FadeInSection>
    </section>
  )
}

/* ─── S45-3: Feature SVG Icons ─── */
const featureIcons: Record<string, React.ReactNode> = {
  'AI Project Setup': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8Z" />
    </svg>
  ),
  'Material Manifests': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73L13 2.27a2 2 0 00-2 0L4 6.27A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  'Crew Scheduling': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  'Budget Tracking': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  'Equipment & Fleet': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  'Work Orders': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
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
  const [hovered, setHovered] = useState(false)
  const reducedMotion = useReducedMotion()

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '24px',
        borderRadius: '12px',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: reducedMotion ? 'none' : 'background 0.2s',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          background: 'rgba(45,106,79,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}
      >
        {featureIcons[title]}
      </div>
      <h3 style={{ color: colors.white, fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ color: colors.text60, fontSize: '15px', lineHeight: 1.5, margin: 0 }}>{desc}</p>
    </div>
  )
}

function Features() {
  return (
    <section style={{ background: colors.bg, padding: '80px 24px' }}>
      <FadeInSection>
        <h2 style={{ color: colors.white, fontSize: '32px', fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}>
          Everything you need to run your jobs
        </h2>
        <p style={{ color: colors.text50, fontSize: '16px', textAlign: 'center', margin: '0 0 48px' }}>
          From the first quote to the last walkthrough — one app for the whole job.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          {features.map((f) => (
            <FeatureCard key={f.title} title={f.title} desc={f.desc} />
          ))}
        </div>
      </FadeInSection>
    </section>
  )
}

/* ─── S45-5: Social Proof (New) ─── */
function SocialProof() {
  const stats = [
    { label: 'AI-Powered', subtitle: 'Project setup in under 5 minutes' },
    { label: '6 Tools in 1', subtitle: 'Replace spreadsheets, texts, and paper tickets' },
    { label: '14-Day Trial', subtitle: 'No credit card. Cancel anytime.' },
  ]

  return (
    <section style={{ background: colors.bgAlt, padding: '80px 24px' }}>
      <FadeInSection>
        <h2 style={{ color: colors.white, fontSize: '32px', fontWeight: 700, textAlign: 'center', margin: '0 0 48px' }}>
          Built by a contractor, for contractors
        </h2>

        {/* Stat cards */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '0',
            maxWidth: '800px',
            margin: '0 auto 64px',
            flexWrap: 'wrap',
          }}
        >
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              <div style={{ flex: '1 1 200px', textAlign: 'center', padding: '16px 24px' }}>
                <div style={{ color: colors.white, fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{s.label}</div>
                <div style={{ color: colors.text60, fontSize: '14px', lineHeight: 1.4 }}>{s.subtitle}</div>
              </div>
              {i < stats.length - 1 && (
                <div
                  style={{
                    width: '1px',
                    height: '60px',
                    background: colors.border,
                    alignSelf: 'center',
                    flexShrink: 0,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Testimonial placeholder */}
        {/* Replace with real testimonial when available */}
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ color: colors.green, fontSize: '48px', lineHeight: 1, marginBottom: '16px' }}>&ldquo;</div>
          <p
            style={{
              color: colors.text70,
              fontSize: '18px',
              fontStyle: 'italic',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            I used to spend half my Sunday doing material lists. Now I describe the job and TerrainForge does it in minutes.
          </p>
          <p style={{ color: colors.text40, fontSize: '14px', margin: 0 }}>
            — Landscaping contractor, Texas
          </p>
        </div>
      </FadeInSection>
    </section>
  )
}

/* ─── S45-4: Pricing — Enhanced Cards ─── */
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
    <section style={{ background: colors.bg, padding: '80px 24px' }}>
      <FadeInSection>
        <h2 style={{ color: colors.white, fontSize: '32px', fontWeight: 700, textAlign: 'center', margin: '0 0 48px' }}>
          Simple pricing. Cancel anytime.
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight
                  ? 'linear-gradient(to bottom, #1A1A1A, #151A17)'
                  : colors.card,
                borderRadius: '12px',
                padding: plan.highlight ? '40px 32px 32px' : '32px',
                border: plan.highlight ? `2px solid ${colors.green}` : `1px solid ${colors.border}`,
                position: 'relative',
                boxShadow: plan.highlight ? '0 0 30px rgba(45,106,79,0.15)' : 'none',
              }}
            >
              {plan.highlight && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: colors.green,
                    color: colors.white,
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 16px',
                    borderRadius: '12px',
                  }}
                >
                  Most Popular
                </span>
              )}
              <h3 style={{ color: colors.white, fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>{plan.name}</h3>
              <p style={{ color: colors.text50, fontSize: '14px', margin: '0 0 20px' }}>{plan.tagline}</p>
              <div style={{ margin: '0 0 4px' }}>
                <span style={{ color: colors.white, fontSize: '40px', fontWeight: 700 }}>${plan.price}</span>
                <span style={{ color: colors.text50, fontSize: '16px' }}>/mo</span>
              </div>
              <p style={{ color: colors.text40, fontSize: '13px', margin: '0 0 24px' }}>
                or ${plan.annual.toLocaleString()}/yr (save 2 months)
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {plan.features.map((feat) => (
                  <li key={feat} style={{ color: colors.text70, fontSize: '14px', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: colors.greenLight, fontWeight: 700 }}>&#10003;</span>
                    {feat}
                  </li>
                ))}
              </ul>
              {/* Divider */}
              <div style={{ height: '1px', background: colors.border, margin: '0 0 24px' }} />
              <CTAButton onClick={onSignup} style={{ width: '100%', fontSize: '15px', padding: '12px 24px' }}>
                Start Free Trial
              </CTAButton>
            </div>
          ))}
        </div>
        <p style={{ color: colors.text40, fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
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
      {/* Gradient transition into footer */}
      <div style={{ height: '80px', background: `linear-gradient(to bottom, ${colors.bg}, ${colors.bg})` }} />
      <footer
        style={{
          background: colors.bg,
          borderTop: `1px solid ${colors.border}`,
          padding: '40px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ color: colors.green, fontWeight: 700, fontSize: '18px' }}>TerrainForge</span>
          <p style={{ color: colors.text40, fontSize: '13px', margin: '4px 0 0' }}>Built for contractors who build.</p>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <button
            onClick={onLogin}
            style={{ background: 'none', border: 'none', color: colors.text50, fontSize: '14px', cursor: 'pointer' }}
          >
            Login
          </button>
          <button
            onClick={onSignup}
            style={{ background: 'none', border: 'none', color: colors.text50, fontSize: '14px', cursor: 'pointer' }}
          >
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
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.white, scrollBehavior: 'smooth' }}>
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
