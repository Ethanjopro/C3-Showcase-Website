# C3 Showcase: the brief

Written 2026-10-22 for a fresh start, updated 2026-11-10 when the final direction ("the case") was built. The first version (branch `archive/v1`) worked, but it read as ten separate effects layered on a rough placeholder. This page and her art are the guides; anything not fixed here is yours to decide.

## The job

- Promote the C3 Showcase, the Creative Computing class showcase.
- Most visitors scan the QR code on her printed poster: on a phone, standing, with a few seconds of attention. The first screen must say what, when and where. RSVP and follow are one tap away.
- The site should feel like her poster came alive. Her art is the star; the site frames it.
- The live site is `https://ethanjopro.github.io/C3-Showcase-Website/`, deployed from `main` by the existing GitHub Actions workflow. The QR code encodes that URL, so never rename the repo.

## Where the look comes from

- **Her finished painting** (2026-11-10), in `art-src/her.webp`: a dark-haired girl with small grey wings, praying, in a great ruffled white dress on textured grey. It has no halo yet; ours stands in until she draws hers.
- **Her notes** (her feedback on the first mockups): a mostly monochrome palette with red as the only splash; a mood between Alien Stage and Evangelion, techno-angelic horror, an angel augmented or replaced by technology; the halo's cameras (once microphones); an X-ray on hover showing her organs mechanized; a line on the poster bringing people to the site to "see what's inside".
- **Her lettering** ("C3 Showcase") and the camera bodies of her halo, from her drafts in `reference/drafts/`.
- **Her moodboard,** in `reference/moodboard/`, summarized in `reference/INSPIRATION.md` §1b. Ideas only: never trace, crop or ship a pin.
- **The mockups** of the final direction: the "Final direction" page of the "C3 Showcase site mockups" canvas on claude.ai.

## Decided

1. **The case.** She is on display in a black case.
   - It arrives sealed: two doors with her C3 split down the seam, "Show | Case", the date and location, and a red tape reading "See what's inside" (her poster line). One tap or click opens it.
   - Inside, she turns out to wear a halo of six cameras, turning slowly above her head. Cameras behind her pass behind her hair and wings; each hangs on a wire from above, like a stage rig.
   - The six cameras are the navigation: Info, RSVP, Projects, Inside (her X-ray), Source (the site, skin off) and Credits. The same six are a real list: the feeds on the left door (desktop) or the channel keys under her (phone).
   - Hovering a camera, feed or key, or focusing a feed or key, stops the turn and lifts that camera (cameras are for the pointer; the feeds and keys are the same links for the keyboard and screen readers). Choosing one swings its camera round to the front, where it holds while its channel is on air, and turns the middle panel over to that channel's title card, white on black. A quiet "Back to her halo" returns from anywhere; so do Escape and the browser's Back.
   - Hover her (desktop) or hold her (phone) and an X-ray shows what she's made of.
2. **Her drawing is the only hand-drawn thing on the site.** Everything around it is crisp and precise, like good print production.
3. **Monochrome from her painting, one red.** Lavender greys and plum black from her painting, and one red (`#C8102E`) as the splash. Red marks what's live (the camera on air, its wire, the REC and ON AIR dots, her pump, the augmentation reading), plus three accents in the same spirit: the "See what's inside" tape, the short rule under each channel title, and the marks on a visitor's copy of the poster. Never for text on light grounds. This replaces v1's six colorways (and the Colors destination), per her notes. Her painting itself is graded into the same palette at build time (`art-src/grade.json`: her line to plum, her greys to lavender, her dress to paper white), so the case and the poster read as one object; strength 0 ships her colours untouched.
4. **Phone first** (390×844); the desktop view must look finished too.
5. **"0.0.0"** stands in for the date, location and her name until the real details exist. That's her own placeholder from the poster.
6. **Character motion later.** Subtle movement for her (breathing, hair, wings) is welcome once her layers arrive. Plan for it, but don't fake it.
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
- her halo (the ring and six cameras as layers), which replaces ours
- her drawing of the inside, which replaces the placeholder machine parts in the X-ray
- a larger export of her painting (853 × 1280 is soft on big screens), and a head, hair and wings mask
- the name for her credit, and a title for the piece
