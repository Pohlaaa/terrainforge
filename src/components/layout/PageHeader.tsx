import React from 'react';
import { Button } from '../ui/Button';

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: string;
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: PageHeaderAction[];
  titleExtra?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  titleExtra,
}) => {
  return (
    <div className="flex items-center justify-between pb-[14px] border-b border-[var(--border)] mb-[28px] flex-wrap gap-[16px]">
      <div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 className="font-serif text-[22px] text-[var(--text)]">{title}</h1>
          {titleExtra}
        </div>
        {subtitle && (
          <p className="text-[13px] text-[var(--text-3)] mt-[4px]">{subtitle}</p>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex gap-[8px] items-center">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || 'primary'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
