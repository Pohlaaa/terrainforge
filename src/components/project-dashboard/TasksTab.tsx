import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { ProjectTask, TaskPhase } from '@/types';

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

// Inline edit component for a task
const TaskInlineEdit: React.FC<{
  task: ProjectTask;
  onSave: (updates: Partial<ProjectTask>) => void;
  onCancel: () => void;
}> = ({ task, onSave, onCancel }) => {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || '');
  const [hours, setHours] = useState(task.estimatedHours?.toString() || '');
  const [phase, setPhase] = useState(task.phase);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      estimatedHours: hours ? parseFloat(hours) : null,
      phase: phase as TaskPhase,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  const inputClass =
    'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[13px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

  return (
    <div
      className="rounded-[8px] border px-[12px] py-[10px] space-y-[8px]"
      style={{ backgroundColor: 'var(--surface3)', borderColor: 'var(--green)' }}
    >
      <input
        ref={nameRef}
        type="text"
        className={inputClass}
        style={{ borderColor: 'var(--border)' }}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Task name"
      />
      <div className="flex gap-[8px]">
        <input
          type="text"
          className={inputClass}
          style={{ borderColor: 'var(--border)', flex: 1 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description (optional)"
        />
        <input
          type="number"
          className={inputClass}
          style={{ borderColor: 'var(--border)', width: '80px' }}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hours"
          min={0}
          step={0.5}
        />
        <select
          className="bg-transparent border rounded-[6px] px-[6px] py-[4px] text-[12px] cursor-pointer focus:outline-none text-[var(--text)]"
          style={{ borderColor: 'var(--border)' }}
          value={phase}
          onChange={(e) => setPhase(e.target.value as TaskPhase)}
        >
          {PHASES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-[6px] justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-[10px] py-[4px] rounded-[5px] border text-[11px] bg-transparent cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-[10px] py-[4px] rounded-[5px] text-[11px] border-none cursor-pointer font-[600]"
          style={{ backgroundColor: 'var(--green)', color: '#fff' }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

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
        {/* Add task button even when empty */}
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
              {group.tasks.map((task) =>
                editingTaskId === task.id ? (
                  <TaskInlineEdit
                    key={task.id}
                    task={task}
                    onSave={(updates) => handleTaskSave(task.id, updates)}
                    onCancel={() => setEditingTaskId(null)}
                  />
                ) : (
                  <div
                    key={task.id}
                    className="flex items-center gap-[10px] rounded-[8px] border px-[12px] py-[10px] transition-colors group"
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

                    {/* Task info — click to edit */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setEditingTaskId(task.id)}
                    >
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
                        className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[600] shrink-0"
                        style={{ backgroundColor: 'rgba(59,130,246,0.12)', color: 'var(--status-blue, #3B82F6)' }}
                      >
                        AI
                      </span>
                    )}

                    {/* Delete button */}
                    {confirmDeleteId === task.id ? (
                      <div className="flex items-center gap-[4px] shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDelete(task.id)}
                          className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[600] border-none cursor-pointer"
                          style={{ backgroundColor: 'rgba(224,92,92,0.15)', color: 'var(--status-red)' }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-[4px] py-[2px] text-[10px] bg-transparent border-none cursor-pointer"
                          style={{ color: 'var(--text-4)' }}
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(task.id)}
                        className="w-[20px] h-[20px] flex items-center justify-center rounded-[4px] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                        style={{ color: 'var(--text-4)' }}
                        title="Delete task"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Add task button per phase */}
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
