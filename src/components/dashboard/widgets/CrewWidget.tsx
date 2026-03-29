import React from 'react';
import type { AppState } from '@/types';
import { useCrewStore } from '@/stores/crewStore';

interface CrewWidgetProps {
  appState: AppState;
}

export const CrewWidget: React.FC<CrewWidgetProps> = ({ appState }) => {
  const { crew, projects } = appState;
  const { getAvailableToday } = useCrewStore();

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
    <div className="px-[14px] py-[10px] max-h-[180px] overflow-y-auto">
      <div className="space-y-[8px]">
        {crewRows.map((member) => (
          <div key={member.id} className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-secondary)]">{member.name}</span>
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default CrewWidget;
