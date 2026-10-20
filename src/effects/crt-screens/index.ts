// crt-screens (SPEC §3 row 11, PLAN step 12). Scanlines, stepped static and a
// slight two-ink split on her screens.
//
// Targets are every [data-crt] element, of two kinds, told apart by where they
// sit (nothing here names a slot, so a screen she cuts or adds needs no code):
//   - poster screens: inside a poster layer (.layer[data-slot]), e.g. the eye
//     screen. The static is masked to that slot's own art, so it only crawls
//     on her ink panel, and her drawing gets a 1 px split: accent on one side
//     of every edge, --on-ink on the other (her two inks, not RGB).
//   - glass: anything else, i.e. the portrait project screens. They also show
//     the teaser line from projects.json, a word or two per screen.
//
// The static is one tile of light specks (static.ts) masking an --on-ink fill.
// A step-end CSS transform walks it to a new offset at --fps-crt (10), so a
// step costs no JS and no repaint, and colorway swaps need no redraw: every
// color is a token. Each screen starts at a different step of the walk.
//
//   full    static at 10 fps; the words slip sideways for one step now and then
//   lite    static at 10 fps; no slip
//   static  one still frame (reduced motion)
//
// Offscreen screens pause (core/onscreen), and ?freeze=<ms> pins every screen
// to the frame that time shows, like the ticker.

import type { EffectOptions } from '../../core/effect';
import { content } from '../../core/content';
import { frozenAt } from '../../core/clock';
import { number } from '../../core/palette';
import { observeOnscreen } from '../../core/onscreen';
import { slot, slotNames, type SlotName } from '../../core/art';
import { STEPS, TILE, keyframes, offsets, staticTile } from './static';
import { chunk } from './words';
import './style.css';

const DEFAULT_FPS = 10;
/** Steps between screens' starting frames; coprime with STEPS, so up to 12 screens all differ. */
const PHASE = 5;
/** The word slip's cycle, in steps (2.3 s at 10 fps). Prime, so it never lines up with the static's loop. */
const SLIP_STEPS = 23;
/** Steps between screens' slips, so they never slip together. */
const SLIP_PHASE = 7;

let root: HTMLElement | null = null;
let style: HTMLStyleElement | null = null;
let screens: HTMLElement[] = [];
let offs: (() => void)[] = [];
let url: string | null = null;
let generation = 0;

/** The poster slot a target belongs to, if it sits in one and the manifest has it. */
function posterSlot(target: HTMLElement): SlotName | null {
  const name = target.closest<HTMLElement>('.layer[data-slot]')?.dataset.slot;
  return name && (slotNames as string[]).includes(name) ? (name as SlotName) : null;
}

/**
 * Lines a full-frame slot image up with a target that covers `rect` of the
 * frame: CSS mask-size and mask-position values, plus an x offset in px.
 */
function frameMask(src: string, x: number, y: number, w: number, h: number, dx = 0): string {
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
function posterScreen(crt: HTMLElement, target: HTMLElement, name: SlotName) {
  const s = slot(name);
  const layer = target.closest<HTMLElement>('.layer');
  // The manifest rect is where c3-html put the target; measure it if it's missing.
  const r = s.rect ?? {
    x: target.offsetLeft / (layer?.clientWidth || 1),
    y: target.offsetTop / (layer?.clientHeight || 1),
    w: target.offsetWidth / (layer?.clientWidth || 1),
    h: target.offsetHeight / (layer?.clientHeight || 1),
  };
  if (r.w <= 0 || r.h <= 0) return;
  maskTo(crt, frameMask(s.url, r.x, r.y, r.w, r.h));
  // Each fringe: her ink, minus her ink shifted 1 px, leaves a 1 px band along
  // one side of every edge.
  for (const [side, dx] of [['a', 1], ['b', -1]] as const) {
    const fringe = document.createElement('div');
    fringe.className = `crt__split crt__split--${side}`;
    maskTo(fringe, `${frameMask(s.url, r.x, r.y, r.w, r.h)}, ${frameMask(s.url, r.x, r.y, r.w, r.h, dx)}`, 'subtract');
    crt.append(fringe);
  }
}

function build(target: HTMLElement, i: number, word: string | undefined, len: number, moving: boolean, slip: boolean): HTMLElement {
  const crt = document.createElement('div');
  crt.className = 'crt';
  crt.style.setProperty('--crt-phase', String((i * PHASE) % STEPS));
  crt.style.setProperty('--crt-slip-phase', String((i * SLIP_PHASE) % SLIP_STEPS));

  if (word) {
    const w = document.createElement('div');
    w.className = 'crt__word';
    if (slip) w.classList.add('crt__word--slip');
    w.textContent = word;
    w.style.setProperty('--len', String(len));
    crt.append(w);
  }

  const field = document.createElement('div');
  field.className = moving ? 'crt__static crt__static--moving' : 'crt__static';
  crt.append(field);

  const name = posterSlot(target);
  if (name) {
    crt.classList.add('crt--poster');
    posterScreen(crt, target, name);
  } else {
    crt.classList.add('crt--glass');
  }
  return crt;
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
  style.textContent = keyframes(walk, SLIP_STEPS);
  mount.append(style);

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-crt]'));
  const glass = targets.filter((t) => !posterSlot(t));
  const words = chunk(content.projects.teaser, glass.length);
  // One size for every screen, set by the longest chunk, so the line reads as one sentence.
  const len = Math.max(4, ...words.map((w) => w.length));

  targets.forEach((target, i) => {
    const word = posterSlot(target) ? undefined : words[glass.indexOf(target)];
    const crt = build(target, i, word, len, moving, opts.quality === 'full');
    crt.style.setProperty('--crt-tile', `${TILE}px`);
    crt.style.setProperty('--crt-mask', `url("${blobUrl}")`);
    crt.style.setProperty('--crt-step', `${1000 / fps}ms`);
    crt.style.setProperty('--crt-steps', String(STEPS));
    crt.style.setProperty('--crt-slip-steps', String(SLIP_STEPS));
    crt.style.setProperty('--crt-frozen', `${frozenAt ?? 0}ms`);
    if (!moving) {
      // One still frame: the step this screen (or the frozen clock) shows.
      const step = (Math.floor(((frozenAt ?? 0) * fps) / 1000) + ((i * PHASE) % STEPS)) % STEPS;
      const [x, y] = walk[step]!;
      crt.querySelector<HTMLElement>('.crt__static')!.style.transform = `translate(${x}px,${y}px)`;
    }
    if (frozenAt !== null) crt.dataset.paused = '';
    else if (moving) {
      offs.push(observeOnscreen(target, (on) => (on ? delete crt.dataset.paused : (crt.dataset.paused = ''))));
    }
    target.append(crt);
    screens.push(crt);
  });
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
