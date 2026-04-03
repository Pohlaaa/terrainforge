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

  // Validate materials — match against org library
  const materials: AIMaterialRecommendation[] = (raw.materials || []).map((m) => {
    // Try to find by ID first, then by name
    const byId = m.materialId ? materialMap.get(m.materialId) : undefined;
    const byName = !byId ? materialNameMap.get(m.materialName.toLowerCase()) : undefined;
    const match = byId || byName;

    if (match) {
      return {
        ...m,
        materialId: match.id,
        unitCost: match.cost,
        inLibrary: true,
      };
    }
    return { ...m, materialId: null, inLibrary: false };
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
export async function generateProjectRecommendations(
  ctx: RecommendationContext
): Promise<AIRecommendationSet | null> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return null;

  try {
    const prompt = buildPrompt(ctx);
    const raw = await callClaude(prompt, DEFAULT_MODEL, 4096);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as AIRecommendationSet;

    const validated = validateAndEnrich(parsed, ctx);
    const enriched = enrichAvailability(validated, ctx);

    return enriched;
  } catch (err) {
    console.error('AI recommendation generation failed:', err);
    return null;
  }
}
