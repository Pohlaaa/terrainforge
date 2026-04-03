import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { generateTasksFromDescription } from '@/services/anthropic';
import { SuggestionPanel } from '@/components/shared/SuggestionPanel';
import { scheduleTasksOnTimeline, getWeekdayDates } from '@/lib/taskTimeline';
import type { SuggestionItem } from '@/components/shared/SuggestionPanel';
import type { WizardData, WizardTask } from '@/pages/ProjectWizard';
import type { AIRecommendationSet } from '@/types';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
  aiLoading: boolean;
  acceptedIds: Set<string>;
  dismissedIds: Set<string>;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcceptAll: (ids: string[]) => void;
  onDismissAll: (ids: string[]) => void;
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

export const WizardStep3: React.FC<Props> = ({
  data,
  onChange,
  recommendations,
  aiLoading: parentAiLoading,
  acceptedIds,
  dismissedIds,
  onAccept,
  onDismiss,
  onAcceptAll,
  onDismissAll,
}) => {
  const tasks = data.tasks;
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState('');

  // Map AI task recommendations to SuggestionItems
  const taskSuggestions: SuggestionItem[] = (recommendations?.tasks || []).map((t, i) => ({
    id: `task-${i}`,
    title: t.name,
    subtitle: PHASES.find((p) => p.value === t.phase)?.label || t.phase,
    reason: t.description,
    metadata: { 'Est. Hours': t.estimatedHours },
  }));

  // When a task is accepted, add it to the task list
  const handleAcceptTask = (id: string) => {
    onAccept(id);
    const idx = parseInt(id.replace('task-', ''));
    const rec = recommendations?.tasks[idx];
    if (!rec) return;
    // Don't add duplicate
    if (tasks.some((t) => t.name === rec.name && t.phase === rec.phase)) return;
    const newTask: WizardTask = {
      tempId: crypto.randomUUID(),
      name: rec.name,
      description: rec.description || null,
      phase: PHASES.some((p) => p.value === rec.phase) ? rec.phase : 'custom',
      sequenceNumber: tasks.length,
      estimatedHours: rec.estimatedHours ?? null,
      aiGenerated: true,
    };
    onChange({ tasks: [...tasks, newTask] });
  };

  const handleAcceptAllTasks = () => {
    const ids = taskSuggestions
      .filter((s) => !acceptedIds.has(s.id) && !dismissedIds.has(s.id))
      .map((s) => s.id);
    onAcceptAll(ids);
    const newTasks: WizardTask[] = [];
    ids.forEach((id) => {
      const idx = parseInt(id.replace('task-', ''));
      const rec = recommendations?.tasks[idx];
      if (!rec) return;
      if (tasks.some((t) => t.name === rec.name && t.phase === rec.phase)) return;
      newTasks.push({
        tempId: crypto.randomUUID(),
        name: rec.name,
        description: rec.description || null,
        phase: PHASES.some((p) => p.value === rec.phase) ? rec.phase : 'custom',
        sequenceNumber: tasks.length + newTasks.length,
        estimatedHours: rec.estimatedHours ?? null,
        aiGenerated: true,
      });
    });
    if (newTasks.length > 0) onChange({ tasks: [...tasks, ...newTasks] });
  };

  const handleDismissAllTasks = () => {
    const ids = taskSuggestions
      .filter((s) => !acceptedIds.has(s.id) && !dismissedIds.has(s.id))
      .map((s) => s.id);
    onDismissAll(ids);
  };

  // Fallback: manual generate tasks button (when AI recommendations are null)
  const handleGenerateTasks = () => {
    if (!data.description?.trim()) return;
    setFallbackLoading(true);
    setFallbackError('');
    generateTasksFromDescription({
      description: data.description,
      projectType: data.projectType,
      scopeSize: data.scopeSize,
      propertyType: data.propertyType,
    })
      .then((result) => {
        if (result && result.length > 0) {
          const wizardTasks: WizardTask[] = result.map((t, i) => ({
            tempId: crypto.randomUUID(),
            name: t.name,
            description: t.description || null,
            phase: PHASES.some((p) => p.value === t.phase) ? t.phase : 'custom',
            sequenceNumber: i,
            estimatedHours: t.estimatedHours ?? null,
            aiGenerated: true,
          }));
          onChange({ tasks: wizardTasks });
        }
      })
      .catch(() => setFallbackError('AI task generation failed. Add tasks manually.'))
      .finally(() => setFallbackLoading(false));
  };

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

  // Timeline scheduling
  const scheduledTasks = useMemo(() => {
    if (!data.startDate || !data.targetDate || tasks.length === 0) return [];
    return scheduleTasksOnTimeline(tasks, data.startDate, data.targetDate);
  }, [tasks, data.startDate, data.targetDate]);

  const weekdayDates = useMemo(() => {
    if (!data.startDate || !data.targetDate) return [];
    return getWeekdayDates(data.startDate, data.targetDate);
  }, [data.startDate, data.targetDate]);

  const totalTimelineDays = weekdayDates.length;

  return (
    <div className="space-y-[24px]">
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Scope & Tasks
        </h3>
        <p className="text-[12px] text-[var(--text-4)] mb-[16px]">
          Break the project into tasks grouped by phase.
          {data.description && ' AI generates tasks from your job description — review and edit as needed.'}
        </p>
      </div>

      {/* AI Suggestion Panel */}
      {(parentAiLoading || taskSuggestions.length > 0) && (
        <SuggestionPanel
          title="Task Recommendations"
          items={taskSuggestions}
          onAccept={handleAcceptTask}
          onDismiss={onDismiss}
          onAcceptAll={handleAcceptAllTasks}
          onDismissAll={handleDismissAllTasks}
          acceptedIds={acceptedIds}
          dismissedIds={dismissedIds}
          isLoading={parentAiLoading}
          emptyMessage="No task suggestions available"
        />
      )}

      {/* Fallback generate button when AI recommendations are null */}
      {!recommendations && !parentAiLoading && tasks.length === 0 && data.description?.trim() && (
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateTasks}
            loading={fallbackLoading}
            disabled={fallbackLoading}
          >
            Generate Tasks from Description
          </Button>
        </div>
      )}

      {/* Fallback error */}
      {fallbackError && (
        <div
          className="rounded-[8px] border px-[16px] py-[10px] text-[12px]"
          style={{ backgroundColor: 'rgba(224,92,92,0.08)', borderColor: 'var(--status-red)', color: 'var(--status-red)' }}
        >
          {fallbackError}
        </div>
      )}

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
        {tasks.length === 0 && !parentAiLoading && !fallbackLoading && (
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

            {/* Optional description */}
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
      {tasks.length === 0 && !parentAiLoading && !fallbackLoading && (
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

      {/* Task Timeline Visualization */}
      {scheduledTasks.length > 0 && totalTimelineDays > 0 && (
        <div>
          <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
            Task Timeline
          </h3>
          <p className="text-[12px] text-[var(--text-4)] mb-[12px]">
            {totalTimelineDays} weekdays from {data.startDate} to {data.targetDate}
          </p>
          <div
            className="rounded-[8px] border overflow-x-auto"
            style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
          >
            <div style={{ minWidth: Math.max(400, totalTimelineDays * 32) + 140 }}>
              {/* Day headers */}
              <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="w-[140px] shrink-0 px-[8px] py-[6px] text-[10px] font-[600] text-[var(--text-3)]">
                  Task
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
                          borderLeft: isWeekStart ? '1px solid var(--border)' : 'none',
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

              {/* Task rows */}
              {scheduledTasks.map((task, i) => (
                <div
                  key={i}
                  className="flex items-center border-b last:border-b-0"
                  style={{ borderColor: 'var(--border)', minHeight: 32 }}
                >
                  <div
                    className="w-[140px] shrink-0 px-[8px] text-[11px] font-[500] truncate"
                    style={{ color: 'var(--text-2)' }}
                    title={task.name}
                  >
                    {task.name}
                  </div>
                  <div className="flex-1 relative" style={{ minHeight: 24 }}>
                    <div
                      className="absolute top-[2px] bottom-[2px] rounded-[4px] flex items-center px-[6px]"
                      style={{
                        left: `${(task.startDay / totalTimelineDays) * 100}%`,
                        width: `${Math.max((task.durationDays / totalTimelineDays) * 100, 3)}%`,
                        backgroundColor: PHASE_COLORS[task.phase] || PHASE_COLORS.custom,
                        opacity: 0.85,
                      }}
                    >
                      {task.durationDays >= 2 && (
                        <span className="text-[9px] font-[600] text-white truncate">
                          {task.estimatedHours > 0 ? `${task.estimatedHours}h` : `${task.durationDays}d`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase legend */}
          <div className="flex gap-[10px] flex-wrap mt-[8px]">
            {phaseGroups.map((g) => (
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
      )}
    </div>
  );
};

export default WizardStep3;
