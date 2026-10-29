import type { FairnessResult } from '../types/dice';

const fmtP = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`);

export function FairnessAssessment({ result, sides }: { result: FairnessResult; sides: number }) {
  const { assessment, pValue, chiSquare, significanceLevel, totalRolls } = result;
  const needed = sides * 5;

  let title: string;
  let body: string;
  let tone: string;
  let marker: string;
  if (assessment === 'insufficient-data') {
    title = 'Not enough data yet';
    body = `Keep rolling. A reliable assessment needs at least ${needed} rolls for a D${sides} (an average of 5 per face).`;
    tone = 'border-slate-600 bg-slate-800/50';
    marker = '…';
  } else if (assessment === 'consistent-with-fairness') {
    title = 'No evidence of bias yet';
    body = 'The results are currently consistent with a fair, uniform distribution. This does not prove the die is fair.';
    tone = 'border-emerald-600/60 bg-emerald-950/30';
    marker = '✓';
  } else {
    title = 'Evidence of bias detected';
    body =
      'The observed distribution differs from what a fair die would usually produce. Consider collecting a fresh, independent sample and checking your rolling method.';
    tone = 'border-amber-500/70 bg-amber-950/30';
    marker = '!';
  }

  return (
    <section aria-label="Fairness assessment" className={`rounded-xl border p-5 ${tone}`}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full bg-slate-700 text-sm">
          {marker}
        </span>
        {title}
      </h2>
      <p className="mt-2 text-sm text-slate-300">{body}</p>
      {pValue !== null && chiSquare !== null && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div>
            <dt className="text-slate-400" title="How far the counts are from perfectly even">
              χ² ({result.degreesOfFreedom} df)
            </dt>
            <dd className="font-mono">{chiSquare.toFixed(2)}</dd>
          </div>
          <div>
            <dt
              className="text-slate-400"
              title="Chance of results at least this uneven if the die were fair. It is not the probability the die is fair or biased."
            >
              p-value
            </dt>
            <dd className="font-mono">{fmtP(pValue)}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Threshold</dt>
            <dd className="font-mono">α = {significanceLevel}</dd>
          </div>
        </dl>
      )}
      {totalRolls > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          Live / exploratory: this p-value is recalculated after every roll, so dipping below {significanceLevel} at
          some point is not a controlled 5% test. Treat it as a guide, and confirm with a fresh sample.
        </p>
      )}
    </section>
  );
}
