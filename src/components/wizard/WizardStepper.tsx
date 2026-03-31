import React from 'react';

export interface WizardStep {
  label: string;
  shortLabel: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="flex items-center gap-[4px] w-full overflow-x-auto pb-[8px]">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isClickable = onStepClick && idx <= currentStep;

        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <div
                className="h-[2px] flex-1 min-w-[12px] transition-colors duration-200"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--green)'
                    : 'var(--border)',
                }}
              />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(idx)}
              disabled={!isClickable}
              className="flex flex-col items-center gap-[6px] shrink-0 bg-transparent border-none p-0 cursor-default"
              style={{ cursor: isClickable ? 'pointer' : 'default' }}
            >
              <div
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[13px] font-[600] transition-all duration-200"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--green)'
                    : isCurrent
                      ? 'var(--green)'
                      : 'var(--surface3)',
                  color: isCompleted || isCurrent
                    ? '#fff'
                    : 'var(--text-3)',
                  boxShadow: isCurrent
                    ? '0 0 0 3px rgba(45,106,79,0.3)'
                    : 'none',
                }}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className="text-[11px] font-[500] whitespace-nowrap transition-colors duration-200"
                style={{
                  color: isCurrent
                    ? 'var(--text)'
                    : isCompleted
                      ? 'var(--green-l)'
                      : 'var(--text-4)',
                }}
              >
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.shortLabel}</span>
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WizardStepper;
