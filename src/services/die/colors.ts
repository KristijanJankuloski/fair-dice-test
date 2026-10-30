const UNDER = [0x3b, 0x82, 0xf6]; // blue
const NEUTRAL = [0x47, 0x55, 0x69]; // slate
const OVER = [0xf9, 0x73, 0x16]; // orange
export const NEUTRAL_HEX = '#475569';

const hex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

/** Relative deviation (count − expected) / expected → colour; clamped to ±50%. */
export function deviationColor(relativeDeviation: number | null): string {
  if (relativeDeviation === null || !Number.isFinite(relativeDeviation)) return NEUTRAL_HEX;
  const t = Math.max(-0.5, Math.min(0.5, relativeDeviation)) / 0.5;
  return hex(t < 0 ? mix(NEUTRAL, UNDER, -t) : mix(NEUTRAL, OVER, t));
}
