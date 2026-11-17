# Her art, as sources

`npm run art` (scripts/art.mjs) turns these into the files the site ships in `src/art/`.
Replace a file here with hers, run `npm run art`, and nothing else changes. If her
composition moves, adjust the numbers in `src/art/scene.json` (they're in her painting's
own pixels).

| File | What it is | Becomes |
|---|---|---|
| `her.webp` | Her final painting without the event text (2026-11-17, 853 × 1280): title and silver frame painted in. A larger export would look sharper on big screens. | `her.webp`; `front.webp` (her title and the top of her frame, cut out to lie over the wires; band set by `front` in `scene.json`); `her-xray.webp` (her edges glowing on black, the X-ray) |
| `poster.webp` | Her final poster with the event details on it. | `public/c3-showcase-poster.webp`, the "Download her poster" link |
| `grade.json` | An optional recolour of her painting (a gradient map). Off (`strength: 0`): her final palette ships as painted and the site follows it. | (applied to `her.webp`) |
| `occluder.png` | Alpha mask of her head, hair and wings (the top half only). Our halo's back half passes behind it. Cut by hand from her painting; her own mask layer would replace it. | `occluder.webp` |
| `cameras/camera-NN-line.png` | The six camera bodies' line art, cut from her draft's halo. NN is the channel: 01 Info, 02 RSVP, 03 Projects, 04 Inside, 05 Source, 06 Credits. | `camera-NN.webp`: a navy line over a body in her frame's silver |
| `cameras/camera-NN-fill.png` | The solid shape of each camera body (closed and filled from the line art). | (the body under the line) |
| `lettering/title.webp` | Her final title on transparent (1200 × 600): the C3 mark and her SHOWCASE wordmark. | `mark.webp` (the doors' C3), `word-l.webp` / `word-r.webp` (SHOW and CASE, one per door) |
| `textures/grain.png`, `static.png` | Paper grain and TV static (ours, not hers). | `.webp` |

When she draws her own halo, the ring is still drawn in code (`src/markup.ts`, `ellipse()`); give
her ring the same ellipse in `scene.json` (`halo.cx/cy/rx/ry`) or swap the SVG ring for her layers.
