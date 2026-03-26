import React from 'react';
import { Sidebar } from './Sidebar';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  count?: number;
}

interface AppLayoutProps {
  children: React.ReactNode;
  topbarTitle?: string;
  topbarActions?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  topbarTitle = 'Dashboard',
  topbarActions,
}) => {
  return (
    <div className="grid grid-cols-[240px_1fr] min-h-screen">
      <Sidebar />

      <div className="flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-[32px] py-[14px] border-b border-[var(--border)] bg-[var(--surface)] flex-wrap gap-[16px]">
          <div className="font-serif text-[22px] text-[var(--text)]">
            {topbarTitle}
          </div>
          <div className="flex gap-[8px] items-center">{topbarActions}</div>
        </div>

        {/* Main content */}
        <div className="px-[32px] py-[28px] flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
