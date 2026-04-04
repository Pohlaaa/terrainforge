import React from 'react';
import { useOrgStore } from '@/stores/orgStore';

export const HubHeader: React.FC = () => {
  const org = useOrgStore((s) => s.org);
  const now = new Date();
  const formatted = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex items-baseline justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{org?.name || 'TerrainForge'}</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Landscaping Project Management</p>
      </div>
      <div className="text-right text-sm text-[var(--text-tertiary)]">
        <div>Today</div>
        <div className="font-medium text-[var(--text-secondary)]">{formatted}</div>
      </div>
    </div>
  );
};
