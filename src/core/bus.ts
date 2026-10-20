// Typed events between effects, so they never import each other.
//
//   on('navigate', ({ id }) => ...)
//   emit('menu:open', { source: 'halo' })

import type { Colorway } from './palette';

export interface BusEvents {
  /** The colorway changed. Canvas and WebGL effects redraw with palette.color(). */
  colorway: { name: Colorway; previous: Colorway };
  /** Scroll to a section, e.g. from the halo menu. */
  navigate: { id: string };
  'menu:open': { source: 'button' | 'halo' };
  'menu:close': Record<string, never>;
}

type Handler<K extends keyof BusEvents> = (detail: BusEvents[K]) => void;

const handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

export function on<K extends keyof BusEvents>(type: K, fn: Handler<K>): () => void {
  let set = handlers.get(type);
  if (!set) handlers.set(type, (set = new Set()));
  set.add(fn as Handler<never>);
  return () => set.delete(fn as Handler<never>);
}

export function emit<K extends keyof BusEvents>(type: K, detail: BusEvents[K]): void {
  handlers.get(type)?.forEach((fn) => (fn as Handler<K>)(detail));
}
