// How much motion this visit gets. Every effect reads it (SPEC §6):
//   full    everything on
//   lite    Save-Data, deviceMemory <= 2, or a device that keeps dropping
//           frames; effects drop their extras
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

// Slow-frame detection, fed by the ticker. "Slow" means dropping frames
// against the device's own cadence, not a long average: a display or browser
// capped at 30 Hz (iOS Low Power Mode) delivers every frame on time at ~33 ms.
// Each window of 60 frames after a one-second warm-up compares every frame with
// the window's fast cadence (its 20th percentile); if over a third of frames run
// 1.6x longer than that, two windows in a row, the visit drops to `lite`.
const WINDOW = 60;
const frames = new Float32Array(WINDOW);
const sorted = new Float32Array(WINDOW);
let filled = 0;
let elapsed = 0;
let slowWindows = 0;

/** Pure: is this window of frame times janky against its own cadence? */
export function janky(times: ArrayLike<number>, scratch: Float32Array = new Float32Array(times.length)): boolean {
  const n = times.length;
  for (let i = 0; i < n; i++) scratch[i] = times[i]!;
  const view = scratch.subarray(0, n).sort();
  const cadence = view[Math.floor(n * 0.2)]!;
  let dropped = 0;
  for (let i = 0; i < n; i++) if (times[i]! > cadence * 1.6) dropped++;
  return dropped > n / 3;
}

export function reportFrame(dt: number) {
  if (slow) return;
  elapsed += dt;
  if (elapsed < 1000) return;
  frames[filled++] = dt;
  if (filled < WINDOW) return;
  filled = 0;
  slowWindows = janky(frames, sorted) ? slowWindows + 1 : 0;
  if (slowWindows >= 2) {
    slow = true;
    notify();
  }
}

last = quality();
