# Dice face layouts used by the 3D die view

What is verified and what is not. Source for the verified rules: Wikipedia, "Dice" (sections on standard variations and on right/left-handed dice), which cites the Greek Anthology (opposite faces of a D6 sum to 7) and the Standard Dice reference.

| Die | Verified | Not verified |
|-----|----------|--------------|
| D4 | Result is the vertex pointing up; no opposite faces | — |
| D6 | Opposite faces sum to 7; Western dice are right-handed (1, 2, 3 run counter-clockwise around a vertex) | Left-handed dice exist (e.g. many Chinese dice); use the editor |
| D8 | Opposite faces usually sum to 9 | Which faces touch |
| D10 | Numbered 0–9; opposite faces sum to 9 | Which faces touch |
| D12 | Opposite faces usually sum to 13 | Which faces touch |
| D20 | Opposite faces sum to 21 | Which faces touch |

For D8, D10, D12 and D20 the default layout (`defaultLayout` in `src/services/die/layout.ts`) only honours the opposite-pair rule; the remaining arrangement is deterministic but arbitrary. The UI says "Default layout — edit to match your die" for these. If you find an authoritative common layout, encode it in `defaultLayout` and flip `ADJACENCY_VERIFIED`.

The weight-direction arrow depends on where each number sits, so a wrong layout can point the arrow to the wrong side. That is why faces are editable.
