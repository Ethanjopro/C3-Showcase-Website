# palette

SPEC §3 row 7 (tier B), built in PLAN step 8. Status: **done**.

Picking one of her six colorways slides a flat block of the new accent, then one of the new ink, across the page. The colorway changes while the ink covers everything, and the blocks slide off the far side, ink first, so the page comes out recolored, art included. The choice persists (core/palette).

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the fixed full-viewport wipe layer (`.fx-layer--wipe`, above everything, `pointer-events: none`). It carries `data-state`: `idle` or `wiping`. During a wipe it holds `.palette-wipe[data-colorway=<new>]` with the two blocks; they're created for the wipe and removed after it.
- **Writes outside the mount:** nothing. It registers `palette.setTransition()`; core/palette writes `<html data-colorway>` when the transition calls `apply()` (writer table).
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/palette` (`setTransition`) and `core/clock` (`frozenAt`). No GSAP: the blocks move with the Web Animations API.
- **Screenshots:** `npm run shots -- palette` writes `.shots/palette-poster-<colorway>@390.png` for all six, `palette-mid-wipe@{390,1440}.png` (420 ms: the ink leaving over the accent), `palette-mid-wipe-late@390.png` (500 ms: the accent leaving, the new colorway behind it) and `palette-info-indigo-pink@390.png`.
- **Tests:** `palette.spec.ts`: the order (accent and ink blocks, swap under the ink, uncover, about 600 ms); the blocks wear the new colorway's tokens and move by transform; arrow keys in the radio group; persistence across a reload; quick picks don't queue a wipe each; reduced motion swaps instantly; lite uses one block; art, UI and text all recolor. Contrast for all six colorways is the shared unit test `tests/unit/contrast.test.ts`.

## How it works

1. **Cover.** The wrapper carries the new colorway's `data-colorway`, so the blocks use that colorway's `--accent` and `--ink` before the page does (tokens.css defines each colorway on any `[data-colorway]` element). The accent block slides in from the left, and the ink block follows it, on top, trailing by `TRAIL` of the half. Easing is `--ease-in-out`: these are flat printed blocks, not hand-drawn lines, so they move smoothly rather than stepping.
2. **Swap.** When both have covered the page (half of `--dur-palette`), `apply()`: core/palette sets `<html data-colorway>`, stores it, and emits the bus `colorway` event, so canvas and WebGL effects (xray, halo-menu) redraw under the ink. This effect never touches them.
3. **Uncover.** The ink slides off to the right first, showing the accent, then the accent, showing the recolored page.
4. **Quick picks.** core/palette runs requests one at a time. A pick within `COALESCE` ms of the last wipe ending swaps instantly, so holding an arrow key in the radio group doesn't queue a 600 ms wipe per colorway, and no more than about one full-screen wipe plays per 0.6 s (SPEC §6: nothing flashes more than three times a second).
5. **Freeze.** `?freeze=<ms>` holds the wipe at that time after a pick (the mid-wipe shots). core/palette still applies the colorway when the held transition returns.
6. **Hidden tab:** swaps instantly.

| Quality | What runs |
|---|---|
| `full` | accent block, then ink block |
| `lite` | the ink block alone |
| `static` | no transition registered: the swap is instant (core/palette's default) |

## Proposed shared change

`core/palette.number()` drops units, and the build's CSS minifier rewrites `--dur-palette: 600ms` as `.6s`, so `number('dur-palette', 600)` returns 0.6 and the wipe ran in about 20 ms. This effect parses the unit itself (`duration()` in `index.ts`). Proposed: a `duration(token, fallback)` helper in `core/palette` that understands `s` and `ms`, used by every effect that reads a `--dur-*` token.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--dur-palette` | `src/styles/tokens.css` | 600ms | The whole wipe, cover and uncover |
| `--ease-in-out` | `src/styles/tokens.css` | `cubic-bezier(0.65, 0, 0.35, 1)` | The blocks' easing |
| `TRAIL` | `index.ts` | 0.27 | How far the second block trails the first, as a share of each half |
| `COALESCE` | `index.ts` | 350 ms | A pick this soon after the last wipe swaps instantly |
