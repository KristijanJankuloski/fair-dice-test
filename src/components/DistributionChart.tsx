import { Bar, BarChart, CartesianGrid, ErrorBar, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FaceStatistics } from '../types/dice';

interface Row {
  face: number;
  observed: number;
  count: number;
  expected: number;
  err: [number, number];
  lower: number;
  upper: number;
}

export function DistributionChart({ faces, total }: { faces: FaceStatistics[]; total: number }) {
  const expected = faces[0]?.expectedPercentage ?? 0;
  const data: Row[] = faces.map((f) => {
    const observed = f.observedPercentage ?? 0;
    const ci = f.confidenceInterval95;
    return {
      face: f.face,
      observed,
      count: f.count,
      expected: (total * expected) / 100,
      err: ci ? [observed - ci.lower, ci.upper - observed] : [0, 0],
      lower: ci?.lower ?? 0,
      upper: ci?.upper ?? 0,
    };
  });
  const yMax = Math.min(
    100,
    Math.max(expected * 2, ...data.map((d) => d.upper), 10),
  );

  return (
    <div className="overflow-x-auto" role="img" aria-label="Bar chart of observed percentage per face with a reference line at the fair-die percentage">
      <div style={{ minWidth: Math.max(320, faces.length * 36) }} className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="face" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" unit="%" domain={[0, Math.ceil(yMax)]} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.1)' }}
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as Row;
                const drift = d.observed - expected;
                return (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs">
                    <div className="mb-1 font-semibold">Face {d.face}</div>
                    <div>Count: {d.count} (expected {d.expected.toFixed(1)})</div>
                    <div>Observed: {total ? d.observed.toFixed(2) : '—'}%</div>
                    <div>Expected: {expected.toFixed(2)}%</div>
                    {total > 0 && (
                      <>
                        <div>Drift: {drift >= 0 ? '+' : ''}{drift.toFixed(2)} pp</div>
                        <div>95% interval: {d.lower.toFixed(1)}–{d.upper.toFixed(1)}%</div>
                      </>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="observed" fill="#818cf8" isAnimationActive={false} radius={[3, 3, 0, 0]}>
              <ErrorBar dataKey="err" stroke="#e2e8f0" strokeWidth={1.5} width={6} isAnimationActive={false} />
            </Bar>
            <ReferenceLine
              y={expected}
              stroke="#fbbf24"
              strokeDasharray="6 4"
              label={{ value: `fair ${expected.toFixed(2)}%`, fill: '#fbbf24', fontSize: 11, position: 'insideTopLeft' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
