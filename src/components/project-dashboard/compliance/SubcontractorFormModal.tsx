import React from 'react';
import type { Project } from '@/types';

const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';
const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';

export interface ComplianceNotesFormProps {
  project: Project;
  editingNotes: boolean;
  notesDraft: string;
  onNotesDraftChange: (value: string) => void;
  onStartEditNotes: () => void;
  onSaveNotes: () => void;
  onCancelNotes: () => void;
}

export const ComplianceNotesForm: React.FC<ComplianceNotesFormProps> = ({
  project,
  editingNotes,
  notesDraft,
  onNotesDraftChange,
  onStartEditNotes,
  onSaveNotes,
  onCancelNotes,
}) => {
  return (
    <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-[14px]">
        <div className={cardHead} style={{ marginBottom: 0 }}>Risk & Compliance Notes</div>
        {!editingNotes && (
          <button
            type="button"
            onClick={onStartEditNotes}
            className="text-[11px] bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--green-l)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>
      {editingNotes ? (
        <div className="space-y-[6px]">
          <textarea
            className={inputClass}
            style={{ borderColor: 'var(--border)', minHeight: '80px', resize: 'vertical' }}
            value={notesDraft}
            onChange={(e) => onNotesDraftChange(e.target.value)}
            placeholder="Compliance notes, risk factors, special considerations..."
            autoFocus
          />
          <div className="flex gap-[4px] justify-end">
            <button
              type="button"
              onClick={onCancelNotes}
              className="px-[8px] py-[3px] rounded-[4px] border text-[10px] bg-transparent cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveNotes}
              className="px-[8px] py-[3px] rounded-[4px] text-[10px] border-none cursor-pointer font-[600]"
              style={{ backgroundColor: 'var(--green)', color: '#fff' }}
            >
              Save
            </button>
          </div>
        </div>
      ) : project.complianceNotes ? (
        <p className="text-[12px] text-[var(--text-2)] leading-[1.5] whitespace-pre-wrap">
          {project.complianceNotes}
        </p>
      ) : (
        <p className="text-[12px] text-[var(--text-4)] italic">No compliance notes yet.</p>
      )}
    </div>
  );
};
