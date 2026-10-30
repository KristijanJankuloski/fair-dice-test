import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { DiceType, FaceStatistics, FairnessResult } from '../types/dice';
import { deviationColor, NEUTRAL_HEX } from '../services/die/colors';
import { getDieGeometry } from '../services/die/geometry';
import { ADJACENCY_VERIFIED, LAYOUT_SOURCE, defaultLayout, dieLabels, oppositePairsHold, oppositeSum, swapLabels } from '../services/die/layout';
import { estimateWeight, hasEnoughDataToColour, shouldShowArrow } from '../services/die/weightDirection';

// three.js lives in its own chunk, fetched only once this section is on screen.
const Die3D = lazy(() => import('./Die3D'));

interface Props {
  sides: DiceType;
  faces: FaceStatistics[];
  fairness: FairnessResult;
}

export function DieViewSection({ sides, faces, fairness }: Props) {
  const [layout, setLayout] = useState(() => defaultLayout(sides));
  const [edited, setEdited] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [swapWith, setSwapWith] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [load, setLoad] = useState(false);
  const [noWebGL, setNoWebGL] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  // Defer loading three.js until the section scrolls into view.
  useEffect(() => {
    if (load || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setLoad(true);
        io.disconnect();
      }
    });
    io.observe(holder.current!);
    return () => io.disconnect();
  }, [load]);

  const geometry = useMemo(() => getDieGeometry(sides), [sides]);
  const labels = useMemo(() => dieLabels(sides), [sides]);
  const counts = useMemo(() => Object.fromEntries(faces.map((f) => [f.face, f.count])), [faces]);
  const colour = hasEnoughDataToColour(fairness);

  const colors = useMemo(() => {
    const out: Record<number, string> = {};
    for (const f of faces) {
      out[f.face] = colour && f.relativeDeviationPercentage !== null ? deviationColor(f.relativeDeviationPercentage / 100) : NEUTRAL_HEX;
    }
    return out;
  }, [faces, colour]);

  const estimate = useMemo(() => estimateWeight(counts, layout, sides), [counts, layout, sides]);
  const showArrow = shouldShowArrow(fairness, estimate);

  const onUnavailable = useCallback(() => setNoWebGL(true), []);
  const onPick = useCallback((label: number) => setSelected(label), []);

  const swap = () => {
    if (selected === null || swapWith === null || selected === swapWith) return;
    setLayout((l) => swapLabels(l, selected, swapWith));
    setEdited(true);
    setSwapWith(null);
  };
  const reset = () => {
    setLayout(defaultLayout(sides));
    setEdited(false);
    setSelected(null);
    setSwapWith(null);
  };

  const ranked = [...faces].filter((f) => f.driftPercentagePoints !== null).sort((a, b) => b.driftPercentagePoints! - a.driftPercentagePoints!);
  const sum = oppositeSum(sides);
  const pairsOk = oppositePairsHold(sides, layout);

  let status: string;
  if (!colour) {
    status = `Not enough data to colour the die yet (needs ${fairness.degreesOfFreedom * 5 + 5} rolls for a D${sides}).`;
  } else if (showArrow) {
    status = 'Estimated weight direction (dashed arrow): an estimate from the roll counts, not a measurement. It points to the side that is probably heavier.';
  } else {
    status = 'No arrow: the overall test shows no evidence of bias, so there is no reliable direction to show. Colours are descriptive only.';
  }

  return (
    <section aria-label="3D die view" className="rounded-xl border border-slate-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-400">Die view</h2>
        {!noWebGL && load && (
          <button type="button" onClick={() => setResetSignal((n) => n + 1)} className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800">
            <RotateCcw size={14} aria-hidden /> Reset view
          </button>
        )}
      </div>

      <div ref={holder} className="mt-3">
        {noWebGL ? (
          <div role="note" className="rounded-lg bg-slate-900 p-4 text-sm text-slate-300">
            <p>3D isn't available in this browser. Most over- and under-represented faces:</p>
            {ranked.length === 0 ? (
              <p className="mt-2 text-slate-500">No rolls yet.</p>
            ) : (
              <ul className="mt-2 font-mono">
                {[...ranked.slice(0, 3), ...ranked.slice(-3)].filter((f, i, a) => a.indexOf(f) === i).map((f) => (
                  <li key={f.face}>
                    Face {f.face}: {f.driftPercentagePoints! >= 0 ? '+' : ''}
                    {f.driftPercentagePoints!.toFixed(2)} pp
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : load ? (
          <Suspense fallback={<p className="p-6 text-sm text-slate-500">Loading 3D die…</p>}>
            <Die3D
              geometry={geometry}
              layout={layout}
              colors={colors}
              arrow={showArrow ? estimate.direction : null}
              selectedLabel={selected}
              resetSignal={resetSignal}
              onPick={onPick}
              onUnavailable={onUnavailable}
            />
          </Suspense>
        ) : (
          <div className="grid place-items-center rounded-lg bg-slate-900 p-8">
            <button type="button" onClick={() => setLoad(true)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Load 3D die
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-300" role="status">{status}</p>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400" aria-hidden>
        <span className="h-2 w-16 rounded" style={{ background: 'linear-gradient(90deg,#3b82f6,#475569,#f97316)' }} />
        <span>under · fair · over (colour is never the only cue: see the table)</span>
      </div>

      <div className="mt-4 rounded-lg bg-slate-900/60 p-3 text-sm">
        <h3 className="font-semibold text-slate-200">Face layout</h3>
        <p className="mt-1 text-slate-400">
          {edited
            ? 'Edited layout — matches the numbering you set.'
            : ADJACENCY_VERIFIED[sides]
              ? `Standard D${sides} layout.`
              : LAYOUT_SOURCE[sides]
                ? `Default layout copied from ${LAYOUT_SOURCE[sides]}. Edit it if your die is numbered differently.`
                : 'Default layout — edit to match your die. Opposite faces are right, but which numbers touch varies between dice makers.'}
          {sum !== null && !pairsOk && ` Note: opposite faces no longer sum to ${sum}.`}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-slate-300">
            Swap number
            <select value={selected ?? ''} onChange={(e) => setSelected(e.target.value === '' ? null : Number(e.target.value))} className="ml-2 rounded border border-slate-700 bg-slate-900 px-2 py-1">
              <option value="">…</option>
              {labels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="text-slate-300">
            with
            <select value={swapWith ?? ''} onChange={(e) => setSwapWith(e.target.value === '' ? null : Number(e.target.value))} className="ml-2 rounded border border-slate-700 bg-slate-900 px-2 py-1">
              <option value="">…</option>
              {labels.filter((l) => l !== selected).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <button type="button" onClick={swap} disabled={selected === null || swapWith === null} className="rounded-lg bg-indigo-500 px-3 py-1 font-semibold text-white disabled:opacity-40">
            Swap
          </button>
          <button type="button" onClick={reset} disabled={!edited && selected === null} className="rounded-lg border border-slate-700 px-3 py-1 disabled:opacity-40">
            Reset layout
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Tip: click a face on the die to pick its number. Changing the layout never changes your recorded rolls. Layouts aren't saved between visits.</p>
      </div>
    </section>
  );
}
