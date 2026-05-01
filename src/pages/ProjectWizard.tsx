import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { WizardStepJob } from '@/components/wizard/WizardStepJob';
import WizardStepMeasurements from '@/components/wizard/WizardStepMeasurements';
import { WizardStepPlan } from '@/components/wizard/WizardStepPlan';
import { WizardStepNumbers } from '@/components/wizard/WizardStepNumbers';
import { WizardStepSummary } from '@/components/wizard/WizardStepSummary';
import { useProjectStore } from '@/stores/projectStore';
import { useOrgStore } from '@/stores/orgStore';
import { useCrewStore } from '@/stores/crewStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { useMaterialStore } from '@/stores/materialStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { generateProjectRecommendations, inferElements } from '@/services/aiRecommendations';
import { inferElementPlacements, type ElementToPlace } from '@/services/aiPlacement';
import { buildMapboxStaticUrl, BACKDROP_ZOOM, BACKDROP_IMAGE_PX } from '@/lib/mapboxStatic';
import { normalizedToPlanFeet } from '@/lib/mapTileMath';
import { fallbackDimensions, placementBucket } from '@/lib/planLayout';
import { nudgeOverlaps, type ElementBox } from '@/lib/elementOverlap';
import type { Project, ProjectTask, ProjectMaterial, AIRecommendationSet, ElementType, ElementGeometry, Material, Zone, SiteConditionType } from '@/types';
import { getWeekdaysBetween } from '@/utils/dates';
import { normalizeCategory } from '@/lib/categories';
import { getElementTypesForMaterial } from '@/lib/elements';
import { computeQty } from '@/lib/manifest';

// ── Wizard data shape (local state until project is created) ────────────────

export interface WizardTask {
  tempId: string;
  name: string;
  description: string | null;
  phase: string;
  sequenceNumber: number;
  estimatedHours: number | null;
  aiGenerated?: boolean;
}

export interface WizardSubcontractor {
  tempId: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  trade: string | null;
  scopeDescription: string | null;
  quotedCost: number | null;
}

export interface WizardEquipment {
  equipmentId: string;
  name: string;
  dailyRate: number;
  durationDays: number;
  hourlyCost?: number;
  estimatedHours?: number;
}

export interface WizardMaterial {
  tempId: string;
  materialId: string | null;  // null if not in library
  materialName: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  inLibrary: boolean;
}

export interface WizardElement {
  tempId: string;
  name: string;
  elementType: ElementType;
  /** Migration 033/034: 'rectangle' (default), 'circle' (radius), 'polygon' (geometry points). */
  shape?: 'rectangle' | 'circle' | 'polygon' | 'polyline';
  /** Radius in feet when shape='circle'. Null otherwise. */
  radiusFt?: number | null;
  lengthFt: number | null;
  widthFt: number | null;
  areaSqft: number | null;
  linearFt: number | null;
  heightFt: number | null;
  depthIn: number | null;
  notes: string;
  /**
   * 3D-in-wizard (Phase A): on-plan geometry — position, rotation, shape.
   * Pre-populated from AI inference's `placementHint` via planLayout's
   * `placementBucket()`. Edited by the contractor via PlanView3D/2D drag
   * handles. Persisted as `project_elements.geometry` at create time.
   */
  geometry?: ElementGeometry | null;
}

export interface WizardData {
  // Step 1: Job Description
  name: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  propertyType: string | null;
  projectType: string | null;
  scopeSize: string | null;
  description: string | null;

  // Step 2: Site Intelligence
  address: string;
  lat: number | null;
  lng: number | null;
  slopeGrade: string | null;
  soilType: string | null;
  sunExposure: string | null;
  drainagePattern: string | null;
  existingVegetation: string | null;
  climateZone: string | null;
  permitZone: string | null;
  hoaFlag: boolean;
  gateCode: string | null;
  parkingRestrictions: string | null;
  permittedHours: string | null;
  utilityLocations: string | null;
  hoaRules: string | null;

  // Step 3: Scope & Tasks
  tasks: WizardTask[];

  // Step 4: Resources
  crewSize: number | null;
  crewNotes: string | null;
  crewSelections: Array<{
    crewMemberId: string;
    name: string;
    role: string;
    roleOnProject?: string;
  }>;
  equipmentSelections: WizardEquipment[];
  equipmentNotes: string | null;
  subcontractors: WizardSubcontractor[];

  // Step 2b: Project Elements (measurements)
  elements: WizardElement[];

  // Sprint AI-Buildable (mig 035): polygons returned by the AI placement
  // call. Plan-feet, origin = property tile center. All null when
  // placement hasn't run, failed, or imagery was too poor. Persisted to
  // projects.{buildable_area_geometry, obstacles_geometry} on create
  // (lot_geometry is Phase 2 — parcel-data lookup).
  buildableArea: Array<{ x: number; y: number }> | null;
  obstacles: Array<Array<{ x: number; y: number }>>;

  // Step 4b: Materials
  materialSelections: WizardMaterial[];

  // Step 5: Timeline & Budget
  startDate: string | null;
  targetDate: string | null;
  estimatedHours: number | null;
  laborBudget: number | null;
  materialsBudget: number | null;
  equipmentBudget: number | null;
  subcontractorBudget: number | null;
  disposalCost: number | null;
  equipmentCost: number | null;
  overheadPct: number | null;
  clientQuote: number | null;

  // Step 5: Compliance (now before budget)
  noPermitsRequired: boolean;
  permitStatus: string | null;
  permitChecklist: string[];
  permitFees: Record<string, number>;
  complianceNotes: string | null;
}

const INITIAL_DATA: WizardData = {
  name: '',
  clientName: null,
  clientPhone: null,
  clientEmail: null,
  propertyType: null,
  projectType: null,
  scopeSize: null,
  description: null,
  address: '',
  lat: null,
  lng: null,
  slopeGrade: null,
  soilType: null,
  sunExposure: null,
  drainagePattern: null,
  existingVegetation: null,
  climateZone: null,
  permitZone: null,
  hoaFlag: false,
  gateCode: null,
  parkingRestrictions: null,
  permittedHours: null,
  utilityLocations: null,
  hoaRules: null,
  tasks: [],
  crewSize: null,
  crewNotes: null,
  crewSelections: [],
  equipmentSelections: [],
  equipmentNotes: null,
  subcontractors: [],
  elements: [],
  buildableArea: null,
  obstacles: [],
  materialSelections: [],
  startDate: null,
  targetDate: null,
  estimatedHours: null,
  laborBudget: null,
  materialsBudget: null,
  equipmentBudget: null,
  subcontractorBudget: null,
  disposalCost: null,
  equipmentCost: null,
  overheadPct: null,
  clientQuote: null,
  noPermitsRequired: false,
  permitStatus: null,
  permitChecklist: [],
  permitFees: {},
  complianceNotes: null,
};

// 3D-in-Wizard (Phase A): compressed to 5 steps. The materials step folded
// into Step 2's per-element sidebar (assignment) + Step 3's review panel
// (totals, library reconciliation). Step 2 now shows a 3D + 2D canvas
// with AI-pre-placed elements the contractor refines visually.
const WIZARD_STEPS = [
  { label: 'The Job', shortLabel: 'Job' },                   // 0 — Description + client + address
  { label: 'Design', shortLabel: 'Design' },                  // 1 — 3D canvas + per-element measurements + materials
  { label: 'The Plan', shortLabel: 'Plan' },                  // 2 — Crew, equipment, tasks, materials review
  { label: 'The Numbers', shortLabel: 'Numbers' },            // 3 — Budget + permits
  { label: 'Review & Create', shortLabel: 'Review' },         // 4 — Final review + create
];

// Wizard state persistence (jbluhm-feedback hardening): contractors
// frequently spend 5+ minutes in the wizard. A refresh / accidental
// tab close / browser crash today loses everything. localStorage
// backing rehydrates the wizard exactly where they left off, scoped
// per org so two contractors on the same machine don't see each
// other's drafts.
//
// Cleared on successful project create. Cleared on Cancel. Bumped
// `WIZARD_DRAFT_VERSION` invalidates all stale drafts when the
// WizardData shape changes (e.g. adding a new field) — better to lose
// a draft than render a malformed one.
const WIZARD_DRAFT_VERSION = 1;
const WIZARD_DRAFT_STEP_KEY = (orgId: string | undefined) =>
  `tf-wizard-draft-step-v${WIZARD_DRAFT_VERSION}-${orgId ?? 'anon'}`;
const WIZARD_DRAFT_DATA_KEY = (orgId: string | undefined) =>
  `tf-wizard-draft-data-v${WIZARD_DRAFT_VERSION}-${orgId ?? 'anon'}`;

interface PersistedDraft {
  step: number;
  data: WizardData;
}

function loadWizardDraft(orgId: string | undefined): PersistedDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const stepRaw = localStorage.getItem(WIZARD_DRAFT_STEP_KEY(orgId));
    const dataRaw = localStorage.getItem(WIZARD_DRAFT_DATA_KEY(orgId));
    if (!dataRaw) return null;
    const step = stepRaw ? Math.max(0, Math.min(parseInt(stepRaw, 10), 4)) : 0;
    const data = JSON.parse(dataRaw) as WizardData;
    return { step, data };
  } catch {
    // Corrupted JSON — clear so we don't keep crashing on load.
    try {
      localStorage.removeItem(WIZARD_DRAFT_STEP_KEY(orgId));
      localStorage.removeItem(WIZARD_DRAFT_DATA_KEY(orgId));
    } catch {
      /* ignore */
    }
    return null;
  }
}

function saveWizardDraft(orgId: string | undefined, step: number, data: WizardData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WIZARD_DRAFT_STEP_KEY(orgId), String(step));
    localStorage.setItem(WIZARD_DRAFT_DATA_KEY(orgId), JSON.stringify(data));
  } catch {
    /* quota / disabled storage — silent */
  }
}

function clearWizardDraft(orgId: string | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WIZARD_DRAFT_STEP_KEY(orgId));
    localStorage.removeItem(WIZARD_DRAFT_DATA_KEY(orgId));
  } catch {
    /* ignore */
  }
}

export default function ProjectWizard() {
  const navigate = useNavigate();
  const { addProject, createProjectTask, createProjectSubcontractor } = useProjectStore();
  const projectStore = useProjectStore();
  const { org } = useOrgStore();
  const crewStore = useCrewStore();
  const equipmentStore = useEquipmentStore();
  const materialStore = useMaterialStore();
  const scheduleStore = useScheduleStore();
  const orgId = org?.id;

  // Hydrate from localStorage if a draft exists for this org. Lazy
  // initializer runs once on mount before the first render, so the
  // wizard paints with the rehydrated state directly (no flash of
  // empty state). Org ID may not be loaded yet on first render —
  // fall back to anon-keyed draft, which the org-scoped effect
  // below will swap to once org resolves.
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const draft = loadWizardDraft(orgId);
    return draft?.step ?? 0;
  });
  const [data, setData] = useState<WizardData>(() => {
    const draft = loadWizardDraft(orgId);
    return draft?.data ?? INITIAL_DATA;
  });
  // Track whether we've shown the "draft restored" hint once after
  // hydrate so we don't pester on re-renders.
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    const draft = loadWizardDraft(orgId);
    return draft !== null && (draft.step > 0 || draft.data.name.length > 0);
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState('');

  // Persist on every state change (debounce-free — localStorage is
  // synchronous + cheap; saving 50 KB JSON takes < 1 ms). Keyed by
  // orgId so different orgs on the same machine have separate
  // drafts. Skipped while creating so an in-flight create doesn't
  // clobber on success.
  useEffect(() => {
    if (isCreating) return;
    saveWizardDraft(orgId, currentStep, data);
  }, [orgId, currentStep, data, isCreating]);

  // ── Exit warning: prevent accidental navigation away ─────────────────────
  const hasUnsavedData = data.name.trim().length > 0 || data.tasks.length > 0;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedData && !isCreating) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedData, isCreating]);

  // AI recommendation state
  const [recommendations, setRecommendations] = useState<AIRecommendationSet | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Sprint AI-Place: vision-grounded element placement state. Independent of
  // `aiLoading` because the placement call runs AFTER `inferElements` resolves
  // — they're sequential, not parallel (placement needs the element list).
  // We expose:
  //   - `placementLoading`: true while the vision call is in flight
  //   - `placementRationales`: tempId → 1-sentence "why I placed this here"
  //                            from Claude. Surfaced as tooltips in Step 2.
  //   - `placementImageryPoor`: model self-rated the satellite as too poor;
  //                              the wizard surfaces a "drag to position"
  //                              hint instead of the AI-placed banner.
  const [placementLoading, setPlacementLoading] = useState(false);
  const [placementRationales, setPlacementRationales] = useState<Record<string, string>>({});
  const [placementImageryPoor, setPlacementImageryPoor] = useState(false);
  const [placementCount, setPlacementCount] = useState(0);

  /**
   * Sprint AI-Place / Recompute button. Re-run the vision call against
   * the CURRENT wizard state (whatever elements / address the contractor
   * has after their edits). Bound to the "Recompute" button on the
   * placement banner so the contractor can resync placement after
   * adding / removing elements or after the AI's first pass missed.
   *
   * Reads from `data` via closure — we recreate this callback when
   * data changes so the latest snapshot is used. Same fallback +
   * collision-nudge pipeline as the initial trigger; just no
   * inferElements call (we keep the existing element list).
   */
  const recomputePlacements = useCallback(async () => {
    if (placementLoading) return;
    if (data.elements.length === 0) return;
    // Resolve lat/lng (geocode if not yet set — same logic as initial path).
    let coords: { lat: number; lng: number } | null = null;
    if (data.lat != null && data.lng != null) {
      coords = { lat: data.lat, lng: data.lng };
    } else if (data.address?.trim()) {
      const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
      if (token) {
        try {
          const enc = encodeURIComponent(data.address.trim());
          const r = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${enc}.json?access_token=${token}&country=us&types=address,poi&limit=1`,
          );
          if (r.ok) {
            const j = (await r.json()) as { features?: Array<{ center?: [number, number] }> };
            const c = j.features?.[0]?.center;
            if (c) {
              const [lng, lat] = c;
              coords = { lat, lng };
              setData((prev) => ({ ...prev, lat, lng }));
            }
          }
        } catch {
          /* fall through */
        }
      }
    }
    if (!coords) return;
    const tileUrl = buildMapboxStaticUrl(coords.lat, coords.lng);
    if (!tileUrl) return;

    const elementsForPlacement: ElementToPlace[] = data.elements.map((el) => ({
      key: el.tempId,
      elementType: el.elementType,
      name: el.name,
      lengthFt: el.lengthFt,
      widthFt: el.widthFt,
      linearFt: el.linearFt,
    }));
    setPlacementLoading(true);
    try {
      const result = await inferElementPlacements({
        tileImageUrl: tileUrl,
        lat: coords.lat,
        lng: coords.lng,
        zoom: BACKDROP_ZOOM,
        tilePxWide: BACKDROP_IMAGE_PX,
        elements: elementsForPlacement,
      });
      setPlacementImageryPoor(result.imageryPoor);
      const buildablePlanFt = result.buildableArea
        ? result.buildableArea.map((p) =>
            normalizedToPlanFeet(p, coords!.lat, BACKDROP_ZOOM, BACKDROP_IMAGE_PX),
          )
        : null;
      const obstaclesPlanFt = result.obstacles.map((poly) =>
        poly.map((p) => normalizedToPlanFeet(p, coords!.lat, BACKDROP_ZOOM, BACKDROP_IMAGE_PX)),
      );
      const rationales: Record<string, string> = {};
      setData((prev) => {
        let placedCount = 0;
        const updatedElements = prev.elements.map((el) => {
          const place = result.placements.get(el.tempId);
          if (!place || !el.geometry) return el;
          placedCount += 1;
          if (place.rationale) rationales[el.tempId] = place.rationale;
          return {
            ...el,
            geometry: { ...el.geometry, position: place.position },
          };
        });
        setPlacementCount(placedCount);

        // Apply same collision nudge as the initial path so a recompute
        // after manual edits doesn't leave overlapping elements.
        const boxes: ElementBox[] = [];
        for (const el of updatedElements) {
          if (!el.geometry) continue;
          const s = el.geometry.shape;
          let w = 4, h = 4;
          if (s.kind === 'rectangle') { w = s.width; h = s.height; }
          else if (s.kind === 'circle') { w = s.radius * 2; h = s.radius * 2; }
          else if (s.kind === 'polygon' && s.points.length >= 3) {
            let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
            for (const p of s.points) {
              if (p.x < mnx) mnx = p.x;
              if (p.y < mny) mny = p.y;
              if (p.x > mxx) mxx = p.x;
              if (p.y > mxy) mxy = p.y;
            }
            w = mxx - mnx; h = mxy - mny;
          }
          boxes.push({ key: el.tempId, x: el.geometry.position.x, y: el.geometry.position.y, w, h });
        }
        const nudge = nudgeOverlaps(boxes);
        const nudgedElements = nudge.changed
          ? updatedElements.map((el) => {
              const moved = nudge.positions.get(el.tempId);
              if (!moved || !el.geometry) return el;
              return { ...el, geometry: { ...el.geometry, position: moved } };
            })
          : updatedElements;

        return {
          ...prev,
          elements: nudgedElements,
          buildableArea: buildablePlanFt,
          obstacles: obstaclesPlanFt,
        };
      });
      setPlacementRationales((prev) => ({ ...prev, ...rationales }));
    } catch {
      /* keep existing positions on failure */
    } finally {
      setPlacementLoading(false);
    }
  }, [placementLoading, data]);
  const [acceptedItems, setAcceptedItems] = useState<Record<string, Set<string>>>({
    tasks: new Set(),
    crew: new Set(),
    equipment: new Set(),
    materials: new Set(),
    permits: new Set(),
  });
  const [dismissedItems, setDismissedItems] = useState<Record<string, Set<string>>>({
    tasks: new Set(),
    crew: new Set(),
    equipment: new Set(),
    materials: new Set(),
    permits: new Set(),
  });

  // Fetch org data needed for AI recommendations
  useEffect(() => {
    if (!orgId) return;
    crewStore.fetchCrew();
    equipmentStore.fetchEquipment();
    materialStore.fetchMaterials();
    scheduleStore.fetchAssignments(orgId);
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
    scheduleStore.fetchEntries(orgId, today, future);
  }, [orgId]);

  const handleChange = useCallback((updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return data.name.trim().length > 0;
      default:
        return true;
    }
  };

  // Shared AI trigger — fires when navigating past Job step.
  // 3D-in-Wizard: kicks off two calls in parallel:
  //   1. generateProjectRecommendations — tasks/crew/equipment/materials/budget
  //   2. inferElements — element list with rough dims + placement hints
  // The element list is then merged into wizardData.elements with each
  // element seeded with `geometry` from placementBucket() so PlanView2D/3D
  // renders them in the right yard region of the satellite map. We only
  // seed if `data.elements` is empty so we don't clobber user edits if the
  // contractor had already manually added elements.
  const triggerAIIfNeeded = useCallback(() => {
    if (!recommendations && !aiLoading) {
      setAiLoading(true);
      const ctx = {
        description: data.description || '',
        projectType: data.projectType,
        propertyType: data.propertyType,
        scopeSize: data.scopeSize,
        address: data.address || '',
        siteConditions: {
          slopeGrade: data.slopeGrade ?? undefined,
          soilType: data.soilType ?? undefined,
          sunExposure: data.sunExposure ?? undefined,
          drainagePattern: data.drainagePattern ?? undefined,
          climateZone: data.climateZone ?? undefined,
          hoaFlag: data.hoaFlag,
        },
        startDate: data.startDate ?? undefined,
        targetDate: data.targetDate ?? undefined,
        orgCrew: crewStore.crew,
        orgEquipment: equipmentStore.equipment,
        orgMaterials: materialStore.materials,
        defaultLaborRate: org?.defaultLaborRate ?? 35,
        defaultEquipmentRate: org?.defaultEquipmentRate ?? 0,
        existingAssignments: scheduleStore.assignments,
        existingScheduleEntries: scheduleStore.entries,
        existingProjects: projectStore.projects,
      };

      // Fire main recommendation call (tasks/crew/equipment/materials/budget).
      generateProjectRecommendations(ctx).then((result) => {
        setRecommendations(result);
        setAiLoading(false);
      }).catch(() => setAiLoading(false));

      // Fire element inference in parallel. Independent failure mode — if
      // element inference fails the wizard still gets the main set; users
      // can hand-add elements in Step 2.
      if (data.elements.length === 0) {
        inferElements(ctx).then((aiElements) => {
          if (aiElements.length === 0) return;
          // Group by placementHint so multiple backyard elements stack
          // along an arc inside the same bucket instead of overlapping.
          const stackByHint: Record<string, number> = {};
          const seeded: WizardElement[] = aiElements.map((ai) => {
            const tempId = crypto.randomUUID();
            const synthetic: WizardElement = {
              tempId,
              name: ai.name,
              elementType: ai.elementType,
              lengthFt: ai.lengthFt,
              widthFt: ai.widthFt,
              areaSqft: ai.areaSqft,
              linearFt: ai.linearFt,
              heightFt: ai.heightFt,
              depthIn: ai.depthIn,
              notes: ai.reason ?? '',
            };
            // resolveGeometry-equivalent for WizardElement — fallbackDimensions
            // expects a ProjectElement-like shape.
            // fallbackDimensions reads only a subset of ProjectElement fields,
            // but TypeScript wants the full shape. The cast is safe because
            // those are the only fields touched.
            const dims = fallbackDimensions({
              elementType: ai.elementType,
              lengthFt: ai.lengthFt,
              widthFt: ai.widthFt,
              areaSqft: ai.areaSqft,
              linearFt: ai.linearFt,
              computedAreaSqft: ai.areaSqft ?? 0,
            } as unknown as Parameters<typeof fallbackDimensions>[0]);
            const stackIdx = stackByHint[ai.placementHint] ?? 0;
            stackByHint[ai.placementHint] = stackIdx + 1;
            const pos = placementBucket(ai.placementHint, dims, stackIdx);
            synthetic.geometry = {
              position: pos,
              rotation: 0,
              shape: { kind: 'rectangle', width: dims.width, height: dims.height },
            };
            return synthetic;
          });
          // Merge into existing wizard state — only seed when user hasn't
          // already started adding elements (race-safe via setData).
          setData((prev) => prev.elements.length === 0 ? { ...prev, elements: seeded } : prev);

          // Sprint AI-Place: kick off vision-grounded placement after we
          // have a seeded element list. Runs sequentially after
          // inferElements (placement needs the element list as input) but
          // BEHIND the wizard UI — Step 2 paints with placementBucket
          // fallback positions immediately, then animates to the AI
          // placements when the call returns ~5-10 s later.
          //
          // jbluhm-feedback: if the contractor TYPED an address without
          // selecting from the autocomplete dropdown, lat/lng will be
          // null and the AI placement would silently skip (leaving
          // every element at its fallback bucket position). On-demand
          // geocode of the entered address closes that gap so the AI
          // placement fires regardless of how the address was entered.
          // Token gates the URL builder and the geocode lookup; both
          // skip cleanly when unset.
          const ensureLatLng = async (): Promise<{ lat: number; lng: number } | null> => {
            if (data.lat != null && data.lng != null) {
              return { lat: data.lat, lng: data.lng };
            }
            if (!data.address?.trim()) return null;
            const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
            if (!token) return null;
            try {
              const enc = encodeURIComponent(data.address.trim());
              const r = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${enc}.json?access_token=${token}&country=us&types=address,poi&limit=1`,
              );
              if (!r.ok) return null;
              const j = (await r.json()) as { features?: Array<{ center?: [number, number] }> };
              const c = j.features?.[0]?.center;
              if (!c) return null;
              const [lng, lat] = c;
              // Backfill into wizard state so subsequent steps + the
              // create write get the geocoded coords too.
              setData((prev) => ({ ...prev, lat, lng }));
              return { lat, lng };
            } catch {
              return null;
            }
          };

          ensureLatLng().then((coords) => {
          if (coords) {
            const tileUrl = buildMapboxStaticUrl(coords.lat, coords.lng);
            if (tileUrl) {
              const elementsForPlacement: ElementToPlace[] = seeded.map((el) => ({
                key: el.tempId,
                elementType: el.elementType,
                name: el.name,
                lengthFt: el.lengthFt,
                widthFt: el.widthFt,
                linearFt: el.linearFt,
              }));
              setPlacementLoading(true);
              inferElementPlacements({
                tileImageUrl: tileUrl,
                lat: coords.lat,
                lng: coords.lng,
                zoom: BACKDROP_ZOOM,
                tilePxWide: BACKDROP_IMAGE_PX,
                elements: elementsForPlacement,
              })
                .then((result) => {
                  setPlacementLoading(false);
                  setPlacementImageryPoor(result.imageryPoor);

                  // Sprint AI-Buildable: capture the buildable polygon +
                  // obstacles for overlay rendering and persist-on-create.
                  // Convert from normalized [0,1] tile coords to plan-feet
                  // before storing — same coord space as element positions.
                  const buildablePlanFt = result.buildableArea
                    ? result.buildableArea.map((p) =>
                        normalizedToPlanFeet(p, coords.lat, BACKDROP_ZOOM, BACKDROP_IMAGE_PX),
                      )
                    : null;
                  const obstaclesPlanFt = result.obstacles.map((poly) =>
                    poly.map((p) =>
                      normalizedToPlanFeet(p, coords.lat, BACKDROP_ZOOM, BACKDROP_IMAGE_PX),
                    ),
                  );

                  if (result.imageryPoor || result.placements.size === 0) {
                    // Imagery too poor or no valid coords — keep the
                    // placementBucket fallback positions, but still
                    // persist whatever polygons came back (the overlay
                    // can still help even when individual placements
                    // didn't work).
                    setData((prev) => ({
                      ...prev,
                      buildableArea: buildablePlanFt,
                      obstacles: obstaclesPlanFt,
                    }));
                    return;
                  }
                  // Override seeded geometry.position with AI coords.
                  // Preserves rotation + shape (dimensions, etc.) from
                  // the bucket seed.
                  const rationales: Record<string, string> = {};
                  setData((prev) => {
                    let placedCount = 0;
                    const updatedElements = prev.elements.map((el) => {
                      const place = result.placements.get(el.tempId);
                      if (!place || !el.geometry) return el;
                      placedCount += 1;
                      if (place.rationale) rationales[el.tempId] = place.rationale;
                      return {
                        ...el,
                        geometry: {
                          ...el.geometry,
                          position: place.position,
                        },
                      };
                    });
                    setPlacementCount(placedCount);

                    // Sprint AI-Buildable Phase 2 / collision nudge: AI
                    // places each element independently, so two backyard
                    // patios commonly land at the same coords. Detect
                    // overlapping AABBs and push later elements out of
                    // the way along the smaller-displacement axis. First
                    // element wins (anchor) so AI's most-confident
                    // placement isn't moved by a less-confident sibling.
                    const boxes: ElementBox[] = [];
                    for (const el of updatedElements) {
                      if (!el.geometry) continue;
                      const s = el.geometry.shape;
                      let w = 4, h = 4;
                      if (s.kind === 'rectangle') {
                        w = s.width;
                        h = s.height;
                      } else if (s.kind === 'circle') {
                        w = s.radius * 2;
                        h = s.radius * 2;
                      } else if (s.kind === 'polygon' && s.points.length >= 3) {
                        let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
                        for (const p of s.points) {
                          if (p.x < mnx) mnx = p.x;
                          if (p.y < mny) mny = p.y;
                          if (p.x > mxx) mxx = p.x;
                          if (p.y > mxy) mxy = p.y;
                        }
                        w = mxx - mnx;
                        h = mxy - mny;
                      }
                      boxes.push({
                        key: el.tempId,
                        x: el.geometry.position.x,
                        y: el.geometry.position.y,
                        w,
                        h,
                      });
                    }
                    const nudge = nudgeOverlaps(boxes);
                    const nudgedElements = nudge.changed
                      ? updatedElements.map((el) => {
                          const moved = nudge.positions.get(el.tempId);
                          if (!moved || !el.geometry) return el;
                          return {
                            ...el,
                            geometry: { ...el.geometry, position: moved },
                          };
                        })
                      : updatedElements;

                    return {
                      ...prev,
                      elements: nudgedElements,
                      buildableArea: buildablePlanFt,
                      obstacles: obstaclesPlanFt,
                    };
                  });
                  setPlacementRationales((prev) => ({ ...prev, ...rationales }));
                })
                .catch(() => {
                  setPlacementLoading(false);
                  /* fallback to placementBucket positions — already there */
                });
            }
          }
          }); // end ensureLatLng().then
        }).catch(() => { /* non-blocking */ });
      }
    }
  }, [recommendations, aiLoading, data, crewStore.crew, equipmentStore.equipment, materialStore.materials, org, scheduleStore.assignments, scheduleStore.entries, projectStore.projects]);

  // F-CW-10: scroll the wizard's scroll container to the top when stepping
  // forward/back. Without this, contractors land mid-page on the next step's
  // content with no header context. Targets the inner <main> scroll container
  // (the AppLayout pattern) plus window for safety.
  const scrollToWizardTop = () => {
    // The wizard renders inside <main class="...overflow-y-auto..."> per
    // AppLayout. Find the nearest scrollable ancestor and reset it.
    const scrollables = Array.from(document.querySelectorAll('main, [data-scroll-container]'));
    for (const el of scrollables) {
      (el as HTMLElement).scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      // Trigger AI after Step 0 (The Job) — has description + address + site conditions
      if (currentStep === 0) triggerAIIfNeeded();
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setHighestVisitedStep(prev => Math.max(prev, nextStep));
      scrollToWizardTop();
    }
  };

  // jbluhm-V6 fix: Enter advances the wizard to the next step. Skipped
  // inside textarea (multi-line input) and inside contenteditable
  // surfaces, and skipped when the focused input has its own Enter
  // semantics (e.g. address autocomplete dropdown — that input lives
  // inside a wrapper that calls preventDefault on Enter, so keypress
  // doesn't bubble here when the dropdown is open). Modifier-Enter
  // (Cmd/Ctrl/Alt/Shift) reserved for future per-input shortcuts.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      // Multi-line inputs: Enter inserts a newline, do not advance.
      if (tag === 'textarea' || target?.isContentEditable === true) return;
      // Buttons: let the button's own click fire (Space/Enter on a
      // focused button is the native default).
      if (tag === 'button') return;
      // Address autocomplete dropdown calls preventDefault when its
      // suggestions are open; e.defaultPrevented short-circuits us.
      if (e.defaultPrevented) return;
      // On the last step, Enter shouldn't trigger Create — that's
      // destructive + needs explicit click. Only advances forward.
      if (currentStep >= WIZARD_STEPS.length - 1) return;
      if (!canProceed()) return;
      e.preventDefault();
      handleNext();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // canProceed reads `data` + `currentStep` via closure; rebind on
    // every render so the latest values are checked. Cheap.
  });

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      scrollToWizardTop();
    }
  };

  const handleCancel = () => {
    if (hasUnsavedData) {
      if (window.confirm('You have unsaved project data. Are you sure you want to leave?')) {
        clearWizardDraft(orgId);
        navigate('/dashboard');
      }
    } else {
      clearWizardDraft(orgId);
      navigate('/dashboard');
    }
  };

  /**
   * Sprint AI-Place / draft hardening: explicit "discard draft" button.
   * Surfaced in the restored-banner so contractors who see the draft
   * pop in but want to start fresh have a clean way out.
   */
  const handleDiscardDraft = useCallback(() => {
    clearWizardDraft(orgId);
    setData(INITIAL_DATA);
    setCurrentStep(0);
    setDraftRestored(false);
  }, [orgId]);

  // Track highest visited step for forward navigation
  const [highestVisitedStep, setHighestVisitedStep] = useState(0);

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= highestVisitedStep) {
      // If jumping forward past step 0, trigger AI
      if (stepIndex > 0 && currentStep === 0) {
        triggerAIIfNeeded();
      }
      setCurrentStep(stepIndex);
      scrollToWizardTop();
    }
  };

  // Reset AI suggestions for a category
  const handleResetCategory = useCallback((category: string) => {
    setAcceptedItems(prev => ({ ...prev, [category]: new Set<string>() }));
    setDismissedItems(prev => ({ ...prev, [category]: new Set<string>() }));

    if (category === 'tasks') {
      handleChange({ tasks: data.tasks.filter(t => !t.aiGenerated) });
    }
    if (category === 'crew') {
      handleChange({ crewSelections: [] });
    }
    if (category === 'equipment') {
      handleChange({ equipmentSelections: [] });
    }
    if (category === 'materials') {
      handleChange({ materialSelections: [] });
    }
    if (category === 'permits') {
      handleChange({ permitChecklist: [], permitFees: {} });
    }
  }, [data.tasks, handleChange]);

  // AI accept/dismiss helpers
  const handleAccept = (category: string, id: string) => {
    setAcceptedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].add(id);
      return next;
    });
    // Remove from dismissed if it was there (undo)
    setDismissedItems((prev) => {
      if (!prev[category].has(id)) return prev;
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].delete(id);
      return next;
    });
  };

  const handleDismiss = (category: string, id: string) => {
    setDismissedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].add(id);
      return next;
    });
    setAcceptedItems((prev) => {
      if (!prev[category].has(id)) return prev;
      const next = { ...prev };
      next[category] = new Set(prev[category]);
      next[category].delete(id);
      return next;
    });
  };

  const handleAcceptAll = (category: string, ids: string[]) => {
    setAcceptedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category], ...ids]);
      return next;
    });
    setDismissedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category]].filter((id) => !ids.includes(id)));
      return next;
    });
  };

  const handleDismissAll = (category: string, ids: string[]) => {
    setDismissedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category], ...ids]);
      return next;
    });
    setAcceptedItems((prev) => {
      const next = { ...prev };
      next[category] = new Set([...prev[category]].filter((id) => !ids.includes(id)));
      return next;
    });
  };

  const handleCreate = async () => {
    if (!orgId || isCreating) return;
    setIsCreating(true);
    setCreateStatus('Creating project...');

    try {
      // Compute budget total for the legacy budget field
      const labor = data.laborBudget ?? 0;
      const materials = data.materialsBudget ?? 0;
      const equipment = data.equipmentBudget ?? 0;
      const subs = data.subcontractorBudget ?? 0;
      const disposal = data.disposalCost ?? 0;
      const equipCost = data.equipmentCost ?? 0;
      const subtotal = labor + materials + equipment + subs + disposal + equipCost;
      const overhead = subtotal * ((data.overheadPct ?? 10) / 100);
      const totalCost = subtotal + overhead;
      const profit = (data.clientQuote ?? 0) - totalCost;

      // Build project object from wizard data
      const project: Omit<Project, 'id' | 'createdAt'> = {
        name: data.name.trim(),
        client: data.clientName || '',
        address: data.address,
        totalArea: 0,
        startDate: data.startDate || '',
        targetDate: data.targetDate || '',
        budget: data.clientQuote ?? 0,
        notes: [
          ...data.equipmentSelections.map((e) => `${e.name} (${e.durationDays}d)`),
          data.equipmentNotes || '',
        ].filter(Boolean).join('; '),
        lat: data.lat ?? undefined,
        lng: data.lng ?? undefined,
        materials: [], // Will be populated after project creation
        zones: [],
        // Sprint AI-Buildable: persist the AI-identified polygons so the
        // 2D/3D viewers can render the buildable-area overlay across
        // sessions. lotGeometry is Phase 2 — null on create.
        buildableAreaGeometry: data.buildableArea,
        obstaclesGeometry: data.obstacles.length > 0 ? data.obstacles : null,
        lotGeometry: null,
        checklist: {
          permit: data.permitChecklist.length > 0,
          utility: !!data.utilityLocations,
          deposit: false,
          design: false,
          access: !!data.gateCode || !!data.permittedHours,
          materials: (data.materialsBudget ?? 0) > 0,
          crew: (data.crewSize ?? 0) > 0 || data.crewSelections.length > 0,
          equipment: data.equipmentSelections.length > 0 || !!data.equipmentNotes,
        },
        // M1.5 fields
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail,
        propertyType: data.propertyType as Project['propertyType'],
        projectType: data.projectType as Project['projectType'],
        scopeSize: data.scopeSize as Project['scopeSize'],
        description: data.description,
        climateZone: data.climateZone,
        soilType: data.soilType,
        permitZone: data.permitZone,
        hoaFlag: data.hoaFlag,
        slopeGrade: data.slopeGrade,
        existingVegetation: data.existingVegetation,
        sunExposure: data.sunExposure as Project['sunExposure'],
        drainagePattern: data.drainagePattern,
        gateCode: data.gateCode,
        parkingRestrictions: data.parkingRestrictions,
        permittedHours: data.permittedHours,
        utilityLocations: data.utilityLocations,
        hoaRules: data.hoaRules,
        laborBudget: data.laborBudget,
        materialsBudget: data.materialsBudget,
        equipmentBudget: data.equipmentBudget,
        subcontractorBudget: data.subcontractorBudget,
        overheadPct: data.overheadPct,
        clientQuote: data.clientQuote,
        profitMargin: profit,
        estimatedHours: data.estimatedHours,
        disposalCost: data.disposalCost,
        equipmentCost: data.equipmentCost,
        crewSize: data.crewSelections?.length ?? 0,
        crewNotes: null,
        equipmentNotes: data.equipmentNotes,
        complianceNotes: data.complianceNotes,
        permitStatus: data.permitStatus as Project['permitStatus'],
        wizardStep: 7,
        wizardCompletedAt: new Date().toISOString(),
        // Lifecycle: wizard creates projects as estimates
        status: 'estimate',
      };

      // Create the project via store (handles Supabase persistence + ID generation)
      const projectId = await addProject(project);

      if (!projectId) {
        console.error('Wizard: project creation returned null');
        return;
      }

      // Create tasks through store
      setCreateStatus('Adding tasks...');
      for (const task of data.tasks) {
        if (task.name.trim()) {
          await createProjectTask(
            {
              orgId,
              projectId,
              zoneId: null,
              name: task.name.trim(),
              description: task.description,
              phase: task.phase as ProjectTask['phase'],
              sequenceNumber: task.sequenceNumber,
              status: 'pending',
              assignedCrewId: null,
              estimatedHours: task.estimatedHours,
              actualHours: null,
              dependsOn: [],
              scheduledDate: null,
              completedAt: null,
              aiGenerated: task.aiGenerated ?? false,
              aiConfidence: null,
            },
            orgId
          );
        }
      }

      // Create subcontractors through store
      setCreateStatus('Creating subcontractors...');
      for (const sub of data.subcontractors) {
        if (sub.companyName.trim()) {
          await createProjectSubcontractor(
            {
              orgId,
              projectId,
              companyName: sub.companyName.trim(),
              contactName: sub.contactName,
              phone: sub.phone,
              email: null,
              trade: sub.trade,
              scopeDescription: sub.scopeDescription,
              scheduledStart: null,
              scheduledEnd: null,
              quotedCost: sub.quotedCost,
              actualCost: null,
              status: 'pending',
              notes: null,
            },
            orgId
          );
        }
      }

      // Create permit records from wizard checklist
      if ((data.permitChecklist || []).length > 0 && !data.noPermitsRequired) {
        setCreateStatus('Creating permits...');
        for (const key of data.permitChecklist) {
          try {
            await projectStore.createProjectPermit({
              orgId, projectId, permitType: key, jurisdiction: data.permitZone || null,
              permitNumber: null, status: 'needed',
              appliedDate: null, approvedDate: null, expiryDate: null,
              inspectionDate: null, inspectionResult: null, inspectionNotes: null,
              fee: data.permitFees[key] ?? null, aiSuggested: false, notes: null,
            }, orgId);
          } catch (err) {
            console.warn('Permit creation failed (non-blocking):', err);
          }
        }
      }

      // Create site condition records from wizard data
      const allSiteFields = [
        { conditionType: 'soil' as SiteConditionType, label: 'Soil Type', value: data.soilType },
        { conditionType: 'slope' as SiteConditionType, label: 'Slope Grade', value: data.slopeGrade },
        { conditionType: 'sun_exposure' as SiteConditionType, label: 'Sun Exposure', value: data.sunExposure },
        { conditionType: 'drainage' as SiteConditionType, label: 'Drainage Pattern', value: data.drainagePattern },
        { conditionType: 'vegetation' as SiteConditionType, label: 'Existing Vegetation', value: data.existingVegetation },
        { conditionType: 'utilities' as SiteConditionType, label: 'Utility Locations', value: data.utilityLocations },
      ];
      const siteFields = allSiteFields.filter(f => f.value);
      if (siteFields.length > 0) {
        setCreateStatus('Saving site conditions...');
        for (const field of siteFields) {
          try {
            await projectStore.createProjectSiteCondition({
              orgId, projectId,
              conditionType: field.conditionType, label: field.label, value: field.value!,
              aiInferred: false, notes: null,
            }, orgId);
          } catch (err) {
            console.warn('Site condition creation failed (non-blocking):', err);
          }
        }
      }

      // Crew assignments + schedule entries (new — downstream writes)
      let downstreamErrors = false;
      if (data.crewSelections.length > 0) {
        setCreateStatus('Assigning crew...');
        for (const crew of data.crewSelections) {
          try {
            await scheduleStore.createAssignment(
              {
                orgId,
                projectId,
                crewMemberId: crew.crewMemberId,
                roleOnProject: crew.roleOnProject || crew.role,
              },
              orgId
            );

            // Create schedule entries for weekdays in project date range
            if (data.startDate && data.targetDate) {
              setCreateStatus('Scheduling...');
              const dates = getWeekdaysBetween(data.startDate, data.targetDate);
              for (const date of dates) {
                await scheduleStore.createEntry(
                  {
                    projectId,
                    crewMemberId: crew.crewMemberId,
                    equipmentId: null,
                    scheduledDate: date,
                    startTime: null,
                    endTime: null,
                    status: 'scheduled',
                    notes: '',
                  },
                  orgId
                );
              }
            }
          } catch (err) {
            console.error('Crew assignment failed:', err);
            downstreamErrors = true;
          }
        }
      }

      // Equipment status updates
      if (data.equipmentSelections.length > 0) {
        setCreateStatus('Updating equipment...');
        for (const equip of data.equipmentSelections) {
          try {
            if (equip.equipmentId) {
              await equipmentStore.updateEquipment(equip.equipmentId, {
                status: 'in-use',
                assignedProject: projectId,
              });
            }
          } catch (err) {
            console.error('Equipment update failed:', err);
            downstreamErrors = true;
          }
        }
      }

      // F-CW-LIVE-05 + F-CW-LIVE-11: dedup before BOTH the JSONB save and
      // the element-material auto-link loops below. AI suggests:
      //   (a) case variants of the same material (LIVE-05) — e.g.
      //       "Landscape Fabric (Weed Barrier)" + "Landscape fabric
      //       (weed barrier)"
      //   (b) conceptual duplicates with different names (LIVE-11) — e.g.
      //       "Sod (2,500 sqft)" + "Sod (additional 500 sqft to complete
      //       3,000 sqft)" — both intended for the same Sod Area
      // Without this, both rows ship with the SAME computed quantity from
      // the element's geometry, doubling the order. Dedup key: category +
      // first significant word of name (lowercased, parentheticals stripped).
      // Dedup key: category + cleaned name (lowercase, parentheticals stripped,
      // whitespace collapsed). Catches case variants AND name-variant
      // duplicates that share the same root noun phrase, while keeping
      // genuinely different materials (Drain Pipe vs Drain Rock) separate.
      const dedupKey = (mat: { materialName?: string; category?: string }) => {
        const cleanName = (mat.materialName || '')
          .toLowerCase()
          .replace(/\([^)]*\)/g, '')   // strip "(2,500 sqft)" / "(weed barrier)"
          .replace(/\s+/g, ' ')         // collapse whitespace
          .trim();
        return `${(mat.category || '').toLowerCase().trim()}|${cleanName}`;
      };
      const dedupSeen = new Set<string>();
      data.materialSelections = data.materialSelections.filter(mat => {
        const key = dedupKey(mat);
        if (dedupSeen.has(key)) return false;
        dedupSeen.add(key);
        return true;
      });

      // Materials: save to project JSONB (primary), best-effort add to library
      if (data.materialSelections.length > 0) {
        setCreateStatus('Saving materials...');
        const projectMaterials: ProjectMaterial[] = [];

        for (const mat of data.materialSelections) {
          let resolvedMaterialId = mat.materialId;

          // Best-effort: add new materials to the org library
          // Project creation continues even if this fails
          if (!mat.inLibrary || !resolvedMaterialId) {
            try {
              // F-CW-45: capture the returned Material instead of looking it
              // up by name+category afterward (racy — fetchMaterials inside
              // addMaterial replaces state mid-lookup, and concurrent adds
              // with the same name+category collide).
              const created = await materialStore.addMaterial({
                name: mat.materialName,
                category: mat.category,
                unit: mat.unit,
                cost: mat.unitCost,
                reserveOverride: null,
                coverage: null,
                depthIn: null,
                notes: 'Auto-added by project wizard',
                qtyOnHand: 0,
                minStockLevel: 0,
                storageLocation: '',
                lastRestocked: '',
              });
              if (created) {
                resolvedMaterialId = created.id;
                // Mutate the source mat too — the element-material auto-link
                // loop further down reads mat.materialId. Without this it
                // sees the empty string and the junction insert fails with
                // "invalid input syntax for type uuid" (F-CW-18).
                mat.materialId = created.id;
              }
              // Clear any store error from the add attempt
              if (useMaterialStore.getState().error) {
                useMaterialStore.setState({ error: null });
              }
            } catch (err) {
              console.warn('Auto-add to library failed (non-blocking):', err);
              // Clear the error so it doesn't show on Material Library page
              useMaterialStore.setState({ error: null });
            }
          }

          projectMaterials.push({
            id: crypto.randomUUID(),
            materialId: resolvedMaterialId ?? mat.materialId ?? '',
            name: mat.materialName,
            category: normalizeCategory(mat.category),
            quantity: mat.quantity,
            unit: mat.unit,
            unitCost: mat.unitCost,
          });
        }

        // Save project materials to JSONB — this is the critical path
        if (projectMaterials.length > 0) {
          try {
            await projectStore.updateProjectMaterials(projectId, projectMaterials);
          } catch (err) {
            console.error('Failed to save project materials:', err);
            downstreamErrors = true;
          }
        }
      }

      // Save project elements (measurement-driven architecture)
      // Track saved elements for auto-assignment below
      const savedElements: { id: string; elementType: ElementType; lengthFt: number | null; widthFt: number | null; areaSqft: number | null; linearFt: number | null; depthIn: number | null; computedAreaSqft: number; name: string }[] = [];
      if (data.elements.length > 0) {
        setCreateStatus('Saving measurements...');
        for (let i = 0; i < data.elements.length; i++) {
          const el = data.elements[i];
          try {
            // Migration 033/034: circles use π × r²; polygons use Shoelace
            // on geometry.shape.points; everything else falls back to
            // length × width or the manual areaSqft override.
            const isCircle = el.shape === 'circle' && el.radiusFt && el.radiusFt > 0;
            const isPolygon =
              el.shape === 'polygon' &&
              el.geometry?.shape &&
              el.geometry.shape.kind === 'polygon' &&
              el.geometry.shape.points.length >= 3;
            let computedArea: number;
            if (isCircle) {
              computedArea = Math.PI * (el.radiusFt as number) * (el.radiusFt as number);
            } else if (
              isPolygon &&
              el.geometry?.shape &&
              el.geometry.shape.kind === 'polygon'
            ) {
              const pts = el.geometry.shape.points;
              let sum = 0;
              const n = pts.length;
              for (let k = 0; k < n; k++) {
                const a = pts[k];
                const b = pts[(k + 1) % n];
                sum += a.x * b.y - b.x * a.y;
              }
              computedArea = Math.abs(sum) / 2;
            } else if (el.lengthFt && el.widthFt) {
              computedArea = el.lengthFt * el.widthFt;
            } else {
              computedArea = el.areaSqft ?? 0;
            }

            const saved = await projectStore.addElement({
              orgId,
              projectId,
              name: el.name.trim() || `${el.elementType} ${i + 1}`,
              elementType: el.elementType,
              shape: el.shape ?? 'rectangle',
              radiusFt: el.radiusFt ?? null,
              lengthFt: el.lengthFt,
              widthFt: el.widthFt,
              areaSqft: el.areaSqft,
              linearFt: el.linearFt,
              heightFt: el.heightFt,
              depthIn: el.depthIn,
              computedAreaSqft: computedArea,
              notes: el.notes || '',
              sequence: i,
              createdAt: new Date().toISOString(),
              // 3D-in-Wizard: persist on-plan geometry from the canvas. The
              // contractor refined position/rotation/size visually in Step 2;
              // saving it means OverviewTab opens the project with elements
              // exactly where they were placed in the wizard.
              geometry: el.geometry ?? null,
            }, orgId);
            if (saved) {
              savedElements.push({
                id: saved.id,
                elementType: el.elementType,
                lengthFt: el.lengthFt,
                widthFt: el.widthFt,
                areaSqft: el.areaSqft,
                linearFt: el.linearFt,
                depthIn: el.depthIn,
                computedAreaSqft: computedArea,
                name: saved.name,
              });
            }
          } catch (err) {
            console.error('Element save failed:', err);
            downstreamErrors = true;
          }
        }
      }

      // Auto-assign materials to elements by category mapping.
      // Creates element-material junction rows that activate the measurement-driven
      // manifest path (manifest.ts → generateFromElementMaterials).
      if (savedElements.length > 0 && data.materialSelections.length > 0) {
        setCreateStatus('Linking materials to measurements...');
        const libraryMaterials = useMaterialStore.getState().materials;

        for (const mat of data.materialSelections) {
          const category = normalizeCategory(mat.category);
          // F-CW-LIVE-09: use category mapping with name-keyword fallback so
          // category='misc' items (drain pipe, hydrangea shrubs, topsoil,
          // landscape fabric — common AI defaults) still find matching
          // elements via their name. Pre-fix, ~6 of 8 typical materials
          // were skipped because they came back with category='misc' which
          // had no element-type mapping.
          const targetElementTypes = getElementTypesForMaterial(category, mat.materialName);

          // Find which saved elements this material should attach to
          // Only assign to elements whose types match this material's category
          if (targetElementTypes.length === 0) continue;
          const matchingElements = savedElements.filter(el => targetElementTypes.includes(el.elementType));

          if (matchingElements.length === 0) continue;

          for (const el of matchingElements) {
            try {
              // Compute quantity from element dimensions using industry formulas
              const area = el.computedAreaSqft || 0;
              const perimeter = el.linearFt || 0;
              const syntheticZone: Zone = {
                id: el.id, name: el.name, area, perimeter,
                sequence: 0, crew: '', dependencies: [], notes: '',
                materials: [], equipment: [], createdAt: '',
              };

              // Build a Material adapter for computeQty
              const libMat = libraryMaterials.find(m => m.id === mat.materialId);
              const matAdapter: Material = {
                id: mat.materialId ?? '',
                name: mat.materialName,
                category,
                unit: mat.unit,
                cost: mat.unitCost,
                reserveOverride: libMat?.reserveOverride ?? null,
                coverage: libMat?.coverage ?? null,
                depthIn: el.depthIn ?? libMat?.depthIn ?? null,
                notes: '',
                qtyOnHand: 0,
                minStockLevel: 0,
                storageLocation: '',
                lastRestocked: '',
              };

              let quantity = computeQty(matAdapter, syntheticZone);

              // F-CW-LIVE-13: honor AI's stated count for point/each materials
              // (plants, lights, fixtures). computeQty's coverage-based 1-per-
              // area formula gives qty=1 for a Shrub Planting that the user
              // said had 8 hydrangeas. The AI provides the right count in
              // mat.quantity — use it when the unit is 'each' and the AI
              // value is sensible (positive integer).
              if (mat.unit === 'each' && typeof mat.quantity === 'number' && mat.quantity > 0) {
                quantity = mat.quantity;
              }

              // F-CW-LIVE-12: stone/gravel/sand on a drainage element. Drainage
              // has linear_ft + depth_in but no area_sqft, so the cuyd formula
              // (area × depth/27) returns 0 and the material gets orphaned.
              // For drainage, treat the element as a trench: cuyd =
              // linear_ft × bed_width_ft × depth_ft / 27. Default bed width
              // is 1.5 ft (typical French drain trench width).
              if (
                quantity <= 0 &&
                el.elementType === 'drainage' &&
                (mat.unit === 'cuyd' || mat.unit === 'ton') &&
                perimeter > 0
              ) {
                const depthFt = (el.depthIn ?? 12) / 12;
                const bedWidthFt = 1.5;
                const cuyd = (perimeter * bedWidthFt * depthFt) / 27;
                quantity = mat.unit === 'ton' ? cuyd * (matAdapter.coverage || 1.5) : cuyd;
              }

              if (quantity <= 0) continue;

              await projectStore.addElementMaterial(el.id, {
                orgId,
                elementId: el.id,
                // F-CW-18: column is uuid-typed; empty string fails Postgres
                // parse. Use null when the material isn't yet linked to the
                // library (e.g. addMaterial failed in the loop above).
                materialId: mat.materialId && mat.materialId.length > 0 ? mat.materialId : null,
                name: mat.materialName,
                category,
                quantity,
                unit: mat.unit,
                unitCost: mat.unitCost,
                depthIn: el.depthIn,
                notes: '',
              }, orgId);
            } catch (err) {
              console.warn('Element-material link failed (non-blocking):', err);
            }
          }
        }
      }

      if (downstreamErrors) {
        console.warn('Project created with some assignment errors. User can fix on dashboard.');
      }

      setCreateStatus('Done!');
      // Clear the rehydrate draft now that the project is in the DB.
      // Done BEFORE navigate so a fast back-button doesn't repopulate
      // the wizard with the just-saved state.
      clearWizardDraft(orgId);
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error('Wizard create failed:', err);
    } finally {
      setIsCreating(false);
      setCreateStatus('');
    }
  };

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-[24px]">
        <div>
          <h1 className="font-serif text-[22px] text-[var(--text)]">
            New Project Wizard
          </h1>
          <p className="text-[13px] text-[var(--text-3)] mt-[2px]">
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      {/* Draft-restored banner — shown once when localStorage hydrate
          surfaced an in-progress wizard. Lets the contractor either
          continue OR start fresh. Auto-dismisses after first dismissal
          and never shows again until a new draft accumulates. */}
      {draftRestored && (
        <div
          className="rounded-[8px] px-[14px] py-[10px] mb-[16px] flex items-center justify-between gap-[12px]"
          style={{
            background: 'rgba(16,185,129,0.10)',
            border: '1px solid rgba(16,185,129,0.30)',
          }}
          role="status"
        >
          <span className="text-[12px]" style={{ color: 'var(--text-2)' }}>
            <span style={{ color: 'var(--green-l)', fontWeight: 600 }}>
              Restored your draft.
            </span>{' '}
            Picking up at step {currentStep + 1} of {WIZARD_STEPS.length}.
            {data.name ? <> · "{data.name}"</> : null}
          </span>
          <div className="flex items-center gap-[6px] shrink-0">
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-[11px] cursor-pointer border-none bg-transparent hover:underline"
              style={{ color: 'var(--text-3)' }}
            >
              Discard + start fresh
            </button>
            <button
              type="button"
              onClick={() => setDraftRestored(false)}
              aria-label="Dismiss draft-restored banner"
              className="w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] cursor-pointer border-none bg-transparent hover:bg-[rgba(255,255,255,0.05)]"
              style={{ color: 'var(--text-3)' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="mb-[32px]">
        <WizardStepper
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          highestVisitedStep={highestVisitedStep}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Step content */}
      <div
        className="rounded-[12px] border p-[24px] mb-[24px]"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {currentStep === 0 && <WizardStepJob data={data} onChange={handleChange} />}
        {currentStep === 1 && (
          <WizardStepMeasurements
            data={data}
            onChange={handleChange}
            recommendations={recommendations}
            aiLoading={aiLoading}
            placementLoading={placementLoading}
            placementCount={placementCount}
            placementImageryPoor={placementImageryPoor}
            placementRationales={placementRationales}
            onRecomputePlacements={recomputePlacements}
            materialAccepted={acceptedItems.materials}
            materialDismissed={dismissedItems.materials}
            onAcceptMaterial={(id: string) => handleAccept('materials', id)}
            onDismissMaterial={(id: string) => handleDismiss('materials', id)}
          />
        )}
        {currentStep === 2 && (
          <WizardStepPlan
            data={data}
            onChange={handleChange}
            recommendations={recommendations}
            aiLoading={aiLoading}
            orgCrew={crewStore.crew}
            orgEquipment={equipmentStore.equipment}
            taskAccepted={acceptedItems.tasks}
            taskDismissed={dismissedItems.tasks}
            crewAccepted={acceptedItems.crew}
            crewDismissed={dismissedItems.crew}
            equipAccepted={acceptedItems.equipment}
            equipDismissed={dismissedItems.equipment}
            onAccept={(domain: string, id: string) => handleAccept(domain, id)}
            onDismiss={(domain: string, id: string) => handleDismiss(domain, id)}
            onAcceptAll={(domain: string, ids: string[]) => handleAcceptAll(domain, ids)}
            onDismissAll={(domain: string, ids: string[]) => handleDismissAll(domain, ids)}
          />
        )}
        {currentStep === 3 && (
          <WizardStepNumbers
            data={data}
            onChange={handleChange}
            recommendations={recommendations}
          />
        )}
        {currentStep === 4 && <WizardStepSummary data={data} />}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="md"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Back
        </Button>

        <div className="flex items-center gap-[8px]">
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
            </Button>
          ) : (
            <div className="flex items-center gap-[8px]">
              {createStatus && (
                <span className="text-[12px] text-[var(--text-3)]">{createStatus}</span>
              )}
              <Button
                variant="primary"
                size="md"
                onClick={handleCreate}
                loading={isCreating}
                disabled={!data.name.trim() || isCreating}
              >
                Create Project
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
   