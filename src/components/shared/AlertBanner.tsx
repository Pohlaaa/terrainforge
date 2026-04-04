import React from 'react';
import type { Alert } from '@/types';

interface AlertBannerProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss }) => {
  const levelClasses: Record<'red' | 'amber' | 'info', string> = {
    red: 'bg-[rgba(220,38,38,.1)] border-[rgba(220,38,38,.3)] text-[var(--status-red)]',
    amber: 'bg-[rgba(217,119,6,.1)] border-[rgba(217,119,6,.3)] text-[var(--amber-l)]',
    info: 'bg-[rgba(37,99,235,.1)] border-[rgba(37,99,235,.3)] text-[var(--blue-l)]',
  };

  const levelIcons: Record<'red' | 'amber' | 'info', string> = {
    red: '⚠',
    amber: '⬥',
    info: 'ℹ',
  };

  return (
    <div
      className={`border rounded-[8px] p-[10px_16px] text-[12px] flex items-center justify-between ${levelClasses[alert.level]}`}
    >
      <div className="flex items-center gap-[8px]">
        <span>{levelIcons[alert.level]}</span>
        <span>{alert.title}: {alert.msg}</span>
      </div>
    </div>
  );
};

export default AlertBanner;
