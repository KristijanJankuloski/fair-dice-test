import type { DiceType } from '../../types/dice';
import { cross, dot } from './vec';
import { getDieGeometry, oppositeSlot, type DieGeometry } from './geometry';

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

/** Dice whose default layout was copied from a real die (rather than just the opposite-pair rule). */
export const LAYOUT_SOURCE: Partial<Record<DiceType, string>> = {
  20: 'a real D20 (blue, gold numbers)',
};

/**
 * Clockwise neighbour triples, seen from outside, read off photos of a real D20 (opposite faces
 * sum to 21). Reconstructed with an exhaustive search over icosahedron labellings; exactly one
 * labelling (with chirality) satisfies every photographed adjacency and winding. See docs/dice-layouts.md.
 */
export const D20_CLOCKWISE: Record<number, [number, number, number]> = {
  1: [13, 7, 19], 2: [18, 20, 12], 3: [17, 16, 19], 4: [11, 14, 18], 5: [13, 18, 15],
  6: [16, 14, 9], 7: [15, 17, 1], 8: [10, 20, 16], 9: [19, 6, 11], 10: [12, 8, 17],
  11: [9, 4, 13], 12: [15, 2, 10], 13: [1, 11, 5], 14: [6, 20, 4], 15: [5, 12, 7],
  16: [3, 8, 6], 17: [7, 10, 3], 18: [4, 2, 5], 19: [3, 9, 1], 20: [2, 14, 8],
};

/** Neighbouring slots of a face slot, counter-clockwise as seen from outside (one per polygon edge). */
export function neighbourSlotsCCW(g: DieGeometry, slot: number): number[] {
  const f = g.faces[slot];
  return f.map((v, i) => {
    const w = f[(i + 1) % f.length];
    return g.faces.findIndex((other, idx) => idx !== slot && other.includes(v) && other.includes(w));
  });
}

/**
 * Build a layout from clockwise neighbour triples (triangular faces only). Label `start` goes on
 * slot 0; the rest follows by propagating the rotation order. Any rotation of the start is a
 * symmetry of the die, so the result is unique up to rotation.
 */
export function layoutFromClockwise(
  sides: DiceType,
  clockwise: Record<number, number[]>,
  start: number,
): Layout {
  const g = getDieGeometry(sides);
  const layout: Layout = new Array(sides).fill(-1);
  const ccwLabels = (label: number) => [...clockwise[label]].reverse();
  layout[0] = start;
  const first = neighbourSlotsCCW(g, 0);
  ccwLabels(start).forEach((l, i) => (layout[first[i]] = l));
  const queue = [0, ...first];
  while (queue.length) {
    const s = queue.shift()!;
    const slots = neighbourSlotsCCW(g, s);
    const labels = ccwLabels(layout[s]);
    const i = slots.findIndex((t) => layout[t] !== -1);
    const j = labels.indexOf(layout[slots[i]]);
    slots.forEach((_, k) => {
      const t = slots[(i + k) % slots.length];
      const l = labels[(j + k) % labels.length];
      if (layout[t] === -1) {
        layout[t] = l;
        queue.push(t);
      }
    });
  }
  return layout;
}

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
  if (sides === 20) return layoutFromClockwise(20, D20_CLOCKWISE, 20);
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
