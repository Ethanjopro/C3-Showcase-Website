// Shared pointer state for every effect. Listeners are passive: effects read
// this, they never capture gestures through it.
//
//   pointer.x / y      latest client position
//   pointer.sx / sy    smoothed position (for lenses and cursors)
//   pointer.vx / vy    velocity, px per second
//   pointer.type       'mouse' | 'touch' | 'pen'
//   pointer.down       a button or finger is down
//   pointer.fine       the device has a hover-capable fine pointer
//   local(el, smoothed?, out?)  position relative to el's box, 0-1

import { add as addTick } from './ticker';

export type PointerType = 'mouse' | 'touch' | 'pen';

export interface PointerState {
  x: number;
  y: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  type: PointerType;
  down: boolean;
  fine: boolean;
  /** Has the pointer moved since the page loaded? */
  seen: boolean;
}

const fineQuery = typeof matchMedia === 'function' ? matchMedia('(hover: hover) and (pointer: fine)') : null;

export const pointer: PointerState = {
  x: 0,
  y: 0,
  sx: 0,
  sy: 0,
  vx: 0,
  vy: 0,
  type: 'mouse',
  down: false,
  fine: fineQuery?.matches ?? false,
  seen: false,
};

fineQuery?.addEventListener('change', () => (pointer.fine = fineQuery.matches));

type Listener = (p: PointerState, e: PointerEvent) => void;
const moveListeners = new Set<Listener>();
const downListeners = new Set<Listener>();
const upListeners = new Set<Listener>();

let lastMove = 0;
let stopSmoothing: (() => void) | null = null;
const SMOOTH_MS = 80; // time constant for the smoothed position

function smooth(_t: number, dt: number) {
  const k = 1 - Math.exp(-dt / SMOOTH_MS);
  pointer.sx += (pointer.x - pointer.sx) * k;
  pointer.sy += (pointer.y - pointer.sy) * k;
  // Velocity decays when the pointer stops sending events.
  if (performance.now() - lastMove > 50) {
    pointer.vx *= 0.8;
    pointer.vy *= 0.8;
  }
  const settled = Math.abs(pointer.x - pointer.sx) < 0.1 && Math.abs(pointer.y - pointer.sy) < 0.1 && Math.hypot(pointer.vx, pointer.vy) < 1;
  if (settled) {
    pointer.sx = pointer.x;
    pointer.sy = pointer.y;
    pointer.vx = pointer.vy = 0;
    stopSmoothing?.();
    stopSmoothing = null;
  }
}

function onMove(e: PointerEvent) {
  const now = performance.now();
  const dt = Math.max(1, now - lastMove);
  if (pointer.seen && dt < 100) {
    pointer.vx = ((e.clientX - pointer.x) / dt) * 1000;
    pointer.vy = ((e.clientY - pointer.y) / dt) * 1000;
  } else {
    pointer.sx = e.clientX;
    pointer.sy = e.clientY;
  }
  lastMove = now;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.type = e.pointerType as PointerType;
  pointer.seen = true;
  stopSmoothing ??= addTick(smooth);
  moveListeners.forEach((fn) => fn(pointer, e));
}

if (typeof window !== 'undefined') {
  const opts: AddEventListenerOptions = { passive: true };
  window.addEventListener('pointermove', onMove, opts);
  window.addEventListener(
    'pointerdown',
    (e) => {
      pointer.down = true;
      pointer.type = e.pointerType as PointerType;
      onMove(e);
      downListeners.forEach((fn) => fn(pointer, e));
    },
    opts,
  );
  const up = (e: PointerEvent) => {
    pointer.down = false;
    upListeners.forEach((fn) => fn(pointer, e));
  };
  window.addEventListener('pointerup', up, opts);
  window.addEventListener('pointercancel', up, opts);
}

export interface LocalPoint {
  x: number;
  y: number;
  inside: boolean;
}

/**
 * Pointer position relative to `el`'s box: 0-1 inside, beyond that outside.
 * Pass `out` from a frame loop to reuse one object instead of allocating.
 */
export function local(el: Element, smoothed = false, out: LocalPoint = { x: 0, y: 0, inside: false }): LocalPoint {
  const r = el.getBoundingClientRect();
  const px = smoothed ? pointer.sx : pointer.x;
  const py = smoothed ? pointer.sy : pointer.y;
  out.x = r.width ? (px - r.left) / r.width : 0;
  out.y = r.height ? (py - r.top) / r.height : 0;
  out.inside = pointer.seen && out.x >= 0 && out.x <= 1 && out.y >= 0 && out.y <= 1;
  return out;
}

const subscribe = (set: Set<Listener>) => (fn: Listener) => {
  set.add(fn);
  return () => set.delete(fn);
};

export const onPointerMove = subscribe(moveListeners);
export const onPointerDown = subscribe(downListeners);
export const onPointerUp = subscribe(upListeners);
