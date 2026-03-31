import React, { useMemo } from 'react';
import type { ProjectTask } from '@/types';

interface Props {
  tasks: ProjectTask[];
  onStatusChange: (taskId: string, newStatus: string) => void;
}

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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'var(--text-4)' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--status-amber)' },
  { value: 'completed', label: 'Completed', color: 'var(--status-green)' },
  { value: 'skipped', label: 'Skipped', color: 'var(--text-4)' },
  { value: 'blocked', label: 'Blocked', color: 'var(--status-red)' },
];

function statusColor(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || 'var(--text-4)';
}

export const ProjectDashboardTasks: React.FC<Props> = ({ tasks, onStatusChange }) => {
  // Group tasks by phase
  const groupedTasks = useMemo(() => {
    const groups: { phase: string; label: string; tasks: ProjectTask[] }[] = [];

    for (const phase of PHASES) {
      const phaseTasks = tasks
        .filter((t) => t.phase === phase.value)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      if (phaseTasks.length > 0) {
        groups.push({ phase: phase.value, label: phase.label, tasks: phaseTasks });
      }
    }

    return groups;
  }, [tasks]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);
  const completedHours = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0);

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-[10px] border-2 border-dashed p-[40px] text-center"
        style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
      >
        <p className="text-[14px] mb-[4px]">No tasks yet</p>
        <p className="text-[12px]">Tasks are created during project setup via the wizard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-[20px]">
      {/* Summary bar */}
      <div className="flex items-center gap-[20px] text-[12px] text-[var(--text-3)]">
        <span>
          <strong className="text-[var(--text)]">{completedCount}</strong> of {tasks.length} tasks complete
        </span>
        <span>
          <strong className="text-[var(--text)]">{completedHours}</strong> of {totalHours}h estimated
        </span>
        {/* Progress bar */}
        <div className="flex-1 h-[6px] rounded-[3px] bg-[var(--surface3)] overflow-hidden">
          <div
            className="h-full rounded-[3px] transition-all duration-300"
            style={{
              width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%`,
              backgroundColor: 'var(--green)',
            }}
          />
        </div>
      </div>

      {/* Phase groups */}
      {groupedTasks.map((group) => {
        const phaseCompleted = group.tasks.filter((t) => t.status === 'completed').length;
        const phaseTotal = group.tasks.length;

        return (
          <div key={group.phase}>
            {/* Phase header */}
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[8px]">
                <h3 className="text-[14px] font-[600] text-[var(--text)]">{group.label}</h3>
                <span className="text-[11px] text-[var(--text-4)]">
                  {phaseCompleted}/{phaseTotal}
                </span>
              </div>
              {/* Mini progress */}
              <div className="w-[60px] h-[4px] rounded-[2px] bg-[var(--surface3)]">
                <div
                  className="h-full rounded-[2px]"
                  style={{
                    width: `${(phaseCompleted / phaseTotal) * 100}%`,
                    backgroundColor: phaseCompleted === phaseTotal ? 'var(--status-green)' : 'var(--green)',
                  }}
                />
              </div>
            </div>

            {/* Task rows */}
            <div className="space-y-[4px]">
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-[10px] rounded-[8px] border px-[12px] py-[10px] transition-colors"
                  style={{
                    backgroundColor: task.status === 'completed' ? 'rgba(22,163,74,0.04)' : 'var(--surface2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {/* Status checkbox */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = task.status === 'completed' ? 'pending' : 'completed';
                      onStatusChange(task.id, next);
                    }}
                    className="w-[20px] h-[20px] rounded-[4px] border-2 flex items-center justify-center shrink-0 cursor-pointer bg-transparent transition-colors"
                    style={{
                      borderColor: task.status === 'completed' ? 'var(--status-green)' : 'var(--border)',
                      backgroundColor: task.status === 'completed' ? 'var(--status-green)' : 'transparent',
                      color: '#fff',
                    }}
                  >
                    {task.status === 'completed' && (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[13px] font-[500]"
                      style={{
                        color: task.status === 'completed' ? 'var(--text-3)' : 'var(--text)',
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      }}
                    >
                      {task.name}
                    </div>
                    {task.description && (
                      <div className="text-[11px] text-[var(--text-4)] mt-[2px] truncate">
                        {task.description}
                      </div>
                    )}
                  </div>

                  {/* Hours */}
                  {task.estimatedHours != null && (
                    <span className="text-[11px] text-[var(--text-4)] shrink-0">
                      {task.estimatedHours}h
                    </span>
                  )}

                  {/* Status dropdown */}
                  <select
                    className="bg-transparent border border-[var(--border)] rounded-[6px] px-[6px] py-[4px] text-[11px] cursor-pointer shrink-0 focus:outline-none"
                    style={{ color: statusColor(task.status) }}
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {/* AI badge */}
                  {task.aiGenerated && (
                    <span
                      className="px-[4px] py-[1px] rounded-[3px] text-[9px] font-[500] shrink-0"
                      style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}
                    >
                      AI
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
