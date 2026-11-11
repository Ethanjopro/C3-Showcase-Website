// npm run art: turns her source files in art-src/ into the files the site ships
// in src/art/. Re-run it after replacing anything in art-src/ (see art-src/README.md).
//
//   her.webp + grade.json  her painting, recoloured to the site -> src/art/her.webp
//   (derived)            an X-ray film of her painting         -> src/art/her-xray.webp
//   occluder.png         alpha: her head, hair and wings       -> src/art/occluder.webp
//   cameras/camera-NN-line.png + -fill.png                     -> src/art/camera-NN.webp
//   lettering/*.svg      her "C3 Showcase" lettering           -> src/art/*.svg
//   textures/*.png       paper grain, static noise             -> src/art/*.webp

import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'art-src');
const OUT = path.join(ROOT, 'src/art');
await mkdir(OUT, { recursive: true });

const PLUM = { r: 0x3a, g: 0x27, b: 0x31 };
const BODY = { r: 0xe2, g: 0xda, b: 0xde };

// Her painting, never resized (it is the star; 853 x 1280 is what we have), recoloured
// into the site's palette by grade.json: a gradient map on brightness, mixed over her colours.
{
  const grade = JSON.parse(await readFile(path.join(SRC, 'grade.json'), 'utf8'));
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const stops = grade.stops.map(([at, h]) => [at, hex(h)]);
  const k = grade.strength ?? 0;
  const { data, info } = await sharp(path.join(SRC, 'her.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const l = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    let j = 1;
    while (j < stops.length - 1 && stops[j][0] < l) j++;
    const [a0, c0] = stops[j - 1];
    const [a1, c1] = stops[j];
    const t = Math.max(0, Math.min(1, (l - a0) / (a1 - a0 || 1)));
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(data[i + c] * (1 - k) + (c0[c] + (c1[c] - c0[c]) * t) * k);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 88, effort: 6 })
    .toFile(path.join(OUT, 'her.webp'));
}

// X-ray film: luminance inverted, the paper pushed to black and her line to white, a cold tint.
{
  const { data, info } = await sharp(path.join(SRC, 'her.webp')).greyscale().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const v = Math.max(0, Math.min(255, (255 - data[i] - 118) * 2.3));
    out[i * 3] = Math.round(v * 0.93);
    out[i * 3 + 1] = Math.round(v * 0.97);
    out[i * 3 + 2] = Math.round(v);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(OUT, 'her-xray.webp'));
}

// Occluder: only its alpha matters (CSS mask), so store it as a lossless alpha WebP.
await sharp(path.join(SRC, 'occluder.png')).webp({ lossless: true, effort: 6 }).toFile(path.join(OUT, 'occluder.webp'));

// Cameras: a pale body under her plum line, one image per camera.
async function tinted(file, rgb) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i++) {
    data[i * 4] = rgb.r;
    data[i * 4 + 1] = rgb.g;
    data[i * 4 + 2] = rgb.b;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
for (const f of (await readdir(path.join(SRC, 'cameras'))).filter((n) => n.endsWith('-line.png'))) {
  const id = f.replace('-line.png', '');
  const line = await tinted(path.join(SRC, 'cameras', f), PLUM);
  const body = await tinted(path.join(SRC, 'cameras', `${id}-fill.png`), BODY);
  await sharp(body)
    .composite([{ input: line }])
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(path.join(OUT, `${id}.webp`));
}

// Her lettering: copied, with a width and height from its viewBox so every browser
// knows its size (Firefox draws an SVG with only a viewBox at 0 x 0 on a canvas).
for (const f of await readdir(path.join(SRC, 'lettering'))) {
  let svg = await readFile(path.join(SRC, 'lettering', f), 'utf8');
  const vb = svg.match(/<svg[^>]*viewBox="[\d.-]+ [\d.-]+ ([\d.]+) ([\d.]+)"/);
  if (vb && !/<svg[^>]*\swidth=/.test(svg)) svg = svg.replace('<svg ', `<svg width="${vb[1]}" height="${vb[2]}" `);
  await writeFile(path.join(OUT, f), svg);
}
await sharp(path.join(SRC, 'textures/grain.png')).webp({ lossless: true }).toFile(path.join(OUT, 'grain.webp'));
await sharp(path.join(SRC, 'textures/static.png')).ensureAlpha().webp({ lossless: true }).toFile(path.join(OUT, 'static.webp'));
console.log('art: wrote', (await readdir(OUT)).length, 'files to src/art/');
