import { describe, expect, it } from 'vitest';
import { DICE_TYPES, type DiceType, type FairnessResult } from '../../types/dice';
import { fairnessResult } from '../statistics';
import { deviationColor, NEUTRAL_HEX } from './colors';
import { getDieGeometry, oppositeSlot } from './geometry';
import { D20_CLOCKWISE, defaultLayout, dieLabels, handedness, isValidLayout, neighbourSlotsCCW, oppositePairsHold, swapLabels } from './layout';
import { estimateWeight, shouldShowArrow } from './weightDirection';
import { dot, length, sub } from './vec';

describe('geometry', () => {
  it.each(DICE_TYPES)('D%i has one slot per side', (s) => {
    const g = getDieGeometry(s);
    expect(g.slotDirections).toHaveLength(s);
    expect(g.slotAnchors).toHaveLength(s);
    expect(g.faces).toHaveLength(s);
  });

  it.each(DICE_TYPES)('D%i face polygons are planar, outward-wound and convex-consistent', (s) => {
    const g = getDieGeometry(s);
    g.faces.forEach((f) => {
      const pts = f.map((i) => g.vertices[i]);
      const n = (() => {
        // plane through first three points
        const a = sub(pts[1], pts[0]), b = sub(pts[2], pts[0]);
        const c: [number, number, number] = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
        const l = length(c);
        return [c[0]/l, c[1]/l, c[2]/l] as [number, number, number];
      })();
      const d0 = dot(n, pts[0]);
      pts.forEach((p) => expect(Math.abs(dot(n, p) - d0)).toBeLessThan(1e-6)); // planar
      expect(d0).toBeGreaterThan(0); // winding is counter-clockwise from outside
    });
  });

  it.each(DICE_TYPES)('D%i slot directions are unit length and sum to ~zero', (s) => {
    const g = getDieGeometry(s);
    g.slotDirections.forEach((d) => expect(length(d)).toBeCloseTo(1, 6));
    const sum = g.slotDirections.reduce((a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]], [0,0,0]);
    expect(length(sum as [number, number, number])).toBeLessThan(1e-6);
  });

  it.each([6, 8, 10, 12, 20] as DiceType[])('D%i: every face has exactly one opposite', (s) => {
    const g = getDieGeometry(s);
    for (let i = 0; i < s; i++) {
      const o = oppositeSlot(g, i);
      expect(o).not.toBeNull();
      expect(oppositeSlot(g, o!)).toBe(i);
    }
  });

  it('D4 has no opposite slots', () => expect(oppositeSlot(getDieGeometry(4), 0)).toBeNull());
});

describe('default layouts', () => {
  it.each(DICE_TYPES)('D%i default is a valid permutation of its labels', (s) => {
    expect(isValidLayout(s, defaultLayout(s))).toBe(true);
  });
  it.each(DICE_TYPES)('D%i default honours the opposite-pair sum', (s) => {
    expect(oppositePairsHold(s, defaultLayout(s))).toBe(true);
  });
  it('D6 is right-handed: 1, 2, 3 run counter-clockwise about their shared vertex', () => {
    const l = defaultLayout(6);
    const slot = (n: number) => l.indexOf(n);
    expect(handedness(6, slot(1), slot(2), slot(3))).toBeGreaterThan(0);
  });
  it('D10 is labelled 0-9 and opposite faces sum to 9', () => {
    expect(dieLabels(10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('editing', () => {
  it('swapLabels keeps a permutation and moves exactly two numbers', () => {
    const l = defaultLayout(20);
    const next = swapLabels(l, 3, 17);
    expect(isValidLayout(20, next)).toBe(true);
    expect(next.filter((v, i) => v !== l[i])).toHaveLength(2);
    expect(next[l.indexOf(3)]).toBe(17);
    expect(next[l.indexOf(17)]).toBe(3);
  });
  it('swapping a number with itself changes nothing', () => {
    const l = defaultLayout(8);
    expect(swapLabels(l, 5, 5)).toEqual(l);
  });
});

describe('weight direction', () => {
  const countsOf = (sides: DiceType, over: Record<number, number>) => {
    const c: Record<number, number> = {};
    dieLabels(sides).forEach((l) => (c[l] = 50));
    return { ...c, ...over };
  };

  it('is null for balanced data', () => {
    expect(estimateWeight(countsOf(6, {}), defaultLayout(6), 6).direction).toBeNull();
  });

  it('is null with no rolls', () => {
    expect(estimateWeight({}, defaultLayout(6), 6).direction).toBeNull();
  });

  it('D6: an over-represented face puts the weight on the opposite side', () => {
    const layout = defaultLayout(6);
    const g = getDieGeometry(6);
    const six = g.slotDirections[layout.indexOf(6)];
    const e = estimateWeight(countsOf(6, { 6: 80, 1: 20 }), layout, 6);
    expect(dot(e.direction!, six)).toBeCloseTo(-1, 6); // opposite to face 6, i.e. toward face 1
    const one = g.slotDirections[layout.indexOf(1)];
    expect(dot(e.direction!, one)).toBeCloseTo(1, 6);
  });

  it('under-represented face pulls the weight toward itself', () => {
    const layout = defaultLayout(6);
    const g = getDieGeometry(6);
    const e = estimateWeight(countsOf(6, { 2: 20, 5: 80 }), layout, 6);
    // face 2 starved → weight toward face 2 (and away from over-full face 5, same axis)
    expect(dot(e.direction!, g.slotDirections[layout.indexOf(2)])).toBeCloseTo(1, 6);
  });

  it('is unchanged when every count is shifted equally', () => {
    const layout = defaultLayout(20);
    const base = Object.fromEntries(dieLabels(20).map((l) => [l, 10 + (l % 3)]));
    const shifted = Object.fromEntries(dieLabels(20).map((l) => [l, 40 + (l % 3)]));
    const a = estimateWeight(base, layout, 20).direction!;
    const b = estimateWeight(shifted, layout, 20).direction!;
    for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 6);
  });

  it('D4 uses the up-pointing vertex as the outcome direction', () => {
    const layout = defaultLayout(4);
    const g = getDieGeometry(4);
    const e = estimateWeight({ 1: 10, 2: 10, 3: 10, 4: 70 }, layout, 4);
    expect(dot(e.direction!, g.slotDirections[layout.indexOf(4)])).toBeCloseTo(-1, 6);
  });

  it('D10 works in 0-9 label space', () => {
    const layout = defaultLayout(10);
    const g = getDieGeometry(10);
    const e = estimateWeight(countsOf(10, { 0: 90 }), layout, 10);
    const zero = g.slotDirections[layout.indexOf(0)];
    expect(dot(e.direction!, zero)).toBeLessThan(-0.3);
  });
});

describe('arrow gating', () => {
  const rolls = (n: number, face: number, sides: DiceType) =>
    [...Array(n).fill(face), ...dieLabels(sides).map((l) => (l === 0 ? 10 : l))];

  it('no arrow below the sample-size gate', () => {
    const f = fairnessResult(rolls(10, 6, 6), 6);
    expect(f.assessment).toBe('insufficient-data');
    expect(shouldShowArrow(f, { direction: [1, 0, 0], strength: 1 })).toBe(false);
  });

  it('no arrow when the overall test sees no evidence', () => {
    const balanced = Array.from({ length: 60 }, (_, i) => (i % 6) + 1);
    const f = fairnessResult(balanced, 6);
    expect(f.assessment).toBe('consistent-with-fairness');
    expect(shouldShowArrow(f, { direction: [1, 0, 0], strength: 1 })).toBe(false);
  });

  it('arrow when there is enough data, evidence of bias, and a direction', () => {
    const f = fairnessResult(rolls(80, 6, 6), 6);
    expect(f.assessment).toBe('evidence-of-deviation');
    expect(shouldShowArrow(f, { direction: [1, 0, 0], strength: 1 })).toBe(true);
    expect(shouldShowArrow(f, { direction: null, strength: 0 })).toBe(false);
  });

  it('gate matches the verdict gate (5 per face) for every die', () => {
    for (const s of DICE_TYPES) {
      const f = { totalRolls: 5 * s - 1, degreesOfFreedom: s - 1, assessment: 'evidence-of-deviation' } as FairnessResult;
      expect(shouldShowArrow(f, { direction: [1, 0, 0], strength: 1 })).toBe(false);
    }
  });
});

describe('colours', () => {
  it('neutral at zero, blue under, orange over, clamped at ±50%', () => {
    expect(deviationColor(0)).toBe(NEUTRAL_HEX);
    expect(deviationColor(null)).toBe(NEUTRAL_HEX);
    expect(deviationColor(-0.5)).toBe('#3b82f6');
    expect(deviationColor(-3)).toBe('#3b82f6');
    expect(deviationColor(0.5)).toBe('#f97316');
    expect(deviationColor(9)).toBe('#f97316');
  });
});

describe('D20 layout copied from a real die', () => {
  const layout = defaultLayout(20);
  const g = getDieGeometry(20);
  const slotOf = (label: number) => layout.indexOf(label);

  it('is a valid permutation with opposite faces summing to 21', () => {
    expect(isValidLayout(20, layout)).toBe(true);
    expect(oppositePairsHold(20, layout)).toBe(true);
  });

  it.each(Array.from({ length: 20 }, (_, i) => i + 1))('face %i has the photographed clockwise neighbours', (label) => {
    const ccw = neighbourSlotsCCW(g, slotOf(label)).map((s) => layout[s]);
    const cw = [...ccw].reverse();
    const want = D20_CLOCKWISE[label];
    // equal as cyclic sequences
    const rotations = [0, 1, 2].map((k) => [cw[k % 3], cw[(k + 1) % 3], cw[(k + 2) % 3]]);
    expect(rotations).toContainEqual(want);
  });

  it('matches facts read directly from the photos', () => {
    const near = (a: number, b: number) => neighbourSlotsCCW(g, slotOf(a)).includes(slotOf(b));
    expect([2, 14, 8].every((n) => near(20, n))).toBe(true); // photo of the 20 face
    expect([19, 7, 13].every((n) => near(1, n))).toBe(true);
    expect([12, 8, 17].every((n) => near(10, n))).toBe(true);
    expect([8, 6, 3].every((n) => near(16, n))).toBe(true);
  });
});
