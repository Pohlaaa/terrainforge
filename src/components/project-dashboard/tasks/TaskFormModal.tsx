import React, { useState, useRef, useEffect } from 'react';
import type { ProjectTask, TaskPhase } from '@/types';

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

export interface TaskFormModalProps {
  task: ProjectTask;
  onSave: (updates: Partial<ProjectTask>) => void;
  onCancel: () => void;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ task, onSave, onCancel }) => {
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
