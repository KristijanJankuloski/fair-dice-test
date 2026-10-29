export function RollHistory({ rolls }: { rolls: number[] }) {
  const recent = rolls.slice(-10).reverse();
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-400">Last 10 rolls</h2>
      {recent.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No rolls yet.</p>
      ) : (
        <ol className="mt-2 flex flex-wrap gap-2" aria-label="Most recent rolls, newest first">
          {recent.map((v, i) => (
            <li key={rolls.length - i} className="min-w-10 rounded-md bg-slate-800 px-2 py-1 text-center font-mono">
              {v}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
