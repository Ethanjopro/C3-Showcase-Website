// sketch-in (SPEC §3 row 5, PLAN step 6). On the first visit of a session her
// line art draws itself in, top to bottom, the fill floods in, then the title
// is drawn: at most 2.4 s, stepped at 12 fps. Any tap, scroll or key jumps to
// the finished poster.
//
//   0. Inside the letters (OWNER #7). With c3-window on, the poster arrives
//      behind her solid-ink C3, so the intro waits, hidden, until the scroll
//      starts draining the ink (c3-window's mount leaves data-state "closed"),
//      and then draws inside the letters. Scrolling the pin drives the window,
//      so it never skips the intro: only a tap or a non-scrolling key does,
//      until the window is open and the usual skips return.
//
//   1. Hidden start. The boot script's `fx-pending-sketch-in` hides the line
//      art, fill and title before first paint (base.css). init() puts them in
//      the start state below before main.ts lifts that class, so nothing
//      flashes. Without that class (reduced motion, a second visit, or the
//      boot script's 4 s timeout already showed the art) it does nothing.
//   2. Lines. Her art is filled contours (potrace), not strokes, so each path
//      draws with a thick dashed stroke along its own contour, and the drawing
//      is clipped to her ink: the stroke uncovers exactly her line, as if the
//      pen were following it. A path's solid fill switches on when its stroke
//      finishes. Paths start top to bottom; the longest contours take the rest
//      of the window, specks a single step.
//   3. Fill. The fill layer floods up from the bottom in FILL_STEPS stepped
//      frames, a flat block with a softly uneven edge, then the title draws
//      the same way as the lines.
//   4. Clock. Web Animations with `steps()` easing, all aligned to one 12 fps
//      grid; no GSAP at load and no JavaScript per step. `?freeze=<ms>` holds
//      every animation at that time, so screenshots are deterministic.
//
// Outside its mount the effect writes:
//   <html data-fx-sketch-in>   "drawing" while it waits or plays (line-boil
//                              holds on her live drawing; style.css hides the
//                              eye screen's CRT glass), "done" after
//   .layer__art and the SVG inside it (writer table: stroke dash, clip,
//   opacity): pathLength, the dash, the reveal stroke and clip, and a wrapper
//   <g> that carries the clip. All of it is removed at the end state, leaving
//   her file's markup as it was.
// It reads c3-window's mount data-state (closed | opening | open) and
// html.fx-pending-c3-window, never its code.
// The mount carries data-state: waiting | drawing | done | skipped.
//
//   full    as above
//   lite    no per-path drawing: the line art and title arrive as stepped
//           wipes, the fill floods the same way
//   static  not played: the finished poster

import type { EffectOptions } from '../../core/effect';
import { frozenAt } from '../../core/clock';
import { enabled } from '../../core/flags';
import { number } from '../../core/palette';
import { rng } from '../../core/raster';
import './style.css';

const ATTR = 'data-fx-sketch-in';
const DONE_KEY = 'c3:fx-done:sketch-in';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Steps per second (CLAUDE.md: hand-drawn effects step at 8-12 fps). */
const DEFAULT_FPS = 12;
/** The line art draws over steps [0, LINE_STEPS). */
const LINE_STEPS = 16;
/** Path starts spread over this share of LINE_STEPS, top of the poster first. */
const SPREAD = 0.55;
/** The fill floods in over FILL_STEPS frames from step FILL_AT (PLAN: 6-8 frames). */
const FILL_AT = 14;
const FILL_STEPS = 7;
/** Then the title draws over TITLE_STEPS. */
const TITLE_AT = 21;
const TITLE_STEPS = 7;
/** Last step: 28 steps at 12 fps is 2.33 s (PLAN: at most 2.4 s). */
const TOTAL_STEPS = TITLE_AT + TITLE_STEPS;
/** PLAN: the whole intro takes at most 2.4 s, whatever the step rate. */
const MAX_MS = 2400;
/**
 * Reveal stroke width, in the SVG's own units (1200 across the poster). It
 * must cover her thickest line from both edges of its contour; anything wider
 * only uncovers neighbouring ink a step early.
 */
const REVEAL: Record<'lineart' | 'title', number> = { lineart: 16, title: 40 };
/** The flood's edge wavers by up to this share of the layer's height. */
const FLOOD_WAVER = 0.012;
/** Points along the flood's edge. */
const FLOOD_POINTS = 9;
/**
 * Layers that arrive with the fill's flood, so the figure isn't drawn in among
 * finished art (the boot script prehides them too; wings stay, they're LCP).
 */
const WITH_FILL = ['fill', 'ribcage', 'eyescreen', 'cables', 'halo'] as const;
/** Keys that scroll the page: while the C3 window is pinned they drive it, not a skip. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

let anims: Animation[] = [];
let undo: (() => void)[] = [];
let mount: HTMLElement | null = null;
let playing = false;
let off: (() => void) | null = null;
/** Stops watching c3-window while the intro waits. */
let unwatch: (() => void) | null = null;
/** Animations paused because the tab is hidden. */
const held = new Set<Animation>();

const html = () => document.documentElement;

function markDone() {
  try {
    sessionStorage.setItem(DONE_KEY, '1');
  } catch {
    // Storage disabled: the intro just plays again next time.
  }
}

/**
 * One vector layer's paths, drawn top to bottom with a thick dashed stroke
 * clipped to her ink. Returns the animations; registers the clean-up in `undo`.
 */
function drawVector(name: 'lineart' | 'title', at: number, steps: number, spread: number, step: number): Animation[] {
  const svg = document.querySelector<SVGSVGElement>(`.layer--${name} .layer__art svg`);
  if (!svg) return [];
  const paths = [...svg.querySelectorAll('path')];
  if (!paths.length) return [];
  const height = svg.viewBox.baseVal?.height || svg.getBBox().height || 1;

  // A wrapper <g> carries the clip: clip-path on the <svg> itself would be in
  // CSS pixels, not her viewBox units, and a path clipped by a clipPath that
  // uses that same path is a circular reference.
  const group = document.createElementNS(SVG_NS, 'g');
  const defs = document.createElementNS(SVG_NS, 'defs');
  const clip = document.createElementNS(SVG_NS, 'clipPath');
  clip.id = `c3-sketch-in-${name}`;
  clip.setAttribute('clip-rule', 'evenodd'); // her contours' holes stay holes (the file uses evenodd)
  const moved = [...svg.childNodes];
  group.append(...moved);
  defs.append(clip);
  svg.append(defs, group);
  group.style.clipPath = `url(#${clip.id})`;
  group.style.stroke = 'currentColor';
  group.style.strokeWidth = String(REVEAL[name]);
  group.style.strokeDasharray = '1 2'; // with pathLength 1: the whole path, then a longer gap

  const added: Element[] = [];
  const order = paths.map((p) => ({ p, y: p.getBBox().y, len: p.getAttribute('d')?.length ?? 0 }));
  // Path data length stands in for contour length (no getTotalLength pass at
  // load). The longest contours take the rest of the window and specks a step.
  // sqrt, because a contour runs out and back along each of her strokes: half
  // its dash already uncovers most of the line, so long ones need the time.
  const startOf = (y: number) => Math.floor(steps * spread * Math.min(1, Math.max(0, y / height)));
  const longest = Math.max(1, ...order.map((o) => o.len));
  const out: Animation[] = [];
  order.forEach(({ p, y, len }, i) => {
    const hadId = p.hasAttribute('id');
    if (!hadId) p.id = `c3-sketch-in-${name}-${i}`;
    const hadLength = p.getAttribute('pathLength');
    p.setAttribute('pathLength', '1');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${p.id}`);
    clip.append(use);
    added.push(p);
    undo.push(() => {
      if (!hadId) p.removeAttribute('id');
      if (hadLength === null) p.removeAttribute('pathLength');
      else p.setAttribute('pathLength', hadLength);
    });

    const start = startOf(y);
    const n = Math.max(1, Math.round((steps - start) * Math.sqrt(len / longest)));
    out.push(
      p.animate(
        [
          { strokeDashoffset: 1, fillOpacity: 0 },
          { fillOpacity: 0, offset: 0.999 },
          { strokeDashoffset: 0, fillOpacity: 1 },
        ],
        { duration: n * step, delay: (at + start) * step, easing: `steps(${n}, end)`, fill: 'both' },
      ),
    );
  });

  undo.push(() => {
    svg.append(...group.childNodes);
    group.remove();
    defs.remove();
  });
  return out;
}

/** A stepped wipe of a whole layer (lite): clip-path inset from one side. */
function wipe(el: Element, from: string, at: number, steps: number, step: number): Animation {
  undo.push(() => (el as HTMLElement).style.removeProperty('clip-path'));
  return el.animate([{ clipPath: from }, { clipPath: 'inset(0 0 0 0)' }], {
    duration: steps * step,
    delay: at * step,
    easing: `steps(${steps}, end)`,
    fill: 'both',
  });
}

/** The fill floods up from the bottom: one flat block per step, its edge softly uneven. */
function flood(el: Element, at: number, steps: number, step: number): Animation {
  const rand = rng(23);
  const frames: Keyframe[] = [];
  for (let k = 0; k <= steps; k++) {
    // Frame k shows the bottom k/steps of the layer; the last frame shows it all.
    const level = 100 - (k / steps) * 100;
    const edge: string[] = [];
    for (let i = 0; i < FLOOD_POINTS; i++) {
      const x = (i / (FLOOD_POINTS - 1)) * 100;
      const y = k === steps ? -1 : level + (rand() - 0.5) * 2 * FLOOD_WAVER * 100;
      edge.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }
    frames.push({ clipPath: `polygon(0% 101%, ${edge.join(', ')}, 100% 101%)`, offset: k / steps, easing: 'step-end' });
  }
  undo.push(() => (el as HTMLElement).style.removeProperty('clip-path'));
  // Each keyframe holds until the next (step-end), so frame k shows for one step.
  return el.animate(frames, { duration: steps * step, delay: at * step, fill: 'both' });
}

function finish() {
  off?.();
  off = null;
  unwatch?.();
  unwatch = null;
  if (!playing) return;
  playing = false;
  anims.forEach((a) => a.cancel());
  anims = [];
  held.clear();
  undo.reverse().forEach((fn) => fn());
  undo = [];
  html().setAttribute(ATTR, 'done');
  if (mount) mount.dataset.state = 'done';
  markDone();
}

/** c3-window's mount state: closed | opening | open, or undefined (off, not started, failed). */
const windowState = (w: HTMLElement | null) => w?.dataset.state;

/**
 * Any tap, key or scroll jumps to the finished poster. While the C3 window is
 * still pinned (`pinned()`), scrolling it is how the poster opens, so scroll,
 * wheel and a finger going down don't count: only a tap (a click, which a
 * swipe never fires) or a key that doesn't scroll.
 */
function listenForSkip(pinned: () => boolean) {
  let y0 = window.scrollY;
  const skip = () => {
    if (!pinned()) finish();
  };
  const onKey = (e: KeyboardEvent) => {
    if (!pinned() || !SCROLL_KEYS.has(e.key)) finish();
  };
  const onScroll = () => {
    // Measured from where the pin let go, so the scroll that opened the window doesn't count.
    if (pinned()) y0 = window.scrollY;
    else if (Math.abs(window.scrollY - y0) > 2) finish();
  };
  const onClick = () => finish();
  const opts: AddEventListenerOptions = { passive: true, capture: true };
  window.addEventListener('pointerdown', skip, opts);
  window.addEventListener('click', onClick, opts);
  window.addEventListener('keydown', onKey, opts);
  window.addEventListener('wheel', skip, opts);
  window.addEventListener('scroll', onScroll, opts);
  // A hidden tab holds the drawing where it is (CLAUDE.md: the loop pauses when hidden).
  // Only what was running pauses and resumes: play() on a finished animation
  // would rewind it, un-drawing lines already drawn.
  const onVisibility = () => {
    if (document.hidden) {
      for (const a of anims) if (a.playState === 'running' || a.pending) (a.pause(), held.add(a));
    } else {
      held.forEach((a) => a.play());
      held.clear();
    }
  };
  if (frozenAt === null) document.addEventListener('visibilitychange', onVisibility);
  off = () => {
    window.removeEventListener('pointerdown', skip, opts);
    window.removeEventListener('click', onClick, opts);
    window.removeEventListener('keydown', onKey, opts);
    window.removeEventListener('wheel', skip, opts);
    window.removeEventListener('scroll', onScroll, opts);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Starts every animation on one 12 fps grid, and finishes when they all have. */
function play(pinned: () => boolean) {
  if (!playing) return;
  if (mount) mount.dataset.state = 'drawing';
  // One start time for all of them, so every step lands on the same 12 fps grid.
  const t0 = document.timeline.currentTime;
  if (t0 !== null) anims.forEach((a) => (a.startTime = t0));
  else anims.forEach((a) => a.play());
  if (document.hidden) anims.forEach((a) => (a.pause(), held.add(a)));
  listenForSkip(pinned);
  const all = anims;
  Promise.all(all.map((a) => a.finished)).then(
    () => all === anims && finish(),
    () => {}, // cancelled by a skip or destroy()
  );
}

/**
 * With c3-window on, hold the start state (nothing drawn) until its ink starts
 * to drain, then play. Init order between the two isn't fixed, so until
 * c3-window writes a state, its prehide class says it's still coming; if it
 * settles without one (no letters, or it failed), play at once: her art must
 * never stay hidden.
 */
function waitForWindow(win: HTMLElement) {
  const pinned = () => {
    const s = windowState(win);
    return s === 'closed' || s === 'opening';
  };
  const check = () => {
    const s = windowState(win);
    if (s === 'closed' || (s === undefined && html().classList.contains('fx-pending-c3-window'))) return;
    unwatch?.();
    unwatch = null;
    play(pinned);
  };
  anims.forEach((a) => a.pause());
  if (mount) mount.dataset.state = 'waiting';
  const watcher = new MutationObserver(check);
  watcher.observe(win, { attributes: true, attributeFilter: ['data-state'] });
  watcher.observe(html(), { attributes: true, attributeFilter: ['class'] });
  unwatch = () => watcher.disconnect();
  check();
}

export function init(root: HTMLElement, opts: EffectOptions): void {
  destroy();
  mount = root;
  // Only when the boot script hid the art: otherwise it's already on screen,
  // and hiding it again to draw it would be a flash.
  const hidden = html().classList.contains('fx-pending-sketch-in');
  if (opts.quality === 'static' || !hidden || typeof Element.prototype.animate !== 'function') {
    root.dataset.state = 'skipped';
    return;
  }
  // A slower --fps-sketch (CLAUDE.md allows 8) must not stretch past the cap.
  const step = Math.min(1000 / number('fps-sketch', DEFAULT_FPS), MAX_MS / TOTAL_STEPS);
  if (frozenAt !== null && frozenAt >= TOTAL_STEPS * step) {
    // A frozen clock past the end: the finished poster, as a live visit ends.
    root.dataset.state = 'done';
    html().setAttribute(ATTR, 'done');
    return;
  }

  playing = true;
  html().setAttribute(ATTR, 'drawing');
  root.dataset.state = 'drawing';

  const lineArt = document.querySelector('.layer--lineart .layer__art');
  const titleArt = document.querySelector('.layer--title .layer__art');
  if (opts.quality === 'lite') {
    if (lineArt) anims.push(wipe(lineArt, 'inset(0 0 100% 0)', 0, LINE_STEPS, step));
    if (titleArt) anims.push(wipe(titleArt, 'inset(0 100% 0 0)', TITLE_AT, TITLE_STEPS, step));
  } else {
    anims.push(...drawVector('lineart', 0, LINE_STEPS, SPREAD, step));
    anims.push(...drawVector('title', TITLE_AT, TITLE_STEPS, 0, step));
  }
  // Every one shares the poster's frame, so one flood edge crosses them all.
  for (const name of WITH_FILL) {
    const el = document.querySelector(`.layer--${name} .layer__art`);
    if (el) anims.push(flood(el, FILL_AT, FILL_STEPS, step));
  }

  if (frozenAt !== null) {
    // Hold every animation at the frozen time; never finish.
    anims.forEach((a) => {
      a.pause();
      a.currentTime = frozenAt;
    });
    return;
  }

  const win = enabled('c3-window') ? document.querySelector<HTMLElement>('[data-fx="c3-window"]') : null;
  if (win) waitForWindow(win);
  else play(() => false);
}

export function destroy(): void {
  // Stopped mid-drawing (a quality change restarts effects): show the finished
  // poster, and don't play again this session.
  finish();
  html().removeAttribute(ATTR);
  if (mount) delete mount.dataset.state;
  mount = null;
}
