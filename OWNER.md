# Owner checklist

Everything waiting on Ethan or the artist, in one place.

- Sessions add new questions under **Open**, as part of their merge step.
- When something is answered, move it to **Decided** with the answer, and update BRIEF.md if it changes the site.

---

## Open: for Ethan

| # | Question or action | Needed by | Until then |
|---|---|---|---|
| 30 | **Her name for the poster credit** (`artist` in `site.json`). | Launch | The credit line is left off |
| 4 | **RSVP link** (`rsvpUrl`), if there will be one. Set it and an RSVP button appears on Attend and in the top bar. | Launch | "Save the date": calendar links and share |
| 32 | **Check the address** the calendar and map links use: Owen Arts Center, 6101 Bishop Blvd, Dallas, TX 75205 (`address`, `mapUrl`). It's SMU's listed address for the building the Grand Atrium is in. | Launch | That address |
| 33 | **The about line** (`about`): "…a semester of work on show: games, apps, music and interactive art. Come and play with it." And the four kinds listed on Work (`work.kinds`). Right for this class? | Launch | As written |
| 22 | **The class's projects** (`work.projects`: a list of `{ title, by, url }`). They show on Work once there are some. | Before the show | The four kinds of work only |
| 5 | **Follow link:** which platform, and the URL (`followUrl`). | Any time | Not shown |
| 34 | **The X-ray** stayed (it was her idea) as a hover or press-and-hold on her poster, with no channel of its own. If it's not wanted either, say so and it comes out. | Any time | Kept |

## Open: ask her (on hold: Ethan will ask when he's ready)

Sessions add to this list but don't wait on it; until she answers, the "Until then" column holds.

| # | Question | Needed by | Until then |
|---|---|---|---|
| 25 | **A larger export** of her painting (it's 853 × 1280, a little soft on big screens and phones with sharp displays), and if she can, a mask of her head, hair and wings (the halo passes behind them; ours is cut by hand). | Any time | 853 × 1280, hand-cut mask |
| 31 | **The cooler-blue version** of her painting she sent (426 × 640): an alternative colourway, or just a preview? A full-size export can swap in for `art-src/her.webp`. | Any time | The warm version |
| 28 | **The ring at her hands.** Is that her halo (taken off, or a second one)? If so, the site could play on it. | Any time | Left as painted |
| 10 | For more character motion: separate layers for her head, hair, hands and dress (her wings already move; we cut them from her painting). | Later | Wings only |

## Decided

- **2026-11-17 (built):** her whole body floats: everything below her title band sinks 6 px and rises again over 3.4 s, with her wings, the ring and the halo's head mask riding along.

- **2026-11-17 (built):** the halo always passes in front of her wings (still behind her head and hair). The ring at her hands bobs twice as fast (1.3 s each way). The halo above her head keeps its 40 s turn (briefly 22 s by mistake: Ethan meant the ring at her hands).

- **2026-11-17 (built):** the ring at her hands floats up and down a few pixels, and her wings beat faster (3.2 s each way, was 5.2) and a little wider. Answers #28 in passing: her ring stays her own, it just moves.

- **2026-11-17 (built): Ethan's four notes on the quality pass.**
  - The halo slows right down for a hovered camera instead of stopping.
  - Turning the panel: each face now makes its own half turn and is hidden outright when away (her poster could show through, mirrored, mid-change in some browsers). From one channel to another the card turns over to the new one.
  - She moves: her wings are cut from her painting and rise and settle slowly; a light crosses her title now and then. Off under reduced motion.
  - The closed doors are calmer and mirrored: "Tap to see what's inside" on the tape replaces "Tap to | open", and When / Where are the same three lines at the same sizes either side of the seam.

- **2026-11-17 (built): the quality pass.** Ethan asked for the site to be about the event, for the stand-ins to be replaced with our own drawings, and for it to read more easily.
  - Four channels, all about the event: Info (when and where), Attend (save the date), Work (what you'll see), Poster (her poster and the credits). Inside, Source, the make-your-own-copy toy and the fake booths are gone, and so is every made-up readout (augmentation, the pump trace, timecodes, "Specimen 01", the radar). They're in git history (before PR #17) if wanted back.
  - The desktop's right door is the event: date, time, place, a countdown to the doors opening, save the date, open in maps.
  - The halo is ours and drawn in code (`src/rig.ts`): a silver ring, a wire per camera and four cameras as small 3D models that keep their lenses on her. No longer waiting on her halo layers (was #23).
  - The X-ray's inside is our finished drawing (`src/organs.ts`): optics, core, spine and ribs, bellows, the red pump, and the mount under her dress, over a ghost of her outline. No longer waiting on her drawing (was #24, #29).
  - Saving the date works without an RSVP link: Google Calendar, a calendar file (`c3-showcase.ics`), and "send it to a friend".
  - Link previews and search results carry the date and place.

- **2026-11-17 (built): her final poster and title.** Her final painting replaces the grey one (same composition, so the halo, masks and camera paths still fit). Her title is cut out and laid over the wires; the doors carry her C3 mark and her SHOWCASE split SHOW | CASE at the seam. The whole site moved to her palette: night blue, her frame's silver, cream type, her red. Date and place follow her poster: 12.03.26, 5:00–6:30 PM, Grand Atrium, Meadows. Her poster with the details is a download on RSVP and Credits. The X-ray is now her edges glowing on black (inverting a dark painting gave a white film). Not used: the smaller, cooler-blue version of the painting (kept in `reference/final/`), and the poem lines on her poster (they stay hers, in the download).

- **2026-11-11 (built), from six tester personas:** what they agreed on and what fits the case.
  - The date and place say "TBA" while they're still "0.0.0", and Info says they're coming soon (screen readers hear "to be announced").
  - The doors read "Creative | Computing" instead of "Specimen 01 | Augmented".
  - Tuning in swings that channel's camera round to the front and holds it there, so its live feed is never blocked by her head; the halo turns again back at the hub.
  - Plainer words: "Behind her" for obstructed cameras, "Press and hold her picture to see inside"; the made-up "Sync" reading is gone.
  - RSVP: "While you wait, make your own poster", and "Saved. Look in your downloads." after saving.
  - Bigger invisible hit areas on the cameras; phone channels swipe sideways to the next or previous one; captions up a size; a fade shows a phone channel scrolls.
  - Screen readers and the keyboard get one link per channel (the feeds and keys); the cameras are the same links for the pointer only.
  - Her painting is recoloured into the site's palette (OWNER #26).
  - Not done: making her painting larger than the door panels allow; her ring, the pump and a stranger X-ray are questions (#27–29).

- **2026-11-10 (built):** The final direction, "the case", replaces v1 on `main` (v1 stays on `archive/v1`). Built from the "Final direction" mockups with her finished painting:
  - Sealed doors open on her; our halo of six cameras turns above her head and is the navigation (Info, RSVP, Projects, Inside, Source, Credits), with the same six as feeds (desktop) or channel keys (phone). A channel turns the middle panel over to its title card.
  - Monochrome from her painting plus one red for "live", per her notes; the six colorways and the Colors destination are gone. OWNER #12, #15 and #16 are moot.
  - Type: Noto Serif Display (condensed, ExtraBold) for titles, IBM Plex Mono and Sans for the rest.
  - RSVP has a small extra: type your name and get your own copy of the poster, with red marks seeded from your name, saved as an image.
  - v1's open items (#6 effects to switch off, #9 composition, #11 project screen style, #13, #14, #18 performance trace, #19 static on project screens) went with v1.
- **GitHub Pages (OWNER #1):** done; the Deploy workflow has published `main` since 2026-10-22.
- **2026-10-22 (direction, in mockups):** The poster becomes the hub: her halo is the navigation. Later refined, after her notes, into the case.
- **2026-10-20:** Her drafts can be public, and her work can be used freely on the site (Ethan has her go-ahead). Art cut from them can ship.
- **2026-10-20:** Line quality follows her final art, not the rough drafts.
