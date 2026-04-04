import React, { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface CompanySetupStepProps {
  orgName: string
  defaultLaborRate: number | null
  defaultEquipmentRate: number | null
  onChange: (data: { orgName: string; defaultLaborRate: number | null; defaultEquipmentRate: number | null }) => void
  onContinue: () => void
  onSkip: () => void
}

export const CompanySetupStep: React.FC<CompanySetupStepProps> = ({
  orgName,
  defaultLaborRate,
  defaultEquipmentRate,
  onChange,
  onContinue,
  onSkip,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string | number) => {
    onChange({
      orgName: field === 'orgName' ? (value as string) : orgName,
      defaultLaborRate: field === 'defaultLaborRate' ? (value as number) || null : defaultLaborRate,
      defaultEquipmentRate: field === 'defaultEquipmentRate' ? (value as number) || null : defaultEquipmentRate,
    })
    // Clear error for this field
    setErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleContinue = () => {
    const newErrors: Record<string, string> = {}
    if (!orgName || orgName.trim().length === 0) {
      newErrors.orgName = 'Company name is required'
    }
    if (defaultLaborRate !== null && defaultLaborRate < 0) {
      newErrors.defaultLaborRate = 'Labor rate must be non-negative'
    }
    if (defaultEquipmentRate !== null && defaultEquipmentRate < 0) {
      newErrors.defaultEquipmentRate = 'Equipment rate must be non-negative'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onContinue()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-[700] text-[var(--text-primary)] mb-2">
          Set up your company
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          We need a few basics to get you started. You can update these later from Settings.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Company Name"
          placeholder="e.g., Green Landscape Co"
          value={orgName}
          onChange={(e) => handleChange('orgName', e.target.value)}
          error={errors.orgName}
          required
        />

        <Input
          label="Default Labor Rate ($/hr)"
          placeholder="e.g., 65"
          type="number"
          inputMode="decimal"
          value={defaultLaborRate ?? ''}
          onChange={(e) => handleChange('defaultLaborRate', parseFloat(e.target.value) || 0)}
          error={errors.defaultLaborRate}
          hint="Used as default when creating projects and estimating labor costs"
        />

        <Input
          label="Default Equipment Rate ($/hr)"
          placeholder="e.g., 50"
          type="number"
          inputMode="decimal"
          value={defaultEquipmentRate ?? ''}
          onChange={(e) => handleChange('defaultEquipmentRate', parseFloat(e.target.value) || 0)}
          error={errors.defaultEquipmentRate}
          hint="Used as default when estimating equipment costs. Actual rates can vary per item."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          variant="primary"
          onClick={handleContinue}
          className="flex-1 h-[48px]"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
