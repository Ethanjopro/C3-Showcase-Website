// The boil itself: push a drawing around by a smooth noise field, the way a
// redrawn pencil line wanders off the one before it. Pure, allocation-light
// and deterministic (same seed, same drawing), so frames can be rendered in
// slices at idle time.

import { rng } from '../../core/raster';

/** Drawings in the cycle: her live art plus two re-drawings. The classic pencil-test boil. */
export const FRAMES = 3;

/** Noise seeds for the two re-drawings. Any distinct integers. */
export const SEEDS = [17, 41] as const;

/**
 * Peak displacement, as a fraction of the poster width (PLAN step 2: about
 * 0.25 %). Larger reads as wobbly, smaller as a still drawing.
 */
export const AMPLITUDE = 0.0025;

/**
 * Wobble wavelength, as a fraction of the poster width: how far along a line
 * one bend runs. Shorter turns the line hairy, longer makes the drawing sway
 * instead of boil.
 */
export const WAVELENGTH = 0.022;

/** A finer second octave adds tooth to the bends. Its size and weight relative to the first. */
const DETAIL_SCALE = 0.4;
const DETAIL_WEIGHT = 0.4;

/** Which drawing shows at clock time `t` (ms), stepping `fps` times a second. */
export function boilFrame(t: number, fps: number): number {
  const step = Math.floor((t * fps) / 1000);
  return ((step % FRAMES) + FRAMES) % FRAMES;
}

/** Value-noise lattice: random -1..1 per node, two channels (x and y). */
interface Lattice {
  cell: number;
  cols: number;
  x: Float32Array;
  y: Float32Array;
  /** Per output column: lattice column and smoothed fraction. */
  ix: Int32Array;
  sx: Float32Array;
}

function lattice(width: number, height: number, cell: number, rand: () => number): Lattice {
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const x = new Float32Array(cols * rows);
  const y = new Float32Array(cols * rows);
  for (let i = 0; i < x.length; i++) {
    x[i] = rand() * 2 - 1;
    y[i] = rand() * 2 - 1;
  }
  const ix = new Int32Array(width);
  const sx = new Float32Array(width);
  for (let px = 0; px < width; px++) {
    const g = px / cell;
    const i = Math.floor(g);
    const f = g - i;
    ix[px] = i;
    sx[px] = f * f * (3 - 2 * f);
  }
  return { cell, cols, x, y, ix, sx };
}

/** One re-drawing of an alpha mask: everything needed to displace it, row by row. */
export interface Redraw {
  readonly width: number;
  readonly height: number;
  /** Displaces rows [from, to) of `alpha` into `out` (RGBA, alpha channel written). */
  rows(from: number, to: number): void;
}

/**
 * Prepares a re-drawing of `alpha` (one byte per pixel, `width` x `height`)
 * into `out` (RGBA ImageData bytes). `amplitude` and `wavelength` are in
 * pixels of this bitmap.
 */
export function redraw(
  alpha: Uint8Array,
  out: Uint8ClampedArray,
  width: number,
  height: number,
  seed: number,
  amplitude: number,
  wavelength: number,
): Redraw {
  const rand = rng(seed);
  const coarse = lattice(width, height, Math.max(2, wavelength), rand);
  const fine = lattice(width, height, Math.max(2, wavelength * DETAIL_SCALE), rand);
  const gain = amplitude / (1 + DETAIL_WEIGHT);
  const maxX = width - 1;
  const maxY = height - 1;

  return {
    width,
    height,
    rows(from, to) {
      for (let y = from; y < to; y++) {
        const gc = y / coarse.cell;
        const iyc = Math.floor(gc);
        const fc = gc - iyc;
        const syc = fc * fc * (3 - 2 * fc);
        const gf = y / fine.cell;
        const iyf = Math.floor(gf);
        const ff = gf - iyf;
        const syf = ff * ff * (3 - 2 * ff);
        const rowC = iyc * coarse.cols;
        const rowF = iyf * fine.cols;

        for (let x = 0; x < width; x++) {
          // Coarse octave.
          let i = rowC + coarse.ix[x]!;
          let s = coarse.sx[x]!;
          let j = i + coarse.cols;
          let top = coarse.x[i]! + (coarse.x[i + 1]! - coarse.x[i]!) * s;
          let bottom = coarse.x[j]! + (coarse.x[j + 1]! - coarse.x[j]!) * s;
          let dx = top + (bottom - top) * syc;
          top = coarse.y[i]! + (coarse.y[i + 1]! - coarse.y[i]!) * s;
          bottom = coarse.y[j]! + (coarse.y[j + 1]! - coarse.y[j]!) * s;
          let dy = top + (bottom - top) * syc;
          // Fine octave.
          i = rowF + fine.ix[x]!;
          s = fine.sx[x]!;
          j = i + fine.cols;
          top = fine.x[i]! + (fine.x[i + 1]! - fine.x[i]!) * s;
          bottom = fine.x[j]! + (fine.x[j + 1]! - fine.x[j]!) * s;
          dx += (top + (bottom - top) * syf) * DETAIL_WEIGHT;
          top = fine.y[i]! + (fine.y[i + 1]! - fine.y[i]!) * s;
          bottom = fine.y[j]! + (fine.y[j + 1]! - fine.y[j]!) * s;
          dy += (top + (bottom - top) * syf) * DETAIL_WEIGHT;

          // Bilinear sample of the source at the displaced point.
          let sxp = x + dx * gain;
          let syp = y + dy * gain;
          sxp = sxp < 0 ? 0 : sxp > maxX ? maxX : sxp;
          syp = syp < 0 ? 0 : syp > maxY ? maxY : syp;
          const x0 = sxp | 0;
          const y0 = syp | 0;
          const x1 = x0 < maxX ? x0 + 1 : x0;
          const y1 = y0 < maxY ? y0 + 1 : y0;
          const fx = sxp - x0;
          const fy = syp - y0;
          const a = alpha[y0 * width + x0]!;
          const b = alpha[y0 * width + x1]!;
          const c = alpha[y1 * width + x0]!;
          const d = alpha[y1 * width + x1]!;
          const upper = a + (b - a) * fx;
          const lower = c + (d - c) * fx;
          out[(y * width + x) * 4 + 3] = upper + (lower - upper) * fy;
        }
      }
    },
  };
}
