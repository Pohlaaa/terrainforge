import React from 'react';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        textAlign: 'center',
        gap: '0',
      }}
    >
      <div style={{ marginBottom: '20px', opacity: 0.6 }}>{icon}</div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '8px',
          lineHeight: 1.3,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          maxWidth: '340px',
          lineHeight: 1.6,
          marginBottom: actionLabel ? '24px' : '0',
        }}
      >
        {description}
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

// SVG illustrations for each page
export const ProjectsIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="10" y="8" width="44" height="54" rx="4" stroke="var(--brand-primary)" strokeWidth="2" />
    <path d="M20 20h24M20 30h24M20 40h16" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="46" cy="52" r="9" fill="var(--surface-card)" stroke="var(--brand-primary)" strokeWidth="2" />
    <path d="M43 52l2 2 4-4" stroke="var(--brand-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MaterialsIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="8" y="32" width="20" height="20" rx="3" stroke="var(--brand-primary)" strokeWidth="2" />
    <rect x="22" y="22" width="20" height="20" rx="3" stroke="var(--brand-primary)" strokeWidth="2" />
    <rect x="36" y="32" width="20" height="20" rx="3" stroke="var(--brand-primary)" strokeWidth="2" />
    <rect x="22" y="42" width="20" height="10" rx="2" fill="var(--brand-primary)" fillOpacity="0.15" stroke="var(--brand-primary)" strokeWidth="1.5" />
  </svg>
);

export const CrewIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <circle cx="32" cy="18" r="10" stroke="var(--brand-primary)" strokeWidth="2" />
    <path d="M12 54c0-11 9-18 20-18s20 7 20 18" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="24" r="7" stroke="var(--text-tertiary)" strokeWidth="1.5" />
    <path d="M2 54c0-8 5-13 10-13" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="52" cy="24" r="7" stroke="var(--text-tertiary)" strokeWidth="1.5" />
    <path d="M62 54c0-8-5-13-10-13" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const EquipmentIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="4" y="28" width="40" height="20" rx="4" stroke="var(--brand-primary)" strokeWidth="2" />
    <path d="M44 36h10l6 8H44" stroke="var(--brand-primary)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="16" cy="52" r="6" stroke="var(--brand-primary)" strokeWidth="2" />
    <circle cx="48" cy="52" r="6" stroke="var(--brand-primary)" strokeWidth="2" />
    <path d="M12 28l8-14h16" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WorkOrdersIcon = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    <rect x="10" y="8" width="36" height="44" rx="4" stroke="var(--text-tertiary)" strokeWidth="2" />
    <path d="M20 20h16M20 28h16M20 36h10" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="46" cy="46" r="12" fill="var(--surface-card)" stroke="var(--brand-primary)" strokeWidth="2" />
    <path d="M42 46l2.5 2.5L50 41" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default EmptyState;
