// Builds public/art/ from src/art/manifest.json.
//
// For each slot it reads `source` (black on transparent, on the poster's frame
// canvas) and writes `src`:
//   - `vectorize: true`  → SVG via potrace, one <path> per contour group
//                          (an outline plus the holes inside it), top to bottom,
//                          so sketch-in can draw them in order.
//   - `tint: "paper"`    → greyscale WebP texture tile.
//   - otherwise          → WebP alpha mask; CSS colors it with the slot's tint.
//
// Re-run it on her final files: point each slot's `source` at the new file and
// run `npm run art`. No code changes.

import sharp from 'sharp';
import potrace from 'potrace';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'src/art/manifest.json'), 'utf8'));
const only = process.argv.slice(2);

for (const [name, slot] of Object.entries(manifest.slots)) {
  if (only.length && !only.includes(name)) continue;
  const input = path.join(ROOT, slot.source);
  if (!input.startsWith(path.join(ROOT, 'art-src') + path.sep)) {
    throw new Error(`${name}: source must live in art-src/ (got ${slot.source}). Nothing in reference/ ships.`);
  }
  const output = path.join(ROOT, 'public', slot.src);
  await mkdir(path.dirname(output), { recursive: true });

  if (slot.vectorize) {
    const svg = await vectorize(input, slot.width, slot.height);
    await writeFile(output, svg);
  } else if (slot.tint === 'paper') {
    await sharp(input).greyscale().resize(slot.width, slot.height).webp({ quality: 80 }).toFile(output);
  } else {
    // Keep only the alpha: black RGB, so the file stays small and CSS supplies the color.
    const alpha = await sharp(input).resize(slot.width, slot.height, { fit: 'fill' }).ensureAlpha().extractChannel(3).toBuffer();
    await sharp({ create: { width: slot.width, height: slot.height, channels: 3, background: '#000' } })
      .joinChannel(alpha)
      .webp({ quality: 85, alphaQuality: 90, effort: 6 })
      .toFile(output);
  }
  const { size } = await import('node:fs').then((fs) => fs.promises.stat(output));
  console.log(`${name.padEnd(10)} → public/${slot.src} (${(size / 1024).toFixed(0)} KB)`);
}

async function vectorize(input, width, height) {
  // Potrace wants dark shapes on a light background.
  const bitmap = await sharp(input)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .extractChannel(3)
    .negate()
    .png()
    .toBuffer();

  const tracer = new potrace.Potrace({ threshold: 128, turdSize: 6, optTolerance: 0.4, alphaMax: 1 });
  await new Promise((resolve, reject) => tracer.loadImage(bitmap, (err) => (err ? reject(err) : resolve())));
  tracer.getPathTag(); // runs the trace and fills _pathlist
  const paths = tracer._pathlist;

  // Group each hole with the outline around it, so separate <path>s keep their
  // holes (fill-rule evenodd within each group). This potrace port reports
  // every contour as "+", so nesting depth decides: even = outline, odd = hole.
  const containers = paths.map((p) =>
    paths.filter(
      (q) =>
        q !== p &&
        q.minX <= p.minX && q.minY <= p.minY && q.maxX >= p.maxX && q.maxY >= p.maxY &&
        insidePolygon(p.pt[0], q.pt),
    ),
  );
  const groups = new Map();
  paths.forEach((p, i) => {
    const depth = containers[i].length;
    if (depth % 2 === 0) {
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).unshift(p);
      return;
    }
    // A hole's parent is its innermost container: the one with the most containers of its own.
    const parent = containers[i].reduce((a, b) => (containers[paths.indexOf(b)].length > containers[paths.indexOf(a)].length ? b : a));
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(p);
  });

  const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1).replace(/\.0$/, ''));
  const tags = [...groups.values()]
    .sort((a, b) => a[0].minY - b[0].minY || a[0].minX - b[0].minX)
    .map((group) => `<path d="${round(group.map((p) => potraceCurve(p.curve)).join(''))}"/>`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="currentColor" fill-rule="evenodd">` +
    tags.join('') +
    '</svg>\n'
  );
}

function insidePolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

// Same output as potrace's own utils.renderCurve, without its fixed 3-decimal padding.
function potraceCurve(curve) {
  const n = curve.n;
  const p = (pt) => `${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
  let d = `M${p(curve.c[(n - 1) * 3 + 2])}`;
  for (let i = 0; i < n; i++) {
    if (curve.tag[i] === 'CURVE') d += `C${p(curve.c[i * 3])} ${p(curve.c[i * 3 + 1])} ${p(curve.c[i * 3 + 2])}`;
    else d += `L${p(curve.c[i * 3 + 1])} ${p(curve.c[i * 3 + 2])}`;
  }
  return d + 'Z';
}
