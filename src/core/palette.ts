// Her six colorways. The colors live in src/styles/tokens.css as
// [data-colorway] blocks; this module switches between them.
//
//   request(name)         switch, through the registered transition if any
//   setTransition(fn)     the palette effect's wipe; without one, swaps are instant
//   color('ink')          resolved CSS color, for canvas and WebGL
//   onChange(cb)
//
// The inline boot script in index.html applies the stored colorway before
// first paint, so there's no flash of the default.

import colorways from '../content/colorways.json';
import { emit } from './bus';

export type Colorway = 'teal-coral' | 'black-red' | 'mauve-periwinkle' | 'indigo-pink' | 'violet-pink' | 'brown-orange';
export type Token = 'ink' | 'accent' | 'paper' | 'paper-2' | 'text' | 'on-ink';

export const STORAGE_KEY = 'c3:colorway';
export const list = colorways.items.map((c) => c.id) as Colorway[];
export const fallback: Colorway = 'teal-coral';

const isColorway = (v: unknown): v is Colorway => typeof v === 'string' && (list as string[]).includes(v);

const root = typeof document !== 'undefined' ? document.documentElement : null;
export let current: Colorway = isColorway(root?.dataset.colorway) ? (root.dataset.colorway as Colorway) : fallback;

type Transition = (apply: () => void, to: Colorway, from: Colorway) => Promise<void>;
let transition: Transition | null = null;
let pending: Promise<void> = Promise.resolve();
const listeners = new Set<(name: Colorway) => void>();

function apply(name: Colorway) {
  const previous = current;
  current = name;
  if (root) root.dataset.colorway = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Private mode or storage disabled: the choice just won't persist.
  }
  listeners.forEach((fn) => fn(name));
  emit('colorway', { name, previous });
}

/** Switches colorway, through the registered transition when there is one. */
export function request(name: Colorway): Promise<void> {
  if (!isColorway(name)) return Promise.resolve();
  pending = pending.then(async () => {
    if (name === current) return;
    if (!transition) return apply(name);
    let applied = false;
    const from = current;
    try {
      await transition(() => {
        applied = true;
        apply(name);
      }, name, from);
    } finally {
      if (!applied) apply(name); // a transition that forgets to apply still switches
    }
  });
  return pending;
}

/** The palette effect registers its wipe here; pass null to go back to instant swaps. */
export function setTransition(fn: Transition | null) {
  transition = fn;
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
