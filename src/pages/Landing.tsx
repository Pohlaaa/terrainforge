import React from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── inline styles ─── */
const colors = {
  bg: '#0A0A0A',
  bgAlt: '#111111',
  card: '#1A1A1A',
  green: '#2D6A4F',
  greenHover: '#3A8563',
  white: '#ffffff',
  text70: 'rgba(255,255,255,0.7)',
  text60: 'rgba(255,255,255,0.6)',
  text50: 'rgba(255,255,255,0.5)',
  text40: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.1)',
} as const

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

/* ─── Hero ─── */
function Hero({ onSignup }: { onSignup: () => void }) {
  return (
    <section
      style={{
        background: colors.bg,
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px',
      }}
    >
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
      <CTAButton onClick={onSignup}>Start Your Free Trial</CTAButton>
      <p style={{ color: colors.text40, fontSize: '14px', marginTop: '16px' }}>
        14 days free. No credit card required.
      </p>
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

function PainPoints() {
  return (
    <section style={{ background: colors.bgAlt, padding: '80px 24px' }}>
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
          <div
            key={i}
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '32px',
            }}
          >
            <p style={{ color: colors.text50, fontSize: '16px', lineHeight: 1.5, margin: '0 0 16px' }}>
              "{p.pain}"
            </p>
            <p style={{ color: colors.white, fontSize: '16px', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
              {p.solution}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Features ─── */
const features = [
  { icon: '🤖', title: 'AI Project Setup', desc: 'Describe a job, get a full project plan with tasks, materials, and budget in minutes.' },
  { icon: '📦', title: 'Material Manifests', desc: 'Zone-by-zone material calculations with waste reserve. Export PDF crew packets.' },
  { icon: '📅', title: 'Crew Scheduling', desc: 'Weekly drag-and-drop schedule. Crew sees their day on their phone.' },
  { icon: '💰', title: 'Budget Tracking', desc: 'Quote vs. actual costs. Margin guidance so you price every job right.' },
  { icon: '🚛', title: 'Equipment & Fleet', desc: 'Track maintenance, insurance, and which truck is on which job.' },
  { icon: '📋', title: 'Work Orders', desc: 'Auto-generated step-by-step checklists from your project zones.' },
]

function Features() {
  return (
    <section style={{ background: colors.bg, padding: '80px 24px' }}>
      <h2 style={{ color: colors.white, fontSize: '32px', fontWeight: 700, textAlign: 'center', margin: '0 0 48px' }}>
        Everything you need to run your jobs
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
        {features.map((f, i) => (
          <div key={i} style={{ padding: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>{f.icon}</div>
            <h3 style={{ color: colors.white, fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
            <p style={{ color: colors.text60, fontSize: '15px', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Pricing ─── */
const plans = [
  { name: 'Starter', price: 49, tagline: 'For solo operators', projects: '5 active projects', users: '1 user', highlight: false },
  { name: 'Pro', price: 99, tagline: 'For small companies', projects: '25 active projects', users: '5 users', highlight: true },
  { name: 'Business', price: 199, tagline: 'For established contractors', projects: 'Unlimited projects', users: '15 users', highlight: false },
]

function Pricing({ onSignup }: { onSignup: () => void }) {
  return (
    <section style={{ background: colors.bgAlt, padding: '80px 24px' }}>
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
              background: colors.card,
              borderRadius: '12px',
              padding: '32px',
              border: plan.highlight ? `2px solid ${colors.green}` : `1px solid ${colors.border}`,
              position: 'relative',
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
            <div style={{ margin: '0 0 24px' }}>
              <span style={{ color: colors.white, fontSize: '40px', fontWeight: 700 }}>${plan.price}</span>
              <span style={{ color: colors.text50, fontSize: '16px' }}>/mo</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
              <li style={{ color: colors.text70, fontSize: '14px', padding: '6px 0' }}>{plan.projects}</li>
              <li style={{ color: colors.text70, fontSize: '14px', padding: '6px 0' }}>{plan.users}</li>
              <li style={{ color: colors.text70, fontSize: '14px', padding: '6px 0' }}>All features included</li>
              {plan.highlight && <li style={{ color: colors.text70, fontSize: '14px', padding: '6px 0' }}>Priority support</li>}
              {plan.name === 'Business' && <li style={{ color: colors.text70, fontSize: '14px', padding: '6px 0' }}>Onboarding call</li>}
            </ul>
            <CTAButton onClick={onSignup} style={{ width: '100%', fontSize: '15px', padding: '12px 24px' }}>
              Start Free Trial
            </CTAButton>
          </div>
        ))}
      </div>
      <p style={{ color: colors.text40, fontSize: '14px', textAlign: 'center', marginTop: '32px' }}>
        All plans include a 14-day free trial. No credit card required.
      </p>
    </section>
  )
}

/* ─── Footer ─── */
function Footer({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
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
  )
}

/* ─── Landing Page ─── */
export default function Landing() {
  const navigate = useNavigate()
  const goLogin = () => navigate('/login')
  const goSignup = () => navigate('/signup')

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', color: colors.white }}>
      <Navbar onLogin={goLogin} onSignup={goSignup} />
      <Hero onSignup={goSignup} />
      <PainPoints />
      <Features />
      <Pricing onSignup={goSignup} />
      <Footer onLogin={goLogin} onSignup={goSignup} />
    </div>
  )
}
