export const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const;
export type DiceType = (typeof DICE_TYPES)[number];

export interface ConfidenceInterval {
  lower: number; // percentage 0-100
  upper: number;
}

export interface FaceStatistics {
  face: number;
  count: number;
  observedPercentage: number | null;
  expectedPercentage: number;
  driftPercentagePoints: number | null;
  relativeDeviationPercentage: number | null;
  confidenceInterval95: ConfidenceInterval | null;
}

export type Assessment = 'insufficient-data' | 'consistent-with-fairness' | 'evidence-of-deviation';

export interface FairnessResult {
  totalRolls: number;
  chiSquare: number | null;
  degreesOfFreedom: number;
  pValue: number | null;
  significanceLevel: number;
  assessment: Assessment;
}
