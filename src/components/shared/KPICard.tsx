import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: 'green' | 'red' | 'amber' | 'default';
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  unit?: string;
  subtitle?: string;
}

const SUBTEXT_COLORS: Record<string, string> = {
  green: 'text-[var(--status-green)]',
  red: 'text-[var(--status-red)]',
  amber: 'text-[var(--status-amber)]',
  default: 'text-[var(--text-tertiary)]',
};

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subtext,
  subtextColor = 'default',
  icon,
  iconBg,
  iconColor,
  unit,
  subtitle,
}) => {
  const sub = subtext || subtitle;
  return (
    <div className="kpi-card-hover bg-[var(--surface-card)] border border-[var(--border-light)] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
            {label}
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {value}
            {unit && <span className="text-base ml-1">{unit}</span>}
          </div>
          {sub && (
            <div className={`text-xs mt-1 ${SUBTEXT_COLORS[subtextColor] || SUBTEXT_COLORS.default}`}>
              {sub}
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg || ''} ${iconColor || ''}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
