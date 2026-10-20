# paper-grain

SPEC §3 row 2 (tier A), built in PLAN step 3. Status: **done**.

Her scratchy grey paper with a riso grain that shifts at 8 fps.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** `.fx-layer--grain`, the fixed full-viewport layer above the content and below the chrome (`--z-grain`, `pointer-events: none`, from base.css).
- **Writes:** only inside the mount, plus `data-state` (`moving` or `still`) on the mount, which tests read.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Imports `core/raster` (`noiseTile`) and `core/ticker` (for `?freeze`).
- **Screenshots:** `npm run shots -- paper-grain` writes `.shots/paper-grain-{t0,t125}@{390,1440}.png` and `paper-grain-info-t0@390.png`.
- **Tests:** `paper-grain.spec.ts` covers:
  - it shows, sits between the content and the chrome, and never takes a tap
  - 8 fps stepping (t0 = t60, t0 ≠ t125)
  - 4.5:1 text contrast, pixel-sampled behind info text, in teal-coral and mauve
  - reduced motion

## How it works

1. **Tiles.** `raster.noiseTile` makes four tiles of 192 CSS px each, at device resolution with DPR capped at 2, so one speck is one CSS px. Only the black specks are kept, about 32 % of pixels, each at alpha 0.04. Building the tiles takes one tile per idle slice.
2. **Multiply, without a blend mode.** Black at alpha *a*, composited normally, gives exactly the same result as multiplying the paper by (1 − *a*). The grain is a 4 % multiply without paying for `mix-blend-mode`, which would add a full-screen backdrop pass on every scroll frame.
3. **One layer.** The four tiles are packed into a 2×2 super-tile, repeated on a single field one tile larger than the viewport.
4. **Cycle.** A `step-end` CSS `transform` shifts the field by one tile: across, down, then both. Every point of the screen cycles through all four tiles at `--fps-grain` (8). This is compositor-only, so no JavaScript runs per step. Hidden tabs stop it by themselves.
5. **Clock.** `?freeze=<ms>` pauses the animation at `-<ms>`, the same as the ticker's freeze.

| Quality | Grain |
|---|---|
| `full` | four tiles, cycled at 8 fps |
| `lite` | one still field. A full-screen layer redrawn 8×/s is the extra a slow device drops. |
| `static` | one still field |

## Numbers

**Contrast.** Measured at 390 px, `?freeze=0`. "Worst" is the 1st-percentile background pixel behind the text, with the glyphs hidden.

| Colorway | Without grain | With grain |
|---|---|---|
| teal-coral | 5.96:1 | 5.44:1 |
| mauve-periwinkle | 5.91:1 | **5.40:1** (lowest) |
| black-red | 11.88:1 | 10.85:1 |

**Cost.** Chromium at 390×844, DPR 2, 4× CPU throttle. The VM uses software GL, so compositor numbers are pessimistic.
- **Per step:** main thread 0.9 ms/s in total, the same as the page with every effect off (1.0 ms/s). No step frames run on the main thread.
- **Compositor:** 15 ms/s, worst task 2.9 ms.
- **One-time:** the tiles are ready 0.7 s after load. One long task of 53 ms, 3 ms of TBT. Built in a single task, the four tiles were 252 ms.
- **Memory:** one field of (viewport + 192 px)² at DPR 2, ≈ 9.6 MB on a 390 px phone. Four stacked tile layers would be ≈ 21 MB.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--fps-grain` | `src/styles/tokens.css` | 8 | Steps per second |
| `GRAIN_MAX` | `index.ts` | 0.04 | Darkness of a speck (PLAN's cap behind text is 4 %) |
| `COVERAGE` | `index.ts` | 0.32 | Share of pixels that print a speck |
| `TILE` | `index.ts` | 192 | Tile edge in CSS px. Smaller repeats visibly. |
| `SEEDS` | `index.ts` | 7, 23, 59, 101 | The four tiles |
