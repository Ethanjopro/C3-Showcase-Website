# sketch-in

SPEC §3 row 5 (tier A), built in PLAN step 6. Status: **done**.

On the first visit of a session, her line art draws itself in at 12 fps, the fill floods in, then the title is drawn. At most 2.4 s (it takes 2.33 s); any tap, scroll or key finishes it at once.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the hidden mount at the top of `<body>`. It carries `data-state`: `drawing`, `done` or `skipped` (not played: reduced motion, a second visit, or the art was already showing).
- **Writes outside the mount** (writer table: `.layer__art` and the SVG paths inside it, stroke dash, clip, opacity):
  - `<html data-fx-sketch-in>`: `drawing` while it plays, `done` after. line-boil holds on her live drawing while the token `drawing` is there (PLAN step 6 handshake).
  - Inside the lineart and title SVGs, while drawing: a wrapper `<g>` with the reveal stroke and the clip, a `<defs>` with one `<clipPath>` of `<use>`s, `pathLength="1"` and an id on each path (ids only where the path had none), and a Web Animation per path (dash offset and fill opacity).
  - `clip-path` animations on `.layer--fill .layer__art` (the flood), and in lite on the lineart and title `.layer__art` (wipes).
  - At the end state all of it is removed and her file's markup is back as it was (the tests check this).
- **Reads:** `html.fx-pending-sketch-in`, the boot script's prehide (`src/styles/base.css`). It plays only while that class is set, so it never hides art that is already on screen.
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/clock` (`frozenAt`), `core/palette` (`number`, for `--fps-sketch`) and `core/raster` (`rng`). No GSAP and no ticker: it runs at load, and the Web Animations clock does the stepping.
- **Screenshots:** `npm run shots -- sketch-in` writes `.shots/sketch-in-{t0,t600,t1200,t1800,t2400}@…png`, `sketch-in-lite-t900@390.png` and `sketch-in-all-t600@390.png` (every effect on except c3-window).
- **Tests:** `sketch-in.spec.ts`: progressive drawing at 0/600/1200/2400 ms; two times in one 83 ms step match; the handshake and her restored markup; plays to the end by itself; a scroll, a tap or a key finishes it; a second visit skips it; reduced motion and no JS show the finished poster at time 0; lite uses wipes.

## How it works

1. **Hidden start.** The boot script adds `fx-pending-sketch-in` before first paint (only with JS, full motion, and no `c3:fx-done:sketch-in` in `sessionStorage`). `init()` builds every animation with `fill: 'both'`, so the start state (nothing drawn) applies at once, before `main.ts` lifts the class. LCP goes to the small print, which is never hidden.
2. **Lines.** Her art is potrace output: filled contours, not strokes, and connected strokes merge into a few large contours. So each path is drawn by a thick dashed stroke (`REVEAL` units wide) running along its own contour, and the whole drawing is clipped to her ink (`clip-rule: evenodd`, like the file). The stroke uncovers exactly her line, as if the pen were following it. When a path's stroke finishes, its solid fill switches on, which fills any part thicker than the reveal (the frame).
   - Paths start top to bottom over the first `SPREAD` of the window.
   - Each takes `sqrt(length / longest)` of the time left. The square root matters: a contour runs out and back along each stroke, so half its dash already uncovers most of the line, and the long ones need the whole window. Path-data length stands in for contour length, so there's no `getTotalLength()` pass at load.
3. **Fill.** The fill floods up from the bottom in `FILL_STEPS` (7) stepped frames: a flat block (SPEC §4: the accent is flat blocks) with a softly uneven edge.
4. **Title.** Drawn the same way as the lines, in the last `TITLE_STEPS`.
5. **Clock.** Web Animations with `steps(n)` easing, every one starting on the same 12 fps grid (one shared `startTime`). No JavaScript runs per step. `?freeze=<ms>` pauses every animation at that time; at or past the end, it shows the finished poster.
6. **End.** When every animation finishes, or on a tap, key, wheel or scroll of more than 2 px, the animations are cancelled, her markup is restored, the attribute becomes `done`, and `sessionStorage` remembers it for the session. A hidden tab pauses the drawing.

| Quality | What runs |
|---|---|
| `full` | per-path drawing, flood, title |
| `lite` | stepped wipes for the line art (top down) and the title (left to right), plus the flood |
| `static` | nothing: the finished poster |

| Steps (at 12 fps) | |
|---|---|
| 0–15 | line art (0–1.33 s) |
| 14–20 | fill flood (1.17–1.75 s) |
| 21–27 | title (1.75–2.33 s) |

## Numbers

Chromium at 390×844, DPR 2, 4× CPU throttle, software GL (this cloud VM), `?only=sketch-in`, traced over the whole intro:

| | main thread over the intro | step frames | longest task |
|---|---|---|---|
| full | ≈ 270 ms | ≈ 28 frames of 4–6 ms (p95 5.8 ms) | 24 ms |
| lite | ≈ 240 ms | similar | 14 ms |

No long animation frame (over 50 ms) happens during the steps. Most of a step is repainting her 250 KB line-art SVG (paint, layerize, commit), which lite pays too. That's above SPEC §6's 2 ms per step, accepted here because it runs once per session, for 2.3 s, before anything else moves. If it shows on a real phone, rasterize the line art once and draw the reveal on a canvas.

## Known trade-offs

- **Other layers are already there.** The boot script hides only the line art, fill and title, so the halo, wings, cables, ribcage panel and eye screen show from the start, and the figure draws in among them.
- **Frozen shots of other effects.** A `?freeze=0` shot with every effect on (for example `c3-window-p0-all`) now shows the moment of arrival: no line art yet.
- **The reveal uncovers a little ahead.** Where two of her lines lie within half a `REVEAL` of each other, the second appears a step early.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--fps-sketch` | `src/styles/tokens.css` | 12 | Steps per second |
| `LINE_STEPS` | `index.ts` | 16 | Steps for the line art |
| `SPREAD` | `index.ts` | 0.55 | Share of the line window over which paths start, top first |
| `FILL_AT`, `FILL_STEPS` | `index.ts` | 14, 7 | When the flood starts, and its frames |
| `TITLE_AT`, `TITLE_STEPS` | `index.ts` | 21, 7 | When the title draws, and for how long |
| `REVEAL` | `index.ts` | lineart 16, title 40 | Reveal stroke width in SVG units. It must cover her thickest line from both edges; re-check it on her final art |
| `FLOOD_WAVER`, `FLOOD_POINTS` | `index.ts` | 0.012, 9 | How uneven the flood's edge is |
