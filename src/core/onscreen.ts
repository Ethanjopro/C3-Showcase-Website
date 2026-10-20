// Offscreen tracking: one shared IntersectionObserver for the whole site, so
// every effect pauses at the same edge (10 % of the viewport beyond it).
// core/ticker uses it for `el`; effects that tick on the compositor (CSS
// animations) use it directly. No GSAP, so load-time effects stay light.
//
//   const off = observeOnscreen(poster, (on) => pause(!on));

/** Calls `cb(onscreen)` now if the state is known, and on every change. Returns an unsubscribe. */
const watchers = new Map<Element, Set<(on: boolean) => void>>();
// Last known state per element: the observer reports an element once, so a
// later subscriber to an element already watched learns its state from here.
const onscreen = new Map<Element, boolean>();
let io: IntersectionObserver | null = null;

export function observeOnscreen(el: Element, cb: (on: boolean) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    cb(true);
    return () => {};
  }
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        onscreen.set(e.target, e.isIntersecting);
        watchers.get(e.target)?.forEach((fn) => fn(e.isIntersecting));
      }
    },
    { rootMargin: '10% 0px' },
  );
  let set = watchers.get(el);
  if (!set) {
    set = new Set();
    watchers.set(el, set);
    io.observe(el);
  }
  set.add(cb);
  const known = onscreen.get(el);
  if (known !== undefined) cb(known);
  return () => {
    set.delete(cb);
    if (!set.size) {
      watchers.delete(el);
      onscreen.delete(el);
      io?.unobserve(el);
    }
  };
}
