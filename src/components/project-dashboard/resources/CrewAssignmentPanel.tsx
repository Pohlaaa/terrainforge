import React, { useState } from 'react';
import type { Project, CrewMember, ScheduleEntry } from '@/types';

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';
const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

// Inline editable field component
const InlineEditField: React.FC<{
  label: string;
  value: string;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  onSave: (value: string) => void;
}> = ({ label, value, type = 'text', placeholder, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-[4px]">
        <div>
          <span className="text-[11px] text-[var(--text-4)] mr-[8px]">{label}:</span>
          <span className="text-[12px] text-[var(--text)]">{value || '\u2014'}</span>
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="text-[11px] bg-transparent border-none cursor-pointer shrink-0"
          style={{ color: 'var(--green-l)' }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="py-[4px] space-y-[4px]">
      <label className="text-[11px] text-[var(--text-4)] block">{label}</label>
      {type === 'textarea' ? (
        <textarea
          className={inputClass}
          style={{ borderColor: 'var(--border)', minHeight: '50px', resize: 'vertical' }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      ) : (
        <input
          type={type}
          className={inputClass}
          style={{ borderColor: 'var(--border)' }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          min={type === 'number' ? 0 : undefined}
          autoFocus
        />
      )}
      <div className="flex gap-[4px] justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="px-[8px] py-[3px] rounded-[4px] border text-[10px] bg-transparent cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-[8px] py-[3px] rounded-[4px] text-[10px] border-none cursor-pointer font-[600]"
          style={{ backgroundColor: 'var(--green)', color: '#fff' }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export interface CrewAssignmentPanelProps {
  project: Project;
  scheduledCrew: CrewMember[];
  scheduleEntries: ScheduleEntry[];
  onCrewFieldSave: (field: 'crewSize' | 'crewNotes', value: string) => void;
}

export const CrewAssignmentPanel: React.FC<CrewAssignmentPanelProps> = ({
  project,
  scheduledCrew,
  scheduleEntries,
  onCrewFieldSave,
}) => {
  return (
    <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
      <div className={cardHead}>
        Crew
      </div>

      {/* Editable crew size and notes */}
      {/* F-CW-47: distinguish "Crew Size" (target headcount for this job) from
          "No crew scheduled yet" (no per-day schedule entries). Both can be
          true without contradiction. Add a small qualifier next to Crew Size
          so contractors don't see them as conflicting numbers. */}
      <div className="mb-[12px] space-y-[2px]">
        <InlineEditField
          label="Crew Size (target)"
          value={project.crewSize?.toString() || ''}
          type="number"
          placeholder="e.g., 4"
          onSave={(v) => onCrewFieldSave('crewSize', v)}
        />
        <InlineEditField
          label="Crew Notes"
          value={project.crewNotes || ''}
          type="text"
          placeholder="e.g., need bilingual foreman"
          onSave={(v) => onCrewFieldSave('crewNotes', v)}
        />
      </div>

      {scheduledCrew.length === 0 ? (
        // F-CW-53: pre-extraction copy referenced /schedule (404'd after the
        // page was extracted into Crew + Equipment hub's Weekly Schedule).
        <p className="text-[12px] text-[var(--text-4)]">
          No crew scheduled yet. Use the Weekly Schedule on the{' '}
          <a href="/crew-hub" className="underline" style={{ color: 'var(--green-l)' }}>
            Crew &amp; Equipment
          </a>{' '}
          page to assign crew to this project.
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
  );
};
