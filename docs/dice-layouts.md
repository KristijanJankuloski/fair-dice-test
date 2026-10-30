# Dice face layouts used by the 3D die view

What is verified and what is not. Source for the verified rules: Wikipedia, "Dice" (sections on standard variations and on right/left-handed dice), which cites the Greek Anthology (opposite faces of a D6 sum to 7) and the Standard Dice reference.

| Die | Verified | Not verified |
|-----|----------|--------------|
| D4 | Result is the vertex pointing up; no opposite faces | — |
| D6 | Opposite faces sum to 7; Western dice are right-handed (1, 2, 3 run counter-clockwise around a vertex) | Left-handed dice exist (e.g. many Chinese dice); use the editor |
| D8 | Opposite faces usually sum to 9 | Which faces touch |
| D10 | Numbered 0–9; opposite faces sum to 9. **Full layout copied from the user's blue D10**, see below | Other makers' D10s may differ; use the editor |
| D12 | Opposite faces usually sum to 13 | Which faces touch |
| D20 | Opposite faces sum to 21. **Full layout copied from the user's blue D20** (gold numbers), see below | Other makers' D20s may differ; use the editor |

For D8, D10, D12 and D20 the default layout (`defaultLayout` in `src/services/die/layout.ts`) only honours the opposite-pair rule; the remaining arrangement is deterministic but arbitrary. The UI says "Default layout — edit to match your die" for these. If you find an authoritative common layout, encode it in `defaultLayout` and flip `ADJACENCY_VERIFIED`.

The weight-direction arrow depends on where each number sits, so a wrong layout can point the arrow to the wrong side. That is why faces are editable.

## D20: reconstructed from photos

Nine photos of one blue D20 gave these directly readable facts: 20 touches 2, 14, 8 (clockwise 2 → 14 → 8 seen from outside); 1 touches 19, 7, 13; 10 touches 12, 8, 17; 16 touches 8, 6, 3; 17 touches 10, 3, 7; 18 touches 4, 2, 5; 4 touches 11, 18. An exhaustive search over all icosahedron labellings with opposite faces summing to 21 found exactly **one** labelling (including handedness) consistent with all of it. Its mirror image fails the winding order read independently from faces 1, 16, 17 and 18, so the chirality is confirmed too. The clockwise neighbour triples are stored in `D20_CLOCKWISE` in `src/services/die/layout.ts`, and a test checks every face.

One glyph was initially read as 9 (face 16's neighbour) and made the search impossible; the dotted glyph is a 6 (dots mark 6 and 9), and with 6 the solution is unique.

The user has two D20 sets that differ; this is one of them. The editor covers the other.

## D10: read from photos

Three photos of one blue D10 (gold numbers). Looking down on each pointed apex from outside, clockwise:

- evens: 2, 6, 4, 0, 8
- odds: 1, 9, 5, 3, 7

Evens sit around one apex and odds around the other, and opposite faces sum to 9 (0-9, 2-7, 4-5, 6-3, 8-1), which is consistent with both rings. The odd ring was read from a separate photo; the one implied by the even ring plus the opposite-sum rule matches it, so the handedness is cross-checked, not assumed. The dotted glyphs are 6 and 9 (one of each, one per cone). The layout is stored as `D10_BY_SLOT` in `src/services/die/layout.ts` and tested against the geometry.

Side photo check (not used to build the layout): in the resting photo 0 sits among 8, 3 and 7, and 3 touches 8 and 7. In the layout 0 touches 8, 3, 7, 4 and 3 touches 7, 0, 8, 5, which agrees.
