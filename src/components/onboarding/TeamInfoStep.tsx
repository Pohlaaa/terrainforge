import React from 'react'
import { Button } from '@/components/ui/Button'
import Select from '@/components/ui/Select'

const TEAM_SIZES = ['Just me', '2\u20135', '6\u201315', '16\u201325', '25+']

const ROLE_OPTIONS = [
  { value: '', label: 'Select your role' },
  { value: 'owner', label: 'Owner/Operator' },
  { value: 'pm', label: 'Project Manager' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'office', label: 'Office Manager' },
]

interface TeamInfoStepProps {
  teamSize: string | null
  role: string
  onTeamSizeChange: (v: string) => void
  onRoleChange: (v: string) => void
  onBack: () => void
  onContinue: () => void
}

export const TeamInfoStep: React.FC<TeamInfoStepProps> = ({
  teamSize, role, onTeamSizeChange, onRoleChange, onBack, onContinue,
}) => (
  <div>
    <h1 className="text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]">
      Tell us about your company
    </h1>
    <p className="text-[14px] text-[var(--text-secondary)] mt-2 mb-8">
      We'll personalise your experience
    </p>
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-[700] text-[var(--text-3)] uppercase tracking-[0.04em] mb-2">
          Team size
        </div>
        <div className="flex flex-wrap gap-3">
          {TEAM_SIZES.map(size => (
            <button
              key={size}
              onClick={() => onTeamSizeChange(size)}
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
        onChange={e => onRoleChange(e.target.value)}
      />
    </div>
    <div className="flex gap-3 mt-8">
      <Button variant="ghost" onClick={onBack} className="h-[44px] flex-1">Back</Button>
      <Button variant="primary" onClick={onContinue} className="h-[44px] flex-1">Continue</Button>
    </div>
  </div>
)
