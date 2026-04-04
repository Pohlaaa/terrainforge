import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgStore } from '@/stores/orgStore'
import { useCrewStore } from '@/stores/crewStore'
import { useEquipmentStore } from '@/stores/equipmentStore'
import { useSupplierStore } from '@/stores/supplierStore'
import { fetchUserPreferences, upsertUserPreferences } from '@/services/preferences'
import { CompanySetupStep } from '@/components/onboarding/CompanySetupStep'
import { AddCrewStep } from '@/components/onboarding/AddCrewStep'
import { AddEquipmentStep } from '@/components/onboarding/AddEquipmentStep'
import { AddSuppliersStep } from '@/components/onboarding/AddSuppliersStep'
import { CreateFirstProjectStep } from '@/components/onboarding/CreateFirstProjectStep'

const STEP_LABELS = ['Company', 'Crew', 'Equipment', 'Suppliers', 'First Project']
const TOTAL_STEPS = STEP_LABELS.length

const Onboarding: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { org, updateOrgSettings } = useOrgStore()
  const { crew, addCrewMember } = useCrewStore()
  const { equipment, addEquipment } = useEquipmentStore()
  const { suppliers, addSupplier, fetchSuppliers } = useSupplierStore()

  // Skip onboarding if already completed
  useEffect(() => {
    if (!user) return
    fetchUserPreferences(user.id).then(prefs => {
      if (prefs?.onboardingCompletedAt) {
        navigate('/', { replace: true })
      }
    })
  }, [user, navigate])

  // Fetch suppliers on mount so the list is populated
  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const [step, setStep] = useState(0)
  const [orgName, setOrgName] = useState(org?.name ?? '')
  const [defaultLaborRate, setDefaultLaborRate] = useState(org?.defaultLaborRate ?? null)
  const [defaultEquipmentRate, setDefaultEquipmentRate] = useState(org?.defaultEquipmentRate ?? null)
  const [isSaving, setIsSaving] = useState(false)

  const handleOrgNameChange = ({ orgName: name, defaultLaborRate: labor, defaultEquipmentRate: equip }: {
    orgName: string
    defaultLaborRate: number | null
    defaultEquipmentRate: number | null
  }) => {
    setOrgName(name)
    setDefaultLaborRate(labor)
    setDefaultEquipmentRate(equip)
  }

  const handleCompanySetupContinue = async () => {
    setIsSaving(true)
    try {
      if (org) {
        await updateOrgSettings({
          defaultLaborRate: defaultLaborRate ?? null,
          defaultEquipmentRate: defaultEquipmentRate ?? null,
        })
        if (orgName && orgName !== org.name) {
          const { updateOrgName } = useOrgStore.getState()
          await updateOrgName(orgName)
        }
      }
      setStep(1)
    } catch (err) {
      console.error('Failed to save org settings:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // ── Crew handlers ───────────────────────────────────────────
  const handleAddCrewMember = async (memberData: Omit<import('@/types').CrewMember, 'id'>) => {
    await addCrewMember(memberData)
  }

  const handleCrewSampleData = async () => {
    const sampleCrew = [
      {
        name: 'Michael Garcia',
        role: 'foreman' as const,
        phone: null,
        skills: ['landscaping', 'hardscape'],
        availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
        maxProjects: 5,
        notes: 'Lead foreman, 8 years experience',
        bookedDates: [],
        certs: [],
      },
      {
        name: 'David Rodriguez',
        role: 'installer' as const,
        phone: null,
        skills: ['paver installation', 'hardscape'],
        availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
        maxProjects: 4,
        notes: 'Specialist in paver installation',
        bookedDates: [],
        certs: [],
      },
      {
        name: 'James Wilson',
        role: 'laborer' as const,
        phone: null,
        skills: ['general labor', 'material handling'],
        availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
        maxProjects: 6,
        notes: '',
        bookedDates: [],
        certs: [],
      },
    ]
    for (const member of sampleCrew) {
      await addCrewMember(member)
    }
  }

  // ── Equipment handlers ──────────────────────────────────────
  const handleAddEquipmentItem = async (equipmentData: Omit<import('@/types').Equipment, 'id'>) => {
    await addEquipment(equipmentData)
  }

  const handleEquipmentSampleData = async () => {
    const sampleEquipment: Omit<import('@/types').Equipment, 'id'>[] = [
      {
        name: 'Bobcat S650',
        makeModel: 'Bobcat S650',
        type: 'Skid Steer Loader',
        hourlyCost: 85,
        equipmentType: 'Skid Steer Loader',
        year: 2022,
        serial: '',
        plate: '',
        status: 'available',
        assignedProject: '',
        location: 'Main yard',
        operator: '',
        hours: 245,
        serviceDueHours: 500,
        lastService: new Date().toISOString().split('T')[0],
        nextService: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maintNotes: '',
        value: 35000,
        dailyRate: 680,
        insurance: '',
        insuranceExpiry: '',
        regExpiry: '',
        inspectionDue: '',
        notes: 'Primary compact loader',
        capabilities: ['demolition', 'earthwork', 'material transport'],
        maintenanceLog: [],
      },
      {
        name: 'Kubota KX091-3',
        makeModel: 'Kubota KX091-3',
        type: 'Mini Excavator',
        hourlyCost: 60,
        equipmentType: 'Mini Excavator',
        year: 2021,
        serial: '',
        plate: '',
        status: 'available',
        assignedProject: '',
        location: 'Main yard',
        operator: '',
        hours: 180,
        serviceDueHours: 500,
        lastService: new Date().toISOString().split('T')[0],
        nextService: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maintNotes: '',
        value: 28000,
        dailyRate: 480,
        insurance: '',
        insuranceExpiry: '',
        regExpiry: '',
        inspectionDue: '',
        notes: 'Detailed excavation work',
        capabilities: ['excavation', 'trenching', 'utility work'],
        maintenanceLog: [],
      },
      {
        name: 'Husqvarna Z556',
        makeModel: 'Husqvarna Z556',
        type: 'Zero-Turn Mower',
        hourlyCost: 45,
        equipmentType: 'Zero-Turn Mower',
        year: 2023,
        serial: '',
        plate: '',
        status: 'available',
        assignedProject: '',
        location: 'Main yard',
        operator: '',
        hours: 60,
        serviceDueHours: 250,
        lastService: new Date().toISOString().split('T')[0],
        nextService: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maintNotes: '',
        value: 8000,
        dailyRate: 360,
        insurance: '',
        insuranceExpiry: '',
        regExpiry: '',
        inspectionDue: '',
        notes: 'New mower, excellent condition',
        capabilities: ['mowing', 'grass cutting'],
        maintenanceLog: [],
      },
    ]
    for (const eq of sampleEquipment) {
      await addEquipment(eq)
    }
  }

  // ── Supplier handler ────────────────────────────────────────
  const handleAddSupplier = async (supplierData: Partial<import('@/types').Supplier>) => {
    return await addSupplier(supplierData)
  }

  // ── Navigation handlers ─────────────────────────────────────
  const handleProjectWizard = async () => {
    if (user && org) {
      try {
        await upsertUserPreferences(user.id, org.id, {
          onboardingCompletedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('Failed to mark onboarding complete:', err)
      }
    }
    navigate('/projects/wizard')
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

  // Track highest step reached so users can jump back but not forward past what they've seen
  const [maxStep, setMaxStep] = useState(0)
  const goToStep = (target: number) => {
    if (target <= maxStep) setStep(target)
  }
  // Update max step whenever step advances
  React.useEffect(() => {
    if (step > maxStep) setMaxStep(step)
  }, [step, maxStep])

  // ── Progress bar with clickable steps ────────────────────────
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEP_LABELS.map((label, idx) => {
          const isActive = idx === step
          const isCompleted = idx < step
          const isReachable = idx <= maxStep
          return (
            <button
              key={label}
              onClick={() => isReachable && goToStep(idx)}
              disabled={!isReachable}
              className={`flex flex-col items-center gap-[4px] bg-transparent border-none transition-colors ${
                isReachable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-[12px] font-[600] transition-all ${
                  isActive
                    ? 'bg-[var(--brand-primary)] text-white'
                    : isCompleted
                      ? 'bg-[var(--brand-primary)] text-white opacity-70'
                      : isReachable
                        ? 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-tertiary)] opacity-50'
                }`}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span
                className={`text-[10px] transition-colors ${
                  isActive
                    ? 'text-[var(--text-primary)] font-[600]'
                    : isReachable
                      ? 'text-[var(--text-secondary)]'
                      : 'text-[var(--text-tertiary)] opacity-50'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
      <div className="h-[3px] bg-[var(--border-default)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-300"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-[640px]">
        <ProgressBar />

        {step === 0 && (
          <CompanySetupStep
            orgName={orgName}
            defaultLaborRate={defaultLaborRate}
            defaultEquipmentRate={defaultEquipmentRate}
            onChange={handleOrgNameChange}
            onContinue={handleCompanySetupContinue}
            onSkip={handleSkip}
          />
        )}

        {step === 1 && (
          <AddCrewStep
            crew={crew}
            onAddCrew={handleAddCrewMember}
            onAddSampleData={handleCrewSampleData}
            onBack={() => setStep(0)}
            onSkip={() => setStep(2)}
            onContinue={() => setStep(2)}
            isSaving={isSaving}
          />
        )}

        {step === 2 && (
          <AddEquipmentStep
            equipment={equipment}
            onAddEquipment={handleAddEquipmentItem}
            onAddSampleData={handleEquipmentSampleData}
            onBack={() => setStep(1)}
            onSkip={() => setStep(3)}
            onContinue={() => setStep(3)}
            isSaving={isSaving}
          />
        )}

        {step === 3 && (
          <AddSuppliersStep
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onBack={() => setStep(2)}
            onSkip={() => setStep(4)}
            onContinue={() => setStep(4)}
            isSaving={isSaving}
          />
        )}

        {step === 4 && (
          <CreateFirstProjectStep
            onBack={() => setStep(3)}
            onStartWizard={handleProjectWizard}
            onSkip={handleSkip}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  )
}

export default Onboarding
