import React from 'react';
import type { Project } from '@/types';

const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';
const cardClass = 'rounded-[10px] border p-[16px]';
const rowClass = 'flex justify-between text-[12px] py-[4px]';

export interface SiteConditionFormModalProps {
  project: Project;
  editingHoa: boolean;
  hoaDraft: { hoaFlag: boolean; hoaRules: string; permitZone: string };
  onHoaDraftChange: (draft: { hoaFlag: boolean; hoaRules: string; permitZone: string }) => void;
  onStartEditHoa: () => void;
  onSaveHoa: () => void;
  onCancelHoa: () => void;
  editingAccess: boolean;
  accessDraft: { gateCode: string; permittedHours: string; parkingRestrictions: string };
  onAccessDraftChange: (draft: { gateCode: string; permittedHours: string; parkingRestrictions: string }) => void;
  onStartEditAccess: () => void;
  onSaveAccess: () => void;
  onCancelAccess: () => void;
}

export const SiteConditionFormModal: React.FC<SiteConditionFormModalProps> = ({
  project,
  editingHoa,
  hoaDraft,
  onHoaDraftChange,
  onStartEditHoa,
  onSaveHoa,
  onCancelHoa,
  editingAccess,
  accessDraft,
  onAccessDraftChange,
  onStartEditAccess,
  onSaveAccess,
  onCancelAccess,
}) => {
  return (
    <>
      {/* HOA */}
      <div
        className={cardClass}
        style={{
          backgroundColor: project.hoaFlag ? 'rgba(212,164,76,0.06)' : 'var(--surface2)',
          borderColor: project.hoaFlag ? 'var(--status-amber)' : 'var(--border)',
        }}
      >
        <div className="flex items-center justify-between mb-[10px]">
          <div className="text-[12px] font-[600]" style={{ color: project.hoaFlag ? 'var(--status-amber)' : 'var(--text-3)' }}>
            {project.hoaFlag ? 'HOA Property' : 'HOA'}
          </div>
          {!editingHoa && (
            <button
              type="button"
              onClick={onStartEditHoa}
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
        {editingHoa ? (
          <div className="space-y-[8px]">
            <label className="flex items-center gap-[8px] text-[12px] text-[var(--text)]">
              <input
                type="checkbox"
                checked={hoaDraft.hoaFlag}
                onChange={(e) => onHoaDraftChange({ ...hoaDraft, hoaFlag: e.target.checked })}
                className="accent-[var(--green)]"
              />
              HOA property
            </label>
            <div>
              <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">HOA Rules</label>
              <textarea
                className={inputClass}
                style={{ borderColor: 'var(--border)', minHeight: '50px', resize: 'vertical' }}
                value={hoaDraft.hoaRules}
                onChange={(e) => onHoaDraftChange({ ...hoaDraft, hoaRules: e.target.value })}
                placeholder="HOA rules and restrictions"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Permit Zone / Jurisdiction</label>
              <input
                type="text"
                className={inputClass}
                style={{ borderColor: 'var(--border)' }}
                value={hoaDraft.permitZone}
                onChange={(e) => onHoaDraftChange({ ...hoaDraft, permitZone: e.target.value })}
                placeholder="e.g., Zone B-2"
              />
            </div>
            <div className="flex gap-[4px] justify-end">
              <button
                type="button"
                onClick={onCancelHoa}
                className="px-[8px] py-[3px] rounded-[4px] border text-[10px] bg-transparent cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveHoa}
                className="px-[8px] py-[3px] rounded-[4px] text-[10px] border-none cursor-pointer font-[600]"
                style={{ backgroundColor: 'var(--green)', color: '#fff' }}
              >
                Save
              </button>
            </div>
          </div>
        ) : project.hoaFlag ? (
          <>
            {project.hoaRules ? (
              <p className="text-[12px] text-[var(--text-2)]">{project.hoaRules}</p>
            ) : (
              <p className="text-[12px] text-[var(--text-4)]">No HOA rules documented.</p>
            )}
          </>
        ) : (
          <p className="text-[12px] text-[var(--text-4)] italic">Not an HOA property.</p>
        )}
      </div>

      {/* Access & Logistics */}
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-[14px]">
          <div className="text-[12px] font-[700] uppercase text-[var(--text-3)]" style={{ marginBottom: 0 }}>Access & Logistics</div>
          {!editingAccess && (
            <button
              type="button"
              onClick={onStartEditAccess}
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
        {editingAccess ? (
          <div className="space-y-[8px]">
            <div>
              <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Gate Code</label>
              <input
                type="text"
                className={inputClass}
                style={{ borderColor: 'var(--border)' }}
                value={accessDraft.gateCode}
                onChange={(e) => onAccessDraftChange({ ...accessDraft, gateCode: e.target.value })}
                placeholder="e.g., #1234"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Permitted Work Hours</label>
              <input
                type="text"
                className={inputClass}
                style={{ borderColor: 'var(--border)' }}
                value={accessDraft.permittedHours}
                onChange={(e) => onAccessDraftChange({ ...accessDraft, permittedHours: e.target.value })}
                placeholder="e.g., 7am-6pm Mon-Sat"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Parking Restrictions</label>
              <input
                type="text"
                className={inputClass}
                style={{ borderColor: 'var(--border)' }}
                value={accessDraft.parkingRestrictions}
                onChange={(e) => onAccessDraftChange({ ...accessDraft, parkingRestrictions: e.target.value })}
                placeholder="e.g., no street parking, use driveway"
              />
            </div>
            <div className="flex gap-[4px] justify-end">
              <button
                type="button"
                onClick={onCancelAccess}
                className="px-[8px] py-[3px] rounded-[4px] border text-[10px] bg-transparent cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveAccess}
                className="px-[8px] py-[3px] rounded-[4px] text-[10px] border-none cursor-pointer font-[600]"
                style={{ backgroundColor: 'var(--green)', color: '#fff' }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (project.gateCode || project.parkingRestrictions || project.permittedHours) ? (
          <div className="space-y-[4px]">
            {project.gateCode && (
              <div className={rowClass}>
                <span className="text-[var(--text-4)]">Gate Code</span>
                <span className="text-[var(--text-2)]">{project.gateCode}</span>
              </div>
            )}
            {project.permittedHours && (
              <div className={rowClass}>
                <span className="text-[var(--text-4)]">Work Hours</span>
                <span className="text-[var(--text-2)]">{project.permittedHours}</span>
              </div>
            )}
            {project.parkingRestrictions && (
              <div className={rowClass}>
                <span className="text-[var(--text-4)]">Parking</span>
                <span className="text-[var(--text-2)]">{project.parkingRestrictions}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--text-4)] italic">No access info set.</p>
        )}
      </div>
    </>
  );
};
