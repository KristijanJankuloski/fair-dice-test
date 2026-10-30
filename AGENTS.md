# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this is
A static React app (deployed to GitHub Pages) for testing whether a physical die is fair. User picks D4/D6/D8/D10/D12/D20, types each roll result, presses Enter; a bar chart with Wilson-interval error bars and a plain verdict update live. Design: `docs/superpowers/specs/2026-10-29-fair-dice-tester-design.md`. The original long spec is background only; the design doc overrides it.

## Stack
React + TypeScript + Vite + Tailwind CSS + Recharts + Lucide. Vitest for tests. No backend, no router, no persistence.

## Commands (once scaffolded)
- `npm install`
- `npm run dev` — local dev server
- `npm run build` — typecheck + production build
- `npm test` — Vitest
- `npm run lint`
Run `npm test` and `npm run build` before declaring work done.

## Layout
- `src/services/` — pure TypeScript statistics (no React imports): expected/observed %, drift, chi-square, p-value, Wilson interval.
- `src/components/` — UI; `src/hooks/` — session state; `src/utils/validation.ts` — roll input validation.
- Keep the stats engine independent of React so it stays testable.

## 3D die view
- `src/services/die/` is pure TypeScript (geometry, layouts, weight direction, colours) with tests; keep three.js out of it. Only `src/components/Die3D.tsx` imports three.js, and it is loaded with `React.lazy` once the section scrolls into view. Don't import it statically.
- A "slot" is a position that carries a number (a face; for the D4, a vertex). `layout[slot]` is the printed number; layouts must stay permutations (swap, never overwrite). D10 labels are 0-9.
- Weight arrow: `w = −Σ (count − expected) · direction_of_slot`. It is shown only with enough data AND "evidence of deviation", and is always labelled an estimate. Don't loosen this.
- Layouts for D8-D20 are not verified beyond opposite-pair sums; see `docs/dice-layouts.md` and keep the "default layout" notice for those.
- Layouts are not persisted (decided); they reset when the die changes.
- Headless Chromium on this box needs an ALSA stub and `--use-gl=swiftshader --enable-unsafe-swiftshader` to render WebGL for screenshots.

## Hard rules
- **Statistics wording:** never say a die is "proven fair" or that p is the probability of bias. Never show 1 − p as confidence of bias. Live p-values are labelled exploratory. If N/S < 5, show "not enough data", not a p-value.
- No placeholder or example stats shown as real results; empty session shows an empty state. No NaN/Infinity ever reaches the UI.
- D10 is labelled 0-9 in the UI (0 listed first). Input accepts 0-9 only (10 is rejected); internally the 0 face is stored as 10. Other dice reject 0.
- Invalid input (blank, decimal, negative, non-numeric, out of 1..S) must not change data. Input clears and stays focused after every submit attempt. Numpad and top-row digits both work; Enter and numpad Enter each submit exactly once.
- Switching die requires a confirm dialog; confirming discards the session.
- Timestamps never affect statistics.
- Do not add persistence, export, or backend without being asked (explicit non-goals for v1).
- Stats code needs unit tests with deterministic data; compare against known reference values.
- Don't add dependencies for stats; implement in-house.

## Conventions
- TypeScript strict. Small, named components. Tailwind utilities, dark-first. Visible focus states; color is never the only status cue.
- Vite `base` must match the GH Pages repo path.

## Workflow
- Never commit to `master`. Work on a feature branch (`feat/…`, `fix/…`, `docs/…`) and open a PR. Merging to `master` triggers the GitHub Pages deploy.
- Local Node may be 18 (Vite 5, Vitest 2, jsdom 24, Tailwind 3 are pinned for that). CI uses Node 20. Don't bump to tooling that needs Node 20+ without checking.
- Recharts 3: `ErrorBar` has its own animation and renders invisible (scaleY(0)) unless `isAnimationActive={false}` is set on it.
