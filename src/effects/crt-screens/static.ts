// The static: one tile of light specks, used as a mask over an --on-ink fill,
// and the stepped offsets that make it crawl.
//
// One tile is enough. Noise is uncorrelated with itself a grain away, so the
// same tile shifted to a new random offset reads as a new frame of snow. The
// field only needs to be one tile larger than the screen, and a step is a
// compositor transform (no JS, no repaint).

import { noiseTile, rng } from '../../core/raster';

/** Tile edge in CSS px. */
export const TILE = 96;
/** Frames in one loop of the static. At 10 fps the loop is 1.2 s, too long to read as a loop. */
export const STEPS = 12;
/**
 * Brightest a speck gets: alpha 0.24 of --on-ink over the ink glass. At that,
 * one speck lifts a pixel's relative luminance by under 0.1 on the lightest
 * ink (teal, mauve), so no pixel flashes from one frame to the next (WCAG
 * 2.3.1's threshold is a 0.1 change). The spec measures it on real frames.
 */
export const SPECK_MAX = 0.24;
/** Share of grain cells that light up. */
const COVERAGE = 0.42;
/** Grain size in CSS px: specks clump like riso tooth, not a 1 px digital haze. */
const GRAIN_PX = 2.25;
/** Share of a grain's pixels knocked out, so its edge is ragged like print. */
const RAGGED = 0.25;
/** Seeds: the tile, and the walk of offsets. */
const TILE_SEED = 311;
const WALK_SEED = 433;
/** Least distance in CSS px, in at least one axis, between nearby frames of the walk: a few grains. */
const MIN_STEP = 8;

/**
 * The tile, as an alpha mask (black, alpha = speck strength), built like
 * paper-grain's tooth from two noiseTiles: a coarse one upscaled with no
 * smoothing places the grains; a fine one at device resolution ragged-edges
 * them and varies their strength between 40 % and 100 % of SPECK_MAX.
 */
export function staticTile(dpr: number): HTMLCanvasElement {
  const px = Math.round(TILE * dpr);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(noiseTile(Math.max(1, Math.round(px / (GRAIN_PX * dpr))), TILE_SEED), 0, 0, px, px);
  const img = ctx.getImageData(0, 0, px, px);
  const d = img.data;
  const fine = noiseTile(px, TILE_SEED + 7919).getContext('2d')!.getImageData(0, 0, px, px).data;
  // noiseTile: alpha = |v - 0.5| * 2, uniform in 0-1, so the strongest
  // COVERAGE share of pixels sits at alpha >= 1 - COVERAGE.
  const threshold = Math.round((1 - COVERAGE) * 255);
  const on = SPECK_MAX * 255;
  for (let i = 0; i < d.length; i += 4) {
    const jitter = fine[i + 3]! / 255;
    const speck = d[i + 3]! >= threshold && jitter >= RAGGED;
    d[i] = d[i + 1] = d[i + 2] = 0;
    d[i + 3] = speck ? Math.round(on * (0.4 + (0.6 * (jitter - RAGGED)) / (1 - RAGGED))) : 0;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * STEPS offsets inside one tile, whole CSS px. Each is far (a few grains, in
 * at least one axis) from the two frames before and after it, around the
 * loop's seam too, so no frame shares its snow with a near neighbour.
 */
export function offsets(): [number, number][] {
  const rand = rng(WALK_SEED);
  const far = (a: [number, number], b: [number, number]) => {
    const d = (u: number, v: number) => Math.min(Math.abs(u - v), TILE - Math.abs(u - v));
    return d(a[0], b[0]) >= MIN_STEP || d(a[1], b[1]) >= MIN_STEP;
  };
  const out: [number, number][] = [];
  while (out.length < STEPS) {
    const p: [number, number] = [Math.floor(rand() * TILE), Math.floor(rand() * TILE)];
    const k = out.length;
    // Neighbours within two steps; the last two frames also wrap round to the first two.
    const near = [k - 1, k - 2, k + 1 - STEPS, k + 2 - STEPS].filter((j) => j >= 0 && j < k).map((j) => out[j]!);
    if (near.every((q) => far(p, q))) out.push(p);
  }
  return out;
}

/** The static's walk as step-end keyframes: frame k holds from k/n of the cycle (just before, so a frozen clock on a step edge shows the new frame). */
export function keyframes(walk: [number, number][]): string {
  const n = walk.length;
  const stops = walk.map(([x, y], k) => {
    const at = k === 0 ? '0%' : `${((k / n) * 100 - 0.01).toFixed(3)}%`;
    return `${k === n - 1 ? `${at},100%` : at}{transform:translate(${x}px,${y}px)}`;
  });
  return `@keyframes c3-crt-static{${stops.join('')}}`;
}
