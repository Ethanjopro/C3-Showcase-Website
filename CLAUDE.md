# C3 Showcase site

Website for the C3 Showcase (a Creative Computing class showcase). The look comes from a friend's poster drafts: the site should feel like her poster came alive. Awwwards-level craft, but the art is hers.

## Sources of truth
- `reference/drafts/`: her poster drafts (early; final layered art comes later).
- `reference/moodboard/`: 16 pins from her Pinterest board (other artists' work), summarized in INSPIRATION.md section 1b. Ideas only: never trace, crop or ship them. Nothing in `reference/` is bundled or deployed.
- `reference/INSPIRATION.md`: palette, motifs, her moodboard, reference sites, effect map. Read it before planning any feature.
- `SPEC.md` (what the site is and how it looks) and `PLAN.md` (build order, and which session owns which files) define scope and order.
- IMPORTANT: palette, hand lettering and motifs come from her drafts. Line quality comes from her final art: the drafts are rougher than the final will be, so never add roughness to imitate them. No skill, library or template default overrides them. Never copy art, layout or copy from the reference sites.

## Design decisions
- SPEC.md is the design system: page structure (§2), effects (§3), look and type (§4), accessibility (§6). There is no separate design-system file.
- Where the spec leaves a choice open (the two text fonts, spacing, details of the info layer), use the frontend-design skill. Her drafts and SPEC.md still win over anything it suggests.
- Fonts: choose them for this poster, not from habit, and compare candidates next to her lettering in a screenshot before deciding. Don't use the usual defaults: Inter, Roboto, Arial, Helvetica, system-ui, Geist, Poppins, Montserrat, DM Sans, Manrope, Outfit, Syne, Space Grotesk, Space Mono, JetBrains Mono, IBM Plex, Playfair Display, Fraunces or Instrument Serif.
- The info layer borrows editorial marks from her moodboard: index numbers, thin rules, small print, columns. The same marks are today's generic "AI editorial" look, so each one must carry her poster (her line, her small print, her colorways). Clean hairlines and tracked-out mono labels on their own are not enough.
- Motion lives in the poster layer. The readable info layer animates only its entry wipe.

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
