import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '@/types';
import { useCrewStore } from '@/stores/crewStore';

interface CrewWidgetProps {
  appState: AppState;
}

export const CrewWidget: React.FC<CrewWidgetProps> = ({ appState }) => {
  const { crew, projects } = appState;
  const { getAvailableToday } = useCrewStore();
  const navigate = useNavigate();

  const availableToday = getAvailableToday();
  const availableTodayIds = new Set(availableToday.map((m) => m.id));
  const assignedCrewIds = new Set(
    projects.flatMap((p) => p.zones.map((z) => z.crew)).filter(Boolean),
  );
  const todayISO = new Date().toISOString().split('T')[0];
  const bookedTodayIds = new Set(
    crew.filter((m) => (m.bookedDates ?? []).includes(todayISO)).map((m) => m.id),
  );

  const crewRows = crew.map((m) => ({
    id: m.id,
    name: m.name,
    availableToday: availableTodayIds.has(m.id),
    assigned: assignedCrewIds.has(m.id),
    bookedToday: bookedTodayIds.has(m.id),
  }));

  if (crewRows.length === 0) {
    return (
      <div className="px-[14px] py-[10px] text-[12px] text-[var(--text-tertiary)]">
        No crew assigned
      </div>
    );
  }

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
          onClick={() => navigate('/crew')}
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
      <div className="px-[14px] py-[8px] max-h-[180px] overflow-y-auto">
        <div className="space-y-[4px]">
          {crewRows.map((member) => (
            <div
              key={member.id}
              onClick={() => navigate('/crew')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <span className="text-[var(--text-secondary)]">{member.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {member.assigned ? (
                  <span className="inline-flex bg-[#60A5FA] text-white px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]">
                    On Job
                  </span>
                ) : member.bookedToday ? (
                  <span className="inline-flex bg-[#FB923C] text-white px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]">
                    Booked
                  </span>
                ) : member.availableToday ? (
                  <span
                    className="inline-flex text-white px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Available
                  </span>
                ) : (
                  <span className="inline-flex bg-[var(--surface-hover)] text-[var(--text-tertiary)] px-[6px] py-[2px] rounded-[4px] font-[600] text-[10px]">
                    Off
                  </span>
                )}
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--text-tertiary)' }}>
                  <path d="M4 2.5l3.5 3.5L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CrewWidget;
