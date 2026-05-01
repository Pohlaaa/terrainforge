/**
 * Step 2 — Design (3D-in-Wizard, Phase A)
 *
 * Split-screen design surface that replaces the legacy table-based
 * measurements step. Left side is a 2D/3D canvas (PlanView2D/PlanView3D)
 * showing the AI-pre-placed elements on the property's satellite map.
 * Right side is a per-element sidebar with dimension inputs and a
 * material picker scoped to the selected element's type. Selecting an
 * element on the canvas focuses it in the sidebar; editing a dimension
 * in the sidebar updates the canvas instantly. The visual scaffolding
 * makes AI suggestions falsifiable (you can SEE the patio overhanging
 * the deck) and the sidebar keeps tabular precision for dimensions
 * that drag handles can't nail (a 6-inch edging strip).
 *
 * Materials assignment compresses what used to be a separate Step 4
 * Materials screen into per-element picking. Acceptance still routes to
 * the wizard's project-level `materialSelections` array; create-time
 * auto-link logic in ProjectWizard.handleCreate() handles the junction
 * rows by element-type/category mapping (unchanged from the legacy
 * flow).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ELEMENT_TYPE_LABELS, getElementTypesForMaterial, ELEMENT_PRESETS, applyElementPreset } from '@/lib/elements';
import { fallbackDimensions, placementBucket, applyDimensionEditToGeometry } from '@/lib/planLayout';
import { normalizeCategory, getCategoryLabel } from '@/lib/categories';
import { useMaterialStore } from '@/stores/materialStore';
import { NumberInput } from '@/components/ui/NumberInput';
import PlanView2D from '@/components/plan/PlanView2D';
import PlanView3D from '@/components/plan/PlanView3D';
import WizardElementEditSheet from '@/components/wizard/WizardElementEditSheet';
import { inferMaterialsForElement } from '@/services/aiRecommendations';
import { scaleAIQuantityForDimensions } from '@/lib/scaleAIQuantity';
import type { WizardData, WizardElement, WizardMaterial } from '@/pages/ProjectWizard';
import type { AIMaterialRecommendation, AIRecommendationSet, ElementGeometry, ElementType, Material, ProjectElement } from '@/types';

// 3D-in-Wizard Phase B: per-element AI material cache, keyed by tempId.
// We invalidate (and re-prompt) when a contractor changes the element's
// type — different types need different material sets. Dimension tweaks
// stay cached because Claude's quantity estimate is just one of many
// downstream inputs anyway (the engine will recompute final qty at create
// time using the latest dimensions).
//
// jbluhm-V6 fix: when the AI returns its estimatedQuantity, we capture
// the dimensions at fetch time as `baselineArea` / `baselineLinear`.
// Live-displayed qty then scales linearly with the contractor's CURRENT
// dimensions ("I changed 100sqft → 500sqft, mulch went 1yd → 5yd"). No
// new API call needed; this matches contractor mental model and gives
// real-time feedback while editing dimensions.
type PerElementCacheEntry =
  | { status: 'loading'; cacheKey: string }
  | {
      status: 'ready';
      cacheKey: string;
      recs: AIMaterialRecommendation[];
      baselineArea: number;
      baselineLinear: number;
    }
  | { status: 'failed'; cacheKey: string };
type PerElementCache = Record<string, PerElementCacheEntry | undefined>;

// scaleAIQuantityForDimensions lives in src/lib/scaleAIQuantity.ts —
// shared so other surfaces (Step 3 review, Overview tab) can apply
// the same live-scaling rule without duplicating the unit-classifier
// table.

interface Props {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  recommendations: AIRecommendationSet | null;
  aiLoading: boolean;
  /**
   * Sprint AI-Place wiring. When `placementLoading` is true, the
   * vision call is in flight — render skeleton hint. When the call
   * completes with success, `placementCount` is the number of
   * elements that received AI-grounded coords + a banner appears
   * with the count. `placementImageryPoor` flips when Claude
   * self-rated the satellite as too poor to read; UI surfaces a
   * "drag to position" hint instead of the success banner.
   * `placementRationales[tempId]` maps each element tempId to the
   * 1-sentence rationale Claude returned for the placement.
   */
  placementLoading?: boolean;
  placementCount?: number;
  placementImageryPoor?: boolean;
  placementRationales?: Record<string, string>;
  /**
   * Sprint AI-Place: re-run the vision placement call against the
   * current address + element list. Bound to the "Recompute" button on
   * the banner so contractors can resync after manual edits or after
   * the initial pass missed.
   */
  onRecomputePlacements?: () => void;
  materialAccepted: Set<string>;
  materialDismissed: Set<string>;
  onAcceptMaterial: (id: string) => void;
  onDismissMaterial: (id: string) => void;
}

const inputClass =
  'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-[8px] px-[10px] py-[7px] text-[12px] text-[var(--text)] placeholder:text-[var(--text-4)] focus:outline-none focus:border-[var(--green)] transition-colors';
const labelClass = 'block text-[11px] font-[600] text-[var(--text-2)] mb-[4px]';

const ELEMENT_TYPE_OPTIONS = Object.entries(ELEMENT_TYPE_LABELS) as [ElementType, string][];

type DimensionConfig = {
  lengthWidth?: boolean;
  manualArea?: boolean;
  linearFt?: boolean;
  heightFt?: boolean;
  depthIn?: boolean;
  allFields?: boolean;
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

function computeArea(el: WizardElement): number {
  // Migration 033: circles compute area from radius. Falls through to the
  // rectangle paths below when shape isn't 'circle' or radius is missing.
  if (el.shape === 'circle' && el.radiusFt && el.radiusFt > 0) {
    return Math.round(Math.PI * el.radiusFt * el.radiusFt * 100) / 100;
  }
  if (el.areaSqft != null && el.areaSqft > 0) return el.areaSqft;
  if (el.lengthFt && el.widthFt) return Math.round(el.lengthFt * el.widthFt * 100) / 100;
  if (el.linearFt && el.heightFt) return Math.round(el.linearFt * el.heightFt * 100) / 100;
  return 0;
}

/**
 * Adapt a WizardElement (no DB ID, transient) to the ProjectElement shape
 * that PlanView2D/3D expects. The canvas only reads `id`, `name`,
 * `elementType`, dimensions, and `geometry`. Other fields are stubbed.
 */
function toProjectElement(el: WizardElement): ProjectElement {
  return {
    id: el.tempId,
    orgId: '',
    projectId: '',
    name: el.name || ELEMENT_TYPE_LABELS[el.elementType],
    elementType: el.elementType,
    shape: el.shape ?? 'rectangle',
    radiusFt: el.radiusFt ?? null,
    lengthFt: el.lengthFt,
    widthFt: el.widthFt,
    areaSqft: el.areaSqft,
    linearFt: el.linearFt,
    heightFt: el.heightFt,
    depthIn: el.depthIn,
    computedAreaSqft: computeArea(el),
    notes: el.notes,
    sequence: 0,
    createdAt: '',
    materials: [],
    geometry: el.geometry ?? null,
  };
}

/**
 * Synthesizes geometry for an element when it has none yet. Mirrors the
 * Step 1→2 AI seeding logic so manually-added elements also drop into a
 * sensible slot rather than landing at (0, 0).
 */
function seedGeometry(el: WizardElement, stackIndex: number): ElementGeometry {
  const dims = fallbackDimensions(toProjectElement(el));
  const pos = placementBucket('unknown', dims, stackIndex);
  return {
    position: pos,
    rotation: 0,
    shape: { kind: 'rectangle', width: dims.width, height: dims.height },
  };
}

export const WizardStepMeasurements: React.FC<Props> = ({
  data,
  onChange,
  recommendations,
  aiLoading,
  placementLoading = false,
  placementCount = 0,
  placementImageryPoor = false,
  placementRationales = {},
  onRecomputePlacements,
  materialAccepted,
  materialDismissed,
  onAcceptMaterial,
  onDismissMaterial,
}) => {
  const elements = data.elements;
  const [planViewMode, setPlanViewMode] = useState<'2d' | '3d'>('3d');
  // jbluhm-V6: contractors complained about the auto-generated
  // "highlighted area" cluttering the canvas. Toggle hides the
  // buildable polygon + obstacle decals while keeping placements
  // intact. Default ON (show overlay) so first-time users see the
  // AI's reasoning; persisted to localStorage so the contractor's
  // preference sticks across wizard sessions.
  const [showAIOverlay, setShowAIOverlay] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const v = localStorage.getItem('tf-wizard-show-ai-overlay');
      return v === null ? true : v === '1';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('tf-wizard-show-ai-overlay', showAIOverlay ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [showAIOverlay]);
  // Batch 24: when set, the canvas enters click-to-draw polygon mode for
  // this element. Forces the view to 2D (3D extrusion can't host the
  // click-to-draw flow). Cleared by PlanView2D via onDrawingExit when
  // the contractor commits or cancels.
  const [drawingPolygonForTempId, setDrawingPolygonForTempId] = useState<string | null>(null);
  useEffect(() => {
    if (drawingPolygonForTempId) setPlanViewMode('2d');
  }, [drawingPolygonForTempId]);
  const [selectedTempId, setSelectedTempId] = useState<string | null>(
    elements[0]?.tempId ?? null,
  );
  // Keep selection valid as the array changes (e.g. user removes the focused element).
  useEffect(() => {
    if (selectedTempId && !elements.some((e) => e.tempId === selectedTempId)) {
      setSelectedTempId(elements[0]?.tempId ?? null);
    } else if (!selectedTempId && elements.length > 0) {
      setSelectedTempId(elements[0].tempId);
    }
  }, [elements, selectedTempId]);

  const selected = useMemo(
    () => elements.find((e) => e.tempId === selectedTempId) ?? null,
    [elements, selectedTempId],
  );

  // ── Phase B: per-element AI material suggestions cache ─────────────────
  // Fires inferMaterialsForElement() the first time the contractor selects an
  // element with a given type, caches by tempId. Type changes invalidate
  // (cacheKey embeds elementType). In-flight tracking via inFlightRef keeps
  // a fast double-click from spawning duplicate calls.
  const [perElementMaterials, setPerElementMaterials] = useState<PerElementCache>({});
  const orgCatalog = useMaterialStore((s) => s.materials);
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!selected) return;
    // F-PHB-03: cache by element type only. Renaming doesn't change which
    // material categories apply, so re-prompting on rename burns API
    // budget for no gain. Type changes still invalidate (different
    // category set entirely).
    const cacheKey = selected.elementType;
    const existing = perElementMaterials[selected.tempId];
    if (existing && existing.cacheKey === cacheKey) return; // already cached for this type
    const inFlightKey = `${selected.tempId}::${cacheKey}`;
    if (inFlightRef.current.has(inFlightKey)) return; // call already in flight

    inFlightRef.current.add(inFlightKey);
    setPerElementMaterials((prev) => ({ ...prev, [selected.tempId]: { status: 'loading', cacheKey } }));

    // Capture dimensions at fetch time so the displayed qty can be
    // proportionally scaled when the contractor edits dimensions
    // afterwards (jbluhm-V6 fix). Falls to lengthFt × widthFt when
    // areaSqft isn't explicitly set.
    const baselineArea =
      selected.areaSqft ??
      (selected.lengthFt && selected.widthFt
        ? selected.lengthFt * selected.widthFt
        : 0);
    const baselineLinear = selected.linearFt ?? 0;

    inferMaterialsForElement(
      {
        name: selected.name,
        elementType: selected.elementType,
        lengthFt: selected.lengthFt,
        widthFt: selected.widthFt,
        areaSqft: selected.areaSqft,
        linearFt: selected.linearFt,
        heightFt: selected.heightFt,
        depthIn: selected.depthIn,
      },
      orgCatalog,
    )
      .then((recs) => {
        setPerElementMaterials((prev) => ({
          ...prev,
          [selected.tempId]: recs.length > 0
            ? { status: 'ready', cacheKey, recs, baselineArea, baselineLinear }
            : { status: 'failed', cacheKey },
        }));
      })
      .catch(() => {
        setPerElementMaterials((prev) => ({ ...prev, [selected.tempId]: { status: 'failed', cacheKey } }));
      })
      .finally(() => {
        inFlightRef.current.delete(inFlightKey);
      });
  // Intentionally only depend on selection identity + type, NOT on
  // dimensions or name. Dimension tweaks + renames shouldn't burn a
  // fresh API call (F-PHB-03).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.tempId, selected?.elementType, orgCatalog]);

  const perElementEntry = selected ? perElementMaterials[selected.tempId] : undefined;

  // ── Element CRUD on wizard data ─────────────────────────────────────────
  // F-PLAC-04: dimension edits via the sidebar / sheet propagate to
  // geometry.shape via applyDimensionEditToGeometry — re-anchored at
  // the visual center so resizing doesn't make the element drift SE.
  // Skipped when the update already carries a geometry (canvas drag
  // owns geometry in that case).
  const updateElement = (tempId: string, updates: Partial<WizardElement>) => {
    onChange({
      elements: elements.map((el) => {
        if (el.tempId !== tempId) return el;
        const merged: WizardElement = { ...el, ...updates };
        if (!('geometry' in updates)) {
          const recentered = applyDimensionEditToGeometry(
            el.geometry,
            { lengthFt: el.lengthFt, widthFt: el.widthFt, linearFt: el.linearFt, radiusFt: el.radiusFt },
            updates,
          );
          if (recentered) merged.geometry = recentered;
        }
        return merged;
      }),
    });
  };

  const addElement = (type: ElementType = 'patio') => {
    const tempId = crypto.randomUUID();
    const stackIdx = elements.length;
    const stub: WizardElement = {
      tempId,
      name: ELEMENT_TYPE_LABELS[type],
      elementType: type,
      lengthFt: null,
      widthFt: null,
      areaSqft: null,
      linearFt: null,
      heightFt: null,
      depthIn: null,
      notes: '',
    };
    stub.geometry = seedGeometry(stub, stackIdx);
    onChange({ elements: [...elements, stub] });
    setSelectedTempId(tempId);
  };

  /**
   * Batch 27: Add a new polygon element AND immediately drop the
   * contractor into draw mode for it. The new element is type 'patio'
   * by default (most common polygon use-case); the contractor can
   * change the type after the polygon is drawn. Seeds a 4-vertex
   * placeholder so the click-to-draw exit path always has a valid
   * starting geometry to commit against.
   */
  const addPolygonElement = (type: ElementType = 'patio') => {
    const tempId = crypto.randomUUID();
    const stackIdx = elements.length;
    // Seed with a 10×10 polygon at (0,0) — 4 vertices that form a valid
    // polygon for the engine to work against immediately. The first
    // canvas click in draw mode will replace these once committed.
    const seedPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const dims = fallbackDimensions({
      ...({} as ProjectElement),
      lengthFt: 10,
      widthFt: 10,
      computedAreaSqft: 100,
    });
    const pos = placementBucket('unknown', dims, stackIdx);
    const stub: WizardElement = {
      tempId,
      name: ELEMENT_TYPE_LABELS[type],
      elementType: type,
      shape: 'polygon',
      radiusFt: null,
      lengthFt: null,
      widthFt: null,
      areaSqft: null,
      linearFt: null,
      heightFt: null,
      depthIn: null,
      notes: '',
      geometry: {
        position: pos,
        rotation: 0,
        shape: { kind: 'polygon', points: seedPoints },
      },
    };
    onChange({ elements: [...elements, stub] });
    setSelectedTempId(tempId);
    // Defer entering draw mode by a tick so the new element renders
    // first; otherwise the canvas's drawingPolygonForElementId points
    // at an element that hasn't yet appeared in `laid`.
    setTimeout(() => setDrawingPolygonForTempId(tempId), 0);
  };

  const removeElement = (tempId: string) => {
    onChange({ elements: elements.filter((el) => el.tempId !== tempId) });
  };

  /**
   * Duplicate the selected element with an offset position so the copy
   * doesn't sit on top of the original. Returns the new tempId so the
   * caller can move selection to the duplicate (better feel than
   * leaving the contractor to click into it).
   */
  const duplicateElement = useCallback((tempId: string): string | null => {
    const source = elements.find((e) => e.tempId === tempId);
    if (!source) return null;
    const newTempId = crypto.randomUUID();
    // Offset the copy by 4 ft in plan space so it's visible alongside
    // the original on the canvas.
    const sourceGeom = source.geometry;
    const newGeom: ElementGeometry | null = sourceGeom
      ? {
          ...sourceGeom,
          position: {
            x: sourceGeom.position.x + 4,
            y: sourceGeom.position.y + 4,
          },
        }
      : null;
    const copy: WizardElement = {
      ...source,
      tempId: newTempId,
      // Append a "(copy)" suffix when the contractor named it, so they
      // can tell the duplicate apart in the sidebar list.
      name: source.name ? `${source.name} (copy)` : source.name,
      geometry: newGeom,
    };
    onChange({ elements: [...elements, copy] });
    return newTempId;
  }, [elements, onChange]);

  // ── Cmd-D / Cmd-C+V keyboard handler for the wizard step ─────────────
  // Cmd-D = duplicate selected (shorter, single-keystroke).
  // Cmd-C copies into a ref; Cmd-V pastes from the ref. Both skip when
  // focus is on a text input so the browser's native copy/paste keeps
  // working in the dimension fields and notes textarea.
  const clipboardRef = useRef<WizardElement | null>(null);
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable === true;
      if (isEditable) return;

      // jbluhm-feedback: Delete / Backspace removes the selected
      // element. Pre-fix, the only way to delete was the small ✕
      // button in the sidebar, which contractors weren't finding.
      // Skipped inside text inputs so typing's native behavior
      // stays unchanged.
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTempId) {
        e.preventDefault();
        const idx = elements.findIndex((el) => el.tempId === selectedTempId);
        removeElement(selectedTempId);
        // Move selection to the next-best element so the contractor
        // can keep working without re-clicking. Falls to null when the
        // list is now empty.
        const remaining = elements.filter((el) => el.tempId !== selectedTempId);
        if (remaining.length === 0) {
          setSelectedTempId(null);
        } else {
          const nextIdx = Math.min(idx, remaining.length - 1);
          setSelectedTempId(remaining[nextIdx].tempId);
        }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === 'd' && !e.shiftKey) {
        if (!selectedTempId) return;
        e.preventDefault();
        const newId = duplicateElement(selectedTempId);
        if (newId) setSelectedTempId(newId);
      } else if (key === 'c' && !e.shiftKey && selectedTempId) {
        const src = elements.find((el) => el.tempId === selectedTempId);
        if (src) {
          e.preventDefault();
          clipboardRef.current = src;
        }
      } else if (key === 'v' && !e.shiftKey && clipboardRef.current) {
        e.preventDefault();
        const src = clipboardRef.current;
        // Paste even if the original element has been deleted in the
        // meantime — the clipboard is independent of the live list.
        const newTempId = crypto.randomUUID();
        const sourceGeom = src.geometry;
        const newGeom: ElementGeometry | null = sourceGeom
          ? {
              ...sourceGeom,
              position: {
                x: sourceGeom.position.x + 4,
                y: sourceGeom.position.y + 4,
              },
            }
          : null;
        const copy: WizardElement = {
          ...src,
          tempId: newTempId,
          name: src.name ? `${src.name} (paste)` : src.name,
          geometry: newGeom,
        };
        onChange({ elements: [...elements, copy] });
        setSelectedTempId(newTempId);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedTempId, elements, duplicateElement, onChange]);

  // ── Geometry callback from PlanView2D/3D ────────────────────────────────
  const handleElementGeometryChange = (id: string, geometry: ElementGeometry) => {
    // The canvas may also have changed the rectangle dimensions (resize
    // gizmo). When that happens, mirror the new dimensions back to the
    // wizard element's dimension fields so the sidebar inputs stay in
    // sync. We only mirror length/width for elements whose
    // DimensionConfig actually exposes those fields — for linear-only
    // elements (edging, fence, drainage), we update linearFt instead.
    const target = elements.find((e) => e.tempId === id);
    if (!target) return;
    const updates: Partial<WizardElement> = { geometry };
    if (geometry.shape.kind === 'rectangle') {
      const cfg = DIMENSION_CONFIG[target.elementType];
      if (cfg.lengthWidth || cfg.allFields) {
        updates.lengthFt = geometry.shape.width;
        updates.widthFt = geometry.shape.height;
        // Drop the manual area override so length×width takes precedence again.
        if (target.areaSqft != null && target.lengthFt && target.widthFt) {
          updates.areaSqft = null;
        }
      } else if (cfg.linearFt) {
        // Treat the longer side as the linear run.
        updates.linearFt = Math.max(geometry.shape.width, geometry.shape.height);
      }
    } else if (geometry.shape.kind === 'circle') {
      // Circle resize from the canvas → mirror radius back to the sidebar.
      updates.shape = 'circle';
      updates.radiusFt = geometry.shape.radius;
      updates.lengthFt = null;
      updates.widthFt = null;
    } else if (geometry.shape.kind === 'polygon') {
      // Polygon edited from the canvas → mark the element as polygon-shaped.
      // Length/width/radius all become irrelevant for area math.
      updates.shape = 'polygon';
      updates.lengthFt = null;
      updates.widthFt = null;
      updates.radiusFt = null;
    }
    updateElement(id, updates);
  };

  // ── Adapt for canvas + ensure all elements have geometry ───────────────
  // The canvas falls back to autoLayout when geometry is null, but the
  // sidebar drag-edit only round-trips elements that have geometry. Seed
  // any missing geometry on the fly so newly-added elements click-edit.
  const elementsForCanvas = useMemo(() => {
    return elements.map((el, i) => {
      const proj = toProjectElement(el);
      if (!proj.geometry) proj.geometry = seedGeometry(el, i);
      return proj;
    });
  }, [elements]);

  // ── Property satellite backdrop ─────────────────────────────────────────
  const backdrop =
    data.lat != null && data.lng != null ? { lat: data.lat, lng: data.lng } : null;

  const totalArea = useMemo(
    () => elements.reduce((sum, el) => sum + computeArea(el), 0),
    [elements],
  );

  return (
    <div className="space-y-[16px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-[12px]">
        <div>
          <h3 className="text-[16px] font-[600] text-[var(--text)] mb-[2px]">Design</h3>
          <p className="text-[12px] text-[var(--text-4)]">
            AI placed elements on your property map. Drag to reposition, resize from the
            corners, or fine-tune dimensions in the sidebar. Materials attach per element.
          </p>
        </div>
        {aiLoading && elements.length === 0 && (
          <span className="text-[11px] text-[var(--text-4)] shrink-0 flex items-center gap-[6px]">
            <span className="inline-block w-[8px] h-[8px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--green)' }} />
            AI is sketching elements…
          </span>
        )}
      </div>

      {/* Sprint AI-Place: vision-grounded placement status banner.
          Three states:
          - placementLoading + we have elements → "Reading the satellite…"
          - placementImageryPoor → soft yellow "Image too unclear — drag to position"
          - placementCount > 0 → green success "AI placed N elements on your property"
          Hidden once the contractor starts dragging (would be noise). */}
      {elements.length > 0 && placementLoading && (
        <div
          className="rounded-[8px] px-[12px] py-[8px] text-[11.5px] flex items-center gap-[8px]"
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text-3)',
          }}
          role="status"
        >
          <span
            className="inline-block w-[8px] h-[8px] rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--green)' }}
          />
          AI is reading the satellite to place each element on real ground…
        </div>
      )}
      {elements.length > 0 && !placementLoading && placementImageryPoor && (
        <div
          className="rounded-[8px] px-[12px] py-[8px] text-[11.5px] flex items-center justify-between gap-[8px]"
          style={{
            background: 'rgba(234,179,8,0.10)',
            border: '1px solid rgba(234,179,8,0.30)',
            color: 'var(--text-2)',
          }}
          role="status"
        >
          <span>
            Satellite image was too unclear to place elements automatically. Drag each element on the canvas to position it.
          </span>
          {onRecomputePlacements && (
            <button
              type="button"
              onClick={onRecomputePlacements}
              className="text-[11px] font-[600] cursor-pointer border-none bg-transparent shrink-0 hover:underline"
              style={{ color: 'var(--text-2)' }}
              aria-label="Re-run AI placement"
            >
              Try again ↻
            </button>
          )}
        </div>
      )}
      {elements.length > 0 &&
        !placementLoading &&
        !placementImageryPoor &&
        placementCount > 0 && (
          <div
            className="rounded-[8px] px-[12px] py-[8px] text-[11.5px] flex items-center justify-between gap-[8px]"
            style={{
              background: 'rgba(16,185,129,0.10)',
              border: '1px solid rgba(16,185,129,0.30)',
              color: 'var(--text-2)',
            }}
            role="status"
          >
            <span className="flex items-center gap-[8px]">
              <span
                className="inline-block w-[8px] h-[8px] rounded-full"
                style={{ backgroundColor: 'var(--green)' }}
              />
              AI placed {placementCount} element{placementCount === 1 ? '' : 's'} on real
              ground. Drag any to reposition.
            </span>
            <div className="flex items-center gap-[10px] shrink-0">
              <button
                type="button"
                onClick={() => setShowAIOverlay((v) => !v)}
                className="text-[11px] cursor-pointer border-none bg-transparent hover:underline"
                style={{ color: 'var(--text-3)' }}
                aria-pressed={showAIOverlay}
                title={
                  showAIOverlay
                    ? 'Hide the AI buildable + obstacle overlay on the canvas'
                    : 'Show the AI buildable + obstacle overlay on the canvas'
                }
              >
                {showAIOverlay ? 'Hide overlay' : 'Show overlay'}
              </button>
              {onRecomputePlacements && (
                <button
                  type="button"
                  onClick={onRecomputePlacements}
                  className="text-[11px] font-[600] cursor-pointer border-none bg-transparent hover:underline"
                  style={{ color: 'var(--green-l)' }}
                  aria-label="Re-run AI placement against current elements"
                  title="Re-run AI placement after editing the address or adding/removing elements"
                >
                  Recompute ↻
                </button>
              )}
            </div>
          </div>
        )}

      {/* Empty state — pre-AI or AI failed */}
      {elements.length === 0 && !aiLoading && (
        <div className="rounded-[10px] border-dashed border-2 px-[16px] py-[24px] text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[12px] text-[var(--text-3)] mb-[8px]">
            No elements yet. Add one to start designing.
          </p>
          <button
            type="button"
            onClick={() => addElement('patio')}
            className="px-[12px] py-[6px] rounded-[6px] text-[12px] font-[500] cursor-pointer border-none"
            style={{ backgroundColor: 'var(--green)', color: '#fff' }}
          >
            + Add element
          </button>
        </div>
      )}

      {/* Canvas + sidebar split */}
      {elements.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-[16px]">
          {/* Canvas + thumbnail strip */}
          <div className="space-y-[10px]">
            {/* Mode toggle */}
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-[8px] border" style={{ borderColor: 'var(--border)' }}>
                {(['2d', '3d'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPlanViewMode(m)}
                    className="px-[14px] py-[5px] text-[11px] font-[600] uppercase cursor-pointer border-none"
                    style={{
                      backgroundColor: planViewMode === m ? 'var(--green)' : 'transparent',
                      color: planViewMode === m ? '#fff' : 'var(--text-3)',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-[var(--text-4)]">
                {selected
                  ? `Editing: ${selected.name || ELEMENT_TYPE_LABELS[selected.elementType]}`
                  : 'Click an element to select'}
              </span>
            </div>

            {/* Canvas */}
            <div onMouseDown={() => { /* canvas-area click is handled inside views */ }}>
              {planViewMode === '2d' ? (
                <PlanView2D
                  elements={elementsForCanvas}
                  height={420}
                  labelMode="full"
                  backdrop={backdrop}
                  editable
                  onElementClick={(el) => setSelectedTempId(el.id)}
                  onElementGeometryChange={handleElementGeometryChange}
                  drawingPolygonForElementId={drawingPolygonForTempId}
                  onDrawingExit={() => setDrawingPolygonForTempId(null)}
                  buildableArea={showAIOverlay ? data.buildableArea : null}
                  obstacles={showAIOverlay ? data.obstacles : []}
                />
              ) : (
                <PlanView3D
                  elements={elementsForCanvas}
                  height={420}
                  backdrop={backdrop}
                  editable
                  onElementGeometryChange={handleElementGeometryChange}
                  buildableArea={showAIOverlay ? data.buildableArea : null}
                  obstacles={showAIOverlay ? data.obstacles : []}
                />
              )}
            </div>

            {/* Thumbnail strip — quick access to select */}
            <div className="flex flex-wrap gap-[6px]">
              {elements.map((el) => {
                const isSelected = el.tempId === selectedTempId;
                const area = computeArea(el);
                return (
                  // jbluhm-feedback: per-thumbnail trash icon so contractors
                  // can remove an element without selecting it first or
                  // hunting for the sidebar ✕ button. Stops propagation so
                  // clicking trash doesn't also select the chip.
                  <div
                    key={el.tempId}
                    className="relative inline-flex group"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTempId(el.tempId)}
                      className="rounded-[6px] border pl-[10px] pr-[22px] py-[5px] text-[11px] cursor-pointer transition-colors"
                      style={{
                        borderColor: isSelected ? 'var(--green)' : 'var(--border)',
                        backgroundColor: isSelected ? 'rgba(45,106,79,0.08)' : 'var(--surface2)',
                        color: 'var(--text)',
                      }}
                    >
                      <span className="font-[500]">{el.name || ELEMENT_TYPE_LABELS[el.elementType]}</span>
                      {area > 0 && (
                        <span className="text-[var(--text-4)] ml-[6px]">{area} sqft</span>
                      )}
                      {!area && el.linearFt && (
                        <span className="text-[var(--text-4)] ml-[6px]">{el.linearFt} LF</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = elements.findIndex((x) => x.tempId === el.tempId);
                        removeElement(el.tempId);
                        const remaining = elements.filter((x) => x.tempId !== el.tempId);
                        if (remaining.length === 0) {
                          setSelectedTempId(null);
                        } else if (selectedTempId === el.tempId) {
                          const nextIdx = Math.min(idx, remaining.length - 1);
                          setSelectedTempId(remaining[nextIdx].tempId);
                        }
                      }}
                      aria-label={`Remove ${el.name || ELEMENT_TYPE_LABELS[el.elementType]}`}
                      title={`Remove (Delete)`}
                      className="absolute right-[4px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-full flex items-center justify-center cursor-pointer border-none bg-transparent text-[10px] leading-none opacity-50 hover:opacity-100 hover:bg-[rgba(220,38,38,0.15)] hover:text-[var(--status-red)] transition-colors"
                      style={{ color: 'var(--text-4)' }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => addElement(selected?.elementType ?? 'patio')}
                className="rounded-[6px] border-2 border-dashed px-[10px] py-[5px] text-[11px] cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-3)', backgroundColor: 'transparent' }}
              >
                + Element
              </button>
              <button
                type="button"
                onClick={() => addPolygonElement(selected?.elementType ?? 'patio')}
                className="rounded-[6px] border-2 border-dashed px-[10px] py-[5px] text-[11px] cursor-pointer flex items-center gap-[4px]"
                style={{ borderColor: 'var(--green)', color: 'var(--green-l)', backgroundColor: 'transparent' }}
                title="Add a polygon element and start drawing it on the canvas. Esc cancels."
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2l3 3-9 9H2v-3l9-9z" />
                  <path d="M10 3l3 3" />
                </svg>
                Draw polygon
              </button>
            </div>
          </div>

          {/* Per-element sidebar — kept for the AI material accept/dismiss
              flow on lg+ viewports. Below lg, the touch-first
              ElementEditSheet (rendered below) is the editor. */}
          {selected && (
            <div className="hidden lg:block">
              <ElementSidebar
                element={selected}
                data={data}
                onChange={onChange}
                onUpdate={(updates) => updateElement(selected.tempId, updates)}
                onRemove={() => removeElement(selected.tempId)}
                onDuplicate={() => {
                  const newId = duplicateElement(selected.tempId);
                  if (newId) setSelectedTempId(newId);
                }}
                onStartRedraw={() => setDrawingPolygonForTempId(selected.tempId)}
                recommendations={recommendations}
                materialAccepted={materialAccepted}
                materialDismissed={materialDismissed}
                onAcceptMaterial={onAcceptMaterial}
                onDismissMaterial={onDismissMaterial}
                perElementEntry={perElementEntry}
                placementRationale={placementRationales[selected.tempId]}
              />
            </div>
          )}

          {/* Mobile bottom-sheet element editor — same selected element +
              callbacks as the sidebar; renders only on viewports below
              the md breakpoint via the sheet's own md:hidden wrapper. */}
          <WizardElementEditSheet
            selected={selected}
            data={data}
            onClose={() => setSelectedTempId(null)}
            onUpdate={(updates) => selected && updateElement(selected.tempId, updates)}
            onRemove={() => selected && removeElement(selected.tempId)}
            perElementRecs={
              perElementEntry?.status === 'ready' ? perElementEntry.recs : null
            }
            onChange={onChange}
          />
        </div>
      )}

      {/* Total area pill */}
      {elements.length > 0 && totalArea > 0 && (
        <div
          className="flex items-center justify-between rounded-[8px] border px-[14px] py-[8px]"
          style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
        >
          <span className="text-[12px] font-[600] text-[var(--text)]">
            Total Area · {elements.length} element{elements.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[16px] font-[700] tabular-nums" style={{ color: 'var(--status-green)' }}>
            {totalArea.toLocaleString()} sqft
          </span>
        </div>
      )}
    </div>
  );
};

export default WizardStepMeasurements;

// =============================================================================
// ElementSidebar — per-element editor panel
// =============================================================================

interface SidebarProps {
  element: WizardElement;
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  onUpdate: (updates: Partial<WizardElement>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onStartRedraw: () => void;
  recommendations: AIRecommendationSet | null;
  materialAccepted: Set<string>;
  materialDismissed: Set<string>;
  onAcceptMaterial: (id: string) => void;
  onDismissMaterial: (id: string) => void;
  /** Phase B: per-element AI material cache entry for THIS element. */
  perElementEntry: PerElementCacheEntry | undefined;
  /** Sprint AI-Place: 1-sentence rationale Claude returned for this
   *  element's placement (e.g. "Backyard, behind house, away from pool.").
   *  Undefined when the placement call hasn't run or this element wasn't
   *  AI-placed (manual-add or fallback path). */
  placementRationale?: string;
}

const ElementSidebar: React.FC<SidebarProps> = ({
  element,
  data,
  onChange,
  onUpdate,
  onRemove,
  onDuplicate,
  onStartRedraw,
  recommendations,
  materialAccepted,
  materialDismissed,
  onAcceptMaterial,
  onDismissMaterial,
  perElementEntry,
  placementRationale,
}) => {
  const cfg = DIMENSION_CONFIG[element.elementType];
  const showLW = cfg.lengthWidth || cfg.allFields;
  const showLin = cfg.linearFt || cfg.allFields;
  const showH = cfg.heightFt || cfg.allFields;
  const showD = cfg.depthIn || cfg.allFields;
  const showArea = cfg.manualArea || cfg.allFields;

  const orgCatalog = useMaterialStore((s) => s.materials);

  // Materials currently in the project bucket that apply to this element type.
  const elementMaterials = useMemo(() => {
    return data.materialSelections.filter((m) => {
      const types = getElementTypesForMaterial(normalizeCategory(m.category), m.materialName);
      return types.length === 0 ? false : types.includes(element.elementType);
    });
  }, [data.materialSelections, element.elementType]);

  // ── Phase B: prefer per-element AI suggestions over project-level filter ──
  // When the per-element call is ready, use those suggestions (tighter
  // quantities, narrower hallucination space). While loading or on failure,
  // fall back to filtering project-level recommendations by element type
  // so the sidebar never feels empty.
  type AIMatch = { rec: AIMaterialRecommendation; id: string; source: 'per-element' | 'project' };

  const aiMaterialMatches = useMemo<AIMatch[]>(() => {
    const acceptedNames = new Set(
      data.materialSelections.map((m) => m.materialName.toLowerCase()),
    );

    // Per-element source: ready + has results
    if (perElementEntry?.status === 'ready' && perElementEntry.recs.length > 0) {
      return perElementEntry.recs
        .map((rec, i) => ({
          rec,
          id: `el-${element.tempId}-mat-${i}`,
          source: 'per-element' as const,
        }))
        .filter(({ rec, id }) => {
          if (materialDismissed.has(id)) return false;
          if (acceptedNames.has(rec.materialName.toLowerCase())) return false;
          return true;
        });
    }

    // Fallback: project-level recommendations filtered by element type
    const items = recommendations?.materials ?? [];
    return items
      .map((rec, i) => ({ rec, id: `mat-${i}`, source: 'project' as const }))
      .filter(({ rec, id }) => {
        if (materialDismissed.has(id)) return false;
        if (acceptedNames.has(rec.materialName.toLowerCase())) return false;
        const types = getElementTypesForMaterial(
          normalizeCategory(rec.category),
          rec.materialName,
        );
        return types.length > 0 && types.includes(element.elementType);
      });
  }, [
    perElementEntry,
    recommendations,
    element.elementType,
    element.tempId,
    materialDismissed,
    data.materialSelections,
  ]);

  // jbluhm-V6 fix: when accepting an AI rec, capture the SCALED qty
  // (current dims vs. AI-fetch-time baseline) instead of the raw AI
  // value. So a contractor who edits the patio from 100→500 sqft and
  // then accepts the mulch suggestion gets 5yd in their wizard
  // selections, not 1yd.
  const currentArea =
    element.areaSqft ??
    (element.lengthFt && element.widthFt ? element.lengthFt * element.widthFt : 0);
  const currentLinear = element.linearFt ?? 0;
  const baselineArea = perElementEntry?.status === 'ready' ? perElementEntry.baselineArea : 0;
  const baselineLinear = perElementEntry?.status === 'ready' ? perElementEntry.baselineLinear : 0;

  const acceptAIMaterial = (rec: AIMaterialRecommendation, id: string) => {
    if (data.materialSelections.some((m) => m.materialName.toLowerCase() === rec.materialName.toLowerCase())) return;
    const liveQty = scaleAIQuantityForDimensions(
      rec,
      currentArea,
      currentLinear,
      baselineArea,
      baselineLinear,
    );
    const newMat: WizardMaterial = {
      tempId: crypto.randomUUID(),
      materialId: rec.materialId,
      materialName: rec.materialName,
      category: rec.category,
      quantity: liveQty,
      unit: rec.unit,
      unitCost: rec.unitCost,
      inLibrary: rec.inLibrary,
    };
    onChange({ materialSelections: [...data.materialSelections, newMat] });
    onAcceptMaterial(id);
  };

  const removeMaterial = (tempId: string) => {
    onChange({
      materialSelections: data.materialSelections.filter((m) => m.tempId !== tempId),
    });
  };

  // ── Library-search add (for materials AI didn't suggest) ───────────────
  const [libSearch, setLibSearch] = useState('');
  const libMatches = useMemo(() => {
    if (!libSearch.trim()) return [];
    const q = libSearch.toLowerCase();
    return orgCatalog
      .filter((m) => m.isActive !== false)
      .filter((m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      .filter((m) => !data.materialSelections.some((sel) => sel.materialName === m.name))
      .slice(0, 5);
  }, [libSearch, orgCatalog, data.materialSelections]);

  const addFromLibrary = (mat: Material) => {
    const newMat: WizardMaterial = {
      tempId: crypto.randomUUID(),
      materialId: mat.id,
      materialName: mat.name,
      category: mat.category,
      quantity: 0,
      unit: mat.unit,
      unitCost: mat.cost,
      inLibrary: true,
    };
    onChange({ materialSelections: [...data.materialSelections, newMat] });
    setLibSearch('');
  };

  return (
    <aside
      className="rounded-[10px] border p-[14px] space-y-[12px] self-start"
      style={{ backgroundColor: 'var(--surface2)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-[8px]">
        <div className="flex-1 space-y-[8px]">
          <div>
            <label className={labelClass}>Element name</label>
            <input
              className={inputClass}
              value={element.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder={ELEMENT_TYPE_LABELS[element.elementType]}
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
              value={element.elementType}
              onChange={(e) => {
                const newType = e.target.value as ElementType;
                if (newType === element.elementType) return;
                // F-PHB-04: AI-generated notes describe the OLD type
                // ("16x12 paver patio") and stay stale after a type
                // change. Clear them so the contractor isn't confused.
                // F-PHB-05: areaSqft override mismatches new dimensions
                // after type change. Clear so length×width takes
                // precedence again until contractor enters a fresh value.
                onUpdate({
                  elementType: newType,
                  notes: '',
                  areaSqft: null,
                });
              }}
            >
              {ELEMENT_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onDuplicate}
          className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--green-l)] hover:bg-[var(--surface)] cursor-pointer bg-transparent border-none mt-[16px] shrink-0"
          title="Duplicate this element (Cmd-D)"
          aria-label="Duplicate element"
        >
          {/* Two overlapping squares = duplicate icon */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="9" height="9" rx="1.5" />
            <rect x="6" y="6" width="9" height="9" rx="1.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-[var(--text-4)] hover:text-[var(--status-red)] hover:bg-[var(--surface)] cursor-pointer bg-transparent border-none mt-[16px] shrink-0"
          title="Remove this element"
        >
          ✕
        </button>
      </div>

      {/* Sprint AI-Place: AI placement rationale callout. Only renders
          when this element received an AI-grounded placement (the
          rationale is non-empty). Designed as low-key text — it's
          context, not a CTA. */}
      {placementRationale && (
        <div
          className="rounded-[6px] px-[8px] py-[6px] text-[10.5px] leading-[14px]"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.20)',
            color: 'var(--text-3)',
          }}
        >
          <span style={{ color: 'var(--green-l)', fontWeight: 600 }}>AI placed here:</span>{' '}
          {placementRationale}
        </div>
      )}

      {/* Element dimension presets — quick-pick common sizes per element
          type. Only renders when the type has presets defined; rare
          types fall through to the manual dimension inputs below. */}
      {(() => {
        const presets = ELEMENT_PRESETS[element.elementType];
        if (!presets || presets.length === 0) return null;
        return (
          <div>
            <label className={labelClass}>Quick presets</label>
            <div className="flex gap-[4px] mt-[4px] flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const deltas = applyElementPreset(p);
                    // Strip polygonPoints from the WizardElement deltas —
                    // it doesn't live on the element row, only on geometry.
                    const { polygonPoints, ...elementDeltas } = deltas;
                    const updates: Partial<WizardElement> = { ...elementDeltas };
                    // Mirror geometry.shape if the preset specifies one and
                    // the element has existing geometry (so the canvas
                    // re-renders the right primitive).
                    const existingGeom = element.geometry;
                    if (existingGeom) {
                      if (deltas.shape === 'circle' && deltas.radiusFt) {
                        updates.geometry = {
                          ...existingGeom,
                          shape: { kind: 'circle', radius: deltas.radiusFt },
                        };
                      } else if (
                        deltas.shape === 'polygon' &&
                        polygonPoints &&
                        polygonPoints.length >= 3
                      ) {
                        updates.geometry = {
                          ...existingGeom,
                          shape: { kind: 'polygon', points: polygonPoints },
                        };
                      } else if (
                        deltas.shape === 'rectangle' &&
                        deltas.lengthFt &&
                        deltas.widthFt
                      ) {
                        updates.geometry = {
                          ...existingGeom,
                          shape: {
                            kind: 'rectangle',
                            width: deltas.lengthFt,
                            height: deltas.widthFt,
                          },
                        };
                      }
                    } else if (
                      deltas.shape === 'polygon' &&
                      polygonPoints &&
                      polygonPoints.length >= 3
                    ) {
                      // No existing geometry — synthesize one so the canvas
                      // can mount the polygon immediately.
                      updates.geometry = {
                        position: { x: 0, y: 0 },
                        rotation: 0,
                        shape: { kind: 'polygon', points: polygonPoints },
                      };
                    }
                    onUpdate(updates);
                  }}
                  className="px-[8px] py-[4px] rounded-[5px] border text-[11px] cursor-pointer bg-transparent transition-colors"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--green)';
                    e.currentTarget.style.color = 'var(--green-l)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.color = 'var(--text-3)';
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Shape selector — V4 partner ask: round patios, garden beds, edging
          curves, and now irregular shapes (mig 034). Only meaningful for
          elements that have a length/width or area surface; we hide it for
          purely linear elements. */}
      {(showLW || showArea) && (
        <div>
          <label className={labelClass}>Shape</label>
          <div className="flex gap-[6px] mt-[4px]">
            {(['rectangle', 'circle', 'polygon'] as const).map((s) => {
              const active = (element.shape ?? 'rectangle') === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const existingGeom = element.geometry;
                    if (s === 'circle') {
                      const radius = element.radiusFt && element.radiusFt > 0
                        ? element.radiusFt
                        : (element.lengthFt && element.widthFt
                          ? Math.max(element.lengthFt, element.widthFt) / 2
                          : 5);
                      onUpdate({
                        shape: 'circle',
                        lengthFt: null,
                        widthFt: null,
                        geometry: existingGeom
                          ? { ...existingGeom, shape: { kind: 'circle', radius } }
                          : null,
                      });
                    } else if (s === 'polygon') {
                      // Seed a rectangular 4-vertex polygon from current
                      // dims so the engine has something to compute against
                      // and the canvas has something to render. The
                      // contractor refines via the textarea below.
                      const w = element.lengthFt ?? 10;
                      const h = element.widthFt ?? 10;
                      const seedPoints = [
                        { x: 0, y: 0 },
                        { x: w, y: 0 },
                        { x: w, y: h },
                        { x: 0, y: h },
                      ];
                      onUpdate({
                        shape: 'polygon',
                        lengthFt: null,
                        widthFt: null,
                        radiusFt: null,
                        geometry: existingGeom
                          ? { ...existingGeom, shape: { kind: 'polygon', points: seedPoints } }
                          : null,
                      });
                    } else {
                      const w = element.lengthFt ?? (element.radiusFt ? element.radiusFt * 2 : 10);
                      const h = element.widthFt ?? (element.radiusFt ? element.radiusFt * 2 : 10);
                      onUpdate({
                        shape: 'rectangle',
                        radiusFt: null,
                        geometry: existingGeom
                          ? { ...existingGeom, shape: { kind: 'rectangle', width: w, height: h } }
                          : null,
                      });
                    }
                  }}
                  className="flex-1 px-[10px] py-[6px] rounded-[6px] border text-[12px] cursor-pointer"
                  style={{
                    borderColor: active ? 'var(--green)' : 'var(--border)',
                    background: active ? 'rgba(45,106,79,0.08)' : 'transparent',
                    color: active ? 'var(--green-l)' : 'var(--text-3)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {s === 'rectangle' ? 'Rectangle' : s === 'circle' ? 'Circle' : 'Polygon'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-[8px]">
        {(element.shape ?? 'rectangle') === 'polygon' && (showLW || showArea) && (
          <div className="col-span-2 space-y-[6px]">
            {/* Redraw on canvas — Batch 24 click-to-draw mode */}
            <button
              type="button"
              onClick={onStartRedraw}
              className="w-full px-[10px] py-[6px] rounded-[6px] border text-[12px] font-[500] cursor-pointer bg-transparent transition-colors flex items-center justify-center gap-[6px]"
              style={{ borderColor: 'var(--green)', color: 'var(--green-l)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(45,106,79,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title="Redraw the polygon by clicking points on the canvas. Esc to cancel."
            >
              {/* Pencil icon */}
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2l3 3-9 9H2v-3l9-9z" />
                <path d="M10 3l3 3" />
              </svg>
              Redraw on canvas
            </button>
            <PolygonVertexEditor element={element} onUpdate={onUpdate} />
          </div>
        )}
        {(element.shape ?? 'rectangle') === 'circle' && (showLW || showArea) && (
          <div className="col-span-2">
            <label className={labelClass}>Radius (ft)</label>
            <NumberInput
              className={inputClass}
              min={0}
              step={0.5}
              value={element.radiusFt ?? null}
              onChange={(v) => {
                // Mirror the radius into geometry so the 2D canvas resizes
                // the circle in step with the input.
                const updates: Partial<WizardElement> = { radiusFt: v };
                if (v && v > 0 && element.geometry) {
                  updates.geometry = {
                    ...element.geometry,
                    shape: { kind: 'circle', radius: v },
                  };
                }
                onUpdate(updates);
              }}
              placeholder="0"
            />
            {element.radiusFt && element.radiusFt > 0 && (
              <div className="text-[11px] text-[var(--text-4)] mt-[3px]">
                ≈ {Math.round(Math.PI * element.radiusFt * element.radiusFt)} sqft
                · circumference {Math.round(2 * Math.PI * element.radiusFt * 10) / 10} ft
              </div>
            )}
          </div>
        )}
        {showLW &&
          (element.shape ?? 'rectangle') !== 'circle' &&
          (element.shape ?? 'rectangle') !== 'polygon' && (
          <>
            <div>
              <label className={labelClass}>Length (ft)</label>
              <NumberInput
                className={inputClass}
                min={0}
                step={0.5}
                value={element.lengthFt}
                onChange={(v) => onUpdate({ lengthFt: v })}
              />
            </div>
            <div>
              <label className={labelClass}>Width (ft)</label>
              <NumberInput
                className={inputClass}
                min={0}
                step={0.5}
                value={element.widthFt}
                onChange={(v) => onUpdate({ widthFt: v })}
              />
            </div>
          </>
        )}
        {showLin && (
          <div>
            <label className={labelClass}>Linear ft</label>
            <NumberInput
              className={inputClass}
              min={0}
              step={0.5}
              value={element.linearFt}
              onChange={(v) => onUpdate({ linearFt: v })}
            />
          </div>
        )}
        {showH && (
          <div>
            <label className={labelClass}>Height (ft)</label>
            <NumberInput
              className={inputClass}
              min={0}
              step={0.25}
              value={element.heightFt}
              onChange={(v) => onUpdate({ heightFt: v })}
            />
          </div>
        )}
        {showD && (
          <div>
            <label className={labelClass}>Depth (in)</label>
            <NumberInput
              className={inputClass}
              min={0}
              step={0.5}
              value={element.depthIn}
              onChange={(v) => onUpdate({ depthIn: v })}
            />
          </div>
        )}
        {showArea && (
          <div className="col-span-2">
            <label className={labelClass}>
              Area (sqft){element.lengthFt && element.widthFt ? ' override' : ''}
            </label>
            <NumberInput
              className={inputClass}
              min={0}
              step={1}
              value={element.areaSqft}
              onChange={(v) => onUpdate({ areaSqft: v })}
              placeholder={element.lengthFt && element.widthFt ? String(Math.round(element.lengthFt * element.widthFt)) : '0'}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <input
          className={inputClass}
          value={element.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Optional"
        />
      </div>

      {/* Materials — filtered to this element's type */}
      <div className="pt-[10px] border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-[6px]">
          <span className="text-[11px] font-[600] uppercase text-[var(--text-3)]">
            Materials · {elementMaterials.length}
          </span>
        </div>

        {/* Currently assigned */}
        {elementMaterials.length > 0 && (
          <div className="space-y-[3px] mb-[8px]">
            {elementMaterials.map((m) => (
              <div
                key={m.tempId}
                className="flex items-center gap-[6px] rounded-[5px] border px-[8px] py-[4px]"
                style={{ borderColor: 'var(--green)', backgroundColor: 'rgba(45,106,79,0.06)' }}
              >
                <span className="text-[var(--green-l)] text-[10px]">✓</span>
                <span className="px-[5px] py-[1px] rounded-[3px] text-[9px] font-[500]"
                  style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--green-l)' }}>
                  {getCategoryLabel(m.category)}
                </span>
                <span className="text-[11px] text-[var(--text)] font-[500] flex-1 truncate">{m.materialName}</span>
                <span className="text-[10px] text-[var(--text-3)] tabular-nums">
                  {m.quantity || '—'} {m.unit}
                </span>
                <button
                  type="button"
                  onClick={() => removeMaterial(m.tempId)}
                  className="text-[var(--text-4)] hover:text-[var(--status-red)] bg-transparent border-none cursor-pointer text-[10px]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* AI suggestions for THIS element. Phase B: prefer per-element call. */}
        {perElementEntry?.status === 'loading' && (
          <div className="flex items-center gap-[6px] mb-[8px] text-[10px] text-[var(--text-4)]">
            <span className="inline-block w-[6px] h-[6px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--green)' }} />
            AI is sizing materials for this {ELEMENT_TYPE_LABELS[element.elementType].toLowerCase()}…
          </div>
        )}
        {aiMaterialMatches.length > 0 && (
          <div className="space-y-[3px] mb-[8px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-4)]">
                AI suggests
                {aiMaterialMatches[0]?.source === 'per-element' && (
                  <span className="text-[var(--green-l)] ml-[4px]">· tailored to this element</span>
                )}
              </span>
              {perElementEntry?.status === 'failed' && (
                <span className="text-[10px] text-[var(--status-amber)]">
                  Per-element AI unavailable — showing project-level matches
                </span>
              )}
            </div>
            {aiMaterialMatches.slice(0, 6).map(({ rec, id, source }) => {
              return (
                <div
                  key={id}
                  className="flex items-center gap-[6px] rounded-[5px] border px-[8px] py-[4px]"
                  style={{
                    borderColor: source === 'per-element' ? 'rgba(45,106,79,0.4)' : 'var(--border)',
                    backgroundColor: 'var(--surface)',
                  }}
                  title={rec.reason || undefined}
                >
                  <span className="px-[5px] py-[1px] rounded-[3px] text-[9px] font-[500]"
                    style={{ backgroundColor: 'rgba(212,164,76,0.12)', color: 'var(--status-amber)' }}>
                    {getCategoryLabel(rec.category)}
                  </span>
                  <span className="text-[11px] text-[var(--text)] flex-1 truncate">{rec.materialName}</span>
                  {(() => {
                    // jbluhm-V6 fix: live-scaled qty so the chip reflects
                    // the contractor's CURRENT element dimensions, not
                    // the dims at AI-fetch time. The accept handler uses
                    // the same scaled value so the wizard selections
                    // match what's displayed.
                    const liveQty = scaleAIQuantityForDimensions(
                      rec,
                      currentArea,
                      currentLinear,
                      baselineArea,
                      baselineLinear,
                    );
                    if (liveQty <= 0) return null;
                    return (
                      <span className="text-[10px] text-[var(--text-4)] tabular-nums">
                        {liveQty} {rec.unit}
                      </span>
                    );
                  })()}
                  <button
                    type="button"
                    onClick={() => acceptAIMaterial(rec, id)}
                    className="px-[6px] py-[2px] rounded-[3px] text-[10px] font-[500] cursor-pointer border-none"
                    style={{ backgroundColor: 'var(--green)', color: '#fff' }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissMaterial(id)}
                    className="text-[var(--text-4)] hover:text-[var(--text)] bg-transparent border-none cursor-pointer text-[10px]"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Library search */}
        <div className="relative">
          <input
            className={inputClass}
            value={libSearch}
            onChange={(e) => setLibSearch(e.target.value)}
            placeholder="Search your library to add…"
          />
          {libMatches.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-[2px] rounded-[6px] border z-10 max-h-[180px] overflow-y-auto"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
            >
              {libMatches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => addFromLibrary(m)}
                  className="w-full text-left px-[10px] py-[5px] flex items-center gap-[6px] cursor-pointer bg-transparent border-none hover:bg-[var(--surface2)]"
                >
                  <span className="px-[5px] py-[1px] rounded-[3px] text-[9px] font-[500]"
                    style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--green-l)' }}>
                    {getCategoryLabel(m.category)}
                  </span>
                  <span className="text-[11px] text-[var(--text)] flex-1 truncate">{m.name}</span>
                  <span className="text-[10px] text-[var(--text-4)]">${m.cost}/{m.unit}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

// ── PolygonVertexEditor ─────────────────────────────────────────────────────
//
// Manual vertex entry for irregular shapes (mig 034). v1 is a textarea —
// each line is "x,y" in feet. The contractor types the corners; we parse,
// validate, and write the points back into element.geometry.shape. A live
// summary shows area + perimeter so they can sanity-check while editing.
//
// Future: a click-to-draw canvas tool replaces this textarea (Sprint 6f
// extension on PlanView2D). For v1 the textarea is honest, simple, and
// keyboard-driven — better than building a half-broken canvas editor.

interface PolygonVertexEditorProps {
  element: WizardElement;
  onUpdate: (updates: Partial<WizardElement>) => void;
}

function pointsToText(points: Array<{ x: number; y: number }>): string {
  return points.map((p) => `${p.x},${p.y}`).join('\n');
}

function parsePointsText(text: string): Array<{ x: number; y: number }> | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const out: Array<{ x: number; y: number }> = [];
  for (const line of lines) {
    const parts = line.split(/[,\s]+/).map((s) => s.trim());
    if (parts.length < 2) return null;
    const x = parseFloat(parts[0]);
    const y = parseFloat(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    out.push({ x, y });
  }
  return out;
}

const PolygonVertexEditor: React.FC<PolygonVertexEditorProps> = ({ element, onUpdate }) => {
  const initialPoints =
    element.geometry?.shape && element.geometry.shape.kind === 'polygon'
      ? element.geometry.shape.points
      : [];
  const [text, setText] = useState(() => pointsToText(initialPoints));
  const [error, setError] = useState<string | null>(null);

  // Sync the textarea when the underlying geometry changes from the canvas
  // (e.g. drag in PlanView2D). Compare via stringify — cheaper than deep
  // equality and the strings are short.
  const externalText = pointsToText(initialPoints);
  useEffect(() => {
    setText(externalText);
    setError(null);
  }, [externalText]);

  const flush = () => {
    const parsed = parsePointsText(text);
    if (!parsed) {
      setError('Format: one "x,y" pair per line, in feet.');
      return;
    }
    if (parsed.length < 3) {
      setError('A polygon needs at least 3 vertices.');
      return;
    }
    setError(null);
    const existingGeom = element.geometry;
    if (existingGeom) {
      onUpdate({
        geometry: {
          ...existingGeom,
          shape: { kind: 'polygon', points: parsed },
        },
      });
    } else {
      // No geometry yet — synthesize a minimal one so the canvas can mount.
      onUpdate({
        geometry: {
          position: { x: 0, y: 0 },
          rotation: 0,
          shape: { kind: 'polygon', points: parsed },
        },
      });
    }
  };

  // Live area + perimeter from the parsed text (re-parsing is cheap).
  const live = (() => {
    const parsed = parsePointsText(text);
    if (!parsed || parsed.length < 3) return null;
    let sum = 0;
    let perim = 0;
    const n = parsed.length;
    for (let i = 0; i < n; i++) {
      const a = parsed[i];
      const b = parsed[(i + 1) % n];
      sum += a.x * b.y - b.x * a.y;
      perim += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return { area: Math.abs(sum) / 2, perim };
  })();

  return (
    <div className="col-span-2">
      <label className={labelClass}>Vertices (one "x,y" per line, feet)</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={flush}
        rows={Math.max(4, Math.min(8, text.split('\n').length))}
        spellCheck={false}
        placeholder={'0,0\n10,0\n10,8\n0,8'}
        className={`${inputClass} font-mono text-[11px]`}
        style={{ resize: 'vertical', whiteSpace: 'pre' }}
      />
      {error && (
        <div className="text-[11px] mt-[3px]" style={{ color: 'var(--status-red)' }}>
          {error}
        </div>
      )}
      {!error && live && (
        <div className="text-[11px] text-[var(--text-4)] mt-[3px]">
          ≈ {Math.round(live.area)} sqft · perimeter {Math.round(live.perim * 10) / 10} ft ·
          {' '}
          {parsePointsText(text)?.length ?? 0} vertices
        </div>
      )}
      {!error && !live && (
        <div className="text-[11px] text-[var(--text-4)] mt-[3px]">
          Need at least 3 points to form a polygon. Click "Save" or tab out to commit.
        </div>
      )}
    </div>
  );
};
