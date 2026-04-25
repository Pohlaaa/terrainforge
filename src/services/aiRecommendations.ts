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
  CrewMember,
  Equipment,
  Material,
  ProjectCrewAssignment,
  ScheduleEntry,
  ProjectListItem,
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
    let coercedUnit = m.unit;
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
