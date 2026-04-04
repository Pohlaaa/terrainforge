import React from 'react';
import type { Project, ScheduleEntry, CrewMember, ProjectPermit } from '@/types';

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[12px]';

export interface ProjectTimelineCardProps {
  project: Project;
  scheduleEntries: ScheduleEntry[];
  crew: CrewMember[];
  permits: ProjectPermit[];
}

export const ProjectTimelineCard: React.FC<ProjectTimelineCardProps> = ({
  project,
  scheduleEntries,
  crew,
  permits,
}) => {
  // Upcoming schedule (next 7 days)
  const now = new Date();
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  const upcoming = scheduleEntries
    .filter((e) => {
      const d = new Date(e.scheduledDate + 'T00:00:00');
      return d >= now && d <= weekOut;
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  return (
    <>
      {/* Upcoming Schedule */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className={cardHead}>Upcoming Schedule</div>
        {upcoming.length === 0 ? (
          <p className="text-[12px] text-[var(--text-4)]">No crew scheduled this week.</p>
        ) : (
          <div className="space-y-[6px]">
            {upcoming.slice(0, 5).map((entry) => {
              const member = crew.find((c) => c.id === entry.crewMemberId);
              return (
                <div key={entry.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--text)] font-[500]">{member?.name ?? 'Unknown'}</span>
                  <span className="text-[var(--text-4)]">
                    {new Date(entry.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compliance Summary */}
      {(permits.length > 0 || project.complianceNotes) && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Compliance</div>
          {permits.length > 0 && (
            <div className="flex gap-[4px] flex-wrap mb-[6px]">
              {permits.map((p) => (
                <span
                  key={p.id}
                  className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[500]"
                  style={{
                    backgroundColor:
                      p.status === 'approved' ? 'rgba(22,163,74,0.12)'
                        : p.status === 'applied' ? 'rgba(212,164,76,0.12)'
                        : 'var(--surface3)',
                    color:
                      p.status === 'approved' ? 'var(--status-green)'
                        : p.status === 'applied' ? 'var(--status-amber)'
                        : 'var(--text-4)',
                  }}
                >
                  {p.permitType.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          {project.complianceNotes && (
            <p className="text-[11px] text-[var(--text-4)] italic">{project.complianceNotes}</p>
          )}
        </div>
      )}
    </>
  );
};
