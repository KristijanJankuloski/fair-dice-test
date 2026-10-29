import { useCallback, useMemo, useState } from 'react';
import type { DiceType } from '../types/dice';
import { faceStatistics, fairnessResult } from '../services/statistics';

/** In-memory session only: closing the tab or switching dice discards it. */
export function useDiceSession(initial: DiceType = 6) {
  const [diceType, setDiceType] = useState<DiceType>(initial);
  const [rolls, setRolls] = useState<number[]>([]);

  const addRoll = useCallback((value: number) => setRolls((r) => [...r, value]), []);
  const undo = useCallback(() => setRolls((r) => r.slice(0, -1)), []);
  const switchDice = useCallback((next: DiceType) => {
    setDiceType(next);
    setRolls([]);
  }, []);

  const faces = useMemo(() => faceStatistics(rolls, diceType), [rolls, diceType]);
  const fairness = useMemo(() => fairnessResult(rolls, diceType), [rolls, diceType]);

  return { diceType, rolls, faces, fairness, addRoll, undo, switchDice };
}
