import { describe, it, expect } from 'vitest';
import {
  cuftToCuyd,
  areaToCuft,
  areaToCuyd,
  cuydToTons,
  roundToPurchaseUnit,
  applyWaste,
  gridCount,
  wallBlockCount,
  getEffectiveDepth,
  polygonAreaSqft,
  polygonPerimeterFt,
  DEPTH_MINIMUMS,
  DEFAULT_DEPTH_INCHES,
} from './unit-conversions';

/**
 * Sprint U: Unit-level tests for the volume / coverage / waste / spacing
 * primitives. These functions are the foundation of all 6 computation models;
 * any drift here breaks materials accuracy across every project.
 */

describe('cuftToCuyd', () => {
  it('converts 27 cuft to exactly 1 cuyd', () => {
    expect(cuftToCuyd(27)).toBe(1);
  });
  it('handles zero', () => {
    expect(cuftToCuyd(0)).toBe(0);
  });
  it('returns fraction for partial cubic yards', () => {
    expect(cuftToCuyd(54)).toBeCloseTo(2);
    expect(cuftToCuyd(13.5)).toBeCloseTo(0.5);
  });
});

describe('areaToCuft', () => {
  it('100 sqft × 6 inches → 50 cuft (industry-standard 6" gravel base)', () => {
    expect(areaToCuft(100, 6)).toBe(50);
  });
  it('zero depth returns 0', () => {
    expect(areaToCuft(500, 0)).toBe(0);
  });
  it('zero area returns 0', () => {
    expect(areaToCuft(0, 12)).toBe(0);
  });
});

describe('areaToCuyd (the foundational AREA_COVERAGE math)', () => {
  it('324 sqft × 1 inch = 1 cuyd (industry standard divisor)', () => {
    // 324 sqft × 1/12 ft = 27 cuft = 1 cuyd
    expect(areaToCuyd(324, 1)).toBeCloseTo(1, 5);
  });
  it('432 sqft patio × 6" base depth = 8 cuyd of base rock', () => {
    expect(areaToCuyd(432, 6)).toBeCloseTo(8, 5);
  });
  it('200 sqft mulch bed × 3" depth = ~1.85 cuyd', () => {
    expect(areaToCuyd(200, 3)).toBeCloseTo(50 / 27, 5);
  });
});

describe('cuydToTons', () => {
  it('uses 1.5 default density', () => {
    expect(cuydToTons(2)).toBe(3);
  });
  it('respects custom density', () => {
    expect(cuydToTons(2, 1.4)).toBeCloseTo(2.8);
  });
  it('handles zero', () => {
    expect(cuydToTons(0)).toBe(0);
  });
});

describe('roundToPurchaseUnit', () => {
  it('rounds bulk cubic_yard to nearest 0.5 (up)', () => {
    expect(roundToPurchaseUnit(2.1, 'cubic_yard')).toBe(2.5);
    expect(roundToPurchaseUnit(2.6, 'cubic_yard')).toBe(3);
    expect(roundToPurchaseUnit(2.0, 'cubic_yard')).toBe(2);
  });
  it('rounds bulk ton to nearest 0.5', () => {
    expect(roundToPurchaseUnit(3.3, 'ton')).toBe(3.5);
  });
  it('cuyd alias works the same as cubic_yard', () => {
    expect(roundToPurchaseUnit(1.7, 'cuyd')).toBe(2);
  });
  it('non-bulk units round up to whole numbers', () => {
    expect(roundToPurchaseUnit(11.2, 'each')).toBe(12);
    expect(roundToPurchaseUnit(11.0, 'each')).toBe(11);
    expect(roundToPurchaseUnit(0.4, 'bag')).toBe(1);
    expect(roundToPurchaseUnit(7.8, 'pallet')).toBe(8);
  });
  it('zero input returns 0 regardless of unit', () => {
    expect(roundToPurchaseUnit(0, 'cubic_yard')).toBe(0);
    expect(roundToPurchaseUnit(0, 'each')).toBe(0);
  });
  it('negative input is clamped to 0 (defensive)', () => {
    expect(roundToPurchaseUnit(-3, 'each')).toBe(0);
  });
});

describe('applyWaste', () => {
  it('5% waste adds 5% buffer (default in catalog)', () => {
    expect(applyWaste(100, 0.05)).toBeCloseTo(105);
  });
  it('zero waste passes through unchanged', () => {
    expect(applyWaste(42, 0)).toBe(42);
  });
  it('10% waste matches paver-typical buffer', () => {
    expect(applyWaste(200, 0.1)).toBeCloseTo(220, 5);
  });
});

describe('gridCount (POINT_SPACING)', () => {
  it('100 sqft @ 24" spacing → 25 plants (4 sqft per cell)', () => {
    expect(gridCount(100, 24)).toBe(25);
  });
  it('60 sqft @ 36" spacing → 7 plants (rounds up)', () => {
    // 36" = 3 ft → 9 sqft per cell. 60/9 = 6.67 → ceil 7
    expect(gridCount(60, 36)).toBe(7);
  });
  it('zero spacing returns 0 (defensive — would otherwise divide by 0)', () => {
    expect(gridCount(100, 0)).toBe(0);
  });
  it('negative spacing returns 0', () => {
    expect(gridCount(100, -12)).toBe(0);
  });
});

describe('wallBlockCount (LINEAR_DEPTH)', () => {
  it('20 ft × 3 ft wall with 0.5 sqft block face → 120 blocks', () => {
    expect(wallBlockCount(20, 3, 0.5)).toBe(120);
  });
  it('rounds up partial blocks', () => {
    expect(wallBlockCount(10, 2, 0.6)).toBe(34);
  });
  it('zero face area returns 0 (defensive)', () => {
    expect(wallBlockCount(20, 3, 0)).toBe(0);
  });
});

describe('polygonAreaSqft (Shoelace formula, mig 034)', () => {
  it('10×10 square as a polygon = 100 sqft', () => {
    expect(polygonAreaSqft([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])).toBe(100);
  });

  it('right triangle (base 6, height 8) = 24 sqft', () => {
    expect(polygonAreaSqft([
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 8 },
    ])).toBe(24);
  });

  it('returns 0 for fewer than 3 points', () => {
    expect(polygonAreaSqft([])).toBe(0);
    expect(polygonAreaSqft([{ x: 0, y: 0 }])).toBe(0);
    expect(polygonAreaSqft([{ x: 0, y: 0 }, { x: 5, y: 5 }])).toBe(0);
  });

  it('produces the same area regardless of winding order', () => {
    const cw = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
    ];
    const ccw = [...cw].reverse();
    expect(polygonAreaSqft(cw)).toBe(polygonAreaSqft(ccw));
    expect(polygonAreaSqft(cw)).toBe(100);
  });

  it('handles an L-shape patio (6 vertices) correctly', () => {
    // 12×12 square with a 4×4 notch in the bottom-right corner.
    // Total = 12*12 - 4*4 = 144 - 16 = 128 sqft.
    expect(polygonAreaSqft([
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 4 },
      { x: 12, y: 4 },
      { x: 12, y: 12 },
      { x: 0, y: 12 },
    ])).toBe(128);
  });
});

describe('polygonPerimeterFt', () => {
  it('10×10 square = 40 ft perimeter', () => {
    expect(polygonPerimeterFt([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])).toBe(40);
  });

  it('returns 0 for fewer than 2 points', () => {
    expect(polygonPerimeterFt([])).toBe(0);
    expect(polygonPerimeterFt([{ x: 0, y: 0 }])).toBe(0);
  });

  it('open path (2 points) returns the closing segment too — full polygon perimeter', () => {
    // A 2-point segment closes back on itself, so perimeter is 2 × distance.
    expect(polygonPerimeterFt([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ])).toBe(10); // 5 + 5 = 10
  });

  it('right triangle (3-4-5) = 12 ft', () => {
    expect(polygonPerimeterFt([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 4 },
    ])).toBeCloseTo(12, 5);
  });
});

describe('getEffectiveDepth (category minimums)', () => {
  it('enforces 6" gravel minimum even when user enters less', () => {
    expect(getEffectiveDepth(3, 'gravel')).toBe(6);
  });
  it('respects user-entered value when above minimum', () => {
    expect(getEffectiveDepth(8, 'gravel')).toBe(8);
  });
  it('falls through to default when category unknown', () => {
    expect(getEffectiveDepth(undefined, 'mystery')).toBe(DEFAULT_DEPTH_INCHES);
  });
  it('mulch minimum is 2"', () => {
    expect(getEffectiveDepth(0, 'mulch')).toBe(DEPTH_MINIMUMS.mulch);
  });
  it('soil minimum is 3"', () => {
    expect(getEffectiveDepth(null, 'soil')).toBe(DEPTH_MINIMUMS.soil);
  });
  it('case-insensitive category lookup', () => {
    expect(getEffectiveDepth(2, 'GRAVEL')).toBe(6);
  });
});
