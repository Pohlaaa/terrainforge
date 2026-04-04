import React from 'react';

type IconColor = 'green' | 'blue' | 'orange' | 'purple' | 'teal' | 'red' | 'pink';

interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  subtextColor?: 'green' | 'red' | 'amber' | 'default';
  icon?: React.ReactNode;
  /** Color key for icon circle — uses CSS variables for theme support */
  iconVariant?: IconColor;
  /** @deprecated Use iconVariant instead. Tailwind classes get purged. */
  iconBg?: string;
  /** @deprecated Use iconVariant instead. */
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
  iconVariant,
  iconBg,
  iconColor,
  unit,
  subtitle,
}) => {
  const sub = subtext || subtitle;

  // Resolve icon circle styles — prefer CSS variable approach via iconVariant
  let circleStyle: React.CSSProperties | undefined;
  let circleClassName = '';

  if (iconVariant) {
    circleStyle = {
      backgroundColor: `var(--icon-${iconVariant}-bg)`,
      color: `var(--icon-${iconVariant}-text)`,
    };
  } else if (iconBg || iconColor) {
    // Legacy fallback — Tailwind classes (may be purged)
    circleClassName = `${iconBg || ''} ${iconColor || ''}`;
  }

  return (
    <div className="kpi-card-hover card-interactive bg-[var(--surface-card)] border border-[var(--border-light)] rounded-xl p-5">
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
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${circleClassName}`}
            style={circleStyle}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
