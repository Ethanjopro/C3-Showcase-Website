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
 * STEPS offsets inside one tile, whole CSS px. Each is at least a few grains
 * from the one before, so consecutive frames never share their snow.
 */
export function offsets(): [number, number][] {
  const rand = rng(WALK_SEED);
  const out: [number, number][] = [];
  const far = (a: number, b: number) => Math.min(Math.abs(a - b), TILE - Math.abs(a - b)) >= 8;
  while (out.length < STEPS) {
    const p: [number, number] = [Math.floor(rand() * TILE), Math.floor(rand() * TILE)];
    const prev = out[out.length - 1];
    if (!prev || far(p[0], prev[0]) || far(p[1], prev[1])) out.push(p);
  }
  return out;
}

/** A step-end keyframe list: frame k holds from k/n of the cycle (just before, so a frozen clock on a step edge shows the new frame). */
function stepped(name: string, frames: string[]): string {
  const n = frames.length;
  const stops = frames.map((f, k) => {
    const at = k === 0 ? '0%' : `${((k / n) * 100 - 0.01).toFixed(3)}%`;
    return `${k === n - 1 ? `${at},100%` : at}{${f}}`;
  });
  return `@keyframes ${name}{${stops.join('')}}`;
}

/**
 * The keyframes: the static's walk, and the word's slip (the picture loses
 * hold for one step and jumps sideways a pixel, once every `slipSteps`).
 */
export function keyframes(walk: [number, number][], slipSteps: number): string {
  const move = walk.map(([x, y]) => `transform:translate(${x}px,${y}px)`);
  const slip = Array.from({ length: slipSteps }, (_, k) => (k === 1 ? 'transform:translateX(1.5px)' : 'transform:none'));
  return stepped('c3-crt-static', move) + stepped('c3-crt-slip', slip);
}
