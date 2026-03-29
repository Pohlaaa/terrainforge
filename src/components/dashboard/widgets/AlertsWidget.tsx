import React from 'react';
import type { AppState } from '@/types';
import { getAllAlerts } from '@/lib/alerts';

interface AlertsWidgetProps {
  appState: AppState;
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({ appState }) => {
  const alerts = getAllAlerts(appState);
  const topAlerts = alerts.slice(0, 5);

  return (
    <div className="max-h-[260px] overflow-y-auto p-[10px_14px]">
      {topAlerts.length === 0 ? (
        <div className="text-[12px] text-[var(--text-tertiary)]">No alerts</div>
      ) : (
        <div className="space-y-[8px]">
          {topAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`px-[10px] py-[8px] rounded-[6px] text-[11px] ${
                alert.level === 'red'
                  ? 'bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.3)] text-[#DC2626]'
                  : alert.level === 'amber'
                  ? 'bg-[rgba(251,146,60,.1)] border border-[rgba(251,146,60,.3)] text-[#FB923C]'
                  : 'bg-[rgba(59,130,246,.1)] border border-[rgba(59,130,246,.3)] text-[#3B82F6]'
              }`}
            >
              <div className="font-[600]">
                {alert.icon} {alert.title}
              </div>
              <div className="text-[10px] mt-[2px]">{alert.msg}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsWidget;
