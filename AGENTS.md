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

## Hard rules
- **Statistics wording:** never say a die is "proven fair" or that p is the probability of bias. Never show 1 − p as confidence of bias. Live p-values are labelled exploratory. If N/S < 5, show "not enough data", not a p-value.
- No placeholder or example stats shown as real results; empty session shows an empty state. No NaN/Infinity ever reaches the UI.
- Invalid input (blank, decimal, negative, non-numeric, out of 1..S) must not change data. Input clears and stays focused after every submit attempt. Numpad and top-row digits both work; Enter and numpad Enter each submit exactly once.
- Switching die requires a confirm dialog; confirming discards the session.
- Timestamps never affect statistics.
- Do not add persistence, export, or backend without being asked (explicit non-goals for v1).
- Stats code needs unit tests with deterministic data; compare against known reference values.
- Don't add dependencies for stats; implement in-house.

## Conventions
- TypeScript strict. Small, named components. Tailwind utilities, dark-first. Visible focus states; color is never the only status cue.
- Vite `base` must match the GH Pages repo path.
