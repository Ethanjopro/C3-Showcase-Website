// c3-window (SPEC §3 row 4, PLAN step 5). On arrival a giant cropped "C3" in
// her lettering, with the poster showing only through the letters; scrolling
// opens the window onto the full poster.
//
//   1. The letters are her own: the inline title SVG's paths that sit in the
//      manifest's `regions.c3` (found with getBBox, so her final title needs
//      no code change), copied into a mask image.
//   2. `.poster-stage` (the element this effect owns: mask, clip, scale, pin)
//      gets that mask, with the letters wider than the poster, so its edges
//      crop them: a cropped wordmark. A slight `transform: scale` brings the
//      crop out toward the viewport's edges, but never so far that the
//      stage's box leaves the viewport or reaches the small print, which
//      stays outside the stage, readable and tappable around the letters.
//      A clip-path to the letters' box keeps the stage from taking taps where
//      the mask hides it (masks don't stop taps).
//      On wide screens the poster's edges sit mid-page, where a crop reads as
//      a clipping bug, so there the letters stay whole.
//      Where a letter crosses bare poster paper it would vanish into the
//      page's paper, so her letters' own outline, in ink, sits in this
//      effect's mount under the same mask: only its inner half shows, an
//      inked edge, boiling at 10 fps like her line; it fades as the window
//      opens.
//   3. Scrolling, pinned for at most one viewport (PIN), zooms into one point
//      deep inside a letter stroke (the centre of the largest circle that fits
//      in the letters) until that stroke covers the whole stage, while the
//      stage scales back to 1. Then the mask goes: the full poster. Scrolling
//      back reverses it. The zoom is a mask-size/-position change, the scale a
//      transform; no layout property moves.
//   4. The pin holds `#poster`, the section, not `.poster-stage`: pinning the
//      stage alone either pushes the small print out of the first screen (the
//      pin spacer) or lets the next sections slide under the pinned poster.
//      The PR proposes this as a writer-table change.
//
// The ticker never pauses for it, so line-boil and sketch-in play inside the
// letters. The mount carries data-state: closed | opening | open.
//
//   full, lite  as above (it has no extras to drop)
//   static      nothing: the window starts open, no pin

import type { EffectOptions } from '../../core/effect';
import { frame, slot, type Rect } from '../../core/art';
import { frozenAt } from '../../core/clock';
import './style.css';

const ATTR = 'data-fx-c3-window';
/** Pinned scroll, as a share of the viewport height (SPEC §6: at most one screen). */
const PIN = 0.85;
/** Letter width at arrival, as a share of the poster's width: wider, so its edges crop them. */
const LETTER_W = 1.1;
/**
 * Where the poster's edges sit mid-page (wide screens) a crop would read as a
 * clipping bug, so the letters stay whole there, at this width.
 */
const LETTER_W_WHOLE = 0.94;
/** The poster's edges count as the screen's edges within this many px (a phone's gutter). */
const EDGE_GUTTER = 40;
/** Where the letters sit in the poster at arrival: their centre, as a share of its height. */
const LETTER_Y = 0.5;
/** Most the stage scales up at arrival. It also stays inside the viewport and clear of the small print. */
const STAGE_MAX = 1.12;
/** Gap kept between the scaled stage and the small print, px. */
const CLEAR = 8;
/** The inked letter edge fades out over this much of the opening. */
const OUTLINE_FADE = 0.3;
/** Resolution of the distance field that finds the deepest point in the letters. */
const FIELD = 192;

interface Letters {
  /** The letters' box in frame units. */
  box: Rect;
  /** The mask image. */
  url: string;
  /** The same paths, for the inked edge. */
  paths: string;
  rule: string;
  /** Deepest point inside the letters (frame units) and its distance to the edge. */
  deep: { x: number; y: number; r: number };
}

interface Geometry {
  w: number;
  h: number;
  /** Stage scale at arrival. */
  s0: number;
  /** Mask scale at arrival and when the deepest stroke covers the stage. */
  k0: number;
  k1: number;
  /** The zoom's fixed point, stage-local px. */
  zx: number;
  zy: number;
}

let generation = 0;
let stage: HTMLElement | null = null;
let mount: HTMLElement | null = null;
let outline: SVGSVGElement | null = null;
let masked = false;
let lastAttr = '';
let letters: Letters | null = null;
let geo: Geometry | null = null;
let kill: (() => void) | null = null;
let last = -1;
let resizeTimer = 0;
let onResize: (() => void) | null = null;

/** The title's paths that sit in the C3 region, and the box around them. */
function findLetters(svg: SVGSVGElement, region: Rect): { paths: SVGPathElement[]; box: Rect } | null {
  const fw = frame.width;
  const fh = frame.height;
  const r = { x: region.x * fw, y: region.y * fh, w: region.w * fw, h: region.h * fh };
  const paths: SVGPathElement[] = [];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of svg.querySelectorAll('path')) {
    const b = p.getBBox();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    if (cx < r.x || cx > r.x + r.w || cy < r.y || cy > r.y + r.h) continue;
    paths.push(p);
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  }
  if (!paths.length) return null;
  // Padded, so the mask image's edge rows are clear: an inked row at the very
  // edge would bleed into a hairline when the mask is scaled.
  const pad = Math.max(x1 - x0, y1 - y0) * 0.02;
  return { paths, box: { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad } };
}

/**
 * The deepest point inside the letters: a small raster of them, then a
 * two-pass chamfer distance transform. Zooming into that point opens the
 * window soonest, because the stroke there is thickest.
 */
function deepest(ds: string[], box: Rect, rule: CanvasFillRule): { x: number; y: number; r: number } {
  const cw = FIELD;
  const ch = Math.max(1, Math.round((FIELD * box.h) / box.w));
  const scale = cw / box.w;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const fallback = { x: box.x + box.w / 2, y: box.y + box.h / 2, r: Math.min(box.w, box.h) * 0.05 };
  if (!ctx) return fallback;
  ctx.setTransform(scale, 0, 0, scale, -box.x * scale, -box.y * scale);
  for (const d of ds) ctx.fill(new Path2D(d), rule);
  const a = ctx.getImageData(0, 0, cw, ch).data;
  const big = 1e9;
  const dist = new Float32Array(cw * ch);
  for (let i = 0; i < dist.length; i++) dist[i] = a[i * 4 + 3]! > 127 ? big : 0;
  const D1 = 1;
  const D2 = Math.SQRT2;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cw || y >= ch ? 0 : dist[y * cw + x]!);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i]!, at(x - 1, y) + D1, at(x, y - 1) + D1, at(x - 1, y - 1) + D2, at(x + 1, y - 1) + D2);
    }
  let best = -1;
  let bx = 0;
  let by = 0;
  for (let y = ch - 1; y >= 0; y--)
    for (let x = cw - 1; x >= 0; x--) {
      const i = y * cw + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i]!, at(x + 1, y) + D1, at(x, y + 1) + D1, at(x + 1, y + 1) + D2, at(x - 1, y + 1) + D2);
      if (dist[i]! > best) {
        best = dist[i]!;
        bx = x;
        by = y;
      }
    }
  if (best <= 0) return fallback;
  return { x: box.x + (bx + 0.5) / scale, y: box.y + (by + 0.5) / scale, r: best / scale };
}

function buildLetters(): Letters | null {
  const svg = stage!.querySelector<SVGSVGElement>('.layer--title svg');
  const region = slot('title').regions?.c3;
  if (!svg || !region) return null;
  const found = findLetters(svg, region);
  if (!found) return null;
  const { box } = found;
  const rule = (svg.getAttribute('fill-rule') as CanvasFillRule | null) ?? 'nonzero';
  const ds = found.paths.map((p) => p.getAttribute('d') ?? '');
  // The mask is an alpha mask: only the paths' coverage counts, not their color.
  const body = ds.map((d) => `<path d="${d}"/>`).join('');
  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" ` +
    `preserveAspectRatio="none" fill-rule="${rule}">${body}</svg>`;
  return { box, url: `url("data:image/svg+xml,${encodeURIComponent(markup)}")`, paths: body, rule, deep: deepest(ds, box, rule) };
}

/**
 * How far the stage may scale (about its centre): never past the viewport's
 * sides, and never onto small print beside it (wide screens' margins) or
 * above or below it (a phone's date and location).
 */
function maxScale(box: DOMRect): number {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  let half = Math.min(cx, window.innerWidth - cx);
  let halfY = Infinity;
  for (const el of document.querySelectorAll<HTMLElement>('.poster-print > *, .poster-print .colorbar')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const besideY = r.bottom > box.top && r.top < box.bottom;
    const besideX = r.right > box.left && r.left < box.right;
    if (besideY && r.right <= box.left) half = Math.min(half, cx - r.right - CLEAR);
    else if (besideY && r.left >= box.right) half = Math.min(half, r.left - cx - CLEAR);
    else if (besideX && r.bottom <= box.top) halfY = Math.min(halfY, cy - r.bottom - CLEAR);
    else if (besideX && r.top >= box.bottom) halfY = Math.min(halfY, r.top - cy - CLEAR);
  }
  return Math.max(1, Math.min(STAGE_MAX, (2 * half) / box.width, (2 * halfY) / box.height));
}

/** Layout numbers for the current viewport; read with the stage untransformed. */
function measure(): Geometry {
  const s = stage!;
  const L = letters!;
  const prev = s.style.transform;
  s.style.transform = 'none';
  const box = s.getBoundingClientRect();
  s.style.transform = prev;
  const w = s.offsetWidth;
  const h = s.offsetHeight;
  const f = w / frame.width; // stage px per frame unit
  const s0 = maxScale(box);
  const atEdges = box.left < EDGE_GUTTER && window.innerWidth - box.right < EDGE_GUTTER;
  const k0 = ((atEdges ? LETTER_W : LETTER_W_WHOLE) * w) / (L.box.w * f);
  // At arrival the letters are centred across the stage at LETTER_Y.
  const left = (w - L.box.w * f * k0) / 2;
  const top = LETTER_Y * h - (L.box.h * f * k0) / 2;
  const zx = left + (L.deep.x - L.box.x) * f * k0;
  const zy = top + (L.deep.y - L.box.y) * f * k0;
  // Fully open: the deepest stroke's disc, around the zoom point, covers every corner.
  const reach = Math.max(Math.hypot(zx, zy), Math.hypot(w - zx, zy), Math.hypot(zx, h - zy), Math.hypot(w - zx, h - zy));
  const k1 = Math.max(k0 * 2, (reach / (L.deep.r * f)) * 1.05);
  if (outline) {
    outline.setAttribute('width', (L.box.w * f * k0).toFixed(2));
    outline.setAttribute('height', (L.box.h * f * k0).toFixed(2));
  }
  return { w, h, s0, k0, k1, zx, zy };
}

const MASK_PROPS = ['mask-image', 'mask-repeat', 'mask-position', 'mask-size'];

function clearStage(el: HTMLElement) {
  for (const prop of ['transform', 'clip-path', ...MASK_PROPS, ...MASK_PROPS.map((m) => `-webkit-${m}`)]) el.style.removeProperty(prop);
  masked = false;
}

/** Writes a mask property, prefixed too. */
function setMask(el: HTMLElement, prop: string, value: string) {
  el.style.setProperty(`-webkit-${prop}`, value);
  el.style.setProperty(prop, value);
}

/** Writes the state attributes only when they change (apply runs on every scroll update). */
function setState(state: string, attr: string) {
  if (mount && mount.dataset.state !== state) mount.dataset.state = state;
  if (attr !== lastAttr) {
    lastAttr = attr;
    document.documentElement.setAttribute(ATTR, attr);
  }
}

/** Applies progress p (0 closed, 1 open) to the stage: transform and mask only. */
function apply(p: number) {
  if (!stage || !geo || !letters) return;
  last = p;
  // ScrollTrigger can report a hair above 0 at the very top.
  const state = p >= 1 ? 'open' : p < 0.001 ? 'closed' : 'opening';
  if (mount) mount.dataset.progress = p.toFixed(3);
  if (p >= 1) {
    if (masked) clearStage(stage);
    setState(state, 'open');
    return;
  }
  setState(state, 'window');
  const { w, h, s0, k0, k1, zx, zy } = geo;
  const f = w / frame.width;
  // Log-space: each step of scroll zooms by the same factor, so the dive feels even.
  const k = k0 * (k1 / k0) ** p;
  const s = s0 ** (1 - p);
  const L = letters;
  const mw = L.box.w * f * k;
  const mh = L.box.h * f * k;
  // The zoom point stays put: the deepest point of the letters sits at (zx, zy).
  const mx = zx - (L.deep.x - L.box.x) * f * k;
  const my = zy - (L.deep.y - L.box.y) * f * k;
  // The image (a 13 kB data URL) is written once; each update moves and sizes it.
  if (!masked) {
    setMask(stage, 'mask-image', letters.url);
    setMask(stage, 'mask-repeat', 'no-repeat');
    masked = true;
  }
  setMask(stage, 'mask-position', `${mx.toFixed(2)}px ${my.toFixed(2)}px`);
  setMask(stage, 'mask-size', `${mw.toFixed(2)}px ${mh.toFixed(2)}px`);
  // A mask hides but still takes taps: clip the stage to the letters' box too.
  const px = (v: number) => `${Math.max(0, v).toFixed(2)}px`;
  stage.style.clipPath = `inset(${px(my)} ${px(w - mx - mw)} ${px(h - my - mh)} ${px(mx)})`;
  if (outline) {
    outline.style.transform = `translate(${mx.toFixed(2)}px, ${my.toFixed(2)}px) scale(${(k / k0).toFixed(4)})`;
    outline.style.opacity = String(Math.max(0, 1 - p / OUTLINE_FADE));
  }
  stage.style.transform = s > 1.0005 ? `scale(${s.toFixed(4)})` : '';
}

/** `?c3=<0-1>` scrolls to that progress once the pin exists: deterministic screenshots. */
function forced(): number | null {
  const v = new URLSearchParams(location.search).get('c3');
  const n = v === null || v === '' ? NaN : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
}

export async function init(root: HTMLElement, opts: EffectOptions): Promise<void> {
  destroy();
  if (opts.quality === 'static') return; // the window starts open, no pin
  const gen = generation;
  mount = root;
  stage = root.closest<HTMLElement>('.poster-stage');
  const section = stage?.closest<HTMLElement>('section');
  if (!stage || !section) return;
  letters = buildLetters();
  if (!letters) return;
  root.insertAdjacentHTML(
    'beforeend',
    `<svg class="c3-window__ink" viewBox="${letters.box.x} ${letters.box.y} ${letters.box.w} ${letters.box.h}" ` +
      `preserveAspectRatio="none" fill-rule="${letters.rule}" aria-hidden="true" focusable="false">` +
      `<g class="c3-window__boil">${letters.paths}</g></svg>`,
  );
  outline = root.lastElementChild as SVGSVGElement;
  // Her line boils: the edge steps through three positions at 10 fps
  // (style.css). ?freeze holds the step that time shows, like line-boil.
  if (frozenAt !== null) {
    const g = outline.firstElementChild as SVGGElement;
    g.style.animationDelay = `${-frozenAt}ms`;
    g.style.animationPlayState = 'paused';
  }
  geo = measure();
  apply(0);

  // The scroll module brings GSAP and ScrollTrigger. It loads after the closed
  // window is on screen, so the poster isn't held back by it (main.ts reveals
  // the prehidden stage once init settles).
  void import('../../core/scroll').then(({ progress }) => {
    if (gen !== generation || !section) return;
    // A relative end in % is a share of the viewport height, and ScrollTrigger
    // re-reads it on every refresh (rotation, resize).
    kill = progress(section, (p) => apply(p), { start: 'top top', end: `+=${PIN * 100}%`, pin: true });
    const to = forced();
    if (to !== null) {
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + to * window.innerHeight * PIN, behavior: 'instant' });
    }
    if (mount) mount.dataset.ready = '';
  });

  onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (gen !== generation || !stage || !letters) return;
      geo = measure();
      apply(last < 0 ? 0 : last);
    }, 150);
  };
  window.addEventListener('resize', onResize, { passive: true });
}

export function destroy(): void {
  generation++;
  kill?.();
  kill = null;
  if (onResize) window.removeEventListener('resize', onResize);
  onResize = null;
  clearTimeout(resizeTimer);
  if (stage) clearStage(stage);
  outline?.remove();
  outline = null;
  if (mount) {
    delete mount.dataset.state;
    delete mount.dataset.ready;
    delete mount.dataset.progress;
  }
  document.documentElement.removeAttribute(ATTR);
  lastAttr = '';
  stage = null;
  mount = null;
  letters = null;
  geo = null;
  last = -1;
}
