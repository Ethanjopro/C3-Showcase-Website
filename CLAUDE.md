# C3 Showcase site

Website for the C3 Showcase, the Creative Computing class showcase. The look comes from a friend's poster art: the site should feel like her poster came alive.

## Read first
- `BRIEF.md`: the job, what's decided, what's yours to decide, and the quality floor. It's the only planning document.
- `reference/drafts/` (her art) and `reference/moodboard/` with `reference/INSPIRATION.md` §1b (her Pinterest board, ideas only). Never trace, crop or ship moodboard pins, and nothing in `reference/` ships.
- `SPEC.md`, `PLAN.md`, `setup/PROMPTS.md` and the old `src/effects/` describe v1 (branch `archive/v1`). They are history, not instructions. Reuse code from them only where it helps.

## Working rules
- Static site, deployed to GitHub Pages from `main` by `.github/workflows/deploy.yml`. Keep `npm run build` writing the site to `dist/`.
- Add libraries with npm. Never use CDN `<script>` tags; the cloud network blocks most CDNs.
- Questions for the owner or the artist go in `OWNER.md`, and in the PR description. Don't block on them; pick a sensible default and say which one you picked.
- Commit, push, open a pull request and merge it yourself when a piece of work is done and checked. The owner prefers Claude to handle versioning.

## Check your work
- After any visual change: build, capture the site at 390×844 and 1440×900 (`npm run shots`, or an equivalent), look at the screenshots next to her drafts, and say what's different. Show evidence instead of asserting success.
- Before merging a feature, run the `design-reviewer` subagent, fix its Must-fix findings, then run `/code-review`.
- Cloud machines render WebGL and animation in software: judge correctness there, judge smoothness on a real device.
