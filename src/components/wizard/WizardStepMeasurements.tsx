import React, { useState, useMemo } from 'react';
import { ELEMENT_TYPE_LABELS } from '@/lib/elements';
import type { WizardData, WizardElement } from '@/pages/ProjectWizard';
import type { ElementType } from '@/types';

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
}

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[10px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';

const labelClass = 'block text-[12px] font-[600] text-[var(--text-2)] mb-[6px]';

const ELEMENT_TYPE_OPTIONS = Object.entries(ELEMENT_TYPE_LABELS) as [ElementType, string][];

// Which dimension fields are relevant per element type
type DimensionConfig = {
  lengthWidth?: boolean;    // length × width → auto-calc area
  manualArea?: boolean;     // manual area override
  linearFt?: boolean;       // linear feet
  heightFt?: boolean;       // height
  depthIn?: boolean;        // depth in inches
  allFields?: boolean;      // show everything
};

const DIMENSION_CONFIG: Record<ElementType, DimensionConfig> = {
  patio:          { lengthWidth: true, manualArea: true },
  walkway:        { lengthWidth: true, manualArea: true },
  driveway:       { lengthWidth: true, manualArea: true },
  pool_deck:      { lengthWidth: true, manualArea: true },
  fire_pit:       { lengthWidth: true, manualArea: true },
  wall:           { linearFt: true, heightFt: true },
  retaining_wall: { linearFt: true, heightFt: true },
  garden_bed:     { lengthWidth: true, manualArea: true },
  sod_area:       { lengthWidth: true, manualArea: true },
  edging:         { linearFt: true },
  other:          { allFields: true },
};

// AI suggestion presets based on project type
const PROJECT_TYPE_PRESETS: Record<string, Omit<WizardElement, 'tempId'>[]> = {
  hardscape: [
    { name: 'Main Patio', elementType: 'patio', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Base Prep Area', elementType: 'patio', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: 'Base material area — match patio dimensions' },
    { name: 'Patio Edging', elementType: 'edging', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: 'Perimeter restraint edging' },
  ],
  full_install: [
    { name: 'Patio', elementType: 'patio', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Walkway', elementType: 'walkway', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Garden Beds', elementType: 'garden_bed', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Sod Area', elementType: 'sod_area', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Edging', elementType: 'edging', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
  ],
  softscape: [
    { name: 'Garden Beds', elementType: 'garden_bed', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Sod / Turf Area', elementType: 'sod_area', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Bed Edging', elementType: 'edging', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
  ],
  renovation: [
    { name: 'Renovation Area', elementType: 'patio', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
  ],
  drainage: [
    { name: 'Drainage Run', elementType: 'other', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: 'Drainage channel / French drain' },
  ],
  mixed: [
    { name: 'Hardscape Area', elementType: 'patio', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Planting Beds', elementType: 'garden_bed', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
    { name: 'Edging', elementType: 'edging', lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' },
  ],
};

function computeArea(el: WizardElement): number | null {
  // Manual area override takes precedence
  if (el.areaSqft != null && el.areaSqft > 0) return el.areaSqft;
  const cfg = DIMENSION_CONFIG[el.elementType];
  // Length × width
  if ((cfg.lengthWidth || cfg.allFields) && el.lengthFt && el.widthFt) {
    return Math.round(el.lengthFt * el.widthFt * 100) / 100;
  }
  // Linear ft × height → face area (walls)
  if ((cfg.heightFt || cfg.allFields) && el.linearFt && el.heightFt) {
    return Math.round(el.linearFt * el.heightFt * 100) / 100;
  }
  return null;
}

export const WizardStepMeasurements: React.FC<Props> = ({ data, onChange }) => {
  const elements = data.elements;
  const [suggestionsApplied, setSuggestionsApplied] = useState(false);

  const updateElement = (tempId: string, updates: Partial<WizardElement>) => {
    onChange({
      elements: elements.map((el) =>
        el.tempId === tempId ? { ...el, ...updates } : el
      ),
    });
  };

  const addElement = () => {
    const newEl: WizardElement = {
      tempId: crypto.randomUUID(),
      name: '',
      elementType: 'patio',
      lengthFt: null,
      widthFt: null,
      areaSqft: null,
      linearFt: null,
      heightFt: null,
      depthIn: null,
      notes: '',
    };
    onChange({ elements: [...elements, newEl] });
  };

  const removeElement = (tempId: string) => {
    onChange({ elements: elements.filter((el) => el.tempId !== tempId) });
  };

  const applySuggestions = () => {
    const presetKey = data.projectType || '';
    const preset = PROJECT_TYPE_PRESETS[presetKey];
    if (!preset) return;
    const newElements: WizardElement[] = preset.map((p) => ({
      ...p,
      tempId: crypto.randomUUID(),
    }));
    onChange({ elements: [...elements, ...newElements] });
    setSuggestionsApplied(true);
  };

  // Computed total area across all elements
  const totalArea = useMemo(() => {
    return elements.reduce((sum, el) => sum + (computeArea(el) ?? 0), 0);
  }, [elements]);

  const projectTypeLabel = data.projectType
    ? (({ full_install: 'Full Install', renovation: 'Renovation', hardscape: 'Hardscape', softscape: 'Softscape', drainage: 'Drainage', irrigation: 'Irrigation', maintenance: 'Maintenance', mixed: 'Mixed' } as Record<string, string>)[data.projectType] ?? data.projectType)
    : null;

  const hasSuggestions = !!data.projectType && !!PROJECT_TYPE_PRESETS[data.projectType];

  return (
    <div className="space-y-[24px]">
      {/* Header */}
      <div>
        <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[4px]">
          Project Elements
        </h3>
        <p className="text-[12px] text-[var(--text-4)]">
          Add each area of work with its measurements. These drive all material calculations.
        </p>
      </div>

      {/* AI Suggestion Button */}
      {hasSuggestions && !suggestionsApplied && (
        <button
          type="button"
          onClick={applySuggestions}
          className="w-full rounded-[8px] border px-[14px] py-[10px] flex items-center gap-[8px] cursor-pointer transition-colors"
          style={{
            backgroundColor: 'rgba(45,106,79,0.06)',
            borderColor: 'var(--green)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L8.5 4.5L12.5 5L9.5 7.5L10.5 11.5L7 9.5L3.5 11.5L4.5 7.5L1.5 5L5.5 4.5L7 1Z" fill="var(--green)" />
          </svg>
          <span className="text-[13px] font-[500]" style={{ color: 'var(--green-l)' }}>
            Suggest elements for {projectTypeLabel} project
          </span>
          <span className="text-[11px] text-[var(--text-4)] ml-auto">
            Pre-fills typical areas — all values editable
          </span>
        </button>
      )}

      {suggestionsApplied && (
        <div
          className="rounded-[8px] border px-[14px] py-[8px] flex items-center gap-[6px]"
          style={{ backgroundColor: 'rgba(45,106,79,0.06)', borderColor: 'var(--border)' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L8.5 4.5L12.5 5L9.5 7.5L10.5 11.5L7 9.5L3.5 11.5L4.5 7.5L1.5 5L5.5 4.5L7 1Z" fill="var(--green)" />
          </svg>
          <span className="text-[12px] text-[var(--text-3)]">
            AI suggested elements added — enter your real measurements below.
            All values are <strong style={{ color: 'var(--status-amber)' }}>estimated</strong> until you fill them in.
          </span>
        </div>
      )}

      {/* Element Cards */}
      <div className="space-y-[12px]">
        {elements.map((el, idx) => {
          const cfg = DIMENSION_CONFIG[el.elementType];
          const area = computeArea(el);
          const showLengthWidth = cfg.lengthWidth || cfg.allFields;
          const showLinearFt = cfg.linearFt || cfg.allFields;
          const showHeight = cfg.heightFt || cfg.allFields;
          const showDepth = cfg.depthIn || cfg.allFields;
          const showManualArea = cfg.manualArea || cfg.allFields;

          return (
            <div
              key={el.tempId}
              className="rounded-[10px] border p-[16px]"
              style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
            >
              {/* Card header: number, name, type, delete */}
              <div className="flex items-start gap-[10px] mb-[12px]">
                <span className="text-[12px] font-[600] text-[var(--text-4)] mt-[10px] shrink-0 w-[20px]">
                  {idx + 1}.
                </span>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                  <div>
                    <label className={labelClass}>Element Name</label>
                    <input
                      className={inputClass}
                      placeholder="e.g., Back Patio, Front Walkway"
                      value={el.name}
                      onChange={(e) => updateElement(el.tempId, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select
                      className={inputClass}
                      value={el.elementType}
                      onChange={(e) => updateElement(el.tempId, { elementType: e.target.value as ElementType })}
                    >
                      {ELEMENT_TYPE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeElement(el.tempId)}
                  className="w-[28px] h-[28px] rounded-[6px] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--text)] hover:bg-[var(--surface)] cursor-pointer bg-transparent border-none transition-colors mt-[6px] shrink-0"
                  title="Remove element"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </div>

              {/* Dimension fields — adapt based on type */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] ml-[30px]">
                {showLengthWidth && (
                  <>
                    <div>
                      <label className={labelClass}>Length (ft)</label>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        value={el.lengthFt ?? ''}
                        onChange={(e) => updateElement(el.tempId, { lengthFt: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Width (ft)</label>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        value={el.widthFt ?? ''}
                        onChange={(e) => updateElement(el.tempId, { widthFt: e.target.value ? parseFloat(e.target.value) : null })}
                      />
                    </div>
                  </>
                )}

                {showLinearFt && (
                  <div>
                    <label className={labelClass}>Linear Ft</label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={el.linearFt ?? ''}
                      onChange={(e) => updateElement(el.tempId, { linearFt: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                )}

                {showHeight && (
                  <div>
                    <label className={labelClass}>Height (ft)</label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.25"
                      placeholder="0"
                      value={el.heightFt ?? ''}
                      onChange={(e) => updateElement(el.tempId, { heightFt: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                )}

                {showDepth && (
                  <div>
                    <label className={labelClass}>Depth (in)</label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={el.depthIn ?? ''}
                      onChange={(e) => updateElement(el.tempId, { depthIn: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                )}

                {showManualArea && (
                  <div>
                    <label className={labelClass}>
                      Area (sqft){el.lengthFt && el.widthFt ? ' override' : ''}
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="1"
                      placeholder={el.lengthFt && el.widthFt ? String(Math.round(el.lengthFt * el.widthFt)) : '0'}
                      value={el.areaSqft ?? ''}
                      onChange={(e) => updateElement(el.tempId, { areaSqft: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                  </div>
                )}

                {/* Computed area display */}
                {area != null && area > 0 && (
                  <div className="flex items-end pb-[10px]">
                    <span
                      className="text-[16px] font-[700] tabular-nums"
                      style={{ color: 'var(--status-green)' }}
                    >
                      {area.toLocaleString()} sqft
                    </span>
                  </div>
                )}

                {/* Linear ft display for edging-type */}
                {!area && el.linearFt && el.linearFt > 0 && !showLengthWidth && (
                  <div className="flex items-end pb-[10px]">
                    <span
                      className="text-[16px] font-[700] tabular-nums"
                      style={{ color: 'var(--status-green)' }}
                    >
                      {el.linearFt.toLocaleString()} LF
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="ml-[30px] mt-[8px]">
                <input
                  className={`${inputClass} text-[12px]`}
                  placeholder="Notes (optional)"
                  value={el.notes}
                  onChange={(e) => updateElement(el.tempId, { notes: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Element button */}
      <button
        type="button"
        onClick={addElement}
        className="w-full rounded-[8px] border-2 border-dashed py-[12px] flex items-center justify-center gap-[6px] cursor-pointer transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v10M3 8h10" />
        </svg>
        <span className="text-[13px] font-[500]">Add Element</span>
      </button>

      {/* Summary */}
      {elements.length > 0 && totalArea > 0 && (
        <div
          className="flex items-center justify-between rounded-[8px] border px-[16px] py-[10px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <span className="text-[13px] font-[600] text-[var(--text)]">
            Total Area ({elements.length} element{elements.length !== 1 ? 's' : ''})
          </span>
          <span
            className="text-[18px] font-[700] tabular-nums"
            style={{ color: 'var(--status-green)' }}
          >
            {totalArea.toLocaleString()} sqft
          </span>
        </div>
      )}
    </div>
  );
};

export default WizardStepMeasurements;
