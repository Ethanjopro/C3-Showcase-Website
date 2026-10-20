# C3 Showcase site: spec

Written 2026-10-20. Sources: `CLAUDE.md`, `reference/INSPIRATION.md` (including 1b, her moodboard), the three drafts in `reference/drafts/`, and an interview with the site owner. `PLAN.md` turns this spec into build steps.

Order of authority: her drafts first, then this spec, then any skill, library or template default.

---

## 1. What the site does

The site promotes the C3 Showcase, the Creative Computing class showcase. Most visitors arrive by scanning the QR code on the printed poster, so they're on a phone, probably standing, with a few seconds of attention. The site must:

1. Say **what, when and where** on the first screen: "C3 Showcase", Date 0.0.0, Location 0.0.0.
2. Put **RSVP** and **follow** one tap away.
3. Feel like **her poster came alive**: her art, colors and hand-drawn line, now moving and answering touch.
4. **Tease** the student projects. The full project list comes after the event and is out of scope for launch.

| Constraint | Decision |
|---|---|
| Primary device | Phones, reached through the QR code. Design at 390×844 first; 1440×900 must also look finished. No big-screen attract mode. |
| Main goal | Promote the event. If an effect and the readable info layer conflict, the info layer wins. |
| Hosting | GitHub Pages, deployed from `main` by GitHub Actions, at `https://ethanjopro.github.io/C3-Showcase-Website/`. The QR code encodes this URL, so the repo must never be renamed after the poster is printed. The repo is private; see §8. |
| 24-hour preview | Due 2026-10-21. PLAN step 1 goes live on Pages: the static poster with placeholder art cut from her drafts, all copy, and both viewports. If they merge in time, line-boil and paper-grain are included too. |
| Launch | 2026-11-03: tiers A and B from §3. |
| Art | Her drafts are early. Placeholders are cut from them, and her final layers replace them through `src/art/manifest.json` with no code changes. |

### How it's built (decisions)

- **Static first.** All copy and the complete static poster are baked into `index.html` at build time. The page reads correctly before JavaScript runs, and that static poster doubles as the reduced-motion state.
- **Progressive enhancement.** Effects load after first paint, each lazily, and each can be turned off. If an effect throws, the page carries on without it.
- **Canvas 2D and SVG for the poster layer; WebGL only for the halo menu.** Three.js loads only when the menu first opens. Phones get a light first load, and no page holds more than one WebGL context.
- **Native scroll.** No smooth-scroll library. GSAP ScrollTrigger drives scroll-linked motion.
- **Art is drawn in black and tinted from tokens at runtime**, so a single drawing works in all six colorways.

---

## 2. Page structure

One page with four sections, top to bottom.

| # | Section | Contents | Phone (390) | Desktop (1440) |
|---|---|---|---|---|
| 01 | Poster `#poster` | Her poster: paper, wings, coral fill, line art, eye screen, halo of screens, cables, and the hand-lettered title. Small print: "Date 0.0.0", "Location 0.0.0", "Creative Computing". Also the color bar (palette) and the X-ray hint. | The poster fills the width, with the small print around it, all within the first 844 px. | The poster is full viewport height and centered. Vertical small print runs down one edge, with registration marks in the margins. |
| 02 | Info `#info` | When, where, RSVP button, follow link, and a two-line "about". | One column in the poster's small-print style: index number, thin rule, one big word, small caption. | Two or three editorial columns built from the same parts. |
| 03 | Projects `#projects` | Teaser: portrait, phone-shaped CRT screens showing static (most projects are phone apps), plus the line "revealed at the show". | Three across. | One row of six. |
| 04 | Credits `#credits` | Poster art credit (hers), site credit, the color bar again, follow link, back to top. | Stacked. | One line of small print. |

These persist across the page:
- A skip link.
- A fixed top-right **Menu** button, which opens the halo menu.
- An **RSVP** chip that appears once the poster has scrolled away, and only when an RSVP URL exists.
- Both buttons are at least 44×44 px and carry text labels.

---

## 3. Effects, in priority order

Every effect follows these rules:
- It lives in `src/effects/<name>/` and exports `init(root, opts)` and `destroy()` (see CLAUDE.md).
- It sits behind a flag in `src/config/features.json`.
  - Any visit can override flags with `?off=xray,palette` or `?only=line-boil`.
  - This is how the owner and the artist decide what stays: compare each effect on a phone with and without it.
- If it's interactive, it has both a touch path and a keyboard path.
- Under `prefers-reduced-motion` it does what the last column of the table says.

The tiers:
- **Tier A** ships no matter what. These effects are cheap, and they're what makes the poster feel alive.
- **Tier B** is the four signature interactions the owner asked for. Cables are counted here as part of the halo.
- **Tier C** is extra.

| # | Effect | Tier | What the visitor sees | Touch | Desktop / keyboard | Reduced motion |
|---|---|---|---|---|---|---|
| 1 | `line-boil` | A | Every hand-drawn layer jitters like pencil animation, stepping at 10 fps. | (none) | (none) | Clean, still lines |
| 2 | `paper-grain` | A | Her scratchy grey paper with a riso grain that shifts at 8 fps. | (none) | (none) | Still grain |
| 3 | `xray` | B | Through a hole in the drawing: her ribcage and heart in halftone ink. | Scribble sideways across the chest to paint the reveal, which heals over about 4 s. Vertical swipes still scroll. | A round lens follows the cursor. An "X-ray" toggle button covers keyboard users. | Toggle only, instant |
| 4 | `c3-window` | B | On arrival, a giant cropped "C3" in her lettering, with the poster visible only through the letters. Scrolling opens the window onto the full poster. | Native scroll drives it, with at most one screen of pinned scroll. | Same as touch | Starts open, no pin |
| 5 | `sketch-in` | A | On the first visit of a session, her line art draws itself in at 12 fps and the coral fill floods in. Lasts at most 2.4 s; any input finishes it at once. | Tap or scroll skips | Key or scroll skips | Not played |
| 6 | `halo-menu` | B | Menu opens a ring of boxy CRT screens strung on a cable (Three.js). Each screen is a section; the Projects screen shows static. | Swipe to turn the ring, tap the front screen to go. Tapping the halo in the poster also opens the menu. | Drag or arrow keys turn it, Enter goes, Esc closes. | A plain grid of screens with the same links |
| 7 | `palette` | B | A printer's color bar of her six colorways. Picking one slides a flat block of the new ink across the page, and everything, art included, comes out recolored. The choice persists. | Tap a swatch | Radio group, arrow keys | Instant swap |
| 8 | `misregister` | A | The ink and coral layers slip 1–2 px apart on a fast scroll or flick, then snap back, like a two-color print. | Scroll velocity | Scroll and pointer velocity | Off |
| 9 | `panel-wipe` | A | Each section enters once from behind a flat ink or coral block that slides off. | (none) | (none) | Off; content is simply there |
| 10 | `cables` | B | The cables hanging from the halo swing with scroll, part when a finger or cursor passes through, then settle. | Drag through them | Move the cursor through them | Her static cable drawing |
| 11 | `crt-screens` | C | The eye screen and the portrait project screens get scanlines, a slight RGB split and stepped static. | (none) | (none) | One still frame |

**Cut order if the schedule slips:**
1. `crt-screens` is cut.
2. `cables` is cut, and her static cable drawing stays.
3. The 3D ring in `halo-menu` is cut; the grid of screens stays and still works as the menu.

Tier A and the other three signatures are never cut.

**Can all four signatures coexist?** (The owner asked whether using all four is a bad idea.) It isn't, provided three rules hold:
1. **They are her motifs, not borrowed tricks.** The C3 window is her lettering, the X-ray is her ribcage panel, the halo menu is her ring of screens, and the palette is her six colorways. Together they read as one poster, not a showreel.
2. **One signature per moment, one gesture each.**
   - Arrival uses vertical scroll.
   - The poster uses a sideways scribble.
   - The menu lives inside a dialog, so its swipe never fights the page scroll.
   - The palette is a tap.
   - No two signatures compete for the same screen and gesture, and the info layer only ever animates its entry wipe.
3. **Flags make every choice reversible.** Once all four exist, compare with `?off=` on a real phone and drop whatever feels like too much.

The real risk is time. `halo-menu` and `cables` are the largest builds, which is why the fallback above exists.

---

## 4. Look

The look comes from her drafts and moodboard. The moodboard is a source of ideas only: never trace, crop or ship a pin.

**Color.** Each colorway is two inks plus paper, and the accent is always flat blocks, never gradients. Teal/coral is the default. Teal/coral uses the INSPIRATION.md values; the others were sampled from `colorways-six-teal-coral-circled.webp`. All are approximate until her files exist.

| Colorway (`data-colorway`) | Ink | Accent | Ink on paper |
|---|---|---|---|
| `teal-coral` (default) | `#2E5A63` | `#E2604F` | 4.56:1 (barely passes) |
| `black-red` | `#1F1423` | `#C7433A` | 10.6:1 |
| `mauve-periwinkle` | `#764666` | `#8C85A3` | 4.43:1 (**fails**) |
| `indigo-pink` | `#402064` | `#B57198` | 7.81:1 |
| `violet-pink` | `#4A28AC` | `#D07DC3` | 5.74:1 |
| `brown-orange` | `#331110` | `#C38D70` | 10.2:1 |

Every colorway uses paper `#C8C8CA` (alt off-black: `#1E1620`). The poster interior uses a slightly lighter paper, `--paper-2`.

Text color rules:
- Text uses a `--text` token, not `--ink`.
  - `--text` equals the ink wherever the ink passes 4.5:1 on paper. Otherwise it is a darker mix of the ink; mauve needs this.
  - Teal passes with almost no margin, so darken its `--text` to at least 5:1 so it survives the grain.
- Accent is never used for text, and text never sits on an accent block. Every accent pair is below 4.5:1.
- Art layers stay black-only and are tinted from `--ink` or `--accent`.

**Type.**
- Her hand lettering is the only display face, and it is used for "C3 Showcase" only.
- Under it sit two families:
  - a high-contrast or slab serif for the few big words (WHEN, WHERE, RSVP)
  - a small grotesk or mono for the small print
- PLAN step 1.2 picks the pair, following CLAUDE.md's font rules. Fonts are self-hosted from npm (`@fontsource/*`), with at most two families and four files.
- Body text is at least 16 px; captions at least 13 px.

**Marks (UI furniture), from moodboard 1b.6.**
- section index numbers 01–04
- thin rules
- "+" marks and registration crosshairs
- the printer's color bar
- vertical small print down one edge
- sparkles, sparingly

Halftone dots appear only in the X-ray and the screens.

**Line.** Hand-drawn, matching her final art. Her drafts are rougher than the final will be, so nothing adds wobble or roughness to imitate them.
- Lines an effect draws itself (the cables, the menu ring's edges) match the weight and character of her final line.
- Line boil stays subtle: a drawing that's alive, not a shaky one. Re-tune it once her final art is in.
- UI chrome such as buttons and focus rings is clean.

---

## 5. Content and art

**Copy** lives in `src/content/*.json` and is baked into the HTML at build time.

| File | Holds |
|---|---|
| `site.json` | Title, meta description, canonical URL, share image, credits |
| `event.json` | `"date": "0.0.0"`, `"location": "0.0.0"`, the about blurb, `rsvp {label, url}`, `follow {label, url}`. An empty URL renders as plain "opens soon" text, never a dead link. |
| `sections.json` | Section names and index numbers, which the menu reuses |
| `projects.json` | `"mode": "teaser"`, how many screens to show, and an empty `items` list ready for the archive |
| `colorways.json` | The six colorway names as visitors read them |
| `<effect>.json` | One effect's own copy (hints, labels), owned by that effect |

Unknown short fields use her own placeholder, "0.0.0".

**Art** loads only through `src/art/manifest.json`, using the slots in CLAUDE.md. Each slot records:
- its source and built file
- its size
- its tint token
- any geometry effects need, in poster-relative 0–1 coordinates

To replace art, replace the files and edit the JSON. No code changes.

| Slot | Placeholder, cut from her drafts | Used by | Geometry in the manifest |
|---|---|---|---|
| `paper` | Background texture of the drafts | paper-grain | (none) |
| `lineart` | Black lines of `sketch-halo-ribcage`, vectorized | sketch-in, line-boil | (none) |
| `fill` | Coral shapes of the teal/coral colorway | sketch-in, misregister | (none) |
| `halo` | Red ring and screens of `sketch-halo-ribcage` | halo-menu, line-boil | `screens: [rect…]` |
| `cables` | Red drips of `sketch-halo-ribcage` | cables | `anchors: [{x, y, length}…]` |
| `ribcage` | Ribcage panel and heart | xray | `rect` |
| `eyescreen` | The screen over one eye | crt-screens | `rect` |
| `wings` | Wing lines | line-boil (mechanical wings later) | (none) |
| `title` | "C3 Showcase" lettering from thumbnail concept 1 (the cleanest), vectorized | c3-window | `regions.c3: rect` |

**Handoff spec for her final files.** Send her this:
- One file per slot, all on the same canvas size and framing as the poster: the same aspect ratio, at least 2400 px tall.
- Transparent background, drawn in **black only**. The site applies the colors, which is how one drawing serves all six colorways.
  - Two-tone layers (ribcage, eye screen) are black plus transparent, and the paper shows through.
- Line art and title as high-resolution PNG (`npm run art` vectorizes them), or as SVG if she has it.
- We measure the positions of the halo screens, the cable tops, the ribcage panel and the eye screen from her files and record them in the manifest.

---

## 6. Quality bars

**Performance (phone first)**
- First paint needs no JavaScript.
- Initial JS is at most 100 KB gzip (GSAP, ScrollTrigger and our code).
- Three.js loads only for the menu, is prefetched when the browser is idle, and stays at most 170 KB gzip.
- First-screen art is at most 300 KB. The whole first load, excluding Three.js, is at most 700 KB.
- Lighthouse mobile: LCP ≤ 2.5 s, CLS ≤ 0.01, TBT ≤ 200 ms. Judge these locally; the cloud VM renders in software.
- Scrolling holds 60 fps.
  - At most two effects tick on any one screen.
  - A stepped effect costs at most 2 ms per step.
  - devicePixelRatio is capped at 2, and at 1.5 for WebGL on phones.
- `src/core/motion.ts` sets a quality level, and every effect respects it:
  - `full`: everything on.
  - `lite`: Save-Data, 2 GB of device memory or less, or a device that keeps dropping frames against its own refresh cadence (a 30 Hz cap is not slow). Effects drop their extras.
  - `static`: reduced motion. Effects show their end state.
- Nothing ticks while the tab is hidden or the effect is offscreen.

**Accessibility (WCAG 2.2 AA)**
- Text contrast is at least 4.5:1 in all six colorways, enforced by a unit test.
- There is one `h1`, "C3 Showcase": the text is visually hidden and her lettering shows instead. Each section has an `h2`.
- The poster is a single `role="img"` with a written description, and its layers are hidden from assistive tech.
- Every interactive effect has a touch path and a keyboard path (§3).
- Focus is always visible.
- The menu is a real `<dialog>` holding a real `<nav>` list. Esc closes it and focus returns to the Menu button.
- Scroll is native, never hijacked. Pinned scroll lasts at most one screen and never happens under reduced motion.
- Nothing flashes more than three times a second; CRT static and flicker stay small and low in contrast.
- Touch targets are at least 44×44 px, and pinch-zoom is never disabled.

**Browsers**
- Supported: iOS Safari 16.4+, plus the last two versions of Chrome for Android and of desktop Chrome, Safari and Firefox.
- Without WebGL, the menu becomes the grid.
- Without JavaScript, the page is the static poster with readable copy.

---

## 7. Out of scope (for the 2026-11-03 launch)

- The project archive (gallery and case pages). It comes after the event; `projects.json` is ready for it.
- Mechanical wings assembling from plates (moodboard 11). This waits for her final wing art.
- The letterform-window variant that uses "Showcase". Only "C3" is a window.
- A loader screen, sound, smooth-scroll hijacking.
- The infinite-sketchbook layout and the hidden mini-game easter egg.
- A big-screen or attract mode for the event.
- An add-to-calendar file and map directions (not chosen).
- A CMS, backend or forms (RSVP is an external link), analytics, multiple languages.
- A custom domain. It can be added later, but only before the QR code is printed.
- Any use of `reference/moodboard/` images, and anything copied from the reference sites.
- The INSPIRATION.md §5 research pass. It's optional and local, and §3 of this spec replaces its "MVP pick".

---

## 8. Open inputs

The live status of these, and every other question for the owner, is in `OWNER.md`.

| Input | Needed by | Until then |
|---|---|---|
| **Pages on a private repo.** This requires GitHub Pro, which is free with the GitHub Student Developer Pack. Don't make the repo public instead: `reference/moodboard/` holds other artists' work, and some pins carry explicit no-copying notices. | PLAN step 1 deploy (24-hour preview) | The preview is shared as `.shots/` screenshots |
| ~~Her OK to show her early drafts, as placeholders, on a public URL~~ Given 2026-10-20 | (done) | (done) |
| Date and location | Launch | "0.0.0" |
| RSVP URL | Launch | The text "RSVP opens soon"; no RSVP chip |
| Follow link: platform and URL | Launch | Hidden |
| Her credit line: the name or handle she wants | Step 1 | "Poster art: 0.0.0" |
| About blurb (1–2 lines) | Step 1 | One neutral placeholder sentence |
| Final art layers, per the §5 handoff spec | 2026-10-30, for the launch swap | Placeholders ship |
| Confirmation of the colorway hex values | Any time | The sampled values in §4 |

---

## 9. End-to-end acceptance check

When to run it:
- Run on the deployed Pages URL on a real phone (scan the QR), then in the cloud with `npm run test:e2e` and `npm run shots`.
- Steps marked **[auto]** are covered by the Playwright suite; the rest are checked by eye.
- Every step must pass before launch.

1. **Arrive.** Scanning the QR code loads the page.
   - The first screen, with no scrolling, shows her C3 lettering, "Date 0.0.0" and "Location 0.0.0".
   - Nothing jumps while fonts and art load.
   - [auto: that text is inside the 390×844 viewport; CLS ≤ 0.01]
2. **It's alive.** The line art draws in, then boils at a visible, stepped ~10 fps, and the grain moves.
   - [auto: with a frozen clock, shots taken 100 ms apart differ in the line-art box; shots within one step are identical]
3. **Open the window.** Scrolling opens the C3 letters onto the full poster within one screen of scrolling. Scrolling back reverses it.
   - [auto: shots at 0, 50 and 100 % progress]
4. **X-ray.**
   - On a phone, scribbling sideways across her chest reveals the ribcage and heart, which then heal.
   - Swiping up on the poster scrolls the page; the gesture is never trapped.
   - On desktop, the lens follows the cursor.
   - With the keyboard, the X-ray toggle reveals it.
   - [auto: touch strokes paint pixels; a vertical swipe changes `scrollY`; the toggle's `aria-pressed` changes]
5. **Cables.** A flick-scroll swings the cables; they settle and stop ticking.
   - [auto: asleep within 3 s]
6. **Menu.**
   - Tapping Menu or the halo shows the ring of screens.
   - Swiping turns the ring. Tapping Info closes the menu and lands on Info.
   - Keyboard path: Tab to Menu, Enter, arrow keys, Enter. Esc closes the menu, and focus returns to the Menu button.
   - [auto]
7. **Info.** When, where, RSVP and follow are readable. RSVP and follow open their URLs, or read "opens soon" while the URLs are empty.
   - [auto: axe reports no serious or critical violations]
8. **Palette.**
   - Tap each of the six swatches. An ink block wipes across, and the poster, art and UI all come out in that colorway.
   - Text contrast holds, and a reload keeps the choice.
   - [auto: contrast test for all six; persistence]
9. **Projects.** The teaser screens show static and the "revealed at the show" line.
10. **Reduced motion.**
    - With Reduce Motion turned on, the page shows the finished poster with the window open, and all copy is readable.
    - Nothing moves on its own.
    - The menu is the grid, and the palette swaps instantly.
    - [auto: reduced motion emulated; two shots 500 ms apart are identical]
11. **No JavaScript.** The poster and all copy are still readable.
    - [auto]
12. **Flags.** With `?off=<effect>` for each effect, and with `?only=`, the page still works and logs no console errors.
    - [auto]
13. **Art swap.** Replace the placeholder file for one slot (for example `ribcage`) with another image of the same framing, edit only its manifest entry, and rebuild. The site uses the new file with no code change.
14. **Budgets.**
    - The `npm run build` output shows initial JS ≤ 100 KB gzip and a Three.js chunk ≤ 170 KB gzip.
    - The Three.js chunk isn't requested before the menu opens. [auto: network log]
    - Lighthouse mobile, run locally: LCP ≤ 2.5 s, accessibility ≥ 95.
15. **Review.**
    - The design-reviewer pass over the whole site has no open Must-fix findings.
    - `/code-review` findings are fixed.
    - Neither viewport logs a console error. [auto]
