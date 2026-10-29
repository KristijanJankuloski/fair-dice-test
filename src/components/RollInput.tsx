import { useEffect, useRef, useState } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import type { DiceType } from '../types/dice';
import { parseRoll } from '../utils/validation';

interface Props {
  sides: DiceType;
  canUndo: boolean;
  onRoll: (value: number) => void;
  onUndo: () => void;
  /** Changing this value pulls focus back into the input (e.g. after a die switch). */
  focusSignal?: unknown;
}

export function RollInput({ sides, canUndo, onRoll, onUndo, focusSignal }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusSignal, sides]);

  const submit = () => {
    const result = parseRoll(text, sides);
    if (result.ok) {
      onRoll(result.value);
      setText('');
      setError(null);
    } else {
      setError(result.message);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={text}
          inputMode="numeric"
          autoComplete="off"
          aria-label="Roll result"
          aria-invalid={error !== null}
          aria-describedby="roll-error"
          placeholder="Enter roll result…"
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            // `key` is "Enter" for both the main and numpad Enter keys.
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!e.repeat) submit();
            }
          }}
          className="min-w-0 flex-1 rounded-xl border-2 border-slate-700 bg-slate-900 px-5 py-4 text-4xl font-semibold tabular-nums placeholder:text-slate-600 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-400/30"
        />
        <button
          type="button"
          onClick={submit}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 font-semibold text-white hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          <Plus size={20} aria-hidden /> Add Roll
        </button>
        <button
          type="button"
          onClick={() => {
            onUndo();
            inputRef.current?.focus();
          }}
          disabled={!canUndo}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
        >
          <Undo2 size={18} aria-hidden /> Undo
        </button>
      </div>
      <p id="roll-error" role="alert" className="mt-2 h-5 text-sm text-amber-300">
        {error ?? ''}
      </p>
    </div>
  );
}
