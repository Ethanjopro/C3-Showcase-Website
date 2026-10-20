// The site's one render loop (CLAUDE.md). It rides on GSAP's ticker, so GSAP
// timelines and every effect share a single requestAnimationFrame, and the loop
// sleeps when nothing is subscribed and no GSAP animation runs.
//
//   const off = ticker.add((t, dt) => draw(t), { fps: 10, el: poster });
//
// - `fps` steps the callback: it runs once per 1000/fps ms step, never
//   between. Hand-drawn effects use 8-12 (CLAUDE.md motion rules).
// - `el` skips the callback while that element is offscreen.
// - The loop pauses while the tab is hidden, and `dt` never jumps on return.
// - `?freeze=<ms>` pins the clock for deterministic screenshots: every
//   callback sees `t = ms`, `dt = 0`, and a stepped callback runs once.

import { gsap } from 'gsap';
import { reportFrame } from './motion';
import { frozenAt } from './clock';
import { observeOnscreen } from './onscreen';

export type TickFn = (t: number, dt: number) => void;

export interface TickOptions {
  /** Steps per second. Omit for every frame (cursor, camera, physics). */
  fps?: number;
  /** Skip the callback while this element is offscreen. */
  el?: Element;
}

interface Sub {
  fn: TickFn;
  fps: number | undefined;
  lastStep: number;
  lastT: number;
  onscreen: boolean;
  unobserve?: () => void;
}

/** Drives the loop. Swappable so the stepping logic can be unit tested. */
export interface Driver {
  start(frame: (now: number) => void): void;
  stop(): void;
}

const MAX_DT = 100; // ms; a long frame never turns into a jump

export function createTicker(driver: Driver, frozenAt: number | null = null) {
  const subs = new Set<Sub>();
  let running = false;
  let paused = false;
  let lastNow: number | null = null;

  function frame(now: number) {
    const t = frozenAt ?? now;
    const dt = frozenAt !== null ? 0 : lastNow === null ? 0 : Math.min(MAX_DT, now - lastNow);
    lastNow = now;
    if (frozenAt === null && dt > 0) reportFrame(dt);
    for (const sub of subs) {
      if (!sub.onscreen) continue;
      if (sub.fps) {
        const step = Math.floor((t * sub.fps) / 1000);
        if (step === sub.lastStep) continue;
        sub.lastStep = step;
      }
      const subDt = frozenAt !== null || sub.lastT < 0 ? 0 : Math.min(MAX_DT * 4, t - sub.lastT);
      sub.lastT = t;
      sub.fn(t, subDt);
    }
  }

  function sync() {
    const want = subs.size > 0 && !paused;
    if (want && !running) {
      lastNow = null;
      driver.start(frame);
      running = true;
    } else if (!want && running) {
      driver.stop();
      running = false;
    }
  }

  return {
    add(fn: TickFn, opts: TickOptions = {}): () => void {
      const sub: Sub = { fn, fps: opts.fps, lastStep: Number.NaN, lastT: -1, onscreen: true };
      if (opts.el) {
        sub.onscreen = false;
        sub.unobserve = observeOnscreen(opts.el, (on) => {
          sub.onscreen = on;
          if (on) sub.lastT = -1; // no dt spike after coming back onscreen
        });
      }
      subs.add(sub);
      sync();
      return () => {
        subs.delete(sub);
        sub.unobserve?.();
        sync();
      };
    },
    /** Pauses everything (the tab is hidden); resume restarts dt from zero. */
    setPaused(value: boolean) {
      paused = value;
      for (const sub of subs) sub.lastT = -1;
      sync();
    },
    /** The current clock: frozen time, or performance.now(). */
    now(): number {
      return frozenAt ?? performance.now();
    },
    get size() {
      return subs.size;
    },
    frozenAt,
  };
}

// --- The site's ticker ----------------------------------------------------------

const gsapDriver: Driver = (() => {
  let cb: ((now: number) => void) | null = null;
  const onGsapTick = () => cb?.(performance.now());
  return {
    start(frame) {
      cb = frame;
      gsap.ticker.add(onGsapTick);
    },
    stop() {
      gsap.ticker.remove(onGsapTick);
      cb = null;
    },
  };
})();

export const ticker = createTicker(gsapDriver, frozenAt);

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => ticker.setPaused(document.hidden));
}

export const add = ticker.add;
