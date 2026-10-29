import type { DiceType, FaceStatistics, FairnessResult } from '../types/dice';
import { chiSquarePValue, chiSquareStatistic } from './chiSquare';
import { wilsonInterval } from './confidenceIntervals';

export const SIGNIFICANCE_LEVEL = 0.05;
export const MIN_EXPECTED_COUNT = 5;

export const expectedPercentage = (sides: number): number => 100 / sides;

export function countFaces(rolls: number[], sides: DiceType): number[] {
  const counts = new Array<number>(sides).fill(0);
  for (const r of rolls) if (Number.isInteger(r) && r >= 1 && r <= sides) counts[r - 1]++;
  return counts;
}

export function faceStatistics(rolls: number[], sides: DiceType): FaceStatistics[] {
  const counts = countFaces(rolls, sides);
  const n = rolls.length;
  const expected = expectedPercentage(sides);
  const stats = counts.map((count, i) => {
    if (n === 0) {
      return {
        face: i + 1,
        count,
        observedPercentage: null,
        expectedPercentage: expected,
        driftPercentagePoints: null,
        relativeDeviationPercentage: null,
        confidenceInterval95: null,
      };
    }
    const observed = (count / n) * 100;
    return {
      face: i + 1,
      count,
      observedPercentage: observed,
      expectedPercentage: expected,
      driftPercentagePoints: observed - expected,
      relativeDeviationPercentage: ((observed - expected) / expected) * 100,
      confidenceInterval95: wilsonInterval(count, n),
    };
  });
  return sides === 10 ? d10Labels(stats) : stats;
}

/** A D10 is physically labelled 0-9: show the stored face 10 as "0", listed first. */
function d10Labels(stats: FaceStatistics[]): FaceStatistics[] {
  const ten = stats[stats.length - 1];
  return [{ ...ten, face: 0 }, ...stats.slice(0, -1)];
}

export function fairnessResult(
  rolls: number[],
  sides: DiceType,
  alpha: number = SIGNIFICANCE_LEVEL,
): FairnessResult {
  const n = rolls.length;
  const df = sides - 1;
  const base = { totalRolls: n, degreesOfFreedom: df, significanceLevel: alpha };
  if (n / sides < MIN_EXPECTED_COUNT) {
    return { ...base, chiSquare: null, pValue: null, assessment: 'insufficient-data' };
  }
  const chi = chiSquareStatistic(countFaces(rolls, sides));
  const p = chiSquarePValue(chi, df);
  return {
    ...base,
    chiSquare: chi,
    pValue: p,
    assessment: p < alpha ? 'evidence-of-deviation' : 'consistent-with-fairness',
  };
}
