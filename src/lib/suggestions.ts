/**
 * Suggestion Engines
 */

import type { Material, Zone, Equipment, CrewMember } from '@/types';
import { ZONE_EQUIP_RULES, EQUIP_CERT_MAP } from './constants';
import { getCrewCertAlerts } from './alerts';

/**
 * @deprecated Zone-based material suggestions are legacy. The new material flow is project-level.
 * This function is kept for reference only and is not used by current components.
 */
export function suggestMaterials(zoneName: string, materialLibrary: Material[]): Material[] {
  const nameWords = zoneName.toLowerCase().split(/\s+/);

  const ZONE_KEYWORD_MAP: Record<string, string[]> = {
    patio: ['paver', 'stone', 'brick', 'sand', 'edging'],
    paver: ['paver', 'stone', 'sand', 'edging'],
    hardscape: ['paver', 'stone', 'brick', 'concrete', 'edging'],
    lawn: ['sod', 'seed', 'soil', 'mulch'],
    garden: ['plant', 'shrub', 'soil', 'mulch'],
    planting: ['plant', 'shrub', 'tree', 'soil', 'mulch'],
    concrete: ['concrete', 'sand', 'gravel'],
  };

  const suggestedCats = new Set<string>();

  nameWords.forEach((word: string) => {
    Object.entries(ZONE_KEYWORD_MAP).forEach(([keyword, cats]: [string, string[]]) => {
      if (keyword.includes(word) || word.includes(keyword)) {
        cats.forEach((c: string) => suggestedCats.add(c));
      }
    });
  });

  return materialLibrary.filter((m) => suggestedCats.has(m.category));
}

/**
 * @deprecated Zone-based equipment scoring is legacy. Not used by current components.
 */
export function scoreEquipment(equipment: Equipment, zone: Zone, zoneMaterials: Material[]): number {
  let score = 0;
  const zoneName = zone.name.toLowerCase();
  const matCats = zoneMaterials.map((m) => m.category);
  const caps = equipment.capabilities || [];

  ZONE_EQUIP_RULES.forEach((rule: { keywords: string[]; matCats: string[]; caps: string[] }) => {
    const nameMatch = rule.keywords.some((kw) => zoneName.includes(kw));
    const matMatch = rule.matCats.some((cat) => matCats.includes(cat));

    if (nameMatch || matMatch) {
      const capMatches = rule.caps.filter((c) => caps.includes(c)).length;
      if (capMatches > 0) {
        score += capMatches * 2 + (nameMatch ? 1 : 0) + (matMatch ? 1 : 0);
      }
    }
  });

  if (equipment.status === 'available') score += 1;
  if (equipment.status === 'in-use') score -= 1;
  if (equipment.status === 'maintenance') score -= 3;
  if (equipment.status === 'out-of-service') score -= 10;

  return score;
}

/**
 * @deprecated Zone-based equipment suggestions are legacy. Not used by current components.
 */
export function suggestEquipment(
  zone: Zone,
  equipmentFleet: Equipment[],
  zoneMaterials: Material[]
): { equipment: Equipment; score: number }[] {
  const scored = equipmentFleet
    .map((eq) => ({ equipment: eq, score: scoreEquipment(eq, zone, zoneMaterials) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
}

export function getCertifiedCrew(
  equipmentType: string,
  crew: CrewMember[]
): { member: CrewMember; hasCert: boolean; certAlerts: { level: string; msg: string }[] }[] {
  const certDefs = EQUIP_CERT_MAP.filter((c) => c.equipType === equipmentType);
  const certIds = certDefs.map((c) => c.certId);

  return crew
    .map((member) => {
      const hasCert = certIds.length === 0 || certIds.some((cid) => (member.certs || []).find((c) => c.certId === cid));
      const certAlerts = getCrewCertAlerts(member);
      return { member, hasCert, certAlerts };
    })
    .sort((a, b) => (b.hasCert ? 1 : 0) - (a.hasCert ? 1 : 0));
}
