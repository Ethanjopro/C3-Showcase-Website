// Cuts placeholder art for every manifest slot out of her drafts.
//
// Reads only reference/drafts/ (never the moodboard) and writes one PNG per slot
// to art-src/placeholder/, all on the same frame-sized canvas so the layers
// stack with no offsets. Black on transparent, except `paper`, which is a
// seamless grey texture tile. Also writes geometry.json (poster-relative 0-1
// rects and cable anchors) to copy into src/art/manifest.json.
//
// Rough results are expected: these stand in until her final layered files
// arrive, and `npm run art` then rebuilds public/art/ from whatever the
// manifest's `source` fields point at.
//
// Run: npm run art:placeholders && npm run art

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DRAFTS = path.join(ROOT, 'reference/drafts');
const OUT = path.join(ROOT, 'art-src/placeholder');

// --- Crop boxes, in source-image pixels ------------------------------------

// sketch-halo-ribcage.webp: the newest concept (halo, cables, ribcage, eye
// screen) drawn over a faded copy of the teal/coral poster. FRAME is that
// faded poster's border, and it becomes the site's poster frame.
const SKETCH = 'sketch-halo-ribcage.webp';
const FRAME = { x: 25, y: 138, w: 810, h: 1032 };
const RIBCAGE = { x: 300, y: 690, w: 310, h: 280 };
const EYESCREEN = { x: 425, y: 478, w: 123, h: 147 };
const WINGS = [
  { x: 600, y: 362, w: 132, h: 86 },  // right wing, beside the top-right screen
  { x: 95, y: 420, w: 122, h: 72 },   // left wing, under the left screens
];
// Everything red inside this polygon is the halo (ring + screens); red outside
// it is cables.
const HALO_POLY = [
  [30, 470], [45, 650], [190, 650], [345, 625], [470, 535], [630, 495],
  [690, 380], [680, 255], [520, 232], [395, 262], [180, 340], [100, 410],
];
const HALO_SCREENS = [
  { x: 55, y: 495, w: 120, h: 135 },
  { x: 160, y: 360, w: 140, h: 92 },
  { x: 222, y: 518, w: 120, h: 100 },
  { x: 405, y: 272, w: 122, h: 102 },
  { x: 548, y: 278, w: 120, h: 90 },
  { x: 462, y: 402, w: 155, h: 82 },
];

// colorways-six-teal-coral-circled.webp: the circled teal/coral poster. Its
// border box has the same aspect as FRAME, so it scales straight onto it.
const COLORWAYS = 'colorways-six-teal-coral-circled.webp';
const TEAL_POSTER = { x: 80, y: 495, w: 290, h: 370 };

// thumbnails-three-concepts.webp: concept 1 has the cleanest "C3 Showcase".
const THUMBS = 'thumbnails-three-concepts.webp';
const TITLE = { x: 84, y: 240, w: 272, h: 64 };
const TITLE_ERASE = [{ x: 182, y: 291, w: 66, h: 13 }]; // her hair, poking up into the lettering
const TITLE_C3_RIGHT = 193;                             // "C3" ends here, "Showcase" starts after
const TITLE_PLACE = { x: 0.06, y: 0.03, w: 0.88 };       // where the title sits on the poster, 0-1
const PAPER = { x: 0, y: 640, w: 290, h: 290 };          // empty draft background, no poster on it

// Output canvas for every frame-sized slot.
const OUT_W = 1200;
const OUT_H = Math.round((OUT_W * FRAME.h) / FRAME.w);

// --- Pixel helpers ------------------------------------------------------------

async function readRaw(file, crop, resize) {
  let img = sharp(path.join(DRAFTS, file)).removeAlpha();
  if (crop) img = img.extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h });
  if (resize) img = img.resize(resize.w, resize.h, { fit: 'fill', kernel: 'lanczos3' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Ink: near-black, low saturation. Soft edge keeps her line's anti-aliasing.
const inkAlpha = (r, g, b) =>
  Math.max(r, g, b) - Math.min(r, g, b) > 70 ? 0 : clamp01((112 - lum(r, g, b)) / 40);
// Red: her halo and cable color.
const redAlpha = (r, g, b) => clamp01((r - (g + b) / 2 - 55) / 50);

const inRect = (x, y, r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Grey-max / grey-min morphology for closing holes in the fill mask.
function morph(alpha, w, h, radius, op) {
  const out = new Float32Array(alpha.length);
  const pick = op === 'dilate' ? Math.max : Math.min;
  const tmp = new Float32Array(alpha.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = alpha[y * w + x];
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        v = pick(v, alpha[y * w + xx]);
      }
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = tmp[y * w + x];
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        v = pick(v, tmp[yy * w + x]);
      }
      out[y * w + x] = v;
    }
  return out;
}

async function blur(alpha, w, h, sigma) {
  const grey = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) grey[i] = Math.round(alpha[i] * 255);
  const data = await sharp(grey, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
  return Float32Array.from(data, (v) => v / 255);
}

// Convex hull (monotone chain) of [x, y] points.
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), q) <= 0) lower.pop();
    lower.push(q);
  }
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

// Splits each edge into ~`step` px pieces and nudges the new points sideways
// by up to `amp` px with a fixed seed, so the block edge reads hand-cut.
function roughen(poly, step, amp) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(len / step));
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let k = 0; k < n; k++) {
      const t = k / n, j = k === 0 ? 0 : rand() * amp;
      out.push([x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j]);
    }
  }
  return out;
}

async function rasterize(poly, w, h) {
  const d = 'M' + poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><path d="${d}" fill="#fff"/></svg>`;
  const data = await sharp(Buffer.from(svg)).extractChannel(0).raw().toBuffer();
  return Float32Array.from(data, (v) => v / 255);
}

// Writes a black-on-transparent PNG from a 0-1 alpha array, upscaled to the
// output frame.
async function writeMask(name, alpha, w, h, outW = OUT_W, outH = OUT_H) {
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = Math.round(alpha[i] * 255);
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .resize(outW, outH, { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, `${name}.png`));
}

const norm = (r) => ({
  x: +((r.x - FRAME.x) / FRAME.w).toFixed(4),
  y: +((r.y - FRAME.y) / FRAME.h).toFixed(4),
  w: +(r.w / FRAME.w).toFixed(4),
  h: +(r.h / FRAME.h).toFixed(4),
});

// --- Slots ------------------------------------------------------------------

async function sketchSlots() {
  const sk = await readRaw(SKETCH, FRAME);
  const { w, h, data } = sk;
  const size = w * h;
  const slots = {
    lineart: new Float32Array(size),
    ribcage: new Float32Array(size),
    eyescreen: new Float32Array(size),
    wings: new Float32Array(size),
    halo: new Float32Array(size),
    cables: new Float32Array(size),
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
      const sx = x + FRAME.x, sy = y + FRAME.y; // sketch coordinates
      const ink = inkAlpha(r, g, b);
      const red = redAlpha(r, g, b);
      if (inRect(sx, sy, RIBCAGE)) {
        slots.ribcage[i] = Math.max(ink, red); // the heart rides along with the ribs
        continue;
      }
      if (inRect(sx, sy, EYESCREEN)) {
        slots.eyescreen[i] = ink;
        continue;
      }
      if (red > 0) {
        if (inPoly(sx, sy, HALO_POLY)) slots.halo[i] = red;
        else slots.cables[i] = red;
      }
      if (ink > 0) {
        if (WINGS.some((r) => inRect(sx, sy, r))) slots.wings[i] = ink;
        else slots.lineart[i] = ink;
      }
    }
  return { ...slots, w, h };
}

// The poster's own rough border, taken from the teal/coral colorway, joins the
// line art so the poster keeps her frame.
async function frameAndFill(w, h) {
  const tp = await readRaw(COLORWAYS, TEAL_POSTER, { w, h });
  const frame = new Float32Array(w * h);
  let fill = new Float32Array(w * h);
  const band = Math.round(w * 0.04);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const r = tp.data[i * 3], g = tp.data[i * 3 + 1], b = tp.data[i * 3 + 2];
      const edge = x < band || y < band || x >= w - band || y >= h - band;
      // Teal ink: darker than the paper and bluer than it is red.
      if (edge && lum(r, g, b) < 120 && b > r) frame[i] = clamp01((120 - lum(r, g, b)) / 30);
      // Coral: well redder than green. Her red circling scribble on this sheet is
      // redder still but darker in green, so `g` keeps it out.
      fill[i] = g > 86 ? clamp01((r - g - 35) / 25) : 0;
    }
  fill = morph(morph(fill, w, h, 3, 'erode'), w, h, 3, 'dilate'); // drop thin strokes
  // Her fill is one flat block behind the figure, mostly hidden under her
  // lines here, so trace it as the hull of where coral is dense, then rough up
  // its edges a little.
  const density = await blur(fill, w, h, 8);
  const pts = [];
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2) if (density[y * w + x] > 0.3) pts.push([x, y]);
  fill = await rasterize(roughen(hull(pts), 18, 5), w, h);
  return { frame, fill };
}

async function titleSlot() {
  const t = await readRaw(THUMBS, TITLE);
  const alpha = new Float32Array(t.w * t.h);
  for (let y = 0; y < t.h; y++)
    for (let x = 0; x < t.w; x++) {
      const sx = x + TITLE.x, sy = y + TITLE.y;
      if (TITLE_ERASE.some((r) => inRect(sx, sy, r))) continue;
      const i = y * t.w + x;
      alpha[i] = inkAlpha(t.data[i * 3], t.data[i * 3 + 1], t.data[i * 3 + 2]);
    }
  // Place the lettering on a full frame-sized canvas.
  const tw = Math.round(OUT_W * TITLE_PLACE.w);
  const th = Math.round((tw * t.h) / t.w);
  const rgba = Buffer.alloc(t.w * t.h * 4);
  for (let i = 0; i < t.w * t.h; i++) rgba[i * 4 + 3] = Math.round(alpha[i] * 255);
  const lettering = await sharp(rgba, { raw: { width: t.w, height: t.h, channels: 4 } })
    .resize(tw, th, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  await sharp({ create: { width: OUT_W, height: OUT_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: lettering, left: Math.round(OUT_W * TITLE_PLACE.x), top: Math.round(OUT_H * TITLE_PLACE.y) }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, 'title.png'));
  const c3w = ((TITLE_C3_RIGHT - TITLE.x) / TITLE.w) * TITLE_PLACE.w;
  return {
    rect: { x: TITLE_PLACE.x, y: TITLE_PLACE.y, w: TITLE_PLACE.w, h: +(th / OUT_H).toFixed(4) },
    c3: { x: TITLE_PLACE.x, y: TITLE_PLACE.y, w: +c3w.toFixed(4), h: +(th / OUT_H).toFixed(4) },
  };
}

// Seamless grey paper tile: blend the crop with a half-offset copy of itself,
// weighted so each copy's seams are hidden by the other.
async function paperSlot() {
  const p = await readRaw(THUMBS, PAPER);
  const { w, h } = p;
  const grey = new Float32Array(w * h);
  let mean = 0;
  for (let i = 0; i < w * h; i++) {
    grey[i] = lum(p.data[i * 3], p.data[i * 3 + 1], p.data[i * 3 + 2]);
    mean += grey[i];
  }
  mean /= w * h;
  const out = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const wx = 1 - Math.abs((2 * x) / (w - 1) - 1);
      const wy = 1 - Math.abs((2 * y) / (h - 1) - 1);
      const wa = Math.min(wx, wy);
      const a = grey[y * w + x];
      const b = grey[((y + h / 2) % h) * w + ((x + w / 2) % w)];
      // Centre on mid-grey so a soft-light blend leaves the paper token's color on average.
      out[y * w + x] = Math.round(clamp01((128 + (a * wa + b * (1 - wa) - mean) * 1.4) / 255) * 255);
    }
  await sharp(out, { raw: { width: w, height: h, channels: 1 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'paper.png'));
}

// Cable anchors: the top point and length of each tall connected red stroke.
function cableAnchors(cables, w, h) {
  const seen = new Uint8Array(w * h);
  const anchors = [];
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || cables[i] < 0.5) continue;
    const stack = [i];
    seen[i] = 1;
    let top = { x: i % w, y: Math.floor(i / w) }, bottom = top.y, count = 0;
    while (stack.length) {
      const j = stack.pop();
      const x = j % w, y = (j - x) / w;
      count++;
      if (y < top.y) top = { x, y };
      if (y > bottom) bottom = y;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const k = yy * w + xx;
          if (!seen[k] && cables[k] >= 0.5) { seen[k] = 1; stack.push(k); }
        }
    }
    // Keep strokes that hang from the halo; fragments that start low are her
    // sketch's loose ends, not cables.
    if (bottom - top.y > h * 0.15 && count > 200 && top.y < h * 0.62)
      anchors.push({ x: +(top.x / w).toFixed(4), y: +(top.y / h).toFixed(4), length: +((bottom - top.y) / h).toFixed(4) });
  }
  return anchors.sort((a, b) => a.x - b.x);
}

// --- Main ---------------------------------------------------------------------

await mkdir(OUT, { recursive: true });
const sk = await sketchSlots();
const { frame, fill } = await frameAndFill(sk.w, sk.h);
for (let i = 0; i < frame.length; i++) sk.lineart[i] = Math.max(sk.lineart[i], frame[i]);

for (const name of ['lineart', 'ribcage', 'eyescreen', 'wings', 'halo', 'cables']) await writeMask(name, sk[name], sk.w, sk.h);
await writeMask('fill', fill, sk.w, sk.h);
const title = await titleSlot();
await paperSlot();

const geometry = {
  frame: { width: OUT_W, height: OUT_H },
  title: { rect: title.rect, regions: { c3: title.c3 } },
  ribcage: { rect: norm(RIBCAGE) },
  eyescreen: { rect: norm(EYESCREEN) },
  halo: { screens: HALO_SCREENS.map(norm) },
  cables: { anchors: cableAnchors(sk.cables, sk.w, sk.h) },
};
await writeFile(path.join(OUT, 'geometry.json'), JSON.stringify(geometry, null, 2) + '\n');
console.log(`Wrote ${OUT_W}x${OUT_H} placeholders to art-src/placeholder/`);
console.log(JSON.stringify(geometry, null, 2));
