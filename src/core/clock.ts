// Time helpers with no GSAP, so load-time effects can use them without
// pulling in the ticker.
//
//   frozenAt    ?freeze=<ms>, or null: the clock every effect shows during a
//               deterministic screenshot. core/ticker runs on it; compositor
//               (CSS) animations pause at -frozenAt ms.
//   idle()      resolves when the browser is idle, for slicing one-time work

function readFreeze(): number | null {
  if (typeof location === 'undefined') return null;
  const v = new URLSearchParams(location.search).get('freeze');
  return v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
}

export const frozenAt: number | null = readFreeze();

/** Resolves on the next idle period, or after `timeout` ms at the latest. */
export function idle(timeout = 300): Promise<void> {
  return new Promise((resolve) =>
    typeof requestIdleCallback === 'function' ? requestIdleCallback(() => resolve(), { timeout }) : setTimeout(resolve, 16),
  );
}
