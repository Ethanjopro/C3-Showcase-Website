# C3 Showcase: the brief

Written 2026-10-22 for a fresh start, updated 2026-11-10 when the final direction ("the case") was built and 2026-11-17 after her final poster and a quality pass that put the event first. The first version (branch `archive/v1`) worked, but it read as ten separate effects layered on a rough placeholder. This page and her art are the guides; anything not fixed here is yours to decide.

## The job

- Promote the C3 Showcase, the Creative Computing class showcase.
- Most visitors scan the QR code on her printed poster: on a phone, standing, with a few seconds of attention. The first screen must say what, when and where. Saving the date is one tap away.
- Everything on the site is about the event or is her poster come alive. No made-up readouts, no sections about the site itself.
- The site should feel like her poster came alive. Her art is the star; the site frames it.
- The live site is `https://ethanjopro.github.io/C3-Showcase-Website/`, deployed from `main` by the existing GitHub Actions workflow. The QR code encodes that URL, so never rename the repo.

## Where the look comes from

- **Her final poster** (2026-11-17), in `art-src/her.webp` (without the event text) and `art-src/poster.webp` (with it): a red-haired girl with small white wings, praying, a small ring at her hands, in a great ruffled cream dress, on a night-blue ground inside a silver frame, under her C3 SHOWCASE title. Same composition as her 2026-11-10 painting, so every position in `scene.json` still holds. Our camera halo turns above her head (her poster's own text quotes its code).
- **Her notes** (her feedback on the first mockups): a mostly monochrome palette with red as the only splash; a mood between Alien Stage and Evangelion, techno-angelic horror, an angel augmented or replaced by technology; the halo's cameras (once microphones); an X-ray on hover showing her organs mechanized; a line bringing people to the site to "see what's inside".
- **Her title** (`art-src/lettering/title.webp`: the C3 mark and SHOWCASE wordmark).
- **Ours, drawn in code:** the halo (ring, wires and cameras, `src/rig.ts`) and the drawing inside her X-ray (`src/organs.ts`). Her final poster has no camera halo of its own, so these are no longer stand-ins.
- **Her moodboard,** in `reference/moodboard/`, summarized in `reference/INSPIRATION.md` §1b. Ideas only: never trace, crop or ship a pin.
- **The mockups** of the final direction: the "Final direction" page of the "C3 Showcase site mockups" canvas on claude.ai.

## Decided

1. **The case.** She is on display in a black case.
   - It arrives sealed: two doors with her C3 mark split down the seam, her SHOWCASE as "Show | Case", a red tape reading "Tap to see what's inside" (her poster line, and the one instruction), and when on one door, where on the other: the same three lines at the same sizes, mirrored about the seam. One tap or click opens it.
   - Inside, she turns out to wear a halo of cameras, one per channel, turning slowly above her head. Each is a small drawn 3D model that keeps its lens on her; the ones behind her pass behind her hair and wings; each hangs on a wire from above, like a stage rig.
   - The cameras are the navigation, and every channel is about the event: Info (when and where), Attend (save the date: calendar links, share, and an RSVP button once there's a link), Work (what you'll see) and Poster (her poster to look at and download, and the credits). The same four are a real list: the channels on the left door (desktop) or the keys under her (phone).
   - Hovering a camera, feed or key, or focusing a feed or key, lifts that camera and slows the turn right down without stopping it (cameras are for the pointer; the feeds and keys are the same links for the keyboard and screen readers). Choosing one swings its camera round to the front, where it holds while its channel is on air, and turns the middle panel over to that channel's title card. From one channel to another the card itself turns over to the new one. A quiet "Back to her halo" returns from anywhere; so do Escape and the browser's Back.
   - Hover her (desktop) or hold her (phone) and an X-ray shows what she's made of: her idea, and the one piece of play on the site.
   - On desktop the right door is the event itself, always in view: the date, the time, the place, a countdown to the doors opening, save the date and a map link. The countdown is the only live reading on the site, and it's real.
2. **Her painting is the only hand-painted thing on the site.** Everything around it, our halo and X-ray drawing included, is crisp and precise, like good print production.
3. **Her poster's palette, one red.** Her night-blue ground for the page and panels, her frame's silver for every frame line, the ring and the line of the cameras, her cream for type, a sage grey from her dress shadows for quiet text, and her red, lifted a little for screens (`#B8313A`), as the splash. Red marks what's live (the camera at the front, its wire and its little halo, the countdown's dot, her pump in the X-ray), plus two accents in the same spirit: the "See what's inside" tape and the short rule under each channel title. Never for small text. This replaces v1's six colorways (and the Colors destination), per her notes. Her painting ships exactly as she painted it; the site took its colours from her, not the other way round (`art-src/grade.json` is off).
4. **Phone first** (390×844); the desktop view must look finished too.
5. **"0.0.0"** was her placeholder for the date, place and her name. The date and place are real now; her name is still "0.0.0" in `site.json`, and the poster credit is left off until it's filled in.
6. **She moves a little.** Her wings are cut out of her painting by `npm run art` (`parts` in `scene.json`) and rise and settle a few degrees, slowly, like breathing. That is all: no warping, nothing that redraws her. More (hair, dress, breathing) wants her own layers.
7. **Her files swap in without code.** Her art lives in `art-src/` (`npm run art` turns it into `src/art/`), and where things sit on her painting is data in `src/art/scene.json`. Words live in `src/content/site.json`.

## Yours to decide

Everything else, including how the channels are laid out, transitions, the projects teaser, and whether any other effect earns its place. One strong idea beats many small ones.

## The floor (protects visitors, not style)

- Text contrast of at least 4.5:1, and body text of at least 16 px.
- Keyboard and screen-reader users get the same destinations. The halo's links also exist as a real list.
- With reduced motion: no turning and no autoplay, and everything stays reachable.
- Fast on a phone over cellular, with no layout shift on load.
- Nothing from `reference/` ships in the build.

## Waiting on her

`OWNER.md` tracks it. The main items:
- the name for her credit
- a larger export of her painting (853 × 1280 is soft on big screens), and a head, hair and wings mask
