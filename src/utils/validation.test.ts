import { describe, expect, it } from 'vitest';
import { parseRoll } from './validation';
import { DICE_TYPES } from '../types/dice';

describe('parseRoll', () => {
  it.each(DICE_TYPES)('D%i accepts min and max', (s) => {
    expect(parseRoll('1', s)).toEqual({ ok: true, value: 1 });
    expect(parseRoll(String(s), s)).toEqual({ ok: true, value: s });
  });
  it.each(DICE_TYPES.filter((s) => s !== 10))('D%i rejects 0', (s) => {
    expect(parseRoll('0', s).ok).toBe(false);
  });
  it('D10 treats 0 as 10 (0-9 numbered dice)', () => {
    expect(parseRoll('0', 10)).toEqual({ ok: true, value: 10 });
    expect(parseRoll('00', 10).ok).toBe(false);
    expect(parseRoll('11', 10).ok).toBe(false);
  });
  it.each(DICE_TYPES)('D%i rejects max+1', (s) => {
    expect(parseRoll(String(s + 1), s).ok).toBe(false);
  });
  it.each(['', '  ', '1.5', '-3', 'abc', '1e1', '+4', '3 4'])('rejects %j', (raw) => {
    expect(parseRoll(raw, 20).ok).toBe(false);
  });
  it('trims whitespace', () => expect(parseRoll(' 7 ', 8)).toEqual({ ok: true, value: 7 }));
});
