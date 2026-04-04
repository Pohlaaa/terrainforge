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
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
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
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
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
   BRAND PALETTE
   ═══════════════════════════════════════════════════════════════════════════ */

const C = {
  // Backgrounds — deep forest/charcoal tones, not pure navy
  bg: '#0B1A14',
  bgAlt: '#0E2018',
  bgCard: '#132A1F',
  bgCardHover: '#183626',
  // Green brand
  green: '#34D399',
  greenDark: '#2D6A4F',
  greenMuted: 'rgba(52, 211, 153, 0.12)',
  greenBorder: 'rgba(52, 211, 153, 0.25)',
  greenGlow: 'rgba(45, 106, 79, 0.35)',
  // Text
  heading: '#F0FDF4',
  body: 'rgba(240, 253, 244, 0.65)',
  muted: 'rgba(240, 253, 244, 0.4)',
  subtle: 'rgba(240, 253, 244, 0.25)',
  // Accents
  blue: '#3B82F6',
  amber: '#F59E0B',
  purple: '#8B5CF6',
  red: '#EF4444',
  // Borders/surfaces
  border: 'rgba(52, 211, 153, 0.08)',
  borderHover: 'rgba(52, 211, 153, 0.18)',
  surface: 'rgba(255,255,255,0.03)',
  surfaceHover: 'rgba(255,255,255,0.06)',
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   MOCKUP COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function DashboardMockup({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bg} 100%)`,
        borderRadius: '16px',
        border: `1px solid ${C.border}`,
        boxShadow: `0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px ${C.border} inset`,
        overflow: 'hidden',
        width: '100%',
        maxWidth: '960px',
      }}
    >
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: C.red }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: C.amber }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: C.green }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: C.muted, fontWeight: 500 }}>
          TerrainForge — Projects Dashboard
        </div>
      </div>

      {/* Nav bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '10px 20px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: C.green, fontWeight: 700, fontSize: '13px' }}>TF</span>
        <span style={{ color: C.green, fontSize: '12px', fontWeight: 600, borderBottom: `2px solid ${C.green}`, paddingBottom: '6px' }}>Projects</span>
        <span style={{ color: C.muted, fontSize: '12px' }}>Budget</span>
        <span style={{ color: C.muted, fontSize: '12px' }}>Materials</span>
        <span style={{ color: C.muted, fontSize: '12px' }}>Crew</span>
      </div>

      {/* Content area */}
      <div style={{ padding: '20px' }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Active Projects', value: '12', color: C.green },
            { label: 'Total Revenue', value: '$284K', color: C.blue },
            { label: 'Crew Deployed', value: '8/10', color: C.amber },
            { label: 'Avg Margin', value: '34%', color: C.purple },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: C.surface,
                borderRadius: '10px',
                padding: '14px 16px',
                borderLeft: `3px solid ${kpi.color}`,
              }}
            >
              <div style={{ fontSize: '10px', color: C.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: C.heading }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
          <div style={{ background: C.surface, borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '12px' }}>Project Progress</div>
            <svg width="100%" viewBox="0 0 400 120" style={{ display: 'block' }}>
              {[
                { name: 'Oak Street', pct: 85, color: C.green },
                { name: 'Riverside Dr', pct: 60, color: C.blue },
                { name: 'Elm Court', pct: 40, color: C.amber },
                { name: 'Pine Valley', pct: 25, color: C.purple },
              ].map((p, i) => (
                <g key={p.name}>
                  <text x="0" y={i * 28 + 16} fill={C.muted} fontSize="10">{p.name}</text>
                  <rect x="100" y={i * 28 + 4} width="260" height="16" rx="4" fill={C.surfaceHover} />
                  <rect x="100" y={i * 28 + 4} width={260 * (p.pct / 100)} height="16" rx="4" fill={p.color} opacity="0.8" />
                  <text x={100 + 260 * (p.pct / 100) + 8} y={i * 28 + 16} fill={C.body} fontSize="10">{p.pct}%</text>
                </g>
              ))}
            </svg>
          </div>

          <div style={{ background: C.surface, borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '11px', color: C.muted, marginBottom: '12px', alignSelf: 'flex-start' }}>Revenue vs Cost</div>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke={C.surfaceHover} strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={C.green} strokeWidth="12" strokeDasharray="220 94" strokeLinecap="round" transform="rotate(-90 60 60)" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={C.blue} strokeWidth="12" strokeDasharray="70 244" strokeLinecap="round" transform="rotate(163 60 60)" />
              <text x="60" y="56" textAnchor="middle" fill={C.heading} fontSize="16" fontWeight="700">$284K</text>
              <text x="60" y="72" textAnchor="middle" fill={C.muted} fontSize="9">Revenue</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function WizardMockup() {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bg} 100%)`,
      borderRadius: '16px', border: `1px solid ${C.border}`,
      boxShadow: `0 25px 60px rgba(0,0,0,0.5)`,
      overflow: 'hidden', width: '100%', maxWidth: '560px',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: C.heading, marginBottom: '4px' }}>AI Project Wizard</div>
        <div style={{ fontSize: '11px', color: C.muted }}>Describe your project and let AI build it for you</div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ alignSelf: 'flex-end', background: C.greenDark, borderRadius: '12px 12px 4px 12px', padding: '10px 14px', maxWidth: '80%' }}>
            <p style={{ fontSize: '12px', color: C.heading, margin: 0, lineHeight: 1.5 }}>
              I need a full backyard renovation — new patio, retaining wall, sod, and irrigation for a 4,000 sq ft yard.
            </p>
          </div>
          <div style={{ alignSelf: 'flex-start', background: C.surfaceHover, borderRadius: '12px 12px 12px 4px', padding: '10px 14px', maxWidth: '85%' }}>
            <p style={{ fontSize: '12px', color: C.body, margin: 0, lineHeight: 1.5 }}>
              I&apos;ve generated your project with 23 material line items and 12 tasks. Estimated budget: <span style={{ color: C.green, fontWeight: 600 }}>$18,400</span>. Shall I adjust anything?
            </p>
          </div>
        </div>
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['23 Materials', '12 Tasks', '$18.4K Budget', '3 Suppliers matched'].map((tag) => (
            <span key={tag} style={{
              background: C.greenMuted, color: C.green, fontSize: '10px', fontWeight: 600,
              padding: '4px 10px', borderRadius: '20px', border: `1px solid ${C.greenBorder}`,
            }}>
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
    { crew: 0, day: 0, span: 3, label: 'Oak Street Patio', color: C.green },
    { crew: 0, day: 3, span: 2, label: 'Elm Court Sod', color: C.amber },
    { crew: 1, day: 0, span: 2, label: 'Riverside Wall', color: C.blue },
    { crew: 1, day: 2, span: 3, label: 'Pine Valley Grade', color: C.purple },
    { crew: 2, day: 1, span: 2, label: 'Equipment Maint.', color: C.red },
    { crew: 2, day: 3, span: 2, label: 'Oak Street Cleanup', color: C.green },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bg} 100%)`,
      borderRadius: '16px', border: `1px solid ${C.border}`,
      boxShadow: `0 25px 60px rgba(0,0,0,0.5)`,
      overflow: 'hidden', width: '100%', maxWidth: '560px',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: C.heading }}>Crew Schedule — This Week</div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
          <div />
          {days.map((d) => (
            <div key={d} style={{ fontSize: '10px', color: C.muted, textAlign: 'center', fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        {crews.map((crew, ci) => (
          <div key={crew} style={{ display: 'grid', gridTemplateColumns: '70px repeat(5, 1fr)', gap: '4px', marginBottom: '6px', position: 'relative' }}>
            <div style={{ fontSize: '11px', color: C.body, display: 'flex', alignItems: 'center' }}>{crew}</div>
            {days.map((_, di) => (
              <div key={di} style={{ height: '32px', background: C.surface, borderRadius: '4px' }} />
            ))}
            {blocks.filter((b) => b.crew === ci).map((b, bi) => (
              <div
                key={bi}
                style={{
                  position: 'absolute',
                  left: `calc(70px + ${(b.day / 5) * (100 - 14)}% + ${b.day * 4}px)`,
                  width: `calc(${(b.span / 5) * (100 - 14)}% + ${(b.span - 1) * 4}px)`,
                  top: 0, height: '32px',
                  background: `${b.color}22`, border: `1px solid ${b.color}44`,
                  borderRadius: '6px', display: 'flex', alignItems: 'center',
                  paddingLeft: '8px', fontSize: '9px', color: b.color,
                  fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap',
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
    { name: 'Belgard Catalina Pavers', qty: '480 sq ft', cost: '$3,360', status: 'Ordered', statusColor: C.green },
    { name: 'Class 5 Gravel Base', qty: '12 tons', cost: '$540', status: 'Pending', statusColor: C.amber },
    { name: 'Bermuda Sod Rolls', qty: '45 rolls', cost: '$675', status: 'Low Stock', statusColor: C.red },
    { name: 'PVC Irrigation Pipe 3/4"', qty: '200 ft', cost: '$140', status: 'In Stock', statusColor: C.green },
    { name: 'Polymeric Sand', qty: '8 bags', cost: '$192', status: 'In Stock', statusColor: C.green },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bg} 100%)`,
      borderRadius: '16px', border: `1px solid ${C.border}`,
      boxShadow: `0 25px 60px rgba(0,0,0,0.5)`,
      overflow: 'hidden', width: '100%', maxWidth: '560px',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.heading }}>Material Manifest</div>
          <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>Oak Street Patio — 5 line items, $4,907 total</div>
        </div>
        <span style={{ fontSize: '10px', color: C.green, background: C.greenMuted, padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>AI-generated</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.6fr 0.7fr',
              padding: '10px 20px',
              borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '11px', color: C.body }}>{item.name}</span>
            <span style={{ fontSize: '11px', color: C.muted, textAlign: 'right' }}>{item.qty}</span>
            <span style={{ fontSize: '11px', color: C.heading, fontWeight: 600, textAlign: 'right' }}>{item.cost}</span>
            <span style={{ fontSize: '9px', fontWeight: 600, textAlign: 'right', color: item.statusColor }}>{item.status}</span>
          </div>
        ))}
      </div>
      {/* Waste reserve callout */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: C.muted }}>Includes 10-15% waste reserve per line item</span>
        <span style={{ fontSize: '11px', color: C.heading, fontWeight: 700 }}>$4,907</span>
      </div>
    </div>
  )
}

function SupplierMockup() {
  const suppliers = [
    { name: 'Gertens Garden Center', type: 'Garden Center / Nursery', cats: ['Plants', 'Mulch', 'Pavers', 'Stone'], dist: '4.2 mi' },
    { name: 'Hedberg Landscape Supply', type: 'Landscape Supply', cats: ['Gravel', 'Sand', 'Stone', 'Mulch'], dist: '7.8 mi' },
    { name: 'SiteOne Landscape Supply', type: 'Landscape Supply', cats: ['Irrigation', 'Edging', 'Sod'], dist: '11.3 mi' },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bg} 100%)`,
      borderRadius: '16px', border: `1px solid ${C.border}`,
      boxShadow: `0 25px 60px rgba(0,0,0,0.5)`,
      overflow: 'hidden', width: '100%', maxWidth: '560px',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: C.heading }}>Local Suppliers Found</div>
        <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>3 suppliers within 15 miles of your location</div>
      </div>
      <div style={{ padding: '8px 12px' }}>
        {suppliers.map((s, i) => (
          <div key={i} style={{
            padding: '12px', borderRadius: '10px', marginBottom: i < suppliers.length - 1 ? '6px' : 0,
            background: C.surface, border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.heading }}>{s.name}</span>
                <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>{s.type} &middot; {s.dist}</div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, color: C.green, cursor: 'pointer', flexShrink: 0 }}>+ Add</span>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {s.cats.map(c => (
                <span key={c} style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '4px', background: C.surfaceHover, color: C.body }}>{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EquipmentMockup() {
  const items = [
    { name: 'Bobcat S650', type: 'Skid Steer Loader', rate: '$85/hr', status: 'Deployed', project: 'Oak Street' },
    { name: 'CAT 303.5', type: 'Mini Excavator', rate: '$95/hr', status: 'Available', project: '' },
    { name: 'Vermeer BC1000', type: 'Brush Chipper', rate: '$60/hr', status: 'Maintenance', project: '' },
  ]

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bgCard} 0%, ${C.bg} 100%)`,
      borderRadius: '16px', border: `1px solid ${C.border}`,
      boxShadow: `0 25px 60px rgba(0,0,0,0.5)`,
      overflow: 'hidden', width: '100%', maxWidth: '560px',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: C.heading }}>Equipment Fleet</div>
        <span style={{ fontSize: '10px', color: C.muted }}>278 models in library</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px',
            borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: C.heading }}>{item.name}</span>
              <div style={{ fontSize: '10px', color: C.muted }}>{item.type} &middot; {item.rate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize: '9px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                color: item.status === 'Deployed' ? C.blue : item.status === 'Available' ? C.green : C.amber,
                background: item.status === 'Deployed' ? `${C.blue}18` : item.status === 'Available' ? C.greenMuted : `${C.amber}18`,
              }}>{item.status}</span>
              {item.project && <div style={{ fontSize: '9px', color: C.muted, marginTop: '3px' }}>{item.project}</div>}
            </div>
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
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 clamp(16px, 4vw, 48px)',
      background: scrolled ? `rgba(11, 26, 20, 0.9)` : 'transparent',
      backdropFilter: scrolled ? 'blur(20px) saturate(1.4)' : 'none',
      borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <span style={{ color: C.green, fontWeight: 700, fontSize: '20px', letterSpacing: '-0.02em' }}>TerrainForge</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['Features', 'Pricing'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase()}`}
              style={{ color: C.body, fontSize: '14px', fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={onLogin} style={{
          background: 'transparent', color: C.body,
          border: `1px solid ${C.borderHover}`, borderRadius: '8px',
          padding: '8px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease',
        }}>
          Log In
        </button>
        <button onClick={onSignup} style={{
          background: C.greenDark, color: 'white', border: 'none', borderRadius: '8px',
          padding: '8px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
          boxShadow: `0 0 20px ${C.greenGlow}`,
        }}>
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
    reducedMotion ? {} : {
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(30px)',
      transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    }

  return (
    <section style={{
      position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '120px clamp(16px, 4vw, 48px) 60px', overflow: 'hidden',
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgAlt} 50%, ${C.bg} 100%)`,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: '900px', height: '600px',
        background: `radial-gradient(ellipse, ${C.greenGlow} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '820px' }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          border: `1px solid ${C.greenBorder}`, borderRadius: '100px',
          padding: '6px 16px', marginBottom: '28px', ...fadeIn(0),
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: '13px', color: C.body, fontWeight: 500 }}>Built for landscaping contractors</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 700, color: C.heading,
          lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '24px', ...fadeIn(150),
        }}>
          From project idea to<br />material manifest in<br /><span style={{ color: C.green }}>five minutes</span>.
        </h1>

        <p style={{
          fontSize: 'clamp(16px, 2.2vw, 20px)', color: C.body, lineHeight: 1.6,
          maxWidth: '580px', margin: '0 auto 40px', ...fadeIn(300),
        }}>
          AI-powered project setup, automatic material calculations, local supplier matching, crew scheduling, and real-time budget tracking — all in one app that replaces your spreadsheets.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', ...fadeIn(450) }}>
          <button onClick={onSignup} style={{
            background: C.greenDark, color: 'white', border: 'none', borderRadius: '12px',
            padding: '16px 36px', fontSize: '17px', fontWeight: 600, cursor: 'pointer',
            boxShadow: `0 0 30px ${C.greenGlow}, 0 4px 12px rgba(0,0,0,0.3)`, transition: 'all 0.2s ease',
          }}>
            Start Your Free Trial
          </button>
          <a href="#features" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            color: C.body, fontSize: '16px', fontWeight: 500, textDecoration: 'none',
            padding: '16px 24px', borderRadius: '12px', border: `1px solid ${C.borderHover}`, transition: 'all 0.2s ease',
          }}>
            See how it works
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </a>
        </div>

        <p style={{ color: C.subtle, fontSize: '13px', marginTop: '16px', ...fadeIn(600) }}>
          14 days free. No credit card required.
        </p>
      </div>

      {/* Dashboard mockup */}
      <div
        ref={parallax.ref}
        style={{
          position: 'relative', zIndex: 1, marginTop: '60px',
          width: '100%', maxWidth: '960px', ...parallax.style, ...fadeIn(600),
        }}
      >
        <DashboardMockup />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
          background: `linear-gradient(transparent, ${C.bg})`, pointerEvents: 'none',
        }} />
      </div>
    </section>
  )
}

function PainPoints() {
  const { ref, getItemStyle } = useStaggerReveal(4, 120)
  const reveal = useScrollReveal()

  const points = [
    {
      emoji: '\u{23F1}',
      pain: 'Material lists take 3+ hours per job',
      fix: 'AI generates manifests from a project description in minutes — waste reserves included.',
    },
    {
      emoji: '\u{1F4B8}',
      pain: "No idea if you're profitable until the job is done",
      fix: 'Real-time budget tracking with margin guidance. Know your profit before you break ground.',
    },
    {
      emoji: '\u{1F4DE}',
      pain: 'Crew calls you 5 times a day asking what to do',
      fix: 'Auto-generated work orders with checklists. Crew checks in from their phone.',
    },
    {
      emoji: '\u{1F4CB}',
      pain: 'Supplier lists live in your head (or a napkin)',
      fix: 'Auto-discover local suppliers, match them to material categories, and track who supplies what.',
    },
  ]

  return (
    <section style={{ padding: '120px clamp(16px, 4vw, 48px)', background: C.bg }}>
      <div ref={reveal.ref} style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 60px', ...reveal.style }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: C.heading, letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Sound familiar?
        </h2>
        <p style={{ fontSize: '17px', color: C.body, lineHeight: 1.6 }}>
          Every landscaping contractor hits the same walls. TerrainForge was built to break through them.
        </p>
      </div>

      <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
        {points.map((p, i) => (
          <div key={i} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px 24px',
            ...getItemStyle(i),
          }}>
            <div style={{ fontSize: '28px', marginBottom: '16px' }}>{p.emoji}</div>
            <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.6, marginBottom: '14px', fontStyle: 'italic' }}>
              &ldquo;{p.pain}&rdquo;
            </p>
            <div style={{ width: '32px', height: '2px', background: C.green, borderRadius: '1px', marginBottom: '14px' }} />
            <p style={{ fontSize: '14px', color: C.body, lineHeight: 1.6, fontWeight: 500 }}>{p.fix}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

interface FeatureProps {
  badge: string
  title: string
  description: string
  bullets: string[]
  mockup: React.ReactNode
  reversed?: boolean
}

function FeatureDeepDive({ badge, title, description, bullets, mockup, reversed }: FeatureProps) {
  const reveal = useScrollReveal()
  const mockupReveal = useScrollReveal(0.2)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
      gap: 'clamp(40px, 6vw, 80px)', alignItems: 'center',
      maxWidth: '1100px', margin: '0 auto', padding: '80px 0',
    }}>
      <div ref={reveal.ref} style={{ order: reversed ? 2 : 1, ...reveal.style }}>
        <span style={{
          display: 'inline-block', fontSize: '11px', fontWeight: 700, color: C.green,
          textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px',
        }}>
          {badge}
        </span>
        <h3 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: C.heading, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '16px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '16px', color: C.body, lineHeight: 1.7, marginBottom: '24px' }}>{description}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14px', color: C.body, lineHeight: 1.5 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: '2px' }}>
                <circle cx="10" cy="10" r="10" fill={C.greenMuted} />
                <path d="M6 10l3 3 5-5" stroke={C.green} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    <section id="features" style={{
      padding: '40px clamp(16px, 4vw, 48px) 80px',
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgAlt} 50%, ${C.bg} 100%)`,
    }}>
      <FeatureDeepDive
        badge="AI-Powered Setup"
        title="Describe the job. Get a full project plan."
        description="Tell TerrainForge what the client wants and our AI wizard generates materials, tasks, and a budget estimate — all in under 5 minutes."
        bullets={[
          'Natural language project descriptions — no forms to fill out',
          'Auto-generates material manifests with built-in waste reserves',
          'Suggests tasks, timelines, and crew requirements',
          'Review and adjust before accepting — you stay in control',
        ]}
        mockup={<WizardMockup />}
      />

      <FeatureDeepDive
        badge="Material Management"
        title="Every bag, pallet, and roll — counted and costed."
        description="AI-generated material manifests with quantities calculated from your project specs. Track what's ordered, what's on site, and what's still needed. Waste reserves are built into every line item so you never come up short."
        bullets={[
          'Auto-calculated quantities from project measurements',
          '10-15% waste reserve on every line item',
          'Org-wide material library with pricing history',
          'Export PDF manifests for suppliers and crew packets',
          'Categories auto-tagged for supplier matching',
        ]}
        mockup={<MaterialMockup />}
        reversed
      />

      <FeatureDeepDive
        badge="Supplier Discovery"
        title="Find your local suppliers automatically."
        description="Hit one button and TerrainForge searches for garden centers, stone yards, lumber yards, and building supply stores near your location. Results are auto-tagged with material categories so you know exactly who supplies what."
        bullets={[
          'One-click location-based supplier search',
          'Auto-tags suppliers with material categories (pavers, mulch, sod, etc.)',
          'National directory of major landscape suppliers',
          'Mark existing suppliers or add new ones instantly',
          'Custom supplier entry for local favorites',
        ]}
        mockup={<SupplierMockup />}
      />

      <FeatureDeepDive
        badge="Crew & Equipment"
        title="Know who's where and what's available."
        description="Manage your crew roster and equipment fleet in one place. 278 equipment models pre-loaded with hourly rates. Drag-and-drop scheduling shows who's assigned where before they leave the shop."
        bullets={[
          'Crew profiles with skills, certifications, and pay rates',
          '278-model equipment library (Bobcat, CAT, John Deere, etc.)',
          'Track deployment status: available, deployed, or in maintenance',
          'Equipment costs automatically flow into project budgets',
        ]}
        mockup={<EquipmentMockup />}
        reversed
      />

      <FeatureDeepDive
        badge="Scheduling"
        title="Your week at a glance. Conflicts caught."
        description="Drag-and-drop crew scheduling with real-time availability. Your team sees their assignments on their phone before they leave the shop."
        bullets={[
          'Weekly and daily calendar views with drag-and-drop',
          'Crew sees assignments on mobile',
          'Conflict detection when double-booking',
          'Equipment assignment per project',
        ]}
        mockup={<ScheduleMockup />}
      />
    </section>
  )
}

function HowItWorks() {
  const { ref, getItemStyle } = useStaggerReveal(5, 100)
  const reveal = useScrollReveal()

  const steps = [
    { num: '1', title: 'Set up your company', desc: 'Add your company name, crew members, equipment, and connect local suppliers.' },
    { num: '2', title: 'Create a project with AI', desc: 'Describe the job in plain English. AI generates materials, tasks, and a budget.' },
    { num: '3', title: 'Review and refine', desc: 'Adjust quantities, swap materials, tweak the budget. Accept when it looks right.' },
    { num: '4', title: 'Assign crew and schedule', desc: 'Drag crew to the calendar. They see assignments on their phone instantly.' },
    { num: '5', title: 'Track margins in real time', desc: 'Watch actual costs against estimates. Know your profit before the job wraps.' },
  ]

  return (
    <section style={{ padding: '120px clamp(16px, 4vw, 48px)', background: C.bg }}>
      <div ref={reveal.ref} style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 60px', ...reveal.style }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: C.heading, letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Up and running in an afternoon
        </h2>
        <p style={{ fontSize: '17px', color: C.body, lineHeight: 1.6 }}>
          Our guided onboarding walks you through setup in 5 steps. Most contractors are creating their first project within 15 minutes.
        </p>
      </div>

      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto' }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', gap: '20px', alignItems: 'flex-start',
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 24px',
            ...getItemStyle(i),
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: C.greenMuted, border: `1px solid ${C.greenBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: 700, color: C.green,
            }}>
              {s.num}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: C.heading, marginBottom: '4px' }}>{s.title}</div>
              <div style={{ fontSize: '14px', color: C.body, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Stats() {
  const { ref, getItemStyle } = useStaggerReveal(4, 100)

  const stats = [
    { value: '5 min', label: 'Average project setup time' },
    { value: '278', label: 'Equipment models in library' },
    { value: '6-in-1', label: 'Tools replaced' },
    { value: '14 days', label: 'Free trial, no card needed' },
  ]

  return (
    <section style={{ padding: '100px clamp(16px, 4vw, 48px)', background: C.bgAlt }}>
      <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', maxWidth: '900px', margin: '0 auto' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: 'center', ...getItemStyle(i) }}>
            <div style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 700, color: C.green, letterSpacing: '-0.02em', marginBottom: '8px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '14px', color: C.body, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Testimonials() {
  const { ref, getItemStyle } = useStaggerReveal(2, 150)

  const quotes = [
    {
      text: "I used to spend half my Sunday doing material lists. Now I describe the job and TerrainForge does it in minutes. My margins are up and my weekends are back.",
      name: 'Mike Thompson',
      company: 'Thompson Landscaping, Dallas TX',
      initial: 'M',
    },
    {
      text: "The supplier finder alone was worth it. I found three stone yards within 20 miles I didn't even know about. Now they're my go-to for every hardscape project.",
      name: 'Sarah Chen',
      company: 'Greenline Landscapes, Minneapolis MN',
      initial: 'S',
    },
  ]

  return (
    <section style={{ padding: '100px clamp(16px, 4vw, 48px)', background: C.bg }}>
      <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {quotes.map((q, i) => (
          <div key={i} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '32px 28px',
            ...getItemStyle(i),
          }}>
            <div style={{ fontSize: '32px', color: C.green, lineHeight: 1, marginBottom: '16px', opacity: 0.4 }}>&ldquo;</div>
            <p style={{ fontSize: '15px', color: C.body, lineHeight: 1.6, fontStyle: 'italic', marginBottom: '20px' }}>{q.text}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', background: C.greenMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', color: C.green, fontWeight: 600,
              }}>
                {q.initial}
              </div>
              <div>
                <div style={{ fontSize: '13px', color: C.heading, fontWeight: 600 }}>{q.name}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{q.company}</div>
              </div>
            </div>
          </div>
        ))}
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
      features: ['5 active projects', '1 user', 'AI project wizard', 'Material manifests', 'Supplier directory', 'Email support'],
      highlight: false,
    },
    {
      name: 'Pro',
      price: 99,
      annual: 990,
      tagline: 'For small companies',
      features: ['25 active projects', '5 users', 'All Starter features', 'Crew scheduling', 'Equipment tracking', 'Budget & margin reports', 'PDF exports', 'Priority support'],
      highlight: true,
    },
    {
      name: 'Business',
      price: 199,
      annual: 1990,
      tagline: 'For established teams',
      features: ['Unlimited projects', '15 users', 'All Pro features', 'Onboarding call', 'Custom branding', 'API access'],
      highlight: false,
    },
  ]

  return (
    <section id="pricing" style={{ padding: '120px clamp(16px, 4vw, 48px)', background: C.bgAlt }}>
      <div ref={reveal.ref} style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 60px', ...reveal.style }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: C.heading, letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Simple pricing. Cancel anytime.
        </h2>
        <p style={{ fontSize: '17px', color: C.body, lineHeight: 1.6 }}>
          Every plan includes a 14-day free trial. No credit card required.
        </p>
      </div>

      <div ref={cardsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
        {plans.map((plan, i) => (
          <div key={plan.name} style={{
            background: plan.highlight ? `rgba(52,211,153,0.04)` : C.surface,
            border: plan.highlight ? `1px solid ${C.greenBorder}` : `1px solid ${C.border}`,
            borderRadius: '16px', padding: plan.highlight ? '40px 32px 32px' : '32px',
            position: 'relative', ...getItemStyle(i),
          }}>
            {plan.highlight && (
              <span style={{
                position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                background: C.greenDark, color: 'white', fontSize: '11px', fontWeight: 700,
                padding: '5px 16px', borderRadius: '100px', letterSpacing: '0.5px',
              }}>
                Most Popular
              </span>
            )}
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: C.heading, marginBottom: '4px' }}>{plan.name}</h3>
            <p style={{ fontSize: '13px', color: C.muted, marginBottom: '20px' }}>{plan.tagline}</p>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ fontSize: '40px', fontWeight: 700, color: C.heading }}>${plan.price}</span>
              <span style={{ fontSize: '15px', color: C.muted }}>/mo</span>
            </div>
            <p style={{ fontSize: '12px', color: C.subtle, marginBottom: '24px' }}>
              or ${plan.annual.toLocaleString()}/yr (save 2 months)
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.features.map((feat) => (
                <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: C.body }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>&#10003;</span>
                  {feat}
                </li>
              ))}
            </ul>
            <button onClick={onSignup} style={{
              width: '100%', padding: '14px', borderRadius: '10px',
              border: plan.highlight ? 'none' : `1px solid ${C.borderHover}`,
              background: plan.highlight ? C.greenDark : 'transparent',
              color: plan.highlight ? 'white' : C.body,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
            }}>
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
    <section style={{
      padding: '120px clamp(16px, 4vw, 48px)',
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgAlt} 100%)`,
      textAlign: 'center',
    }}>
      <div ref={reveal.ref} style={{ maxWidth: '600px', margin: '0 auto', ...reveal.style }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: C.heading, letterSpacing: '-0.02em', marginBottom: '16px' }}>
          Ready to run your jobs smarter?
        </h2>
        <p style={{ fontSize: '17px', color: C.body, lineHeight: 1.6, marginBottom: '40px' }}>
          Join contractors who spend less time on spreadsheets and more time building. Set up your first project in 5 minutes.
        </p>
        <button onClick={onSignup} style={{
          background: C.greenDark, color: 'white', border: 'none', borderRadius: '12px',
          padding: '18px 48px', fontSize: '18px', fontWeight: 600, cursor: 'pointer',
          boxShadow: `0 0 40px ${C.greenGlow}, 0 4px 12px rgba(0,0,0,0.3)`, transition: 'all 0.2s ease',
        }}>
          Start Your Free Trial
        </button>
        <p style={{ color: C.subtle, fontSize: '13px', marginTop: '16px' }}>
          14 days free. No credit card. Cancel anytime.
        </p>
      </div>
    </section>
  )
}

function Footer({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <footer style={{
      padding: '40px clamp(16px, 4vw, 48px)', background: C.bg,
      borderTop: `1px solid ${C.border}`,
      display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
    }}>
      <div>
        <span style={{ color: C.green, fontWeight: 700, fontSize: '18px' }}>TerrainForge</span>
        <p style={{ fontSize: '13px', color: C.muted, marginTop: '4px' }}>Built for contractors who build.</p>
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        {[
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
        ].map(link => (
          <a key={link.label} href={link.href} style={{ color: C.muted, fontSize: '13px', textDecoration: 'none' }}>{link.label}</a>
        ))}
        <button onClick={onLogin} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: '13px', cursor: 'pointer' }}>
          Log In
        </button>
        <button onClick={onSignup} style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: '13px', cursor: 'pointer' }}>
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
    <div style={{ background: C.bg, color: C.heading, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Navbar onLogin={goLogin} onSignup={goSignup} />
      <Hero onSignup={goSignup} />
      <PainPoints />
      <Features />
      <HowItWorks />
      <Stats />
      <Testimonials />
      <Pricing onSignup={goSignup} />
      <FinalCTA onSignup={goSignup} />
      <Footer onLogin={goLogin} onSignup={goSignup} />
    </div>
  )
}
