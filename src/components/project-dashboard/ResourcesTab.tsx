import React from 'react';
import type { Project, ProjectSubcontractor, ScheduleEntry, CrewMember } from '@/types';

interface Props {
  project: Project;
  subcontractors: ProjectSubcontractor[];
  crew: CrewMember[];
  scheduleEntries: ScheduleEntry[];
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';
const rowClass = 'flex justify-between text-[12px] py-[4px]';

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--text-4)',
  confirmed: 'var(--status-blue)',
  in_progress: 'var(--status-amber)',
  completed: 'var(--status-green)',
  cancelled: 'var(--status-red)',
};

export const ProjectDashboardResources: React.FC<Props> = ({
  project,
  subcontractors,
  crew,
  scheduleEntries,
}) => {
  // Unique crew members scheduled for this project
  const scheduledCrewIds = [...new Set(scheduleEntries.map((e) => e.crewMemberId))];
  const scheduledCrew = scheduledCrewIds
    .map((id) => crew.find((c) => c.id === id))
    .filter(Boolean) as CrewMember[];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
      {/* ── Crew ──────────────────────────────────────────────────────────────── */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className={cardHead}>
          Crew {project.scopeSize ? `(est. size: ${project.scopeSize})` : ''}
        </div>

        {scheduledCrew.length === 0 ? (
          <p className="text-[12px] text-[var(--text-4)]">
            No crew scheduled yet. Assign crew on the Schedule page.
          </p>
        ) : (
          <div className="space-y-[8px]">
            {scheduledCrew.map((member) => {
              const entries = scheduleEntries.filter((e) => e.crewMemberId === member.id);
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-[10px] rounded-[8px] border px-[10px] py-[8px]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[13px] font-[600] shrink-0"
                    style={{ backgroundColor: 'rgba(45,106,79,0.15)', color: 'var(--green-l)' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-[500] text-[var(--text)]">{member.name}</div>
                    <div className="text-[11px] text-[var(--text-4)]">
                      {member.role} · {entries.length} day{entries.length !== 1 ? 's' : ''} scheduled
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── Subcontractors ────────────────────────────────────────────────────── */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className={cardHead}>Subcontractors ({subcontractors.length})</div>

        {subcontractors.length === 0 ? (
          <p className="text-[12px] text-[var(--text-4)]">
            No subcontractors assigned to this project.
          </p>
        ) : (
          <div className="space-y-[10px]">
            {subcontractors.map((sub) => (
              <div
                key={sub.id}
                className="rounded-[8px] border px-[12px] py-[10px]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between mb-[4px]">
                  <span className="text-[13px] font-[600] text-[var(--text)]">{sub.companyName}</span>
                  <span
                    className="text-[10px] font-[500] px-[6px] py-[1px] rounded-[4px]"
                    style={{
                      color: STATUS_COLORS[sub.status] || 'var(--text-4)',
                      backgroundColor: `${STATUS_COLORS[sub.status] || 'var(--text-4)'}15`,
                    }}
                  >
                    {sub.status}
                  </span>
                </div>
                {sub.trade && (
                  <div className="text-[11px] text-[var(--text-3)] mb-[2px]">{sub.trade}</div>
                )}
                {sub.scopeDescription && (
                  <div className="text-[11px] text-[var(--text-4)]">{sub.scopeDescription}</div>
                )}
                <div className={`${rowClass} mt-[6px]`}>
                  <span className="text-[var(--text-4)]">Quoted</span>
                  <span className="text-[var(--text)] font-[500]">{fmt(sub.quotedCost)}</span>
                </div>
                {sub.contactName && (
                  <div className="text-[11px] text-[var(--text-4)]">
                    Contact: {sub.contactName}{sub.phone ? ` · ${sub.phone}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Equipment ─────────────────────────────────────────────────────────── */}
      {project.notes && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Equipment</div>
          <p className="text-[12px] text-[var(--text-2)]">{project.notes}</p>
        </div>
      )}

      {/* ── Zones ─────────────────────────────────────────────────────────────── */}
      {project.zones.length > 0 && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Zones ({project.zones.length})</div>
          <div className="space-y-[6px]">
            {project.zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between rounded-[6px] px-[10px] py-[6px]"
                style={{ backgroundColor: 'var(--surface3)' }}
              >
                <span className="text-[12px] font-[500] text-[var(--text)]">{zone.name}</span>
                <span className="text-[11px] text-[var(--text-4)]">
                  {zone.area.toLocaleString()} sqft · {zone.materials?.length ?? 0} materials
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
