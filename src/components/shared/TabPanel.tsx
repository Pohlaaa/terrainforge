import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabPanelProps {
  tabs: Tab[];
  children: React.ReactNode[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  children,
  defaultTab,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  return (
    <div>
      <div className="flex gap-0 border-b border-[var(--border)] mb-[20px]">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-[18px] py-[9px] text-[13px] font-[700] border-none bg-none cursor-pointer transition-colors duration-200 border-b-[2px] mb-[-1px] ${
              activeTab === tab.id
                ? 'text-[var(--green-l)] border-b-[var(--green-l)]'
                : 'text-[var(--text-3)] border-b-transparent hover:text-[var(--text)]'
            }`}
          >
            {tab.icon && <span>{tab.icon} </span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {children[tabs.findIndex((tab) => tab.id === activeTab)] || null}
      </div>
    </div>
  );
};

export default TabPanel;
