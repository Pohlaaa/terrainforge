import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ELEMENT_TYPE_LABELS, getElementTypesForCategory } from '@/lib/elements';
import type { WizardData, WizardElement } from '@/pages/ProjectWizard';
import type { ElementType } from '@/types';
import { normalizeCategory } from '@/lib/categories';
import { ElementVisual } from '@/components/shared/ElementVisual';
import type { ProjectElement } from '@/types';
// F-050: swap raw number inputs for NumberInput so the same zero-on-focus
// + select-all UX applies on the Measurements step. Matches F-040's treatment
// of the Numbers step, BudgetBreakdownTable, and MaterialFormModal.
import { NumberInput } from '@/components/ui/NumberInput';

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
  patio:            { lengthWidth: true, manualArea: true },
  walkway:          { lengthWidth: true, manualArea: true },
  driveway:         { lengthWidth: true, manualArea: true },
  pool_deck:        { lengthWidth: true, manualArea: true },
  fire_pit:         { lengthWidth: true, manualArea: true },
  parking_lot:      { lengthWidth: true, manualArea: true },
  concrete_slab:    { lengthWidth: true, manualArea: true },
  gravel_area:      { lengthWidth: true, manualArea: true },
  mulch_area:       { lengthWidth: true, manualArea: true },
  outdoor_kitchen:  { lengthWidth: true, manualArea: true },
  wall:             { linearFt: true, heightFt: true },
  retaining_wall:   { linearFt: true, heightFt: true },
  fence:            { linearFt: true, heightFt: true },
  steps_stairs:     { lengthWidth: true, heightFt: true },
  garden_bed:       { lengthWidth: true, manualArea: true },
  sod_area:         { lengthWidth: true, manualArea: true },
  tree_planting:    { manualArea: true },
  shrub_planting:   { lengthWidth: true, manualArea: true },
  irrigation_zone:  { manualArea: true },
  edging:           { linearFt: true },
  curbing:          { linearFt: true },
  pergola:          { lengthWidth: true },
  drainage:         { linearFt: true, depthIn: true },
  other:            { allFields: true },
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevElementCount = useRef(elements.length);

  // Auto-scroll when new elements are added
  useEffect(() => {
    if (elements.length > prevElementCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevElementCount.current = elements.length;
  }, [elements.length]);

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
    const desc = (data.description || '').toLowerCase();
    const inferred: Omit<WizardElement, 'tempId'>[] = [];

    // Always infer from description keywords — this is the primary source
    const keywords: [string[], string, ElementType][] = [
      [['patio', 'paver patio', 'stone patio', 'flagstone'], 'Patio', 'patio'],
      [['walkway', 'path', 'sidewalk', 'paver walkway', 'stepping stone'], 'Walkway', 'walkway'],
      [['driveway'], 'Driveway', 'driveway'],
      [['parking lot', 'parking area', 'parking'], 'Parking Lot', 'parking_lot'],
      [['retaining wall', 'retaining'], 'Retaining Wall', 'retaining_wall'],
      [['seating wall', 'seat wall', 'block wall'], 'Wall', 'wall'],
      [['garden bed', 'garden', 'planting bed', 'flower bed', 'planting area', 'curbed garden'], 'Garden Beds', 'garden_bed'],
      [['sod', 'turf', 'lawn', 'grass', 'resod'], 'Sod Area', 'sod_area'],
      [['edging', 'border', 'landscape border', 'paver border'], 'Edging', 'edging'],
      [['curb', 'curbing'], 'Curbing', 'curbing'],
      [['fire pit', 'firepit', 'fire feature', 'fire ring'], 'Fire Pit', 'fire_pit'],
      [['pool deck', 'pool surround'], 'Pool Deck', 'pool_deck'],
      [['tree', 'trees', 'shade tree', 'ornamental tree', 'oak', 'maple'], 'Tree Planting', 'tree_planting'],
      [['shrub', 'shrubs', 'hedge', 'hedges', 'bush', 'bushes', 'boxwood'], 'Shrub Planting', 'shrub_planting'],
      [['mulch', 'wood chips', 'bark'], 'Mulch Area', 'mulch_area'],
      [['gravel', 'rock', 'decomposed granite', 'river rock'], 'Gravel Area', 'gravel_area'],
      [['concrete', 'slab', 'pad'], 'Concrete Slab', 'concrete_slab'],
      [['fence', 'fencing', 'gate'], 'Fence', 'fence'],
      [['pergola', 'arbor', 'trellis'], 'Pergola', 'pergola'],
      [['outdoor kitchen', 'grill', 'bbq'], 'Outdoor Kitchen', 'outdoor_kitchen'],
      [['drain', 'drainage', 'french drain', 'swale'], 'Drainage', 'drainage'],
      [['step', 'stairs', 'staircase'], 'Steps / Stairs', 'steps_stairs'],
      [['irrigation', 'sprinkler', 'drip'], 'Irrigation Zone', 'irrigation_zone'],
      [['seed', 'overseed'], 'Sod Area', 'sod_area'],
    ];

    for (const [terms, name, elementType] of keywords) {
      if (terms.some(t => desc.includes(t))) {
        // Don't add duplicate element types
        if (!inferred.some(e => e.elementType === elementType)) {
          inferred.push({ name, elementType, lengthFt: null, widthFt: null, areaSqft: null, linearFt: null, heightFt: null, depthIn: null, notes: '' });
        }
      }
    }

    // If description didn't produce anything, fall back to project type presets
    if (inferred.length === 0) {
      const presetKey = data.projectType || '';
      const preset = PROJECT_TYPE_PRESETS[presetKey];
      if (preset) {
        const newElements: WizardElement[] = preset.map(p => ({ ...p, tempId: crypto.randomUUID() }));
        onChange({ elements: [...elements, ...newElements] });
        setSuggestionsApplied(true);
        return;
      }
      return; // nothing to suggest
    }

    const newElements: WizardElement[] = inferred.map(p => ({ ...p, tempId: crypto.randomUUID() }));
    onChange({ elements: [...elements, ...newElements] });
    setSuggestionsApplied(true);
  };

  // Auto-suggest on mount if elements are empty
  useEffect(() => {
    if (elements.length === 0 && !suggestionsApplied && (data.projectType || data.description)) {
      applySuggestions();
    }
  }, []); // only on mount

  // Computed total area across all elements
  const totalArea = useMemo(() => {
    return elements.reduce((sum, el) => sum + (computeArea(el) ?? 0), 0);
  }, [elements]);

  const projectTypeLabel = data.projectType
    ? (({ full_install: 'Full Install', renovation: 'Renovation', hardscape: 'Hardscape', softscape: 'Softscape', drainage: 'Drainage', irrigation: 'Irrigation', maintenance: 'Maintenance', mixed: 'Mixed' } as Record<string, string>)[data.projectType] ?? data.projectType)
    : null;

  const hasSuggestions = !!(data.projectType || data.description);

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
            Suggest elements from job description
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

          // Flag elements that have no contractor-entered dimensions
          const hasDimensions = !!(
            (el.lengthFt && el.widthFt) ||
            el.areaSqft ||
            el.linearFt
          );

          return (
            <div
              key={el.tempId}
              className="rounded-[10px] border p-[16px]"
              style={{
                backgroundColor: 'var(--surface2)',
                borderColor: hasDimensions ? 'var(--border)' : 'var(--status-amber)',
              }}
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

              {/* Missing dimensions warning */}
              {!hasDimensions && (
                <div className="ml-[30px] mb-[8px] flex items-center gap-[6px]">
                  <span className="text-[11px] font-[500]" style={{ color: 'var(--status-amber)' }}>
                    Needs measurements — enter dimensions below for accurate material quantities
                  </span>
                </div>
              )}

              {/* Dimensions + Live Visual */}
              <div className="flex gap-[12px] ml-[30px]">
              {/* Visual preview */}
              <div className="shrink-0 flex items-start pt-[20px]">
                <ElementVisual element={{
                  id: el.tempId, orgId: '', projectId: '', name: el.name,
                  elementType: el.elementType, lengthFt: el.lengthFt, widthFt: el.widthFt,
                  areaSqft: el.areaSqft, linearFt: el.linearFt, heightFt: el.heightFt,
                  depthIn: el.depthIn, computedAreaSqft: area ?? 0,
                  notes: el.notes, sequence: 0, createdAt: '', materials: [],
                } as ProjectElement} size={110} />
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-[10px]">
                {showLengthWidth && (
                  <>
                    <div>
                      <label className={labelClass}>Length (ft)</label>
                      <NumberInput
                        className={inputClass}
                        min={0}
                        step={0.5}
                        placeholder="0"
                        value={el.lengthFt}
                        onChange={(value) => updateElement(el.tempId, { lengthFt: value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Width (ft)</label>
                      <NumberInput
                        className={inputClass}
                        min={0}
                        step={0.5}
                        placeholder="0"
                        value={el.widthFt}
                        onChange={(value) => updateElement(el.tempId, { widthFt: value })}
                      />
                    </div>
                  </>
                )}

                {showLinearFt && (
                  <div>
                    <label className={labelClass}>Linear Ft</label>
                    <NumberInput
                      className={inputClass}
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={el.linearFt}
                      onChange={(value) => updateElement(el.tempId, { linearFt: value })}
                    />
                  </div>
                )}

                {showHeight && (
                  <div>
                    <label className={labelClass}>Height (ft)</label>
                    <NumberInput
                      className={inputClass}
                      min={0}
                      step={0.25}
                      placeholder="0"
                      value={el.heightFt}
                      onChange={(value) => updateElement(el.tempId, { heightFt: value })}
                    />
                  </div>
                )}

                {showDepth && (
                  <div>
                    <label className={labelClass}>Depth (in)</label>
                    <NumberInput
                      className={inputClass}
                      min={0}
                      step={0.5}
                      placeholder="0"
                      value={el.depthIn}
                      onChange={(value) => updateElement(el.tempId, { depthIn: value })}
                    />
                  </div>
                )}

                {showManualArea && (
                  <div>
                    <label className={labelClass}>
                      Area (sqft){el.lengthFt && el.widthFt ? ' override' : ''}
                    </label>
                    <NumberInput
                      className={inputClass}
                      min={0}
                      step={1}
                      placeholder={el.lengthFt && el.widthFt ? String(Math.round(el.lengthFt * el.widthFt)) : '0'}
                      value={el.areaSqft}
                      onChange={(value) => updateElement(el.tempId, { areaSqft: value })}
                    />
                  </div>
                )}

              </div>
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

              {/* Material quantity estimate preview */}
              {area != null && area > 0 && (
                <div className="ml-[30px] mt-[8px] rounded-[6px] px-[10px] py-[6px]" style={{ backgroundColor: 'rgba(45,106,79,0.05)' }}>
                  <span className="text-[10px] font-[600] text-[var(--text-4)] uppercase">Material estimates</span>
                  <div className="flex flex-wrap gap-x-[16px] gap-y-[2px] mt-[2px]">
                    {/* Base gravel (6" min) */}
                    {['patio', 'walkway', 'driveway', 'pool_deck', 'fire_pit'].includes(el.elementType) && (
                      <span className="text-[11px] text-[var(--text-3)]">
                        Base gravel: <strong className="text-[var(--text)]">{((area / 324) * 6).toFixed(1)} cuyd</strong>
                      </span>
                    )}
                    {/* Polymeric sand */}
                    {['patio', 'walkway', 'driveway', 'pool_deck'].includes(el.elementType) && (
                      <span className="text-[11px] text-[var(--text-3)]">
                        Polymeric sand: <strong className="text-[var(--text)]">{Math.ceil(area / 65)} bags</strong>
                      </span>
                    )}
                    {/* Topsoil for garden beds */}
                    {el.elementType === 'garden_bed' && (
                      <span className="text-[11px] text-[var(--text-3)]">
                        Topsoil (3"): <strong className="text-[var(--text)]">{((area / 324) * 3).toFixed(1)} cuyd</strong>
                      </span>
                    )}
                    {/* Mulch for garden beds */}
                    {el.elementType === 'garden_bed' && (
                      <span className="text-[11px] text-[var(--text-3)]">
                        Mulch (2"): <strong className="text-[var(--text)]">{((area / 324) * 2).toFixed(1)} cuyd</strong>
                      </span>
                    )}
                    {/* Sod */}
                    {el.elementType === 'sod_area' && (
                      <span className="text-[11px] text-[var(--text-3)]">
                        Sod: <strong className="text-[var(--text)]">{area.toLocaleString()} sqft</strong>
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--text-4)] italic">estimates only</span>
                  </div>
                </div>
              )}
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
      <div ref={bottomRef} />

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
