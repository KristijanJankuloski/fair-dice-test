import type { DiceType } from '../../types/dice';
import { cross, dot } from './vec';
import { getDieGeometry, oppositeSlot } from './geometry';

/** layout[slot] = the number printed on that slot. A layout is always a permutation of the labels. */
export type Layout = number[];

/** Labels printed on a die: 1..sides, except the D10 which is 0..9. */
export function dieLabels(sides: DiceType): number[] {
  return sides === 10 ? Array.from({ length: 10 }, (_, i) => i) : Array.from({ length: sides }, (_, i) => i + 1);
}

/** Do we know which faces touch each other on the common real-world layout? */
export const ADJACENCY_VERIFIED: Record<DiceType, boolean> = {
  4: true, // number at each vertex; no neighbour ambiguity
  6: true, // right-handed: 1, 2, 3 run counter-clockwise around a vertex (Western dice)
  8: false,
  10: false,
  12: false,
  20: false,
};

/**
 * Default layout. Verified facts: opposite faces sum to sides + 1 (D6, D8, D12, D20) or to 9 on a
 * 0-9 D10; a D6 is right-handed. Which faces touch on D8-D20 varies by maker and is NOT verified;
 * those dice get a deterministic layout that only honours the opposite-pair rule.
 */
export function defaultLayout(sides: DiceType): Layout {
  const g = getDieGeometry(sides);
  const labels = dieLabels(sides);
  if (sides === 4) return labels;
  if (sides === 6) return [1, 6, 2, 5, 3, 4]; // slots: +x, -x, +y, -y, +z, -z
  const layout: Layout = new Array(sides).fill(-1);
  let k = 0;
  for (let s = 0; s < sides; s++) {
    if (layout[s] !== -1) continue;
    const o = oppositeSlot(g, s)!;
    layout[s] = labels[k];
    layout[o] = labels[sides - 1 - k];
    k++;
  }
  return layout;
}

export function isValidLayout(sides: DiceType, layout: Layout): boolean {
  const labels = dieLabels(sides);
  return layout.length === sides && [...layout].sort((a, b) => a - b).join() === labels.join();
}

/** Give the slot holding `labelA` the number `labelB` and vice-versa (keeps a permutation). */
export function swapLabels(layout: Layout, labelA: number, labelB: number): Layout {
  return layout.map((l) => (l === labelA ? labelB : l === labelB ? labelA : l));
}

/** Do opposite faces sum to the expected total? (Informational check shown for edited layouts.) */
export function oppositeSum(sides: DiceType): number | null {
  if (sides === 4) return null;
  return sides === 10 ? 9 : sides + 1;
}

export function oppositePairsHold(sides: DiceType, layout: Layout): boolean {
  const target = oppositeSum(sides);
  if (target === null) return true;
  const g = getDieGeometry(sides);
  return layout.every((l, s) => {
    const o = oppositeSlot(g, s);
    return o !== null && l + layout[o] === target;
  });
}

/** Triple product of the outward normals of slots a, b, c; > 0 means counter-clockwise a→b→c. */
export function handedness(sides: DiceType, a: number, b: number, c: number): number {
  const g = getDieGeometry(sides);
  return dot(g.slotDirections[a], cross(g.slotDirections[b], g.slotDirections[c]));
}
