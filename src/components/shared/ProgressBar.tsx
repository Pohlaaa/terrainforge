import React from 'react';

interface ProgressBarProps {
  completed: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  completed,
  total,
  label,
  showPercentage = true,
}) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-[6px]">
          {label && <span className="text-[12px] text-[var(--text-2)]">{label}</span>}
          {showPercentage && (
            <span className="text-[10px] text-[var(--text-3)]">
              {completed}/{total}
            </span>
          )}
        </div>
      )}
      <div className="w-full h-[6px] bg-[var(--surface3)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--green-l)] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
