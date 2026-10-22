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
| 18 | **One local performance trace.** sketch-in now draws while you scroll the C3 pin (your #7 pick), and the cloud's software rendering measured 4–6 ms per drawing step, against SPEC §6's 2 ms. On your own computer (Chrome DevTools → Performance, 4× CPU slowdown), record a first visit: scroll slowly through the C3 letters while the line art draws. If frames drop, the fix is in the sketch-in README (draw the reveal on a canvas). It's in PLAN step 13's checklist. | Launch (PLAN step 13) | Assumed fine; it runs once per session, for 2.3 s |
| 19 | **Static on the project screens vs. "the info layer only wipes in".** CLAUDE.md says the readable info layer animates only its entry wipe, but SPEC §3 row 11 and §9 step 9 have the Projects teaser screens show stepping static (as built: 10 fps, low contrast, flash-tested). The code review flagged the conflict. Keep the static stepping (SPEC), or hold it still like the eye screen (a one-line change in crt-screens)? | Launch (PLAN step 13) | Stepping, as SPEC says |

## Open: ask her (on hold: Ethan will ask when he's ready)

Sessions add to this list but don't wait on it; until she answers, the "Until then" column holds.

| # | Question | Needed by | Until then |
|---|---|---|---|
| 8 | What name or handle goes in her credit line? | Any time | "Poster art: 0.0.0" |
| 9 | **Composition (not settled yet).** Her newest drafts (`figure-lineart-with-halo` / `-no-halo`, 2026-10-20) keep the praying figure, head wings and a ring of 6 screens, but show no cables, no ribcage X-ray panel and no eye screen, and add a small second halo at the chest and a decorated bodice. Ask her: are the cables, ribcage panel and eye screen still coming as separate layers, or are they gone? Is the chest halo part of the design? Will the title and small print be drawn into the frame? | Before `cables`, and before her final art | `cables` on hold; x-ray and eye screen use the older sketch's positions |
| 10 | Final art layers, one file per slot, per the SPEC §5 handoff list. For the halo hub (see Decided), also: **each of the six halo screens as its own layer**, the ring on its own, and a filled head-and-hair shape the screens can pass behind. For character motion later, **separate layers for her head, hair, wings, hands and dress**. | 2026-10-30 | Placeholders cut from her drafts |
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

- **2026-10-22 (direction, in mockups):** The poster becomes the **hub**: her halo turns slowly around her head and is the only navigation. Each of her six screens is a destination (Info, RSVP, Projects, Colors, X-ray, Credits). Hovering or focusing a screen stops the turn and lifts it; clicking zooms into that screen and goes there. A small "back to her halo" button returns to the hub. This replaces the halo-menu dialog and the Three.js ring. Mockups: the "C3 Showcase site mockups" canvas on claude.ai. Not built yet.
- **2026-10-22 (later, needs her layers):** subtle motion for her character too (breathing, hair, wings).

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
- **2026-10-21:** Whole-site check with every effect merged (390 and 1440, design-reviewer and /code-review). Fixed:
  - Her line boils in one place at a time (SPEC §6: at most two things step on one screen). c3-window adds an `edge` token while her inked edge shows; line-boil holds then, and the edge stops boiling once it has faded. While sketch-in draws inside the letters, the edge holds too, so arrival steps the edge and the grain, the drain steps the drawing and the grain.
  - The X-ray lens and touch strokes stay off while the C3 window still frames the poster: the scroll is that moment's only gesture.
  - A slow device's drop to `lite` waits while the menu is open (the ring no longer turns into the grid under your finger), and effects whose `lite` is their `full` (c3-window, panel-wipe, crt-screens) don't restart at all.
  - A tap or a non-scrolling key ends sketch-in even while it waits under the ink (SPEC §3: any input finishes it).
  - Sections reached from the menu or a link land clear of the fixed Menu button (`scroll-padding-top`).
  - The X-ray canvas could keep a faint last frame after a scribble healed, or a scan's last step; it now draws once more after they end.
  - A flaky halo-menu test (the 560 ms entrance could fall between two polls) now records the entrance as it happens.
