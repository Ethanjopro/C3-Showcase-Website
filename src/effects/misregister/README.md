# misregister

SPEC §3 row 8 (tier A), built in PLAN step 9. Status: **done**.

On a fast scroll or flick, the ink and the accent slip apart, like a two-color print off register, then a quick spring snaps them back.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the hidden mount at the top of `<body>` (unused: everything it writes is on the layers).
- **Writes outside the mount:** inline `transform` on each poster `.layer` (writer table), only while slipping. At rest the property is removed.
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/art` (`slot`, for each layer's tint), `core/scroll` (`onVelocity`, `scroll.velocity`), `core/pointer`, `core/ticker` and `core/onscreen`. It loads at `idle`, so pulling in `core/scroll` (GSAP ScrollTrigger) costs nothing at first paint, and c3-window loads it anyway.
- **Screenshots:** `npm run shots -- misregister` writes `.shots/misregister-mid-scroll@{390,1440}.png`, held 2 px apart with `?misregister=2` (the offset a scroll up gives). Zoom in on the poster frame and the fill's edges next to `poster-reduced`: the ink sits 1 px down, the accent 1 px up.
- **Tests:** `misregister.spec.ts`: a scripted fast scroll slips the fill and the line art in opposite directions, never more than 2 px apart, and both are back in register within 500 ms of stopping; a slow scroll does nothing; a fast pointer flick slips them on desktop; offscreen (well past the onscreen margin) a flick writes nothing; with 45 ms frames the spring still settles; reduced motion is off.

## How it works

1. **Groups.** Each `.layer[data-slot]` takes its tint from the manifest: `ink` layers move along the motion, `accent` layers (the fill) against it. Her final art needs no code change. The xray layer rides with the ink, since it draws her ribcage in ink. The paper doesn't move.
2. **Target.** Speed on screen: scroll velocity (scrolling down moves the page up), plus pointer velocity on a fine pointer. Only the part of each speed above `V_START` counts, reaching the full slip at `V_FULL`, so ordinary reading scrolls stay in register. The combined vector is clamped to `MAX` (1 px each way, so 2 px between the inks: SPEC's "1–2 px").
3. **Spring.** A stiff, damped spring follows the target every frame. It's smooth, not stepped: the paper moving isn't her hand-drawn line. It runs on wall-clock time, so it settles under `?freeze` too, and integrates each frame in fixed substeps of `SUBSTEP` (1/120 s): at this stiffness a single step longer than ~37 ms would go unstable, which a phone dropping frames reaches. Its offset is clamped to `MAX`, because a reversal mid-slip could fling it further. Offsets snap to device pixels so the slipped lines stay crisp.
4. **Writes.** A 2D `translate()`, written to a group only when its snapped value changes. Offsets snap to a handful of values, so a flick repaints the poster a few times rather than promoting every layer to the compositor (`translate3d` cost about 70 MB of GPU memory at 1440 px, DPR 2, for 8 extra full-poster layers).
5. **Sleep.** The ticker subscription starts on scroll velocity or pointer movement and ends once the spring settles; then the transforms are removed. Offscreen, the poster snaps back to register and nothing ticks.

| Quality | What runs |
|---|---|
| `full` | scroll and pointer velocity |
| `lite` | scroll velocity only |
| `static` | off |

Measured in the cloud browser: a flick of ~100 px per frame slips the inks 1 px each way, and they're back in register 350–380 ms after the scroll stops.

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `MAX` | `index.ts` | 1 px | Largest slip of each ink; the inks end up at most twice this apart |
| `V_START` | `index.ts` | scroll 900, pointer 1200 px/s | Below this speed, nothing slips |
| `V_FULL` | `index.ts` | scroll 4000, pointer 5000 px/s | At this speed, the full slip |
| `STIFFNESS`, `DAMPING` | `index.ts` | 900, 38 | The snap back: stiffer is quicker, less damping overshoots more |
| `REST` | `index.ts` | 0.02 px | Below this the spring counts as settled |
| `SUBSTEP` | `index.ts` | 1/120 s | Longest integration step; keep it well under 37 ms if you stiffen the spring |
| `?misregister=<px>` | URL | | Holds the inks that far apart (−2 to 2), for screenshots |
