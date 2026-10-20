# C3 Showcase site: plan

This is the build order for `SPEC.md`.
- **Step 1** (scaffold) runs first and blocks everything else. It also delivers the 24-hour preview.
- **Steps 2–12** build one effect each, numbered in SPEC §3 priority order. Each owns one folder, so two or three can run in parallel.
- **Step 13** is the launch pass.

Session prompts live in `setup/PROMPTS.md`.

Every step ends with CLAUDE.md's "Verify before calling anything done":
1. Run `npm run build && npm run shots`.
2. Compare the screenshots with the drafts and list the differences.
3. Run the design-reviewer subagent and fix its Must-fix findings.
4. Run `/code-review`.

Paste screenshot paths and command output as evidence.

---

## Schedule

Day 0 is Tue 2026-10-20. Launch is Tue 2026-11-03.

| When | In parallel | Steps |
|---|---|---|
| Day 0–1 (Oct 20–21) | 1, then 2 | **1 scaffold → merge → Pages live = 24-hour preview.** Then 2 line-boil ‖ 3 paper-grain, both short, merged the same day if possible. |
| Day 1–4 (Oct 21–24) | 3 | 4 xray ‖ 5 c3-window ‖ 7 halo-menu. Halo-menu is the longest step, so it starts early. |
| Day 4–7 (Oct 24–27) | 3 | 6 sketch-in ‖ 8 palette ‖ 9 misregister, then 10 panel-wipe in the same slot |
| Day 7–10 (Oct 27–30) | 2–3 | 11 cables ‖ 12 crt-screens ‖ halo-menu overflow or fixes |
| Day 10–12 (Oct 30–Nov 1) | 1 | 13 launch: review, budgets, flag decisions with her, final-art swap if her files exist |
| Day 13–14 (Nov 2–3) | (none) | Buffer |

If a step runs late, use SPEC §3's cut order: `crt-screens`, then `cables`, then the 3D ring in `halo-menu`.

---

## Rules for parallel sessions

**What an effect step owns.** Exactly two things:
- `src/effects/<name>/`: `index.ts`, any modules, `style.css`, `README.md`, `shots.json`, and `<name>.spec.ts`.
- `src/content/<name>.json`, if the effect has copy.

**Everything else is shared.** Step 1 owns the shared files; after that, only a sequential session in plan mode changes them:
- `index.html`, `src/main.ts`, `src/core/`, `src/ui/`, `src/styles/`, `src/effects/registry.ts`
- `src/art/`, `art-src/`, `public/`, `src/config/features.json`, the other `src/content/*.json`
- `scripts/`, `tests/`, `package.json` and its lockfile, `.github/`, `vite.config.ts`, `playwright.config.ts`

**When an effect needs something shared that's missing:**
- Build it inside the effect folder.
- Write the proposed shared change in the PR description.
- Never edit shared files from an effect session.

Step 1 installs every dependency this plan needs, so no effect step touches `package.json`.

**Who may write to which element.** Every element has exactly one writer, so no two effects ever set the same property on the same element. Step 1 creates all of these elements.

| Element | Writer | What it may change |
|---|---|---|
| `<html data-colorway>` | `core/palette.ts` only. The palette effect calls it. | The colorway attribute |
| `<html data-fx-<name>>` | That effect | Its own on/off attribute. Its CSS may key off this attribute. |
| `.poster-stage` | c3-window | Mask or clip, scale, pin |
| `.layer` (one per slot) | misregister | `transform` |
| `.layer__boil` | line-boil | `filter` |
| `.layer__art` and the SVG paths inside it | sketch-in | Stroke dash, clip, opacity |
| `[data-fx="<name>"]` mounts | That effect | Anything inside the mount, plus `data-state` on the mount, which tests read |
| An effect's own slot layer | The effect that replaces it: cables (`cables` slot), xray (`ribcage` slot) | Hide or show, through its `data-fx-<name>` attribute only |

---

## Step 1: Scaffold

Sequential. Delivers the 24-hour preview.

**Owns:** every shared file listed above. **Mode:** plan mode, because it touches `src/core/`.

The step is long. If it doesn't fit in one session, split it into two sequential ones and merge between them:
- **1A** covers 1.1–1.5 and 1.9–1.10.
- **1B** covers 1.6–1.8.

### 1.1 Tooling

- Vite + TypeScript in strict mode.
  - Set `base: './'` so the build works at any path: Pages, a custom domain, or a school server.
- Install every dependency up front:
  - Runtime: `three`, `gsap` (ScrollTrigger included), and the `@fontsource/*` packages for the font pair chosen in 1.2.
  - Dev: `typescript`, `vite`, `@types/three`, `vitest`, `@playwright/test`, `@axe-core/playwright`, `sharp`, `potrace`.
- npm scripts. The first four keep the names from CLAUDE.md:
  - `dev`, `build`, `preview`, `shots`
  - `check`: `tsc --noEmit` plus `vitest run`
  - `test:e2e`: Playwright
  - `art`: the manifest-driven art build
  - `art:placeholders`: cuts placeholders from the drafts

### 1.2 Type, spacing and layout

SPEC.md is the design system; there is no separate design-system file. Follow CLAUDE.md's "Design decisions", and use the frontend-design skill for what the spec leaves open.

- **Fonts.** Pick the two text families from the direction in SPEC §4, following CLAUDE.md's font rules.
  - Before deciding, compare two or three candidate pairs in a throwaway screenshot next to her lettering, cropped from `reference/drafts/`. The throwaway page is not part of the build.
  - Put the pick, two runners-up and a line of reasoning for each in the PR description, so the owner and the artist can compare.
- **Scales.** A type scale and a spacing scale, phone first, written as tokens in 1.3.
- **Layout.** The info, projects and credits sections from SPEC §2, built from the marks in SPEC §4.

### 1.3 Tokens: `src/styles/tokens.css`

- Six `[data-colorway="…"]` blocks, each defining `--ink`, `--accent`, `--paper`, `--paper-2`, `--text` and `--on-ink`.
  - Values come from SPEC §4, including the rules for `--text`.
  - `:root` repeats the teal-coral values.
- Type, spacing, z-index and motion tokens, such as `--step-fps: 10` plus durations and easings.
- This is the only file in the project allowed to contain raw hex values.

### 1.4 Core: `src/core/`

This is the contract every effect codes against. Effects import only from here. Keep these signatures stable once step 1 merges.

| Module | API |
|---|---|
| `ticker.ts` | `add(fn: (t, dt) => void, opts?: { fps?: number; el?: Element }) → off()`. <br>- One `requestAnimationFrame` loop for the whole site. <br>- `fps` steps the callback; hand-drawn effects use 8–12. <br>- `el` skips the callback while that element is offscreen. <br>- The loop pauses when the tab is hidden. <br>- `?freeze=<ms>` pins the clock for deterministic screenshots. |
| `motion.ts` | `quality(): 'full' \| 'lite' \| 'static'` and `onChange(cb)`. <br>- `static` means reduced motion. <br>- `lite` means Save-Data, `deviceMemory ≤ 2`, or sustained dropped frames against the device's own cadence (a 30 Hz cap is not slow). |
| `pointer.ts` | Shared pointer state: <br>- position, in client space and relative to an element (`local(el)` returns 0–1) <br>- a smoothed position and velocity <br>- `type` (`mouse`, `touch` or `pen`) and `down` <br>- `fine`, true for a hover-capable fine pointer <br>All listeners are passive. |
| `scroll.ts` | `y` and `velocity`. <br>- `progress(el, cb, { start, end, pin })` returns `kill()` and uses GSAP ScrollTrigger internally. <br>- `onEnter(el, cb, { once })` returns `off()`. <br>Native scroll only. |
| `palette.ts` | `current`, `list`, `request(name)`, `setTransition(fn)`, `color(token)`, `onChange(cb)`. <br>- With no transition registered, `request` applies the change instantly. <br>- `color()` reads the resolved CSS value, for use in canvas and WebGL. <br>- The choice persists in `localStorage`. |
| `art.ts` | `slot(name)` returns the manifest entry with its URL resolved. `image(name)` returns a decoded image. `rect(name)` returns geometry relative to the poster. |
| `content.ts` | Typed access to `src/content/*.json`. |
| `flags.ts` | `enabled(name)`, from `src/config/features.json` plus the `?off=a,b` and `?only=a,b` overrides. |
| `bus.ts` | Typed events that let effects talk without importing each other: `colorway`, `navigate`, `menu:open`, `menu:close`. |
| `raster.ts` | `noiseTile(size, seed)`, `halftone(image, cell)`, `roughStroke(ctx, points, seed, width)`. |

**Effect contract:**
- `init(root: HTMLElement, opts: { quality }): void | Promise<void>`.
- `destroy(): void`. It removes every listener, ticker subscription and GPU resource the effect created.

### 1.5 Registry, stubs and flags

- `src/effects/registry.ts` lists every effect from SPEC §3. For each, it records:
  - the mount selector
  - when it loads: `load`, `idle`, `visible` or `interaction`
  - a lazy `import()`
- Create a stub folder for every effect, containing:
  - `index.ts` with a no-op `init` and `destroy`
  - a `README.md` naming its SPEC row
  - an empty `shots.json`
- `src/config/features.json` starts with every effect on.
- `src/main.ts`:
  - boots the core, then inits each enabled effect
  - catches an effect that throws, logs it and skips it; one broken effect never breaks the page

### 1.6 Content and HTML

- Create `src/content/*.json` as listed in SPEC §5, with placeholder copy.
- `scripts/vite/c3-html.ts` is a small Vite plugin:
  - It bakes content and art slots into `index.html` at build time.
  - It inlines SVG slots marked `inline`.
- Page structure follows SPEC §2:
  - Sections with `h1` and `h2` headings.
  - Every `[data-fx]` mount.
  - The Menu `<dialog>` with a real `<nav>` list, working without JS enhancement.
  - A halo hit button over the poster's halo that opens the same dialog.
  - The color bar as a radio group that calls `core/palette.request()`, so colorways swap even without the palette effect.
  - The RSVP chip, the skip link and the credits.
  - `data-crt` mounts on the eye screen and on each project screen.
  - A `[data-fx="panel-wipe"]` mount in each section header.
- Poster layers, bottom to top:
  - paper, wings, fill, lineart
  - ribcage (her sketch shows the panel, so the static poster does too), the xray mount, then eyescreen
  - cables (slot art plus the cables mount)
  - halo, title, small print, and the halo hit button
- Each layer is `.layer > .layer__boil > .layer__art`, nested inside `.poster-stage > .poster`.
- `.poster` is an aspect-ratio box sized from the manifest's frame, so nothing shifts on load.

### 1.7 Art pipeline and placeholders

- `scripts/art/placeholders.mjs` (run by `npm run art:placeholders`):
  - Reads only `reference/drafts/`, never the moodboard.
  - Crops the drafts and separates them by color into one PNG per slot, written to `art-src/placeholder/`:

    | Source pixels | Slot |
    |---|---|
    | Black lines | `lineart` |
    | Red | `halo` and `cables`, split at the ring |
    | Black panel | `ribcage` |
    | Eye rectangle | `eyescreen` |
    | Coral from the teal/coral colorway | `fill` |
    | Lettering from thumbnail concept 1 | `title` |
    | Draft background | `paper` |
    | Wing lines | `wings` |

  - Crop boxes live in the script, so it can be re-run. Rough results are fine, as is slight misalignment between sources.
- `scripts/art/build.mjs` (run by `npm run art`):
  - Reads each slot's `source`.
  - Turns black-on-transparent into a tint mask, resizes it, and writes the result to `public/art/`.
  - Vectorizes slots marked `vectorize` with potrace, writing **one `<path>` per contour** so sketch-in can draw the paths in sequence.
  - Is re-run on her final files.
- `src/art/manifest.json` holds:
  - the frame size
  - for each slot: `source`, `src`, `width`, `height`, `tint`, `inline` and `vectorize`
  - the geometry from SPEC §5, measured from the placeholders
- Commit both `art-src/placeholder/` and `public/art/`.

### 1.8 Static poster and readable layer

- Assemble the complete static poster from the slots, tinted by tokens. It is also the reduced-motion and no-JS state.
- Lay out Info, Projects (teaser) and Credits following the design system, phone first.
- Self-host the fonts with metric-matched fallbacks, so text doesn't shift when they load.

### 1.9 Verification tooling

- **`scripts/shots.mjs`** (`npm run shots`):
  - Builds the site and serves `dist/`.
  - Captures every section at 1440×900 and 390×844 into `.shots/<section>@<width>.png`, plus a `-reduced` variant of each.
  - Also captures every state listed in `src/effects/*/shots.json`, as `.shots/<effect>-<state>@<width>.png`.
- **`shots.json` format:**
  ```json
  [{ "name": "revealed", "query": "?freeze=0",
     "steps": [{ "scrollTo": "#poster" }, { "tap": ".x" },
               { "swipe": { "from": [0.3, 0.5], "to": [0.7, 0.5] } }, { "wait": 300 }],
     "viewports": [390, 1440], "reducedMotion": false }]
  ```
- **`playwright.config.ts`:**
  - Two projects:
    - `phone`: 390×844, `hasTouch`, `isMobile`
    - `desktop`: 1440×900
  - Tests are collected from `tests/e2e/*.spec.ts` and `src/effects/*/*.spec.ts`.
- **Baseline end-to-end tests** in `tests/e2e/`:
  - no console errors
  - SPEC §9 step 1: the first viewport's copy, and CLS
  - axe
  - reduced motion
  - JavaScript disabled
  - every `?off=` flag
- **Unit tests** (vitest):
  - ticker stepping and freezing
  - flag parsing
  - schemas for the manifest and the content files
  - contrast for all six colorways, parsed from `tokens.css`

### 1.10 CI and deploy

- `.github/workflows/ci.yml` runs on pull requests: `npm ci`, `npm run check`, `npm run build`, then Playwright Chromium and `npm run test:e2e`.
- `.github/workflows/deploy.yml` runs on every push to `main`. It builds the site and deploys `dist/` with `actions/upload-pages-artifact` and `actions/deploy-pages`.
- **Owner action** (see SPEC §8):
  1. Get GitHub Pro, which is free with the Student Developer Pack.
  2. In the repo, set Settings → Pages → Source to "GitHub Actions".

  Don't make the repo public instead.

### Verify (step 1 is done when)

- `npm run check`, `npm run build` and `npm run test:e2e` all pass. Paste the gzip size table from the build.
- `npm run shots` has run. Open these next to the drafts and list the differences:
  - `poster@390`, `poster@1440`, `poster-reduced@390`
  - `info@390`, `info@1440`
  - `projects@390`
  - `credits@390`
- SPEC §9 step 1 passes: date and location are visible in the first viewport at 390×844.
- The owner opens the Pages URL on a phone. **That completes the 24-hour preview.**
- design-reviewer has run, then `/code-review`.

---

## Effect steps

Every effect step shares these:
- **Depends on:** step 1 merged.
- **Owns:** only the folder named in the step, plus `src/content/<name>.json` where noted.
- **Files it adds** to its folder:
  - `shots.json` states
  - `<name>.spec.ts` for the **[auto]** checks it owns in SPEC §9
  - a `README.md` listing its tuning knobs
- **Quality levels:**
  - Under `static`, the effect shows its end state from SPEC §3.
  - Under `lite`, it drops its extras.
- **Smoothness:** judge it on a real device. The cloud VM only shows whether the effect is correct.

### Step 2: line-boil

**Owns:** `src/effects/line-boil/`. **Priority:** 1 (tier A).

Build:
- Inject one hidden `<svg>` of filters: `feTurbulence` plus `feDisplacementMap`, with three seeds.
- Apply the filter to `.layer__boil` on the lineart, title, halo and wings layers. Do it through `data-fx-line-boil` and the effect's own CSS.
- `ticker.add(step, { fps: 10, el: poster })` cycles the seed.
  - Displacement is about 0.25 % of the poster width.
- Under `lite`: lineart only, at 8 fps. Under `static`: no filter.
- If a step costs more than 2 ms in a 4× CPU-throttled trace at 390 px, fall back to pre-rendered frames cycled the same way.

Verify:
- Shot states `t0` and `t100` (`?freeze=0` and `?freeze=100`): the line-art box differs between them.
- `t0` and `t50` are identical, which proves the stepping.
- The `-reduced` shot shows clean lines.
- The PR includes the trace numbers.

### Step 3: paper-grain

**Owns:** `src/effects/paper-grain/`. **Priority:** 2 (tier A).

Build:
- Use `raster.noiseTile` to make four grain tiles once.
- The fixed full-viewport mount (above the content, below the chrome, `pointer-events: none`) cycles them at 8 fps with a multiply blend.
- Grain opacity stays at or below 4 % behind text blocks, so contrast holds.
- Under `static`: one tile, still.

Verify:
- Shots at both widths show the grain.
- Pixel-sample the background behind info text in `info@390`: text contrast is still at least 4.5:1.
- Shots at `?freeze=0` and `?freeze=125` differ.

### Step 4: xray

**Owns:** `src/effects/xray/`, `src/content/xray.json` (hint copy). **Priority:** 3 (tier B).

Build:
- **Canvas.** A canvas in the xray mount, the size of the poster, with DPR ≤ 2.
  - Pre-render the `ribcage` slot once as halftone ink over `--paper-2`.
  - Each frame draws the mask, then composites the ribcage with `source-in`.
- **Fine pointer.** A circular lens about 12 % of the poster width follows the smoothed pointer while it is over the poster.
- **Touch.** Horizontal strokes over the ribcage `rect` paint the mask with a brush about 9 % of the poster width.
  - The poster gets `touch-action: pan-y pinch-zoom`, so vertical swipes scroll and pinch-zoom still works.
  - Painted areas heal over about 4 s.
- **Keyboard.** An "X-ray" toggle button in the poster's small print, with `aria-pressed`, reveals the whole `rect`.
- **Rendering.** Render only while active or healing; otherwise unsubscribe from the ticker.
- **Under `static`:** the toggle works, and reveal and heal are instant.
- **Recolor.** On the `colorway` bus event, re-render the halftone.

Verify:
- Phone end-to-end tests:
  - Touch strokes across the chest leave non-transparent canvas pixels inside the `rect`.
  - A vertical swipe on the poster increases `scrollY`.
  - The toggle reveals the `rect`.
- Desktop: moving the mouse draws lens pixels.
- Shots: `revealed@390`, `lens@1440`, and `revealed` with the `black-red` colorway applied.

### Step 5: c3-window

**Owns:** `src/effects/c3-window/`. **Priority:** 4 (tier B).

Build:
- **Window.** Mask `.poster-stage` with the C3 letterforms taken from the inline `title` SVG's `regions.c3`.
  - Scale the letters so they overflow the viewport, a cropped wordmark.
  - The small print (date, location) stays visible around them.
- **Scroll.** `scroll.progress` with `pin`, over at most one viewport of scroll, scales the mask up until the letters fill the screen. Then remove the mask entirely.
  - Scrolling back reverses it.
  - Scale with transforms only, never layout properties.
- **Under `static`:** the window starts open, with no pin.
- **Clock.** The ticker keeps running during the pin, so sketch-in and line-boil still play inside the letters.

Verify:
- Shots at progress 0, 50 and 100 % at both widths.
- The `-reduced` shot shows the open poster at the top of the page.
- End-to-end:
  - Date and location are inside the first viewport at progress 0.
  - The total pin distance is at most the viewport height.
- Note in the PR how much time one frame costs in a 4× CPU-throttled trace.

### Step 6: sketch-in

**Owns:** `src/effects/sketch-in/`. **Priority:** 5 (tier A).

Build:
- **When.** Once per session (`sessionStorage`).
- **Hidden start.** An inline class hides the line art before first paint, and only when JS runs with full motion.
  - LCP goes to the title text and small print, which are never hidden.
- **Draw.** Draw the lineart paths with `stroke-dashoffset`, top to bottom, stepped at 12 fps.
- **Fill.** The fill floods in as a stepped wipe of 6–8 frames, followed by the title. Total time is at most 2.4 s.
- **Skip.** Any tap, scroll or key jumps straight to the end state.

Verify:
- Shots at `?freeze=` 0, 600, 1200 and 2400 show progressive drawing.
- Two frozen times inside one 83 ms step produce identical shots.
- End-to-end:
  - A scroll during the intro completes it.
  - The reduced-motion and JS-disabled shots show the finished poster at time 0.
  - A second visit in the same session skips the intro.

### Step 7: halo-menu

**Owns:** `src/effects/halo-menu/`. **Priority:** 6 (tier B). **Suggestion:** use `/effort high`, and optionally `/advisor`.

Build:
- **Enhance, don't replace.** The step 1 `<dialog>` and its `<nav>` list keep working on their own. The effect only adds the 3D ring inside its mount in the dialog.
- **Loading.** Lazy-load Three.js on first open, and prefetch it on idle.
- **Scene.** A ring of boxy screens strung on a cable loop, with flat token colors (`MeshBasicMaterial`) and no gloss or lighting.
  - Box edges jitter at 10 fps so they match her line.
  - Labels come from `sections.json`, rendered to canvas textures.
  - The Projects screen shows noise.
- **Entrance.** When opened from the poster's halo, the ring grows out of the halo's `screens` rects.
- **Interaction.**
  - Drag or swipe turns the ring with inertia and snaps to the nearest screen.
  - Tapping the front screen dollies the camera in (300 ms), closes the dialog and emits `navigate`, which scrolls to the section.
- **Accessibility.**
  - The list stays the source of truth. The ring is `aria-hidden` and follows focus.
  - Arrow keys move focus; Enter activates; Esc closes; focus returns to the trigger.
- **Cleanup.** Dispose the renderer, geometries and textures on close. DPR is capped at 1.5 on phones.
- **Fallback.** Under `static`, under `lite`, or without WebGL: the dialog shows the list styled as a grid of screens.

Verify:
- Shots: `open@390`, `open@1440`, `open-reduced@390`.
- End-to-end:
  - The keyboard path from SPEC §9 step 6.
  - A touch swipe changes the front screen.
  - With Chromium's `--disable-webgl`, the grid appears.
  - The network log shows no Three.js chunk before the first open.
  - Ten open/close cycles leave no console warnings.
- Paste the gzip size of the Three.js chunk (≤ 170 KB).

### Step 8: palette

**Owns:** `src/effects/palette/`. **Priority:** 7 (tier B).

Build:
- Register `palette.setTransition`. The transition:
  1. Slides a full-viewport flat block of the new accent, then of the new ink, across the page (about 600 ms, transforms only).
  2. Applies the new colorway at the midpoint.
  3. Uncovers the page.
- Effects that draw to a canvas redraw on the `colorway` event; this effect doesn't touch them.
- Under `static`: no transition registered, so the swap is instant.

Verify:
- Shots `poster-<colorway>@390` for all six colorways: the art, the UI and the text all recolor.
- End-to-end:
  - Arrow keys within the radio group change the colorway.
  - A reload keeps the choice.
  - The contrast unit test passes.
- Include one mid-wipe shot.

### Step 9: misregister

**Owns:** `src/effects/misregister/`. **Priority:** 8 (tier A).

Build:
- Use scroll velocity, plus pointer velocity on desktop.
- Offset the ink layers' `.layer` and the accent layers' `.layer` in opposite directions, by up to 2 px.
- A quick spring brings them back to 0.
- Under `static`: off.

Verify:
- End-to-end: during a scripted fast scroll, the fill layer's transform is non-zero; within 500 ms of stopping, it is back to 0.
- One shot taken mid-scroll shows the offset.

### Step 10: panel-wipe

**Owns:** `src/effects/panel-wipe/`. **Priority:** 9 (tier A).

Build:
- On a section's first `scroll.onEnter`, a flat block (accent or ink, alternating by section) slides across that section's header and off again, about 500 ms. Each section plays it once.
- The heading stays in the accessibility tree throughout. It uses absolute positioning and transforms only.
- Under `static`: off.

Verify:
- Shots of `info` mid-wipe and at the end.
- The `-reduced` shot shows the headings with no blocks.
- End-to-end: CLS stays at or below 0.01 while scrolling through every section.

### Step 11: cables

**Owns:** `src/effects/cables/`. **Priority:** 10 (tier B, part of the halo).

Build:
- **Ropes.** A canvas in the cables mount runs a Verlet rope for each `cables.anchors` entry: 12–20 segments, gravity, damping, and a fixed-step simulation at 60 Hz.
- **Forces.** Scroll velocity sways the ropes, and a pointer or finger within reach pushes them. Listeners are passive; the effect never captures a gesture.
- **Drawing.** `raster.roughStroke` draws the ropes in `--accent`. The stroke jitter re-seeds at 10 fps while the positions stay smooth.
- **Sleep.** When the ropes settle, the effect stops ticking and sets `data-state="asleep"`. It wakes on scroll velocity or a nearby pointer.
- **Static art.** `data-fx-cables` hides the static `cables` slot art while the ropes are live.
- **Under `lite`:** half the segments, 30 Hz. **Under `static`:** don't start; her drawing stays.

Verify:
- A shot at rest overlaid on the static slot shows the ropes within a few pixels of her drawing.
- End-to-end:
  - A flick-scroll moves the ropes, and `asleep` follows within 3 s.
  - A touch drag across them displaces them.

### Step 12: crt-screens

**Owns:** `src/effects/crt-screens/`. **Priority:** 11 (tier C).

Build:
- **Targets.** The `[data-crt]` mounts on the eye screen and on the project screens.
- **Look.** CSS scanlines, plus a 1 px RGB split on the eye screen.
- **Static.** Noise tiles from `raster.noiseTile` cycle at 10 fps.
- **Teaser line.** The teaser screens show the "revealed at the show" line from `projects.json`, which this step reads but doesn't edit.
- **Flash safety.** Frame-to-frame change in mean luminance stays under 10 % of the screen area, so nothing counts as a flash.
- **Under `static`:** one still frame.

Verify:
- Shots of `projects@390` and of the eye screen at a crop.
- Unit test: luminance delta between noise frames is under 10 %.
- The reduced-motion shots at 0 and 500 ms are identical.

---

## Step 13: Launch

Sequential. **Mode:** plan mode. **Owns:** shared files, for final fixes only.

1. **Flags.** The owner and the artist compare `?off=` links on a phone. Record the final choices in `src/config/features.json`.
2. **Final art**, if delivered:
   - Put her files in `art-src/final/`.
   - Point the manifest `source` entries at them and re-measure the geometry.
   - Run `npm run art`, then SPEC §9 step 13.
3. **Real copy:** date, location, RSVP, follow and her credit, in `src/content/`.
4. **Share and fallback pages:**
   - Render the static poster with Playwright as a 1200×630 share image, `public/og.png`. Add the Open Graph and Twitter meta tags with the absolute URL from `site.json`.
   - Make a favicon from the C3 region of the title.
   - Add a `404.html` that links home.
5. **Acceptance:**
   - Run the full SPEC §9 check.
   - Run Lighthouse locally on a phone profile.
   - Run design-reviewer on the whole site, then `/code-review` on `main`. Fix every Must-fix finding.
6. **QR:** a test print of the poster's QR code opens the Pages URL with both the iOS and Android cameras.
7. **Feel polish** (optional): use a local desktop session with live preview (`setup/PROMPTS.md` §5) to tune boil amplitude, wipe timing and rope damping by eye.
