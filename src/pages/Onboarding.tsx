import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgStore } from '@/stores/orgStore'
import { callClaude } from '@/services/anthropic'
import { fetchUserPreferences, upsertUserPreferences } from '@/services/preferences'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

const BUSINESS_TYPES = [
  { id: 'residential', emoji: '🏡', title: 'Residential', subtitle: 'Homes, yards, gardens' },
  { id: 'commercial', emoji: '🏢', title: 'Commercial', subtitle: 'Properties, campuses, HOAs' },
  { id: 'hardscaping', emoji: '🧱', title: 'Hardscaping', subtitle: 'Patios, walls, driveways' },
  { id: 'full-service', emoji: '🌿', title: 'Full-Service', subtitle: 'Design, install, maintain' },
]

const TEAM_SIZES = ['Just me', '2–5', '6–15', '16–25', '25+']

const ROLE_OPTIONS = [
  { value: '', label: 'Select your role' },
  { value: 'owner', label: 'Owner/Operator' },
  { value: 'pm', label: 'Project Manager' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'office', label: 'Office Manager' },
]

const PRIORITIES = [
  { id: 'Project Tracking', emoji: '📋', label: 'Project Tracking' },
  { id: 'Budget & Estimates', emoji: '💰', label: 'Budget & Estimates' },
  { id: 'Crew Management', emoji: '👷', label: 'Crew Management' },
  { id: 'Material Inventory', emoji: '🧱', label: 'Material Inventory' },
  { id: 'Equipment Tracking', emoji: '🚜', label: 'Equipment Tracking' },
  { id: 'Client Comms', emoji: '💬', label: 'Client Comms' },
  { id: 'Invoicing', emoji: '🧾', label: 'Invoicing' },
  { id: 'Weather Planning', emoji: '🌤️', label: 'Weather Planning' },
]

const KPI_MAP: Record<string, { label: string; icon: string }> = {
  'Project Tracking':  { label: 'Active Projects',    icon: '📋' },
  'Budget & Estimates': { label: 'Pipeline Value',    icon: '💰' },
  'Crew Management':   { label: 'Crew Available',     icon: '👷' },
  'Material Inventory': { label: 'Low Stock Alerts',  icon: '🧱' },
  'Equipment Tracking': { label: 'Fleet Status',      icon: '🚜' },
  'Client Comms':      { label: 'Pending Responses',  icon: '💬' },
  'Invoicing':         { label: 'Outstanding Invoices', icon: '🧾' },
  'Weather Planning':  { label: 'Weather Alerts',     icon: '🌤️' },
}

// Map onboarding priority labels → KPI library IDs for Supabase persistence
const PRIORITY_TO_KPI_ID: Record<string, string> = {
  'Project Tracking': 'active_projects',
  'Budget & Estimates': 'pipeline_value',
  'Crew Management': 'crew_available',
  'Material Inventory': 'low_stock_alerts',
  'Equipment Tracking': 'fleet_available',
  'Client Comms': 'active_projects',
  'Invoicing': 'pipeline_value',
  'Weather Planning': 'active_projects',
}

const DEFAULT_KPIS = ['Project Tracking', 'Budget & Estimates', 'Crew Management', 'Material Inventory']

const AI_CHIPS = ['Jobs overdue this week', 'Profit margin by project', 'Crew utilization rate']

interface AiSuggestion {
  name: string
  description: string
  mockValue: string
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { org } = useOrgStore()

  // If the user already has a preferences row, they've completed onboarding — redirect immediately.
  useEffect(() => {
    if (!user) return
    fetchUserPreferences(user.id).then(prefs => {
      if (prefs?.onboardingCompletedAt) {
        navigate('/', { replace: true })
      }
    })
  }, [user, navigate])

  const [step, setStep] = useState(1)
  const [businessType, setBusinessType] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [teamSize, setTeamSize] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [aiKpiInput, setAiKpiInput] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [customKpis, setCustomKpis] = useState<Array<{ name: string; description: string }>>([])
  const [isSaving, setIsSaving] = useState(false)

  const togglePriority = (id: string) => {
    setPriorities(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const derivedKpis = priorities.length >= 4 ? priorities.slice(0, 4) : [
    ...priorities,
    ...DEFAULT_KPIS.filter(k => !priorities.includes(k)),
  ].slice(0, 4)

  const handleAskAi = async (input?: string) => {
    const query = input ?? aiKpiInput
    if (!query.trim()) return
    setIsAiLoading(true)
    setAiSuggestion(null)
    try {
      const response = await callClaude(`
You are configuring a dashboard for a landscaping contractor's project management tool.
The user wants to track this metric: "${query}"

Return JSON with:
{
  "name": string (short KPI name, max 25 chars),
  "description": string (one sentence explaining what this tracks),
  "mockValue": string (a realistic example value, e.g. "3", "$12,450", "87%", "2 overdue")
}

Return only valid JSON, no markdown.`, 'claude-haiku-4-5-20251001')
      const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      setAiSuggestion(JSON.parse(cleaned) as AiSuggestion)
    } catch {
      // Silently fail — AI features are optional
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleChipClick = (chip: string) => {
    setAiKpiInput(chip)
    handleAskAi(chip)
  }

  const handleGetStarted = async () => {
    setIsSaving(true)
    try {
      if (user && org) {
        // Convert priority labels to KPI library IDs before saving
        const kpiIds = derivedKpis
          .map(label => PRIORITY_TO_KPI_ID[label] ?? label)
          .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
        await upsertUserPreferences(user.id, org.id, {
          businessType,
          companyName,
          teamSize,
          userRole: role,
          priorities,
          selectedKpis: kpiIds,
          customKpis,
          onboardingCompletedAt: new Date().toISOString(),
        })
        // Small delay so the Supabase write commits before ProtectedRoute re-checks
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch {
      // Best-effort — still navigate even if save fails
    } finally {
      setIsSaving(false)
      navigate('/')
    }
  }

  const ProgressDots = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map(s => (
        <div
          key={s}
          className={`w-2.5 h-2.5 rounded-full transition-colors ${s <= step ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-default)]'}`}
        />
      ))}
    </div>
  )

  const handleSkip = async () => {
    // Mark onboarding as dismissed so user isn't redirected back
    if (user && org) {
      try {
        await upsertUserPreferences(user.id, org.id, {
          onboardingCompletedAt: new Date().toISOString(),
        })
      } catch {
        // Best-effort — still navigate even if save fails
      }
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[640px]">
        {/* Skip link */}
        <div className="flex justify-end mb-2">
          <button
            onClick={handleSkip}
            className="text-[14px] bg-transparent border-none cursor-pointer transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            Skip for now &rarr;
          </button>
        </div>
        <ProgressDots />

        {/* Step 1 — Business Type */}
        {step === 1 && (
          <div>
            <h1 className="text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]">
              What kind of landscaping do you do?
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2 mb-8">
              Pick your primary focus
            </p>
            <div className="grid grid-cols-2 gap-4">
              {BUSINESS_TYPES.map(bt => (
                <div
                  key={bt.id}
                  onClick={() => setBusinessType(bt.id)}
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    businessType === bt.id
                      ? 'border-[var(--brand-primary)] bg-[var(--surface-selected)] shadow-[var(--shadow-card)]'
                      : 'border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-card)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="text-[32px] mb-3">{bt.emoji}</div>
                  <div className="text-[16px] font-[600] text-[var(--text-primary)]">{bt.title}</div>
                  <div className="text-[13px] text-[var(--text-secondary)] mt-1">{bt.subtitle}</div>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              disabled={!businessType}
              onClick={() => setStep(2)}
              className="w-full h-[44px] mt-8"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2 — Company Info */}
        {step === 2 && (
          <div>
            <h1 className="text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]">
              Tell us about your company
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2 mb-8">
              We'll personalise your experience
            </p>
            <div className="space-y-5">
              <Input
                label="Company name"
                placeholder="e.g., Green Valley Landscaping"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
              <div>
                <div className="text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.04em] mb-2">
                  Team size
                </div>
                <div className="flex flex-wrap gap-3">
                  {TEAM_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => setTeamSize(size)}
                      className={`px-4 py-2 rounded-full border cursor-pointer transition-all text-[14px] font-[500] min-h-[44px] ${
                        teamSize === size
                          ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary-bg)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] bg-[var(--surface-card)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <Select
                label="Your role"
                options={ROLE_OPTIONS}
                value={role}
                onChange={e => setRole(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="ghost" onClick={() => setStep(1)} className="h-[44px] flex-1">
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)} className="h-[44px] flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Priority Focus Areas */}
        {step === 3 && (
          <div>
            <h1 className="text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]">
              What do you want TerrainForge to help with most?
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2 mb-8">
              Pick your top priorities — we'll customise your dashboard
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PRIORITIES.map(p => {
                const selected = priorities.includes(p.id)
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePriority(p.id)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all text-center min-h-[44px] ${
                      selected
                        ? 'border-[var(--brand-primary)] bg-[var(--surface-selected)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-card)]'
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    )}
                    <div className="text-[24px] mb-2">{p.emoji}</div>
                    <div className="text-[13px] font-[500] text-[var(--text-primary)]">{p.label}</div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-8">
              <Button variant="ghost" onClick={() => setStep(2)} className="h-[44px] flex-1">
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(4)} className="h-[44px] flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — AI Dashboard Preview */}
        {step === 4 && (
          <div>
            <h1 className="text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]">
              Here's your personalised dashboard
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2 mb-6">
              Based on your selections, we've configured these KPIs
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {derivedKpis.map(kpiId => {
                const kpi = KPI_MAP[kpiId] ?? { label: kpiId, icon: '📊' }
                return (
                  <div
                    key={kpiId}
                    className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-sm)]"
                  >
                    <div className="text-[20px] mb-2">{kpi.icon}</div>
                    <div className="text-[12px] uppercase tracking-[0.05em] font-[600] text-[var(--text-tertiary)] mb-1">
                      {kpi.label}
                    </div>
                    <div className="text-[28px] font-[700] text-[var(--text-primary)]">—</div>
                  </div>
                )
              })}
            </div>

            {/* Natural language KPI input */}
            <div className="mt-8 p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)]">
              <div className="text-[14px] font-[600] text-[var(--text-primary)] mb-3">
                Want to track something specific?
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 h-[44px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-bg)] text-[var(--text-primary)] text-[14px] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  placeholder="Describe a metric — e.g., 'average project profit margin'"
                  value={aiKpiInput}
                  onChange={e => setAiKpiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskAi()}
                />
                <Button
                  variant="primary"
                  className="h-[44px] px-6"
                  disabled={isAiLoading}
                  onClick={() => handleAskAi()}
                >
                  {isAiLoading ? '...' : 'Ask AI'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {AI_CHIPS.map(chip => (
                  <button
                    key={chip}
                    onClick={() => handleChipClick(chip)}
                    className="text-[12px] px-3 py-1.5 rounded-full cursor-pointer bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--brand-primary-bg)] hover:text-[var(--brand-primary)] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {aiSuggestion && (
                <div className="mt-4 p-4 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-bg)]"
                  style={{ animation: 'fadeSlideIn 0.2s ease' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] font-[600] text-[var(--text-primary)]">{aiSuggestion.name}</span>
                    <span className="text-[14px] font-[700] text-[var(--brand-primary)]">{aiSuggestion.mockValue}</span>
                  </div>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-1">{aiSuggestion.description}</p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setCustomKpis(prev => [...prev, { name: aiSuggestion.name, description: aiSuggestion.description }])
                        setAiSuggestion(null)
                      }}
                    >
                      Add to Dashboard
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAiSuggestion(null)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setStep(3)} className="h-[44px]">
                Back
              </Button>
              <Button
                variant="primary"
                className="h-[44px] flex-1"
                disabled={isSaving}
                onClick={handleGetStarted}
              >
                {isSaving ? 'Setting up...' : 'Get Started'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Onboarding
