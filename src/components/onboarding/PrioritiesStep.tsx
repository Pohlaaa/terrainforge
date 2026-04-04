import React from 'react'
import { Button } from '@/components/ui/Button'

const PRIORITIES = [
  { id: 'Project Tracking', emoji: '\uD83D\uDCCB', label: 'Project Tracking' },
  { id: 'Budget & Estimates', emoji: '\uD83D\uDCB0', label: 'Budget & Estimates' },
  { id: 'Crew Management', emoji: '\uD83D\uDC77', label: 'Crew Management' },
  { id: 'Material Inventory', emoji: '\uD83E\uDDF1', label: 'Material Inventory' },
  { id: 'Equipment Tracking', emoji: '\uD83D\uDE9C', label: 'Equipment Tracking' },
  { id: 'Client Comms', emoji: '\uD83D\uDCAC', label: 'Client Comms' },
  { id: 'Invoicing', emoji: '\uD83E\uDDFE', label: 'Invoicing' },
  { id: 'Weather Planning', emoji: '\uD83C\uDF24\uFE0F', label: 'Weather Planning' },
]

interface PrioritiesStepProps {
  priorities: string[]
  onToggle: (id: string) => void
  onBack: () => void
  onContinue: () => void
}

export const PrioritiesStep: React.FC<PrioritiesStepProps> = ({
  priorities, onToggle, onBack, onContinue,
}) => (
  <div>
    <h1 className="text-[24px] font-[700] text-[var(--text-primary)] tracking-[-0.01em]">
      What do you want TerrainForge to help with most?
    </h1>
    <p className="text-[14px] text-[var(--text-secondary)] mt-2 mb-8">
      Pick your top priorities &mdash; we'll customise your dashboard
    </p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {PRIORITIES.map(p => {
        const selected = priorities.includes(p.id)
        return (
          <div
            key={p.id}
            onClick={() => onToggle(p.id)}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all text-center min-h-[44px] ${
              selected
                ? 'border-[var(--brand-primary)] bg-[var(--surface-selected)]'
                : 'border-[var(--border-default)] bg-[var(--surface-card)]'
            }`}
          >
            {selected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                <span className="text-white text-[10px]">&#10003;</span>
              </div>
            )}
            <div className="text-[24px] mb-2">{p.emoji}</div>
            <div className="text-[13px] font-[500] text-[var(--text-primary)]">{p.label}</div>
          </div>
        )
      })}
    </div>
    <div className="flex gap-3 mt-8">
      <Button variant="ghost" onClick={onBack} className="h-[44px] flex-1">Back</Button>
      <Button variant="primary" onClick={onContinue} className="h-[44px] flex-1">Continue</Button>
    </div>
  </div>
)
