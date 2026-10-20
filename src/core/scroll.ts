// Scroll state for every effect. Native scroll only: nothing here hijacks or
// smooths the page's scrolling (SPEC §6).
//
//   scroll.y, scroll.velocity (px per second, decays to 0 when scrolling stops)
//   progress(el, cb, { start, end, pin })  scroll-linked 0-1 progress (GSAP ScrollTrigger)
//   onEnter(el, cb, { once })               el came into view

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { add as addTick } from './ticker';

gsap.registerPlugin(ScrollTrigger);

export const scroll = {
  y: typeof window !== 'undefined' ? window.scrollY : 0,
  velocity: 0,
};

let lastY = scroll.y;
let lastTime = 0;
let lastDecay = 0;
let stopDecay: (() => void) | null = null;
const velocityListeners = new Set<(v: number) => void>();

// Uses wall-clock time, not the ticker's dt: under ?freeze the ticker passes
// dt = 0, and velocity must still decay to 0 (and unsubscribe) for screenshots.
function decay() {
  const now = performance.now();
  const dt = Math.min(100, now - lastDecay);
  lastDecay = now;
  if (now - lastTime > 60) scroll.velocity *= Math.exp(-dt / 120);
  velocityListeners.forEach((fn) => fn(scroll.velocity));
  if (Math.abs(scroll.velocity) < 1) {
    scroll.velocity = 0;
    velocityListeners.forEach((fn) => fn(0));
    stopDecay?.();
    stopDecay = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'scroll',
    () => {
      const now = performance.now();
      const y = window.scrollY;
      const dt = Math.max(1, now - lastTime);
      scroll.velocity = dt < 200 ? ((y - lastY) / dt) * 1000 : 0;
      scroll.y = y;
      lastY = y;
      lastTime = now;
      if (!stopDecay) {
        lastDecay = now;
        stopDecay = addTick(decay);
      }
    },
    { passive: true },
  );
}

/** Called every frame while the scroll velocity is non-zero, then once with 0. */
export function onVelocity(cb: (v: number) => void): () => void {
  velocityListeners.add(cb);
  return () => velocityListeners.delete(cb);
}

export interface ProgressOptions {
  /** ScrollTrigger start, e.g. 'top top'. Default 'top bottom'. */
  start?: string;
  /** ScrollTrigger end, e.g. '+=100%'. Default 'bottom top'. */
  end?: string;
  /** Pin `el` for the duration. Keep it within one viewport (SPEC §6). */
  pin?: boolean;
}

/** Scroll-linked progress through `el`, 0-1. Returns kill(). */
export function progress(el: Element, cb: (p: number) => void, opts: ProgressOptions = {}): () => void {
  const st = ScrollTrigger.create({
    trigger: el,
    start: opts.start ?? 'top bottom',
    end: opts.end ?? 'bottom top',
    pin: opts.pin ?? false,
    onUpdate: (self) => cb(self.progress),
    onRefresh: (self) => cb(self.progress),
  });
  cb(st.progress);
  return () => st.kill(true);
}

/** Calls `cb` when `el` scrolls into view. Returns off(). */
export function onEnter(el: Element, cb: (el: Element) => void, opts: { once?: boolean; threshold?: number } = {}): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    cb(el);
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        cb(el);
        if (opts.once) io.disconnect();
      }
    },
    { threshold: opts.threshold ?? 0.15 },
  );
  io.observe(el);
  return () => io.disconnect();
}

/** Recompute scroll-linked positions after layout changes (fonts, images). */
export function refresh() {
  ScrollTrigger.refresh();
}
