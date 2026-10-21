// Her six colorways. The colors live in src/styles/tokens.css as
// [data-colorway] blocks; this module switches between them.
//
//   request(name)         switch, through the registered transition if any
//   setTransition(fn)     the palette effect's wipe; without one, swaps are instant
//   color('ink')          resolved CSS color, for canvas and WebGL
//   number('fps-boil', 10) a unitless numeric token (rates)
//   duration('dur-wipe', 500) a time token in ms, whether it reads 500ms or .5s
//   onChange(cb)
//
// Flash safety (SPEC §6: nothing flashes more than three times a second): the
// page changes colorway at most once per GAP ms, with or without a transition.
// Picks made faster than that (an arrow key held in the radio group) collapse
// to the newest: the ones it overtook are never applied. A pick that had to
// wait swaps without the transition, so a run of picks never queues up wipes.
//
// The inline boot script in index.html applies the stored colorway before
// first paint, so there's no flash of the default.

import colorways from '../content/colorways.json';
import { emit } from './bus';
import { frozenAt } from './clock';

export type Colorway = 'teal-coral' | 'black-red' | 'mauve-periwinkle' | 'indigo-pink' | 'violet-pink' | 'brown-orange';
export type Token = 'ink' | 'accent' | 'paper' | 'paper-2' | 'text' | 'on-ink';

export const STORAGE_KEY = 'c3:colorway';
export const list = colorways.items.map((c) => c.id) as Colorway[];
export const fallback: Colorway = 'teal-coral';

const isColorway = (v: unknown): v is Colorway => typeof v === 'string' && (list as string[]).includes(v);

const root = typeof document !== 'undefined' ? document.documentElement : null;
export let current: Colorway = isColorway(root?.dataset.colorway) ? (root.dataset.colorway as Colorway) : fallback;

/** At least this long between two visible colorway changes, ms (under 3 a second). */
export const GAP = 350;

type Transition = (apply: () => void, to: Colorway, from: Colorway) => Promise<void>;
let transition: Transition | null = null;
const listeners = new Set<(name: Colorway) => void>();
/** The newest pick not yet applied; newer picks replace it (latest wins). */
let latest: Colorway | null = null;
/** When the page may next change colorway (performance.now()). */
let nextAllowed = -Infinity;
let draining = false;
let drained: Promise<void> = Promise.resolve();

function apply(name: Colorway) {
  const previous = current;
  current = name;
  if (root) root.dataset.colorway = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Private mode or storage disabled: the choice just won't persist.
  }
  // One listener that throws must not stop the others or the bus event.
  listeners.forEach((fn) => {
    try {
      fn(name);
    } catch (err) {
      console.error('[c3] a colorway listener failed', err);
    }
  });
  emit('colorway', { name, previous });
}

/** One switch: through the transition unless `instant`. Never throws. */
async function run(name: Colorway, instant: boolean) {
  let applied = false;
  const from = current;
  try {
    if (transition && !instant) {
      await transition(() => {
        applied = true;
        apply(name);
      }, name, from);
    }
  } catch (err) {
    console.error('[c3] colorway transition failed; switching without it', err);
  } finally {
    if (!applied) apply(name); // no transition, or one that failed or forgot to apply
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Applies the newest pick, one at a time and at most once per GAP, until none is left. */
async function drain() {
  try {
    while (latest !== null) {
      const wait = frozenAt === null ? nextAllowed - performance.now() : 0;
      if (wait > 0) await sleep(wait);
      const name = latest;
      latest = null;
      if (name === null || name === current) continue;
      await run(name, wait > 0);
      nextAllowed = performance.now() + GAP;
    }
  } finally {
    draining = false;
  }
}

/**
 * Switches colorway, through the registered transition when there is one.
 * Never rejects: a transition that throws is logged and the swap still
 * happens, so one broken effect can't take the color bar down with it.
 * Resolves once no pick is left to apply.
 */
export function request(name: Colorway): Promise<void> {
  if (!isColorway(name)) return Promise.resolve();
  latest = name;
  if (!draining) {
    draining = true;
    drained = drain();
  }
  return drained;
}

/** The palette effect registers its wipe here; pass null to go back to instant swaps. */
export function setTransition(fn: Transition | null) {
  transition = fn;
}

/**
 * A unitless numeric token from tokens.css, e.g. number('fps-boil', 10).
 * Returns `fallback` when the token is missing or not a positive number. For
 * times use duration(): this drops units.
 */
export function number(token: string, fallback: number): number {
  if (!root) return fallback;
  const v = Number.parseFloat(getComputedStyle(root).getPropertyValue(`--${token}`));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/**
 * A time token in ms, e.g. duration('dur-wipe', 500). Reads `500ms` and `.5s`
 * alike (the CSS minifier rewrites one as the other); a bare number is ms.
 * Returns `fallback` when the token is missing or not a positive time.
 */
export function duration(token: string, fallback: number): number {
  if (!root) return fallback;
  return timeMs(getComputedStyle(root).getPropertyValue(`--${token}`), fallback);
}

/** A CSS time (`600ms`, `.6s`, or a bare number of ms) in ms; `fallback` unless positive. */
export function timeMs(raw: string, fallback: number): number {
  const s = raw.trim();
  const v = Number.parseFloat(s);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return /ms$/.test(s) ? v : /s$/.test(s) ? v * 1000 : v;
}

/** A token's resolved value on <html>, e.g. color('ink'). */
export function color(token: Token): string {
  if (!root) return '';
  return getComputedStyle(root).getPropertyValue(`--${token}`).trim();
}

export function onChange(cb: (name: Colorway) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
