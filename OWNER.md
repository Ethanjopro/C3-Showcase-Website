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

## Open: ask her

| # | Question | Needed by | Until then |
|---|---|---|---|
| 8 | What name or handle goes in her credit line? | Any time | "Poster art: 0.0.0" |
| 9 | **Composition (not settled yet).** Her newest drafts (`figure-lineart-with-halo` / `-no-halo`, 2026-10-20) keep the praying figure, head wings and a ring of 6 screens, but show no cables, no ribcage X-ray panel and no eye screen, and add a small second halo at the chest and a decorated bodice. Ask her: are the cables, ribcage panel and eye screen still coming as separate layers, or are they gone? Is the chest halo part of the design? Will the title and small print be drawn into the frame? | Before `cables`, and before her final art | `cables` on hold; x-ray and eye screen use the older sketch's positions |
| 10 | Final art layers, one file per slot, per the SPEC §5 handoff list | 2026-10-30 | Placeholders cut from her drafts |
| 11 | The project screens are now phone-shaped (most projects are phone apps). Should they look like upright CRTs, as now, or more like old phones or handhelds? | Before `crt-screens` merges | Upright CRTs in her frame style |
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
- **Cross-effect:** hide or disable the X-ray toggle and hint while c3-window masks the chest; `.halo-hit` is tappable inside the letters at arrival; c3-window's inked edge could share a core boil filter.
- **Your call:** the C3 letters crop at the poster's edges, not the viewport's, because `tests/e2e/smoke.spec.ts` "tall screens…" measures the transformed box. If you want the letters to overflow the whole screen, that test changes.

## Decided

- **2026-10-20:** ui-ux-pro-max removed. SPEC.md is the design system, and frontend-design covers what it leaves open.
- **2026-10-20:** Line quality follows her final art, not the rough drafts.
- **2026-10-20:** Project screens are portrait (9:16): three across on phones, six across from tablet width up.
- **2026-10-20:** Her drafts can be public, and her work can be used freely on the site (Ethan has her go-ahead). Placeholders cut from them can ship.
- **2026-10-20:** Steps 1–7 are built and merged (scaffold; line-boil, paper-grain; xray, c3-window, halo-menu).
