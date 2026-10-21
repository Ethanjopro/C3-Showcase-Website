// xray (SPEC §3 row 3, PLAN step 4). Through a hole in her drawing: the
// ribcage panel in halftone ink, like an X-ray film slipped under the figure.
//
// One canvas the size of the poster (DPR capped at 2) sits in the xray layer,
// above her ribcage slot and below the eye screen, cables, halo and title. The
// ribcage `rect` is pre-rendered once as halftone ink over --paper-2 (the
// "film"). Each frame draws a mask, then composites the film into it with
// `source-in`, so the film only shows where the mask is:
//   - fine pointer: a round lens (12 % of the poster width) on the smoothed
//     pointer, ringed with her registration mark, boiling at 10 fps
//   - touch: sideways strokes over the chest paint the mask with a 9 % brush;
//     each stroke heals over 4 s. The poster takes `touch-action: pan-y
//     pinch-zoom`, so vertical swipes still scroll and pinch-zoom still works.
//     A stroke the browser cancels (it became a scroll) is dropped.
//   - keyboard: the X-ray toggle in the poster's small print reveals the whole
//     rect in a stepped scan (12 fps), and hides it the same way.
// The ticker runs only while the lens shows, a stroke heals or a scan plays.
//
// Her solid panel stays on the poster at rest: the film is opaque, so inside
// the lens or a stroke it covers the panel, and outside them her drawing shows.
//
// Outside its mounts the effect writes only <html data-fx-xray>:
//   "live"      full or lite: the poster takes touch-action (style.css)
//   "static"    reduced motion
//   "revealed"  the toggle is pressed
//   "lens"      the lens shows: crosshair cursor
//
//   full    lens, strokes, stepped scan; the lens ring boils
//   lite    the same, with a still lens ring
//   static  toggle only, instant; no lens, no strokes

import type { EffectOptions } from '../../core/effect';
import { image, rect as slotRect, type Rect } from '../../core/art';
import { add as addTick, ticker } from '../../core/ticker';
import { local, onPointerDown, onPointerMove, onPointerUp, pointer, type LocalPoint } from '../../core/pointer';
import { color } from '../../core/palette';
import { on } from '../../core/bus';
import { frozenAt } from '../../core/clock';
import { halftone, roughStroke } from '../../core/raster';
import { roughFrame } from '../../core/rough-frame';
import copy from '../../content/xray.json';
import './style.css';

const ATTR = 'data-fx-xray';
/** Lens diameter, as a share of the poster width (PLAN: about 12 %). */
const LENS = 0.12;
/** Touch brush diameter, as a share of the poster width (PLAN: about 9 %). */
const BRUSH = 0.09;
/** A painted stroke fades back to her drawing over this long. */
const HEAL_MS = 4000;
/** Halftone cell, as a share of the poster width. Small enough that the ribs read. */
const CELL = 0.0085;
/** Ink density of her solid panel in the halftone: 0.6 makes the darkest dots just touch. */
const DOT_INK = 0.6;
/** The toggle's scan: this many steps at this rate (stepped, like her line). */
const SCAN_STEPS = 6;
const SCAN_FPS = 12;
/** The lens ring re-draws (boils) at this rate. */
const BOIL_FPS = 10;
/** Lens fade in and out, ms. Cursor motion stays smooth (CLAUDE.md). */
const LENS_FADE_MS = 120;
/** Ring line width, as a share of the poster width. */
const RING_LINE = 0.009;
const RING_POINTS = 28;
const RESIZE_DEBOUNCE_MS = 200;
/** A touch stroke paints once it has moved this far sideways, and more sideways than vertically. */
const SIDEWAYS_PX = 10;
/** The toggle's frame: her frame line, one bolder pass and no echo (it sits on small print). */
const TOGGLE_FRAME = [3];

interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
}

let generation = 0;
let poster: HTMLElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let film: HTMLCanvasElement | null = null;
let toggle: HTMLButtonElement | null = null;
let part: HTMLElement | null = null;
let mount: HTMLElement | null = null;
let rect: Rect | null = null;
let quality: EffectOptions['quality'] = 'full';
let ink = '';
let accent = '';
let offs: (() => void)[] = [];
let offTick: (() => void) | null = null;
let resize: ResizeObserver | null = null;
let resizeTimer = 0;

/** Painted strokes, oldest first, in poster-relative 0-1 coordinates. */
let segments: Segment[] = [];
/**
 * The touch stroke in progress: its pointer, where it began, its last point,
 * where its segments start, and whether it has shown itself to be sideways.
 */
let stroke: { id: number; sx: number; sy: number; x: number; y: number; first: number; sideways: boolean } | null = null;
let lensAlpha = 0;
let lastFade = 0;
let pointerGone = false;
/** The toggle: pressed, and when its scan started (ticker time). */
let revealed = false;
let scanStart = Number.NEGATIVE_INFINITY;
const here: LocalPoint = { x: 0, y: 0, inside: false };
/** What the last frame drew, so a still lens isn't redrawn 60 times a second. */
const drawn = { alpha: Number.NaN, x: Number.NaN, y: Number.NaN, step: Number.NaN, busy: false };
const ring: [number, number][] = Array.from({ length: RING_POINTS + 1 }, () => [0, 0]);

let attr = '';

/** Writes <html data-fx-xray> only when its tokens change (frame() calls this every frame). */
function setAttr() {
  const tokens = [quality === 'static' ? 'static' : 'live'];
  if (revealed) tokens.push('revealed');
  if (lensAlpha > 0) tokens.push('lens');
  const next = tokens.join(' ');
  if (next === attr) return;
  attr = next;
  document.documentElement.setAttribute(ATTR, next);
}

/** Canvas size in device pixels: the poster's layout box (untransformed) at DPR <= 2. */
function size(): { w: number; h: number; dpr: number } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  return { w: Math.max(1, Math.round(poster!.offsetWidth * dpr)), h: Math.max(1, Math.round(poster!.offsetHeight * dpr)), dpr };
}

/**
 * The film: her ribcage panel, cropped to its rect and redrawn as halftone ink
 * over --paper-2.
 */
async function renderFilm(w: number, h: number): Promise<HTMLCanvasElement | null> {
  const r = rect!;
  const img = await image('ribcage');
  const fw = Math.max(1, Math.round(r.w * w));
  const fh = Math.max(1, Math.round(r.h * h));
  const crop = document.createElement('canvas');
  crop.width = fw;
  crop.height = fh;
  const cctx = crop.getContext('2d');
  if (!cctx) return null;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  // raster.halftone sizes a full-ink dot at 1.25 cells, so solid ink would print
  // as a merged block. At DOT_INK the darkest dots just touch: it reads as dots.
  cctx.globalAlpha = DOT_INK;
  cctx.drawImage(img, r.x * nw, r.y * nh, r.w * nw, r.h * nh, 0, 0, fw, fh);
  const dots = halftone(crop, fw, fh, Math.max(3, Math.round(CELL * w)), color('ink'));

  const out = document.createElement('canvas');
  out.width = fw;
  out.height = fh;
  const octx = out.getContext('2d');
  if (!octx) return null;
  // An opaque sheet over the whole rect: inside the mask it covers her solid panel.
  octx.fillStyle = color('paper-2');
  octx.fillRect(0, 0, fw, fh);
  octx.drawImage(dots, 0, 0);
  return out;
}

/** Share of the rect the toggle's scan shows: stepped at 12 fps, instant when still or frozen. */
function scanShown(t: number): number {
  if (quality === 'static' || frozenAt !== null) return revealed ? 1 : 0;
  const steps = Math.min(SCAN_STEPS, Math.floor(((t - scanStart) * SCAN_FPS) / 1000) + 1);
  const shown = Math.max(0, steps) / SCAN_STEPS;
  return revealed ? shown : 1 - shown;
}

const scanning = (t: number) => quality !== 'static' && frozenAt === null && (t - scanStart) * SCAN_FPS < SCAN_STEPS * 1000;

/**
 * c3-window's letters still frame the poster (its "window" token, read-only):
 * the scroll is the moment's gesture, and the lens would run over parts the
 * letters hide (SPEC §3: one signature per moment).
 */
const windowed = () => document.documentElement.matches("[data-fx-c3-window~='window']");

/** Is the lens wanted: a hover-capable pointer, over the poster, still in the window, with the C3 window open? */
function lensWanted(): boolean {
  if (quality === 'static' || !poster || !pointer.fine || pointer.type === 'touch' || pointerGone || windowed()) return false;
  return local(poster, true, here).inside;
}

function draw(t: number) {
  if (!ctx || !canvas || !rect) return;
  const W = canvas.width;
  const H = canvas.height;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);
  if (!film) return;

  // 1. The mask: healing strokes, the lens, the toggle's scan. The film only
  // exists in the rect, so mask and composite are clipped to it: source-in
  // then touches the rect's pixels, not the whole poster-sized canvas.
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x * W, rect.y * H, rect.w * W, rect.h * H);
  ctx.clip();
  ctx.fillStyle = ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = BRUSH * W;
  for (const s of segments) {
    const a = 1 - (t - s.t) / HEAL_MS;
    if (a <= 0) continue;
    ctx.globalAlpha = Math.min(1, a);
    ctx.beginPath();
    ctx.moveTo(s.x0 * W, s.y0 * H);
    ctx.lineTo(s.x1 * W, s.y1 * H);
    ctx.stroke();
  }
  const lx = here.x * W;
  const ly = here.y * H;
  const lr = (LENS * W) / 2;
  if (lensAlpha > 0) {
    ctx.globalAlpha = lensAlpha;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
  }
  const shown = scanShown(t);
  if (shown > 0) {
    ctx.globalAlpha = 1;
    ctx.fillRect(rect.x * W, rect.y * H, rect.w * W, rect.h * H * shown);
  }

  // 2. The film, only where the mask is.
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(film, rect.x * W, rect.y * H, rect.w * W, rect.h * H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  // 3. The lens ring: her registration mark, a circle with a cross through it,
  // in the accent like the circle she drew round her chosen colorway (ink
  // would vanish on her ink panel).
  if (lensAlpha > 0) {
    ctx.globalAlpha = lensAlpha;
    ctx.strokeStyle = accent;
    const seed = quality === 'full' ? Math.floor((t * BOIL_FPS) / 1000) : 0;
    for (let i = 0; i <= RING_POINTS; i++) {
      const a = (i / RING_POINTS) * Math.PI * 2;
      const p = ring[i]!;
      p[0] = lx + Math.cos(a) * lr;
      p[1] = ly + Math.sin(a) * lr;
    }
    const lw = Math.max(1.5, RING_LINE * W);
    roughStroke(ctx, ring, seed * 7 + 3, lw);
    const tick = lr * 0.35;
    tickLine(lx - lr - tick, ly, lx - lr + tick * 0.6, ly, seed * 7 + 4, lw);
    tickLine(lx + lr - tick * 0.6, ly, lx + lr + tick, ly, seed * 7 + 5, lw);
    tickLine(lx, ly - lr - tick, lx, ly - lr + tick * 0.6, seed * 7 + 6, lw);
    tickLine(lx, ly + lr - tick * 0.6, lx, ly + lr + tick, seed * 7 + 8, lw);
  }
  ctx.globalAlpha = 1;
}

const tickPts: [number, number][] = [
  [0, 0],
  [0, 0],
];
function tickLine(x0: number, y0: number, x1: number, y1: number, seed: number, lw: number) {
  tickPts[0]![0] = x0;
  tickPts[0]![1] = y0;
  tickPts[1]![0] = x1;
  tickPts[1]![1] = y1;
  roughStroke(ctx!, tickPts, seed, lw);
}

function frame(t: number) {
  const now = performance.now();
  // The lens fades on wall-clock time: under ?freeze the ticker's dt is 0, and
  // the lens must still appear for screenshots.
  const dt = Math.min(100, now - lastFade);
  lastFade = now;
  const want = lensWanted();
  const k = 1 - Math.exp(-dt / LENS_FADE_MS);
  lensAlpha += ((want ? 1 : 0) - lensAlpha) * k;
  if (!want && lensAlpha < 0.02) lensAlpha = 0;
  if (want && lensAlpha > 0.98) lensAlpha = 1;
  if (!want) local(poster!, true, here); // keep the fading lens where the pointer left it

  while (segments.length && t - segments[0]!.t >= HEAL_MS && (!stroke || stroke.first > 0)) {
    segments.shift();
    if (stroke) stroke.first--;
  }
  // A lens resting still over the chest changes nothing until its ring's
  // next boil step: skip the redraw. Healing strokes and scans always draw,
  // and so does the frame after they end: it lands their final state (the
  // last stroke's faint remains cleared, the scan's last step), which the
  // last frame drawn while they ran may not show.
  const step = quality === 'full' ? Math.floor((t * BOIL_FPS) / 1000) : 0;
  const busy = segments.length > 0 || scanning(t);
  const still = !busy && !drawn.busy && lensAlpha === drawn.alpha && here.x === drawn.x && here.y === drawn.y && step === drawn.step;
  if (!still) {
    draw(t);
    drawn.alpha = lensAlpha;
    drawn.x = here.x;
    drawn.y = here.y;
    drawn.step = step;
    drawn.busy = busy;
  }
  setAttr();
  if (!want && lensAlpha === 0 && !segments.length && !stroke && !scanning(t)) stop();
}

function start() {
  drawn.alpha = Number.NaN; // something changed: the next frame draws
  if (offTick || !poster) return;
  lastFade = performance.now();
  offTick = addTick(frame, { el: poster });
}

function stop() {
  offTick?.();
  offTick = null;
}

/** Pointer-relative point inside the brush's reach of the ribcage rect? */
function nearChest(p: LocalPoint): boolean {
  const r = rect!;
  const pad = BRUSH / 2;
  const padY = (pad * poster!.offsetWidth) / Math.max(1, poster!.offsetHeight);
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - padY && p.y <= r.y + r.h + padY;
}

function onDown(_p: typeof pointer, e: PointerEvent) {
  // Touch and pen scribble (an Apple Pencil has no hover, so no lens); a mouse has the lens.
  // A pen that can hover (pointer.fine) has the lens, so it doesn't scribble too.
  if (e.pointerType === 'mouse' || (e.pointerType === 'pen' && pointer.fine) || stroke || !poster) return;
  // Not while c3-window's letters still frame the poster, as for the lens.
  if (windowed()) return;
  const p = local(poster, false, { x: 0, y: 0, inside: false });
  // A scribble may start anywhere on the poster; only its marks near the chest paint.
  if (!p.inside) return;
  stroke = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, first: segments.length, sideways: false };
}

function onMove(_p: typeof pointer, e: PointerEvent) {
  if (stroke && e.pointerId === stroke.id && poster) {
    const p = local(poster, false, { x: 0, y: 0, inside: false });
    // Nothing paints until the stroke runs more sideways than up or down
    // (in px), so a swipe that becomes a scroll never flashes the film.
    if (!stroke.sideways) {
      const dx = Math.abs(p.x - stroke.sx) * poster.offsetWidth;
      const dy = Math.abs(p.y - stroke.sy) * poster.offsetHeight;
      if (dx < SIDEWAYS_PX || dx <= dy) return;
      stroke.sideways = true;
      stroke.x = stroke.sx;
      stroke.y = stroke.sy;
    }
    if (nearChest(p) || nearChest({ x: stroke.x, y: stroke.y, inside: true })) {
      segments.push({ x0: stroke.x, y0: stroke.y, x1: p.x, y1: p.y, t: ticker.now() });
    }
    stroke.x = p.x;
    stroke.y = p.y;
    start();
    return;
  }
  pointerGone = false;
  if (lensWanted()) start();
}

function onUp(_p: typeof pointer, e: PointerEvent) {
  if (!stroke || e.pointerId !== stroke.id) return;
  // Cancelled: the browser took the gesture as a scroll. Its first few moves
  // were the scroll, not a scribble, so they go.
  if (e.type === 'pointercancel') segments.splice(stroke.first);
  stroke = null;
  start(); // draw once more, then stop if nothing is left
}

function onLeave() {
  pointerGone = true;
  start();
}

function setRevealed(on: boolean) {
  // Pressed mid-scan, the scan turns round where it is instead of restarting
  // from the far end.
  const now = ticker.now();
  const was = scanning(now) ? scanShown(now) : revealed ? 1 : 0;
  revealed = on;
  toggle?.setAttribute('aria-pressed', String(on));
  if (mount) mount.dataset.state = on ? 'revealed' : 'ready';
  const step = Math.round((on ? was : 1 - was) * SCAN_STEPS); // steps already behind us
  scanStart = now - (step * 1000) / SCAN_FPS;
  setAttr();
  start();
  if (quality === 'static') {
    // No ticking needed: draw the end state now.
    draw(ticker.now());
    stop();
  }
}

/** Re-draws the film at the canvas size (resize, colorway), then the current frame. */
async function refresh(gen: number) {
  if (!canvas || !poster) return;
  const { w, h } = size();
  const next = await renderFilm(w, h);
  if (gen !== generation || !canvas || !next) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  film = next;
  ink = color('ink');
  accent = color('accent');
  draw(ticker.now());
}

/** The toggle in the poster's small print, with its hint. Built here: it needs JS. */
function buildToggle(host: HTMLElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'xray-toggle';
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = `<span class="xray-toggle__film" aria-hidden="true"></span><span class="xray-toggle__label"></span>${roughFrame(29, TOGGLE_FRAME)}`;
  button.querySelector('.xray-toggle__label')!.textContent = copy.toggle;
  const hint = document.createElement('span');
  hint.className = 'xray-hint';
  hint.id = 'xray-hint';
  button.setAttribute('aria-describedby', hint.id);
  hint.textContent = quality === 'static' ? copy.hint.static : pointer.fine ? copy.hint.pointer : copy.hint.touch;
  host.append(button, hint);
  return button;
}

export async function init(root: HTMLElement, opts: EffectOptions): Promise<void> {
  destroy();
  const gen = generation;
  poster = document.querySelector<HTMLElement>('.poster');
  rect = slotRect('ribcage') ?? null;
  if (!poster || !rect) return;
  quality = opts.quality;
  mount = root;
  ink = color('ink');
  accent = color('accent');

  canvas = document.createElement('canvas');
  canvas.className = 'xray';
  ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('xray: no 2D context');
  const { w, h } = size();
  canvas.width = w;
  canvas.height = h;
  film = await renderFilm(w, h);
  if (gen !== generation) return;
  root.append(canvas);

  part = document.querySelector<HTMLElement>('[data-fx="xray"][data-part="toggle"]');
  if (part) {
    toggle = buildToggle(part);
    toggle.addEventListener('click', () => setRevealed(!revealed));
  }

  if (quality !== 'static') {
    offs.push(onPointerDown(onDown), onPointerMove(onMove), onPointerUp(onUp));
    document.documentElement.addEventListener('pointerleave', onLeave);
    offs.push(() => document.documentElement.removeEventListener('pointerleave', onLeave));
  }
  offs.push(on('colorway', () => void refresh(gen)));

  // Rotation or a wider window: re-draw the film at the new size once it settles.
  resize = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const s = size();
      if (canvas && (s.w !== canvas.width || s.h !== canvas.height)) void refresh(gen);
    }, RESIZE_DEBOUNCE_MS);
  });
  resize.observe(poster);

  root.dataset.state = 'ready';
  setAttr();
  if (lensWanted()) start();
}

export function destroy(): void {
  generation++;
  stop();
  offs.forEach((off) => off());
  offs = [];
  resize?.disconnect();
  resize = null;
  clearTimeout(resizeTimer);
  canvas?.remove();
  canvas = null;
  ctx = null;
  film = null;
  part?.replaceChildren();
  part = null;
  toggle = null;
  if (mount) delete mount.dataset.state;
  mount = null;
  poster = null;
  segments = [];
  stroke = null;
  lensAlpha = 0;
  revealed = false;
  scanStart = Number.NEGATIVE_INFINITY;
  pointerGone = false;
  attr = '';
  document.documentElement.removeAttribute(ATTR);
}
