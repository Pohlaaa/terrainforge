import { describe, it, expect } from 'vitest';
import { aiCenterToTopLeft } from './planLayout';
import type { ElementGeometry } from '@/types';

// F-PLAC-03 regression suite. The bug: Sprint AI-Place wrote the AI's
// returned center coord straight into ElementGeometry.position, which the
// renderer treats as the unrotated top-left. Result: every AI-placed
// element drifted south-east by half its extent. These tests guard
// the center→top-left conversion across every shape kind.

const makeGeom = (
  shape: ElementGeometry['shape'],
  position = { x: 0, y: 0 },
): ElementGeometry => ({ position, rotation: 0, shape });

describe('aiCenterToTopLeft', () => {
  it('rectangle — subtracts half-width and half-height', () => {
    const geom = makeGeom({ kind: 'rectangle', width: 24, height: 18 });
    const result = aiCenterToTopLeft({ x: 0, y: 30 }, geom);
    expect(result).toEqual({ x: -12, y: 21 });
  });

  it('rectangle — bbox center after applying position lands on AI center', () => {
    const center = { x: 50, y: -20 };
    const geom = makeGeom({ kind: 'rectangle', width: 16, height: 12 });
    const topLeft = aiCenterToTopLeft(center, geom);
    // Renderer math: position + (width/2, height/2) → center
    expect(topLeft.x + 16 / 2).toBe(center.x);
    expect(topLeft.y + 12 / 2).toBe(center.y);
  });

  it('circle — subtracts radius from both axes', () => {
    const geom = makeGeom({ kind: 'circle', radius: 5 });
    const result = aiCenterToTopLeft({ x: 0, y: 0 }, geom);
    expect(result).toEqual({ x: -5, y: -5 });
  });

  it('circle — bbox center after applying position lands on AI center', () => {
    const center = { x: 100, y: 50 };
    const geom = makeGeom({ kind: 'circle', radius: 8 });
    const topLeft = aiCenterToTopLeft(center, geom);
    expect(topLeft.x + 8).toBe(center.x);
    expect(topLeft.y + 8).toBe(center.y);
  });

  it('line — subtracts half-length and the 1ft strip half-height', () => {
    const geom = makeGeom({ kind: 'line', length: 60 });
    const result = aiCenterToTopLeft({ x: -20, y: 35 }, geom);
    expect(result).toEqual({ x: -50, y: 35 }); // 35 - 0.5 = 34.5 → rounds to 35
  });

  it('polygon centered around (0,0) — subtracts zero offset', () => {
    const geom = makeGeom({
      kind: 'polygon',
      points: [
        { x: -5, y: -5 },
        { x: 5, y: -5 },
        { x: 5, y: 5 },
        { x: -5, y: 5 },
      ],
    });
    const result = aiCenterToTopLeft({ x: 100, y: 100 }, geom);
    expect(result).toEqual({ x: 100, y: 100 });
  });

  it('polygon offset from origin — accounts for local bbox center', () => {
    // Polygon with local bbox center at (10, 10)
    const geom = makeGeom({
      kind: 'polygon',
      points: [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
        { x: 15, y: 15 },
        { x: 5, y: 15 },
      ],
    });
    const result = aiCenterToTopLeft({ x: 100, y: 100 }, geom);
    // position = aiCenter - localCenter = (100 - 10, 100 - 10)
    expect(result).toEqual({ x: 90, y: 90 });
    // Sanity: position + localCenter should equal AI center
    expect(result.x + 10).toBe(100);
    expect(result.y + 10).toBe(100);
  });

  it('rounds to nearest foot for stable persistence', () => {
    const geom = makeGeom({ kind: 'rectangle', width: 7, height: 5 });
    const result = aiCenterToTopLeft({ x: 0.4, y: 0.6 }, geom);
    // 0.4 - 3.5 = -3.1 → -3
    // 0.6 - 2.5 = -1.9 → -2
    expect(result).toEqual({ x: -3, y: -2 });
  });

  it('polygon with only 2 points falls back to (center.x, center.y)', () => {
    // Defensive: invalid polygon (2 points) — helper treats localCenter as 0
    // so result equals the center coord. Wizard wouldn't normally hit this.
    const geom = makeGeom({
      kind: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    });
    const result = aiCenterToTopLeft({ x: 50, y: 50 }, geom);
    expect(result).toEqual({ x: 50, y: 50 });
  });
});
