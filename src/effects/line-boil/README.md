# line-boil

SPEC §3 row 1 (tier A), built in PLAN step 2. Status: **done**.

Every hand-drawn layer jitters like pencil animation, stepping at 10 fps.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the hidden defs mount at the top of `<body>`. It holds one generated `<style>` with the per-layer rules.
- **Writes outside the mount:** `<html data-fx-line-boil>` only (`on`, or `on paused` while the poster is offscreen). The CSS keyed off it animates `filter` on `.layer__boil` (the property this effect owns) and draws `.layer--<slot>::before` / `::after`.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Imports `core/art` and `core/ticker` (for `?freeze`) only.
- **Screenshots:** `npm run shots -- line-boil` writes `.shots/line-boil-{t0,t50,t100,t200}@{390,1440}.png` and `line-boil-lite-t100@390.png`.
- **Tests:** `line-boil.spec.ts`. It covers: stepping (t0 = t50 = t300, t0 ≠ t100 ≠ t200); which layers boil at full and lite quality; reduced motion; colorway tint; pausing offscreen.

## How it works

The PLAN's first design, three `feTurbulence` + `feDisplacementMap` filters swapped on `.layer__boil` by `ticker.add(…, { fps: 10 })`, failed the PLAN's 2 ms gate. So this is PLAN's fallback, "pre-rendered frames":

1. **Render once, at idle.** Each boiling slot's art is redrawn twice through a smooth two-octave value-noise displacement (`displace.ts`) into alpha masks, in ~8 ms slices. Sources come from `core/art`. Inline vector slots (lineart, title) are serialized from the page instead of being fetched a second time.
2. **Show.** The masks become `.layer--<slot>::before` and `::after`, filled with the slot's tint token from the manifest. A colorway swap recolors them with no re-render.
3. **Cycle.** Drawing 0 is her live art. A `step-end` CSS animation, 300 ms per cycle, shows drawing 0, 1, 2 on the compositor. It uses `filter: opacity()` on `.layer__boil` and `opacity` on the pseudo-elements. No JavaScript runs per step.
4. **Clock.** `?freeze=<ms>` sets the animation to paused with `animation-delay: -<ms>`, so screenshots are deterministic, the same as the ticker's freeze. Hidden tabs stop CSS animations by themselves. An IntersectionObserver pauses the cycle offscreen.
5. **Resize.** If the poster grows past 1.25× the rendered width (rotation, a wider window), it redraws.

| Quality | What boils |
|---|---|
| `full` | lineart, title, halo, wings at `--fps-boil` (10) |
| `lite` | lineart only, at 8 fps |
| `static` | nothing: her clean lines |

**Cross-effect contract, proposed for sketch-in (PLAN step 6).** Drawings 1 and 2 are finished art, so they can't show sketch-in's drawing progress. While `<html data-fx-sketch-in>` contains the token `drawing`, the cycle holds on her live art (drawing 0). Sketch-in should set that token while it animates.

## Trace numbers (PLAN step 2)

These come from a Chromium trace at 390×844, DPR 2, with 4× CPU throttle. The poster alone is shown (`?only=line-boil`), traced over 4 s (≈40 steps). This is a cloud VM with software GL, so the compositor numbers are pessimistic.

| Design | Main thread per step frame | Main thread total | Compositor (viz) worst task |
|---|---|---|---|
| Filter swap (PLAN's first design), full | **4.8 ms** median, 6.3 ms p90 | 104 ms/s | 35 ms |
| Filter swap, lite | 3.9 ms median | 79 ms/s | 10 ms |
| Turbulence `seed` mutated in place | 5.3 ms (repaints) | 65 ms/s | 34 ms |
| **Pre-rendered frames (shipped), full** | **no step frames** (compositor only) | 1.4 ms/s | 7.9 ms |
| Pre-rendered frames, lite | none | 1.5 ms/s | 4.2 ms |

For comparison, any main-thread DOM change at 10 Hz on this page (an opacity flip) costs 1.9 ms per step, so a JavaScript-driven swap of pre-rendered frames would also have sat right at the gate.

**One-time render** (4× throttle, 390 px): frames are ready 3.7 s after load at full quality, 0.95 s at lite. Long tasks are 50–88 ms, about 51 ms of TBT. Until the frames are ready, her clean lines show.

**Memory.** Full quality holds 8 masks at poster size × DPR. On a phone that's ≈ 716×912, about 2.6 MB each once decoded.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--fps-boil` | `src/styles/tokens.css` | 10 | Steps per second (full quality) |
| `LITE_FPS` | `index.ts` | 8 | Steps per second under `lite` |
| `AMPLITUDE` | `displace.ts` | 0.0025 | Peak wobble, as a fraction of the poster width |
| `WAVELENGTH` | `displace.ts` | 0.022 | Length of one bend, as a fraction of the poster width |
| `DETAIL_SCALE`, `DETAIL_WEIGHT` | `displace.ts` | 0.4, 0.4 | The finer second octave: the tooth in the bends |
| `SEEDS` | `displace.ts` | 17, 41 | Which two redrawings |
| `FULL`, `LITE` | `index.ts` | — | Which slots boil |
| `SLICE_PIXELS` | `index.ts` | 120 000 | Work per idle slice while rendering |
