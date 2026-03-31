import React from 'react';
import type { WizardData } from '@/pages/ProjectWizard';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

const PERMIT_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'applied', label: 'Applied' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'not_required', label: 'Not Required' },
];

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

export const WizardStep6: React.FC<Props> = ({ data, onChange }) => {
  return (
    <div className="space-y-[24px]">
      {/* Permit Status */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Permits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div>
            <label className={labelClass}>Overall Permit Status</label>
            <select
              className={inputClass}
              value={data.permitStatus || 'not_started'}
              onChange={(e) => onChange({ permitStatus: e.target.value })}
            >
              {PERMIT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Permit Zone / Jurisdiction</label>
            <input
              className={inputClass}
              placeholder="e.g., City of Austin, Travis County"
              value={data.permitZone || ''}
              onChange={(e) => onChange({ permitZone: e.target.value || null })}
            />
            <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
              Also editable in Step 2 (Site Intelligence). Permit fees flow into the budget step.
            </p>
          </div>
        </div>
      </div>

      {/* Common Permit Checklist */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Common Permits for Landscaping
        </h3>
        <p className="text-[12px] text-[var(--text-4)] mb-[16px]">
          Check which permits apply to this project. Detailed permit tracking (dates, numbers, inspections) can be managed after project creation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px]">
          {[
            { key: 'grading', label: 'Grading / Excavation', desc: 'Required for significant earth moving' },
            { key: 'building', label: 'Building Permit', desc: 'Structures, retaining walls over 4ft' },
            { key: 'electrical', label: 'Electrical', desc: 'Landscape lighting, outlets' },
            { key: 'plumbing', label: 'Plumbing / Irrigation', desc: 'Sprinkler systems, water features' },
            { key: 'stormwater', label: 'Stormwater / Drainage', desc: 'Drainage modifications, impervious cover' },
            { key: 'tree_removal', label: 'Tree Removal', desc: 'Protected species or size thresholds' },
            { key: 'fence', label: 'Fence Permit', desc: 'New fences or height modifications' },
            { key: 'hoa_approval', label: 'HOA Approval', desc: 'Design review by homeowners association' },
          ].map((permit) => {
            const isChecked = data.permitChecklist.includes(permit.key);
            return (
              <label
                key={permit.key}
                className="flex items-start gap-[10px] rounded-[8px] border px-[12px] py-[10px] cursor-pointer transition-colors"
                style={{
                  backgroundColor: isChecked ? 'rgba(45,106,79,0.08)' : 'var(--surface2)',
                  borderColor: isChecked ? 'var(--green)' : 'var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const updated = isChecked
                      ? data.permitChecklist.filter((k) => k !== permit.key)
                      : [...data.permitChecklist, permit.key];
                    onChange({ permitChecklist: updated });
                  }}
                  className="mt-[2px] w-[16px] h-[16px] accent-[var(--green)] shrink-0"
                />
                <div>
                  <span className="text-[13px] font-[500] text-[var(--text)]">{permit.label}</span>
                  <p className="text-[11px] text-[var(--text-4)] mt-[1px]">{permit.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Compliance / Risk Notes */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Risk & Compliance Notes
        </h3>
        <div>
          <label className={labelClass}>Compliance Notes</label>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="e.g., Underground utilities unmarked along south property line. Client particular about preserving the oak tree near patio area. HOA requires design approval before breaking ground."
            value={data.complianceNotes || ''}
            onChange={(e) => onChange({ complianceNotes: e.target.value || null })}
          />
          <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
            Document anything that could affect the job — utility risks, client concerns, access restrictions, environmental constraints.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WizardStep6;
