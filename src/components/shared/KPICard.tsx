import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  unit,
  subtitle,
}) => {
  return (
    <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[10px] p-[16px]">
      <div className="text-[10px] text-[var(--text-3)] font-[700] uppercase tracking-[0.06em] mb-[6px]">
        {label}
      </div>
      <div className="font-serif text-[28px] text-[var(--text)] leading-[1]">
        {value}
        {unit && <span className="text-[18px] ml-[4px]">{unit}</span>}
      </div>
      {subtitle && (
        <div className="text-[11px] text-[var(--text-4)] mt-[4px]">{subtitle}</div>
      )}
    </div>
  );
};

export default KPICard;
