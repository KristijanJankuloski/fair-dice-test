import type { DiceType, FairnessResult } from '../../types/dice';
import { getDieGeometry } from './geometry';
import type { Layout } from './layout';
import { MIN_EXPECTED_COUNT } from '../statistics';
import { length, scale, type Vec3 } from './vec';

export interface WeightEstimate {
  /** Unit direction from the die's centre toward the estimated heavy side; null when undefined. */
  direction: Vec3 | null;
  /** Length of the (un-normalised) vector relative to N, for scaling the arrow only. */
  strength: number;
}

/**
 * A heavy side tends to land down, so the number pointing up sits on the opposite side.
 * With d_i = count_i − expected and n_i the direction that slot i points when it is the result,
 * the heavy side is at  w = −Σ d_i · n_i.  Only the direction is meaningful.
 */
export function estimateWeight(
  counts: Record<number, number>,
  layout: Layout,
  sides: DiceType,
): WeightEstimate {
  const g = getDieGeometry(sides);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return { direction: null, strength: 0 };
  const expected = total / sides;
  let w: Vec3 = [0, 0, 0];
  layout.forEach((label, slot) => {
    const d = (counts[label] ?? 0) - expected;
    const n = g.slotDirections[slot];
    w = [w[0] - d * n[0], w[1] - d * n[1], w[2] - d * n[2]];
  });
  const len = length(w);
  if (len < 1e-9) return { direction: null, strength: 0 };
  return { direction: scale(w, 1 / len), strength: len / total };
}

/** Arrow only when there is enough data AND the overall test found evidence of bias. */
export function shouldShowArrow(fairness: FairnessResult, estimate: WeightEstimate): boolean {
  return (
    fairness.assessment === 'evidence-of-deviation' &&
    fairness.totalRolls >= MIN_EXPECTED_COUNT * fairness.degreesOfFreedom + MIN_EXPECTED_COUNT &&
    estimate.direction !== null
  );
}

/** Faces are coloured only once the sample is large enough to assess. */
export const hasEnoughDataToColour = (fairness: FairnessResult) => fairness.assessment !== 'insufficient-data';
