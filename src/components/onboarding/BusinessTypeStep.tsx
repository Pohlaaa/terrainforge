import React from 'react'
import { Button } from '@/components/ui/Button'

const BUSINESS_TYPES = [
  { id: 'residential', emoji: '\uD83C\uDFE1', title: 'Residential', subtitle: 'Homes, yards, gardens' },
  { id: 'commercial', emoji: '\uD83C\uDFE2', title: 'Commercial', subtitle: 'Properties, campuses, HOAs' },
  { id: 'hardscaping', emoji: '\uD83E\uDDF1', title: 'Hardscaping', subtitle: 'Patios, walls, driveways' },
  { id: 'full-service', emoji: '\uD83C\uDF3F', title: 'Full-Service', subtitle: 'Design, install, maintain' },
]

interface BusinessTypeStepProps {
  value: string | null
  onChange: (v: string) => void
  onContinue: () => void
}

export const BusinessTypeStep: React.FC<BusinessTypeStepProps> = ({ value, onChange, onContinue }) => (
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
          onClick={() => onChange(bt.id)}
          className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
            value === bt.id
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
    <Button variant="primary" disabled={!value} onClick={onContinue} className="w-full h-[44px] mt-8">
      Continue
    </Button>
  </div>
)
