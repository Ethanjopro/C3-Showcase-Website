// npm run art: turns her source files in art-src/ into the files the site ships
// in src/art/. Re-run it after replacing anything in art-src/ (see art-src/README.md).
//
//   her.webp + grade.json  her finished painting (grade off)  -> src/art/her.webp
//   (derived)            her title and frame, cut out          -> src/art/front.webp
//   (derived)            an X-ray film of her painting         -> src/art/her-xray.webp
//   occluder.png         alpha: her head, hair and wings       -> src/art/occluder.webp
//   lettering/title.webp her C3 mark and SHOWCASE wordmark     -> src/art/mark.webp, word-l.webp, word-r.webp
//   poster.webp          her poster with the event details     -> public/c3-showcase-poster.webp
//   textures/*.png       paper grain, static noise             -> src/art/*.webp

import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'art-src');
const OUT = path.join(ROOT, 'src/art');
await mkdir(OUT, { recursive: true });

// Her painting, never resized (it is the star; 853 x 1280 is what we have), recoloured
// into the site's palette by grade.json: a gradient map on brightness that keeps a little of
// her hue, mixed over her colours.
{
  const grade = JSON.parse(await readFile(path.join(SRC, 'grade.json'), 'utf8'));
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const stops = grade.stops.map(([at, h]) => [at, hex(h)]);
  const k = grade.strength ?? 0;
  const keep = grade.keepColour ?? 0;
  const { data, info } = await sharp(path.join(SRC, 'her.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    let j = 1;
    while (j < stops.length - 1 && stops[j][0] < l) j++;
    const [a0, c0] = stops[j - 1];
    const [a1, c1] = stops[j];
    const t = Math.max(0, Math.min(1, (l - a0) / (a1 - a0 || 1)));
    for (let c = 0; c < 3; c++) {
      // The stop colour, plus some of her own hue (her colour minus its grey).
      const target = c0[c] + (c1[c] - c0[c]) * t + keep * (data[i + c] - l * 255);
      out[i + c] = Math.max(0, Math.min(255, Math.round(data[i + c] * (1 - k) + target * k)));
    }
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 88, effort: 6 })
    .toFile(path.join(OUT, 'her.webp'));
}

// X-ray film: her painting is dark, so her edges glow (the outline of everything she drew)
// over a faint body, cold-tinted. The navy ground and its brush texture stay black.
{
  const grey = sharp(path.join(SRC, 'her.webp')).greyscale();
  const { data: lum, info } = await grey.clone().raw().toBuffer({ resolveWithObject: true });
  const { data: edge } = await grey
    .clone()
    .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const body = Math.max(0, Math.min(1, (lum[i] - 28) / 25)); // 0 on her navy ground
    const v = Math.max(0, Math.min(255, edge[i] * 2.8 * body + Math.max(0, lum[i] - 40) * 0.3));
    out[i * 3] = Math.round(v * 0.86);
    out[i * 3 + 1] = Math.round(v * 0.95);
    out[i * 3 + 2] = Math.round(v);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(OUT, 'her-xray.webp'));
}

// Front: her title and the top of her frame, cut out of her painting (the light pixels and
// the red of the title's shadow), so the cameras' wires can pass behind them.
{
  const scene = JSON.parse(await readFile(path.join(ROOT, 'src/art/scene.json'), 'utf8'));
  const F = scene.front;
  const { data, info } = await sharp(path.join(SRC, 'her.webp'))
    .removeAlpha()
    .extract({ left: F.x, top: F.y, width: F.w, height: F.h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const hard = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
    hard[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b > 70 || r - b > 35 ? 255 : 0;
  }
  const alpha = await sharp(Buffer.from(hard), { raw: { width: info.width, height: info.height, channels: 1 } })
    .dilate(1)
    .blur(0.8)
    .extractChannel(0) // sharp hands back three channels after these; keep one
    .raw()
    .toBuffer();
  if (alpha.length !== n) throw new Error(`front: alpha is ${alpha.length} bytes, expected ${n}`);
  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    rgba.set([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], alpha[i]], i * 4);
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUT, 'front.webp'));
}

// Occluder: only its alpha matters (CSS mask), so store it as a lossless alpha WebP.
await sharp(path.join(SRC, 'occluder.png')).webp({ lossless: true, effort: 6 }).toFile(path.join(OUT, 'occluder.webp'));

// Her title: the C3 mark, and her SHOWCASE wordmark split between SHOW and CASE for the two
// doors. Columns are in her title.webp (1200 x 600); the trim drops the empty edges.
{
  const title = path.join(SRC, 'lettering/title.webp');
  const cut = async (left, right, file) => {
    const piece = await sharp(title).extract({ left, top: 0, width: right - left, height: 600 }).png().toBuffer();
    await sharp(piece).trim({ threshold: 1 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, file));
  };
  await cut(120, 440, 'mark.webp');
  // The two halves of the word share one height, so SHOW and CASE sit on one baseline.
  const word = (left, right, file) =>
    sharp(title).extract({ left, top: 196, width: right - left, height: 144 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, file));
  // Cut at 778: columns 773-777 are the W's top serif, which stays with SHOW.
  await word(462, 778, 'word-l.webp');
  await word(778, 1068, 'word-r.webp');
}

// Her poster with the event details: shipped as is, to download.
await mkdir(path.join(ROOT, 'public'), { recursive: true });
await sharp(path.join(SRC, 'poster.webp')).webp({ quality: 90, effort: 6 }).toFile(path.join(ROOT, 'public/c3-showcase-poster.webp'));

await sharp(path.join(SRC, 'textures/grain.png')).webp({ lossless: true }).toFile(path.join(OUT, 'grain.webp'));
await sharp(path.join(SRC, 'textures/static.png')).ensureAlpha().webp({ lossless: true }).toFile(path.join(OUT, 'static.webp'));
console.log('art: wrote', (await readdir(OUT)).length, 'files to src/art/');
