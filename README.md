# Dice Fairness Tester

A small static web app for checking whether a physical die (D4–D20) is fair. Pick a die, type each roll and press Enter. A bar chart shows each face's observed percentage against the fair line, with 95% Wilson intervals as whiskers, and a verdict explains what the data can and can't say. Nothing is stored; closing the tab or switching dice discards the session.

```
npm install
npm run dev     # local dev server
npm test        # unit + interaction tests
npm run build   # typecheck + production build
```

Design: `docs/superpowers/specs/2026-10-29-fair-dice-tester-design.md`. Agent guidance: `AGENTS.md`.
