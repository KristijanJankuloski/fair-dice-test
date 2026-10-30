import { describe, expect, it } from 'vitest';
import { DICE_TYPES, type DiceType, type FairnessResult } from '../../types/dice';
import { fairnessResult } from '../statistics';
import { deviationColor, NEUTRAL_HEX } from './colors';
import { getDieGeometry, oppositeSlot } from './geometry';
import { D12_CLOCKWISE, D20_CLOCKWISE, D10_BY_SLOT, defaultLayout, dieLabels, handedness, isValidLayout, neighbourSlotsCCW, oppositePairsHold, swapLabels } from './layout';
import { estimateWeight, shouldShowArrow } from './weightDirection';
import { cross, dot, length, normalize, scale, sub } from './vec';

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

describe('D10 layout copied from a real die', () => {
  const layout = defaultLayout(10);
  const g = getDieGeometry(10);

  /** Labels of the faces meeting at an apex vertex, clockwise as seen from outside (above the apex). */
  const clockwiseAround = (vertex: number): number[] => {
    const axis = normalize(g.vertices[vertex]);
    const slots = g.faces.map((f, s) => (f.includes(vertex) ? s : -1)).filter((s) => s >= 0);
    const ref: [number, number, number] = Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const u = normalize(sub(ref, scale(axis, dot(ref, axis))));
    const w = cross(axis, u);
    const angle = (s: number) => {
      const d = g.slotDirections[s];
      return Math.atan2(dot(d, w), dot(d, u));
    };
    // increasing angle about `axis` is counter-clockwise seen from outside, so reverse it
    return slots.sort((a, b) => angle(b) - angle(a)).map((s) => layout[s]);
  };
  const sameCycle = (got: number[], want: number[]) =>
    got.some((_, k) => got.every((v, i) => v === want[(i + k) % want.length]));

  it('is a valid 0-9 permutation with opposite faces summing to 9', () => {
    expect(layout).toEqual(D10_BY_SLOT);
    expect(isValidLayout(10, layout)).toBe(true);
    expect(oppositePairsHold(10, layout)).toBe(true);
  });

  it('evens form one cone and odds the other', () => {
    const top = clockwiseAround(0), bottom = clockwiseAround(1);
    expect(top.every((n) => n % 2 === 0) || top.every((n) => n % 2 === 1)).toBe(true);
    expect(bottom.every((n) => n % 2 === 0) || bottom.every((n) => n % 2 === 1)).toBe(true);
  });

  it('matches the photographed clockwise rings: evens 2,6,4,0,8 and odds 1,9,5,3,7', () => {
    const rings = [clockwiseAround(0), clockwiseAround(1)];
    const evens = rings.find((r) => r[0] % 2 === 0)!;
    const odds = rings.find((r) => r[0] % 2 === 1)!;
    expect(sameCycle(evens, [2, 6, 4, 0, 8])).toBe(true);
    expect(sameCycle(odds, [1, 9, 5, 3, 7])).toBe(true);
  });
});

describe('D12 layout copied from a real die', () => {
  const layout = defaultLayout(12);
  const g = getDieGeometry(12);
  const slotOf = (label: number) => layout.indexOf(label);

  it('is a valid permutation with opposite faces summing to 13', () => {
    expect(isValidLayout(12, layout)).toBe(true);
    expect(oppositePairsHold(12, layout)).toBe(true);
  });

  it.each(Array.from({ length: 12 }, (_, i) => i + 1))('face %i has the clockwise neighbours derived from the photos', (label) => {
    const cw = [...neighbourSlotsCCW(g, slotOf(label)).map((s) => layout[s])].reverse();
    const want = D12_CLOCKWISE[label];
    const rotations = want.map((_, k) => want.map((_, i) => cw[(i + k) % want.length]));
    expect(rotations).toContainEqual(want);
  });

  it('matches vertices read directly from the photos (clockwise triples)', () => {
    // Each triple is three faces meeting at one corner, listed clockwise seen from outside.
    const photos = [[1, 3, 2], [1, 6, 5], [1, 2, 4], [12, 10, 8], [12, 9, 11], [12, 11, 10], [2, 8, 4], [2, 7, 8], [12, 8, 7], [12, 7, 9]];
    for (const [a, b, c] of photos) {
      const [sa, sb, sc] = [slotOf(a), slotOf(b), slotOf(c)];
      const shared = g.faces[sa].filter((v) => g.faces[sb].includes(v) && g.faces[sc].includes(v));
      expect(shared).toHaveLength(1); // the three faces really meet at a corner
      expect(handedness(12, sa, sb, sc)).toBeLessThan(0); // clockwise from outside
    }
  });
});

describe('D8 layout as described by its owner', () => {
  const layout = defaultLayout(8);
  const g = getDieGeometry(8);
  const slotOf = (label: number) => layout.indexOf(label);
  const touches = (a: number, b: number) => neighbourSlotsCCW(g, slotOf(a)).includes(slotOf(b));
  const ringAround = (vertex: number, clockwiseSign: 1 | -1): number[] => {
    // faces at the apex, clockwise seen from outside (above that apex)
    const z = g.vertices[vertex][2] > 0 ? 1 : -1;
    const slots = g.faces.map((f, s) => (f.includes(vertex) ? s : -1)).filter((s) => s >= 0);
    const angle = (s: number) => Math.atan2(g.slotDirections[s][1], g.slotDirections[s][0]);
    // seen from above +z clockwise = decreasing angle; seen from above -z the sense flips
    return slots.sort((a, b) => clockwiseSign * z * (angle(b) - angle(a))).map((s) => layout[s]);
  };
  const sameCycle = (got: number[], want: number[]) =>
    got.some((_, k) => got.every((v, i) => v === want[(i + k) % want.length]));

  it('is a valid permutation with opposite faces summing to 9', () => {
    expect(isValidLayout(8, layout)).toBe(true);
    expect(oppositePairsHold(8, layout)).toBe(true);
  });

  it('rings read clockwise from outside: 1, 7, 5, 3 and 8, 6, 4, 2', () => {
    const top = g.vertices.findIndex((v) => v[2] > 0.99);
    const bottom = g.vertices.findIndex((v) => v[2] < -0.99);
    expect(sameCycle(ringAround(top, 1), [1, 7, 5, 3])).toBe(true);
    expect(sameCycle(ringAround(bottom, 1), [8, 6, 4, 2])).toBe(true);
  });

  it('8 touches 6, 2 and 5; 1 touches 4, 7 and 3 (and nothing else by an edge)', () => {
    expect([6, 2, 5].every((n) => touches(8, n))).toBe(true);
    expect([4, 7, 3].every((n) => touches(1, n))).toBe(true);
    expect(neighbourSlotsCCW(g, slotOf(8))).toHaveLength(3);
  });
});
