import type { DiceType } from '../types/dice';

export type ParseResult = { ok: true; value: number } | { ok: false; message: string };

export const rangeMessage = (sides: DiceType) =>
  sides === 10 ? 'Enter a number from 0 to 9' : `Enter a number from 1 to ${sides}`;

export function parseRoll(raw: string, sides: DiceType): ParseResult {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { ok: false, message: rangeMessage(sides) };
  // Physical D10s are numbered 0-9. Internally the 0 face is stored as 10, but 10 itself is not valid input.
  if (sides === 10) {
    if (/^[1-9]$/.test(text)) return { ok: true, value: Number(text) };
    if (text === '0') return { ok: true, value: 10 };
    return { ok: false, message: rangeMessage(sides) };
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 1 || value > sides) {
    return { ok: false, message: rangeMessage(sides) };
  }
  return { ok: true, value };
}
