# sketch-in

SPEC §3 row 5 (tier A), built in PLAN step 6. Status: **done**.

On the first visit of a session, her line art draws itself in at 12 fps, the fill floods in, then the title is drawn. At most 2.4 s (it takes 2.33 s); any tap, scroll or key finishes it at once.

With c3-window on (the default), the poster arrives behind her solid-ink C3, so the intro waits there, hidden, and starts when the scroll begins to drain the ink: it draws inside the letters (OWNER #7, option c). Scrolling the pin is how the window opens, so it doesn't skip the intro; a tap or a key that doesn't scroll does, and once the window is open, scrolling on does too.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the hidden mount at the top of `<body>`. It carries `data-state`: `waiting` (under c3-window's ink), `drawing`, `done` or `skipped` (not played: reduced motion, a second visit, or the art was already showing).
- **Writes outside the mount** (writer table: `.layer__art` and the SVG paths inside it, stroke dash, clip, opacity):
  - `<html data-fx-sketch-in>`: `drawing` while it waits or plays, `done` after. line-boil holds on her live drawing while the token `drawing` is there (PLAN step 6 handshake). `style.css` keys off it to hide the eye screen's CRT glass until the end, so scanlines never float over an undrawn screen.
  - Inside the lineart and title SVGs, while drawing: a wrapper `<g>` with the reveal stroke and the clip, a `<defs>` with one `<clipPath>` of `<use>`s, `pathLength="1"` and an id on each path (ids only where the path had none), and a Web Animation per path (dash offset and fill opacity).
  - `clip-path` animations on the `.layer__art` of the fill, ribcage, eye screen, cables and halo (one flood, the same frames for all), and in lite on the lineart and title `.layer__art` (wipes).
  - At the end state all of it is removed and her file's markup is back as it was (the tests check this).
- **Reads:**
  - `html.fx-pending-sketch-in`, the boot script's prehide (`src/styles/base.css`). It plays only while that class is set, so it never hides art that is already on screen.
  - c3-window's mount `data-state` (`closed`, `opening`, `open`) and `html.fx-pending-c3-window`, through a `MutationObserver`; never its code (PLAN writer table). If c3-window settles without writing a state (no letters, or it failed), the intro plays at once, so her art never stays hidden.
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/clock` (`frozenAt`), `core/flags` (`enabled`), `core/palette` (`number`, for `--fps-sketch`) and `core/raster` (`rng`). No GSAP and no ticker: it runs at load, and the Web Animations clock does the stepping.
- **Screenshots:** `npm run shots -- sketch-in` writes `.shots/sketch-in-{t0,t600,t1200,t1800,t2400}@…png`, `sketch-in-lite-t900@390.png`, `sketch-in-all-t600@390.png` (every effect on except c3-window) and `sketch-in-in-letters-t1200@{390,1440}.png` (drawing inside the letters, the ink a little drained).
- **Tests:** `sketch-in.spec.ts`: progressive drawing at 0/600/1200/2400 ms; two times in one 83 ms step match; the handshake and her restored markup; plays to the end by itself; a scroll, a tap or a key finishes it; a second visit skips it; reduced motion and no JS show the finished poster at time 0; lite uses wipes. With c3-window on: it waits under the ink and ignores taps and keys there, starts when the ink drains, isn't skipped by scrolling the pin, plays to the end inside it, and a tap, a key, or scrolling on past the open window finishes it.

## How it works

1. **Hidden start.** The boot script adds `fx-pending-sketch-in` before first paint (only with JS, full motion, and no `c3:fx-done:sketch-in` in `sessionStorage`). It hides the line art, fill and title, and the ribcage panel, eye screen (and its CRT glass), cables and halo, so the figure isn't drawn in among finished art. `init()` builds every animation with `fill: 'both'`, so the start state (nothing drawn) applies at once, before `main.ts` lifts the class. LCP lands on a layer that is never hidden: a buffered LCP observer reports the `wings` mask at about 370 ms (390 px) and 450 ms (1440 px). The wings stay out of the prehide for that reason.
   - **Under c3-window's ink.** With c3-window on, the animations are built and held at 0 (`waiting`) until c3-window's mount leaves `closed`, i.e. the first scroll starts draining the ink, top down; then they start, so the drawing (also top down) happens inside the letters.
2. **Lines.** Her art is potrace output: filled contours, not strokes, and connected strokes merge into a few large contours. So each path is drawn by a thick dashed stroke (`REVEAL` units wide) running along its own contour, and the whole drawing is clipped to her ink (`clip-rule: evenodd`, like the file). The stroke uncovers exactly her line, as if the pen were following it. When a path's stroke finishes, its solid fill switches on, which fills any part thicker than the reveal (the frame).
   - Paths start top to bottom over the first `SPREAD` of the window.
   - Each takes `sqrt(length / longest)` of the time left. The square root matters: a contour runs out and back along each stroke, so half its dash already uncovers most of the line, and the long ones need the whole window. Path-data length stands in for contour length, so there's no `getTotalLength()` pass at load.
3. **Fill.** The fill floods up from the bottom in `FILL_STEPS` (7) stepped frames: a flat block (SPEC §4: the accent is flat blocks) with a softly uneven edge. The ribcage panel, eye screen, cables and halo arrive in the same flood (every layer shares the poster's frame, so one edge crosses them all).
4. **Title.** Drawn the same way as the lines, in the last `TITLE_STEPS`.
5. **Clock.** Web Animations with `steps(n)` easing, every one starting on the same 12 fps grid (one shared `startTime`). No JavaScript runs per step. `?freeze=<ms>` pauses every animation at that time; at or past the end, it shows the finished poster.
6. **End.** When every animation finishes, or on a tap, key, wheel or scroll of more than 2 px, the animations are cancelled, her markup is restored, the attribute becomes `done`, and `sessionStorage` remembers it for the session. A hidden tab pauses the drawing.
   - While c3-window is pinned (`closed` or `opening`), scrolling drives the window: scroll, wheel, a finger going down and the scrolling keys (arrows, Page Up/Down, Home, End, Space) don't skip. A tap (`click`, which a swipe never fires) or any other key does. Once the window is `open`, scrolling more than 2 px past where the pin let go skips it again. While it waits, nothing skips: there is nothing on screen to skip.

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

No long animation frame (over 50 ms) happens during the steps. Most of a step is repainting her 250 KB line-art SVG (paint, layerize, commit), which lite pays too. That's above SPEC §6's 2 ms per step. That budget is about scrolling at 60 fps, and since OWNER #7 the intro does overlap scrolling: it draws while the visitor scrolls the C3 window's pin (about 4 ms per frame on its own, c3-window README). It runs only once per session, for 2.3 s, and these are software-raster numbers, which inflate SVG paint. Take one local 4×-throttled trace on a GPU machine, scrolling through the pin while it draws, before launch (PLAN step 13). If it drops frames on a real phone, rasterize the line art once and draw the reveal on a canvas.

## Known trade-offs

- **The wings are already there.** They are the LCP element, so they aren't prehidden; the figure draws in over them.
- **Frozen shots of other effects.** A `?freeze=0` shot with every effect on (for example `c3-window-p0-all`) now shows the moment of arrival: no line art yet. A frozen clock plays from load, without waiting for the ink, so `?c3=…&freeze=…` shots are deterministic.
- **The reveal uncovers a little ahead.** Where two of her lines lie within half a `REVEAL` of each other, the second appears a step early.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--fps-sketch` | `src/styles/tokens.css` | 12 | Steps per second. Below 11.7 the step is capped so the intro still ends by 2.4 s |
| `LINE_STEPS` | `index.ts` | 16 | Steps for the line art |
| `SPREAD` | `index.ts` | 0.55 | Share of the line window over which paths start, top first |
| `FILL_AT`, `FILL_STEPS` | `index.ts` | 14, 7 | When the flood starts, and its frames |
| `TITLE_AT`, `TITLE_STEPS` | `index.ts` | 21, 7 | When the title draws, and for how long |
| `REVEAL` | `index.ts` | lineart 16, title 40 | Reveal stroke width in SVG units. It must cover her thickest line from both edges; re-check it on her final art |
| `FLOOD_WAVER`, `FLOOD_POINTS` | `index.ts` | 0.012, 9 | How uneven the flood's edge is |
