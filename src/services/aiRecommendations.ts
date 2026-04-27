/**
 * AI Project Recommendation Engine
 *
 * Generates a comprehensive recommendation set for a project by calling Claude
 * with the org's actual crew, equipment, materials, and rates as context.
 *
 * This module is a pure suggestion layer — it never writes to stores.
 * The wizard owns accept/reject logic and all store writes.
 */

import { callClaude, DEFAULT_MODEL } from '@/services/anthropic';
import type {
  AIRecommendationSet,
  AITaskRecommendation,
  AICrewRecommendation,
  AIEquipmentRecommendation,
  AIMaterialRecommendation,
  AIBudgetRecommendation,
  AIPermitRecommendation,
  AIElementRecommendation,
  CrewMember,
  Equipment,
  Material,
  ProjectCrewAssignment,
  ScheduleEntry,
  ProjectListItem,
  ElementType,
} from '@/types';

export interface RecommendationContext {
  description: string;
  projectType: string | null;
  propertyType: string | null;
  scopeSize: string | null;
  address: string;
  siteConditions: {
    slopeGrade?: string;
    soilType?: string;
    sunExposure?: string;
    drainagePattern?: string;
    climateZone?: string;
    hoaFlag?: boolean;
  };
  startDate?: string;
  targetDate?: string;
  orgCrew: CrewMember[];
  orgEquipment: Equipment[];
  orgMaterials: Material[];
  defaultLaborRate: number;
  defaultEquipmentRate: number;
  existingAssignments: ProjectCrewAssignment[];
  existingScheduleEntries: ScheduleEntry[];
  existingProjects: ProjectListItem[];
}

function buildPrompt(ctx: RecommendationContext): string {
  const crewRoster = ctx.orgCrew.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    skills: c.skills,
    certs: c.certs.map((cert) => cert.label),
  }));

  const equipmentList = ctx.orgEquipment.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type || e.equipmentType || 'general',
    status: e.status,
    dailyRate: e.dailyRate,
  }));

  const materialLibrary = ctx.orgMaterials.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    unitCost: m.cost,
  }));

  const site = ctx.siteConditions;

  return `You are an experienced landscaping project estimator and crew scheduler.

INDUSTRY MATERIAL RULES (non-negotiable — follow these exactly):
- Base material (gravel, crushed stone, sand for base) MINIMUM depth is 6 inches. Never suggest less than 6".
- Polymeric sand is priced per 50lb BAG, not per pound. Coverage: 65 sqft per bag. Unit must be "bag".
- Topsoil minimum depth: 3 inches for garden beds.
- Mulch minimum depth: 2 inches for weed suppression.
- Concrete slab minimum depth: 4 inches.
- All bulk material quantities use the formula: sqft / 324 × depth_inches = cubic yards.

Given a project description and the contractor's actual org data (crew, equipment, materials, rates), generate a comprehensive project recommendation.

## Project Details
- Description: "${ctx.description}"
${ctx.projectType ? `- Project type: ${ctx.projectType}` : ''}
${ctx.propertyType ? `- Property type: ${ctx.propertyType}` : ''}
${ctx.scopeSize ? `- Scope size: ${ctx.scopeSize}` : ''}
- Address: "${ctx.address}"
${ctx.startDate ? `- Start date: ${ctx.startDate}` : ''}
${ctx.targetDate ? `- Target date: ${ctx.targetDate}` : ''}

## Site Conditions
${site.slopeGrade ? `- Slope: ${site.slopeGrade}` : ''}
${site.soilType ? `- Soil: ${site.soilType}` : ''}
${site.sunExposure ? `- Sun exposure: ${site.sunExposure}` : ''}
${site.drainagePattern ? `- Drainage: ${site.drainagePattern}` : ''}
${site.climateZone ? `- Climate zone: ${site.climateZone}` : ''}
${site.hoaFlag ? '- HOA: Yes' : ''}

## Org Crew Roster
${JSON.stringify(crewRoster, null, 2)}

## Org Equipment
${JSON.stringify(equipmentList, null, 2)}

## Org Material Library
${JSON.stringify(materialLibrary, null, 2)}

## Rates
- Default labor rate: $${ctx.defaultLaborRate}/hr
- Default equipment rate: $${ctx.defaultEquipmentRate}/day

Return JSON matching this schema EXACTLY (no markdown fencing):
{
  "tasks": [{ "name": string, "phase": "demo_prep"|"rough_grade"|"hardscape"|"softscape"|"irrigation"|"lighting"|"cleanup_punchlist"|"custom", "sequenceNumber": number, "estimatedHours": number, "description": string, "suggestedCrewRole": string }],
  "crew": [{ "crewMemberId": string, "crewMemberName": string, "role": string, "reason": string, "skills": string[] }],
  "equipment": [{ "equipmentId": string, "equipmentName": string, "type": string, "reason": string, "estimatedDays": number, "dailyRate": number }],
  "materials": [{ "materialId": string|null, "materialName": string, "category": string, "estimatedQuantity": number, "unit": string, "unitCost": number, "reason": string, "inLibrary": boolean }],
  "budget": { "laborBudget": number, "materialsBudget": number, "equipmentBudget": number, "disposalCost": number, "subcontractorBudget": number, "overheadPct": number, "estimatedHours": number, "clientQuoteRange": { "low": number, "high": number }, "reasoning": string },
  "permits": [{ "permitType": string, "reason": string, "estimatedFee": number|null, "urgency": "required"|"recommended"|"optional" }]
}

Rules:
- For crew: ONLY recommend crew members from the provided roster (by their exact id). Never invent new crew members.
- For equipment: ONLY recommend equipment from the provided list (by their exact id). Never invent new equipment.
- For materials: prefer items from the org's library (set materialId and inLibrary:true). You may suggest unlisted materials with materialId:null and inLibrary:false.
- Budget math: use the provided defaultLaborRate ($${ctx.defaultLaborRate}/hr) and actual equipment dailyRate values.
- Generate 6-15 tasks depending on scope.
- For sequenceNumber: tasks that can run simultaneously get the SAME number. Tasks that depend on a prior task get a HIGHER number. Within each phase, start at 1 and increment. Example: two parallel hardscape tasks both get sequenceNumber 2, but the cleanup task after them gets sequenceNumber 3.
- Always return valid JSON with no markdown fencing.`;
}

/**
 * F-CW-LIVE-08: normalize AI unit strings to the values allowed by the
 * `materials_unit_check` CHECK constraint. The constraint allows:
 *   sqft, lnft, bag, cuyd, ton, each, gallon, lb, pallet, roll, box, piece, bundle
 * AI commonly returns plural / verbose variants like "cubic_yards",
 * "linear_feet", "square_feet", "pieces", "plants", etc. Without this
 * map, every createMaterial call for an AI-suggested material with a
 * non-canonical unit fails silently and the manifest engine never sees
 * it. Lowercases + strips spaces/dashes/underscores before matching.
 */
const UNIT_NORMALIZATION: Record<string, string> = {
  // Square feet
  sqft: 'sqft', squarefeet: 'sqft', squarefoot: 'sqft', sf: 'sqft',
  // Linear feet
  lnft: 'lnft', linearfeet: 'lnft', linearfoot: 'lnft', lf: 'lnft', lin: 'lnft',
  // Cubic yards
  cuyd: 'cuyd', cubicyards: 'cuyd', cubicyard: 'cuyd', cy: 'cuyd', yard: 'cuyd', yards: 'cuyd',
  // Tons
  ton: 'ton', tons: 'ton',
  // Bags
  bag: 'bag', bags: 'bag',
  // Each / count
  each: 'each', ea: 'each', units: 'each', unit: 'each', count: 'each', plant: 'each', plants: 'each',
  // Pallet / roll / box / piece / bundle
  pallet: 'pallet', pallets: 'pallet',
  roll: 'roll', rolls: 'roll',
  box: 'box', boxes: 'box',
  piece: 'piece', pieces: 'piece', pcs: 'piece', pc: 'piece',
  bundle: 'bundle', bundles: 'bundle',
  // Pounds + gallons
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  gallon: 'gallon', gallons: 'gallon', gal: 'gallon',
};

export function normalizeAIUnit(raw: string | null | undefined): string {
  if (!raw) return 'each';
  const key = String(raw).toLowerCase().replace(/[\s_\-]+/g, '');
  return UNIT_NORMALIZATION[key] ?? String(raw).toLowerCase();
}

/**
 * Validate and enrich AI response against actual org data.
 * Drops hallucinated IDs, corrects budget math.
 */
function validateAndEnrich(
  raw: AIRecommendationSet,
  ctx: RecommendationContext
): AIRecommendationSet {
  const crewIds = new Set(ctx.orgCrew.map((c) => c.id));
  const equipIds = new Set(ctx.orgEquipment.map((e) => e.id));
  const materialMap = new Map(ctx.orgMaterials.map((m) => [m.id, m]));
  const materialNameMap = new Map(ctx.orgMaterials.map((m) => [m.name.toLowerCase(), m]));

  // Validate crew — drop hallucinated IDs
  const crew: AICrewRecommendation[] = (raw.crew || [])
    .filter((c) => crewIds.has(c.crewMemberId))
    .map((c) => ({
      ...c,
      availabilityNote: c.availabilityNote || 'Available',
      isAvailable: true, // will be enriched by availability check
    }));

  // Validate equipment — drop hallucinated IDs
  const equipment: AIEquipmentRecommendation[] = (raw.equipment || [])
    .filter((e) => equipIds.has(e.equipmentId))
    .map((e) => {
      const orgEquip = ctx.orgEquipment.find((oe) => oe.id === e.equipmentId);
      return {
        ...e,
        dailyRate: orgEquip?.dailyRate ?? e.dailyRate,
        availabilityNote: e.availabilityNote || 'Available',
        isAvailable: true, // will be enriched
      };
    });

  // Validate materials — match against org library + coerce known-unit traps.
  // F-048 guard: polymeric sand (and similar bagged joint sands) must be
  // priced per bag, not per pound. AI has been instructed in the prompt but
  // sometimes ignores it; this is the belt-and-suspenders correction.
  const BAGGED_UNIT_COERCIONS: Array<{ keywords: string[]; unit: string; defaultCoverage: number }> = [
    { keywords: ['polymeric sand', 'poly sand'], unit: 'bag', defaultCoverage: 65 },
  ];

  // F-046 guard: if AI mentions a sub-minimum depth for a base category in
  // the reason text, rewrite to the minimum. Engine will enforce at compute
  // time regardless, but the displayed reason matters — partners have
  // flagged "AI said 4 inch base" as a trust issue multiple times (V3, V4).
  const BASE_DEPTH_MINIMUMS: Record<string, number> = {
    gravel: 6,
    sand: 6,
    soil: 3,
    mulch: 2,
    concrete: 4,
  };
  const scrubReasonDepth = (reason: string | undefined, category: string): string => {
    if (!reason) return reason ?? '';
    const cat = category.toLowerCase();
    const min = BASE_DEPTH_MINIMUMS[cat];
    if (!min) return reason;
    // Match "<n>"" or "<n>-inch" or "<n> inch" / "<n>in" patterns where n < min.
    // Uses a replacer so we can compute the corrected number per-match.
    return reason.replace(
      /(\d+(?:\.\d+)?)(?:"|\s?(?:-)?\s?(?:in(?:ch(?:es)?)?))/gi,
      (whole, numStr) => {
        const n = parseFloat(numStr);
        if (!Number.isFinite(n) || n >= min) return whole;
        const unitLiteral = whole.slice(numStr.length);
        return `${min}${unitLiteral}`;
      },
    );
  };

  const materials: AIMaterialRecommendation[] = (raw.materials || []).map((m) => {
    // Coerce unit for bagged-only materials if AI returned something else.
    const nameLc = (m.materialName || '').toLowerCase();
    // F-CW-LIVE-08: AI returns variants like "cubic_yards" / "linear_feet"
    // / "square_feet" / "pieces" that the DB's materials_unit_check
    // CHECK constraint rejects. Allowed values: sqft|lnft|bag|cuyd|ton|
    // each|gallon|lb|pallet|roll|box|piece|bundle. Without this map
    // every createMaterial call fails with a CHECK violation, the
    // material ends up as a project-level orphan with empty materialId,
    // and the manifest engine never sees it. This single normalization
    // unblocks the entire materials cascade end-to-end.
    let coercedUnit = normalizeAIUnit(m.unit);
    let coercedQuantity = m.estimatedQuantity;
    for (const rule of BAGGED_UNIT_COERCIONS) {
      if (rule.keywords.some((k) => nameLc.includes(k))) {
        if (coercedUnit !== rule.unit) {
          // If AI returned pounds, convert using 50 lb/bag assumption.
          // If AI returned sqft, use coverage_sqft_per_unit to compute bags.
          // Otherwise pass through as a single bag.
          if (coercedUnit === 'lb' || coercedUnit === 'lbs' || coercedUnit === 'pound') {
            coercedQuantity = Math.max(1, Math.ceil(coercedQuantity / 50));
          } else if (coercedUnit === 'sqft') {
            coercedQuantity = Math.max(1, Math.ceil(coercedQuantity / rule.defaultCoverage));
          }
          coercedUnit = rule.unit;
          console.warn(`[AI guard] Coerced "${m.materialName}" from unit="${m.unit}" → "${rule.unit}"`);
        }
        break;
      }
    }

    // F-046: rewrite sub-minimum depth mentions in the reason text.
    const scrubbedReason = scrubReasonDepth(m.reason, m.category);

    // Try to find by ID first, then by name
    const byId = m.materialId ? materialMap.get(m.materialId) : undefined;
    const byName = !byId ? materialNameMap.get(m.materialName.toLowerCase()) : undefined;
    const match = byId || byName;

    if (match) {
      return {
        ...m,
        materialId: match.id,
        // Prefer the library entry's unit + cost over AI's guess.
        unit: match.unit || coercedUnit,
        unitCost: match.cost,
        estimatedQuantity: coercedQuantity,
        reason: scrubbedReason,
        inLibrary: true,
      };
    }
    return { ...m, materialId: null, unit: coercedUnit, estimatedQuantity: coercedQuantity, reason: scrubbedReason, inLibrary: false };
  });

  // Validate tasks
  const validPhases = new Set([
    'demo_prep', 'rough_grade', 'hardscape', 'softscape',
    'irrigation', 'lighting', 'cleanup_punchlist', 'custom',
  ]);
  const tasks: AITaskRecommendation[] = (raw.tasks || []).map((t) => ({
    ...t,
    phase: validPhases.has(t.phase) ? t.phase : 'custom',
    estimatedHours: Math.max(0, t.estimatedHours || 0),
  }));

  // Validate and correct budget math
  const totalTaskHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const computedLabor = totalTaskHours * ctx.defaultLaborRate;
  const computedEquipment = equipment.reduce((sum, e) => sum + e.dailyRate * e.estimatedDays, 0);
  const computedMaterials = materials.reduce((sum, m) => sum + m.unitCost * m.estimatedQuantity, 0);

  const budget: AIBudgetRecommendation = {
    laborBudget: computedLabor > 0 ? computedLabor : (raw.budget?.laborBudget ?? 0),
    materialsBudget: computedMaterials > 0 ? computedMaterials : (raw.budget?.materialsBudget ?? 0),
    equipmentBudget: computedEquipment > 0 ? computedEquipment : (raw.budget?.equipmentBudget ?? 0),
    disposalCost: raw.budget?.disposalCost ?? 0,
    subcontractorBudget: raw.budget?.subcontractorBudget ?? 0,
    overheadPct: raw.budget?.overheadPct ?? 10,
    estimatedHours: totalTaskHours > 0 ? totalTaskHours : (raw.budget?.estimatedHours ?? 0),
    clientQuoteRange: raw.budget?.clientQuoteRange ?? { low: 0, high: 0 },
    reasoning: raw.budget?.reasoning ?? '',
  };

  // Validate permits
  const permits: AIPermitRecommendation[] = (raw.permits || []).map((p) => ({
    permitType: p.permitType || 'other',
    reason: p.reason || '',
    estimatedFee: p.estimatedFee ?? null,
    urgency: ['required', 'recommended', 'optional'].includes(p.urgency) ? p.urgency : 'recommended',
  }));

  return {
    tasks,
    crew,
    equipment,
    materials,
    budget,
    permits,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Enrich crew and equipment with availability based on existing assignments/schedule.
 */
function enrichAvailability(
  recs: AIRecommendationSet,
  ctx: RecommendationContext
): AIRecommendationSet {
  const startDate = ctx.startDate;
  const targetDate = ctx.targetDate;

  // Crew availability check
  const crew = recs.crew.map((c) => {
    if (!startDate || !targetDate) return c;

    // Check existing assignments for this crew member
    const conflicting = ctx.existingAssignments.filter(
      (a) => a.crewMemberId === c.crewMemberId
    );

    // Check schedule entries that overlap project date range
    const overlappingEntries = ctx.existingScheduleEntries.filter(
      (e) =>
        e.crewMemberId === c.crewMemberId &&
        e.scheduledDate >= startDate &&
        e.scheduledDate <= targetDate &&
        e.status !== 'cancelled'
    );

    if (overlappingEntries.length > 0) {
      // Find which project(s) they're busy on
      const projectIds = new Set(overlappingEntries.map((e) => e.projectId));
      const projectNames = ctx.existingProjects
        .filter((p) => projectIds.has(p.id))
        .map((p) => p.name);
      const dateRange = overlappingEntries
        .map((e) => e.scheduledDate)
        .sort();

      return {
        ...c,
        isAvailable: false,
        availabilityNote: `Busy ${dateRange[0]}–${dateRange[dateRange.length - 1]} on ${projectNames.join(', ') || 'another project'}`,
      };
    }

    if (conflicting.length > 0) {
      const projectNames = ctx.existingProjects
        .filter((p) => conflicting.some((a) => a.projectId === p.id))
        .map((p) => p.name);
      return {
        ...c,
        isAvailable: true,
        availabilityNote: `Also assigned to: ${projectNames.join(', ')}`,
      };
    }

    return { ...c, isAvailable: true, availabilityNote: 'Available' };
  });

  // Equipment availability check
  const equipment = recs.equipment.map((e) => {
    const orgEquip = ctx.orgEquipment.find((oe) => oe.id === e.equipmentId);
    if (!orgEquip) return e;

    if (orgEquip.status === 'in-use' || orgEquip.status === 'maintenance') {
      return {
        ...e,
        isAvailable: false,
        availabilityNote: orgEquip.status === 'in-use'
          ? `In use${orgEquip.assignedProject ? '' : ''}`
          : 'In maintenance',
      };
    }

    if (orgEquip.status === 'out-of-service') {
      return {
        ...e,
        isAvailable: false,
        availabilityNote: 'Out of service',
      };
    }

    return { ...e, isAvailable: true, availabilityNote: 'Available' };
  });

  return { ...recs, crew, equipment };
}

/**
 * Generate comprehensive AI recommendations for a project.
 * Returns null if the API key is missing, the call fails, or the response is invalid.
 */
/**
 * F-CW-16: empty/minimal AIRecommendationSet so the wizard renders gracefully
 * when the LLM call fails or returns malformed JSON. The downstream wizard
 * checks `recommendations !== null` to decide whether to render AI sections,
 * so returning an empty set instead of null keeps the AI panels visible with
 * "no suggestions" copy rather than disappearing entirely.
 */
function emptyRecommendationSet(): AIRecommendationSet {
  return {
    tasks: [],
    crew: [],
    equipment: [],
    materials: [],
    permits: [],
    budget: {
      laborBudget: 0,
      materialsBudget: 0,
      equipmentBudget: 0,
      disposalCost: 0,
      subcontractorBudget: 0,
      overheadPct: 10,
      estimatedHours: 0,
      clientQuoteRange: { low: 0, high: 0 },
      reasoning: 'AI recommendations unavailable — fill in details manually.',
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * F-CW-16: parse defensively. Claude occasionally truncates JSON when the
 * response runs long (the original failure was "Unterminated string at
 * position 12779"). Two-step rescue:
 *   1. Try the strict parse.
 *   2. On failure, try to recover an outer object by trimming any trailing
 *      garbage. We find the last balanced closing brace and JSON.parse the
 *      substring up to it. If that still fails, return null.
 */
function safeParseRecommendations(raw: string): AIRecommendationSet | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned) as AIRecommendationSet;
  } catch (err) {
    // Try to find a valid outer-object substring by walking braces.
    let depth = 0;
    let lastValidEnd = -1;
    let inString = false;
    let escape = false;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) lastValidEnd = i;
      }
    }
    if (lastValidEnd > 0) {
      try {
        return JSON.parse(cleaned.slice(0, lastValidEnd + 1)) as AIRecommendationSet;
      } catch {
        // fall through
      }
    }
    console.warn('AI JSON parse failed — partial-recovery also failed:', err);
    return null;
  }
}

export async function generateProjectRecommendations(
  ctx: RecommendationContext
): Promise<AIRecommendationSet | null> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return null;

  try {
    const prompt = buildPrompt(ctx);
    // F-CW-16: bumped from 4096 → 8192 because the original failure was a
    // mid-string truncation at position 12779 in the raw response. Softscape
    // scenarios in particular generate long outputs (more elements + more
    // dependent materials).
    const raw = await callClaude(prompt, DEFAULT_MODEL, 8192);
    const parsed = safeParseRecommendations(raw);
    if (!parsed) {
      // Don't return null — return an empty-but-valid set so the wizard
      // keeps rendering AI panels with "no suggestions" instead of
      // collapsing the entire Step 3+ flow.
      console.warn('AI recommendations: parse failed, falling back to empty set');
      return emptyRecommendationSet();
    }

    const validated = validateAndEnrich(parsed, ctx);
    const enriched = enrichAvailability(validated, ctx);

    return enriched;
  } catch (err) {
    console.error('AI recommendation generation failed:', err);
    // F-CW-16: same fallback for network/API errors.
    return emptyRecommendationSet();
  }
}

// ===== 3D-in-Wizard: Element Inference =====
//
// Phase A. The legacy keyword-regex inference in WizardStepMeasurements is
// not enough for a 3D-first wizard — it can't reason about scope (frontyard
// vs backyard), can't ballpark dimensions, can't produce per-element
// placement intent. This call gives Claude a tight prompt focused on a
// single job: turn the project description + scope into a list of
// ProjectElements with rough dimensions and a coarse spatial hint that
// `placementBucket()` translates into an initial canvas position.
//
// Runs in parallel with `generateProjectRecommendations` from the same
// wizard trigger so the user-perceived latency is the slower of the two,
// not the sum. Smaller token budget keeps responses fast (~1-2s typical).

const VALID_ELEMENT_TYPES: ElementType[] = [
  'patio', 'wall', 'garden_bed', 'sod_area', 'edging', 'walkway',
  'driveway', 'retaining_wall', 'fire_pit', 'pool_deck',
  'parking_lot', 'steps_stairs', 'fence', 'pergola', 'outdoor_kitchen',
  'drainage', 'tree_planting', 'shrub_planting', 'irrigation_zone',
  'mulch_area', 'gravel_area', 'concrete_slab', 'curbing', 'other',
];

const VALID_PLACEMENT_HINTS = ['frontyard', 'backyard', 'side', 'perimeter', 'driveway', 'unknown'] as const;

function buildElementInferencePrompt(ctx: RecommendationContext): string {
  const allowedTypes = VALID_ELEMENT_TYPES.join(' | ');
  return `You are a senior landscape estimator. Given a contractor's project description, return the list of physical work elements they intend to install. Each element will be placed on a satellite map of the property and edited visually, so include a coarse spatial hint and a best-guess set of dimensions.

## Project
- Name: "${ctx.description?.slice(0, 200) || ''}"
- Description: "${ctx.description || ''}"
${ctx.projectType ? `- Project type: ${ctx.projectType}` : ''}
${ctx.scopeSize ? `- Scope size: ${ctx.scopeSize}` : ''}
- Address: "${ctx.address}"

## Rules
- Strip demolition phrases. "Demo existing slab" is NOT a slab to build.
- One element per distinct area of work. A 24x18 paver patio is one element. A 12x4 stone stair is a separate element. Edging around the patio is its own element.
- Set dimensions only when the description gives signal. Otherwise return null and let the contractor enter them.
- For \`linearFt\`: walls, fences, edging, drainage, curbing.
- For \`lengthFt\` x \`widthFt\` (and optionally \`areaSqft\`): patios, walkways, driveways, sod, beds, mulch, gravel.
- For \`heightFt\`: walls, fences, pergolas.
- For \`depthIn\`: drainage trenches, base material reads.
- For point/each elements (trees, shrubs, fire pits): use \`areaSqft\` as a rough footprint (e.g., 9 sqft for a fire pit) and set length/width to null.
- \`placementHint\`: where on the property the element typically belongs.
  - "backyard" — patios, decks, fire pits, pool decks behind the house
  - "frontyard" — front walkways, curb-side beds, lawn replacement at the street
  - "side" — side yards, narrow runs, gates
  - "perimeter" — fences, edging that wraps the entire lot
  - "driveway" — driveway extensions, parking pads, motor-court hardscape
  - "unknown" — when the description gives no signal
- Only use \`elementType\` from this allowlist: ${allowedTypes}.
- Don't invent elements not in the description. No more than 8 elements.

Return JSON ONLY (no markdown fencing) matching:
{
  "elements": [
    {
      "name": string,
      "elementType": string,
      "lengthFt": number | null,
      "widthFt": number | null,
      "areaSqft": number | null,
      "linearFt": number | null,
      "heightFt": number | null,
      "depthIn": number | null,
      "placementHint": "frontyard" | "backyard" | "side" | "perimeter" | "driveway" | "unknown",
      "reason": string
    }
  ]
}`;
}

function safeParseElements(raw: string): { elements?: AIElementRecommendation[] } | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned) as { elements?: AIElementRecommendation[] };
  } catch {
    // Retry by trimming to last balanced brace (mirror safeParseRecommendations).
    let depth = 0;
    let lastValidEnd = -1;
    let inString = false;
    let escape = false;
    for (let i = 0; i < cleaned.length; i++) {
      const c = cleaned[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) lastValidEnd = i; }
    }
    if (lastValidEnd > 0) {
      try { return JSON.parse(cleaned.slice(0, lastValidEnd + 1)); } catch { /* fall through */ }
    }
    return null;
  }
}

function validateElements(raw: { elements?: AIElementRecommendation[] } | null): AIElementRecommendation[] {
  if (!raw?.elements || !Array.isArray(raw.elements)) return [];
  const seen = new Set<string>();
  const out: AIElementRecommendation[] = [];
  for (const r of raw.elements) {
    if (!r || typeof r !== 'object') continue;
    const type = (r.elementType as string) ?? '';
    if (!VALID_ELEMENT_TYPES.includes(type as ElementType)) continue;
    const hint = (r.placementHint as string) ?? 'unknown';
    const validHint = (VALID_PLACEMENT_HINTS as readonly string[]).includes(hint)
      ? (hint as AIElementRecommendation['placementHint'])
      : 'unknown';
    // Dedup by (type + name) to drop near-duplicate suggestions.
    const dedupKey = `${type}|${(r.name || '').toLowerCase().trim()}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    out.push({
      name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : type.replace(/_/g, ' '),
      elementType: type as ElementType,
      lengthFt: typeof r.lengthFt === 'number' && r.lengthFt > 0 ? r.lengthFt : null,
      widthFt: typeof r.widthFt === 'number' && r.widthFt > 0 ? r.widthFt : null,
      areaSqft: typeof r.areaSqft === 'number' && r.areaSqft > 0 ? r.areaSqft : null,
      linearFt: typeof r.linearFt === 'number' && r.linearFt > 0 ? r.linearFt : null,
      heightFt: typeof r.heightFt === 'number' && r.heightFt > 0 ? r.heightFt : null,
      depthIn: typeof r.depthIn === 'number' && r.depthIn > 0 ? r.depthIn : null,
      placementHint: validHint,
      reason: typeof r.reason === 'string' ? r.reason : undefined,
    });
    if (out.length >= 8) break;
  }
  return out;
}

/**
 * 3D-in-Wizard. Generates element suggestions for the project canvas. Runs
 * in parallel with the main recommendation call; returns an empty array
 * (not null) on failure so the wizard renders gracefully.
 */
export async function inferElements(ctx: RecommendationContext): Promise<AIElementRecommendation[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return [];
  if (!ctx.description || !ctx.description.trim()) return [];

  try {
    const prompt = buildElementInferencePrompt(ctx);
    // 2048 is plenty — even a busy 8-element response fits in ~1500.
    const raw = await callClaude(prompt, DEFAULT_MODEL, 2048);
    const parsed = safeParseElements(raw);
    return validateElements(parsed);
  } catch (err) {
    console.error('inferElements failed:', err);
    return [];
  }
}
