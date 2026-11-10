# Owner checklist

Everything waiting on Ethan or the artist, in one place.

- Sessions add new questions under **Open**, as part of their merge step.
- When something is answered, move it to **Decided** with the answer, and update BRIEF.md if it changes the site.

---

## Open: for Ethan

| # | Question or action | Needed by | Until then |
|---|---|---|---|
| 2 | **About blurb:** one or two lines about the showcase (`src/content/site.json`, `about`) | Any time | "The Creative Computing class puts its work on show: games, apps, music and machines, one booth each." |
| 3 | **Date and location** (`date`, `location`; also `calendarUrl` and `mapUrl` if you want those links) | Launch | "0.0.0", no calendar or map links |
| 4 | **RSVP link** (`rsvpUrl`) | Launch | "RSVP · Opens soon", not a link |
| 5 | **Follow link:** which platform, and the URL | Launch | Not shown |
| 20 | **"Read the code on GitHub"** on the Source channel: the repo is private, so the link is hidden (`sourceUrl` is empty). Make the repo public and fill `sourceUrl`, or leave it hidden. | Any time | Hidden |
| 21 | **Cables:** in the mockups the cameras' cables hung down across her; the build hangs each camera from a wire going up out of frame (a stage rig), so nothing crosses her face. OK, or back to hanging down? | Any time | Wires go up |
| 22 | **Projects:** the channel shows eight numbered booth screens ("Booth 01" …) and a teaser line. Real titles and links when the class has them (`projects` in `site.json`). | After the show | Teaser |

## Open: ask her (on hold: Ethan will ask when he's ready)

Sessions add to this list but don't wait on it; until she answers, the "Until then" column holds.

| # | Question | Needed by | Until then |
|---|---|---|---|
| 8 | What name or handle goes in her credit line, and does the piece have a title? (`artist`, `piece` in `site.json`) | Any time | "0.0.0", "Poster art" |
| 23 | **Her halo.** Ours (a ring of six cameras cut from her draft) stands in until she draws hers. Best as layers: the ring's back and front halves, and each camera on its own. | When she finishes it | Ours |
| 24 | **The inside.** The X-ray is her painting inverted, with placeholder machine parts drawn over it (optics, core chip, bellows, rib plates, a red pump, spine bus, cell). Her own drawing of what's inside would replace the parts. | Any time | Placeholder parts |
| 25 | **A larger export** of her painting (it's 853 × 1280, a little soft on big screens and phones with sharp displays), and if she can, a mask of her head, hair and wings (the halo passes behind them; ours is cut by hand). | Any time | 853 × 1280, hand-cut mask |
| 10 | For character motion later: separate layers for her head, hair, wings, hands and dress. | Later | No character motion |

## Decided

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
