import React from 'react';
import type { ProjectTask } from '@/types';
import { TaskFormModal } from './TaskFormModal';

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

export interface TaskTableProps {
  tasks: ProjectTask[];
  editingTaskId: string | null;
  confirmDeleteId: string | null;
  onEditTask: (taskId: string | null) => void;
  onConfirmDelete: (taskId: string | null) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onTaskSave: (taskId: string, updates: Partial<ProjectTask>) => void;
  onTaskDelete: (taskId: string) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  editingTaskId,
  confirmDeleteId,
  onEditTask,
  onConfirmDelete,
  onStatusChange,
  onTaskSave,
  onTaskDelete,
}) => {
  return (
    <div className="space-y-[4px]">
      {tasks.map((task) =>
        editingTaskId === task.id ? (
          <TaskFormModal
            key={task.id}
            task={task}
            onSave={(updates) => onTaskSave(task.id, updates)}
            onCancel={() => onEditTask(null)}
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

            {/* Task info -- click to edit */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onEditTask(task.id)}
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
                  onClick={() => onTaskDelete(task.id)}
                  className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-[600] border-none cursor-pointer"
                  style={{ backgroundColor: 'rgba(224,92,92,0.15)', color: 'var(--status-red)' }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmDelete(null)}
                  className="px-[4px] py-[2px] text-[10px] bg-transparent border-none cursor-pointer"
                  style={{ color: 'var(--text-4)' }}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onConfirmDelete(task.id)}
                className="w-[20px] h-[20px] flex items-center justify-center rounded-[4px] bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                style={{ color: 'var(--text-4)' }}
                title="Delete task"
              >
                {'\u2715'}
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
};
