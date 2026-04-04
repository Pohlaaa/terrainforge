import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

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

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  const style: React.CSSProperties = reducedMotion
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
      }

  return { ref, style, visible }
}

function useStaggerReveal(count: number, staggerMs = 120) {
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

  const getItemStyle = useCallback(
    (index: number): React.CSSProperties =>
      reducedMotion
        ? {}
        : {
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * staggerMs}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * staggerMs}ms`,
          },
    [visible, reducedMotion, staggerMs]
  )

  return { ref, getItemStyle }
}

function useParallax(speed = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const handleScroll = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const viewCenter = window.innerHeight / 2
      setOffset((center - viewCenter) * speed)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed, reducedMotion])

  return { ref, style: reducedMotion ? {} : { transform: `translateY(${offset}px)` } }
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLED DASHBOARD MOCKUPS (SVG + CSS)
   ═══════════════════════════════════════════════════════════════════════════ */

function DashboardMockup({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '960px',
      }}
    >
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22C55E' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
          TerrainForge — Projects Dashboard
        </div>
      </div>

      {/* Nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ color: '#34D399', fontWeight: 700, fontSize: '13px' }}>TF</span>
        <span style={{ color: '#34D399', fontSize: '12px', fontWeight: 600, borderBottom: '2px solid #34D399', paddingBottom: '6px' }}>Projects</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Budget</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Materials</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Crew</span>
      </div>

      {/* Content area */}
      <div style={{ padding: '20px' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Active Projects', value: '12', color: '#22C55E' },
            { label: 'Total Revenue', value: '$284K', color: '#3B82F6' },
            { label: 'Crew Deployed', value: '8/10', color: '#F97316' },
            { label: 'Avg Margin', value: '34%', color: '#8B5CF6' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '10px',
                padding: '14px 16px',
                borderLeft: `3px solid ${kpi.color}`,
              }}
            >
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9' }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>Project Progress</div>
            <svg width="100%" viewBox="0 0 400 120" style={{ display: 'block' }}>
              {[
                { name: 'Oak Street', pct: 85, color: '#22C55E' },
                { name: 'Riverside Dr', pct: 60, color: '#3B82F6' },
                { name: 'Elm Court', pct: 40, color: '#F59E0B' },
                { name: 'Pine Valley', pct: 25, color: '#8B5CF6' },
              ].map((p, i) => (
                <g key={p.name}>
                  <text x="0" y={i * 28 + 16} fill="rgba(255,255,255,0.5)" fontSize="10">{p.name}</text>
                  <rect x="100" y={i * 28 + 4} width="260" height="16" rx="4" fill="rgba(255,255,255,0.06)" />
                  <rect x="100" y={i * 28 + 4} width={260 * (p.pct / 100)} height="16" rx="4" fill={p.color} opacity="0.8" />
                  <text x={100 + 260 * (p.pct / 100) + 8} y={i * 28 + 16} fill="rgba(255,255,255,0.6)" fontSize="10">{p.pct}%</text>
                </g>
              ))}
            </svg>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', alignSelf: 'flex-start' }}>Revenue vs Cost</div>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#22C55E" strokeWidth="12" strokeDasharray="220 94" strokeLinecap="round" transform="rotate(-90 60 60)" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="70 244" strokeLinecap="round" transform="rotate(163 60 60)" />
              <text x="60" y="56" textAnchor="middle" fill="#F1F5F9" fontSize="16" fontWeight="700">$284K</text>
              <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">Revenue</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function WizardMockup() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '560px',
      }}
    >
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', marginBottom: '4px' }}>AI Project Wizard</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Describe your project and let AI build it for you</div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Chat bubbles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ alignSelf: 'flex-end', background: '#2D6A4F', borderRadius: '12px 12px 4px 12px', padding: '10px 14px', maxWidth: '80%' }}>
            <p style={{ fontSize: '12px', color: '#F1F5F9', margin: 0, lineHeight: 1.5 }}>
              I need a full backyard renovation — new patio, retaining wall, sod, and irrigation for a 4,000 sq ft yard.
            </p>
          </div>

          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', borderRadius: '12px 12px 12px 4px', padding: '10px 14px', maxWidth: '85%' }}>
            <p style={{ fontSize: '12px', color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>
              I&apos;ve generated your project with 4 zones, 23 material line items, and 12 tasks. Estimated budget: <span style={{ color: '#34D399', fontWeight: 600 }}>$18,400</span>. Want me to adjust anything?
            </p>
          </div>
        </div>

        {/* Generated items preview */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['4 Zones', '23 Materials', '12 Tasks', '$18.4K Budget'].map((tag) => (
            <span
              key={tag}
              style={{
                background: 'rgba(52, 211, 153, 0.1)',
                color: '#34D399',
                fontSize: '10px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(52, 211, 153, 0.2)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ScheduleMockup() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  const crews = ['Mike T.', 'Sarah L.', 'Team B']
  const blocks = [
    { crew: 0, day: 0, span: 3, label: 'Oak Street Patio', color: '#22C55E' },
    { crew: 0, day: 3, span: 2, label: 'Elm Court Sod', color: '#F59E0B' },
    { crew: 1, day: 0, span: 2, label: 'Riverside Wall', color: '#3B82F6' },
    { crew: 1, day: 2, span: 3, label: 'Pine Valley Grade', color: '#8B5CF6' },
    { crew: 2, day: 1, span: 2, label: 'Equipment Maint.', color: '#EF4444' },
    { crew: 2, day: 3, span: 2, label: 'Oak Street Cleanup', color: '#22C55E' },
  ]

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '560px',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>Crew Schedule — This Week</div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
          <div />
          {days.map((d) => (
            <div key={d} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        {/* Crew rows */}
        {crews.map((crew, ci) => (
          <div key={crew} style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 1fr)', gap: '4px', marginBottom: '6px', position: 'relative' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>{crew}</div>
            {days.map((_, di) => (
              <div key={di} style={{ height: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }} />
            ))}
            {/* Overlay blocks */}
            {blocks.filter((b) => b.crew === ci).map((b, bi) => (
              <div
                key={bi}
                style={{
                  position: 'absolute',
                  left: `calc(70px + ${(b.day / 5) * (100 - 14)}% + ${b.day * 4}px)`,
                  width: `calc(${(b.span / 5) * (100 - 14)}% + ${(b.span - 1) * 4}px)`,
                  top: 0,
                  height: '32px',
                  background: `${b.color}22`,
                  border: `1px solid ${b.color}44`,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '8px',
                  fontSize: '9px',
                  color: b.color,
                  fontWeight: 600,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MaterialMockup() {
  const items = [
    { name: 'Belgard Pavers — Catalina', qty: '480 sq ft', cost: '$3,360', stock: 'In Stock' },
    { name: 'Concrete Mix 80lb bags', qty: '24 bags', cost: '$192', stock: 'In Stock' },
    { name: 'Bermuda Sod Rolls', qty: '45 rolls', cost: '$675', stock: 'Low Stock' },
    { name: 'PVC Irrigation Pipe 3/4"', qty: '200 ft', cost: '$140', stock: 'In Stock' },
  ]

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '560px',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>Material Manifest</div>
        <span style={{ fontSize: '10px', color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>Auto-generated</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 0.7fr 0.7fr 0.7fr',
              padding: '10px 20px',
              borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '11px', color: '#CBD5E1' }}>{item.name}</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>{item.qty}</span>
            <span style={{ fontSize: '11px', color: '#F1F5F9', fontWeight: 600, textAlign: 'right' }}>{item.cost}</span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 600,
                textAlign: 'right',
                color: item.stock === 'Low Stock' ? '#F59E0B' : '#22C55E',
              }}
            >
              {item.stock}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

function Navbar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)',
        background: scrolled ? 'rgba(15, 23, 42, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <span style={{ color: '#34D399', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>TerrainForge</span>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={onLogin}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Log In
        </button>
        <button
          onClick={onSignup}
          style={{
            background: '#2D6A4F',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 0 20px rgba(45,106,79,0.3)',
          }}
        >
          Start Free Trial
        </button>
      </div>
    </nav>
  )
}

function Hero({ onSignup }: { onSignup: () => void }) {
  const parallax = useParallax(0.15)
  const reducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const fadeIn = (delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(30px)',
          transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        }

  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px clamp(16px, 4vw, 48px) 60px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0F172A 0%, #0C1220 60%, #0F172A 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(45,106,79,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '800px' }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            borderRadius: '100px',
            padding: '6px 16px',
            marginBottom: '28px',
            ...fadeIn(0),
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>Built for landscaping contractors</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 700,
            color: '#F1F5F9',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
            ...fadeIn(150),
          }}
        >
          Stop losing money<br />on every job.
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: '560px',
            margin: '0 auto 40px',
            ...fadeIn(300),
          }}
        >
          AI-powered project setup, real-time budgets, material manifests, and crew scheduling — all in one app built for contractors.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', ...fadeIn(450) }}>
          <button
            onClick={onSignup}
            style={{
              background: '#2D6A4F',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 36px',
              fontSize: '17px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(45,106,79,0.4), 0 4px 12px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            Start Your Free Trial
          </button>
          <a
            href="#features"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '16px',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '16px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s ease',
            }}
          >
            See how it works
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </a>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '16px', ...fadeIn(600) }}>
          14 days free. No credit card required.
        </p>
      </div>

      {/* Dashboard mockup with parallax */}
      <div
        ref={parallax.ref}
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: '60px',
          width: '100%',
          maxWidth: '960px',
          ...parallax.style,
          ...fadeIn(600),
        }}
      >
        <DashboardMockup />
        {/* Fade-out gradient at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '80px',
            background: 'linear-gradient(transparent, #0F172A)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </section>
  )
}

function PainPoints() {
  const { ref, getItemStyle } = useStaggerReveal(3, 150)
  const reveal = useScrollReveal()

  const points = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="14" cy="14" r="12" /><path d="M14 8v6l4 2" />
        </svg>
      ),
      pain: 'Material lists take 3+ hours per job',
      fix: 'AI generates manifests from a project description in minutes. Waste reserve built in.',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
          <path d="M5 19l7-7 4 4 7-7" /><path d="M17 9h5v5" />
        </svg>
      ),
      pain: "No idea if you're making money until the job is done",
      fix: 'Real-time budget tracking with margin guidance. Know your profit before you break ground.',
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round">
          <rect x="4" y="4" width="20" height="20" rx="4" /><path d="M4 12h20" /><path d="M12 4v20" />
        </svg>
      ),
      pain: 'Crew calls you 5 times a day asking what to do',
      fix: 'Auto-generated work orders with checklists. Crew checks in from their phone.',
    },
  ]

  return (
    <section style={{ padding: '120px clamp(16px, 4vw, 48px)', background: '#0F172A' }}>
      <div ref={reveal.ref} style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 60px', ...reveal.style }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Sound familiar?
        </h2>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Every landscaping contractor hits the same walls. TerrainForge was built to break through them.
        </p>
      </div>

      <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '32px 28px',
              ...getItemStyle(i),
            }}
          >
            <div style={{ marginBottom: '20px' }}>{p.icon}</div>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: '16px', fontStyle: 'italic' }}>
              &ldquo;{p.pain}&rdquo;
            </p>
            <div style={{ width: '32px', height: '2px', background: '#34D399', borderRadius: '1px', marginBottom: '16px' }} />
            <p style={{ fontSize: '15px', color: '#CBD5E1', lineHeight: 1.6, fontWeight: 500 }}>
              {p.fix}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

interface FeatureDeepDiveProps {
  badge: string
  title: string
  description: string
  bullets: string[]
  mockup: React.ReactNode
  reversed?: boolean
}

function FeatureDeepDive({ badge, title, description, bullets, mockup, reversed }: FeatureDeepDiveProps) {
  const reveal = useScrollReveal()
  const mockupReveal = useScrollReveal(0.2)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
        gap: 'clamp(40px, 6vw, 80px)',
        alignItems: 'center',
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '80px 0',
      }}
    >
      <div ref={reveal.ref} style={{ order: reversed ? 2 : 1, ...reveal.style }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 700,
            color: '#34D399',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            marginBottom: '16px',
          }}
        >
          {badge}
        </span>
        <h3 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '16px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '24px' }}>
          {description}
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: '#CBD5E1', lineHeight: 1.5 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="10" cy="10" r="10" fill="rgba(52,211,153,0.12)" />
                <path d="M6 10l3 3 5-5" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div ref={mockupReveal.ref} style={{ order: reversed ? 1 : 2, display: 'flex', justifyContent: 'center', ...mockupReveal.style }}>
        {mockup}
      </div>
    </div>
  )
}

function Features() {
  return (
    <section
      id="features"
      style={{
        padding: '40px clamp(16px, 4vw, 48px) 80px',
        background: 'linear-gradient(180deg, #0F172A 0%, #0C1220 50%, #0F172A 100%)',
      }}
    >
      <FeatureDeepDive
        badge="AI-Powered Setup"
        title="Describe the job. Get a full project plan."
        description="Tell TerrainForge what the client wants and our AI wizard generates zones, materials, tasks, and a budget estimate — all in under 5 minutes."
        bullets={[
          'Natural language project descriptions',
          'Auto-generates material manifests with waste reserves',
          'Suggests tasks, timelines, and crew requirements',
          'Review and adjust before accepting — you stay in control',
        ]}
        mockup={<WizardMockup />}
      />

      <FeatureDeepDive
        badge="Crew Scheduling"
        title="Know who's where, every day."
        description="Drag-and-drop crew scheduling with real-time availability. Your team sees their assignments on their phone before they leave the shop."
        bullets={[
          'Weekly and daily views with drag-and-drop',
          'Crew sees assignments on mobile',
          'Conflict detection when double-booking',
          'Equipment assignment per project',
        ]}
        mockup={<ScheduleMockup />}
        reversed
      />

      <FeatureDeepDive
        badge="Materials & Budget"
        title="Every bolt counted. Every dollar tracked."
        description="Zone-by-zone material calculations with built-in waste reserves. Real-time budget tracking shows margin before, during, and after the job."
        bullets={[
          'Auto-calculated quantities from zone measurements',
          '10-15% waste reserve built into every line item',
          'Quote vs. actual cost tracking in real time',
          'Export PDF manifests and crew packets',
        ]}
        mockup={<MaterialMockup />}
      />
    </section>
  )
}

function Stats() {
  const { ref, getItemStyle } = useStaggerReveal(4, 100)

  const stats = [
    { value: '5 min', label: 'Average project setup time' },
    { value: '6-in-1', label: 'Tools replaced' },
    { value: '34%', label: 'Average margin improvement' },
    { value: '14 days', label: 'Free trial, no card needed' },
  ]

  return (
    <section style={{ padding: '100px clamp(16px, 4vw, 48px)', background: '#0F172A' }}>
      <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', maxWidth: '900px', margin: '0 auto' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: 'center', ...getItemStyle(i) }}>
            <div style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, color: '#34D399', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Testimonial() {
  const reveal = useScrollReveal()

  return (
    <section style={{ padding: '80px clamp(16px, 4vw, 48px)', background: 'linear-gradient(180deg, #0F172A, #0C1220)' }}>
      <div
        ref={reveal.ref}
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          textAlign: 'center',
          ...reveal.style,
        }}
      >
        <div style={{ fontSize: '48px', color: '#34D399', lineHeight: 1, marginBottom: '24px', opacity: 0.4 }}>&ldquo;</div>
        <p style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', color: '#CBD5E1', lineHeight: 1.6, fontWeight: 400, fontStyle: 'italic', marginBottom: '24px' }}>
          I used to spend half my Sunday doing material lists. Now I describe the job and TerrainForge does it in minutes. My margins are up and my weekends are back.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#34D399', fontWeight: 600 }}>
            M
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', color: '#F1F5F9', fontWeight: 600 }}>Mike Thompson</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Thompson Landscaping, Dallas TX</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pricing({ onSignup }: { onSignup: () => void }) {
  const reveal = useScrollReveal()
  const { ref: cardsRef, getItemStyle } = useStaggerReveal(3, 120)

  const plans = [
    {
      name: 'Starter',
      price: 49,
      annual: 490,
      tagline: 'For solo operators',
      features: ['5 active projects', '1 user', 'All core features', 'Email support'],
      highlight: false,
    },
    {
      name: 'Pro',
      price: 99,
      annual: 990,
      tagline: 'For small companies',
      features: ['25 active projects', '5 users', 'All core features', 'Priority support', 'PDF exports'],
      highlight: true,
    },
    {
      name: 'Business',
      price: 199,
      annual: 1990,
      tagline: 'For established teams',
      features: ['Unlimited projects', '15 users', 'All core features', 'Onboarding call', 'Custom branding'],
      highlight: false,
    },
  ]

  return (
    <section style={{ padding: '120px clamp(16px, 4vw, 48px)', background: '#0F172A' }}>
      <div ref={reveal.ref} style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 60px', ...reveal.style }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Simple pricing. Cancel anytime.
        </h2>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Every plan includes a 14-day free trial. No credit card required.
        </p>
      </div>

      <div ref={cardsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            style={{
              background: plan.highlight ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)',
              border: plan.highlight ? '1px solid rgba(52,211,153,0.25)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: plan.highlight ? '40px 32px 32px' : '32px',
              position: 'relative',
              ...getItemStyle(i),
            }}
          >
            {plan.highlight && (
              <span
                style={{
                  position: 'absolute',
                  top: '-13px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#2D6A4F',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 16px',
                  borderRadius: '100px',
                  letterSpacing: '0.5px',
                }}
              >
                Most Popular
              </span>
            )}

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>{plan.name}</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>{plan.tagline}</p>

            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontSize: '40px', fontWeight: 700, color: '#F1F5F9' }}>${plan.price}</span>
              <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)' }}>/mo</span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '24px' }}>
              or ${plan.annual.toLocaleString()}/yr (save 2 months)
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.features.map((feat) => (
                <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#CBD5E1' }}>
                  <span style={{ color: '#34D399', fontWeight: 700 }}>&#10003;</span>
                  {feat}
                </li>
              ))}
            </ul>

            <button
              onClick={onSignup}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: plan.highlight ? '#2D6A4F' : 'transparent',
                color: plan.highlight ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Start Free Trial
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function FinalCTA({ onSignup }: { onSignup: () => void }) {
  const reveal = useScrollReveal()

  return (
    <section
      style={{
        padding: '120px clamp(16px, 4vw, 48px)',
        background: 'linear-gradient(180deg, #0C1220 0%, #0F172A 100%)',
        textAlign: 'center',
      }}
    >
      <div ref={reveal.ref} style={{ maxWidth: '600px', margin: '0 auto', ...reveal.style }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Ready to run your jobs smarter?
        </h2>
        <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: '40px' }}>
          Join contractors who spend less time on spreadsheets and more time building.
        </p>
        <button
          onClick={onSignup}
          style={{
            background: '#2D6A4F',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '18px 48px',
            fontSize: '18px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 40px rgba(45,106,79,0.4), 0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          Start Your Free Trial
        </button>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '16px' }}>
          14 days free. No credit card. Cancel anytime.
        </p>
      </div>
    </section>
  )
}

function Footer({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <footer
      style={{
        padding: '40px clamp(16px, 4vw, 48px)',
        background: '#0F172A',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div>
        <span style={{ color: '#34D399', fontWeight: 700, fontSize: '18px' }}>TerrainForge</span>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Built for contractors who build.</p>
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <button
          onClick={onLogin}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer' }}
        >
          Log In
        </button>
        <button
          onClick={onSignup}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer' }}
        >
          Sign Up
        </button>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const navigate = useNavigate()
  const goLogin = () => navigate('/login')
  const goSignup = () => navigate('/signup')

  return (
    <div style={{ background: '#0F172A', color: '#F1F5F9', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Navbar onLogin={goLogin} onSignup={goSignup} />
      <Hero onSignup={goSignup} />
      <PainPoints />
      <Features />
      <Stats />
      <Testimonial />
      <Pricing onSignup={goSignup} />
      <FinalCTA onSignup={goSignup} />
      <Footer onLogin={goLogin} onSignup={goSignup} />
    </div>
  )
}
