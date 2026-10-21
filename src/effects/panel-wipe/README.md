# panel-wipe

SPEC §3 row 9 (tier A), built in PLAN step 10. Status: **done**.

Each section header enters once from behind a flat block, accent or ink by turns, that slides off it.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mounts:** one `[data-fx="panel-wipe"]` in each section header (Info is the root; Projects and Credits carry `data-part`). Each carries `data-state`: `covered`, `wiping` or `done`. Inside it, while covered or wiping: `.panel-wipe > .panel-wipe__block`.
- **Writes outside the mounts:** nothing.
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/scroll` (`onEnter`), `core/palette` (`duration`) and `core/clock` (`frozenAt`). It loads at `idle`; the blocks move with the Web Animations API.
- **Screenshots:** `npm run shots -- panel-wipe` writes `.shots/panel-wipe-info-covered@390.png` (`?freeze=0`: the block over the header), `panel-wipe-info-mid-wipe@{390,1440}.png` (220 ms in), `panel-wipe-info-end@{390,1440}.png` and `panel-wipe-info-reduced@390.png` (headings, no blocks).
- **Tests:** `panel-wipe.spec.ts`: headers below the fold start covered, accent/ink/accent; each wipes once on entering and its block is removed; the heading stays in the accessibility tree and the block is absolute and moves by transform; CLS ≤ 0.01 and no sideways scroll while scrolling through every section; focus from the menu finishes the wipe; a header already on screen at load gets no block; reduced motion is off.

## How it works

1. **Cover.** At init, every header that is off screen gets a block: a flat accent or ink rectangle (by turns, from the tokens), filling a wrap that reaches 0.5 rem past the header box so it also covers the screen tag's frame strokes. The wrap clips the block, so sliding off never widens the page. A header already on screen gets no block: covering what someone is reading would be a flash, not an entrance.
2. **Wipe.** On the header's first `scroll.onEnter` (15 % visible), the block slides off to the right over `--dur-wipe` (500 ms) with `--ease-in-out`, then is removed. Each section plays once. Like the palette wipe, it's a flat printed block, so it moves smoothly rather than stepping.
3. **Accessibility.** The heading is never moved, hidden or re-parented: the block sits in an `aria-hidden` mount over it, `position: absolute`, transform only, so there's no layout shift. Focus landing in a header (the menu jumps to a section's `h2`) finishes that wipe at once, so the focus ring is never under a block.
4. **Freeze.** `?freeze=<ms>` holds each wipe at that time after its header enters.

| Quality | What runs |
|---|---|
| `full`, `lite` | as above (no extras to drop) |
| `static` | off: the headings are simply there |

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--dur-wipe` | `src/styles/tokens.css` | 500ms | How long a block takes to slide off |
| `--ease-in-out` | `src/styles/tokens.css` | `cubic-bezier(0.65, 0, 0.35, 1)` | Its easing |
| `.panel-wipe` inset | `style.css` | −0.5rem | How far the block reaches past the header box |
| `threshold` | `core/scroll` `onEnter` default | 0.15 | How much of the header shows before it wipes |
