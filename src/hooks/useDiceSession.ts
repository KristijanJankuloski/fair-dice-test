import { useCallback, useMemo, useState } from 'react';
import type { DiceType } from '../types/dice';
import { countFaces, faceStatisticsFromCounts, fairnessResultFromCounts } from '../services/statistics';

/**
 * In-memory session only: closing the tab or switching dice discards it.
 * `baseline` holds counts typed in via "Resume" (no order, so they can't be undone);
 * `rolls` holds the ordered rolls entered afterwards.
 */
export function useDiceSession(initial: DiceType = 6) {
  const [diceType, setDiceType] = useState<DiceType>(initial);
  const [rolls, setRolls] = useState<number[]>([]);
  const [baseline, setBaseline] = useState<number[]>(() => new Array(initial).fill(0));

  const addRoll = useCallback((value: number) => setRolls((r) => [...r, value]), []);
  const undo = useCallback(() => setRolls((r) => r.slice(0, -1)), []);
  const switchDice = useCallback((next: DiceType) => {
    setDiceType(next);
    setRolls([]);
    setBaseline(new Array(next).fill(0));
  }, []);
  /** counts[i] = times the face stored as value i+1 has appeared so far. */
  const resume = useCallback((counts: number[]) => setBaseline(counts), []);

  const counts = useMemo(() => {
    const live = countFaces(rolls, diceType);
    return live.map((c, i) => c + (baseline[i] ?? 0));
  }, [rolls, baseline, diceType]);
  const total = useMemo(() => counts.reduce((a, b) => a + b, 0), [counts]);
  const manualTotal = useMemo(() => baseline.reduce((a, b) => a + b, 0), [baseline]);

  const faces = useMemo(() => faceStatisticsFromCounts(counts, diceType), [counts, diceType]);
  const fairness = useMemo(() => fairnessResultFromCounts(counts, diceType), [counts, diceType]);

  return { diceType, rolls, total, manualTotal, faces, fairness, addRoll, undo, switchDice, resume };
}
