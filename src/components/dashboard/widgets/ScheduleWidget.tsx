import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useProjectStore } from '@/stores/projectStore';
import { useCrewStore } from '@/stores/crewStore';
import type { ScheduleEntry } from '@/types';

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function statusLabel(status: ScheduleEntry['status']): { text: string; color: string } {
  const map: Record<string, { text: string; color: string }> = {
    scheduled: { text: 'Scheduled', color: 'var(--text-3)' },
    in_progress: { text: 'In Progress', color: 'var(--green-l)' },
    completed: { text: 'Done', color: '#60A5FA' },
    cancelled: { text: 'Cancelled', color: '#F87171' },
  };
  return map[status] ?? map.scheduled;
}

export const ScheduleWidget: React.FC = () => {
  const navigate = useNavigate();
  const { getEntriesForDate } = useScheduleStore();
  const { projects } = useProjectStore();
  const { crew } = useCrewStore();

  const todayISO = isoDate(new Date());
  const rawEntries = getEntriesForDate(todayISO);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const crewMap = Object.fromEntries(crew.map(m => [m.id, m.name]));

  // Filter out entries referencing projects that don't exist (stale seed data)
  const todayEntries = rawEntries.filter(e => projectMap[e.projectId]);

  return (
    <div className="p-[14px]">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <button
          onClick={() => navigate('/schedule')}
          style={{
            background: 'transparent', border: 'none', fontSize: '13px',
            color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
        >
          View full schedule →
        </button>
      </div>

      {todayEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>📅</div>
          <div style={{ fontSize: '13px' }}>No crew scheduled today</div>
        </div>
      ) : (
        <div className="space-y-[6px]">
          {todayEntries.map((entry) => {
            const crewName = crewMap[entry.crewMemberId] ?? 'Unknown';
            const projName = projectMap[entry.projectId] ?? 'Unknown project';
            const s = statusLabel(entry.status);
            return (
              <div
                key={entry.id}
                style={{
                  background: 'var(--surface-hover)', border: '1px solid var(--border-default)',
                  borderRadius: '8px', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {crewName} → {projName}
                  </div>
                  {entry.startTime && (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                      {entry.startTime}{entry.endTime ? ` – ${entry.endTime}` : ''}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, color: s.color,
                  textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
                }}>
                  {s.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScheduleWidget;
