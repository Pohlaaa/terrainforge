import React from 'react';
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

const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'hoa', label: 'HOA' },
  { value: 'municipal', label: 'Municipal' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'other', label: 'Other' },
];

const SCOPE_SIZES = [
  { value: 'small', label: 'Small', desc: '< 1,000 sqft' },
  { value: 'medium', label: 'Medium', desc: '1,000 - 5,000 sqft' },
  { value: 'large', label: 'Large', desc: '5,000 - 20,000 sqft' },
  { value: 'commercial', label: 'Commercial', desc: '20,000+ sqft' },
];

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

export const WizardStep1: React.FC<Props> = ({ data, onChange }) => {
  return (
    <div className="space-y-[24px]">
      {/* Section: Project Identity */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Project Identity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div className="md:col-span-2">
            <label className={labelClass}>
              Project Name <span className="text-[var(--status-red)]">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="e.g., Johnson Backyard Renovation"
              value={data.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass}>Project Type</label>
            <select
              className={inputClass}
              value={data.projectType || ''}
              onChange={(e) => onChange({ projectType: e.target.value || null })}
            >
              <option value="">Select type...</option>
              {PROJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Property Type</label>
            <select
              className={inputClass}
              value={data.propertyType || ''}
              onChange={(e) => onChange({ propertyType: e.target.value || null })}
            >
              <option value="">Select type...</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scope Size */}
      <div>
        <label className={labelClass}>Scope Size</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[8px]">
          {SCOPE_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ scopeSize: data.scopeSize === s.value ? null : s.value })}
              className="flex flex-col items-center gap-[2px] rounded-[8px] border px-[12px] py-[10px] transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: data.scopeSize === s.value ? 'rgba(45,106,79,0.15)' : 'var(--surface2)',
                borderColor: data.scopeSize === s.value ? 'var(--green)' : 'var(--border)',
                color: data.scopeSize === s.value ? 'var(--green-l)' : 'var(--text-2)',
              }}
            >
              <span className="text-[13px] font-[600]">{s.label}</span>
              <span className="text-[11px] opacity-70">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Job Description</label>
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          placeholder="Describe the job in your own words. E.g., 'Complete backyard renovation including paver patio, retaining wall, and new sod installation. Client wants low-maintenance design with drip irrigation.'"
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
        />
        <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
          AI will use this to pre-fill site conditions, tasks, and resource estimates in later steps.
        </p>
      </div>

      {/* Section: Client Info */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Client Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
          <div>
            <label className={labelClass}>Client Name</label>
            <input
              className={inputClass}
              placeholder="John Smith"
              value={data.clientName || ''}
              onChange={(e) => onChange({ clientName: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              className={inputClass}
              placeholder="(555) 123-4567"
              value={data.clientPhone || ''}
              onChange={(e) => onChange({ clientPhone: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              className={inputClass}
              type="email"
              placeholder="john@example.com"
              value={data.clientEmail || ''}
              onChange={(e) => onChange({ clientEmail: e.target.value || null })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardStep1;
