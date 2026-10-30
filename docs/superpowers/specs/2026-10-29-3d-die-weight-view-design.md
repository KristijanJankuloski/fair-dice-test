# 3D Die Weight View — Design

Extends `2026-10-29-fair-dice-tester-design.md` (v1). Where they differ, this document wins for this feature.

## Intent
After rolling, the user wants to *see* where on the physical die the problem might be. A rotatable 3D model of the selected die shows each face coloured by how far its count is from fair, plus a dashed arrow pointing to where the weight probably sits. It is a visual hint layered on the existing statistics, never a stronger claim than them.

## Goals
- Rotatable 3D die for D4, D6, D8, D10 (faces 0–9), D12, D20 with the face numbers drawn on it.
- Faces coloured on a diverging scale: blue = under-represented, grey = near fair, orange = over-represented.
- Dashed "estimated weight direction" arrow, always labelled as an estimate.
- Face numbering is **editable**, because the user's own sets differ from each other and from any "standard".
- Placed in the page directly **below the "last 10 rolls" row** (user's choice).

## Non-goals
- Not a proof of where the weight is; not a physical simulation.
- No second, equivalent 2D view (the opposite-pair bar idea was rejected in favour of 3D).
- No sharing/export of layouts.

## Anti-goals
- An arrow that appears on thin data or when the overall test sees nothing. A confident-looking arrow on noise would mislead more than no feature at all.
- Making roll entry slower: the 3D code must not load until it is needed.

## Decided with the user
1. 3D die, rotatable (chosen over opposite-pair bars and an unfolded net).
2. Sits below the last-10-rolls row.
3. Use the most common layout per die as default, but faces are editable (two physical sets differ).
4. Edited layouts are not saved between visits (for now).

## Builder's calls (flag on review)
- **Weight direction maths.** A heavy side tends to land down, so the face pointing up is on the opposite side. Let `d_i = O_i − E` for outcome `i` and `n_i` the unit direction that outcome `i` points when it is the result (the face normal; for a D4, the direction of the vertex that points up). The estimated weight direction is `w = −Σ d_i · n_i`, drawn from the die centre. Arrow length is scaled by `|w|` and capped; only the direction is meaningful, so the label never quotes a magnitude. For a D6 this reduces to "weight sits opposite the over-represented face".
- **Gating (all three must hold to show the arrow):** at least `5 × sides` rolls (same gate as the verdict), the overall chi-square verdict is "evidence of bias", and `|w|` is non-zero. Below the gate, the die is shown neutral grey with a short note why. If the verdict is "no evidence", faces are still coloured (descriptive) but there is no arrow.
- **Colour scale:** by relative deviation `(O_i − E)/E`, clamped to ±50% for the colour ramp. Colour is never the only cue: each face also shows its count on hover/tap, and the arrow and its label carry the conclusion.
- **Rendering:** three.js, loaded with a dynamic `import()` the first time the section is on screen; the section shows a placeholder until then. Respect `prefers-reduced-motion` (no auto-spin). Drag to rotate (mouse and touch), keyboard-accessible reset-view button.
- **Geometry per die:** D4 tetrahedron (numbers at vertices), D6 cube, D8 octahedron, D10 pentagonal trapezohedron, D12 dodecahedron, D20 icosahedron. Opposite faces sum to `sides + 1` (D10 with 0–9 labels: pairs sum to 9, using the app's internal 0 ≡ 10). D4 has no opposite faces.
- **Default layouts:** must satisfy the opposite-pair rule above. Beyond that, the builder must pick the most common published layout per die and **cite the source in the code comment and in `docs/`**. If a layout can't be verified for a die (likely D12/D20), use a deterministic layout that satisfies the opposite-pair rule, and have the UI say "default layout — edit to match your die".
- **Editing faces:** an "Edit faces" mode. The user clicks a face, then clicks or types the number it should carry; because numbering must stay a permutation of `1..sides`, assigning a number already in use **swaps** the two faces. "Reset to default" restores the layout. Editing never changes recorded rolls or statistics, only where numbers sit on the model.
- **Layout state lives in memory only**, like the session (see open question below).
- **Accessibility/fallback:** if WebGL is unavailable, show a text list of the most over- and under-represented faces instead.

## Persistence (decided)
No saving for now: edited layouts live in memory and reset when the page is closed or the die is switched, matching v1. Remembering layouts (localStorage, per die type) is a possible later addition.

## Testing
- Pure module `src/services/weightDirection.ts` (no three.js import): unit tests for `w` on D6 with a single over-represented face (arrow opposite it), balanced data (zero vector), D4 vertex convention, and invariance when all counts are shifted equally.
- Layout module: every default layout is a permutation of the faces, opposite pairs sum to `sides + 1`, swap-on-assign keeps a permutation, reset restores default.
- Gating tests: no arrow below `5 × sides` rolls or with a "no evidence" verdict.
- Component test for the edit flow (select face, assign number, swap); WebGL itself is not unit-tested, verified in a real browser instead.

## Left to the builder
Camera, lighting, materials, label rendering on faces (canvas textures vs sprites), exact colour ramp, arrow styling, the layout-editor UI details, component names.
