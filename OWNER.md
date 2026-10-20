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
| 17 | **Ticking on the poster:** SPEC §6 allows at most two effects ticking on one screen, and the arrival screen already steps line-boil and paper-grain. So crt-screens keeps the eye screen's static still (it keeps its scanlines and two-ink split), and only the project screens' static steps. All three run on the compositor, with no JS per step. Should the eye's static step too? | Launch (PLAN step 13) | Eye still. Stepping it is one constant (`POSTER_STEPS` in `src/effects/crt-screens/index.ts`). |

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

From PR #6 (xray, c3-window, halo-menu):
- **PLAN writer table:** add `#poster` (section) | c3-window | pin; let `html[data-fx-halo-menu~='ring']` restyle `.menu`, `.menu__list` and `.menu__screen`; halo-menu sets `data-halo-front` on the menu links.
- **SPEC §6:** prefetch Three.js on intent (pointer or focus on a menu trigger), not when idle, since idle prefetch contradicts SPEC §9 step 14.
- **`roughFrame`:** the X-ray toggle copies the generator from `scripts/vite/c3-html.ts`. Move it into one module that both import.
- **`vite.config.ts`:** raise `build.chunkSizeWarningLimit` to about 600 for the lazy ring chunk (139 KB gzip).
- **Cross-effect:** `.halo-hit` is tappable inside the letters at arrival; c3-window's inked edge could share a core boil filter. (The X-ray toggle now waits while the ink letters cover the chest: done in PR #7.)

From the crt-screens PR (PLAN step 12):
- **`tokens.css`:** add `--fps-crt: 10` next to the other rates. crt-screens reads it with `number('fps-crt', 10)`, so it's 10 either way until then.
- **SPEC §3 row 11 and PLAN step 12:** change "RGB split" to "two-ink split". A red/green/blue split would bring off-palette colors into every colorway, so the eye screen splits in `--accent` and `--on-ink` instead.
- **`vitest.config.ts`:** also collect `src/effects/*/*.test.ts`, so effects can own unit tests. Until then, PLAN step 12's luminance check runs in `crt-screens.spec.ts`, on real rendered frames.
- **`src/core/raster.ts`:** a `blobUrl(canvas)` helper and a `steppedKeyframes(name, frames)` helper. paper-grain, line-boil and crt-screens each wrap `toBlob` themselves, and paper-grain and crt-screens each write step-end keyframes with their own edge rule (24.99 % vs −0.01 %).
- **`scripts/shots.mjs`:** a subset run (`npm run shots -- projects`) captures the skip link, focused, at the top of `projects@390`. A full run doesn't.

From PR #7 (arrival polish):
- **`poster.css`:** give `.print--xray` its own cell in the wide layout (left margin, centre). xray's own CSS moves it there today, because the shared cell is the color bar's and they overlapped on laptop screens.

## Decided

- **2026-10-20:** ui-ux-pro-max removed. SPEC.md is the design system, and frontend-design covers what it leaves open.
- **2026-10-20:** Line quality follows her final art, not the rough drafts.
- **2026-10-20:** Project screens are portrait (9:16): three across on phones, six across from tablet width up.
- **2026-10-20:** Her drafts can be public, and her work can be used freely on the site (Ethan has her go-ahead). Placeholders cut from them can ship.
- **2026-10-20:** Steps 1–7 are built and merged (scaffold; line-boil, paper-grain; xray, c3-window, halo-menu).
- **2026-10-20:** C3 arrival (Ethan, from mockups): her C3 arrives solid in ink, whole and nearly as wide as the poster; the scroll drains the ink to show the poster through the letters, then opens the window. Letters no longer crop at the poster's edges (PR #7).
