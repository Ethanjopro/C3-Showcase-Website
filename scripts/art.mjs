// npm run art: turns her source files in art-src/ into the files the site ships
// in src/art/. Re-run it after replacing anything in art-src/ (see art-src/README.md).
//
//   her.webp             her painting, as she sent it          -> src/art/her.webp
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

// Her painting: re-encoded once, never resized (it is the star; 853 x 1280 is what we have).
await sharp(path.join(SRC, 'her.webp')).webp({ quality: 88, effort: 6 }).toFile(path.join(OUT, 'her.webp'));

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
