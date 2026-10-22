# C3 Showcase: the brief

Written 2026-10-22 for a fresh start. The first version (branch `archive/v1`) worked, but it read as ten separate effects layered on a rough placeholder, and its documents were so prescriptive they left no room to design. Start the design over. This page and her art are the only guides; anything not fixed here is yours to decide.

## The job

- Promote the C3 Showcase, the Creative Computing class showcase.
- Most visitors scan the QR code on her printed poster: on a phone, standing, with a few seconds of attention. The first screen must say what, when and where. RSVP and follow are one tap away.
- The site should feel like her poster came alive. Her art is the star; the site frames it.
- Launch is Tue 2026-11-03. The live site is `https://ethanjopro.github.io/C3-Showcase-Website/`, deployed from `main` by the existing GitHub Actions workflow. The QR code encodes that URL, so never rename the repo.

## Where the look comes from

- **Her drafts,** in `reference/drafts/`. The newest and closest to final are `figure-lineart-with-halo.webp` and `figure-lineart-no-halo.webp`: a praying figure with small wings and a ring of six screens around her head. The older drafts hold her "C3 Showcase" lettering and her six colorways.
- **Her moodboard,** in `reference/moodboard/`, summarized in `reference/INSPIRATION.md` §1b. Ideas only: never trace, crop or ship a pin.
- Her final layered art arrives around Oct 30. Build so that swapping in her files needs no code changes.

## Decided

1. **Her poster is the hub.** The first screen is her poster, and her halo of six screens is the site's only navigation.
   - The halo turns slowly around her head. Screens pass behind her head and swing out in front of it.
   - Hovering or focusing a screen stops the turn and lifts that screen. Clicking or tapping brings it forward, zooms toward you, and lands on its destination.
   - Six screens, six destinations. Five so far: Info, RSVP, Projects, Colors (her colorway picker) and Credits. The sixth is open; the X-ray of her chest was the old pick, but her new drawing has no ribcage panel.
   - A small, quiet control brings you back to her halo from anywhere.
2. **Her drawing is the only hand-drawn thing on the site.** Everything around it is crisp and precise, like good print production. No wobbly rules, scribbled circles or rough frames in the interface; they compete with her line instead of framing it.
3. **Two inks on grey paper,** in her six colorways, with teal/coral as the default. The second ink is used as flat color, never for text.

   | Colorway | Ink | Accent |
   |---|---|---|
   | teal/coral (default) | `#2E5A63` | `#E2604F` |
   | black/red | `#1F1423` | `#C7433A` |
   | mauve/periwinkle | `#764666` | `#8C85A3` |
   | indigo/pink | `#402064` | `#B57198` |
   | violet/pink | `#4A28AC` | `#D07DC3` |
   | brown/orange | `#331110` | `#C38D70` |

   Paper is `#C8C8CA`. These were sampled from her drafts and are approximate; teal and mauve need a darker text shade to pass contrast.
4. **Phone first** (390×844); the desktop view must look finished too.
5. **"0.0.0"** stands in for the date and location until the real details exist. That's her own placeholder from the poster.
6. **Character motion later.** Subtle movement for her (breathing, hair, wings) is welcome once her layers arrive. Plan for it, but don't fake it with the drafts.

## Yours to decide

Everything else, including fonts (v1 used Grenze and Familjen Grotesk; keep or replace them), how the content beyond the hub is laid out and reached, transitions, the projects teaser, and whether any other effect earns its place. One strong idea beats many small ones.

## The floor (protects visitors, not style)

- Text contrast of at least 4.5:1 in every colorway, and body text of at least 16 px.
- Keyboard and screen-reader users get the same destinations. The halo's links also exist as a real list.
- With reduced motion: no turning and no autoplay, and everything stays reachable.
- Fast on a phone over cellular, with no layout shift on load.
- Nothing from `reference/` ships in the build.

## What v1 left behind (reuse or delete)

Everything is on the branch `archive/v1`:
- the deploy and CI workflows
- `npm run shots` (Playwright screenshots at 390 and 1440)
- an art pipeline that cuts and tints layers (`scripts/art/`)
- colorway tokens with a contrast test

Keep what helps and delete the rest. `SPEC.md`, `PLAN.md`, `setup/PROMPTS.md` and `src/effects/` describe v1. They are history, not instructions.

## Waiting on her

`OWNER.md` tracks it. The main items:
- her final layers, including each halo screen on its own layer, the ring, a filled head-and-hair shape the screens can pass behind, and separate head, hair, wings, hands and dress for motion
- her "C3 Showcase" lettering at high resolution
- the name for her credit
- whether the six colorways' colors are right
