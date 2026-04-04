import React, { useMemo, useState } from 'react';
import type { ProjectTask } from '@/types';
import { TaskTable } from './tasks/TaskTable';

interface Props {
  tasks: ProjectTask[];
  projectId: string;
  orgId: string;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onTaskCreate: (phase: string) => void;
  onTaskUpdate: (taskId: string, updates: Partial<ProjectTask>) => void;
  onTaskDelete: (taskId: string) => void;
}

const PHASES: { value: string; label: string }[] = [
  { value: 'demo_prep', label: 'Demo / Prep' },
  { value: 'rough_grade', label: 'Rough Grade' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'softscape', label: 'Softscape' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'cleanup_punchlist', label: 'Cleanup / Punchlist' },
  { value: 'custom', label: 'Custom' },
];

export const ProjectDashboardTasks: React.FC<Props> = ({
  tasks,
  onStatusChange,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleTaskSave = (taskId: string, updates: Partial<ProjectTask>) => {
    onTaskUpdate(taskId, updates);
    setEditingTaskId(null);
  };

  const handleDelete = (taskId: string) => {
    onTaskDelete(taskId);
    setConfirmDeleteId(null);
  };

  if (tasks.length === 0) {
    return (
      <div className="space-y-[16px]">
        <div
          className="rounded-[10px] border-2 border-dashed p-[40px] text-center"
          style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
        >
          <p className="text-[14px] mb-[4px]">No tasks yet</p>
          <p className="text-[12px]">Tasks are created during project setup via the wizard.</p>
        </div>
        <button
          type="button"
          onClick={() => onTaskCreate('custom')}
          className="flex items-center gap-[4px] text-[12px] font-[500] cursor-pointer bg-transparent border-none px-0"
          style={{ color: 'var(--green-l)' }}
        >
          <span className="text-[16px] leading-none">+</span> Add Task
        </button>
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

            <TaskTable
              tasks={group.tasks}
              editingTaskId={editingTaskId}
              confirmDeleteId={confirmDeleteId}
              onEditTask={setEditingTaskId}
              onConfirmDelete={setConfirmDeleteId}
              onStatusChange={onStatusChange}
              onTaskSave={handleTaskSave}
              onTaskDelete={handleDelete}
            />

            <button
              type="button"
              onClick={() => onTaskCreate(group.phase)}
              className="flex items-center gap-[4px] text-[12px] font-[500] cursor-pointer bg-transparent border-none px-[12px] mt-[6px]"
              style={{ color: 'var(--green-l)' }}
            >
              <span className="text-[14px] leading-none">+</span> Add task
            </button>
          </div>
        );
      })}

      {/* Add task for a new phase */}
      {groupedTasks.length === 0 || (
        <button
          type="button"
          onClick={() => onTaskCreate('custom')}
          className="flex items-center gap-[4px] text-[12px] font-[500] cursor-pointer bg-transparent border-none px-0"
          style={{ color: 'var(--green-l)' }}
        >
          <span className="text-[16px] leading-none">+</span> Add Task
        </button>
      )}
    </div>
  );
};
