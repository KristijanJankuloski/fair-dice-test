import type { ConfidenceInterval } from '../types/dice';

const Z_95 = 1.959963984540054;

/** Wilson score interval, returned as percentages. Null when there are no trials. */
export function wilsonInterval(successes: number, trials: number, z = Z_95): ConfidenceInterval | null {
  if (trials <= 0) return null;
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const centre = (p + z2 / (2 * trials)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denom;
  return {
    lower: Math.max(0, (centre - margin) * 100),
    upper: Math.min(100, (centre + margin) * 100),
  };
}
