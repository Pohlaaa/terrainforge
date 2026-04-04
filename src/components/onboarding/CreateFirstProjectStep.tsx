import React from 'react'
import { Button } from '@/components/ui/Button'

interface CreateFirstProjectStepProps {
  onBack: () => void
  onStartWizard: () => void
  onSkip: () => void
  isSaving?: boolean
}

export const CreateFirstProjectStep: React.FC<CreateFirstProjectStepProps> = ({
  onBack,
  onStartWizard,
  onSkip,
  isSaving = false,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[24px] font-[700] text-[var(--text-primary)] mb-2">
          Create your first project
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)]">
          The AI-powered project wizard will walk you through setting up your first job. It takes about 5 minutes and generates materials, tasks, and budget estimates automatically.
        </p>
      </div>

      {/* Info card */}
      <div className="bg-[var(--surface-card)] rounded-[8px] border border-[var(--border-default)] p-4 space-y-3">
        <p className="text-[12px] text-[var(--text-tertiary)] uppercase font-[600]">
          The wizard covers
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--brand-primary)] font-[700] mt-[2px]">1</span>
            <span>Job description, client info, and site address</span>
          </li>
          <li className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--brand-primary)] font-[700] mt-[2px]">2</span>
            <span>Site conditions (soil type, drainage, access, slope)</span>
          </li>
          <li className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--brand-primary)] font-[700] mt-[2px]">3</span>
            <span>Materials, tasks, and subcontractor needs</span>
          </li>
          <li className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
            <span className="text-[var(--brand-primary)] font-[700] mt-[2px]">4</span>
            <span>AI-generated budget with labor, materials, and equipment costs</span>
          </li>
        </ul>
      </div>

      {/* Note */}
      <p className="text-[12px] text-[var(--text-tertiary)]">
        You can save at any step and come back later. The crew, equipment, and suppliers you just added will be available in the wizard.
      </p>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          variant="primary"
          onClick={onStartWizard}
          className="w-full h-[48px]"
          disabled={isSaving}
        >
          Start Project Wizard
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          className="w-full h-[44px]"
          disabled={isSaving}
        >
          Go to Dashboard
        </Button>
      </div>

      {/* Back */}
      <div className="flex">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-[44px] px-6"
          disabled={isSaving}
        >
          &larr; Back
        </Button>
      </div>
    </div>
  )
}
