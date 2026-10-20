# palette

SPEC §3 row 7 (tier B), built in PLAN step 8. Status: **done**.

Picking one of her six colorways slides a flat block of the new accent, then one of the new ink, across the page. The colorway changes while the ink covers everything, and the blocks slide off the far side, ink first, so the page comes out recolored, art included. The choice persists (core/palette).

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the fixed full-viewport wipe layer (`.fx-layer--wipe`, above everything, `pointer-events: none`). It carries `data-state`: `idle` or `wiping`. During a wipe it holds `.palette-wipe[data-colorway=<new>]` with the two blocks; they're created for the wipe and removed after it.
- **Writes outside the mount:** nothing. It registers `palette.setTransition()`; core/palette writes `<html data-colorway>` when the transition calls `apply()` (writer table).
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/palette` (`setTransition`) and `core/clock` (`frozenAt`). No GSAP: the blocks move with the Web Animations API.
- **Screenshots:** `npm run shots -- palette` writes `.shots/palette-poster-<colorway>@390.png` for all six, `palette-mid-wipe@{390,1440}.png` (420 ms: the ink leaving over the accent), `palette-mid-wipe-late@390.png` (500 ms: the accent leaving, the new colorway behind it) and `palette-info-indigo-pink@390.png`.
- **Tests:** `palette.spec.ts`: the order (accent and ink blocks, swap under the ink, uncover, about 600 ms); the blocks wear the new colorway's tokens and move by transform; arrow keys in the radio group; persistence across a reload; quick picks don't queue a wipe each; holding an arrow key renders at most three changes a second; reduced motion swaps instantly; lite uses one block; art, UI and text all recolor. Contrast for all six colorways is the shared unit test `tests/unit/contrast.test.ts`.

## How it works

1. **Cover.** The wrapper carries the new colorway's `data-colorway`, so the blocks use that colorway's `--accent` and `--ink` before the page does (tokens.css defines each colorway on any `[data-colorway]` element). The accent block slides in from the left, and the ink block follows it, on top, trailing by `TRAIL` of the half. Easing is `--ease-in-out`: these are flat printed blocks, not hand-drawn lines, so they move smoothly rather than stepping.
2. **Swap.** When both have covered the page (half of `--dur-palette`), `apply()`: core/palette sets `<html data-colorway>`, stores it, and emits the bus `colorway` event, so canvas and WebGL effects (xray, halo-menu) redraw under the ink. This effect never touches them.
3. **Uncover.** The ink slides off to the right first, showing the accent, then the accent, showing the recolored page.
4. **Flash safety.** SPEC §6: nothing flashes more than three times a second. The page changes colorway at most once per `GAP` (350 ms). core/palette runs picks one at a time, so quick picks (holding an arrow key in the radio group) queue up:
   - each pick waits for the gap;
   - a pick that a newer one has already overtaken is applied in the same task as the newer one, so it never renders (core forces every queued pick to apply, so it can't simply be dropped);
   - a pick that had to wait swaps without a wipe.

   Holding an arrow key for 2 s gives about one visible change per 350 ms, never more than three in any second (tested on rendered frames). Full-screen wipes play at most about once per second.
5. **Freeze.** `?freeze=<ms>` holds the wipe at that time after a pick (the mid-wipe shots). core/palette still applies the colorway when the held transition returns.
6. **Hidden tab:** swaps instantly.
7. **destroy() mid-wipe:** the cancelled animations end the transition quietly, and core/palette applies the colorway itself.

| Quality | What runs |
|---|---|
| `full` | accent block, then ink block |
| `lite` | the ink block alone |
| `static` | no transition registered: the swap is instant (core/palette's default) |

## Proposed shared changes

- **Rate limit in core.** The flash limit above lives in this effect, so it holds only while the effect runs. Under reduced motion (no transition registered), core/palette's instant swaps aren't limited, and holding an arrow key recolors the page once per key repeat. Proposed: move the `GAP` limit (and the skip of overtaken picks) into `core/palette.request()`, so every swap path gets it.
- **Color bar re-sync.** `src/ui/colorbar.ts` re-checks the radio for each applied colorway. During a held arrow key, an intermediate apply moves the checked radio back to it, so the next arrow step starts from there. Proposed: sync the radios only when the applied colorway isn't the one the visitor has already moved past.
- **Durations.** `core/palette.number()` drops units, and the build's CSS minifier rewrites `--dur-palette: 600ms` as `.6s`, so `number('dur-palette', 600)` returns 0.6 and the wipe ran in about 20 ms. This effect parses the unit itself (`duration()` in `index.ts`). Proposed: a `duration(token, fallback)` helper in `core/palette` that understands `s` and `ms`, used by every effect that reads a `--dur-*` token.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--dur-palette` | `src/styles/tokens.css` | 600ms | The whole wipe, cover and uncover |
| `--ease-in-out` | `src/styles/tokens.css` | `cubic-bezier(0.65, 0, 0.35, 1)` | The blocks' easing |
| `TRAIL` | `index.ts` | 0.27 | How far the second block trails the first, as a share of each half |
| `GAP` | `index.ts` | 350 ms | At least this long between two visible colorway changes; a pick inside it waits and swaps without a wipe |
