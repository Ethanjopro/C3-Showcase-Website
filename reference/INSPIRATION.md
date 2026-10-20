# C3 Showcase — Inspiration & Reference

Read this before planning. The **look** comes from the poster drafts in `reference/drafts/`. The sites below are where we borrow **technique, motion and polish**, not visuals. Never copy a reference site's art, layout or copy.

Status key:
- **verified**: the award was confirmed on the site's Awwwards page or the studio's own case page (Oct 2026).
- **unverified**: the site is featured on Awwwards as an "element", but its award wasn't confirmed.

---

## 1. The look we're matching (from her drafts)

- **Chosen colorway:** the circled draft, which is dark teal ink on coral/salmon, over scratchy warm-grey paper.
  - These hex values are approximate, eyeballed from the drafts. Confirm them once her files exist.
  - Ink `#2E5A63`, coral `#E2604F` (reads as salmon `#D9776C` at partial opacity), paper `#C8C8CA`, alt off-black `#1E1620`.
- **Six colorways explored:** black/red, mauve/periwinkle, teal/coral, indigo/pink, violet/pink, and brown/orange.
  - Store the palette as CSS custom properties so all six stay switchable (see the palette switcher below).
- **Motifs:**
  - a girl in headphones holding a handheld device
  - wings
  - a halo of boxy screens strung on a cable ring, with cables dripping down
  - an X-ray ribcage panel marked with crosses
  - a screen covering one eye
  - an anatomical heart
  - hand-lettered "C3 Showcase"
  - hatching and scribble lines
  - rough, restless line work
- **Her placeholders:** the poster itself says "Date 0.0.0" and "Location 0.0.0". Use the same placeholders until real details exist.

---

## 2. References

### Benchmarks for "technically impressive"

**Messenger** (abeto)
- **Award:** Site of the Year 2025 + Developer Award; SOTD Nov 10, 2025, scored 7.92. Verified.
- **Links:** https://messenger.abeto.co · https://www.awwwards.com/sites/messenger
- An illustrated tiny-planet world in Three.js where you play a delivery character among NPCs. It's tagged Art & Illustration, Games, Storytelling, WebGL and WebSockets.
- It runs on a two-color palette (`#81BFBC` teal, `#C9D5C3` grey-green), a close cousin of ours. That's proof a restricted palette can carry a Site of the Year.
- The developer jury scored its animations 9.0/10.
- **Borrow:** palette restraint, illustration that survives inside WebGL, and game feel.

**Lusion v3** (Lusion)
- **Award:** Site of the Year 2023 + Developer Award. Verified.
- **Links:** https://lusion.co · https://www.awwwards.com/sites/lusion-v3
- **Borrow:** how real-time physics makes interactions feel tactile. Apply it to the cables and the halo.

**Bruno Simon Portfolio**
- **Award:** Site of the Year 2019 + Developer Award. Verified.
- **Links:** https://bruno-simon.com · https://www.awwwards.com/sites/bruno-simon-portfolio
- The whole portfolio is a game you drive around.
- **Borrow:** game feel as navigation. The halo menu should feel like game UI, which also plays to a game-dev background.

### Illustration on a two-color system

**The Other Side of Truth** (The First The Last)
- **Award:** Site of the Year 2022 + Developer Award; SOTD Jun 2, 2022, scored 7.85. Verified.
- **Links:** https://theothersideoftruth.com · https://www.awwwards.com/sites/the-other-side-of-truth
- A single-page scroll story in two colors (`#2779A7`, `#ECD06F`), built with WebGL, PixiJS, GSAP and Nuxt. Awwwards features its "color change" interaction.
- **Borrow:** hard two-color art direction, and a color-change moment. This becomes our palette switcher through her six colorways.

**Huy Phan Vol.2** (Huy Phan & Chien Pham)
- **Award:** SOTD Oct 14, 2026 + Developer Award, scored 7.67. Verified.
- **Links:** https://huyml.co · https://www.awwwards.com/sites/huy-phan-vol-2
- Red `#FF4949` plus near-black `#181818`. It's tagged Illustration and Filters & Effects, and uses GSAP and Three.js on Framer. Awwwards highlights its loader, project gallery and case-study page.
- **Borrow:** a coral-red-plus-ink scheme pushed with filters, which is very close to ours. Also borrow the loader, and use the project gallery as a model for the student project list.

### Hand-drawn / sketch technique

**Its just a portfolio** (jerald)
- **Award:** Awwwards Nominee, Dec 28, 2024. Not a winner; included for technique.
- **Link:** https://www.awwwards.com/sites/its-just-a-portfolio
- Freehand sketches are the main UI, on an infinite canvas you can scroll in every direction. It's tagged Experimental, Retro and Unusual Navigation.
- **Borrow:** an alternative layout where the showcase is an infinite sketchbook with student projects pinned to it.

**Axel Vanhessche portfolio** (developer: Guillaume Colombel)
- **Award:** unverified.
- **Link:** https://www.awwwards.com/inspiration/draw-to-reveal-axel-vanhessche
- Awwwards features two of its interactions: "Draw to reveal" and "Drag to explore" (shader, WebGL, mask).
- **Borrow:** the visitor scribbles to expose a hidden layer. Use it to reveal the X-ray ribcage or the coral fill. This is also the touch-friendly answer to the cursor lens on phones.

**Doze** (Sparkk)
- **Award:** unverified.
- **Link:** https://www.awwwards.com/inspiration/scribble-doze
- Awwwards features its "Scribble" motion. The intro also glitches the page into abstract graphic pieces.
- **Borrow:** scribble transitions and hatching wipes between sections.

### Retro screens & glitch

**Basement Chronicles** (basement.studio, 2023)
- **Award:** Awwwards SOTD + Developer Award, and FWA SOTD. Verified on the studio's case page.
- **Link:** https://chronicles.basement.studio
- A pixel-art point-and-click adventure about saving the internet from malware, with a glitch language throughout.
- **Borrow:** CRT and glitch vocabulary for the eye screen and the halo screens. Possibly a hidden mini-game easter egg.

### Cursor reveal

**Bonds Mash Up, "Patterned cursor reveal"** (Active Theory)
- **Award:** unverified.
- **Link:** https://www.awwwards.com/inspiration/patterned-cursor-reveal
- A Three.js/WebGL cursor that reveals a hidden pattern layer.
- **Borrow:** the mechanics for the X-ray lens cursor.

---

## 3. Effect → reference map

| Effect | Lean on | Build note |
|---|---|---|
| Paper grain + ink texture | Messenger, Huy Phan | Full-screen GLSL noise behind everything; keep it subtle |
| Line boil (hand-drawn jitter) | Doze, Its just a portfolio | SVG `feTurbulence` + `feDisplacementMap`; swap the seed 8–12×/sec with stepped timing, never smooth |
| Sketch-in intro | Its just a portfolio | Vectorized line art drawn on with `stroke-dashoffset`; coral fill floods in after |
| X-ray lens cursor | Bonds Mash Up | Ribcage layer sits under the figure; a lerped circular mask follows the cursor |
| Draw to reveal | Axel Vanhessche | Pointer paints a canvas mask; this is the phone version of the X-ray |
| Halo of screens = project nav | Bruno Simon, Messenger | Ring of boxes rotates on scroll/drag; each box is a project; click zooms in |
| Dangling cables | Lusion | Verlet rope sim anchored to the halo boxes, reacting to the cursor |
| Eye-screen CRT | Basement Chronicles | Scanlines + RGB-split shader; event info flickers in |
| Palette switcher | The Other Side of Truth | Her six colorways as CSS-variable sets with an animated swap |
| All of the above | — | `prefers-reduced-motion` fallback; static poster on low-power devices; 60fps budget |

---

## 4. Building while the art and event details are unfinished

Nothing in the engine may depend on final art or final event details.

**Art.** Her work is in early stages.
- Put the current drafts in `reference/drafts/`.
- List every art layer as a named slot in `src/art/manifest.json`. The slots are `lineart`, `fill`, `halo`, `cables`, `ribcage`, `eyescreen`, `wings`, `paper`, `title`.
- Fill each slot with a placeholder for now: a crop or rough trace of the drafts.
- When her finished layers arrive, swapping the files is the whole job, with no code changes.
- Line art should eventually be vectorized for the sketch-in effect. Build that as a script step so it can be re-run on her final files.

**Event details.**
- All copy lives in `src/content/event.json`, with `"date": "0.0.0"` and `"location": "0.0.0"` like her poster.
- Use placeholder entries for student projects (title, author, thumbnail, link).

---

## 5. First task for Claude Code: research pass

Run this **locally** in a session with a browser. The cloud VM's network allowlist won't load these sites.

1. Open each reference above. Experience the hero and at least one signature interaction, at desktop width and at phone width.
2. Save one screenshot per site to `reference/inspo/<site>.png`.
3. Fill in section 6 for each site with 3–5 bullets:
   - what to borrow
   - what to avoid
   - how it feels (pacing, sound, cursor)
   - observed performance: load time and smoothness
4. Propose the **MVP**: the 4 effects from section 3 to build first, ranked by impact versus effort. Explain why.
5. Flag any reference that turned out weaker than its description, and suggest a replacement from Awwwards (Illustration, Experimental or Retro categories).

---

## 6. Notes (filled in by the research pass)

- **Messenger:**
- **Lusion v3:**
- **Bruno Simon:**
- **The Other Side of Truth:**
- **Huy Phan Vol.2:**
- **Its just a portfolio:**
- **Axel Vanhessche:**
- **Doze:**
- **Basement Chronicles:**
- **Bonds Mash Up:**
- **MVP pick:**
