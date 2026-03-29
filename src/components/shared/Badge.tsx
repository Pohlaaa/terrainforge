import React from 'react';

type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'teal';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'green', children, pulse }) => {
  const variantClasses = {
    green: 'bg-[rgba(45,106,79,.25)] text-[var(--green-l)]',
    amber: 'bg-[rgba(217,119,6,.2)] text-[var(--amber-l)]',
    blue: 'bg-[rgba(37,99,235,.2)] text-[var(--blue-l)]',
    red: 'bg-[rgba(220,38,38,.2)] text-[var(--red-l)]',
    purple: 'bg-[rgba(124,58,237,.2)] text-[var(--purple-l)]',
    teal: 'bg-[rgba(13,148,136,.2)] text-[var(--teal-l)]',
  };

  const pulseClass =
    pulse && variant === 'amber'
      ? 'animate-stock-pulse-low'
      : pulse && variant === 'red'
      ? 'animate-stock-pulse-out'
      : '';

  return (
    <span
      className={`inline-flex items-center text-[10px] font-[700] px-[9px] py-[3px] rounded-[10px] font-mono tracking-[0.03em] ${variantClasses[variant]} ${pulseClass}`}
    >
      {children}
    </span>
  );
};

export default Badge;
