import { describe, expect, it } from 'vitest';
import { chiSquarePValue, chiSquareStatistic } from './chiSquare';
import { wilsonInterval } from './confidenceIntervals';
import { countFaces, countIndexForLabel, expectedPercentage, faceStatistics, faceStatisticsFromCounts, fairnessResult, fairnessResultFromCounts } from './statistics';
import { DICE_TYPES } from '../types/dice';

const balanced = (sides: number, perFace: number) =>
  Array.from({ length: sides * perFace }, (_, i) => (i % sides) + 1);

describe('expected percentage', () => {
  it.each(DICE_TYPES)('is 100/%i', (s) => expect(expectedPercentage(s)).toBeCloseTo(100 / s, 10));
});

describe('face statistics', () => {
  it('has no NaN/Infinity and null percentages for an empty session', () => {
    for (const f of faceStatistics([], 20)) {
      expect(f.count).toBe(0);
      expect(f.observedPercentage).toBeNull();
      expect(f.driftPercentagePoints).toBeNull();
      expect(f.confidenceInterval95).toBeNull();
    }
  });
  it.each(DICE_TYPES)('D%i: counts sum to N, percentages sum to 100, zero drift when balanced', (s) => {
    const rolls = balanced(s, 7);
    const stats = faceStatistics(rolls, s);
    expect(stats.reduce((a, f) => a + f.count, 0)).toBe(rolls.length);
    expect(stats.reduce((a, f) => a + f.observedPercentage!, 0)).toBeCloseTo(100, 8);
    for (const f of stats) expect(f.driftPercentagePoints!).toBeCloseTo(0, 8);
  });
  it('computes drift in percentage points and relative deviation', () => {
    // 19 of 100 on a D6: 19% vs 16.667%
    const rolls = [...Array(19).fill(1), ...Array(81).fill(2)];
    const f = faceStatistics(rolls, 6)[0];
    expect(f.driftPercentagePoints).toBeCloseTo(2.3333, 3);
    expect(f.relativeDeviationPercentage).toBeCloseTo(14, 3);
  });
  it('ignores out-of-range values when counting', () => {
    expect(countFaces([0, 1, 7, 6], 6)).toEqual([1, 0, 0, 0, 0, 1]);
  });
});

describe('chi-square', () => {
  it('statistic matches a hand-computed example', () => {
    // expected 20 each: (100 + 0 + 100) / 20 = 10
    expect(chiSquareStatistic([10, 20, 30])).toBeCloseTo(10, 10);
  });
  it('statistic is 0 for empty input', () => {
    expect(chiSquareStatistic([0, 0, 0])).toBe(0);
  });
  it('p-value is exact for df=2 (exp(-x/2))', () => {
    expect(chiSquarePValue(10, 2)).toBeCloseTo(Math.exp(-5), 10);
  });
  // Standard 5% critical values from chi-square tables.
  it.each([
    [1, 3.841459],
    [3, 7.814728],
    [5, 11.070498],
    [7, 14.067140],
    [9, 16.918978],
    [11, 19.675138],
    [19, 30.143527],
  ])('df=%i critical value gives p≈0.05', (df, crit) => {
    expect(chiSquarePValue(crit, df)).toBeCloseTo(0.05, 5);
  });
  it('p=1 at statistic 0', () => expect(chiSquarePValue(0, 5)).toBe(1));
});

describe('wilson interval', () => {
  it('matches known values for 5/10', () => {
    const ci = wilsonInterval(5, 10)!;
    expect(ci.lower).toBeCloseTo(23.66, 1);
    expect(ci.upper).toBeCloseTo(76.34, 1);
  });
  it('matches known values for 0/10', () => {
    const ci = wilsonInterval(0, 10)!;
    expect(ci.lower).toBeCloseTo(0, 6);
    expect(ci.upper).toBeCloseTo(27.75, 1);
  });
  it('narrows as trials increase', () => {
    const a = wilsonInterval(10, 60)!;
    const b = wilsonInterval(100, 600)!;
    expect(b.upper - b.lower).toBeLessThan(a.upper - a.lower);
  });
  it('is null with no trials', () => expect(wilsonInterval(0, 0)).toBeNull());
});

describe('fairness result', () => {
  it('is insufficient-data when expected count < 5', () => {
    const r = fairnessResult(balanced(6, 4), 6); // 24 rolls, E=4
    expect(r.assessment).toBe('insufficient-data');
    expect(r.pValue).toBeNull();
    expect(r.chiSquare).toBeNull();
  });
  it('is insufficient-data for an empty session', () => {
    expect(fairnessResult([], 20).assessment).toBe('insufficient-data');
  });
  it('is consistent with fairness for a balanced sample', () => {
    const r = fairnessResult(balanced(6, 10), 6);
    expect(r.assessment).toBe('consistent-with-fairness');
    expect(r.chiSquare).toBe(0);
    expect(r.pValue).toBe(1);
    expect(r.degreesOfFreedom).toBe(5);
  });
  it('flags a heavily skewed sample', () => {
    const rolls = [...Array(60).fill(6), ...balanced(6, 2)];
    expect(fairnessResult(rolls, 6).assessment).toBe('evidence-of-deviation');
  });
});

describe('counts-based statistics (Resume)', () => {
  it('matches the rolls-based result for the same data', () => {
    const rolls = [1, 1, 2, 3, 3, 3, 4, 5, 6, 6, 6, 6, 6, 2, 4, 1, 5, 3, 2, 6, 6, 1, 4, 5, 3, 2, 2, 6, 5, 4];
    expect(faceStatisticsFromCounts(countFaces(rolls, 6), 6)).toEqual(faceStatistics(rolls, 6));
    expect(fairnessResultFromCounts(countFaces(rolls, 6), 6)).toEqual(fairnessResult(rolls, 6));
  });
  it('totals come from the counts, so 17 + 13 on a D6 is 30 rolls', () => {
    const r = fairnessResultFromCounts([17, 13, 0, 0, 0, 0], 6);
    expect(r.totalRolls).toBe(30);
    expect(r.assessment).not.toBe('insufficient-data');
  });
  it('D10: label 0 maps to the last count slot', () => {
    expect(countIndexForLabel(0, 10)).toBe(9);
    expect(countIndexForLabel(3, 10)).toBe(2);
    expect(countIndexForLabel(6, 6)).toBe(5);
  });
});
