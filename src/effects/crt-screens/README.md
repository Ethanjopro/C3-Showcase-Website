# crt-screens

SPEC §3 row 11 (tier C), built in PLAN step 12. Status: **done**.

Her screens get scanlines, a slight two-ink split and stepped static. The project screens also spell out the teaser line.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions"). Reads `projects.json` (`mode`, `teaser`, `screens`) through `core/content` and doesn't edit it.
- **Mount:** the hidden `[data-fx="crt-screens"]` mount at the top of `<body>` holds the keyframes `<style>` and `data-state` (`moving` or `still`), which tests read. The effect draws one `.crt` inside every `[data-crt]` element. The registry loads it when any of them first scrolls into view.
- **Contract:** `init(root, { quality })` and `destroy()`, from `src/core/effect.ts`. Imports `core/raster` (`noiseTile`, `rng`, `blobUrl`, `steppedKeyframes`), `core/onscreen`, `core/clock` (`frozenAt`), `core/palette` (`number`), `core/art` (`slot`, `slotNames`) and `core/content`. No GSAP, no ticker: the static steps on the compositor.
- **Screenshots:** `npm run shots -- crt-screens` writes `.shots/crt-screens-{projects-t0,projects-t100,projects-mauve,projects-reduced,eye}@….png`.
- **Tests:** `crt-screens.spec.ts` covers:
  - every target gets static, and the project screens spell `projects.teaser`
  - 10 fps stepping (t0 = t50, t0 ≠ t100)
  - flash safety over a full loop and its seam, in teal-coral and mauve
  - reduced motion: one still frame, identical 500 ms apart
  - offscreen screens pause
  - a poster screen is masked to its own slot's art and gets the split
  - a page without an eye screen still works
  - a mid-visit switch to reduced motion restarts cleanly
  - under `full` and `lite`, project screens step and poster screens hold one frame
  - the words never animate

## How it works

**Two kinds of target**, told apart by where they sit. Nothing names a slot, so if her final composition cuts the eye screen (OWNER #9) or adds another screen, no code changes.

| Target | Where | Gets |
|---|---|---|
| Poster screen | a `[data-crt]` inside a poster layer (`.layer[data-slot]`) whose slot has a `rect`: today, the eye screen | One still frame of static and scanlines, masked to that slot's own art (its manifest `src`, lined up with its `rect`), so they cover only her ink panel. Plus the two-ink split. |
| Glass | any other `[data-crt]`: the six portrait project screens | Static and a chunk of the teaser line, over the glass's own faint scanlines from `panels.css` |

1. **Static.** `static.ts` builds one 96 px tile of light specks from two `raster.noiseTile`s, the same way paper-grain builds its tooth: grains about 2.25 CSS px, so specks clump like riso tooth, ragged edges, 42 % coverage, at device resolution (DPR ≤ 2). The tile is a *mask* over a `--on-ink` fill, so the static is colored by a token.
2. **Steps.** Noise is uncorrelated with itself a few grains away, so one tile shifted to a new random offset reads as a new frame. A `step-end` keyframe walk of 12 offsets runs at `--fps-crt` (10). That's a compositor transform: no JS and no repaint per step. Each screen starts at a different step (`PHASE`). Every frame is at least 8 px (a few grains) from the frames one and two steps away, across the loop's seam too, so no two nearby frames share their snow.
3. **Scanlines.** The project glass already has faint paper lines from `panels.css`, and a second set over specks this small turned into generic hatching (design review), so it gets none. Poster screens get a 1 px ink line every 4 px. The split fringes sit above those lines, so her line's ghost stays whole and isn't dashed.
4. **Split.** On a poster screen, two 1 px fringes: her ink minus her ink shifted 1 px (`mask-composite: subtract`), in `--accent` on one side of every edge and `--on-ink` at 60 % on the other. It uses her two inks, not RGB, so it stays in the colorway. On the eye, the coral fill shows through her drawn eye, so the accent side widens the coral strokes and the light side ghosts them.
5. **Teaser line.** While `projects.mode` is `teaser`, `words.ts` splits `projects.teaser` over the glass screens in reading order. That's one word per screen when it fits ("Projects / are / revealed / at / the / show."), otherwise the most even runs.
   - It's set in the big-word face, in `--on-ink`, all at one size, fitted to the longest chunk with container units.
   - Once fonts load, `--fit` shrinks every word together if the longest still overflows. New copy with wide letters can't be clipped.
   - The words never move: the readable layer animates only its entry wipe (CLAUDE.md).
   - The screens are `aria-hidden`; the readable `.teaser` paragraph below them stays the source of truth.
6. **Two steppers per screen** (SPEC §6). The poster already steps line-boil and paper-grain, so poster screens hold one frame of static (`POSTER_STEPS`). The owner decided the eye stays still (OWNER.md #17, 2026-10-21); stepping it would be one constant.
7. **Clock.** `?freeze=<ms>` pauses every animation at the frame that time shows, like the ticker. Offscreen screens pause (`core/onscreen`). Hidden tabs stop CSS animations by themselves.
8. **Pixel ratio.** The tile is drawn at device resolution. If the window moves to a screen with a different pixel ratio, or the page is zoomed, the effect rebuilds it.
9. **Recolor.** Every color is a token (`--ink`, `--accent`, `--on-ink`), so a colorway swap needs no redraw and no bus listener.

| Quality | Project screens | Poster screens |
|---|---|---|
| `full` | 12 frames at 10 fps | one frame, plus the split |
| `lite` | the same. Nothing here costs JS per step, so there are no extras to drop. | one frame, plus the split |
| `static` | one still frame | one frame, plus the split |

## Numbers

**Flash safety** (SPEC §6, PLAN step 12). Measured on real frames: element screenshots of a project screen at `?freeze=0, 100 … 1200`, compared step to step, in teal-coral and mauve at 390 and 1440. WCAG 2.3.1 counts a change of 0.1 in relative luminance as a flash.
- Largest change in mean luminance, step to step: 0.51 %.
- Largest share of the screen changing by 0.1 or more: **0 %**. No pixel changes by more than 0.083.

The spec asserts both stay under 10 %, over a full loop, in teal-coral and mauve (the lightest inks, so the hardest case for light specks). As a check, raising `SPECK_MAX` to 0.9 makes it fail (about a third of the screen flashing).

**Cost.** 2.4 KB gzip JS + 0.6 KB CSS, loaded lazily. One-time: one 192 px tile and one `toBlob`. Per step: nothing on the main thread. Each screen's static field is one compositor layer, the screen plus one tile each way. On a 390 px phone at DPR 2, a project screen's glass is 74×146 CSS px, so its field is 340×484 device px, about 0.66 MB (4 MB for all six). The eye screen's is about a third of that.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `--fps-crt` | `src/styles/tokens.css` | 10 | Steps per second |
| `SPECK_MAX` | `static.ts` | 0.24 | Brightest speck. Above about 0.28, a speck on teal crosses the 0.1 flash threshold. |
| `COVERAGE` | `static.ts` | 0.42 | Share of grain cells that light up |
| `GRAIN_PX` | `static.ts` | 2.25 | Grain size in CSS px. Below about 2, scanlines turn the specks into generic hatching. |
| `RAGGED` | `static.ts` | 0.25 | Share of a grain's pixels knocked out (edge roughness) |
| `TILE`, `STEPS` | `static.ts` | 96, 12 | Tile edge, and frames in the loop |
| `PHASE` | `index.ts` | 5 | Steps between screens' starting frames (coprime with `STEPS`) |
| `POSTER_STEPS` | `index.ts` | `false` | Whether poster screens step too. Off, by the owner's call (OWNER.md #17). |
| `MIN_STEP` | `static.ts` | 8 | Least distance in px between nearby frames of the walk |
| Scanline weight | `style.css` `.crt--poster::after` | ink at 70 %, 1 px in 4 | Poster screens only |
| Split strength | `style.css` `.crt__split--b` | 60 % | The light fringe |
