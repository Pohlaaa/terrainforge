import React from 'react';
import { AddressInput } from '@/components/shared/AddressInput';
import type { WizardData } from '@/pages/ProjectWizard';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

const SUN_OPTIONS = [
  { value: 'full_sun', label: 'Full Sun' },
  { value: 'partial_shade', label: 'Partial Shade' },
  { value: 'full_shade', label: 'Full Shade' },
  { value: 'mixed', label: 'Mixed' },
];

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

export const WizardStep2: React.FC<Props> = ({ data, onChange }) => {
  return (
    <div className="space-y-[24px]">
      {/* Address */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Project Location
        </h3>
        <AddressInput
          label="Site Address"
          value={data.address}
          onChange={(text) => onChange({ address: text })}
          onSelect={(suggestion) =>
            onChange({
              address: suggestion.address,
              lat: suggestion.lat,
              lng: suggestion.lng,
            })
          }
          placeholder="Start typing an address..."
        />
      </div>

      {/* Site Conditions */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Site Conditions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div>
            <label className={labelClass}>Slope / Grade</label>
            <input
              className={inputClass}
              placeholder="e.g., Flat, Moderate 5%, Steep hillside"
              value={data.slopeGrade || ''}
              onChange={(e) => onChange({ slopeGrade: e.target.value || null })}
            />
          </div>

          <div>
            <label className={labelClass}>Soil Type</label>
            <input
              className={inputClass}
              placeholder="e.g., Clay, Sandy loam, Rocky"
              value={data.soilType || ''}
              onChange={(e) => onChange({ soilType: e.target.value || null })}
            />
          </div>

          <div>
            <label className={labelClass}>Sun Exposure</label>
            <div className="flex gap-[6px] flex-wrap">
              {SUN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      sunExposure: data.sunExposure === opt.value ? null : opt.value,
                    })
                  }
                  className="rounded-[6px] border px-[10px] py-[6px] text-[12px] font-[500] transition-all duration-150 cursor-pointer"
                  style={{
                    backgroundColor:
                      data.sunExposure === opt.value
                        ? 'rgba(45,106,79,0.15)'
                        : 'var(--surface2)',
                    borderColor:
                      data.sunExposure === opt.value ? 'var(--green)' : 'var(--border)',
                    color:
                      data.sunExposure === opt.value ? 'var(--green-l)' : 'var(--text-2)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Drainage Pattern</label>
            <input
              className={inputClass}
              placeholder="e.g., Pools at NW corner, Good runoff"
              value={data.drainagePattern || ''}
              onChange={(e) => onChange({ drainagePattern: e.target.value || null })}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Existing Vegetation</label>
            <input
              className={inputClass}
              placeholder="e.g., Mature oaks, bermuda lawn, empty lot"
              value={data.existingVegetation || ''}
              onChange={(e) =>
                onChange({ existingVegetation: e.target.value || null })
              }
            />
          </div>
        </div>
      </div>

      {/* AI-Inferred Fields */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Climate & Permits
        </h3>
        <p className="text-[12px] text-[var(--text-4)] mb-[16px]">
          AI will auto-fill these based on the address. You can edit them.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
          <div>
            <label className={labelClass}>Climate Zone</label>
            <input
              className={inputClass}
              placeholder="e.g., USDA 7b"
              value={data.climateZone || ''}
              onChange={(e) => onChange({ climateZone: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>Permit Zone</label>
            <input
              className={inputClass}
              placeholder="e.g., City of Austin"
              value={data.permitZone || ''}
              onChange={(e) => onChange({ permitZone: e.target.value || null })}
            />
          </div>
          <div className="flex items-end pb-[2px]">
            <label className="flex items-center gap-[8px] cursor-pointer">
              <input
                type="checkbox"
                checked={data.hoaFlag}
                onChange={(e) => onChange({ hoaFlag: e.target.checked })}
                className="w-[16px] h-[16px] accent-[var(--green)]"
              />
              <span className="text-[13px] text-[var(--text-2)]">HOA Property</span>
            </label>
          </div>
        </div>
      </div>

      {/* Access & Logistics */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Access & Logistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          <div>
            <label className={labelClass}>Gate Code</label>
            <input
              className={inputClass}
              placeholder="e.g., #1234"
              value={data.gateCode || ''}
              onChange={(e) => onChange({ gateCode: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>Permitted Work Hours</label>
            <input
              className={inputClass}
              placeholder="e.g., 7am-6pm weekdays"
              value={data.permittedHours || ''}
              onChange={(e) => onChange({ permittedHours: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>Parking Restrictions</label>
            <input
              className={inputClass}
              placeholder="e.g., No street parking after 5pm"
              value={data.parkingRestrictions || ''}
              onChange={(e) =>
                onChange({ parkingRestrictions: e.target.value || null })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Utility Locations</label>
            <input
              className={inputClass}
              placeholder="e.g., Gas line runs along east fence"
              value={data.utilityLocations || ''}
              onChange={(e) =>
                onChange({ utilityLocations: e.target.value || null })
              }
            />
          </div>
          {data.hoaFlag && (
            <div className="md:col-span-2">
              <label className={labelClass}>HOA Rules & Restrictions</label>
              <textarea
                className={`${inputClass} min-h-[60px] resize-y`}
                placeholder="e.g., No work on weekends, fence color must match existing"
                value={data.hoaRules || ''}
                onChange={(e) => onChange({ hoaRules: e.target.value || null })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardStep2;
