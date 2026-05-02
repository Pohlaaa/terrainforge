import { describe, it, expect } from 'vitest';
import { aiCenterToTopLeft, elementVisualCenter, applyDimensionEditToGeometry } from './planLayout';
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

describe('elementVisualCenter', () => {
  it('rectangle — adds half-width and half-height to position', () => {
    const geom = makeGeom({ kind: 'rectangle', width: 24, height: 18 }, { x: -12, y: 21 });
    expect(elementVisualCenter(geom)).toEqual({ x: 0, y: 30 });
  });

  it('circle — adds radius to position on both axes', () => {
    const geom = makeGeom({ kind: 'circle', radius: 5 }, { x: -5, y: -5 });
    expect(elementVisualCenter(geom)).toEqual({ x: 0, y: 0 });
  });

  it('polygon — uses local bbox midpoint + position offset', () => {
    const geom = makeGeom(
      {
        kind: 'polygon',
        points: [
          { x: 5, y: 5 },
          { x: 15, y: 5 },
          { x: 15, y: 15 },
          { x: 5, y: 15 },
        ],
      },
      { x: 90, y: 90 },
    );
    expect(elementVisualCenter(geom)).toEqual({ x: 100, y: 100 });
  });

  it('round-trips with aiCenterToTopLeft for any shape', () => {
    const center = { x: 42, y: -17 };
    const geom = makeGeom({ kind: 'rectangle', width: 10, height: 7 });
    const topLeft = aiCenterToTopLeft(center, geom);
    const placed: ElementGeometry = { ...geom, position: topLeft };
    const recovered = elementVisualCenter(placed);
    // Allow ±1 because aiCenterToTopLeft rounds (visual center recovers
    // exactly only on integer-half dimensions; 7/2 = 3.5 → rounds to 4)
    expect(Math.abs(recovered.x - center.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(recovered.y - center.y)).toBeLessThanOrEqual(0.5);
  });
});

describe('F-PLAC-04 dimension edit re-anchors to visual center', () => {
  // Simulates what the wizard does when the contractor types a new
  // length/width into the sheet: rebuild the rectangle shape, recompute
  // top-left so the visual CENTER stays where it was.
  function reAnchor(
    oldGeom: ElementGeometry,
    newWidth: number,
    newHeight: number,
  ): ElementGeometry {
    const oldCenter = elementVisualCenter(oldGeom);
    return {
      ...oldGeom,
      shape: { kind: 'rectangle', width: newWidth, height: newHeight },
      position: {
        x: Math.round(oldCenter.x - newWidth / 2),
        y: Math.round(oldCenter.y - newHeight / 2),
      },
    };
  }

  it('grows a patio symmetrically around its center, not toward the SE', () => {
    // Patio at (-12, 21), 24×18 → visual center (0, 30)
    const before: ElementGeometry = {
      position: { x: -12, y: 21 },
      rotation: 0,
      shape: { kind: 'rectangle', width: 24, height: 18 },
    };
    expect(elementVisualCenter(before)).toEqual({ x: 0, y: 30 });

    // Contractor edits to 36×24 → visual center MUST stay at (0, 30)
    const after = reAnchor(before, 36, 24);
    expect(after.position).toEqual({ x: -18, y: 18 });
    expect(elementVisualCenter(after)).toEqual({ x: 0, y: 30 });
  });

  it('shrinking a patio also keeps the visual center fixed', () => {
    const before: ElementGeometry = {
      position: { x: 100, y: 100 },
      rotation: 0,
      shape: { kind: 'rectangle', width: 40, height: 20 },
    };
    const center = elementVisualCenter(before); // (120, 110)
    const after = reAnchor(before, 10, 10);
    expect(elementVisualCenter(after)).toEqual(center);
  });
});

describe('applyDimensionEditToGeometry', () => {
  it('returns null when geometry is null', () => {
    expect(
      applyDimensionEditToGeometry(null, { lengthFt: 10, widthFt: 5, linearFt: null }, { lengthFt: 12 }),
    ).toBeNull();
  });

  it('returns null when no dim field changed', () => {
    const geom = makeGeom({ kind: 'rectangle', width: 24, height: 18 });
    const result = applyDimensionEditToGeometry(
      geom,
      { lengthFt: 24, widthFt: 18, linearFt: null },
      { lengthFt: 24 },
    );
    expect(result).toBeNull();
  });

  it('rectangle — both lengthFt and widthFt edited together', () => {
    const before: ElementGeometry = {
      position: { x: -12, y: 21 },
      rotation: 0,
      shape: { kind: 'rectangle', width: 24, height: 18 },
    };
    const result = applyDimensionEditToGeometry(
      before,
      { lengthFt: 24, widthFt: 18, linearFt: null },
      { lengthFt: 36, widthFt: 24 },
    );
    expect(result).not.toBeNull();
    expect(result!.shape).toEqual({ kind: 'rectangle', width: 36, height: 24 });
    expect(elementVisualCenter(result!)).toEqual({ x: 0, y: 30 });
  });

  it('rectangle — only lengthFt edited, widthFt taken from old dims', () => {
    const before: ElementGeometry = {
      position: { x: 0, y: 0 },
      rotation: 0,
      shape: { kind: 'rectangle', width: 10, height: 5 },
    };
    const result = applyDimensionEditToGeometry(
      before,
      { lengthFt: 10, widthFt: 5, linearFt: null },
      { lengthFt: 20 },
    );
    expect(result!.shape).toEqual({ kind: 'rectangle', width: 20, height: 5 });
    expect(elementVisualCenter(result!)).toEqual(elementVisualCenter(before));
  });

  it('linear-only edit (edging) keeps the long-axis orientation', () => {
    const before: ElementGeometry = {
      position: { x: -30, y: 35 },
      rotation: 0,
      shape: { kind: 'rectangle', width: 60, height: 1 },
    };
    const result = applyDimensionEditToGeometry(
      before,
      { lengthFt: null, widthFt: null, linearFt: 60 },
      { linearFt: 80 },
    );
    expect(result!.shape).toEqual({ kind: 'rectangle', width: 80, height: 1 });
    expect(elementVisualCenter(result!)).toEqual(elementVisualCenter(before));
  });

  it('circle — radiusFt edited keeps visual center fixed', () => {
    const before: ElementGeometry = {
      position: { x: 95, y: 95 },
      rotation: 0,
      shape: { kind: 'circle', radius: 5 },
    };
    const result = applyDimensionEditToGeometry(
      before,
      { lengthFt: null, widthFt: null, linearFt: null, radiusFt: 5 },
      { radiusFt: 8 },
    );
    expect(result!.shape).toEqual({ kind: 'circle', radius: 8 });
    expect(elementVisualCenter(result!)).toEqual({ x: 100, y: 100 });
  });

  it('polygon — preserved (vertex drag is the right edit primitive)', () => {
    const before: ElementGeometry = {
      position: { x: 0, y: 0 },
      rotation: 0,
      shape: { kind: 'polygon', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }, { x: 0, y: 5 }] },
    };
    const result = applyDimensionEditToGeometry(
      before,
      { lengthFt: null, widthFt: null, linearFt: null },
      { lengthFt: 10 },
    );
    expect(result).toBeNull();
  });
});
