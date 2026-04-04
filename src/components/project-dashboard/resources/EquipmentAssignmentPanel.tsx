import React, { useState } from 'react';
import type { Project, ScheduleEntry } from '@/types';

const cardClass = 'rounded-[10px] border p-[16px]';
const cardHead = 'text-[12px] font-[700] uppercase text-[var(--text-3)] mb-[14px]';
const inputClass =
  'bg-transparent border rounded-[6px] px-[8px] py-[4px] text-[12px] text-[var(--text)] w-full focus:outline-none focus:border-[var(--green)]';

// Inline editable field component (local copy)
const InlineEditField: React.FC<{
  label: string;
  value: string;
  type?: 'text' | 'number' | 'textarea';
  placeholder?: string;
  onSave: (value: string) => void;
}> = ({ label, value, type = 'text', placeholder, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between py-[4px]">
        <div>
          <span className="text-[11px] text-[var(--text-4)] mr-[8px]">{label}:</span>
          <span className="text-[12px] text-[var(--text)]">{value || '\u2014'}</span>
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="text-[11px] bg-transparent border-none cursor-pointer shrink-0"
          style={{ color: 'var(--green-l)' }}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="py-[4px] space-y-[4px]">
      <label className="text-[11px] text-[var(--text-4)] block">{label}</label>
      {type === 'textarea' ? (
        <textarea
          className={inputClass}
          style={{ borderColor: 'var(--border)', minHeight: '50px', resize: 'vertical' }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      ) : (
        <input
          type={type}
          className={inputClass}
          style={{ borderColor: 'var(--border)' }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          min={type === 'number' ? 0 : undefined}
          autoFocus
        />
      )}
      <div className="flex gap-[4px] justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="px-[8px] py-[3px] rounded-[4px] border text-[10px] bg-transparent cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-[8px] py-[3px] rounded-[4px] text-[10px] border-none cursor-pointer font-[600]"
          style={{ backgroundColor: 'var(--green)', color: '#fff' }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export interface EquipmentAssignmentPanelProps {
  project: Project;
  scheduleEntries: ScheduleEntry[];
  onEquipmentNotesSave: (value: string) => void;
}

export const EquipmentAssignmentPanel: React.FC<EquipmentAssignmentPanelProps> = ({
  project,
  scheduleEntries,
  onEquipmentNotesSave,
}) => {
  // Dedupe equipment across all zones
  const equipMap = new Map<string, { name: string; zones: string[] }>();
  for (const zone of project.zones) {
    for (const eq of zone.equipment || []) {
      if (!equipMap.has(eq.equipId)) {
        equipMap.set(eq.equipId, { name: eq.name, zones: [] });
      }
      equipMap.get(eq.equipId)!.zones.push(zone.name);
    }
  }
  // Also include equipment referenced in schedule entries
  for (const entry of scheduleEntries) {
    if (entry.equipmentId && !equipMap.has(entry.equipmentId)) {
      equipMap.set(entry.equipmentId, { name: `Equipment ${entry.equipmentId.slice(0, 8)}`, zones: [] });
    }
  }
  const equipList = [...equipMap.values()];

  return (
    <>
      <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
        <div className={cardHead}>Equipment ({equipList.length})</div>

        {/* Editable equipment notes */}
        <div className="mb-[10px]">
          <InlineEditField
            label="Equipment Notes"
            value={project.equipmentNotes || ''}
            type="textarea"
            placeholder="e.g., mini-excavator needed for trenching"
            onSave={onEquipmentNotesSave}
          />
        </div>

        {equipList.length === 0 ? (
          <p className="text-[12px] text-[var(--text-4)]">
            No equipment assigned. Assign equipment to zones or schedule entries.
          </p>
        ) : (
          <div className="space-y-[6px]">
            {equipList.map((eq, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-[6px] px-[10px] py-[6px]"
                style={{ backgroundColor: 'var(--surface3)' }}
              >
                <span className="text-[12px] font-[500] text-[var(--text)]">{eq.name}</span>
                {eq.zones.length > 0 && (
                  <span className="text-[11px] text-[var(--text-4)]">{eq.zones.join(', ')}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zones */}
      {project.zones.length > 0 && (
        <div className={cardClass} style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}>
          <div className={cardHead}>Zones ({project.zones.length})</div>
          <div className="space-y-[6px]">
            {project.zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between rounded-[6px] px-[10px] py-[6px]"
                style={{ backgroundColor: 'var(--surface3)' }}
              >
                <span className="text-[12px] font-[500] text-[var(--text)]">{zone.name}</span>
                <span className="text-[11px] text-[var(--text-4)]">
                  {zone.area.toLocaleString()} sqft · {zone.materials?.length ?? 0} materials
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
