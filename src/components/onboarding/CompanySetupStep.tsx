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

  const handleChange = (field: string, value: string | number | null) => {
    // jbluhm-V6: contractors complained "Should be able to put 0 in for
    // hourly rates if N/A." The previous logic was `(value as number)
    // || null`, which coerced 0 → null because 0 is falsy. Now we
    // explicitly preserve 0 (a real "N/A" value); only null/undefined/
    // empty becomes null.
    const toRate = (v: string | number | null): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = typeof v === 'number' ? v : parseFloat(v);
      return Number.isNaN(n) ? null : n;
    };
    onChange({
      orgName: field === 'orgName' ? (value as string) : orgName,
      defaultLaborRate:
        field === 'defaultLaborRate' ? toRate(value) : defaultLaborRate,
      defaultEquipmentRate:
        field === 'defaultEquipmentRate' ? toRate(value) : defaultEquipmentRate,
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
          placeholder="e.g., 65 — enter 0 if N/A"
          type="number"
          inputMode="decimal"
          // jbluhm-V6: pass the raw string so 0 reaches handleChange
          // intact. Previous `parseFloat || 0` was OK locally but the
          // handleChange's `|| null` step then nuked the 0 again.
          value={defaultLaborRate ?? ''}
          onChange={(e) => handleChange('defaultLaborRate', e.target.value)}
          error={errors.defaultLaborRate}
          hint="Used as default when creating projects. Enter 0 if you'd rather set rates per project."
        />

        <Input
          label="Default Equipment Rate ($/hr)"
          placeholder="e.g., 50 — enter 0 if N/A"
          type="number"
          inputMode="decimal"
          value={defaultEquipmentRate ?? ''}
          onChange={(e) => handleChange('defaultEquipmentRate', e.target.value)}
          error={errors.defaultEquipmentRate}
          hint="Used as default when estimating equipment costs. Enter 0 if you'd rather set rates per item."
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
