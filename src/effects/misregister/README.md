# misregister

SPEC §3 row 8 (tier A), built in PLAN step 9. Status: **done**.

On a fast scroll or flick, the ink and the accent slip apart, like a two-color print off register, then a quick spring snaps them back.

- **Owns:** this folder. Nothing else (PLAN "Rules for parallel sessions").
- **Mount:** the hidden mount at the top of `<body>` (unused: everything it writes is on the layers).
- **Writes outside the mount:** inline `transform` on each poster `.layer` (writer table), only while slipping. At rest the property is removed.
- **Contract:** `init(root, { quality })` and `destroy()`. Imports `core/art` (`slot`, for each layer's tint), `core/scroll` (`onVelocity`, `scroll.velocity`), `core/pointer`, `core/ticker` and `core/onscreen`. It loads at `idle`, so pulling in `core/scroll` (GSAP ScrollTrigger) costs nothing at first paint, and c3-window loads it anyway.
- **Screenshots:** `npm run shots -- misregister` writes `.shots/misregister-mid-scroll@{390,1440}.png` (held at 2 px apart with `?misregister=2`) and `misregister-mid-scroll-teal@390.png`, scrolled to the small print so the slipped frame and fill sit mid-screen. Zoom in on the poster frame and the fill's edges: the ink sits 1 px up, the accent 1 px down.
- **Tests:** `misregister.spec.ts`: a scripted fast scroll slips the fill and the line art in opposite directions, never more than 2 px apart, and both are back in register within 500 ms of stopping; a slow scroll does nothing; a fast pointer flick slips them on desktop; offscreen, everything rests; reduced motion is off.

## How it works

1. **Groups.** Each `.layer[data-slot]` takes its tint from the manifest: `ink` layers move along the motion, `accent` layers (the fill) against it. Her final art needs no code change. The xray layer rides with the ink, since it draws her ribcage in ink. The paper doesn't move.
2. **Target.** Speed on screen: scroll velocity (scrolling down moves the page up), plus pointer velocity on a fine pointer. Only the part of each speed above `V_START` counts, reaching the full slip at `V_FULL`, so ordinary reading scrolls stay in register. The combined vector is clamped to `MAX` (1 px each way, so 2 px between the inks: SPEC's "1–2 px").
3. **Spring.** A stiff, damped spring follows the target every frame. It's smooth, not stepped: the paper moving isn't her hand-drawn line. It runs on wall-clock time, so it settles under `?freeze` too. Its offset is clamped to `MAX`, because a reversal mid-slip could fling it further. Offsets snap to device pixels so the slipped lines stay crisp.
4. **Sleep.** The ticker subscription starts on scroll velocity or pointer movement and ends once the spring settles. Then the transforms are removed, so the layers leave the compositor. Offscreen, the poster snaps back to register and nothing ticks.

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
| `?misregister=<px>` | URL | | Holds the inks that far apart (−2 to 2), for screenshots |
