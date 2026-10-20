# C3 Showcase site

Website for the C3 Showcase (a Creative Computing class showcase). The look comes from a friend's poster drafts: the site should feel like her poster came alive. Awwwards-level craft, but the art is hers.

## Sources of truth
- `reference/drafts/`: her poster drafts (early; final layered art comes later).
- `reference/moodboard/`: 16 pins from her Pinterest board (other artists' work), summarized in INSPIRATION.md section 1b. Ideas only: never trace, crop or ship them. Nothing in `reference/` is bundled or deployed.
- `reference/INSPIRATION.md`: palette, motifs, her moodboard, reference sites, effect map. Read it before planning any feature.
- `SPEC.md` and `PLAN.md`: once written, they define scope and order.
- IMPORTANT: palette, hand lettering, motifs and the rough line quality come from her drafts. No skill, library or template default overrides them. Never copy art, layout or copy from the reference sites.

## Design decisions (ui-ux-pro-max skill)
- Use it for: body/UI font pairing that sits under her hand lettering, layout of the info and project sections, interaction and navigation patterns, accessibility, and its pre-delivery checklist.
- Ignore its color palette and style-category picks. The persisted design system lives in `design-system/c3-showcase/MASTER.md`, and its color section must use our tokens.
- Its "animate only 1–2 elements per view" guidance doesn't apply to the poster layer, where motion is the point. It does apply to the readable info layer.

## Stack
- Vite + TypeScript, Three.js for WebGL, GSAP for timelines, plain CSS with custom properties. No UI framework. Static build.
- Add libraries with npm. Never add CDN `<script>` tags; the cloud network blocks most CDNs.
- Scripts (create them during scaffold and keep these names):
  - `npm run dev`, `npm run build`, `npm run preview`
  - `npm run shots`: build, serve, and capture each section at 1440×900 and 390×844 into `.shots/` with Playwright.

## Architecture
- One effect per folder: `src/effects/<name>/` exporting `init(root, opts)` and `destroy()`. Effects never import each other; they share `src/core/` (ticker, pointer, scroll, palette).
- One shared render loop in `src/core/ticker.ts`. Pause it when the tab is hidden; skip effects that are offscreen.
- Art loads only through slots in `src/art/manifest.json`: `lineart`, `fill`, `halo`, `cables`, `ribcage`, `eyescreen`, `wings`, `paper`, `title`. Swapping in her final files must need no code changes.
- All copy lives in `src/content/*.json`. Event date and location stay "0.0.0" until real details exist.
- Colors only through tokens in `src/styles/tokens.css`. Her six colorways are token sets; teal/coral is the default.

## Motion rules
- Hand-drawn effects (line boil, scribbles, sketch-in) step at 8–12 fps. Cursor and camera motion stay smooth.
- `prefers-reduced-motion`: show the finished, static poster with all content readable. No boil, no autoplay.
- Every pointer effect has a touch alternative (e.g. draw-to-reveal instead of the X-ray cursor lens).
- Budget: 60 fps on a mid-range laptop, devicePixelRatio capped at 2, no layout shift on load.

## Verify before calling anything done
- After any visual change: `npm run build && npm run shots`, open the screenshots next to the drafts, and list the differences. Show evidence (screenshot paths, command output) instead of asserting success.
- Before merging a feature: delegate to the `design-reviewer` subagent, fix its Must-fix findings, then run `/code-review`.
- Cloud VMs render WebGL in software: judge correctness there, judge smoothness locally.

## Workflow
- Use plan mode for anything that touches more than one effect or `src/core/`.
- Parallel sessions work only inside their own `src/effects/<name>/` unless the task says otherwise.
- When compacting, keep: the list of modified files, which effects are done, and open review findings.
