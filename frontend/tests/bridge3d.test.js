/**
 * @fileoverview Vitest suite validating 3D Manhattan Bridge geometry math functions.
 * Tests:
 * 1. Cable curve (parabolic geometry, endpoints, sag).
 * 2. Hanger count (positive count, vertical clearance between cable and deck).
 * 3. Tower height (total elevation, deck clearance, cross-bracing configuration).
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCableCurve,
  calculateHangerPositions,
  getTowerDimensions
} from '../src/bridge3d.js';

describe('Manhattan Bridge 3D Geometry Specifications', () => {
  // Test 1: Cable curve
  it('calculates smooth parabolic cable curve reaching tower pinnacles and midspan sag', () => {
    const mainSpan = 70;
    const towerTopY = 48;
    const sag = 22;
    const deckY = 12;

    const points = calculateCableCurve({
      mainSpan,
      sideSpan: 25,
      sag,
      towerTopY,
      deckY,
      numPoints: 90
    });

    expect(points.length).toBeGreaterThanOrEqual(50);

    // Midspan point (near x = 0) must be close to the lowest sag point (48 - 22 = 26)
    const midPoint = points.reduce((closest, pt) =>
      Math.abs(pt.x) < Math.abs(closest.x) ? pt : closest
    );
    expect(Math.abs(midPoint.x)).toBeLessThanOrEqual(2);
    expect(midPoint.y).toBeCloseTo(towerTopY - sag, 0.5);

    // Cable at tower positions (-35 and +35) must be at peak towerTopY (48)
    const tower1Pt = points.reduce((closest, pt) =>
      Math.abs(pt.x - -35) < Math.abs(closest.x - -35) ? pt : closest
    );
    const tower2Pt = points.reduce((closest, pt) =>
      Math.abs(pt.x - 35) < Math.abs(closest.x - 35) ? pt : closest
    );

    expect(tower1Pt).toBeDefined();
    expect(tower2Pt).toBeDefined();
    expect(tower1Pt.x).toBeCloseTo(-35, 0.1);
    expect(tower2Pt.x).toBeCloseTo(35, 0.1);
    expect(tower1Pt.y).toBeCloseTo(towerTopY, 0.5);
    expect(tower2Pt.y).toBeCloseTo(towerTopY, 0.5);

    // Cable endpoints at anchorages must reach deck level
    expect(points[0].y).toBeCloseTo(deckY, 1);
    expect(points[points.length - 1].y).toBeCloseTo(deckY, 1);
  });

  // Test 2: Hanger count
  it('generates correct vertical hanger count across suspension span with valid clearances', () => {
    const hangers = calculateHangerPositions({
      mainSpan: 70,
      towerTopY: 48,
      deckY: 12,
      sag: 22,
      spacing: 2.5,
      cableZOffsets: [-7, 7]
    });

    // 2 cables per hanger station, spaced at 2.5 along 70m span (approx 26-27 stations * 2 = 50-54 hangers)
    expect(hangers.length).toBeGreaterThan(40);
    expect(hangers.length).toBeLessThan(70);

    // Every hanger must have positive height and connect above deck
    hangers.forEach((h) => {
      expect(h.height).toBeGreaterThan(0.5);
      expect(h.topY).toBeGreaterThan(h.bottomY);
      expect(h.bottomY).toBeCloseTo(12.6, 0.5);
      expect(Math.abs(h.z)).toBe(7);
    });
  });

  // Test 3: Tower height
  it('defines tower dimensions with authentic structural height and deck clearance', () => {
    const dims = getTowerDimensions();

    expect(dims.totalHeight).toBe(48);
    expect(dims.deckClearance).toBe(12);
    expect(dims.totalHeight).toBeGreaterThan(dims.deckClearance);

    // Tower legs and X-bracing bays
    expect(dims.crossBracingCount).toBe(4);
    expect(dims.legSpacing).toBeGreaterThan(dims.legWidth);
    expect(dims.pierHeight).toBe(4);
  });
});
