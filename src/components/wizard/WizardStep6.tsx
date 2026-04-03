import React from 'react';
import { SuggestionPanel } from '@/components/shared/SuggestionPanel';
import type { SuggestionItem } from '@/components/shared/SuggestionPanel';
import type { WizardData } from '@/pages/ProjectWizard';
import type { AIRecommendationSet } from '@/types';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
  aiLoading: boolean;
  acceptedIds: Set<string>;
  dismissedIds: Set<string>;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onAcceptAll: (ids: string[]) => void;
  onDismissAll: (ids: string[]) => void;
  onReset: () => void;
}

const PERMIT_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'applied', label: 'Applied' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'not_required', label: 'Not Required' },
];

const PERMIT_OPTIONS = [
  { key: 'grading', label: 'Grading / Excavation', desc: 'Required for significant earth moving' },
  { key: 'building', label: 'Building Permit', desc: 'Structures, retaining walls over 4ft' },
  { key: 'electrical', label: 'Electrical', desc: 'Landscape lighting, outlets' },
  { key: 'plumbing', label: 'Plumbing / Irrigation', desc: 'Sprinkler systems, water features' },
  { key: 'stormwater', label: 'Stormwater / Drainage', desc: 'Drainage modifications, impervious cover' },
  { key: 'tree_removal', label: 'Tree Removal', desc: 'Protected species or size thresholds' },
  { key: 'fence', label: 'Fence Permit', desc: 'New fences or height modifications' },
  { key: 'parking', label: 'Parking Permit', desc: 'Street parking for equipment or dumpsters' },
  { key: 'hoa_approval', label: 'HOA Approval', desc: 'Design review by homeowners association' },
];

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const URGENCY_LABELS: Record<string, string> = {
  required: 'Required',
  recommended: 'Recommended',
  optional: 'Optional',
};

export const WizardStep6: React.FC<Props> = ({
  data,
  onChange,
  recommendations,
  aiLoading,
  acceptedIds,
  dismissedIds,
  onAccept,
  onDismiss,
  onAcceptAll,
  onDismissAll,
  onReset,
}) => {
  // Map AI permit recommendations to SuggestionItems
  const permitSuggestions: SuggestionItem[] = (recommendations?.permits || []).map((p, i) => ({
    id: `permit-${i}-${p.permitType}`,
    title: PERMIT_OPTIONS.find((o) => o.key === p.permitType)?.label || p.permitType,
    subtitle: URGENCY_LABELS[p.urgency] || p.urgency,
    reason: p.reason,
    metadata: p.estimatedFee != null ? { 'Est. Fee': `$${p.estimatedFee}` } : undefined,
  }));

  // Handle permit accept — add to checklist and set fee
  const handleAcceptPermit = (id: string) => {
    onAccept(id);
    const idx = parseInt(id.split('-')[1]);
    const rec = recommendations?.permits[idx];
    if (!rec) return;
    if (!data.permitChecklist.includes(rec.permitType)) {
      const fees = { ...data.permitFees };
      if (rec.estimatedFee != null) fees[rec.permitType] = rec.estimatedFee;
      onChange({
        permitChecklist: [...data.permitChecklist, rec.permitType],
        permitFees: fees,
        noPermitsRequired: false,
        permitStatus: data.permitStatus === 'not_required' ? 'not_started' : data.permitStatus,
      });
    }
  };

  const handleAcceptAllPermits = () => {
    const ids = permitSuggestions
      .filter((s) => !acceptedIds.has(s.id) && !dismissedIds.has(s.id))
      .map((s) => s.id);
    onAcceptAll(ids);
    const newChecklist = [...data.permitChecklist];
    const newFees = { ...data.permitFees };
    ids.forEach((id) => {
      const idx = parseInt(id.split('-')[1]);
      const rec = recommendations?.permits[idx];
      if (!rec || newChecklist.includes(rec.permitType)) return;
      newChecklist.push(rec.permitType);
      if (rec.estimatedFee != null) newFees[rec.permitType] = rec.estimatedFee;
    });
    onChange({
      permitChecklist: newChecklist,
      permitFees: newFees,
      noPermitsRequired: false,
      permitStatus: data.permitStatus === 'not_required' ? 'not_started' : data.permitStatus,
    });
  };

  const handleDismissAllPermits = () => {
    const ids = permitSuggestions
      .filter((s) => !acceptedIds.has(s.id) && !dismissedIds.has(s.id))
      .map((s) => s.id);
    onDismissAll(ids);
  };

  const togglePermit = (key: string) => {
    const isChecked = data.permitChecklist.includes(key);
    const updated = isChecked
      ? data.permitChecklist.filter((k) => k !== key)
      : [...data.permitChecklist, key];

    // Clean up fee if unchecked
    const fees = { ...data.permitFees };
    if (isChecked) delete fees[key];

    onChange({ permitChecklist: updated, permitFees: fees });
  };

  const updateFee = (key: string, value: number | null) => {
    const fees = { ...data.permitFees };
    if (value != null && value > 0) {
      fees[key] = value;
    } else {
      delete fees[key];
    }
    onChange({ permitFees: fees });
  };

  const totalPermitFees = Object.values(data.permitFees).reduce((sum, v) => sum + v, 0);

  const handleNoPermitsToggle = (checked: boolean) => {
    if (checked) {
      onChange({
        noPermitsRequired: true,
        permitStatus: 'not_required',
        permitChecklist: [],
        permitFees: {},
      });
    } else {
      onChange({
        noPermitsRequired: false,
        permitStatus: 'not_started',
      });
    }
  };

  return (
    <div className="space-y-[24px]">
      {/* AI Permit Suggestions */}
      {(aiLoading || permitSuggestions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-[4px]">
            <div />
            {acceptedIds.size > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="text-[12px] text-[var(--text-4)] hover:text-[var(--text-2)] bg-transparent border-none cursor-pointer px-[8px] py-[4px] rounded-[6px] hover:bg-[var(--surface3)] transition-colors"
              >
                ↺ Reset AI Suggestions
              </button>
            )}
          </div>
          <SuggestionPanel
            title="Permit Recommendations"
            items={permitSuggestions}
            onAccept={handleAcceptPermit}
            onDismiss={onDismiss}
            onAcceptAll={handleAcceptAllPermits}
            onDismissAll={handleDismissAllPermits}
            acceptedIds={acceptedIds}
            dismissedIds={dismissedIds}
            isLoading={aiLoading}
            emptyMessage="No permit suggestions"
          />
        </div>
      )}

      {/* No Permits Toggle */}
      <div
        className="rounded-[10px] border-2 px-[16px] py-[14px] cursor-pointer transition-all"
        style={{
          backgroundColor: data.noPermitsRequired ? 'rgba(45,106,79,0.08)' : 'var(--surface2)',
          borderColor: data.noPermitsRequired ? 'var(--green)' : 'var(--border)',
        }}
        onClick={() => handleNoPermitsToggle(!data.noPermitsRequired)}
      >
        <label className="flex items-center gap-[12px] cursor-pointer">
          <input
            type="checkbox"
            checked={data.noPermitsRequired}
            onChange={(e) => handleNoPermitsToggle(e.target.checked)}
            className="w-[18px] h-[18px] accent-[var(--green)] shrink-0"
          />
          <div>
            <span className="text-[14px] font-[600] text-[var(--text)]">
              No permits required for this project
            </span>
            <p className="text-[12px] text-[var(--text-4)] mt-[2px]">
              Toggle this on for small residential jobs that don't need any permits.
            </p>
          </div>
        </label>
      </div>

      {/* Everything below is hidden when no permits required */}
      {!data.noPermitsRequired && (
        <>
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
                {data.permitZone ? (
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[13px] text-[var(--text)]">{data.permitZone}</span>
                    <span className="text-[11px] text-[var(--green-l)] cursor-pointer hover:underline"
                      onClick={() => {/* Scroll handled by wizard stepper — user clicks Step 2 */}}
                    >
                      Edit in Step 2
                    </span>
                  </div>
                ) : (
                  <p className="text-[12px] text-[var(--text-4)] italic">
                    Set in Step 2 (Site Intelligence) — auto-populated from address.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Common Permit Checklist */}
          <div>
            <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
              Common Permits for Landscaping
            </h3>
            <p className="text-[12px] text-[var(--text-4)] mb-[16px]">
              Check which permits apply. Add the estimated fee per permit — these costs flow into the budget step.
            </p>
            <div className="space-y-[8px]">
              {PERMIT_OPTIONS.map((permit) => {
                const isChecked = data.permitChecklist.includes(permit.key);
                return (
                  <div key={permit.key}>
                    <label
                      className="flex items-start gap-[10px] rounded-[8px] border px-[12px] py-[10px] cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isChecked ? 'rgba(45,106,79,0.08)' : 'var(--surface2)',
                        borderColor: isChecked ? 'var(--green)' : 'var(--border)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePermit(permit.key)}
                        className="mt-[2px] w-[16px] h-[16px] accent-[var(--green)] shrink-0"
                      />
                      <div className="flex-1">
                        <span className="text-[13px] font-[500] text-[var(--text)]">{permit.label}</span>
                        <p className="text-[11px] text-[var(--text-4)] mt-[1px]">{permit.desc}</p>
                      </div>
                      {isChecked && (
                        <div className="shrink-0 flex items-center gap-[4px]" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[11px] text-[var(--text-3)]">Fee:</label>
                          <input
                            className="w-[90px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-[8px] py-[5px] text-[12px] text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="$0"
                            value={data.permitFees[permit.key] ?? ''}
                            onChange={(e) =>
                              updateFee(permit.key, e.target.value ? parseFloat(e.target.value) : null)
                            }
                          />
                        </div>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>

            {/* Permit fee total */}
            {totalPermitFees > 0 && (
              <div className="flex justify-end text-[12px] text-[var(--text-3)] mt-[8px]">
                Total permit fees: {fmt(totalPermitFees)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Compliance / Risk Notes — always visible */}
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
