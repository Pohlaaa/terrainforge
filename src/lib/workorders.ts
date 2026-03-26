/**
 * Work Order Generation Engine
 */

import type { Zone, Material, WorkOrderStep } from '@/types';

export function generateSteps(zone: Zone, materials: Material[]): WorkOrderStep[] {
  const zoneMats = zone.materials
    .map((zm) => materials.find((m) => m.id === zm.materialId))
    .filter((m): m is Material => m !== undefined);

  const has = (cat: string) => zoneMats.some((m) => m.category === cat);
  const hasAny = (...cats: string[]) => cats.some((c) => has(c));

  const steps: WorkOrderStep[] = [];
  let n = 1;
  const add = (text: string) => { steps.push({ n: n++, text }); };

  add(`Confirm zone boundary for "${zone.name}". Stake and string perimeter. Verify area: ${zone.area.toLocaleString()} sq ft${zone.perimeter ? ', perimeter: ' + zone.perimeter + ' ln ft' : ''}.`);
  if (zone.dependencies && zone.dependencies.length > 0) {
    add(`Do not begin until dependent zones are complete: ${zone.dependencies.join(', ')}.`);
  }

  if (hasAny('concrete', 'paver', 'stone', 'brick')) {
    add(`Excavate zone to required depth (6–8" for pavers, 4" for concrete). Remove all organic material and debris.`);
    add(`Install and compact gravel sub-base. Minimum 4" depth, 3 passes with plate compactor. Verify 2% drainage slope away from structures.`);
  }

  if (has('sand')) {
    add(`Spread and screed 1" bedding sand layer using screed rails. Verify consistent level surface before proceeding.`);
  }

  if (hasAny('paver', 'stone', 'brick')) {
    add(`Dry-lay pavers per specified pattern. Start from fixed corner or centerline. Cut edge units with wet saw — reference cut diagram.`);
    add(`Compact laid pavers with plate compactor (2 passes). Check level throughout. Re-adjust any rocking units.`);
    add(`Sweep polymeric sand into joints. Compact again and re-sweep until joints are fully filled. Mist with water to activate binder. Keep off until cured.`);
  }

  if (has('concrete')) {
    add(`Set forms to finished grade. Verify slope and square corners before pour.`);
    add(`Pour concrete, screed to grade. Float surface. Tool control joints every 8–10 ft. Apply broom finish. Cure 24 hours minimum.`);
  }

  if (has('edging')) {
    add(`Install landscape edging along full perimeter (${zone.perimeter || '—'} ln ft). Drive stakes every 3 ft. Overlap joints 6 inches.`);
  }

  if (has('gravel')) {
    add(`Install weed barrier fabric before gravel. Overlap seams 6" and pin every 24".`);
    add(`Spread gravel to specified depth. Rake level. Maintain 2" clearance from plant stems and structures.`);
  }

  if (hasAny('mulch', 'soil')) {
    add(`Apply mulch/soil amendment to ${zone.area.toLocaleString()} sq ft. Target 2–3" depth. Keep 3" clear of plant crowns, 6" from structures.`);
  }

  if (has('sod')) {
    add(`Grade and till soil to 4" depth. Apply starter fertilizer at broadcast rate before sod install.`);
    add(`Lay sod in staggered rows. Butt edges tight — no gaps, no overlaps. Cut with sod knife at edges.`);
    add(`Roll sod with water-filled roller immediately after laying. Water: minimum 30-minute soak. Flag area — no foot traffic for 2 weeks.`);
  }

  if (has('seed')) {
    add(`Prepare seedbed per specification. Broadcast seed at rate specified. Rake lightly and apply straw mulch cover. Water gently — keep moist until germination.`);
  }

  if (hasAny('plant', 'shrub', 'tree')) {
    add(`Place plants per layout diagram before digging. Step back and confirm spacing and visual composition.`);
    add(`Dig planting holes 2× width of root ball, same depth as container. Score hole sides to prevent glazing.`);
    add(`Set plants, backfill with native soil, firm gently. Build 3" watering basin around base. Water thoroughly at install. Apply mulch ring after.`);
  }

  if (has('irrigation')) {
    add(`Install irrigation heads/drip lines per irrigation plan. Flush lines before capping. Test all zones from controller before backfilling.`);
  }

  if (has('lighting')) {
    add(`Run low-voltage cable before final surface layer. Staple every 12", leave 12" slack at fixture locations. Install fixtures, test all circuits from transformer before burying.`);
  }

  add(`Final inspection: verify all materials placed, edges clean, no debris left in zone. Photograph completed zone and upload to project record.`);

  return steps;
}
