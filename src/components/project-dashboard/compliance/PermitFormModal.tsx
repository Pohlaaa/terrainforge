import React, { useState } from 'react';
import type { ProjectPermit, PermitLifecycleStatus, InspectionResult } from '@/types';

const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

const PERMIT_STATUSES: { value: PermitLifecycleStatus; label: string }[] = [
  { value: 'needed', label: 'Needed' },
  { value: 'applied', label: 'Applied' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'not_required', label: 'Not Required' },
  { value: 'expired', label: 'Expired' },
];

const INSPECTION_RESULTS: { value: InspectionResult | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'pending', label: 'Pending' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'conditional', label: 'Conditional' },
];

export interface PermitFormModalProps {
  permit: ProjectPermit;
  onSave: (updates: Partial<ProjectPermit>) => void;
  onCancel: () => void;
}

export const PermitFormModal: React.FC<PermitFormModalProps> = ({ permit, onSave, onCancel }) => {
  const [status, setStatus] = useState(permit.status);
  const [permitNumber, setPermitNumber] = useState(permit.permitNumber || '');
  const [fee, setFee] = useState(permit.fee?.toString() || '');
  const [appliedDate, setAppliedDate] = useState(permit.appliedDate || '');
  const [approvedDate, setApprovedDate] = useState(permit.approvedDate || '');
  const [inspectionDate, setInspectionDate] = useState(permit.inspectionDate || '');
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | ''>(permit.inspectionResult || '');
  const [notes, setNotes] = useState(permit.notes || '');

  const handleSave = () => {
    onSave({
      status: status as PermitLifecycleStatus,
      permitNumber: permitNumber.trim() || null,
      fee: fee ? parseFloat(fee) : null,
      appliedDate: appliedDate || null,
      approvedDate: approvedDate || null,
      inspectionDate: inspectionDate || null,
      inspectionResult: (inspectionResult as InspectionResult) || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div
      className="rounded-[8px] border px-[14px] py-[12px] space-y-[8px]"
      style={{ borderColor: 'var(--green)', backgroundColor: 'var(--surface3)' }}
    >
      <div className="flex items-center justify-between mb-[4px]">
        <span className="text-[13px] font-[600] text-[var(--text)] capitalize">
          {permit.permitType.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-[8px]">
        <div>
          <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Status</label>
          <select
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            value={status}
            onChange={(e) => setStatus(e.target.value as PermitLifecycleStatus)}
          >
            {PERMIT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Permit #</label>
          <input
            type="text"
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            value={permitNumber}
            onChange={(e) => setPermitNumber(e.target.value)}
            placeholder="Permit number"
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Fee</label>
          <input
            type="number"
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
            min={0}
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Applied Date</label>
          <input
            type="date"
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            value={appliedDate}
            onChange={(e) => setAppliedDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Approved Date</label>
          <input
            type="date"
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            value={approvedDate}
            onChange={(e) => setApprovedDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Inspection Date</label>
          <input
            type="date"
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Inspection Result</label>
          <select
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            value={inspectionResult}
            onChange={(e) => setInspectionResult(e.target.value as InspectionResult | '')}
          >
            {INSPECTION_RESULTS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-4)] mb-[2px] block">Notes</label>
        <textarea
          className={inputClass}
          style={{ borderColor: 'var(--border)', minHeight: '40px', resize: 'vertical' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
        />
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
