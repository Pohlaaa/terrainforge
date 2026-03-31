import React from 'react';

interface Props {
  stepNumber: number;
  title: string;
  description: string;
}

export const WizardStepPlaceholder: React.FC<Props> = ({
  stepNumber,
  title,
  description,
}) => {
  return (
    <div
      className="rounded-[12px] border-2 border-dashed p-[40px] text-center"
      style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
    >
      <div
        className="w-[48px] h-[48px] rounded-full flex items-center justify-center mx-auto mb-[16px] text-[20px] font-[700]"
        style={{
          backgroundColor: 'var(--surface3)',
          color: 'var(--text-4)',
        }}
      >
        {stepNumber}
      </div>
      <h3 className="text-[18px] font-[600] text-[var(--text-2)] mb-[8px]">
        {title}
      </h3>
      <p className="text-[13px] text-[var(--text-4)] max-w-[400px] mx-auto">
        {description}
      </p>
      <div
        className="mt-[16px] inline-block px-[12px] py-[4px] rounded-[6px] text-[11px] font-[600]"
        style={{
          backgroundColor: 'rgba(74,141,181,0.15)',
          color: 'var(--status-blue)',
        }}
      >
        Coming in Sprint 31
      </div>
    </div>
  );
};

export default WizardStepPlaceholder;
