import React from 'react';

interface StatusBadgeProps {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

const VARIANTS = {
  success: 'bg-[var(--status-green-bg)] text-[var(--status-green)]',
  warning: 'bg-[var(--status-amber-bg)] text-[var(--status-amber)]',
  error: 'bg-[var(--status-red-bg)] text-[var(--status-red)]',
  info: 'bg-[var(--status-blue-bg)] text-[var(--status-blue)]',
  neutral: 'bg-[var(--status-gray-bg)] text-[var(--status-gray)]',
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]}`}>
    {label}
  </span>
);
