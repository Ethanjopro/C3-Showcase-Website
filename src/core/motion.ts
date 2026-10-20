// How much motion this visit gets. Every effect reads it (SPEC §6):
//   full    everything on
//   lite    Save-Data, deviceMemory <= 2, or frames that keep running over
//           24 ms; effects drop their extras
//   static  prefers-reduced-motion; effects show their end state
//
// `?quality=full|lite|static` overrides it for testing.

export type Quality = 'full' | 'lite' | 'static';

const listeners = new Set<(q: Quality) => void>();
let slow = false;
let last: Quality | null = null;

const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

function override(): Quality | null {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search).get('quality');
  return q === 'full' || q === 'lite' || q === 'static' ? q : null;
}

function constrained(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return nav.connection?.saveData === true || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2);
}

export function quality(): Quality {
  const forced = override();
  if (forced) return forced;
  if (reduced?.matches) return 'static';
  if (slow || constrained()) return 'lite';
  return 'full';
}

export function reducedMotion(): boolean {
  return quality() === 'static';
}

/** Calls `cb` whenever the quality level changes. Returns an unsubscribe. */
export function onChange(cb: (q: Quality) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  const q = quality();
  if (q === last) return;
  last = q;
  listeners.forEach((fn) => fn(q));
}

reduced?.addEventListener('change', notify);

// Slow-frame detection, fed by the ticker. An average over 24 ms for two
// seconds, after a one-second warm-up, drops the visit to `lite` for good.
let elapsed = 0;
let slowFor = 0;
let avg = 16.7;

export function reportFrame(dt: number) {
  if (slow) return;
  elapsed += dt;
  avg += (dt - avg) * 0.05;
  if (elapsed < 1000) return;
  slowFor = avg > 24 ? slowFor + dt : 0;
  if (slowFor > 2000) {
    slow = true;
    notify();
  }
}

last = quality();
