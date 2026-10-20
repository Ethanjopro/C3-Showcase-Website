// paper-grain (SPEC §3 row 2, PLAN step 3). A riso grain over her paper that
// shifts at 8 fps: four noise tiles from core/raster, cycled on the compositor.
//
// The mount is the fixed full-viewport layer above the content and below the
// chrome (base.css, pointer-events: none). Inside it, one field repeats a 2x2
// super-tile of the four tiles; a step-end CSS transform shifts it by one tile
// per step at --fps-grain (8), so each point of the screen cycles through all
// four. Compositor only, no JS per step, and one viewport-sized layer instead
// of four (~9.6 MB instead of ~21 MB of GPU memory on a 390 px phone).
//
// Multiply: the tiles keep only noiseTile's black specks, and black at alpha a
// composited normally is exactly multiply by (1 - a). So the grain multiplies
// with no mix-blend-mode, which would cost a full-screen backdrop pass per frame.
//
// GRAIN_MAX caps a speck's darkness at 4 % (PLAN step 3: grain opacity stays at
// or below 4 % behind text, so contrast holds).
//
//   full    four tiles, cycled at 8 fps
//   lite    one still tile: a full-screen layer redrawn 8 times a second
//           is the extra a slow device drops
//   static  one still tile

import type { EffectOptions } from '../../core/effect';
import { noiseTile } from '../../core/raster';
import { ticker } from '../../core/ticker';
import './style.css';

const TILES = 4;
/** Distinct seeds, one per tile. */
const SEEDS = [7, 23, 59, 101] as const;
/** Tile edge in CSS px. Large enough that the repeat doesn't read as a pattern. */
const TILE = 192;
/** Darkest a speck gets: alpha 0.04 of black (PLAN step 3's 4 % cap). */
const GRAIN_MAX = 0.04;
/** Share of grain cells that print. Riso grain is sparse tooth, not a haze. */
const COVERAGE = 0.32;
/** Grain size in CSS px: the cell a speck clumps into. */
const GRAIN_PX = 1.5;
/** Share of a grain's pixels knocked out, so its edge is ragged. */
const RAGGED = 0.2;
const DEFAULT_FPS = 8;

let wrap: HTMLElement | null = null;
let urls: string[] = [];
let generation = 0;

function tokenFps(): number {
  const v = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fps-grain'));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_FPS;
}

/**
 * One tile of riso tooth, built from two noiseTiles:
 *   - a coarse one, upscaled with no smoothing, decides where grains sit, so
 *     specks clump into GRAIN_PX-sized grains instead of a 1 px digital haze;
 *   - a fine one, at device resolution (DPR capped at 2), ragged-edges the
 *     grains and varies their ink between half and full GRAIN_MAX.
 * Only black is kept: white would lighten the paper, not multiply it.
 */
function tile(seed: number, px: number, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(noiseTile(Math.max(1, Math.round(px / (GRAIN_PX * dpr))), seed), 0, 0, px, px);
  const img = ctx.getImageData(0, 0, px, px);
  const d = img.data;
  const fineCanvas = noiseTile(px, seed + 7919);
  const fine = fineCanvas.getContext('2d')!.getImageData(0, 0, px, px).data;
  const on = GRAIN_MAX * 255;
  // noiseTile: black where v <= 0.5, alpha = |v - 0.5| * 2. The strongest
  // COVERAGE share of all pixels sits at alpha >= 1 - 2 * COVERAGE.
  const threshold = Math.round((1 - 2 * COVERAGE) * 255);
  for (let i = 0; i < d.length; i += 4) {
    const jitter = fine[i + 3]! / 255;
    const grain = d[i] === 0 && d[i + 3]! >= threshold && jitter >= RAGGED;
    d[i] = d[i + 1] = d[i + 2] = 0;
    d[i + 3] = grain ? Math.round(on * (0.5 + 0.5 * jitter)) : 0;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const idle = () =>
  new Promise<void>((resolve) =>
    typeof requestIdleCallback === 'function' ? requestIdleCallback(() => resolve(), { timeout: 300 }) : setTimeout(resolve, 16),
  );

/**
 * Moving: the four tiles packed 2x2 into one super-tile, so a single layer
 * carries them all. Still: the first tile alone. One tile per idle slice: all
 * four at once is a ~250 ms task on a slow phone.
 */
async function superTile(px: number, dpr: number, moving: boolean, alive: () => boolean): Promise<string | null> {
  const seeds = moving ? SEEDS : SEEDS.slice(0, 1);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = moving ? px * 2 : px;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('paper-grain: no 2D context');
  for (const [i, seed] of seeds.entries()) {
    await idle();
    if (!alive()) return null;
    ctx.drawImage(tile(seed, px, dpr), (i % 2) * px, Math.floor(i / 2) * px);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('paper-grain: toBlob failed'))), 'image/png'),
  );
}

/**
 * The cycle: shifting the field by one tile across, down, then both, puts a
 * different tile under every point of the screen at each step. One layer,
 * transform only, step-end: compositor work, no JS per step.
 */
function keyframes(): string {
  const t = `${-TILE}px`;
  return (
    `@keyframes c3-grain-shift{0%{transform:translate(0,0)}24.99%{transform:translate(${t},0)}` +
    `49.99%{transform:translate(0,${t})}74.99%,100%{transform:translate(${t},${t})}}`
  );
}

export async function init(root: HTMLElement, opts: EffectOptions): Promise<void> {
  destroy();
  const gen = generation;
  const moving = opts.quality === 'full';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(TILE * dpr);
  const url = await superTile(px, dpr, moving, () => gen === generation);
  if (!url) return;
  if (gen !== generation) {
    URL.revokeObjectURL(url);
    return;
  }
  urls = [url];

  wrap = document.createElement('div');
  wrap.className = 'paper-grain';
  const field = document.createElement('div');
  field.className = 'paper-grain__field';
  // One tile wider and taller than the viewport, so every shift still covers it.
  field.style.right = field.style.bottom = `${-TILE}px`;
  field.style.backgroundImage = `url(${url})`;
  field.style.backgroundSize = moving ? `${TILE * 2}px ${TILE * 2}px` : `${TILE}px ${TILE}px`;
  if (moving) {
    const style = document.createElement('style');
    style.textContent = keyframes();
    wrap.append(style);
    field.style.animation = `c3-grain-shift ${(TILES * 1000) / tokenFps()}ms step-end infinite`;
    // ?freeze=<ms>: hold the tile that time shows, so screenshots are deterministic.
    const frozen = ticker.frozenAt;
    if (frozen !== null) {
      field.style.animationDelay = `${-frozen}ms`;
      field.style.animationPlayState = 'paused';
    }
  }
  wrap.append(field);
  root.append(wrap);
  root.dataset.state = moving ? 'moving' : 'still';
}

export function destroy(): void {
  generation++;
  const root = wrap?.parentElement;
  if (root) delete root.dataset.state;
  wrap?.remove();
  wrap = null;
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = [];
}
