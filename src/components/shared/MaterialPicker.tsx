/**
 * MaterialPicker — modal for assigning materials to a project element.
 * Shows catalog filtered by element type, live quantity preview, assign/remove.
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Modal } from '@/components/shared/Modal';
import { useMaterialStore } from '@/stores/materialStore';
import { useOrgStore } from '@/stores/orgStore';
import { useProjectStore } from '@/stores/projectStore';
import { computeElementMaterial } from '@/materials-engine/engine';
import { applyWaste, roundToPurchaseUnit } from '@/materials-engine/unit-conversions';
import { getElementTypesForMaterial } from '@/lib/elements';
import { getCategoryLabel } from '@/lib/categories';
import { normalizeCategory } from '@/lib/categories';
import type { ProjectElement, ProjectElementMaterial, Material } from '@/types';

interface Props {
  element: ProjectElement;
  isOpen: boolean;
  onClose: () => void;
}

export const MaterialPicker: React.FC<Props> = ({ element, isOpen, onClose }) => {
  const { materials: catalog } = useMaterialStore();
  const orgId = useOrgStore((s) => s.org?.id);
  const { addElementMaterial, updateElementMaterial, removeElementMaterial } = useProjectStore();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  // Element-level override UI: which assigned-row's "Advanced" panel is open.
  // Only one open at a time keeps the modal compact.
  const [advancedOpen, setAdvancedOpen] = useState<string | null>(null);
  // X-6: arrow-key navigation through the filtered material list.
  // -1 = no highlight (initial); ArrowDown moves to 0.
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const assignedIds = new Set((element.materials || []).map(m => m.materialId));

  // Filter catalog: show materials whose category maps to this element type, plus search
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();
    return catalog.filter(mat => {
      if (mat.isActive === false) return false;
      // Search filter
      if (searchLower && !mat.name.toLowerCase().includes(searchLower) && !mat.category.toLowerCase().includes(searchLower)) return false;
      // If no search, filter by element type compatibility.
      // F-CW-LIVE-09: same name-keyword fallback as the wizard's auto-
      // link loop, so misc-category materials still get filtered into
      // the right element types.
      if (!searchLower) {
        const targetTypes = getElementTypesForMaterial(normalizeCategory(mat.category), mat.name);
        if (targetTypes.length > 0 && !targetTypes.includes(element.elementType)) return false;
      }
      return true;
    });
  }, [catalog, search, element.elementType]);

  // Preview quantity for a catalog material on this element
  function previewQty(mat: Material): { qty: number; unit: string; cost: number } {
    const mockElMat: ProjectElementMaterial = {
      id: '', orgId: '', elementId: element.id, materialId: mat.id,
      name: mat.name, category: mat.category,
      quantity: 0, unit: mat.purchaseUnit || mat.unit, unitCost: mat.costPerPurchaseUnit || mat.cost,
      depthIn: null, notes: '', createdAt: '',
      computationModel: mat.computationModel,
    };
    const raw = computeElementMaterial(element, mockElMat, mat);
    const waste = mat.defaultWasteFactor ?? 0.05;
    const adjusted = applyWaste(raw, waste);
    const pu = mat.purchaseUnit || mat.unit;
    const purchase = roundToPurchaseUnit(adjusted, pu);
    const cost = purchase * (mat.costPerPurchaseUnit || mat.cost);
    return { qty: purchase, unit: pu, cost };
  }

  async function handleAssign(mat: Material) {
    if (!orgId || adding) return;
    setAdding(mat.id);
    const preview = previewQty(mat);
    await addElementMaterial(element.id, {
      orgId,
      elementId: element.id,
      materialId: mat.id,
      name: mat.name,
      category: normalizeCategory(mat.category),
      quantity: preview.qty,
      unit: preview.unit,
      unitCost: mat.costPerPurchaseUnit || mat.cost,
      depthIn: null,
      notes: '',
      computationModel: mat.computationModel,
    }, orgId);
    setAdding(null);
  }

  async function handleRemove(elMat: ProjectElementMaterial) {
    await removeElementMaterial(element.id, elMat.id);
  }

  // X-6: clamp activeIndex when the filtered list shrinks (e.g. user keeps
  // typing and the previously-highlighted item drops out). Reset to -1 on
  // every search change so a fresh keystroke doesn't carry stale highlight.
  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  // X-6: scroll the highlighted row into view as the user arrows through.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-mat-row="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // X-6: keyboard handler attached to the search input. Lets the contractor
  // type → arrow → enter without ever touching the mouse. Mirrors the
  // AddressInput pattern (F-041) for consistency.
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) =>
          filtered.length === 0 ? -1 : (i + 1) % filtered.length,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) =>
          filtered.length === 0
            ? -1
            : i <= 0
            ? filtered.length - 1
            : i - 1,
        );
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        const mat = filtered[activeIndex];
        if (!mat) return;
        if (assignedIds.has(mat.id)) return;
        e.preventDefault();
        void handleAssign(mat);
      } else if (e.key === 'Escape') {
        // First Esc: clear highlight. Second Esc (no highlight to clear):
        // close the modal. Lets a contractor undo a stray arrow without
        // losing the search state.
        if (activeIndex >= 0) {
          e.preventDefault();
          setActiveIndex(-1);
        } else {
          onClose();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(filtered.length - 1);
      }
    },
    [filtered, activeIndex, assignedIds, onClose],
  );

  const area = element.computedAreaSqft || (element.lengthFt && element.widthFt ? element.lengthFt * element.widthFt : element.areaSqft ?? 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Materials — ${element.name}`} maxWidth="640px">
      <div className="space-y-[12px]">
        {/* Element summary */}
        <div className="text-[12px] text-[var(--text-3)] flex gap-[12px]">
          <span>{element.elementType.replace(/_/g, ' ')}</span>
          {area > 0 && <span>{area.toLocaleString()} sqft</span>}
          {element.linearFt && <span>{element.linearFt} LF</span>}
        </div>

        {/* Currently assigned */}
        {(element.materials || []).length > 0 && (
          <div>
            <div className="text-[10px] font-[600] uppercase text-[var(--text-4)] mb-[6px]">Assigned ({element.materials.length})</div>
            <div className="space-y-[4px]">
              {element.materials.map(m => (
                <AssignedRow
                  key={m.id}
                  element={element}
                  m={m}
                  catalogMat={catalog.find((c) => c.id === m.materialId)}
                  open={advancedOpen === m.id}
                  onToggleAdvanced={() => setAdvancedOpen(advancedOpen === m.id ? null : m.id)}
                  onUpdate={(updates) => updateElementMaterial(element.id, m.id, updates)}
                  onRemove={() => handleRemove(m)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <input
          className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[12px] py-[8px] text-[13px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)]"
          placeholder="Search materials… (↑↓ to navigate, Enter to add)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          autoFocus
          role="combobox"
          aria-expanded={filtered.length > 0}
          aria-controls="material-picker-list"
          aria-activedescendant={activeIndex >= 0 ? `mat-row-${activeIndex}` : undefined}
        />

        {/* Available materials */}
        <div
          ref={listRef}
          id="material-picker-list"
          className="max-h-[300px] overflow-y-auto space-y-[3px]"
          role="listbox"
        >
          {filtered.length === 0 && (
            <div className="text-[12px] text-[var(--text-4)] text-center py-[16px]">No matching materials found</div>
          )}
          {filtered.map((mat, idx) => {
            const isAssigned = assignedIds.has(mat.id);
            const preview = !isAssigned ? previewQty(mat) : null;
            const isActive = idx === activeIndex && !isAssigned;
            return (
              <div key={mat.id}
                id={`mat-row-${idx}`}
                data-mat-row={idx}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIndex(idx)}
                className="flex items-center gap-[8px] rounded-[6px] border px-[10px] py-[8px] text-[12px] transition-colors"
                style={{
                  borderColor: isActive
                    ? 'var(--green-l)'
                    : isAssigned
                    ? 'var(--green)'
                    : 'var(--border)',
                  backgroundColor: isActive
                    ? 'rgba(45,106,79,0.12)'
                    : isAssigned
                    ? 'rgba(45,106,79,0.04)'
                    : 'var(--surface2)',
                  opacity: isAssigned ? 0.6 : 1,
                  outline: isActive ? '1px solid var(--green-l)' : undefined,
                }}
              >
                <span className="px-[5px] py-[1px] rounded-[3px] text-[10px] font-[500] shrink-0" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--green-l)' }}>
                  {getCategoryLabel(mat.category)}
                </span>
                <span className="text-[var(--text)] font-[500] flex-1">{mat.name}</span>
                {preview && preview.qty > 0 && (
                  <span className="text-[var(--text-4)] text-[11px] tabular-nums">{preview.qty} {preview.unit} · ${preview.cost.toFixed(0)}</span>
                )}
                {isAssigned ? (
                  <span className="text-[10px] text-[var(--green-l)]">assigned</span>
                ) : (
                  <button type="button" onClick={() => handleAssign(mat)} disabled={!!adding}
                    className="px-[8px] py-[3px] rounded-[4px] text-[11px] font-[500] cursor-pointer border-none"
                    style={{ backgroundColor: 'var(--green)', color: '#fff', opacity: adding === mat.id ? 0.5 : 1 }}>
                    {adding === mat.id ? '...' : 'Add'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

// ── Assigned row + Advanced overrides panel ──────────────────────────────────
//
// Surfaces the override fields the schema has supported since migration 026
// but the UI never exposed: spacingOverrideInches, manualCount, wallLengthFt,
// wallHeightFt, wasteFactorOverride. Only fields relevant to the material's
// computation model are shown — a paver doesn't need a wall-height field.

interface AssignedRowProps {
  element: ProjectElement;
  m: ProjectElementMaterial;
  /** The original catalog row, if the assigned material is library-linked. */
  catalogMat: Material | undefined;
  open: boolean;
  onToggleAdvanced: () => void;
  onUpdate: (updates: Partial<ProjectElementMaterial>) => Promise<ProjectElementMaterial | null>;
  onRemove: () => Promise<void> | void;
}

const AssignedRow: React.FC<AssignedRowProps> = ({
  element, m, catalogMat, open, onToggleAdvanced, onUpdate, onRemove,
}) => {
  const model = m.computationModel ?? catalogMat?.computationModel ?? '';
  // Local draft state — flushed to the store on blur so we don't write a row
  // for every keystroke. Empty string means "no override" (null).
  const [waste, setWaste] = useState<string>(
    m.wasteFactorOverride != null ? String(m.wasteFactorOverride * 100) : '',
  );
  const [spacing, setSpacing] = useState<string>(
    m.spacingOverrideInches != null ? String(m.spacingOverrideInches) : '',
  );
  const [manualCount, setManualCount] = useState<string>(
    m.manualCount != null ? String(m.manualCount) : '',
  );
  const [wallLen, setWallLen] = useState<string>(
    m.wallLengthFt != null ? String(m.wallLengthFt) : '',
  );
  const [wallH, setWallH] = useState<string>(
    m.wallHeightFt != null ? String(m.wallHeightFt) : '',
  );

  const numOrNull = (s: string): number | null => {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * Save an override field AND recompute the resulting quantity in the same
   * write so the row's displayed quantity updates immediately. The engine
   * runs against a synthetic ProjectElementMaterial that includes the
   * pending override, then we package the recomputed quantity alongside
   * the field change.
   */
  const flush = (field: keyof ProjectElementMaterial, value: number | null) => {
    const updates: Partial<ProjectElementMaterial> = {
      [field]: value,
    } as Partial<ProjectElementMaterial>;

    // Build the override-applied ElMat the engine should evaluate.
    const projection: ProjectElementMaterial = { ...m, ...updates };
    const raw = computeElementMaterial(element, projection, catalogMat);
    const wasteFactor =
      projection.wasteFactorOverride ??
      catalogMat?.defaultWasteFactor ??
      catalogMat?.reserveOverride ??
      0.05;
    const adjusted = applyWaste(raw, wasteFactor);
    const purchaseUnit = catalogMat?.purchaseUnit ?? m.unit;
    const quantity = roundToPurchaseUnit(adjusted, purchaseUnit);

    // Only include quantity in the write if the engine produced a real number;
    // otherwise the row is ad-hoc with no compute model and we shouldn't
    // overwrite the contractor's manually-typed quantity.
    if (Number.isFinite(quantity) && quantity > 0) {
      updates.quantity = quantity;
    }

    onUpdate(updates);
  };

  const showSpacing = model === 'POINT_SPACING';
  const showWall = model === 'LINEAR_DEPTH';
  // Waste factor + computation model are universal.

  // Category-aware hint copy. Defaults come from contractor estimating
  // references — reasonable starting points the contractor can override.
  const cat = m.category.toLowerCase();
  const wasteHint =
    cat === 'paver' || cat === 'stone' || cat === 'tile' || cat === 'brick'
      ? 'typical 5-10%'
      : cat === 'plant' || cat === 'shrub' || cat === 'tree'
      ? 'typical 10-15% (replacement allowance)'
      : cat === 'sod' || cat === 'seed'
      ? 'typical 5-8%'
      : cat === 'mulch' || cat === 'gravel' || cat === 'sand' || cat === 'soil'
      ? 'typical 5%'
      : 'typical 5-10%';
  const spacingHint =
    cat === 'shrub'
      ? 'typical 24-36"'
      : cat === 'tree'
      ? 'typical 96-240" (8-20 ft)'
      : cat === 'plant'
      ? 'typical 12-18"'
      : cat === 'lighting'
      ? 'typical 60-96"'
      : '';

  return (
    <div className="rounded-[6px] border" style={{ borderColor: 'var(--green)', backgroundColor: 'rgba(45,106,79,0.06)' }}>
      <div className="flex items-center gap-[6px] px-[10px] py-[6px] text-[12px]">
        <span className="text-[var(--green-l)]">✓</span>
        <span className="text-[var(--text)] font-[500] flex-1">{m.name}</span>
        <span className="text-[var(--text-3)]">{m.quantity} {m.unit}</span>
        <span className="text-[var(--text-4)]">${(m.quantity * m.unitCost).toFixed(0)}</span>
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="text-[10px] text-[var(--text-3)] hover:text-[var(--text)] bg-transparent border border-[var(--border)] rounded-[4px] px-[6px] py-[2px] cursor-pointer"
          aria-expanded={open}
        >
          {open ? 'Hide' : 'Adjust'}
        </button>
        <button
          type="button"
          onClick={() => onRemove()}
          className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer"
          aria-label="Remove material"
        >
          ✕
        </button>
      </div>

      {open && (
        <div
          className="px-[10px] pb-[10px] pt-[2px] grid gap-[8px] text-[11px]"
          style={{ gridTemplateColumns: '1fr 1fr', borderTop: '1px solid rgba(45,106,79,0.2)' }}
        >
          {/* Waste factor — universal */}
          <label className="flex flex-col gap-[2px]">
            <span className="uppercase text-[10px] text-[var(--text-4)] tracking-wide">
              Waste % override
              <span className="ml-[4px] normal-case lowercase opacity-70">· {wasteHint}</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              max="100"
              placeholder="default"
              value={waste}
              onChange={(e) => setWaste(e.target.value)}
              onBlur={() => {
                const pct = numOrNull(waste);
                flush('wasteFactorOverride', pct == null ? null : pct / 100);
              }}
              className="rounded-[4px] border bg-transparent px-[6px] py-[3px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          {/* POINT_SPACING fields */}
          {showSpacing && (
            <>
              <label className="flex flex-col gap-[2px]">
                <span className="uppercase text-[10px] text-[var(--text-4)] tracking-wide">
                  Spacing (in)
                  {spacingHint && (
                    <span className="ml-[4px] normal-case lowercase opacity-70">· {spacingHint}</span>
                  )}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  placeholder="default"
                  value={spacing}
                  onChange={(e) => setSpacing(e.target.value)}
                  onBlur={() => flush('spacingOverrideInches', numOrNull(spacing))}
                  className="rounded-[4px] border bg-transparent px-[6px] py-[3px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                  style={{ borderColor: 'var(--border)' }}
                />
              </label>
              <label className="flex flex-col gap-[2px]">
                <span className="uppercase text-[10px] text-[var(--text-4)] tracking-wide">
                  Manual count
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="auto"
                  value={manualCount}
                  onChange={(e) => setManualCount(e.target.value)}
                  onBlur={() => flush('manualCount', numOrNull(manualCount))}
                  className="rounded-[4px] border bg-transparent px-[6px] py-[3px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                  style={{ borderColor: 'var(--border)' }}
                />
              </label>
            </>
          )}

          {/* LINEAR_DEPTH fields (retaining wall) */}
          {showWall && (
            <>
              <label className="flex flex-col gap-[2px]">
                <span className="uppercase text-[10px] text-[var(--text-4)] tracking-wide">
                  Wall length (ft)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="from element"
                  value={wallLen}
                  onChange={(e) => setWallLen(e.target.value)}
                  onBlur={() => flush('wallLengthFt', numOrNull(wallLen))}
                  className="rounded-[4px] border bg-transparent px-[6px] py-[3px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                  style={{ borderColor: 'var(--border)' }}
                />
              </label>
              <label className="flex flex-col gap-[2px]">
                <span className="uppercase text-[10px] text-[var(--text-4)] tracking-wide">
                  Wall height (ft)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  placeholder="2"
                  value={wallH}
                  onChange={(e) => setWallH(e.target.value)}
                  onBlur={() => flush('wallHeightFt', numOrNull(wallH))}
                  className="rounded-[4px] border bg-transparent px-[6px] py-[3px] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                  style={{ borderColor: 'var(--border)' }}
                />
              </label>
            </>
          )}

          <p
            className="col-span-2 text-[10px] text-[var(--text-4)] leading-[1.4]"
            style={{ marginTop: 4 }}
          >
            Leave blank to use the catalog default. Quantity recalculates on the
            next manifest run.
          </p>
        </div>
      )}
    </div>
  );
};
