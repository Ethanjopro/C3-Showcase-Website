// crt-screens (SPEC §3 row 11, PLAN step 12). Scanlines, stepped static and a
// slight two-ink split on her screens.
//
// Targets are every [data-crt] element, of two kinds, told apart by where they
// sit (nothing here names a slot, so a screen she cuts or adds needs no code):
//   - poster screens: inside a poster layer (.layer[data-slot]) whose slot has
//     a rect, e.g. the eye screen. The static is masked to that slot's own
//     art, so it only sits on her ink panel, and her drawing gets a 1 px split:
//     accent on one side of every edge, --on-ink on the other (her two inks,
//     not RGB).
//   - glass: anything else, i.e. the portrait project screens. In teaser mode
//     they also show the teaser line from projects.json, a word per screen.
//
// The static is one tile of light specks (static.ts) masking an --on-ink fill.
// A step-end CSS transform walks it to a new offset at --fps-crt (10), so a
// step costs no JS and no repaint, and colorway swaps need no redraw: every
// color is a token. Each screen starts at a different step of the walk.
//
// SPEC §6 allows two effects ticking on one screen, and the poster already
// steps line-boil and paper-grain, so poster screens hold one frame of static
// (POSTER_STEPS; OWNER.md #17 asks whether the eye may step as well).
//
//   full, lite  the project screens' static steps at 10 fps. Nothing here
//               costs JS per step, so lite has no extras to drop.
//   static      one still frame (reduced motion)
//
// Offscreen screens pause (core/onscreen), and ?freeze=<ms> pins every screen
// to the frame that time shows, like the ticker.

import type { EffectOptions } from '../../core/effect';
import { content } from '../../core/content';
import { frozenAt } from '../../core/clock';
import { number } from '../../core/palette';
import { observeOnscreen } from '../../core/onscreen';
import { slot, slotNames, type Rect, type SlotName } from '../../core/art';
import { STEPS, TILE, keyframes, offsets, staticTile } from './static';
import { chunk } from './words';
import './style.css';

const DEFAULT_FPS = 10;
/** Steps between screens' starting frames; coprime with STEPS, so up to 12 screens all differ. */
const PHASE = 5;
/** Whether poster screens step too. Off: the poster already has two steppers (SPEC §6). */
const POSTER_STEPS = false;

interface Target {
  el: HTMLElement;
  /** The poster slot it sits in, with that slot's rect; null for glass. */
  poster: { name: SlotName; rect: Rect } | null;
}

let root: HTMLElement | null = null;
let style: HTMLStyleElement | null = null;
let screens: HTMLElement[] = [];
let offs: (() => void)[] = [];
let url: string | null = null;
let generation = 0;

/**
 * Every [data-crt] target. A poster screen needs its slot in the manifest
 * with a rect (c3-html only writes one then); one without is skipped rather
 * than stamping unmasked static over the poster.
 */
function targets(): Target[] {
  const out: Target[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('[data-crt]')) {
    const layer = el.closest<HTMLElement>('.layer[data-slot]');
    if (!layer) {
      out.push({ el, poster: null });
      continue;
    }
    const name = layer.dataset.slot;
    if (!name || !(slotNames as string[]).includes(name)) continue;
    const rect = slot(name as SlotName).rect;
    if (rect && rect.w > 0 && rect.h > 0) out.push({ el, poster: { name: name as SlotName, rect } });
  }
  return out;
}

/**
 * Lines a full-frame slot image up with a target that covers `rect` of the
 * frame: CSS mask shorthand, optionally nudged `dx` px sideways.
 */
function frameMask(src: string, { x, y, w, h }: Rect, dx = 0): string {
  const pos = (v: number, s: number) => (s >= 1 ? '0%' : `${((v / (1 - s)) * 100).toFixed(4)}%`);
  const px = dx ? `calc(${pos(x, w)} + ${dx}px)` : pos(x, w);
  return `url("${src}") ${px} ${pos(y, h)} / ${(100 / w).toFixed(4)}% ${(100 / h).toFixed(4)}% no-repeat`;
}

function maskTo(el: HTMLElement, value: string, composite?: 'subtract') {
  el.style.setProperty('-webkit-mask', value);
  el.style.setProperty('mask', value);
  if (composite) {
    el.style.setProperty('-webkit-mask-composite', 'source-out');
    el.style.setProperty('mask-composite', composite);
  }
}

/** Her art on a poster screen: mask the screen to it, and add the split. */
function posterScreen(crt: HTMLElement, name: SlotName, rect: Rect) {
  const src = slot(name).url;
  crt.classList.add('crt--poster');
  maskTo(crt, frameMask(src, rect));
  // Each fringe: her ink, minus her ink shifted 1 px, leaves a 1 px band along
  // one side of every edge.
  for (const [side, dx] of [['a', 1], ['b', -1]] as const) {
    const fringe = document.createElement('div');
    fringe.className = `crt__split crt__split--${side}`;
    maskTo(fringe, `${frameMask(src, rect)}, ${frameMask(src, rect, dx)}`, 'subtract');
    crt.append(fringe);
  }
}

/**
 * Shrinks the words together if the longest one overflows its screen, e.g.
 * new teaser copy with wide letters. Sizes are in container units, so one
 * factor, measured once the fonts are in, holds at every screen size.
 */
function fit(words: HTMLElement[]) {
  let factor = 1;
  for (const w of words) {
    const text = w.firstElementChild as HTMLElement;
    const room = w.clientWidth - parseFloat(getComputedStyle(w).paddingLeft) * 2;
    if (text.offsetWidth > room && room > 0) factor = Math.min(factor, room / text.offsetWidth);
  }
  words.forEach((w) => w.style.setProperty('--fit', factor.toFixed(3)));
}

export async function init(mount: HTMLElement, opts: EffectOptions): Promise<void> {
  destroy();
  const gen = generation;
  const moving = opts.quality !== 'static';
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  const tile = staticTile(dpr);
  const blobUrl = await new Promise<string>((resolve, reject) =>
    tile.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('crt-screens: toBlob failed'))), 'image/png'),
  );
  if (gen !== generation) {
    URL.revokeObjectURL(blobUrl);
    return;
  }
  url = blobUrl;
  root = mount;

  const fps = number('fps-crt', DEFAULT_FPS);
  const walk = offsets();
  style = document.createElement('style');
  style.textContent =
    keyframes(walk) +
    `.crt{--crt-tile:${TILE}px;--crt-mask:url("${blobUrl}");--crt-step:${1000 / fps}ms;--crt-steps:${STEPS};--crt-frozen:${frozenAt ?? 0}ms}`;
  mount.append(style);

  const all = targets();
  const glass = all.filter((t) => !t.poster);
  const words = content.projects.mode === 'teaser' ? chunk(content.projects.teaser, glass.length) : [];
  // One size for every screen, set by the longest chunk, so the line reads as one sentence.
  const len = Math.max(4, ...words.map((w) => w.length));
  const wordEls: HTMLElement[] = [];
  let g = 0; // index among the glass targets, in DOM order

  all.forEach(({ el, poster }, i) => {
    const phase = (i * PHASE) % STEPS;
    const stepping = moving && (!poster || POSTER_STEPS);
    const crt = document.createElement('div');
    crt.className = 'crt';
    crt.style.setProperty('--crt-phase', String(phase));

    const word = poster ? undefined : words[g++];
    if (word) {
      const w = document.createElement('div');
      w.className = 'crt__word';
      w.style.setProperty('--len', String(len));
      const text = document.createElement('span');
      text.textContent = word;
      w.append(text);
      crt.append(w);
      wordEls.push(w);
    }

    const field = document.createElement('div');
    field.className = stepping ? 'crt__static crt__static--moving' : 'crt__static';
    if (!stepping) {
      // One still frame: the step this screen (or the frozen clock) shows.
      const [x, y] = walk[(Math.floor(((frozenAt ?? 0) * fps) / 1000) + phase) % STEPS]!;
      field.style.transform = `translate(${x}px,${y}px)`;
    }
    crt.append(field);

    if (poster) posterScreen(crt, poster.name, poster.rect);
    else crt.classList.add('crt--glass');

    if (frozenAt !== null) crt.dataset.paused = '';
    else if (stepping) offs.push(observeOnscreen(el, (on) => (on ? delete crt.dataset.paused : (crt.dataset.paused = ''))));
    el.append(crt);
    screens.push(crt);
  });

  if (wordEls.length) {
    void document.fonts.ready.then(() => {
      if (gen === generation) fit(wordEls);
    });
  }

  // The tile is drawn at device resolution: rebuild it if the window moves to
  // a screen with a different pixel ratio (or the page is zoomed).
  if (dpr < 2) {
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    const redraw = () => void init(mount, opts);
    mq.addEventListener('change', redraw, { once: true });
    offs.push(() => mq.removeEventListener('change', redraw));
  }
  mount.dataset.state = moving ? 'moving' : 'still';
}

export function destroy(): void {
  generation++;
  offs.forEach((off) => off());
  offs = [];
  screens.forEach((s) => s.remove());
  screens = [];
  style?.remove();
  style = null;
  if (root) delete root.dataset.state;
  root = null;
  if (url) URL.revokeObjectURL(url);
  url = null;
}
