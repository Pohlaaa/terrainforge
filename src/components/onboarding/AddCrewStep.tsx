import React, { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { CrewMember } from '@/types'

interface CrewForm {
  name: string
  role: CrewMember['role']
  phone: string
}

interface AddCrewStepProps {
  crew: CrewMember[]
  onAddCrew: (member: Omit<CrewMember, 'id'>) => Promise<void>
  onAddSampleData: () => Promise<void>
  onBack: () => void
  onSkip: () => void
  onContinue: () => void
  isSaving?: boolean
}

const ROLE_OPTIONS: CrewMember['role'][] = ['foreman', 'lead', 'installer', 'laborer', 'specialist', 'apprentice']

export const AddCrewStep: React.FC<AddCrewStepProps> = ({
  crew,
  onAddCrew,
  onAddSampleData,
  onBack,
  onSkip,
  onContinue,
  isSaving = false,
}) => {
  const [form, setForm] = useState<CrewForm>({
    name: '',
    role: 'installer',
    phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [addedIndex, setAddedIndex] = useState(-1)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.name || form.name.trim().length === 0) {
      newErrors.name = 'Name is required'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return false
    }
    return true
  }

  const handleAddCrew = async () => {
    if (!validateForm()) return

    setIsAdding(true)
    try {
      await onAddCrew({
        name: form.name,
        role: form.role,
        phone: form.phone || null,
        skills: [],
        availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
        maxProjects: 5,
        notes: '',
        bookedDates: [],
        certs: [],
      })
      setAddedIndex(crew.length) // Highlight the new crew member
      setForm({ name: '', role: 'installer', phone: '' })
      setErrors({})
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to add crew member' })
    } finally {
      setIsAdding(false)
    }
  }

  const handleSampleData = async () => {
    setIsAdding(true)
    try {
      await onAddSampleData()
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to load sample data' })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-[700] text-[var(--text-primary)] mb-2">
          Add your crew
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Add crew members now or skip. You can add more anytime from the Crew & Equipment tab.
        </p>
      </div>

      {errors.submit && (
        <div className="p-3 rounded-[8px] bg-[rgba(220,38,38,.15)] border border-[var(--red)] text-[var(--red-l)] text-[13px]">
          {errors.submit}
        </div>
      )}

      {/* Crew list */}
      {crew.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-2">
          <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
            Added crew members ({crew.length})
          </p>
          <div className="space-y-1">
            {crew.map((member, idx) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-2 rounded-[6px] text-[13px] transition-colors ${
                  idx === addedIndex
                    ? 'bg-[var(--surface-selected)] border border-[var(--brand-primary)]'
                    : 'bg-[var(--surface-hover)]'
                }`}
              >
                <span className="text-[var(--text-primary)]">{member.name}</span>
                <span className="text-[var(--text-tertiary)] capitalize">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-3">
        <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
          Quick add
        </p>

        <Input
          label="Name"
          placeholder="e.g., John Smith"
          value={form.name}
          onChange={(e) => {
            setForm({ ...form, name: e.target.value })
            setErrors({ ...errors, name: '' })
          }}
          error={errors.name}
          disabled={isAdding || isSaving}
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.04em] block mb-[5px]">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as CrewMember['role'] })}
              className="w-full bg-[var(--surface3)] border border-[var(--border)] rounded-[8px] text-[var(--text)] px-[12px] py-[9px] text-[13px] outline-none transition-all duration-200 focus:border-[var(--brand-primary)]"
              disabled={isAdding || isSaving}
            >
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Phone (optional)"
          placeholder="e.g., 555-123-4567"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          disabled={isAdding || isSaving}
        />

        <Button
          variant="primary"
          onClick={handleAddCrew}
          className="w-full h-[44px]"
          disabled={isAdding || isSaving}
          loading={isAdding}
        >
          Add Crew Member
        </Button>
      </div>

      {/* Actions */}
      {crew.length === 0 && (
        <Button
          variant="secondary"
          onClick={handleSampleData}
          className="w-full h-[44px]"
          disabled={isAdding || isSaving}
          loading={isSaving}
        >
          Try with sample crew
        </Button>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-[44px] px-6"
          disabled={isAdding || isSaving}
        >
          &larr; Back
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          onClick={onSkip}
          className="h-[44px]"
          disabled={isAdding || isSaving}
        >
          Skip
        </Button>
      </div>

      {crew.length > 0 && (
        <Button
          variant="primary"
          onClick={onContinue}
          className="w-full h-[48px]"
          disabled={isAdding || isSaving}
        >
          Continue
        </Button>
      )}
    </div>
  )
}
