import { useEffect, useRef, useState } from 'react';
import { DICE_TYPES, type DiceType } from '../types/dice';

interface Props {
  value: DiceType;
  hasData: boolean;
  onChange: (next: DiceType) => void;
}

export function DiceSelector({ value, hasData, onChange }: Props) {
  const [pending, setPending] = useState<DiceType | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pending !== null) cancelRef.current?.focus();
  }, [pending]);

  const choose = (d: DiceType) => {
    if (d === value) return;
    if (hasData) setPending(d);
    else onChange(d);
  };

  return (
    <>
      <div role="radiogroup" aria-label="Die type" className="flex flex-wrap gap-2">
        {DICE_TYPES.map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={d === value}
            onClick={() => choose(d)}
            className={`rounded-lg border px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${
              d === value
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            D{d}
          </button>
        ))}
      </div>
      {pending !== null && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="switch-title"
            aria-describedby="switch-desc"
            className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6"
            onKeyDown={(e) => e.key === 'Escape' && setPending(null)}
          >
            <h2 id="switch-title" className="text-lg font-semibold">
              Switch to D{pending}?
            </h2>
            <p id="switch-desc" className="mt-2 text-sm text-slate-300">
              The current D{value} data will be lost. This can't be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setPending(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
              >
                Keep rolling D{value}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(pending);
                  setPending(null);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-400"
              >
                Discard and switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
