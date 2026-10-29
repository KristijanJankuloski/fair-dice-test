import type { FaceStatistics } from '../types/dice';

const pct = (v: number | null, d = 2) => (v === null ? '—' : `${v.toFixed(d)}%`);
const signed = (v: number | null, unit: string) =>
  v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}${unit}`;

export function FaceStatisticsTable({ faces }: { faces: FaceStatistics[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">Per-face statistics</caption>
        <thead className="text-slate-400">
          <tr>
            <th className="py-2 pr-3">Face</th>
            <th className="pr-3">Count</th>
            <th className="pr-3">Observed</th>
            <th className="pr-3">Expected</th>
            <th className="pr-3" title="Observed minus expected, in percentage points">Drift (pp)</th>
            <th className="pr-3" title="Drift as a percentage of the expected frequency">Relative dev.</th>
            <th title="95% Wilson interval for the face's true probability. Descriptive only.">95% interval</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {faces.map((f) => (
            <tr key={f.face} className="border-t border-slate-800">
              <th scope="row" className="py-1.5 pr-3 font-semibold">{f.face}</th>
              <td className="pr-3">{f.count}</td>
              <td className="pr-3">{pct(f.observedPercentage)}</td>
              <td className="pr-3">{pct(f.expectedPercentage)}</td>
              <td className="pr-3">{signed(f.driftPercentagePoints, ' pp')}</td>
              <td className="pr-3">{signed(f.relativeDeviationPercentage, '%')}</td>
              <td>
                {f.confidenceInterval95
                  ? `${f.confidenceInterval95.lower.toFixed(1)}–${f.confidenceInterval95.upper.toFixed(1)}%`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
