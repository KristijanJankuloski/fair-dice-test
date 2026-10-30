import { useEffect, useRef, useState } from 'react';
import type { DiceType } from '../types/dice';
import { dieLabels } from '../services/die/layout';
import { countIndexForLabel } from '../services/statistics';

export const MAX_RESUME_COUNT = 1_000_000;

export type ParsedCounts = { ok: true; counts: number[] } | { ok: false; message: string };

/** Fields by printed label (blank = 0) → counts array indexed by stored value − 1. */
export function parseResumeCounts(fields: Record<number, string>, sides: DiceType): ParsedCounts {
  const counts = new Array<number>(sides).fill(0);
  for (const label of dieLabels(sides)) {
    const raw = (fields[label] ?? '').trim();
    if (raw === '') continue;
    if (!/^\d+$/.test(raw)) return { ok: false, message: `Face ${label}: enter a whole number, 0 or more` };
    const n = Number(raw);
    if (n > MAX_RESUME_COUNT) return { ok: false, message: `Face ${label}: that's too large (max ${MAX_RESUME_COUNT.toLocaleString()})` };
    counts[countIndexForLabel(label, sides)] = n;
  }
  if (counts.every((c) => c === 0)) return { ok: false, message: 'Enter at least one count above 0' };
  return { ok: true, counts };
}

interface Props {
  sides: DiceType;
  onSave: (counts: number[]) => void;
  onClose: () => void;
}

export function ResumeDialog({ sides, onSave, onClose }: Props) {
  const [fields, setFields] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);
  const labels = dieLabels(sides);

  useEffect(() => first.current?.focus(), []);

  const save = () => {
    const parsed = parseResumeCounts(fields, sides);
    if (parsed.ok) onSave(parsed.counts);
    else setError(parsed.message);
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-title"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h2 id="resume-title" className="text-lg font-semibold">Resume a D{sides} count</h2>
        <p className="mt-1 text-sm text-slate-300">
          Enter how many times each face has come up so far. These counts become the starting point; new rolls are added on top.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {labels.map((label, i) => (
            <label key={label} className="text-sm text-slate-300">
              Face {label}
              <input
                ref={i === 0 ? first : undefined}
                inputMode="numeric"
                autoComplete="off"
                value={fields[label] ?? ''}
                placeholder="0"
                onChange={(e) => {
                  setFields((f) => ({ ...f, [label]: e.target.value }));
                  setError(null);
                }}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-right font-mono tabular-nums focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              />
            </label>
          ))}
        </div>
        <p role="alert" className="mt-3 h-5 text-sm text-amber-300">{error ?? ''}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
