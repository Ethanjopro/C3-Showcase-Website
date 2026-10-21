// Small Canvas 2D helpers shared by effects: noise tiles, halftone, a rough
// hand-drawn stroke, PNG object URLs and stepped keyframes. Deterministic: the
// same seed draws the same thing.

export type Point = readonly [number, number];

/** mulberry32: a tiny seeded PRNG returning 0-1. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** A square tile of grey noise, alpha 0-255 scaled by `strength` (0-1). */
export function noiseTile(size: number, seed: number, strength = 1): HTMLCanvasElement {
  const c = canvas(size, size);
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const img = ctx.createImageData(size, size);
  const rand = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = rand();
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0.5 ? 255 : 0;
    img.data[i * 4 + 3] = Math.round(Math.abs(v - 0.5) * 2 * 255 * strength);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * Redraws `source` as halftone dots in `color`, sized by how dark (opaque)
 * each `cell`-px cell is. Returns a new canvas of width x height.
 */
export function halftone(source: CanvasImageSource, width: number, height: number, cell: number, color: string): HTMLCanvasElement {
  const probe = canvas(width, height);
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const out = canvas(width, height);
  const ctx = out.getContext('2d');
  if (!pctx || !ctx) return out;
  pctx.drawImage(source, 0, 0, width, height);
  const { data } = pctx.getImageData(0, 0, width, height);
  ctx.fillStyle = color;
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      let sum = 0;
      let n = 0;
      for (let yy = y; yy < Math.min(height, y + cell); yy += 2)
        for (let xx = x; xx < Math.min(width, x + cell); xx += 2) {
          sum += (data[(yy * width + xx) * 4 + 3] ?? 0) / 255;
          n++;
        }
      const d = n ? sum / n : 0;
      if (d < 0.04) continue;
      ctx.beginPath();
      ctx.arc(x + cell / 2, y + cell / 2, (Math.sqrt(d) * cell) / 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return out;
}

// A reseedable mulberry32 for roughStroke, so frame loops don't allocate a
// closure per stroke.
let strokeState = 0;
function strokeRand(): number {
  strokeState = (strokeState + 0x6d2b79f5) >>> 0;
  let t = strokeState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Draws a polyline the way she draws: two slightly different passes with a
 * wobbling width. Same seed, same line; change the seed 8-12 times a second
 * to boil it. Uses the context's current strokeStyle. Allocation-free.
 */
export function roughStroke(ctx: CanvasRenderingContext2D, points: readonly Point[], seed: number, width: number): void {
  if (points.length < 2) return;
  strokeState = seed >>> 0;
  const rand = strokeRand;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    const jitter = width * (pass ? 0.6 : 0.35);
    ctx.lineWidth = width * (pass ? 0.55 : 1) * (0.85 + rand() * 0.3);
    ctx.beginPath();
    const [x0, y0] = points[0]!;
    ctx.moveTo(x0 + (rand() - 0.5) * jitter, y0 + (rand() - 0.5) * jitter);
    for (let i = 1; i < points.length; i++) {
      const [x, y] = points[i]!;
      const [px, py] = points[i - 1]!;
      ctx.quadraticCurveTo(px + (rand() - 0.5) * jitter, py + (rand() - 0.5) * jitter, (px + x) / 2, (py + y) / 2);
    }
    const [xn, yn] = points[points.length - 1]!;
    ctx.lineTo(xn + (rand() - 0.5) * jitter, yn + (rand() - 0.5) * jitter);
    ctx.stroke();
  }
}

/** The canvas as a PNG object URL; the caller revokes it when done. */
export function blobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('raster: toBlob failed'))), 'image/png'),
  );
}

/**
 * A step-end @keyframes rule cycling through `frames` (CSS declarations), for
 * stepped compositor animations with no JS per step. Frame k holds from k/n of
 * the cycle, written 0.01 % early so a clock frozen exactly on a step edge
 * (`?freeze`, negative animation-delay) already shows the new frame; the last
 * frame holds to 100 %.
 */
export function steppedKeyframes(name: string, frames: readonly string[]): string {
  const n = frames.length;
  const stops = frames.map((decl, k) => {
    const at = k === 0 ? '0%' : `${+((k / n) * 100 - 0.01).toFixed(3)}%`;
    return `${k === n - 1 && k > 0 ? `${at},100%` : at}{${decl}}`;
  });
  return `@keyframes ${name}{${stops.join('')}}`;
}
