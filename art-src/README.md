# Her art, as sources

`npm run art` (scripts/art.mjs) turns these into the files the site ships in `src/art/`.
Replace a file here with hers, run `npm run art`, and nothing else changes. If her
composition moves, adjust the numbers in `src/art/scene.json` (they're in her painting's
own pixels).

| File | What it is | Becomes |
|---|---|---|
| `her.webp` | Her final painting without the event text (2026-11-17, 853 × 1280): title and silver frame painted in. A larger export would look sharper on big screens. | `her.webp`; `front.webp` (her title and the top of her frame, cut out to lie over the wires; band set by `front` in `scene.json`); `her-xray.webp` (her edges glowing on black, the X-ray); `part-<id>.webp` and `under-<id>.webp` (each wing cut out so it can move, and the ground it uncovers; set by `parts` in `scene.json`) |
| `poster.webp` | Her final poster with the event details on it. | `public/c3-showcase-poster.webp`, the "Download her poster" link |
| `grade.json` | An optional recolour of her painting (a gradient map). Off (`strength: 0`): her final palette ships as painted and the site follows it. | (applied to `her.webp`) |
| `occluder.png` | Alpha mask of her head, hair and wings (the top half only). Our halo's back half passes behind it. Cut by hand from her painting; her own mask layer would replace it. | `occluder.webp` |
| `lettering/title.webp` | Her final title on transparent (1200 × 600): the C3 mark and her SHOWCASE wordmark. | `mark.webp` (the doors' C3), `word-l.webp` / `word-r.webp` (SHOW and CASE, one per door) |
| `textures/grain.png`, `static.png` | Paper grain and TV static (ours, not hers). | `.webp` |

The halo (ring, wires and cameras) and the drawing inside her X-ray are ours, drawn in code
(`src/rig.ts`, `src/organs.ts`); where the ring sits on her painting is `halo` in `scene.json`.
