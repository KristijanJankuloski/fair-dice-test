# Fair Dice Tester — Design

## Intent
Someone suspects a physical die is off. They open a static GitHub Pages site, pick the die, type each roll result and press Enter, and watch a bar chart show how far each face drifts from fair, with a confidence indicator that tightens as rolls accumulate. They leave with an honest answer: "not enough data", "no evidence of bias yet", or "evidence of bias". The app never claims to prove a die is fair.

Source material: `dice-fairness-tester-spec.md` (Kristijan's long spec). This document **narrows** that spec; where they differ, this document wins.

## Goals
- Fastest possible roll entry: type a number, press Enter, repeat. Works with numpad and top-row number keys (and numpad Enter).
- Live bar chart per face: observed %, dashed fair line at 100/S %, 95% Wilson interval as error bars on each bar.
- Statistically honest verdict beside the chart.
- Fully static: runs in the browser, deployed to GitHub Pages. No backend, no accounts.

## Non-goals
- No saved sessions, multiple sessions, localStorage/IndexedDB, or CSV export (spec §10 and the export parts of §5.3 cut for v1).
- No Detection Power planner (spec §9), no target-sample-size / formal-checkpoint mode (spec §7), no exact multinomial / Monte Carlo fallback, no percentile dice, no settings for alpha.

## Anti-goals
- A single "% confident the die is biased" number built from 1 − p. Rejected: it swings, and misleads on small samples.
- Any copy implying the die is proven fair, or that p is the probability of bias.
- Traffic-light status driven by one face's drift.

## Decided with the user
1. Static GH Pages app; pick die (D4, D6, D8, D10, D12, D20), type result, Enter.
2. Bar chart of per-face bias percentage; confidence shown as Wilson interval error bars that narrow with more rolls, plus a plain verdict.
3. Switching die opens a confirm dialog warning data will be lost; confirming wipes the session. Closing the tab also loses data.
4. Input accepts numpad and top-row digits equally.
5. Stack: React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide icons; pure-TS stats module with unit tests. GH Pages deploy via GitHub Action.

## Builder's calls (not yet confirmed by the user — flag on review)
- **Undo Last Roll** is kept (typo on a numpad is likely).
- **Verdict thresholds:** if N/S < 5 → "Keep rolling, not enough data yet" (no p-value shown). Otherwise Pearson chi-square, df = S−1, upper-tail p, α = 0.05 fixed and shown.
  - p ≥ α: "No evidence of bias yet. This doesn't prove the die is fair."
  - p < α: "Evidence of bias detected, p = …" plus the spec §8 advice to collect a fresh sample and check the rolling method.
  - p-value always labelled **live / exploratory** because it is recomputed every roll (peeking inflates false positives).
- **Per-face:** intervals and drift only; no per-face "significant" labels, so Holm correction is unnecessary.
- **p-value computation:** implement regularized upper incomplete gamma in-house (no stats dependency); verify against known reference values in tests.
- **Input handling:** a single text input with `inputmode="numeric"`; validate on Enter; accept only integers in 1..S; reject everything else without changing data; clear and keep focus after success and after errors; guard against double-submit on key repeat (ignore `event.repeat`). Multi-digit values (e.g. 12, 20) are typed then confirmed with Enter — no auto-submit.
- **D10:** physical D10s are numbered 0–9 with 0 meaning 10, so typing `0` on a D10 records 10 (user request, post-v1). Other dice still reject 0.
- **Face table** (count, observed %, expected %, drift in pp, relative deviation, 95% interval) kept below the chart; recent-rolls strip shows last 10.
- **Layout:** dark-first, input and total count are the most prominent elements; chart scrolls horizontally on narrow screens for D20.
- **Hosting path:** Vite `base` set to the repo name for GH Pages.

## Statistics definitions (from the spec, unchanged)
E = N/S. Observed % = O_i/N·100 (null when N=0). Drift = observed % − 100/S in percentage points. Relative deviation = drift / (100/S) · 100. Wilson 95% interval (z = 1.96) on O_i out of N. χ² = Σ (O_i−E)²/E. Never produce NaN/Infinity for N=0.

## Testing
Unit tests (Vitest) for the stats module: expected %, counts sum to N, percentages sum to 100, zero drift on a balanced set, χ² against hand-computed examples, p-value against reference values, Wilson against known cases, N=0 safety, low-count gate. Component/interaction tests for validation, Enter and numpad Enter submitting exactly one roll, input clearing + focus, undo, and the die-switch confirm dialog.

## Left to the builder
Exact visual styling, component split (spec §11 structure is a reasonable guide minus the cut files), chart tooltip content, empty-state copy.
