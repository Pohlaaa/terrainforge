import React from 'react';
import { Button } from '@/components/ui/Button';
import type { WizardData, WizardTask } from '@/pages/ProjectWizard';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
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

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

function createEmptyTask(seq: number): WizardTask {
  return {
    tempId: crypto.randomUUID(),
    name: '',
    description: null,
    phase: 'demo_prep',
    sequenceNumber: seq,
    estimatedHours: null,
  };
}

export const WizardStep3: React.FC<Props> = ({ data, onChange }) => {
  const tasks = data.tasks;

  const addTask = () => {
    onChange({ tasks: [...tasks, createEmptyTask(tasks.length)] });
  };

  const updateTask = (tempId: string, updates: Partial<WizardTask>) => {
    onChange({
      tasks: tasks.map((t) => (t.tempId === tempId ? { ...t, ...updates } : t)),
    });
  };

  const removeTask = (tempId: string) => {
    const filtered = tasks.filter((t) => t.tempId !== tempId);
    onChange({
      tasks: filtered.map((t, i) => ({ ...t, sequenceNumber: i })),
    });
  };

  const moveTask = (tempId: string, direction: -1 | 1) => {
    const idx = tasks.findIndex((t) => t.tempId === tempId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    const reordered = [...tasks];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    onChange({
      tasks: reordered.map((t, i) => ({ ...t, sequenceNumber: i })),
    });
  };

  // Group tasks by phase for summary
  const phaseGroups = PHASES.map((p) => ({
    ...p,
    count: tasks.filter((t) => t.phase === p.value).length,
  })).filter((g) => g.count > 0);

  return (
    <div className="space-y-[24px]">
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Scope & Tasks
        </h3>
        <p className="text-[12px] text-[var(--text-4)] mb-[16px]">
          Break the project into tasks grouped by phase. AI will generate tasks automatically in a future update — for now, add them manually.
        </p>
      </div>

      {/* Phase summary chips */}
      {phaseGroups.length > 0 && (
        <div className="flex gap-[6px] flex-wrap">
          {phaseGroups.map((g) => (
            <span
              key={g.value}
              className="px-[10px] py-[4px] rounded-[6px] text-[11px] font-[500] border"
              style={{
                backgroundColor: 'rgba(45,106,79,0.1)',
                borderColor: 'var(--green)',
                color: 'var(--green-l)',
              }}
            >
              {g.label}: {g.count}
            </span>
          ))}
        </div>
      )}

      {/* Task list */}
      <div className="space-y-[12px]">
        {tasks.length === 0 && (
          <div
            className="rounded-[8px] border-2 border-dashed p-[24px] text-center"
            style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
          >
            <p className="text-[13px] mb-[8px]">No tasks yet. Add tasks to define the scope of work.</p>
          </div>
        )}

        {tasks.map((task, idx) => (
          <div
            key={task.tempId}
            className="rounded-[8px] border p-[14px] transition-colors"
            style={{
              backgroundColor: 'var(--surface2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-start gap-[10px]">
              {/* Sequence number + reorder */}
              <div className="flex flex-col items-center gap-[2px] pt-[6px] shrink-0">
                <button
                  type="button"
                  onClick={() => moveTask(task.tempId, -1)}
                  disabled={idx === 0}
                  className="text-[var(--text-4)] hover:text-[var(--text-2)] bg-transparent border-none cursor-pointer p-0 text-[14px] leading-none disabled:opacity-30"
                >
                  ▲
                </button>
                <span className="text-[11px] font-[600] text-[var(--text-3)] w-[20px] text-center">
                  {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => moveTask(task.tempId, 1)}
                  disabled={idx === tasks.length - 1}
                  className="text-[var(--text-4)] hover:text-[var(--text-2)] bg-transparent border-none cursor-pointer p-0 text-[14px] leading-none disabled:opacity-30"
                >
                  ▼
                </button>
              </div>

              {/* Task fields */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_160px_100px] gap-[10px]">
                <div>
                  <label className={labelClass}>Task Name</label>
                  <input
                    className={inputClass}
                    placeholder="e.g., Remove existing pavers"
                    value={task.name}
                    onChange={(e) =>
                      updateTask(task.tempId, { name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Phase</label>
                  <select
                    className={inputClass}
                    value={task.phase}
                    onChange={(e) =>
                      updateTask(task.tempId, { phase: e.target.value })
                    }
                  >
                    {PHASES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Est. Hours</label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="—"
                    value={task.estimatedHours ?? ''}
                    onChange={(e) =>
                      updateTask(task.tempId, {
                        estimatedHours: e.target.value
                          ? parseFloat(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeTask(task.tempId)}
                className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer p-[4px] text-[16px] shrink-0 mt-[22px]"
              >
                ✕
              </button>
            </div>

            {/* Optional description (collapsed by default, always visible for simplicity) */}
            <div className="mt-[8px] ml-[30px]">
              <input
                className={`${inputClass} text-[12px]`}
                placeholder="Optional description or notes for this task..."
                value={task.description || ''}
                onChange={(e) =>
                  updateTask(task.tempId, {
                    description: e.target.value || null,
                  })
                }
              />
            </div>
          </div>
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={addTask}>
        + Add Task
      </Button>

      {/* Quick-add presets */}
      {tasks.length === 0 && (
        <div>
          <p className="text-[12px] text-[var(--text-3)] mb-[8px]">
            Or start with a common template:
          </p>
          <div className="flex gap-[6px] flex-wrap">
            {[
              { label: 'Basic Hardscape', tasks: ['Site prep & demolition', 'Excavation & grading', 'Base compaction', 'Paver installation', 'Edging & jointing', 'Cleanup'] },
              { label: 'Full Install', tasks: ['Demo & clear', 'Rough grade', 'Drainage install', 'Hardscape', 'Irrigation rough-in', 'Softscape planting', 'Mulch & finish', 'Final walkthrough'] },
              { label: 'Maintenance', tasks: ['Mowing & edging', 'Weed control', 'Pruning', 'Fertilization', 'Debris cleanup'] },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const newTasks: WizardTask[] = preset.tasks.map((name, i) => ({
                    tempId: crypto.randomUUID(),
                    name,
                    description: null,
                    phase: i === 0 ? 'demo_prep' : i === preset.tasks.length - 1 ? 'cleanup_punchlist' : 'custom',
                    sequenceNumber: i,
                    estimatedHours: null,
                  }));
                  onChange({ tasks: newTasks });
                }}
                className="rounded-[6px] border px-[10px] py-[6px] text-[12px] font-[500] transition-all duration-150 cursor-pointer hover:border-[var(--green)]"
                style={{
                  backgroundColor: 'var(--surface2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-2)',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WizardStep3;
