/**
 * Step 1: "The Job" — What + Where + Who
 * Project identity, client info, and address. Site conditions are on the dashboard.
 */
import React from 'react';
import { AddressInput } from '@/components/shared/AddressInput';
import type { AddressSuggestion } from '@/hooks/useAddressAutocomplete';
import { formatPhoneNumber } from '@/utils/validation';
import type { WizardData } from '@/pages/ProjectWizard';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

const PROJECT_TYPES = [
  { value: 'full_install', label: 'Full Install' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'hardscape', label: 'Hardscape' },
  { value: 'softscape', label: 'Softscape' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'mixed', label: 'Mixed' },
];

const SCOPE_SIZES = [
  { value: 'small', label: 'Small', desc: '< 1,000 sqft' },
  { value: 'medium', label: 'Medium', desc: '1,000–5,000 sqft' },
  { value: 'large', label: 'Large', desc: '5,000–20,000 sqft' },
  { value: 'commercial', label: 'Commercial', desc: '20,000+ sqft' },
];

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

export const WizardStepJob: React.FC<Props> = ({ data, onChange }) => {
  return (
    <div className="space-y-[24px]">
      {/* Project Name + Type */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[12px]">What's the job?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
          <div className="md:col-span-2">
            <label className={labelClass}>Project Name <span className="text-[var(--status-red)]">*</span></label>
            <input className={inputClass} placeholder="e.g., Johnson Backyard Renovation" value={data.name} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Type of Work</label>
            <select className={inputClass} value={data.projectType || ''} onChange={(e) => onChange({ projectType: e.target.value || null })}>
              <option value="">Select...</option>
              {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Scope Size</label>
            <div className="grid grid-cols-4 gap-[6px]">
              {SCOPE_SIZES.map(s => (
                <button key={s.value} type="button" onClick={() => onChange({ scopeSize: data.scopeSize === s.value ? null : s.value })}
                  className="rounded-[6px] border px-[8px] py-[6px] text-center cursor-pointer transition-all"
                  style={{
                    backgroundColor: data.scopeSize === s.value ? 'rgba(45,106,79,0.15)' : 'var(--surface2)',
                    borderColor: data.scopeSize === s.value ? 'var(--green)' : 'var(--border)',
                    color: data.scopeSize === s.value ? 'var(--green-l)' : 'var(--text-3)',
                  }}
                >
                  <div className="text-[12px] font-[600]">{s.label}</div>
                  <div className="text-[10px] opacity-70">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Job Description</label>
            <textarea className={`${inputClass} min-h-[80px] resize-y`} placeholder="Describe the work — AI uses this to suggest tasks, materials, and crew." value={data.description || ''} onChange={(e) => onChange({ description: e.target.value || null })} />
          </div>
        </div>
      </div>

      {/* Client + Address */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[12px]">Client & Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
          <div>
            <label className={labelClass}>Client Name</label>
            <input className={inputClass} placeholder="John Smith" value={data.clientName || ''} onChange={(e) => onChange({ clientName: e.target.value || null })} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input className={inputClass} placeholder="xxx-xxx-xxxx" maxLength={12} value={data.clientPhone || ''} onChange={(e) => onChange({ clientPhone: formatPhoneNumber(e.target.value) || null })} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" placeholder="john@example.com" value={data.clientEmail || ''} onChange={(e) => onChange({ clientEmail: e.target.value || null })} />
          </div>
          <div className="md:col-span-3">
            <label className={labelClass}>Job Site Address</label>
            <AddressInput
              value={data.address}
              onChange={(addr) => onChange({ address: addr })}
              onSelect={(suggestion: AddressSuggestion) => onChange({ address: suggestion.address, lat: suggestion.lat, lng: suggestion.lng })}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default WizardStepJob;
