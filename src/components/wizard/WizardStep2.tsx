import React, { useState, useEffect, useRef } from 'react';
import { AddressInput } from '@/components/shared/AddressInput';
import { inferSiteConditions } from '@/services/anthropic';
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

const AiTag: React.FC = () => (
  <span
    className="inline-flex items-center gap-[3px] ml-[6px] px-[5px] py-[1px] rounded-[4px] text-[10px] font-[500]"
    style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--green-l)' }}
  >
    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L8.5 4.5L12.5 5L9.5 7.5L10.5 11.5L7 9.5L3.5 11.5L4.5 7.5L1.5 5L5.5 4.5L7 1Z" fill="currentColor" />
    </svg>
    AI
  </span>
);

export const WizardStep2: React.FC<Props> = ({ data, onChange }) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const lastInferredCoords = useRef<string | null>(null);

  // Run AI inference when lat/lng are set from Mapbox geocoding
  useEffect(() => {
    if (!data.lat || !data.lng || !data.address) return;

    const coordKey = `${data.lat},${data.lng}`;
    if (lastInferredCoords.current === coordKey) return;
    lastInferredCoords.current = coordKey;

    // Only auto-fill if the AI-inferred fields are still empty
    if (data.climateZone && data.soilType) return;

    setAiLoading(true);

    inferSiteConditions({
      address: data.address,
      lat: data.lat,
      lng: data.lng,
      existingConditions: [data.slopeGrade, data.existingVegetation].filter(Boolean).join(', ') || undefined,
    })
      .then((result) => {
        if (!result) return;

        const updates: Partial<WizardData> = {};
        if (result.climateZone && !data.climateZone) updates.climateZone = result.climateZone;
        if (result.soilType && !data.soilType) updates.soilType = result.soilType;
        if (result.permitZone && !data.permitZone) updates.permitZone = result.permitZone;
        if (result.hoaLikelihood === 'high' && !data.hoaFlag) updates.hoaFlag = true;

        if (Object.keys(updates).length > 0) {
          onChange(updates);
          setAiSuggested(true);
        }
      })
      .catch(() => {
        // Silently fail — AI inference is optional
      })
      .finally(() => {
        setAiLoading(false);
      });
  }, [data.lat, data.lng]);

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

      {/* AI loading indicator */}
      {aiLoading && (
        <div
          className="rounded-[8px] border px-[14px] py-[10px] flex items-center gap-[8px]"
          style={{ backgroundColor: 'rgba(45,106,79,0.06)', borderColor: 'var(--green)' }}
        >
          <div className="w-[14px] h-[14px] border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[var(--green-l)]">
            AI is analyzing site conditions...
          </span>
        </div>
      )}

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
            <label className={labelClass}>
              Soil Type
              {aiSuggested && data.soilType && <AiTag />}
            </label>
            <select
              className={inputClass}
              value={data.soilType || ''}
              onChange={(e) => onChange({ soilType: e.target.value || null })}
            >
              <option value="">Select soil type...</option>
              <option value="Clay">Clay</option>
              <option value="Sandy loam">Sandy loam</option>
              <option value="Loam">Loam</option>
              <option value="Sandy">Sandy</option>
              <option value="Silt loam">Silt loam</option>
              <option value="Rocky / Stony">Rocky / Stony</option>
              <option value="Fill / Compacted">Fill / Compacted</option>
              <option value="Peat / Organic">Peat / Organic</option>
            </select>
            {aiSuggested && data.soilType && (
              <p className="text-[10px] text-[var(--text-4)] mt-[3px]">
                AI suggested based on your area — change if you know your soil conditions.
              </p>
            )}
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
          {aiSuggested
            ? 'AI has suggested values based on your address. You can edit them freely.'
            : 'Select an address above and AI will auto-fill these fields.'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
          <div>
            <label className={labelClass}>
              Climate Zone
              {aiSuggested && data.climateZone && <AiTag />}
            </label>
            <input
              className={inputClass}
              placeholder="e.g., USDA 7b"
              value={data.climateZone || ''}
              onChange={(e) => onChange({ climateZone: e.target.value || null })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Permit Zone
              {aiSuggested && data.permitZone && <AiTag />}
            </label>
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
              <span className="text-[13px] text-[var(--text-2)]">
                HOA Property
                {aiSuggested && data.hoaFlag && <AiTag />}
              </span>
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
