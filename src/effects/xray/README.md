# xray

SPEC §3 row 3 (tier B), built in PLAN step 4. Status: **done**.

Through a hole in her drawing: her ribcage panel in halftone ink, like an X-ray film over her solid panel. A lens on desktop, scribble-to-reveal on touch, and a toggle for keyboards. At rest the poster is exactly her drawing.

- **Owns:** this folder, plus `src/content/xray.json` (the toggle label and the hint for each device).
- **Mounts:**
  - `.layer--xray [data-fx="xray"]`: the canvas, between her ribcage slot and the eye screen. The eye screen, cables, halo and title stay on top.
  - `[data-fx="xray"][data-part="toggle"]` in the poster's small print: the X-ray toggle and its hint. Built from JS; without JS the mount is empty and hidden (`.print--xray:empty`).
- **Writes outside its mounts:** only `<html data-fx-xray>`, written only when its tokens change. Its own CSS keys off it. It never hides her `ribcage` slot (the writer table would allow it): the film is an opaque sheet the size of the rect, so wherever it shows it covers her panel.

  | Token | Set when | CSS |
  |---|---|---|
  | `live` | full or lite | `.poster` gets `touch-action: pan-y pinch-zoom` |
  | `static` | reduced motion | nothing |
  | `revealed` | the toggle is pressed | nothing (state for tests and styling) |
  | `lens` | the lens shows | crosshair cursor over the poster |

  The mount carries `data-state="ready"` or `"revealed"` for tests.
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/art`, `core/ticker`, `core/pointer`, `core/palette`, `core/bus`, `core/clock` and `core/raster`.
- **Screenshots:** `npm run shots -- xray` writes `.shots/xray-{revealed,painted,revealed-black-red,revealed-reduced}@390.png` and `.shots/xray-lens@1440.png`.
- **Tests:** `xray.spec.ts` covers:
  - at rest her panel shows; the toggle reveals and hides, is 44 px, works with Enter and Space, and is described by the hint for this device
  - phone: real touch strokes across the chest paint pixels inside the rect, never scroll, and heal within 4 s
  - phone: a vertical swipe on the poster scrolls the page and paints nothing
  - desktop: the mouse draws the lens over the chest; leaving removes it
  - the film recolors with the colorway
  - reduced motion: the toggle reveals at once, nothing moves
  - `?off=xray`: her panel, no toggle

## How it works

1. **Film.** Once, at init: the `ribcage` slot is cropped to its `rect` and redrawn with `raster.halftone` in `--ink`, over an opaque sheet of `--paper-2` the size of the rect. Her solid panel is drawn at 60 % ink first, so the darkest dots just touch instead of merging into a block. It re-renders on the `colorway` bus event and when the poster resizes.
2. **Mask, then film.** Each frame clears the canvas and draws the mask: the healing strokes (alpha = 1 − age / 4 s), the lens, and the toggle's scan. Then it draws the film with `source-in`, so the film shows only inside the mask.
3. **Lens (fine pointer).** A disc of 12 % of the poster width on the smoothed pointer (`core/pointer`). It fades in and out over about 120 ms on wall-clock time. It's ringed with her registration mark (a circle with a cross through it, `raster.roughStroke`) in `--accent`, like the circle she drew round her chosen colorway; ink would vanish on her ink panel, which re-seeds at 10 fps so it boils like her line. The film exists only inside the rect, so over the rest of the poster the lens is just the ring.
4. **Strokes (touch).** A touch that starts anywhere on the poster becomes a stroke. It paints nothing until it has moved 10 px sideways, and more sideways than vertically, so a swipe that turns into a scroll never flashes the film. Its segments within a brush's reach of the rect paint with a 9 %-wide round brush. Each segment keeps its own time and fades over 4 s. Strokes are stored in poster-relative coordinates, so a resize keeps them in place. When the browser cancels the pointer because the gesture became a vertical scroll, that stroke's segments are dropped.
5. **Toggle.** `aria-pressed` button. Pressing it scans the film in top to bottom in 6 steps at 12 fps; releasing it scans it out. Under reduced motion or `?freeze`, the reveal is instant.
6. **Ticking.** One ticker subscription (with `el: .poster`, so it skips offscreen) runs only while the lens shows, a stroke heals, or a scan plays. Then it draws its last frame and unsubscribes.

| Quality | What runs |
|---|---|
| `full` | lens with a boiling ring, strokes, stepped scan |
| `lite` | the same, with a still ring |
| `static` | toggle only, instant. No lens, no strokes |

## Numbers

Chromium at 390×844, DPR 2, 4× CPU throttle, four sideways scribbles across the chest and the heal after them (`FireAnimationFrame`, which includes the shared GSAP tick):

| | mean | p95 |
|---|---|---|
| per frame while painting and healing | 1.35 ms | 2.43 ms |

At rest nothing ticks. The canvas is the poster's layout size at DPR ≤ 2 (716×912 on a 390 px phone).

## Decisions

- **Her panel stays at rest.** The first build hid it while the effect was live (the writer table allows it), but that left a flat coral block where her draft has the panel, and would hide her final ribcage art too. Now the poster at rest is her drawing in every mode, and the X-ray turns her solid panel into the halftone film wherever you look or scribble.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `LENS` | `index.ts` | 0.12 | Lens diameter, share of the poster width |
| `BRUSH` | `index.ts` | 0.09 | Touch brush diameter, share of the poster width |
| `SIDEWAYS_PX` | `index.ts` | 10 | Sideways travel before a touch stroke paints |
| `HEAL_MS` | `index.ts` | 4000 | How long a stroke takes to heal |
| `CELL` | `index.ts` | 0.0085 | Halftone cell, share of the poster width (minimum 3 px) |
| `DOT_INK` | `index.ts` | 0.6 | Ink of her solid panel in the halftone; 1 merges the dots |
| `SCAN_STEPS`, `SCAN_FPS` | `index.ts` | 6, 12 | The toggle's stepped scan |
| `BOIL_FPS` | `index.ts` | 10 | Lens ring boil rate |
| `LENS_FADE_MS` | `index.ts` | 120 | Lens fade in and out |
| `RING_LINE` | `index.ts` | 0.009 | Lens ring line width, share of the poster width |
| copy | `src/content/xray.json` | | Toggle label, and the hint for touch, pointer and static |
