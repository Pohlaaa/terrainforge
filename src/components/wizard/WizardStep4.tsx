import React from 'react';
import { Button } from '@/components/ui/Button';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { SuggestionPanel } from '@/components/shared/SuggestionPanel';
import type { SuggestionItem } from '@/components/shared/SuggestionPanel';
import type { WizardData, WizardSubcontractor, WizardEquipment } from '@/pages/ProjectWizard';
import type { AIRecommendationSet } from '@/types';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
  aiLoading: boolean;
  acceptedCrewIds: Set<string>;
  dismissedCrewIds: Set<string>;
  acceptedEquipIds: Set<string>;
  dismissedEquipIds: Set<string>;
  onAcceptCrew: (id: string) => void;
  onDismissCrew: (id: string) => void;
  onAcceptAllCrew: (ids: string[]) => void;
  onDismissAllCrew: (ids: string[]) => void;
  onAcceptEquip: (id: string) => void;
  onDismissEquip: (id: string) => void;
  onAcceptAllEquip: (ids: string[]) => void;
  onDismissAllEquip: (ids: string[]) => void;
  onResetCrew: () => void;
  onResetEquipment: () => void;
}

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

function createEmptySub(): WizardSubcontractor {
  return {
    tempId: crypto.randomUUID(),
    companyName: '',
    contactName: null,
    phone: null,
    trade: null,
    scopeDescription: null,
    quotedCost: null,
  };
}

export const WizardStep4: React.FC<Props> = ({
  data,
  onChange,
  recommendations,
  aiLoading,
  acceptedCrewIds,
  dismissedCrewIds,
  acceptedEquipIds,
  dismissedEquipIds,
  onAcceptCrew,
  onDismissCrew,
  onAcceptAllCrew,
  onDismissAllCrew,
  onAcceptEquip,
  onDismissEquip,
  onAcceptAllEquip,
  onDismissAllEquip,
  onResetCrew,
  onResetEquipment,
}) => {
  const { crew: orgCrew } = useCrewStore();
  const { equipment: orgEquipment } = useEquipmentStore();

  // Map AI crew recommendations to SuggestionItems
  const crewSuggestions: SuggestionItem[] = (recommendations?.crew || []).map((c) => ({
    id: c.crewMemberId,
    title: c.crewMemberName,
    subtitle: c.role,
    reason: c.reason,
    warning: !c.isAvailable ? c.availabilityNote : undefined,
    metadata: c.skills.length > 0 ? { Skills: c.skills.join(', ') } : undefined,
  }));

  // Map AI equipment recommendations to SuggestionItems
  const equipSuggestions: SuggestionItem[] = (recommendations?.equipment || []).map((e) => ({
    id: e.equipmentId,
    title: e.equipmentName,
    subtitle: e.type,
    reason: `${e.reason} — ${e.estimatedDays}d × $${e.dailyRate}/day`,
    warning: !e.isAvailable ? e.availabilityNote : undefined,
    metadata: { Days: e.estimatedDays, 'Daily Rate': `$${e.dailyRate}` },
  }));

  // Handle crew accept — add to crewSelections
  const handleAcceptCrew = (id: string) => {
    onAcceptCrew(id);
    const rec = recommendations?.crew.find((c) => c.crewMemberId === id);
    if (!rec) return;
    if (data.crewSelections.some((c) => c.crewMemberId === id)) return;
    onChange({
      crewSelections: [
        ...data.crewSelections,
        { crewMemberId: rec.crewMemberId, name: rec.crewMemberName, role: rec.role },
      ],
    });
  };

  const handleAcceptAllCrew = () => {
    const ids = crewSuggestions
      .filter((s) => !acceptedCrewIds.has(s.id) && !dismissedCrewIds.has(s.id))
      .map((s) => s.id);
    onAcceptAllCrew(ids);
    const newSelections = ids
      .filter((id) => !data.crewSelections.some((c) => c.crewMemberId === id))
      .map((id) => {
        const rec = recommendations?.crew.find((c) => c.crewMemberId === id);
        return rec ? { crewMemberId: rec.crewMemberId, name: rec.crewMemberName, role: rec.role } : null;
      })
      .filter(Boolean) as WizardData['crewSelections'];
    if (newSelections.length > 0) {
      onChange({ crewSelections: [...data.crewSelections, ...newSelections] });
    }
  };

  // Handle equipment accept — add to equipmentSelections
  const handleAcceptEquip = (id: string) => {
    onAcceptEquip(id);
    const rec = recommendations?.equipment.find((e) => e.equipmentId === id);
    if (!rec) return;
    if (data.equipmentSelections.some((e) => e.equipmentId === id)) return;
    // Look up hourly cost from org equipment profile
    const equipProfile = orgEquipment.find((e) => e.id === rec.equipmentId);
    const entry: WizardEquipment = {
      equipmentId: rec.equipmentId,
      name: rec.equipmentName,
      dailyRate: rec.dailyRate,
      durationDays: rec.estimatedDays,
      hourlyCost: equipProfile?.hourlyCost ?? undefined,
      estimatedHours: rec.estimatedDays * 8,
    };
    onChange({ equipmentSelections: [...data.equipmentSelections, entry] });
  };

  const handleAcceptAllEquip = () => {
    const ids = equipSuggestions
      .filter((s) => !acceptedEquipIds.has(s.id) && !dismissedEquipIds.has(s.id))
      .map((s) => s.id);
    onAcceptAllEquip(ids);
    const newEntries: WizardEquipment[] = ids
      .filter((id) => !data.equipmentSelections.some((e) => e.equipmentId === id))
      .map((id) => {
        const rec = recommendations?.equipment.find((e) => e.equipmentId === id);
        if (!rec) return null;
        const equipProfile = orgEquipment.find((eq) => eq.id === rec.equipmentId);
        return {
          equipmentId: rec.equipmentId,
          name: rec.equipmentName,
          dailyRate: rec.dailyRate,
          durationDays: rec.estimatedDays,
          hourlyCost: equipProfile?.hourlyCost ?? undefined,
          estimatedHours: rec.estimatedDays * 8,
        };
      })
      .filter(Boolean) as WizardEquipment[];
    if (newEntries.length > 0) {
      onChange({ equipmentSelections: [...data.equipmentSelections, ...newEntries] });
    }
  };

  // Equipment already selected (by ID)
  const selectedIds = new Set(data.equipmentSelections.map((e) => e.equipmentId));

  // Available equipment not yet selected
  const availableEquipment = orgEquipment.filter((e) => !selectedIds.has(e.id));

  const addEquipment = (equipmentId: string) => {
    const equip = orgEquipment.find((e) => e.id === equipmentId);
    if (!equip) return;
    const entry: WizardEquipment = {
      equipmentId: equip.id,
      name: equip.name,
      dailyRate: equip.dailyRate ?? 0,
      durationDays: 1,
      hourlyCost: equip.hourlyCost ?? undefined,
      estimatedHours: 8,
    };
    onChange({ equipmentSelections: [...data.equipmentSelections, entry] });
  };

  const updateEquipmentDuration = (equipmentId: string, days: number) => {
    onChange({
      equipmentSelections: data.equipmentSelections.map((e) =>
        e.equipmentId === equipmentId ? { ...e, durationDays: days } : e
      ),
    });
  };

  const removeEquipment = (equipmentId: string) => {
    onChange({
      equipmentSelections: data.equipmentSelections.filter((e) => e.equipmentId !== equipmentId),
    });
  };

  // Subcontractor helpers
  const addSub = () => {
    onChange({ subcontractors: [...data.subcontractors, createEmptySub()] });
  };

  const updateSub = (tempId: string, updates: Partial<WizardSubcontractor>) => {
    onChange({
      subcontractors: data.subcontractors.map((s) =>
        s.tempId === tempId ? { ...s, ...updates } : s
      ),
    });
  };

  const removeSub = (tempId: string) => {
    onChange({ subcontractors: data.subcontractors.filter((s) => s.tempId !== tempId) });
  };

  return (
    <div className="space-y-[24px]">
      {/* AI Crew Suggestions */}
      {(aiLoading || crewSuggestions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-[4px]">
            <div />
            {acceptedCrewIds.size > 0 && (
              <button
                type="button"
                onClick={onResetCrew}
                className="text-[12px] text-[var(--text-4)] hover:text-[var(--text-2)] bg-transparent border-none cursor-pointer px-[8px] py-[4px] rounded-[6px] hover:bg-[var(--surface3)] transition-colors"
              >
                ↺ Reset AI Suggestions
              </button>
            )}
          </div>
          <SuggestionPanel
            title="Crew Recommendations"
            items={crewSuggestions}
            onAccept={handleAcceptCrew}
            onDismiss={onDismissCrew}
            onAcceptAll={handleAcceptAllCrew}
            onDismissAll={() => {
              const ids = crewSuggestions
                .filter((s) => !acceptedCrewIds.has(s.id) && !dismissedCrewIds.has(s.id))
                .map((s) => s.id);
              onDismissAllCrew(ids);
            }}
            acceptedIds={acceptedCrewIds}
            dismissedIds={dismissedCrewIds}
            isLoading={aiLoading}
            emptyMessage="No crew suggestions available"
          />
        </div>
      )}

      {/* Manual crew add from org roster */}
      {(() => {
        const selectedCrewIds = new Set(data.crewSelections.map(c => c.crewMemberId));
        const availableCrew = orgCrew.filter(c => !selectedCrewIds.has(c.id));

        return (
          <div>
            {availableCrew.length > 0 && (
              <div className="mb-[12px]">
                <label className={labelClass}>Add Crew Member</label>
                <select
                  className={inputClass}
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const member = orgCrew.find(c => c.id === e.target.value);
                    if (!member) return;
                    onChange({
                      crewSelections: [...data.crewSelections, {
                        crewMemberId: member.id,
                        name: member.name,
                        role: member.role,
                      }],
                    });
                  }}
                >
                  <option value="">Select crew member to add...</option>
                  {availableCrew.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.role}</option>
                  ))}
                </select>
              </div>
            )}

            {orgCrew.length === 0 && data.crewSelections.length === 0 && !aiLoading && crewSuggestions.length === 0 && (
              <div
                className="rounded-[8px] border-2 border-dashed p-[16px] text-center mb-[12px]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
              >
                <p className="text-[13px]">No crew members in your organization yet. Add crew on the Crew & Equipment page, or continue without crew assignments.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Assigned crew members */}
      {data.crewSelections.length > 0 && (
        <div>
          <h4 className="text-[13px] font-[600] text-[var(--text-2)] mb-[8px]">
            Assigned Crew ({data.crewSelections.length})
          </h4>
          <div className="space-y-[6px]">
            {data.crewSelections.map((c) => (
              <div
                key={c.crewMemberId}
                className="flex items-center gap-[8px] rounded-[8px] border px-[12px] py-[8px]"
                style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
              >
                <span className="text-[13px] text-[var(--text)] flex-1">{c.name}</span>
                <span className="text-[11px] text-[var(--text-4)]">{c.role}</span>
                <button
                  type="button"
                  onClick={() => {
                    onChange({
                      crewSelections: data.crewSelections.filter((cs) => cs.crewMemberId !== c.crewMemberId),
                    });
                  }}
                  className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer p-[2px] text-[14px]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Equipment Suggestions */}
      {(aiLoading || equipSuggestions.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-[4px]">
            <div />
            {acceptedEquipIds.size > 0 && (
              <button
                type="button"
                onClick={onResetEquipment}
                className="text-[12px] text-[var(--text-4)] hover:text-[var(--text-2)] bg-transparent border-none cursor-pointer px-[8px] py-[4px] rounded-[6px] hover:bg-[var(--surface3)] transition-colors"
              >
                ↺ Reset AI Suggestions
              </button>
            )}
          </div>
          <SuggestionPanel
            title="Equipment Recommendations"
            items={equipSuggestions}
            onAccept={handleAcceptEquip}
            onDismiss={onDismissEquip}
            onAcceptAll={handleAcceptAllEquip}
            onDismissAll={() => {
              const ids = equipSuggestions
                .filter((s) => !acceptedEquipIds.has(s.id) && !dismissedEquipIds.has(s.id))
                .map((s) => s.id);
              onDismissAllEquip(ids);
            }}
            acceptedIds={acceptedEquipIds}
            dismissedIds={dismissedEquipIds}
            isLoading={aiLoading}
            emptyMessage="No equipment suggestions available"
          />
        </div>
      )}

      {/* Equipment from org library */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Equipment
        </h3>

        {/* Dropdown to add equipment */}
        {availableEquipment.length > 0 && (
          <div className="mb-[12px]">
            <label className={labelClass}>Add Equipment from Library</label>
            <select
              className={inputClass}
              value=""
              onChange={(e) => {
                if (e.target.value) addEquipment(e.target.value);
              }}
            >
              <option value="">Select equipment to add...</option>
              {availableEquipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.makeModel ? ` — ${e.makeModel}` : ''}{e.dailyRate ? ` ($${e.dailyRate}/day)` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selected equipment list */}
        {data.equipmentSelections.length > 0 && (
          <div className="space-y-[8px] mb-[12px]">
            {data.equipmentSelections.map((equip) => (
              <div
                key={equip.equipmentId}
                className="flex items-center gap-[10px] rounded-[8px] border px-[12px] py-[10px]"
                style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
              >
                <div className="flex-1">
                  <span className="text-[13px] font-[500] text-[var(--text)]">{equip.name}</span>
                  {equip.dailyRate > 0 && (
                    <span className="text-[11px] text-[var(--text-4)] ml-[8px]">
                      ${equip.dailyRate}/day
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-[6px] shrink-0">
                  <label className="text-[11px] text-[var(--text-3)]">Days:</label>
                  <input
                    className="w-[60px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-[8px] py-[6px] text-[13px] text-[var(--text)] text-center focus:outline-none focus:border-[var(--green)]"
                    type="number"
                    min="1"
                    value={equip.durationDays}
                    onChange={(e) =>
                      updateEquipmentDuration(equip.equipmentId, Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                  {equip.dailyRate > 0 && (
                    <span className="text-[12px] text-[var(--text-3)] w-[70px] text-right">
                      ${(equip.dailyRate * equip.durationDays).toLocaleString()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeEquipment(equip.equipmentId)}
                  className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer p-[4px] text-[14px] shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
            {/* Equipment cost subtotal */}
            {data.equipmentSelections.some((e) => e.dailyRate > 0) && (
              <div className="flex justify-end text-[12px] text-[var(--text-3)] pr-[30px]">
                Equipment total: $
                {data.equipmentSelections
                  .reduce((sum, e) => sum + e.dailyRate * e.durationDays, 0)
                  .toLocaleString()}
              </div>
            )}
          </div>
        )}

        {data.equipmentSelections.length === 0 && orgEquipment.length === 0 && (
          <div
            className="rounded-[8px] border-2 border-dashed p-[16px] text-center mb-[12px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
          >
            <p className="text-[13px]">No equipment in your library yet. Add equipment on the Equipment page, or use the notes field below.</p>
          </div>
        )}

        {/* Equipment notes for rental / items not in library */}
        <div>
          <label className={labelClass}>Equipment Notes</label>
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            placeholder="Rental equipment or items not in your library (e.g., rented 20-ton crane for 2 days)"
            value={data.equipmentNotes || ''}
            onChange={(e) => onChange({ equipmentNotes: e.target.value || null })}
          />
          <p className="text-[11px] text-[var(--text-4)] mt-[4px]">
            For rental equipment or anything not in your org's equipment library.
          </p>
        </div>
      </div>

      {/* Subcontractors */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[16px]">
          Subcontractors
        </h3>

        {data.subcontractors.length === 0 && (
          <div
            className="rounded-[8px] border-2 border-dashed p-[20px] text-center mb-[12px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-4)' }}
          >
            <p className="text-[13px]">No subcontractors. Add any subs needed for this job.</p>
          </div>
        )}

        <div className="space-y-[12px]">
          {data.subcontractors.map((sub) => (
            <div
              key={sub.tempId}
              className="rounded-[8px] border p-[14px]"
              style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start gap-[10px]">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-[10px]">
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input
                      className={inputClass}
                      placeholder="e.g., Smith Electric"
                      value={sub.companyName}
                      onChange={(e) => updateSub(sub.tempId, { companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Trade</label>
                    <input
                      className={inputClass}
                      placeholder="e.g., Electrician"
                      value={sub.trade || ''}
                      onChange={(e) => updateSub(sub.tempId, { trade: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Quoted Cost</label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="$0.00"
                      value={sub.quotedCost ?? ''}
                      onChange={(e) =>
                        updateSub(sub.tempId, {
                          quotedCost: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Scope</label>
                    <input
                      className={inputClass}
                      placeholder="e.g., Install landscape lighting along front walkway"
                      value={sub.scopeDescription || ''}
                      onChange={(e) =>
                        updateSub(sub.tempId, { scopeDescription: e.target.value || null })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact</label>
                    <input
                      className={inputClass}
                      placeholder="Name / phone"
                      value={sub.contactName || ''}
                      onChange={(e) =>
                        updateSub(sub.tempId, { contactName: e.target.value || null })
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeSub(sub.tempId)}
                  className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer p-[4px] text-[16px] shrink-0 mt-[22px]"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[12px]">
          <Button variant="secondary" size="sm" onClick={addSub}>
            + Add Subcontractor
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WizardStep4;
