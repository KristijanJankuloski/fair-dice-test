import type { DiceType } from '../types/dice';

export type ParseResult = { ok: true; value: number } | { ok: false; message: string };

export function parseRoll(raw: string, sides: DiceType): ParseResult {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { ok: false, message: `Enter a number from 1 to ${sides}` };
  const value = Number(text);
  if (!Number.isSafeInteger(value) || value < 1 || value > sides) {
    return { ok: false, message: `Enter a number from 1 to ${sides}` };
  }
  return { ok: true, value };
}
