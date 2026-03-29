import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '@/types';
import { getAllAlerts } from '@/lib/alerts';

interface AlertsWidgetProps {
  appState: AppState;
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({ appState }) => {
  const alerts = getAllAlerts(appState);
  const topAlerts = alerts.slice(0, 5);
  const navigate = useNavigate();

  const getAlertRoute = (level: string) => {
    if (level === 'red' || level === 'amber') return '/work-orders';
    return '/work-orders';
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '6px 14px 0',
        }}
      >
        <button
          onClick={() => navigate('/work-orders')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
        >
          View All →
        </button>
      </div>
      <div className="max-h-[240px] overflow-y-auto p-[8px_14px]">
        {topAlerts.length === 0 ? (
          <div className="text-[12px] text-[var(--text-tertiary)]">No alerts</div>
        ) : (
          <div className="space-y-[6px]">
            {topAlerts.map((alert, idx) => (
              <div
                key={idx}
                onClick={() => navigate(getAlertRoute(alert.level))}
                style={{ cursor: 'pointer' }}
                className={`px-[10px] py-[8px] rounded-[6px] text-[11px] transition-opacity hover:opacity-80 ${
                  alert.level === 'red'
                    ? 'bg-[rgba(220,38,38,.1)] border border-[rgba(220,38,38,.3)] text-[#DC2626]'
                    : alert.level === 'amber'
                    ? 'bg-[rgba(251,146,60,.1)] border border-[rgba(251,146,60,.3)] text-[#FB923C]'
                    : 'bg-[rgba(59,130,246,.1)] border border-[rgba(59,130,246,.3)] text-[#3B82F6]'
                }`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="font-[600]">
                    {alert.icon} {alert.title}
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.6, flexShrink: 0 }}>
                    <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-[10px] mt-[2px]">{alert.msg}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsWidget;
