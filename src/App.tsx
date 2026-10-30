import { useState } from 'react';
import { DieViewSection } from './components/DieViewSection';
import { DiceSelector } from './components/DiceSelector';
import { DistributionChart } from './components/DistributionChart';
import { FaceStatisticsTable } from './components/FaceStatisticsTable';
import { FairnessAssessment } from './components/FairnessAssessment';
import { RollHistory } from './components/RollHistory';
import { RollInput } from './components/RollInput';
import { useDiceSession } from './hooks/useDiceSession';

export default function App() {
  const s = useDiceSession(6);
  const [focusSignal, setFocusSignal] = useState(0);
  const total = s.rolls.length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dice Fairness Tester</h1>
          <p className="text-sm text-slate-400">Roll a physical die, type the result, press Enter.</p>
        </div>
        <div className="text-right" aria-live="polite">
          <div className="text-xs uppercase tracking-wide text-slate-400">D{s.diceType} · total rolls</div>
          <div className="text-5xl font-bold tabular-nums">{total}</div>
        </div>
      </header>

      <DiceSelector
        value={s.diceType}
        hasData={total > 0}
        onChange={(d) => {
          s.switchDice(d);
          setFocusSignal((n) => n + 1);
        }}
      />

      <RollInput
        sides={s.diceType}
        canUndo={total > 0}
        onRoll={s.addRoll}
        onUndo={s.undo}
        focusSignal={focusSignal}
      />

      <FairnessAssessment result={s.fairness} sides={s.diceType} />

      <section aria-label="Distribution" className="rounded-xl border border-slate-800 p-4">
        {total === 0 ? (
          <p className="mb-2 text-sm text-slate-400">
            Enter your first roll to start. The dashed line is where each face would sit on a fair die (
            {s.faces[0].expectedPercentage.toFixed(2)}%); the whiskers are 95% intervals that narrow as you roll.
          </p>
        ) : (
          <p className="mb-2 text-sm text-slate-400">
            Whiskers are 95% Wilson intervals for each face. Dashed line = fair die.
          </p>
        )}
        <DistributionChart faces={s.faces} total={total} />
      </section>

      <RollHistory rolls={s.rolls} />

      <DieViewSection key={s.diceType} sides={s.diceType} faces={s.faces} fairness={s.fairness} />

      <section className="rounded-xl border border-slate-800 p-4">
        <FaceStatisticsTable faces={s.faces} />
      </section>
    </main>
  );
}
