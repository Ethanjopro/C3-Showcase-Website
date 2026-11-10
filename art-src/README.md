# Her art, as sources

`npm run art` (scripts/art.mjs) turns these into the files the site ships in `src/art/`.
Replace a file here with hers, run `npm run art`, and nothing else changes. If her
composition moves, adjust the numbers in `src/art/scene.json` (they're in her painting's
own pixels).

| File | What it is | Becomes |
|---|---|---|
| `her.webp` | Her finished painting, as she sent it (853 × 1280). A larger export would look sharper on big screens. | `her.webp`, and `her-xray.webp` (her painting with light and dark swapped, the X-ray) |
| `occluder.png` | Alpha mask of her head, hair and wings (the top half only). Our halo's back half passes behind it. Cut by hand from her painting; her own mask layer would replace it. | `occluder.webp` |
| `cameras/camera-NN-line.png` | The six camera bodies' line art, cut from her draft's halo. NN is the channel: 01 Info, 02 RSVP, 03 Projects, 04 Inside, 05 Source, 06 Credits. | `camera-NN.webp`: her plum line over a pale body |
| `cameras/camera-NN-fill.png` | The solid shape of each camera body (closed and filled from the line art). | (the body under the line) |
| `lettering/title.svg`, `c3.svg` | Her "C3 Showcase" lettering, traced from her draft; `c3.svg` is the same file cropped to the C3. | copied |
| `textures/grain.png`, `static.png` | Paper grain and TV static (ours, not hers). | `.webp` |

When she draws her own halo, the ring is still drawn in code (`src/markup.ts`, `ellipse()`); give
her ring the same ellipse in `scene.json` (`halo.cx/cy/rx/ry`) or swap the SVG ring for her layers.
