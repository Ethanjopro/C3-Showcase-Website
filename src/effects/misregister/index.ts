// misregister (SPEC §3 row 8, PLAN step 9). On a fast scroll or flick the ink
// and the accent slip up to 2 px apart (1 px each way), like a two-color print off register,
// then a quick spring snaps them back.
//
//   - Speed comes from core/scroll's velocity and, on a fine pointer, from
//     core/pointer's velocity. Slow movement does nothing: only the part of
//     the speed above V_START counts, and V_FULL gives the full offset.
//   - The ink layers' `.layer` move along the motion, the accent layers'
//     `.layer` against it (writer table: misregister writes `transform` on
//     `.layer`). Which is which comes from each slot's tint in the manifest,
//     so her final art needs no code change. The xray layer rides with the ink
//     (it draws her ribcage in ink).
//   - A spring (smooth, not stepped: it's the paper moving, not her line)
//     follows the target and settles back to 0. While it moves the layers are
//     translate3d, on the compositor; once settled the transform is removed
//     and the ticker subscription with it. Offscreen, the poster rests in
//     register and nothing ticks.
//   - `?misregister=<px>` holds that offset (for the mid-scroll shot).
//
//   full    scroll and pointer velocity
//   lite    scroll velocity only
//   static  off

import type { EffectOptions } from '../../core/effect';
import { slot, type SlotName } from '../../core/art';
import { add } from '../../core/ticker';
import { onVelocity, scroll } from '../../core/scroll';
import { onPointerMove, pointer } from '../../core/pointer';
import { observeOnscreen } from '../../core/onscreen';

/**
 * Largest slip of each ink from register, px. They slip in opposite
 * directions, so the two inks end up at most 2x this apart (SPEC: 1-2 px).
 */
const MAX = 1;
/** Speeds below this do nothing, px/s. */
const V_START = { scroll: 900, pointer: 1200 };
/** Speeds at or above this give the full offset, px/s. */
const V_FULL = { scroll: 4000, pointer: 5000 };
/** Spring stiffness and damping (per second²/per second): quick, one small overshoot. */
const STIFFNESS = 900;
const DAMPING = 38;
/** Settled below these: px and px/s. */
const REST = 0.02;

interface Group {
  els: HTMLElement[];
  sign: 1 | -1;
}

let groups: Group[] = [];
let offs: (() => void)[] = [];
let stopTick: (() => void) | null = null;

// Spring state: offset and its velocity, px and px/s, as a 2D vector.
let x = 0;
let y = 0;
let vx = 0;
let vy = 0;
let last = 0;
let usePointer = false;
let poster: HTMLElement | null = null;
let onscreen = false;

const ramp = (speed: number, start: number, full: number) => Math.min(1, Math.max(0, (Math.abs(speed) - start) / (full - start)));

/** Where the inks want to be right now: along the motion, scaled by how fast it is. */
function target(): [number, number] {
  // Scrolling down moves the page up on screen.
  const sy = -scroll.velocity;
  let tx = 0;
  let ty = Math.sign(sy) * ramp(sy, V_START.scroll, V_FULL.scroll);
  if (usePointer) {
    const speed = Math.hypot(pointer.vx, pointer.vy);
    const k = ramp(speed, V_START.pointer, V_FULL.pointer);
    if (k > 0) {
      tx += (pointer.vx / speed) * k;
      ty += (pointer.vy / speed) * k;
    }
  }
  const len = Math.hypot(tx, ty);
  if (len > 1) {
    tx /= len;
    ty /= len;
  }
  return [tx * MAX, ty * MAX];
}

function write(ox: number, oy: number) {
  // Snap to device pixels so the slipped line stays crisp.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  for (const g of groups) {
    const t = ox === 0 && oy === 0 ? '' : `translate3d(${snap(ox * g.sign)}px, ${snap(oy * g.sign)}px, 0)`;
    for (const el of g.els) el.style.transform = t;
  }
}

function tick() {
  // Wall-clock dt: under ?freeze the ticker passes dt = 0, and the spring must still settle.
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const [tx, ty] = target();
  vx += (STIFFNESS * (tx - x) - DAMPING * vx) * dt;
  vy += (STIFFNESS * (ty - y) - DAMPING * vy) * dt;
  x += vx * dt;
  y += vy * dt;
  // A reversal mid-slip can fling the spring past the limit; the paper never slips further.
  const len = Math.hypot(x, y);
  if (len > MAX) {
    x = (x / len) * MAX;
    y = (y / len) * MAX;
  }
  const settled = tx === 0 && ty === 0 && Math.hypot(x, y) < REST && Math.hypot(vx, vy) < REST * 10;
  if (settled) {
    x = y = vx = vy = 0;
    write(0, 0);
    stopTick?.();
    stopTick = null;
    return;
  }
  write(x, y);
}

function wake() {
  if (stopTick || !onscreen) return;
  last = performance.now();
  stopTick = add(tick);
}

/** Back in register at once, ticking nothing. */
function rest() {
  stopTick?.();
  stopTick = null;
  x = y = vx = vy = 0;
  write(0, 0);
}

function hold(): number | null {
  const v = new URLSearchParams(location.search).get('misregister');
  return v !== null && Number.isFinite(Number(v)) ? Math.max(-2, Math.min(2, Number(v))) : null;
}

export function init(_root: HTMLElement, opts: EffectOptions): void {
  destroy();
  if (opts.quality === 'static') return;
  poster = document.querySelector<HTMLElement>('.poster');
  if (!poster) return;
  const ink: HTMLElement[] = [];
  const accent: HTMLElement[] = [];
  for (const el of poster.querySelectorAll<HTMLElement>('.layer')) {
    const name = el.dataset.slot as SlotName | undefined;
    const tint = name ? slot(name)?.tint : el.classList.contains('layer--xray') ? 'ink' : undefined;
    if (tint === 'ink') ink.push(el);
    else if (tint === 'accent') accent.push(el);
  }
  groups = [
    { els: ink, sign: 1 },
    { els: accent, sign: -1 },
  ];

  const held = hold();
  if (held !== null) {
    write(0, held / 2);
    return;
  }
  usePointer = opts.quality === 'full' && pointer.fine;
  // Offscreen, the poster rests in register: no stale offset, no ticking.
  offs.push(
    observeOnscreen(poster, (on) => {
      onscreen = on;
      if (!on) rest();
    }),
  );
  offs.push(onVelocity((v) => v !== 0 && wake()));
  if (usePointer) offs.push(onPointerMove(() => wake()));
}

export function destroy(): void {
  offs.forEach((off) => off());
  offs = [];
  rest();
  groups = [];
  onscreen = false;
  poster = null;
}
