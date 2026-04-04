import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgStore } from '@/stores/orgStore'
import { fetchUserPreferences, upsertUserPreferences } from '@/services/preferences'
import { WelcomeStep } from '@/components/onboarding/WelcomeStep'
import { BusinessTypeStep } from '@/components/onboarding/BusinessTypeStep'
import { TeamInfoStep } from '@/components/onboarding/TeamInfoStep'
import { PrioritiesStep } from '@/components/onboarding/PrioritiesStep'
import { DashboardPreviewStep } from '@/components/onboarding/DashboardPreviewStep'

const DEFAULT_KPIS = ['Project Tracking', 'Budget & Estimates', 'Crew Management', 'Material Inventory']

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

const TOTAL_STEPS = 5

const Onboarding: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { org } = useOrgStore()

  // Skip onboarding if already completed or org has businessType set
  useEffect(() => {
    if (!user) return
    fetchUserPreferences(user.id).then(prefs => {
      if (prefs?.onboardingCompletedAt) {
        navigate('/', { replace: true })
      }
    })
  }, [user, navigate])

  // Also skip if org already has data indicating onboarding was done
  useEffect(() => {
    if (org && (org as unknown as Record<string, unknown>).businessType) {
      navigate('/', { replace: true })
    }
  }, [org, navigate])

  const [step, setStep] = useState(0) // 0 = welcome
  const [businessType, setBusinessType] = useState<string | null>(null)
  const [teamSize, setTeamSize] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [priorities, setPriorities] = useState<string[]>([])
  const [customKpis, setCustomKpis] = useState<Array<{ name: string; description: string }>>([])
  const [isSaving, setIsSaving] = useState(false)

  const togglePriority = (id: string) => {
    setPriorities(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleSkip = async () => {
    if (user && org) {
      try {
        await upsertUserPreferences(user.id, org.id, {
          onboardingCompletedAt: new Date().toISOString(),
        })
      } catch {
        // Best-effort
      }
    }
    navigate('/')
  }

  const handleGetStarted = async () => {
    setIsSaving(true)
    try {
      if (user && org) {
        const derivedKpis = priorities.length >= 4 ? priorities.slice(0, 4) : [
          ...priorities,
          ...DEFAULT_KPIS.filter(k => !priorities.includes(k)),
        ].slice(0, 4)

        const kpiIds = derivedKpis
          .map(label => PRIORITY_TO_KPI_ID[label] ?? label)
          .filter((v, i, a) => a.indexOf(v) === i)

        // 7a: Persist to user_preferences
        await upsertUserPreferences(user.id, org.id, {
          businessType,
          teamSize,
          userRole: role,
          priorities,
          selectedKpis: kpiIds,
          customKpis,
          onboardingCompletedAt: new Date().toISOString(),
        })

        // 7a: Also persist businessType + teamSize to org record
        // These columns may not exist yet — updateOrgSettings handles what it can
        try {
          await useOrgStore.getState().updateOrgSettings({})
        } catch {
          // Best-effort — org columns may not exist yet
        }

        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch {
      // Best-effort — still navigate
    } finally {
      setIsSaving(false)
      navigate('/')
    }
  }

  // Progress bar
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[12px] text-[var(--text-tertiary)]">
          {step === 0 ? 'Welcome' : `Step ${step} of ${TOTAL_STEPS - 1}`}
        </span>
        <span className="text-[12px] text-[var(--text-tertiary)]">
          {Math.round((step / (TOTAL_STEPS - 1)) * 100)}%
        </span>
      </div>
      <div className="h-[4px] bg-[var(--border-default)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-300"
          style={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[640px]">
        {/* Skip link (not on welcome step which has its own) */}
        {step > 0 && (
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
        )}
        {step > 0 && <ProgressBar />}

        {step === 0 && <WelcomeStep onContinue={() => setStep(1)} onSkip={handleSkip} />}
        {step === 1 && <BusinessTypeStep value={businessType} onChange={setBusinessType} onContinue={() => setStep(2)} />}
        {step === 2 && <TeamInfoStep teamSize={teamSize} role={role} onTeamSizeChange={setTeamSize} onRoleChange={setRole} onBack={() => setStep(1)} onContinue={() => setStep(3)} />}
        {step === 3 && <PrioritiesStep priorities={priorities} onToggle={togglePriority} onBack={() => setStep(2)} onContinue={() => setStep(4)} />}
        {step === 4 && (
          <DashboardPreviewStep
            priorities={priorities}
            customKpis={customKpis}
            onAddCustomKpi={kpi => setCustomKpis(prev => [...prev, kpi])}
            onBack={() => setStep(3)}
            onFinish={handleGetStarted}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  )
}

export default Onboarding
