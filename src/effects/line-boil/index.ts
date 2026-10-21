// line-boil (SPEC §3 row 1, PLAN step 2). Her hand-drawn layers jitter like
// pencil animation: three drawings of each layer, cycled at 10 fps so the line
// steps instead of sliding.
//
// PLAN's fallback, "pre-rendered frames": swapping SVG displacement filters
// per step cost ~4.8 ms of main thread per step under 4x CPU throttle at 390 px
// (the gate is 2 ms; numbers in README.md). So instead:
//   1. At idle, each boiling layer's art is re-drawn twice through a smooth
//      noise displacement (displace.ts) into alpha masks.
//   2. The masks show as `.layer::before` / `::after`, tinted with the slot's
//      token, so colorway swaps recolor them for free.
//   3. Drawing 0 is her live art. A stepped CSS animation cycles the three on
//      the compositor: `filter: opacity()` on `.layer__boil` (the property this
//      effect owns) and `opacity` on the two pseudo-elements. No JS per step.
//
// Outside its mount the effect writes only <html data-fx-line-boil>:
//   "on"         frames are ready; style.css runs the cycle
//   "on paused"  the poster is offscreen
//
//   full    lineart, title, halo and wings boil at --fps-boil (10)
//   lite    lineart only, at 8 fps
//   static  nothing: her clean, still lines

import type { EffectOptions } from '../../core/effect';
import { frame, image, slot, type SlotName } from '../../core/art';
import { frozenAt, idle } from '../../core/clock';
import { observeOnscreen } from '../../core/onscreen';
import { number } from '../../core/palette';
import { blobUrl } from '../../core/raster';
import { AMPLITUDE, FRAMES, redraw, SEEDS, WAVELENGTH } from './displace';
import './style.css';

const ATTR = 'data-fx-line-boil';
const FULL: SlotName[] = ['lineart', 'title', 'halo', 'wings'];
const LITE: SlotName[] = ['lineart'];
const LITE_FPS = 8;
const DEFAULT_FPS = 10;
/** Pixels displaced per idle slice: about 8 ms on a mid-range phone. */
const SLICE_PIXELS = 120_000;
/** Re-render when the poster outgrows its frames by this much (rotation, resize). */
const REGROW = 1.25;

let generation = 0;
let style: HTMLStyleElement | null = null;
let urls: string[] = [];
let unobserve: (() => void) | null = null;
let resize: ResizeObserver | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`line-boil: could not rasterize ${src.slice(0, 40)}`));
    img.src = src;
  });
}

/**
 * The slot's art as an image. Inline vector slots are already in the page, so
 * they're serialized from it rather than fetched a second time (lineart is
 * ~95 KB gzip); `width`/`height` make the browser rasterize the vector at the
 * size we draw it.
 */
async function source(name: SlotName, width: number, height: number): Promise<HTMLImageElement> {
  const svg = slot(name).inline ? document.querySelector(`.layer--${name} .layer__art svg`) : null;
  if (!svg) return image(name);
  const clean = svg.cloneNode(true) as SVGSVGElement;
  // The file's own markup: no classes or inline styles other effects may have added.
  for (const el of [clean, ...clean.querySelectorAll('*')]) {
    el.removeAttribute('style');
    el.removeAttribute('class');
  }
  clean.setAttribute('width', String(width));
  clean.setAttribute('height', String(height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clean)], { type: 'image/svg+xml' }));
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** One layer's two re-drawings, cropped to the art: mask URLs and the crop as fractions of the poster. */
interface Frames {
  urls: [string, string];
  box: { x: number; y: number; w: number; h: number };
}

/** Bounding box of the non-transparent pixels, padded so a displaced line never clips. */
function bounds(alpha: Uint8Array, width: number, height: number, pad: number) {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!alpha[row + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  return { x: x0, y: y0, w: Math.min(width, x1 + pad + 1) - x0, h: Math.min(height, y1 + pad + 1) - y0 };
}

/** Renders the two re-drawings of one layer, cropped to its art. Null if the art is empty or the render went stale. */
async function renderLayer(name: SlotName, width: number, height: number, alive: () => boolean): Promise<Frames | null> {
  const img = await source(name, width, height);
  if (!alive()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('line-boil: no 2D context');
  // Each heavy step gets its own idle slice: rasterize, read back, find the art.
  ctx.drawImage(img, 0, 0, width, height);
  await idle();
  if (!alive()) return null;
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const full = new Uint8Array(width * height);
  for (let i = 0; i < full.length; i++) full[i] = rgba[i * 4 + 3]!;
  await idle();
  if (!alive()) return null;

  // Masks cover only the art (the title and halo are a fraction of the frame).
  const amplitude = AMPLITUDE * width;
  const crop = bounds(full, width, height, Math.ceil(amplitude) + 2);
  if (!crop) return null;
  const alpha = new Uint8Array(crop.w * crop.h);
  for (let y = 0; y < crop.h; y++) alpha.set(full.subarray((crop.y + y) * width + crop.x, (crop.y + y) * width + crop.x + crop.w), y * crop.w);
  canvas.width = crop.w;
  canvas.height = crop.h;

  const out: string[] = [];
  const rowsPerSlice = Math.max(1, Math.floor(SLICE_PIXELS / crop.w));
  try {
    for (const seed of SEEDS) {
      const pixels = ctx.createImageData(crop.w, crop.h); // RGB 0: black, alpha from the redraw
      // Amplitude and wavelength stay relative to the whole poster, so every layer boils alike.
      const job = redraw(alpha, pixels.data, crop.w, crop.h, seed, amplitude, WAVELENGTH * width);
      for (let y = 0; y < crop.h; y += rowsPerSlice) {
        await idle();
        if (!alive()) return null;
        job.rows(y, Math.min(crop.h, y + rowsPerSlice));
      }
      ctx.putImageData(pixels, 0, 0);
      const url = await blobUrl(canvas);
      if (!alive()) {
        URL.revokeObjectURL(url);
        return null;
      }
      out.push(url);
    }
  } finally {
    if (out.length < SEEDS.length) out.forEach((u) => URL.revokeObjectURL(u));
  }
  return {
    urls: out as [string, string],
    box: { x: crop.x / width, y: crop.y / height, w: crop.w / width, h: crop.h / height },
  };
}

const pct = (v: number) => `${(v * 100).toFixed(4)}%`;

/** The cycle, written for the rendered layers: masks, tint, timing and the freeze. */
function rules(layers: Map<SlotName, Frames>, cycleMs: number): string {
  const css: string[] = [];
  // ?freeze=<ms>: hold the drawing that time shows, so screenshots are deterministic.
  const timing = frozenAt === null ? `${cycleMs}ms step-end infinite` : `${cycleMs}ms step-end ${-frozenAt}ms infinite paused`;
  const parts = (scope: string) =>
    [...layers.keys()].flatMap((n) => [`${scope} .layer--${n}>.layer__boil`, `${scope} .layer--${n}::before`, `${scope} .layer--${n}::after`]).join(',');
  for (const [name, { urls: [a, b], box }] of layers) {
    const at = `html[${ATTR}~='on'] .layer--${name}`;
    const tint = `var(--${slot(name).tint})`;
    css.push(
      `${at}>.layer__boil{animation:c3-boil-live ${timing}}`,
      `${at}::before,${at}::after{content:'';position:absolute;left:${pct(box.x)};top:${pct(box.y)};width:${pct(box.w)};height:${pct(box.h)};` +
        `background-color:${tint};opacity:0;pointer-events:none;` +
        `-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}`,
      `${at}::before{-webkit-mask-image:url(${a});mask-image:url(${a});animation:c3-boil-a ${timing}}`,
      `${at}::after{-webkit-mask-image:url(${b});mask-image:url(${b});animation:c3-boil-b ${timing}}`,
    );
  }
  // Offscreen: hold the current drawing, tick nothing.
  css.push(`${parts(`html[${ATTR}~='paused']`)}{animation-play-state:paused}`);
  // While sketch-in hides or draws her line art (PLAN step 6), only the live
  // drawing can show that, so the cycle holds on drawing 0. fx-pending-sketch-in
  // is the boot script's hidden start (base.css); "drawing" is the handshake
  // sketch-in sets on its own <html data-fx-sketch-in> while it animates.
  css.push(`${parts(`html.fx-pending-sketch-in`)},${parts(`html[data-fx-sketch-in~='drawing']`)}{animation:none}`);
  return css.join('\n');
}

/**
 * Mask resolution: the poster at device pixels (DPR capped at 2), but never
 * beyond the manifest frame, which is all the detail her art has.
 */
function maskSize(poster: HTMLElement): { width: number; height: number } {
  const box = poster.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(dpr, frame.width / Math.max(1, box.width));
  return { width: Math.max(1, Math.round(box.width * scale)), height: Math.max(1, Math.round(box.height * scale)) };
}

async function render(root: HTMLElement, poster: HTMLElement, names: SlotName[], fps: number, gen: number): Promise<number> {
  const alive = () => gen === generation;
  const { width, height } = maskSize(poster);

  const layers = new Map<SlotName, Frames>();
  for (const name of names) {
    let frames: Frames | null = null;
    try {
      frames = await renderLayer(name, width, height, alive);
    } catch (err) {
      // One slot that won't load or draw keeps her clean line; the rest still boil.
      console.warn(`[c3] line-boil: skipped ${name}`, err);
    }
    if (!alive()) return width;
    if (!frames) continue; // empty art, or skipped
    urls.push(...frames.urls);
    layers.set(name, frames);
  }

  const next = document.createElement('style');
  next.textContent = rules(layers, (FRAMES * 1000) / fps);
  root.append(next);
  const stale = style;
  style = next;
  stale?.remove();
  return width;
}

export async function init(root: HTMLElement, opts: EffectOptions): Promise<void> {
  destroy();
  if (opts.quality === 'static') return;
  const poster = document.querySelector<HTMLElement>('.poster');
  if (!poster) return;
  const gen = generation;
  const names = (opts.quality === 'lite' ? LITE : FULL).filter((n) => document.querySelector(`.layer--${n}`));
  const fps = opts.quality === 'lite' ? LITE_FPS : number('fps-boil', DEFAULT_FPS);
  const html = document.documentElement;

  let rendered = await render(root, poster, names, fps, gen);
  if (gen !== generation) return;

  // Offscreen, the cycle pauses: nothing ticks for a poster nobody sees.
  let paused = false;
  const mark = () => html.setAttribute(ATTR, paused ? 'on paused' : 'on');
  unobserve = observeOnscreen(poster, (on) => {
    paused = !on;
    mark();
  });
  mark();

  // Rotation or a wider window: re-draw at the new size once it settles. One
  // re-draw at a time; a resize during one is picked up when it finishes.
  let timer = 0;
  let busy = false;
  const regrow = async () => {
    if (busy || gen !== generation || maskSize(poster).width <= rendered * REGROW) return;
    busy = true;
    const old = urls;
    urls = [];
    try {
      rendered = await render(root, poster, names, fps, gen);
    } catch (err) {
      // Keep the frames on screen; drop whatever the failed re-draw made.
      console.warn('[c3] line-boil: re-draw failed', err);
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls = old;
      return;
    } finally {
      busy = false;
    }
    old.forEach((u) => URL.revokeObjectURL(u)); // destroy() during the re-draw already revoked the new ones
    if (gen === generation) void regrow();
  };
  resize = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = window.setTimeout(regrow, 300);
  });
  resize.observe(poster);
}

export function destroy(): void {
  generation++;
  unobserve?.();
  unobserve = null;
  resize?.disconnect();
  resize = null;
  document.documentElement.removeAttribute(ATTR);
  style?.remove();
  style = null;
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = [];
}
