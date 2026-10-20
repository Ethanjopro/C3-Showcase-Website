# halo-menu

SPEC §3 row 6 (tier B), built in PLAN step 7. Status: **done**.

The menu becomes her halo: a ring of boxy screens strung on a cable loop, one screen per section, drawn in her rough line and boiling at 10 fps. The Projects screen shows static.

- **Owns:** this folder.
- **Mount:** `.menu__ring [data-fx="halo-menu"]` inside `<dialog id="menu">`. It is `aria-hidden` and holds the ring's canvas while the menu is open. It carries:
  - `data-state`: `idle`, `loading`, `ring` or `grid`
  - `data-front`: the section at the front
  - `data-rendered`: set once a frame is drawn
  - `data-front-at`: the front screen's centre as canvas fractions, which tests tap. It's written each time the ring comes to rest, not every frame.
  - `data-entrance="growing"`: set while the screens grow out of the halo
- **Writes outside its mount:**
  - `<html data-fx-halo-menu>`: `grid` or `ring`. It turns `ring` the moment the menu opens at full quality with WebGL, while the chunk is still loading, so the links never jump under a finger. It drops back to `grid` only if the ring fails. While it's `ring`, `style.css` turns the list into a strip of small screens under the ring and gives `.menu` a `--halo-ring-h` for the space above it.
  - `data-halo-front` on the link of the screen at the front, so its strip screen takes the accent frame too.

  Both are proposed for the writer table in the PR. `menu.ts`, the dialog and its `<nav>` are untouched.
- **Contract:** `init(root, { quality })` and `destroy()`.
  - `index.ts` loads at idle. It's 1.2 KB gzip and imports only `core/bus`.
  - `ring.ts` holds Three.js and is a separate `import()`. It uses `core/ticker`, `core/palette`, `core/art`, `core/content`, `core/bus`, `core/clock` and `core/raster`.
- **Screenshots:** `npm run shots -- halo-menu` writes:
  - `.shots/halo-menu-open@{390,1440}.png`
  - `halo-menu-open-reduced@390.png`
  - `halo-menu-swiped@390.png`

  The entrance from the halo is too quick to catch in a software-GL screenshot, so a test covers it instead.

  The section shots also include `menu@{390,1440}.png`.
- **Tests:** `halo-menu.spec.ts` covers:
  - no Three.js request until the menu is used (network log), then the ring loads
  - the SPEC §9.6 keyboard path: Tab to Menu, Enter, arrows turn the ring (wrapping), Enter lands on the section, and Esc returns focus to Menu
  - the list stays visible, with links at least 44 px and the ring `aria-hidden`
  - phone: a touch swipe changes the front screen, and its link takes focus
  - tapping the front screen dollies in, closes the menu and lands on the section
  - desktop: opened from the halo, the screens grow out of it (`data-entrance`), then settle
  - ten open and close cycles leave no warnings or errors
  - reduced motion: the grid, arrow keys still work, and no Three.js
  - Chromium with WebGL disabled: the grid, no Three.js, no errors

## How it works

1. **Enhance, don't replace.** `menu.ts` owns the dialog: opening, Esc, backdrop clicks, focus return, and navigation on a link click or a `navigate` event. This effect adds:
   - arrow keys (and Home and End) that move focus through the list, at every quality, wrapping;
   - at full quality with WebGL, the ring.
2. **Loading.** Three.js is fetched on **intent**: the first `pointerenter`, `pointerdown` or `focus` on a menu trigger (the Menu button or the halo in the poster). It's never fetched at load or idle; see "Prefetch" below. On `menu:open` the ring mounts once the chunk is there; until then the list is the grid. WebGL is checked once, when the menu is first wanted (intent or open), not on every visit: a throwaway canvas whose context is released at once. Without WebGL, Three.js is never loaded and never logs an error. A failed chunk load is forgotten, so the next open retries. The canvas labels wait for the page's display font (700) and text font (600) to load, so they never draw in a fallback face.
3. **Scene.** One screen per `sections.json` entry on a ring of radius 2.7:
   - Each screen is a box with flat `MeshBasicMaterial` faces: no lights, no gloss.
   - Her line lives in the face textures, drawn with `raster.roughStroke`: overshooting rough frames, an inner screen bezel, and her ≡ hatching on the sides and back.
   - Fronts carry the section number (`--font-display`) and name (`--font-text`) in `--text` on `--paper-2`. The Projects front adds chunky static: `raster.noiseTile` at 22 % ink. Backs carry the same label, so the screen at the back of the ring still says which section it is.
   - A doubled `--accent` cable loop runs through the screens, sagging between them, with drips hanging below, as on her halo. Her cables are scratchy strokes, so the loop and the drips are drawn three times with wandering points and slightly different thicknesses.
   - The screen at the front wears her `--accent` frame.
   - The screens face out of the ring, but turned 55 % toward the viewer (`YAW`), so the side screens show their labels.
4. **Boil.** Every face and cable has three drawings, and the box corners jitter by `JITTER`. All of it steps together at `--fps-boil` (10), so silhouettes and lines boil like her poster. Swapping maps is free: all three drawings are made at open.
5. **Interaction.**
   - Drag or swipe turns the ring 0.9π per canvas width. Inertia decays with `FRICTION`; below `SNAP_SPEED` it snaps to the nearest screen, and that screen's link takes focus.
   - The ring follows focus, so Tab, the arrows or a tap on a strip link turn it.
   - A tap on the front screen dollies the camera in for 300 ms, then emits `navigate`, and `menu.ts` closes the dialog and scrolls. A tap on another screen turns it to the front.
   - The canvas has `touch-action: pan-y pinch-zoom`: sideways drags are the ring's, and pinch-zoom is never disabled.
6. **Entrance.** When the menu opens from the poster's halo, each screen starts at one of her halo's `screens` rects, projected into the scene, and grows into the ring over 560 ms.
7. **Rendering.** One ticker subscription while the menu is open. It renders only when something changed: a drag, a snap, the entrance, the dolly, or a boil step (10 fps at rest). DPR is capped at 1.5 on phones and 2 elsewhere.
8. **Failure.** If building the ring throws part-way, whatever was made (the canvas, the WebGL context, GPU resources) is released before the error reaches `index.ts`, which falls back to the grid.
9. **Cleanup.** On `menu:close`, everything goes: the ticker subscription, listeners, the ResizeObserver, geometries, materials, textures, and `renderer.dispose()` then `forceContextLoss()`, so ten cycles never pile up WebGL contexts.
10. **`?freeze`.** Snaps, the entrance and the dolly finish at once, and the boil holds a step.

| Quality | What runs |
|---|---|
| `full` with WebGL | the ring |
| `lite` | the grid of screens (the ring is the extra a slow device drops) |
| `static`, or no WebGL | the grid of screens, as `chrome.css` styles the list |

Arrow keys work in every mode.

## Prefetch: on intent, not at idle

SPEC §6 says Three.js is "prefetched when the browser is idle". SPEC §9.14 and PLAN step 7 check that no Three.js chunk is requested before the menu opens [auto]. Any prefetch is a request, so the two can't both hold. This effect follows the testable one: it fetches on intent (pointer over, touch on, or focus on a menu trigger). That's usually 100–300 ms before the click, and visitors who never use the menu, most phones from the QR code, never download it. **Proposed SPEC §6 wording:** "prefetched on intent (pointer or focus on a menu trigger)".

## Numbers

- **Chunk:** `ring-*.js` (Three.js plus the scene) is **138.7 KB gzip** (548 KB minified), within the 170 KB budget. `halo-menu-*.js` is 1.2 KB gzip. GSAP stays in the shared ticker chunk.
- **Smoothness:** the cloud VM renders WebGL in software, so it only shows that the ring is correct. Judge frame rate on a real phone. At rest the ring renders 10 times a second (the boil). While it's dragged or snapping, it renders every frame.

- **Frame loop:** the boil, the entrance and the rest marker don't allocate per frame.
- The strip is one row whatever the number of sections in `sections.json` (`grid-auto-flow: column`).

## Tuning knobs

| Knob | Where | Default | Effect |
|---|---|---|---|
| `RADIUS`, `BOX` | `ring.ts` | 2.7; 2.1 × 1.5 × 0.95 | Ring radius and screen size, world units |
| `YAW` | `ring.ts` | 0.55 | How far screens face out of the ring (1) vs toward the viewer (0) |
| `VARIANTS` | `ring.ts` | 3 | Drawings per face in the boil |
| `JITTER` | `ring.ts` | 0.035 | Corner jitter per boil step |
| `FOV`, `CAMERA_Y`, `FIT_MARGIN` | `ring.ts` | 30°, 3.6, 1.04 | Camera and how tightly the ring fits (phones let side screens run off the edges) |
| `DRAG` | `ring.ts` | 0.9π | Radians per canvas width of drag |
| `FRICTION`, `SNAP_SPEED`, `SNAP_RATE` | `ring.ts` | 3.5, 1.4, 11 | Inertia decay, snap threshold, snap stiffness |
| `TAP_MOVE`, `TAP_MS` | `ring.ts` | 8 px, 400 ms | What counts as a tap |
| `DOLLY_MS`, `ENTRANCE_MS` | `ring.ts` | 300, 560 | Dolly before navigating; growth out of the halo |
| `TEX` | `ring.ts` | 384 | Face texture width, px |
| `NOISE_INK` | `ring.ts` | 0.22 | Static on the Projects screen (low, so never a flash) |
| `--halo-ring-h` | `style.css` | phone `100svh − 15rem`, desktop `min(28rem, 100svh − 16rem)` | Room for the ring above the strip |
