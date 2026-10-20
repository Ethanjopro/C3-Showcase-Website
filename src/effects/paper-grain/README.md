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
  - 4.5:1 text contrast, pixel-sampled behind the poster's small print and the info text, in teal-coral and mauve
  - reduced motion

## How it works

1. **Tiles.** Four tiles of 192 CSS px each, built from two `raster.noiseTile`s per tile, at device resolution with DPR capped at 2.
   - A coarse noise tile, upscaled with no smoothing, places grains about 1.5 CSS px across on about 32 % of cells. Specks clump like riso tooth instead of forming an even 1 px haze.
   - A fine noise tile knocks 20 % of each grain's pixels out, giving ragged edges. It also varies each pixel's ink between half and full strength (alpha 0.02–0.04).
   - Only black is kept. Building takes one tile per idle slice. Lite and static build just one tile.
2. **Multiply, without a blend mode.** Black at alpha *a*, composited normally, gives exactly the same result as multiplying the paper by (1 − *a*). The grain is a 4 % multiply without paying for `mix-blend-mode`, which would add a full-screen backdrop pass on every scroll frame.
3. **One layer.** The four tiles are packed into a 2×2 super-tile, repeated on a single field one tile larger than the viewport.
4. **Cycle.** A `step-end` CSS `transform` shifts the field by one tile: across, down, then both. Every point of the screen cycles through all four tiles at `--fps-grain` (8). This is compositor-only, so no JavaScript runs per step. Hidden tabs stop it by themselves.
5. **Clock.** `?freeze=<ms>` pauses the animation at `-<ms>`, the same as the ticker's freeze.

| Quality | Grain |
|---|---|
| `full` | four tiles, cycled at 8 fps |
| `lite` | one still tile. A full-screen layer redrawn 8×/s is the extra a slow device drops. |
| `static` | one still tile |

## Numbers

**Contrast.** Measured at `?freeze=0`, against the 1st-percentile background pixel behind the text, with glyphs and marks hidden. Values are without grain → with grain. The spec guards every row.

| Colorway | Poster small print (date, class, color-bar legend), 390 and 1440 | Info text |
|---|---|---|
| teal-coral | 5.17 → 4.80:1 | 5.96 → 5.50:1 |
| mauve-periwinkle | 5.13 → **4.76:1** (lowest) | 5.91 → 5.45:1 |
| black-red | 10.31 → 9.57:1 | 11.88 → 10.96:1 |

The small print sits on bare paper, so its margin is the thinnest. A darker `GRAIN_MAX` would eat it first.

**Cost.** Chromium at 390×844, DPR 2, 4× CPU throttle. The VM uses software GL, so compositor numbers are pessimistic.
- **Per step:** main thread 0.9 ms/s in total, the same as the page with every effect off (1.0 ms/s). No step frames run on the main thread.
- **Compositor:** 15 ms/s, worst task 2.9 ms.
- **One-time:** the tiles are ready 0.7 s after load, with long tasks of 55–72 ms and 36 ms of TBT (lite: 51 ms). Built in a single task, the four tiles were 252 ms.
- **Memory:** one field the size of the viewport plus 192 px each way, at device pixels, DPR capped at 2. It's one layer instead of four stacked tile layers.

| Viewport | DPR | Field | Decoded |
|---|---|---|---|
| 390×844 phone | 2 | 1164×2072 | ≈ 9.6 MB (four layers: ≈ 21 MB) |
| 1440×900 | 2 | 3264×2184 | ≈ 28.5 MB |
| 2560×1440 | 2 | 5504×3264 | ≈ 72 MB |

Desktop GPUs absorb this. If it matters, the field could render at DPR 1 on wide screens, since grain this faint doesn't need retina detail.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--fps-grain` | `src/styles/tokens.css` | 8 | Steps per second |
| `GRAIN_MAX` | `index.ts` | 0.04 | Darkness of a speck (PLAN's cap behind text is 4 %) |
| `COVERAGE` | `index.ts` | 0.32 | Share of grain cells that print |
| `GRAIN_PX` | `index.ts` | 1.5 | Grain size in CSS px |
| `RAGGED` | `index.ts` | 0.2 | Share of a grain's pixels knocked out (edge roughness) |
| `TILE` | `index.ts` | 192 | Tile edge in CSS px. Smaller repeats visibly. |
| `SEEDS` | `index.ts` | 7, 23, 59, 101 | The four tiles |
