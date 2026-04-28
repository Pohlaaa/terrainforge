import React, { useMemo, useState } from 'react';
import { scheduleTasksOnTimeline, getWeekdayDates } from '@/lib/taskTimeline';
import type { ProjectTask, ProjectMaterial, Equipment } from '@/types';
import type { WizardTask } from '@/pages/ProjectWizard';

const PHASES = [
  { value: 'demo_prep', label: 'Demo / Prep' },
  { value: 'rough_grade', label: 'Rough Grade' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'softscape', label: 'Softscape' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'cleanup_punchlist', label: 'Cleanup / Punchlist' },
  { value: 'custom', label: 'Custom' },
];

const PHASE_COLORS: Record<string, string> = {
  demo_prep: '#e05c5c',
  rough_grade: '#d4a44c',
  hardscape: '#5c8fd4',
  softscape: '#2d6a4f',
  irrigation: '#4ecdc4',
  lighting: '#f4d35e',
  cleanup_punchlist: '#95a5a6',
  custom: '#8e6bb0',
};

interface TaskTimelineProps {
  tasks: ProjectTask[];
  startDate: string | null;
  targetDate: string | null;
  crewSize: number;
  /** Optional: crew schedule entries to show in the Gantt */
  crewEntries?: { id: string; crewName: string; date: string; status: string }[];
  /** Optional: project materials for per-phase display */
  projectMaterials?: ProjectMaterial[];
  /** Optional: equipment assigned to this project */
  projectEquipment?: Equipment[];
  /** Crew members available for assignment display */
  crewMembers?: { id: string; name: string }[];
  /** Callback for inline task editing */
  onTaskUpdate?: (taskId: string, updates: Partial<ProjectTask>) => void;
}

/**
 * Gantt-style task timeline used on the project dashboard.
 * Reuses the same scheduling algorithm as the wizard (taskTimeline.ts).
 */
export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  tasks,
  startDate,
  targetDate,
  crewSize,
  crewEntries,
  projectMaterials = [],
  projectEquipment = [],
  crewMembers = [],
  onTaskUpdate,
}) => {
  const [expandedTaskName, setExpandedTaskName] = useState<string | null>(null);
  // Adapt ProjectTask → WizardTask for the scheduler
  const wizardTasks: WizardTask[] = useMemo(() =>
    tasks.map(t => ({
      tempId: t.id,
      name: t.name,
      description: t.description,
      phase: t.phase,
      sequenceNumber: t.sequenceNumber,
      estimatedHours: t.estimatedHours,
    })),
    [tasks]
  );

  const scheduledTasks = useMemo(() => {
    if (!startDate || !targetDate || wizardTasks.length === 0) return [];
    return scheduleTasksOnTimeline(wizardTasks, startDate, targetDate, crewSize);
  }, [wizardTasks, startDate, targetDate, crewSize]);

  const weekdayDates = useMemo(() => {
    if (!startDate || !targetDate) return [];
    return getWeekdayDates(startDate, targetDate);
  }, [startDate, targetDate]);

  const totalTimelineDays = weekdayDates.length;

  // Task status lookup for coloring completed/in-progress bars
  const taskStatusMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tasks) {
      map[t.name] = t.status;
    }
    return map;
  }, [tasks]);

  if (scheduledTasks.length === 0 || totalTimelineDays === 0) {
    if (!startDate || !targetDate) {
      return (
        <p className="text-[12px] text-[var(--text-4)]">
          Set start and target dates to see the task timeline.
        </p>
      );
    }
    return (
      <p className="text-[12px] text-[var(--text-4)]">No tasks to schedule.</p>
    );
  }

  // Group scheduled tasks by phase
  const phaseOrder: string[] = [];
  const tasksByPhase: Record<string, typeof scheduledTasks> = {};
  for (const st of scheduledTasks) {
    if (!tasksByPhase[st.phase]) {
      tasksByPhase[st.phase] = [];
      phaseOrder.push(st.phase);
    }
    tasksByPhase[st.phase].push(st);
  }

  const totalScheduledDays = scheduledTasks.reduce(
    (max, t) => Math.max(max, t.startDay + t.durationDays), 0
  );

  const exceedsTarget = totalScheduledDays > totalTimelineDays;

  // Active phase groups for legend
  const phaseGroups = PHASES.filter(p => phaseOrder.includes(p.value));

  return (
    <div>
      <p className="text-[12px] text-[var(--text-4)] mb-[8px]">
        {totalTimelineDays} weekdays · {startDate} to {targetDate}
        {crewSize > 1 && ` · ${crewSize} crew`}
      </p>
      {/* X-12: surface schedule overrun explicitly. The algorithm packs
          tasks within their sequence + phase rules and reports the
          required day count; if it exceeds the target window the bars
          extend off-screen via overflow-x-auto. Without this banner the
          contractor sees a visually long timeline with no explanation
          ("13 working days" when they only set 5). */}
      {exceedsTarget && (
        <div
          className="text-[11px] mb-[8px] px-[10px] py-[6px] rounded-[6px]"
          style={{
            backgroundColor: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.4)',
            color: '#F59E0B',
          }}
        >
          ⚠ Schedule needs {totalScheduledDays} working days but you've allotted{' '}
          {totalTimelineDays}. Extend the target date or add crew to fit the
          window.
        </div>
      )}

      <div
        className="rounded-[8px] border overflow-x-auto"
        style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <div style={{ minWidth: Math.max(500, totalTimelineDays * 32) + 240 }}>
          {/* Day headers */}
          <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="w-[240px] shrink-0 px-[8px] py-[6px] text-[10px] font-[600] text-[var(--text-3)]">
              Phase / Task
            </div>
            <div className="flex-1 flex">
              {weekdayDates.map((d, i) => {
                const isWeekStart = d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className="flex-1 text-center text-[9px] py-[4px]"
                    style={{
                      color: 'var(--text-4)',
                      borderLeft: isWeekStart ? '1px solid var(--border)' : '1px solid var(--surface3)',
                      minWidth: 28,
                    }}
                  >
                    {totalTimelineDays <= 15
                      ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
                      : isWeekStart
                        ? d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                        : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows grouped by phase */}
          {phaseOrder.map((phase) => {
            const phaseTasks = tasksByPhase[phase];
            const phaseLabel = PHASES.find(p => p.value === phase)?.label || phase;

            return (
              <div key={phase}>
                {/* Phase header */}
                <div
                  className="flex items-center border-b"
                  style={{ borderColor: 'var(--border)', minHeight: 24 }}
                >
                  <div
                    className="w-[240px] shrink-0 px-[8px] text-[10px] font-[600] uppercase tracking-wide flex items-center gap-[6px]"
                    style={{ color: PHASE_COLORS[phase] || PHASE_COLORS.custom }}
                  >
                    <div
                      className="w-[8px] h-[8px] rounded-[2px]"
                      style={{ backgroundColor: PHASE_COLORS[phase] || PHASE_COLORS.custom }}
                    />
                    {phaseLabel}
                  </div>
                  <div className="flex-1" />
                </div>

                {/* Task bars */}
                {phaseTasks.map((task, i) => {
                  const barLeftPct = (task.startDay / totalTimelineDays) * 100;
                  const barWidthPct = Math.max((task.durationDays / totalTimelineDays) * 100, 3);
                  const barPixelWidth = (barWidthPct / 100) * Math.max(500, totalTimelineDays * 32);
                  const nameOverflows = barPixelWidth < 100;
                  const status = taskStatusMap[task.name] ?? 'pending';
                  const barColor = PHASE_COLORS[task.phase] || PHASE_COLORS.custom;
                  const barOpacity = status === 'completed' ? 0.4 : 0.85;
                  const isExpanded = expandedTaskName === task.name;
                  // Find the source ProjectTask for this scheduled task
                  const sourceTask = tasks.find(t => t.name === task.name);
                  // Per-task crew member
                  const assignedCrew = sourceTask?.assignedCrewId ? crewMembers.find(c => c.id === sourceTask.assignedCrewId) : null;

                  return (
                    <div key={`${phase}-${i}`}>
                      <div
                        className="flex items-center border-b cursor-pointer hover:bg-[var(--surface3)] transition-colors"
                        style={{ borderColor: 'var(--border)', minHeight: 34, borderLeft: `3px solid ${barColor}` }}
                        onClick={() => setExpandedTaskName(isExpanded ? null : task.name)}
                      >
                        <div className="w-[240px] shrink-0 px-[8px] text-[11px] font-[500] truncate flex items-center gap-[4px]" style={{ color: 'var(--text-2)', paddingLeft: 16 }}>
                          {status === 'completed' && <span className="text-[var(--status-green)] text-[10px]">&#10003;</span>}
                          {status === 'in_progress' && <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: 'var(--status-amber)' }} />}
                          <span className={status === 'completed' ? 'line-through opacity-60' : ''}>{task.name}</span>
                          {assignedCrew && <span className="text-[9px] text-[var(--text-4)] ml-[2px]">({assignedCrew.name})</span>}
                        </div>
                        <div className="flex-1 relative" style={{ minHeight: 26 }}>
                          <div className="absolute top-[3px] bottom-[3px] rounded-[4px] flex items-center px-[6px]"
                            style={{ left: `${barLeftPct}%`, width: `${barWidthPct}%`, minWidth: 20, backgroundColor: barColor, opacity: barOpacity }}>
                            {!nameOverflows && (
                              <span className="text-[9px] font-[600] text-white truncate">
                                {task.estimatedHours > 0 ? `${task.estimatedHours}mh · ${task.durationDays}d` : `${task.durationDays}d`}
                              </span>
                            )}
                          </div>
                          {nameOverflows && (
                            <span className="absolute text-[9px] font-[500] whitespace-nowrap" style={{ left: `calc(${barLeftPct + barWidthPct}% + 6px)`, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                              {task.estimatedHours > 0 ? `${task.estimatedHours}mh` : `${task.durationDays}d`}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Expanded edit row */}
                      {isExpanded && sourceTask && (
                        <div className="border-b px-[16px] py-[10px] space-y-[6px]" style={{ borderColor: 'var(--border)', backgroundColor: 'rgba(45,106,79,0.04)', borderLeft: `3px solid ${barColor}` }}>
                          <div className="flex items-center gap-[8px] flex-wrap">
                            <input className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[6px] py-[3px] text-[12px] text-[var(--text)] flex-1 focus:outline-none focus:border-[var(--green)]"
                              defaultValue={sourceTask.name} onBlur={(e) => onTaskUpdate?.(sourceTask.id, { name: e.target.value })} />
                            <label className="text-[10px] text-[var(--text-4)]">Hours:</label>
                            <input className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[4px] py-[3px] text-[12px] text-[var(--text)] w-[50px] text-right focus:outline-none focus:border-[var(--green)]"
                              type="number" min="0" defaultValue={sourceTask.estimatedHours ?? ''} onBlur={(e) => onTaskUpdate?.(sourceTask.id, { estimatedHours: parseFloat(e.target.value) || null })} />
                            <label className="text-[10px] text-[var(--text-4)]">Crew:</label>
                            <select className="bg-[var(--surface)] border border-[var(--border)] rounded-[4px] px-[4px] py-[3px] text-[11px] text-[var(--text)] focus:outline-none"
                              defaultValue={sourceTask.assignedCrewId ?? ''} onChange={(e) => onTaskUpdate?.(sourceTask.id, { assignedCrewId: e.target.value || null })}>
                              <option value="">Unassigned</option>
                              {crewMembers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {/* Crew rows inside the Gantt */}
          {crewEntries && crewEntries.length > 0 && (() => {
            // Group entries by crew member, map dates to day indices
            const crewMap = new Map<string, Set<number>>();
            const crewStatusMap = new Map<string, Map<number, string>>();
            for (const entry of crewEntries) {
              if (!crewMap.has(entry.crewName)) {
                crewMap.set(entry.crewName, new Set());
                crewStatusMap.set(entry.crewName, new Map());
              }
              // Find which weekday index this date falls on
              const entryDate = new Date(entry.date + 'T00:00:00');
              const dayIdx = weekdayDates.findIndex(d =>
                d.getFullYear() === entryDate.getFullYear() &&
                d.getMonth() === entryDate.getMonth() &&
                d.getDate() === entryDate.getDate()
              );
              if (dayIdx >= 0) {
                crewMap.get(entry.crewName)!.add(dayIdx);
                crewStatusMap.get(entry.crewName)!.set(dayIdx, entry.status);
              }
            }

            return (
              <div>
                {/* Crew section header */}
                <div
                  className="flex items-center border-b border-t"
                  style={{ borderColor: 'var(--border)', minHeight: 24, marginTop: 4 }}
                >
                  <div className="w-[240px] shrink-0 px-[8px] text-[10px] font-[600] uppercase tracking-wide text-[var(--text-3)] flex items-center gap-[6px]">
                    <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: 'var(--status-info)' }} />
                    Crew
                  </div>
                  <div className="flex-1" />
                </div>
                {[...crewMap.entries()].map(([name, dayIndices]) => (
                  <div
                    key={name}
                    className="flex items-center border-b last:border-b-0"
                    style={{ borderColor: 'var(--border)', minHeight: 30 }}
                  >
                    <div
                      className="w-[240px] shrink-0 px-[8px] text-[11px] font-[500] truncate"
                      style={{ color: 'var(--text-2)', paddingLeft: 16 }}
                    >
                      {name}
                    </div>
                    <div className="flex-1 flex" style={{ minHeight: 24 }}>
                      {weekdayDates.map((_, i) => {
                        const isScheduled = dayIndices.has(i);
                        const status = crewStatusMap.get(name)?.get(i);
                        const dotColor = !isScheduled ? 'transparent'
                          : status === 'completed' ? 'var(--status-green)'
                          : status === 'in_progress' ? 'var(--status-amber)'
                          : 'var(--status-info)';
                        return (
                          <div
                            key={i}
                            className="flex-1 flex items-center justify-center"
                            style={{ minWidth: 28 }}
                          >
                            {isScheduled && (
                              <div
                                className="w-[8px] h-[8px] rounded-full"
                                style={{ backgroundColor: dotColor }}
                                title={`${name} — ${weekdayDates[i].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${status}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Footer: day count + legend */}
      <div className="flex items-center justify-between mt-[8px]">
        <span className="text-[11px]" style={{ color: exceedsTarget ? 'var(--status-amber)' : 'var(--text-3)' }}>
          Estimated: {totalScheduledDays} working day{totalScheduledDays !== 1 ? 's' : ''}
          {exceedsTarget && ` (${totalScheduledDays - totalTimelineDays}d over target — add crew or reduce scope)`}
        </span>
        <div className="flex gap-[10px] flex-wrap">
          {phaseGroups.map(g => (
            <div key={g.value} className="flex items-center gap-[4px]">
              <div
                className="w-[10px] h-[10px] rounded-[2px]"
                style={{ backgroundColor: PHASE_COLORS[g.value] || PHASE_COLORS.custom }}
              />
              <span className="text-[10px] text-[var(--text-4)]">{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
