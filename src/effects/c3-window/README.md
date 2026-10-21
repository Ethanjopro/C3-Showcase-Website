# c3-window

SPEC §3 row 4 (tier B), built in PLAN step 5. Status: **done**.

On arrival, a giant cropped "C3" in her lettering, solid in ink as she drew it. Scrolling drains the ink out of the letters, top to bottom, to show the poster through them, then opens the window onto the full poster.

- **Owns:** this folder.
- **Mount:** `[data-fx="c3-window"]` inside `.poster-stage`. It carries:
  - `data-state`: `closed`, `opening` or `open`
  - `data-progress`: 0–1
  - `data-ready`: set once the pin exists
- **Writes outside its mount:**
  - `.poster-stage`: inline `mask`, `clip-path` and `transform` only (writer table: mask or clip, scale).
  - Inside its mount: `svg.c3-window__ink`, her letters' inked edge.
  - `<html data-fx-c3-window>`: `window ink` while the solid ink covers the letters (xray holds back its toggle then), `window` while the window opens, `open` after, plus `edge` while her inked edge shows (until it has faded, 30 % into the zoom). `style.css` keys off `window` to give the stage `will-change: transform`, and pauses the edge's boil without `edge`. line-boil holds while `edge` is there, and xray keeps its lens off while `window` is, so her line boils in one place at a time and the scroll is the only gesture during the pin (SPEC §6, §3).
  - The pin, on `#poster` (see "Pin target" below).
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/art` statically. `core/scroll` (GSAP and ScrollTrigger) is a dynamic import that loads after the closed window is on screen.
- **Screenshots:** `npm run shots -- c3-window` writes:
  - `.shots/c3-window-{p0,p50,p100}@{390,1440}.png` (progress 0, 50 and 100 %), and `c3-window-p15@390.png` (mid-drain)
  - `c3-window-p0-all@390.png` (every effect on)
  - `c3-window-reduced@390.png`
- **Tests:** `c3-window.spec.ts` covers:
  - arrival: the mask is her title's own C3 paths, and date and location are in the first viewport
  - arrival in solid ink, draining in the first part of the scroll
  - at every progress, nothing of the stage sits over the date or location (hit-tested), and the color bar takes taps while the window is closed
  - her letters arrive whole and nearly as wide as the poster; the stage's box stays on screen
  - the X-ray toggle waits while the ink covers the chest
  - a link straight to `#info` lands on it after the pin moves the page
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
   - The letters arrive whole and nearly as wide as the poster (`LETTER_W`: the box is the poster's width, the letters about 96 % of it), centred at `LETTER_Y`. Earlier builds cropped them at the poster's edges, but with paper beyond the cut, a crop read as a clipping bug.
   - The stage may scale up slightly (`transform: scale`, at most `STAGE_MAX`), bringing the crop toward the viewport's edges. It never scales so far that its box leaves the viewport, or reaches the small print beside it (wide screens' margins) or below it (a phone's date and location), keeping `CLEAR` px away. On a 390 px phone that leaves about 1.02.
   - **Solid ink.** A copy of her letters filled with `--ink` (`.c3-window__fill`) sits in the mount under the same mask, so the letters arrive solid, as she drew them. Over the first `DRAIN` (30 %) of the pinned scroll, a `clip-path: inset()` drains it top to bottom, like one of her flat blocks sliding off, and the poster shows through. It boils with the edge.
   - **Inked edge.** Where a letter crosses bare poster paper (`--paper-2`), it would vanish into the page's `--paper`. So her letters' own outline, stroked in `--ink`, sits in the effect's mount, inside the stage and under the same mask. Only its inner half shows: an inked edge, like her lettering. It moves with the mask on its own compositor layer (a transform, no poster repaint), boils like her line (three positions stepped at 10 fps with a CSS `step-end` animation; `?freeze` holds one), and fades out over the first `OUTLINE_FADE` (30 %) of the zoom.
   - **Clip.** A mask hides but still takes taps, so the stage is also clipped with `clip-path: inset()` to the letters' box. Clip-path cuts hit testing too.
4. **Opening.** `core/scroll.progress` pins `#poster` for `PIN` (85 %) of the viewport height. After the drain, from `ZOOM_FROM` (20 %, a little before the drain ends so the scroll never stalls) to the end:
   - the mask zooms about the deepest point, in log space, so each step of scroll zooms by the same factor, until that stroke's circle covers every corner of the stage;
   - the stage's scale eases back to 1.

   At p = 1 the mask, clip and transform are removed: the full poster. Scrolling back reverses it.
5. **Links to a section.** On a visit to `/#info`, ScrollTrigger measuring the page cuts the browser's smooth scroll to the section short, and the pin spacer moves the section down anyway. Once the pin exists, the effect scrolls to the URL's section, unless the visitor is already past it.
6. **Re-measuring.** The geometry is measured again on resize and once the web fonts are ready, because the small print it keeps clear of can reflow when they swap in.
7. **Arrival speed.** `main.ts` reveals the prehidden stage once `init` settles. The mask is applied synchronously from the DOM, and GSAP loads afterwards, so the poster never waits on it.
8. **Clock.** Nothing pauses the ticker during the pin, so line-boil, sketch-in and xray keep playing inside the letters. sketch-in reads this mount's `data-state`: it waits under the ink while it's `closed`, and starts drawing when it leaves it (OWNER #7). While it draws (`<html data-fx-sketch-in~='drawing'>`), `style.css` pauses the inked edge's boil, as line-boil holds, so the drawing is the only line moving.

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

The section holds the stage and its small print, and fits one screen. So the effect pins the section, from this folder, through `core/scroll`. The writer table now says so: "`#poster` (section) | c3-window | pin".

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
| `LETTER_W` | `index.ts` | 1.0 | Letter box width at arrival, share of the poster's width (above 1 crops at its edges) |
| `LETTER_Y` | `index.ts` | 0.5 | Letters' centre at arrival, share of the poster's height |
| `STAGE_MAX` | `index.ts` | 1.12 | Most the stage scales at arrival, within the viewport and the small print's room |
| `CLEAR` | `index.ts` | 8 | Gap kept between the scaled stage and the small print, px |
| `DRAIN` | `index.ts` | 0.3 | Share of the pinned scroll over which the solid ink drains out of the letters |
| `ZOOM_FROM` | `index.ts` | 0.2 | Where the zoom into the letters starts |
| `OUTLINE_FADE` | `index.ts` | 0.3 | Share of the zoom over which the inked letter edge fades |
| `--line-frame` × 1.2 | `style.css` | | Inked edge stroke (half of it shows) |
| `c3-window-boil` | `style.css` | 300 ms, 3 steps | The inked edge's boil (10 fps) |
| `FIELD` | `index.ts` | 192 | Resolution of the distance field that finds the zoom point |
| `?c3=<0–1>` | URL | | Scrolls to that progress once the pin exists, for screenshots |
