import React from 'react';
import type { Project, ProjectTask, ProjectSubcontractor, ProjectPermit, ScheduleEntry, CrewMember } from '@/types';

interface Props {
  project: Project;
  tasks: ProjectTask[];
  subcontractors: ProjectSubcontractor[];
  permits: ProjectPermit[];
  scheduleEntries: ScheduleEntry[];
  crew: CrewMember[];
}

const cardClass =
  'rounded-[10px] border p-[16px]';

const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[12px]';
const rowClass = 'flex justify-between text-[12px] py-[4px]';
const labelSpan = 'text-[var(--text-3)]';
const valueSpan = 'text-[var(--text)] font-[500]';

function fmt(n: number | null | undefined): string {
  if (n == null) return '$0';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const PHASE_LABELS: Record<string, string> = {
  demo_prep: 'Demo / Prep',
  rough_grade: 'Rough Grade',
  hardscape: 'Hardscape',
  softscape: 'Softscape',
  irrigation: 'Irrigation',
  lighting: 'Lighting',
  cleanup_punchlist: 'Cleanup / Punchlist',
  custom: 'Custom',
};

export const ProjectDashboardOverview: React.FC<Props> = ({
  project,
  tasks,
  subcontractors,
  permits,
  scheduleEntries,
  crew,
}) => {
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const checkedPermits = permits.filter((p) => p.status === 'approved').length;

  // Budget summary
  const labor = project.laborBudget ?? 0;
  const materials = project.materialsBudget ?? 0;
  const equipment = project.equipmentBudget ?? 0;
  const subs = project.subcontractorBudget ?? 0;
  const subtotal = labor + materials + equipment + subs;
  const overhead = subtotal * ((project.overheadPct ?? 10) / 100);
  const totalCost = subtotal + overhead;
  const quote = project.clientQuote ?? project.budget ?? 0;
  const profit = quote - totalCost;
  const marginPct = quote > 0 ? (profit / quote) * 100 : 0;

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

  // Active phase
  const phasesInProgress = [...new Set(
    tasks.filter((t) => t.status === 'in_progress').map((t) => t.phase)
  )];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[16px] items-start">
      {/* ── Left column ──────────────────────────────────────────────────────── */}
      <div className="space-y-[16px]">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
          {[
            { label: 'Tasks', value: `${completedTasks}/${tasks.length}`, sub: tasks.length > 0 ? `${Math.round((completedTasks / tasks.length) * 100)}% done` : 'No tasks' },
            { label: 'Est. Hours', value: `${totalHours}h`, sub: project.estimatedHours ? `of ${project.estimatedHours}h` : '' },
            { label: 'Budget', value: fmt(totalCost), sub: quote > 0 ? `Quote: ${fmt(quote)}` : '' },
            { label: 'Margin', value: quote > 0 ? `${marginPct.toFixed(0)}%` : '—', sub: profit > 0 ? fmt(profit) : profit < 0 ? `(${fmt(Math.abs(profit))})` : '' },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-[8px] border p-[12px]"
              style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[4px]">{kpi.label}</div>
              <div className="text-[18px] font-[700] text-[var(--text)]">{kpi.value}</div>
              {kpi.sub && <div className="text-[11px] text-[var(--text-4)] mt-[2px]">{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Active Phase */}
        {phasesInProgress.length > 0 && (
          <div
            className={cardClass}
            style={{ backgroundColor: 'rgba(45,106,79,0.06)', borderColor: 'var(--green)' }}
          >
            <div className="text-[12px] font-[600] text-[var(--green-l)] mb-[6px]">Active Phase</div>
            <div className="flex gap-[6px] flex-wrap">
              {phasesInProgress.map((phase) => (
                <span
                  key={phase}
                  className="px-[10px] py-[4px] rounded-[6px] text-[12px] font-[500]"
                  style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--green-l)' }}
                >
                  {PHASE_LABELS[phase] || phase}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {project.description && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Description</div>
            <p className="text-[13px] text-[var(--text-2)] leading-[1.5]">{project.description}</p>
          </div>
        )}

        {/* Recent Tasks */}
        {tasks.length > 0 && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Tasks Overview</div>
            <div className="space-y-[6px]">
              {tasks.slice(0, 8).map((task) => (
                <div key={task.id} className="flex items-center gap-[8px] text-[12px]">
                  <span
                    className="w-[8px] h-[8px] rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        task.status === 'completed' ? 'var(--status-green)'
                          : task.status === 'in_progress' ? 'var(--status-amber)'
                          : 'var(--border)',
                    }}
                  />
                  <span className="text-[var(--text)] flex-1">{task.name}</span>
                  <span className="text-[var(--text-4)] text-[11px]">
                    {PHASE_LABELS[task.phase] || task.phase}
                  </span>
                  {task.estimatedHours != null && (
                    <span className="text-[var(--text-4)] text-[11px]">{task.estimatedHours}h</span>
                  )}
                </div>
              ))}
              {tasks.length > 8 && (
                <div className="text-[11px] text-[var(--text-4)] pt-[4px]">
                  +{tasks.length - 8} more tasks
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right column ─────────────────────────────────────────────────────── */}
      <div className="space-y-[12px]">
        {/* Project Info */}
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Project Info</div>
          <div className="space-y-[6px]">
            {project.clientName && (
              <div className={rowClass}>
                <span className={labelSpan}>Client</span>
                <span className={valueSpan}>{project.clientName}</span>
              </div>
            )}
            {project.clientPhone && (
              <div className={rowClass}>
                <span className={labelSpan}>Phone</span>
                <span className={valueSpan}>{project.clientPhone}</span>
              </div>
            )}
            {project.clientEmail && (
              <div className={rowClass}>
                <span className={labelSpan}>Email</span>
                <span className={valueSpan}>{project.clientEmail}</span>
              </div>
            )}
            <div className={rowClass}>
              <span className={labelSpan}>Start</span>
              <span className={valueSpan}>
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className={rowClass}>
              <span className={labelSpan}>Target</span>
              <span className={valueSpan}>
                {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Site Conditions */}
        {(project.climateZone || project.soilType || project.slopeGrade || project.sunExposure) && (
          <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
            <div className={cardHead}>Site Conditions</div>
            <div className="space-y-[6px]">
              {project.climateZone && <div className={rowClass}><span className={labelSpan}>Climate</span><span className={valueSpan}>{project.climateZone}</span></div>}
              {project.soilType && <div className={rowClass}><span className={labelSpan}>Soil</span><span className={valueSpan}>{project.soilType}</span></div>}
              {project.slopeGrade && <div className={rowClass}><span className={labelSpan}>Slope</span><span className={valueSpan}>{project.slopeGrade}</span></div>}
              {project.sunExposure && <div className={rowClass}><span className={labelSpan}>Sun</span><span className={valueSpan}>{project.sunExposure.replace('_', ' ')}</span></div>}
              {project.drainagePattern && <div className={rowClass}><span className={labelSpan}>Drainage</span><span className={valueSpan}>{project.drainagePattern}</span></div>}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};
