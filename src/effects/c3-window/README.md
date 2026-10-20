# c3-window

SPEC §3 row 4 (tier B), built in PLAN step 5. Status: **done**.

On arrival, a giant cropped "C3" in her lettering, with the poster showing only through the letters. Scrolling opens the window onto the full poster.

- **Owns:** this folder.
- **Mount:** `[data-fx="c3-window"]` inside `.poster-stage`. It carries:
  - `data-state`: `closed`, `opening` or `open`
  - `data-progress`: 0–1
  - `data-ready`: set once the pin exists
- **Writes outside its mount:**
  - `.poster-stage`: inline `mask`, `clip-path` and `transform` only (writer table: mask or clip, scale).
  - Inside its mount: `svg.c3-window__ink`, her letters' inked edge.
  - `<html data-fx-c3-window>`: `window` or `open`. `style.css` keys off `window` to give the stage `will-change: transform`.
  - The pin, on `#poster` (see "Pin target" below).
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/art` statically. `core/scroll` (GSAP and ScrollTrigger) is a dynamic import that loads after the closed window is on screen.
- **Screenshots:** `npm run shots -- c3-window` writes:
  - `.shots/c3-window-{p0,p50,p100}@{390,1440}.png` (progress 0, 50 and 100 %)
  - `c3-window-p0-all@390.png` (every effect on)
  - `c3-window-reduced@390.png`
- **Tests:** `c3-window.spec.ts` covers:
  - arrival: the mask is her title's own C3 paths, and date and location are in the first viewport
  - at every progress, nothing of the stage sits over the date or location (hit-tested), and the color bar takes taps while the window is closed
  - phone: a cropped wordmark (letters wider than the poster); wide screens: whole letters; the stage's box stays on screen
  - pinned scroll of at most one screen; open at the end, closed again after scrolling back
  - progress only ever grows as the page scrolls down
  - line-boil keeps playing during the pin
  - `?c3=` scrolls to a given progress
  - reduced motion: no mask, no pin
  - no layout shift on arrival

## How it works

1. **Her letters.** The inline title SVG's paths whose boxes sit inside the manifest's `title.regions.c3`, found with `getBBox()`, so her final title needs no code change. They're copied into an SVG data URL. The mask is an alpha mask, so only the paths' coverage counts, not their color.
2. **The deepest point.** The letters are rasterized small (192 px wide), and a two-pass chamfer distance transform finds the centre and radius of the largest circle that fits inside them. Zooming into that point opens the window soonest, because the stroke there is thickest. With the placeholder title, that point is the stem of the 3.
3. **Arrival (p = 0).**
   - Where the poster reaches the screen's edges (a phone, within `EDGE_GUTTER`), the letters are `LETTER_W` (110 %) of its width, so its edges crop them: a cropped wordmark. Where the poster's edges sit mid-page (wide screens), a crop would read as a clipping bug, so the letters stay whole at `LETTER_W_WHOLE` (94 %). Either way they're centred at `LETTER_Y`.
   - The stage may scale up slightly (`transform: scale`, at most `STAGE_MAX`), bringing the crop toward the viewport's edges. It never scales so far that its box leaves the viewport, or reaches the small print beside it (wide screens' margins) or below it (a phone's date and location), keeping `CLEAR` px away. On a 390 px phone that leaves about 1.02.
   - **Inked edge.** Where a letter crosses bare poster paper (`--paper-2`), it would vanish into the page's `--paper`. So her letters' own outline, stroked in `--ink`, sits in the effect's mount, inside the stage and under the same mask. Only its inner half shows: an inked edge, like her lettering. It moves with the mask on its own compositor layer (a transform, no poster repaint), boils like her line (three positions stepped at 10 fps with a CSS `step-end` animation; `?freeze` holds one), and fades out over the first `OUTLINE_FADE` (30 %) of the opening.
   - **Clip.** A mask hides but still takes taps, so the stage is also clipped with `clip-path: inset()` to the letters' box. Clip-path cuts hit testing too.
4. **Opening.** `core/scroll.progress` pins `#poster` for `PIN` (85 %) of the viewport height. Over that distance:
   - the mask zooms about the deepest point, in log space, so each step of scroll zooms by the same factor, until that stroke's circle covers every corner of the stage;
   - the stage's scale eases back to 1.

   At p = 1 the mask, clip and transform are removed: the full poster. Scrolling back reverses it.
5. **Arrival speed.** `main.ts` reveals the prehidden stage once `init` settles. The mask is applied synchronously from the DOM, and GSAP loads afterwards, so the poster never waits on it.
6. **Clock.** Nothing pauses the ticker during the pin, so line-boil, sketch-in and xray keep playing inside the letters.

| Quality | What runs |
|---|---|
| `full`, `lite` | as above (no extras to drop) |
| `static` | nothing: the window starts open, no pin |

### Why not overflow the viewport

PLAN step 5 asks for letters that overflow the viewport. The first build scaled the stage about 1.8× on a phone to do that, and it broke three things:
- the shared smoke test "tall screens keep the poster inside the page" (it measures the stage's transformed box);
- taps on the color bar, which the invisible part of the scaled stage covered;
- legibility, because the letters had to shrink onto the poster's middle.

The crop now happens at the poster's own edges. On a phone those are 16 px from the screen's edges.

## Pin target: `#poster`, not `.poster-stage`

PLAN's writer table gives c3-window the pin on `.poster-stage`. Pinning the stage alone fails either way:
- **With pin spacing**, the spacer pushes the small print down by the pin distance, out of the first screen. That breaks SPEC §9.1 (date and location in the first 390×844 viewport).
- **Without pin spacing**, the small print and the next sections scroll up under the pinned poster.

The section holds the stage and its small print, and fits one screen. So the effect pins the section, from this folder, through `core/scroll`. **Proposed writer-table change:** "`#poster` (section) | c3-window | pin".

## Numbers

Chromium at 390×844, DPR 2, 4× CPU throttle, scrolling through the pin and back. Times are for the main thread per frame, with `?only=c3-window`:

| | mean | p95 |
|---|---|---|
| Paint (the mask and clip repaint; the stage is its own layer) | 2.41 ms | 4.37 ms |
| Style recalc (the mask image is written once; updates move and size it) | 0.60 ms | 1.66 ms |
| Scroll event (ScrollTrigger and `apply`) | 0.65 ms | 2.41 ms |
| rAF (GSAP ticker) | 0.32 ms | 1.21 ms |

That's about 4 ms a frame on average. With every effect off, the same scroll costs about 0.6 ms. If the mask repaint ever matters on a real phone, pre-rasterize the letters to a bitmap once.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `PIN` | `index.ts` | 0.85 | Pinned scroll, share of the viewport height (≤ 1) |
| `LETTER_W` | `index.ts` | 1.1 | Letter width at arrival where the poster reaches the screen's edges, share of its width (above 1 crops) |
| `LETTER_W_WHOLE` | `index.ts` | 0.94 | Letter width where the poster's edges sit mid-page (whole letters) |
| `EDGE_GUTTER` | `index.ts` | 40 | Poster edges this close to the screen's count as its edges, px |
| `LETTER_Y` | `index.ts` | 0.5 | Letters' centre at arrival, share of the poster's height |
| `STAGE_MAX` | `index.ts` | 1.12 | Most the stage scales at arrival, within the viewport and the small print's room |
| `CLEAR` | `index.ts` | 8 | Gap kept between the scaled stage and the small print, px |
| `OUTLINE_FADE` | `index.ts` | 0.3 | Share of the opening over which the inked letter edge fades |
| `--line-frame` × 1.2 | `style.css` | | Inked edge stroke (half of it shows) |
| `c3-window-boil` | `style.css` | 300 ms, 3 steps | The inked edge's boil (10 fps) |
| `FIELD` | `index.ts` | 192 | Resolution of the distance field that finds the zoom point |
| `?c3=<0–1>` | URL | | Scrolls to that progress once the pin exists, for screenshots |
