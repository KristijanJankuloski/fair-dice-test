import { describe, expect, it } from 'vitest';
import { parseResumeCounts } from './ResumeDialog';

describe('parseResumeCounts', () => {
  it('treats blank fields as 0 and maps labels to counts', () => {
    expect(parseResumeCounts({ 1: '5', 6: '12' }, 6)).toEqual({ ok: true, counts: [5, 0, 0, 0, 0, 12] });
  });
  it('D10 label 0 is stored as value 10 (last slot)', () => {
    const r = parseResumeCounts({ 0: '7', 9: '2' }, 10);
    expect(r).toEqual({ ok: true, counts: [0, 0, 0, 0, 0, 0, 0, 0, 2, 7] });
  });
  it.each(['-1', '1.5', 'abc', '1e3', '+4', '2 3'])('rejects %j', (raw) => {
    expect(parseResumeCounts({ 1: raw }, 6).ok).toBe(false);
  });
  it('rejects all zeros / all blank', () => {
    expect(parseResumeCounts({}, 6).ok).toBe(false);
    expect(parseResumeCounts({ 1: '0', 2: '0' }, 6).ok).toBe(false);
  });
  it('rejects absurdly large counts', () => {
    expect(parseResumeCounts({ 1: '1000001' }, 6).ok).toBe(false);
    expect(parseResumeCounts({ 1: '1000000' }, 6).ok).toBe(true);
  });
});
