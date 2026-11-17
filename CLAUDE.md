# C3 Showcase site

Website for the C3 Showcase, the Creative Computing class showcase. The look comes from a friend's poster art: the site should feel like her poster came alive.

## Read first
- `BRIEF.md`: the job, what's decided, what's yours to decide, and the quality floor. It's the only planning document.
- Her art: her final painting, poster and title in `art-src/` (see `art-src/README.md`), her drafts in `reference/drafts/`, and her moodboard in `reference/moodboard/` with `reference/INSPIRATION.md` §1b (ideas only). Never trace, crop or ship moodboard pins, and nothing in `reference/` ships.
- v1 (ten separate effects) is on the branch `archive/v1`, with its SPEC and PLAN. History, not instructions.

## How the site is put together
- `src/markup.ts` renders the whole page into `index.html` at build time (via `scripts/vite/case-html.ts`), from `src/content/site.json` (words) and `src/art/scene.json` (where things sit on her painting). One DOM serves both layouts; `src/styles/layout.css` turns it into the phone case or the desktop case.
- `src/main.ts` wires it up: the turning halo (`src/halo.ts` for where the cameras are, `src/rig.ts` for drawing the ring, wires and cameras on two canvases), the doors, hash routing (`#info`, `#attend`, `#work`, `#poster`, and `#halo` for her), the X-ray (`src/organs.ts` is the drawing inside her), the feeds and the countdown.
- `src/event.ts` works out everything from the event's `start` and `end` in `site.json`: both calendar links, the `.ics` file the build writes, the countdown, and the schema.org data in the page head.
- `npm run art` rebuilds `src/art/` from `art-src/`. Re-run it after replacing any of her files.

## Working rules
- Static site, deployed to GitHub Pages from `main` by `.github/workflows/deploy.yml`. Keep `npm run build` writing the site to `dist/`.
- Add libraries with npm. Never use CDN `<script>` tags; the cloud network blocks most CDNs.
- Questions for the owner or the artist go in `OWNER.md`, and in the PR description. Don't block on them; pick a sensible default and say which one you picked.
- Commit, push, open a pull request and merge it yourself when a piece of work is done and checked. The owner prefers Claude to handle versioning.

## Check your work
- After any visual change: build, capture the site at 390×844, 390×664 and 1440×900 (`npm run shots`: every state, sealed to the poster channel; 390×664 is what an iPhone shows with Safari's toolbars up, which is how a poster-scanner first sees it), look at the screenshots next to her painting and the mockups, and say what's different. Show evidence instead of asserting success. `?still=<degrees>` pins the halo for repeatable captures.
- `npm run check` (types and unit tests) and `npm run test:e2e` (Playwright, both sizes: keyboard path, reduced motion, axe, layout shift, nothing from `reference/` shipping) must pass.
- Before merging a feature, run the `design-reviewer` subagent, fix its Must-fix findings, then run `/code-review`.
- Cloud machines render animation in software: judge correctness there, judge smoothness on a real device.
