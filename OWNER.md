# Owner checklist

Everything waiting on Ethan or the artist, in one place.

- Sessions add new questions under **Open** and shared changes they couldn't make under **Shared changes queue**, as part of their merge step.
- When something is answered, move it to **Decided** with the answer, and update SPEC.md if it changes the site.

---

## Open: for Ethan

| # | Question or action | Needed by | Until then |
|---|---|---|---|
| 1 | **GitHub Pages:** get GitHub Pro (free with the Student Developer Pack), then set **Settings → Pages → Source** to **GitHub Actions**. Skip this if the site is already live. | Now, for the live preview | Screenshots only |
| 2 | **About blurb:** one or two lines about the showcase | Any time | A neutral placeholder sentence |
| 3 | **Date and location** | Launch | "0.0.0" |
| 4 | **RSVP link** | Launch | "RSVP opens soon", and no RSVP chip |
| 5 | **Follow link:** which platform, and the URL | Launch | Hidden |
| 6 | **Effects to switch off:** try `?off=<effect>` on your phone and pick anything that feels like too much | Launch (PLAN step 13) | Everything on |

## Open: ask her (on hold: Ethan will ask when he's ready)

Sessions add to this list but don't wait on it; until she answers, the "Until then" column holds.

| # | Question | Needed by | Until then |
|---|---|---|---|
| 8 | What name or handle goes in her credit line? | Any time | "Poster art: 0.0.0" |
| 9 | **Composition (not settled yet).** Her newest drafts (`figure-lineart-with-halo` / `-no-halo`, 2026-10-20) keep the praying figure, head wings and a ring of 6 screens, but show no cables, no ribcage X-ray panel and no eye screen, and add a small second halo at the chest and a decorated bodice. Ask her: are the cables, ribcage panel and eye screen still coming as separate layers, or are they gone? Is the chest halo part of the design? Will the title and small print be drawn into the frame? | Before `cables`, and before her final art | `cables` on hold; x-ray and eye screen use the older sketch's positions |
| 10 | Final art layers, one file per slot, per the SPEC §5 handoff list | 2026-10-30 | Placeholders cut from her drafts |
| 11 | The project screens are now phone-shaped (most projects are phone apps). Should they look like upright CRTs, as now, or more like old phones or handhelds? | Before launch | Upright CRTs in her frame style. crt-screens merged with this default; a phone look only needs `panels.css` and the frame, not the effect. |
| 12 | The halo and cables are ink on the site, but red in her sketch (coral would vanish on the coral fill). Which does she want? It's one manifest field. | Any time | Ink |
| 13 | The poster uses her newest concept (halo and ribcage). The circled poster's figure, with headphones, the device and the ≡ hatching, isn't on it. Is that right? | Before her final art | Newest concept |
| 14 | The small print (date, location) is typeset outside the frame for legibility; her thumbnail hand-letters it inside. OK? | Any time | Typeset, outside |
| 15 | **Fonts:** Grenze (big words) + Familjen Grotesk (small print). Runners-up: Bodoni Moda + Archivo Narrow, and IM Fell Double Pica + Darker Grotesque. Does she like the pick? | Any time | Grenze + Familjen Grotesk |
| 16 | Are the sampled colorway colors (SPEC §4) right? | Any time | The sampled values |

## Shared changes queue

Changes effect sessions proposed but couldn't make, because they touch shared files. Land them in one sequential **Plan** session after the open batches merge (prompt in `setup/PROMPTS.md`).

Optional, once her composition settles (OWNER #9):
- **Re-cut placeholders from her newest drafts.** Point `scripts/art/placeholders.mjs` at `figure-lineart-with-halo.webp` for `lineart` and `wings`, and take `halo` as the difference between the with-halo and no-halo versions. Re-measure the halo `screens` rects. Her cleaner line makes the preview look much closer to final.

## Decided

- **2026-10-20:** ui-ux-pro-max removed. SPEC.md is the design system, and frontend-design covers what it leaves open.
- **2026-10-20:** Line quality follows her final art, not the rough drafts.
- **2026-10-20:** Project screens are portrait (9:16): three across on phones, six across from tablet width up.
- **2026-10-20:** Her drafts can be public, and her work can be used freely on the site (Ethan has her go-ahead). Placeholders cut from them can ship.
- **2026-10-20:** Steps 1–7 are built and merged (scaffold; line-boil, paper-grain; xray, c3-window, halo-menu).
- **2026-10-20:** Steps 6, 8, 9 and 10 are built (sketch-in, palette, misregister, panel-wipe; PR #8).
- **2026-10-20:** C3 arrival (Ethan, from mockups): her C3 arrives solid in ink, whole and nearly as wide as the poster; the scroll drains the ink to show the poster through the letters, then opens the window. Letters no longer crop at the poster's edges (PR #7).
- **2026-10-21:** OWNER #7 (Ethan): option (c). sketch-in waits under her solid-ink C3 and draws inside the letters as the scroll drains the ink, reading c3-window's mount `data-state`. Scrolling the pin no longer skips it; a tap or a non-scrolling key does, and so does scrolling on once the window is open. SPEC §3 row 5 and PLAN step 6 updated.
- **2026-10-21:** OWNER #17 (Ethan): the eye screen's static stays still (`POSTER_STEPS` stays `false`); only the project screens' static steps.
- **2026-10-21:** Shared changes queue landed (PRs #6–#9 proposals):
  - PLAN writer table: `#poster` pin (c3-window), halo-menu's `.menu*` restyle and `data-halo-front`, and the read-only cross-effect read of a mount's `data-state`.
  - SPEC §6 and PLAN step 7: Three.js is prefetched on intent, not at idle.
  - `src/core/rough-frame.ts`: one `roughFrame()` for the build and the X-ray toggle (the toggle keeps its single bold pass). `scripts/vite/c3-html.ts` also takes `rng` from `core/raster`.
  - `vite.config.ts`: `chunkSizeWarningLimit: 600` for the lazy ring chunk.
  - `.halo-hit` takes no taps while the ink letters cover the poster (`poster.css`). A shared boil filter for c3-window's inked edge: not done, because there's no filter to share (line-boil uses pre-rendered frames, c3-window a 3-step CSS transform), and both already step at 10 fps.
  - `core/palette`: `duration(token, fallback)` (reads `ms` and `s`); `request()` changes colorway at most once per 350 ms on every path, reduced motion included, latest pick wins, and a pick that waited skips the wipe. The palette effect and panel-wipe dropped their local copies.
  - `src/ui/colorbar.ts`: a held arrow key no longer snaps the radio back to an intermediate colorway.
  - `core/raster`: `blobUrl(canvas)` and `steppedKeyframes(name, frames)`, used by paper-grain, line-boil and crt-screens.
  - `tokens.css`: `--fps-crt: 10`.
  - SPEC §3 row 11 and PLAN step 12: "two-ink split".
  - `vitest.config.ts` also collects `src/effects/*/*.test.ts`.
  - `scripts/shots.mjs`: section shots mark sketch-in done, wait for panel-wipe to settle, and hide the skip link with the chrome.
  - `base.css` prehide: the ribcage panel, eye screen (and its CRT glass), cables and halo now wait for sketch-in too, and arrive with the fill's flood. The wings stay out of the prehide, so LCP doesn't move.
  - `poster.css`: `.print--xray` has its own cell in the wide layout (left margin, centre); xray's CSS no longer moves it.
  - sketch-in's GPU trace moved to PLAN step 13's checklist (it now overlaps the C3 pin).
