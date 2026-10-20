// palette (SPEC §3 row 7, PLAN step 8). Picking a colorway slides a flat block
// of the new accent, then one of the new ink, across the page; the colorway
// changes while the ink covers everything, and the blocks slide off the other
// side, ink first, so the page comes out recolored, art included.
//
//   - It only registers core/palette's transition. The color bar (src/ui)
//     still owns the radio group and calls palette.request(); core/palette
//     writes <html data-colorway> when this effect calls apply().
//   - The blocks live in the effect's fixed mount, inside a wrapper that
//     carries the new colorway's data-colorway, so they already wear its
//     tokens. Transforms only, created for the wipe and removed after it.
//   - Canvas and WebGL effects redraw on the bus's `colorway` event, which
//     fires at apply(), under the ink; this effect never touches them.
//   - Picks in quick succession (holding an arrow key in the radio group)
//     don't queue a wipe each: one that follows another within COALESCE ms
//     swaps instantly.
//   - `?freeze=<ms>` holds the wipe at that time, for the mid-wipe shot.
//
// The mount carries data-state: idle | wiping.
//
//   full    accent block, then ink block (PLAN: about 600 ms)
//   lite    the ink block alone
//   static  no transition registered: the swap is instant

import type { EffectOptions } from '../../core/effect';
import { frozenAt } from '../../core/clock';
import { setTransition, type Colorway } from '../../core/palette';
import './style.css';

/** The whole wipe, on and off, when --dur-palette is missing. */
const DEFAULT_MS = 600;
/** Within a half (cover or uncover), the second block trails the first by this share. */
const TRAIL = 0.27;
/** A pick this soon after the last wipe ended swaps without one. */
const COALESCE = 350;
/** Used when --ease-in-out is missing. */
const DEFAULT_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

let mount: HTMLElement | null = null;
let wrap: HTMLElement | null = null;
let running: Animation[] = [];
let lastEnd = -Infinity;

/**
 * A time token in ms. core/palette's number() drops the unit, and the CSS
 * minifier writes 600ms as .6s, so it would read 0.6 (proposed shared fix in
 * the PR: a duration() helper in core/palette).
 */
function duration(style: CSSStyleDeclaration, token: string, fallback: number): number {
  const raw = style.getPropertyValue(`--${token}`).trim();
  const v = Number.parseFloat(raw);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return /ms$/.test(raw) ? v : /s$/.test(raw) ? v * 1000 : v;
}

function clear() {
  running.forEach((a) => a.cancel());
  running = [];
  wrap?.remove();
  wrap = null;
  if (mount) mount.dataset.state = 'idle';
}

/** Slides each block from `from` to `to`, the later ones trailing. Returns their animations. */
function slide(blocks: HTMLElement[], from: string, to: string, half: number, easing: string): Animation[] {
  const trail = blocks.length > 1 ? half * TRAIL : 0;
  return blocks.map((el, i) =>
    el.animate([{ transform: `translateX(${from})` }, { transform: `translateX(${to})` }], {
      duration: half - trail,
      delay: i * trail,
      easing,
      fill: 'both',
    }),
  );
}

function makeTransition(lite: boolean) {
  return async (apply: () => void, to: Colorway): Promise<void> => {
    clear();
    const now = performance.now();
    if (!mount || document.hidden || (frozenAt === null && now - lastEnd < COALESCE)) {
      apply();
      lastEnd = now;
      return;
    }
    const style = getComputedStyle(document.documentElement);
    const half = duration(style, 'dur-palette', DEFAULT_MS) / 2;
    const ease = style.getPropertyValue('--ease-in-out').trim() || DEFAULT_EASE;
    wrap = document.createElement('div');
    wrap.className = 'palette-wipe';
    wrap.dataset.colorway = to;
    const make = (kind: 'accent' | 'ink') => {
      const el = document.createElement('div');
      el.className = `palette-wipe__block palette-wipe__block--${kind}`;
      return el;
    };
    // Covering: accent leads, ink follows on top of it. Uncovering: ink leaves
    // first, showing the accent, then the accent, showing the page.
    const cover = lite ? [make('ink')] : [make('accent'), make('ink')];
    wrap.append(...cover);
    mount.append(wrap);
    mount.dataset.state = 'wiping';
    try {
      running = slide(cover, '-101%', '0%', half, ease);
      const frozen = frozenAt;
      if (frozen !== null) {
        // Hold the wipe where the frozen clock puts it; the swap happens at half time.
        if (frozen < half) {
          running.forEach((a) => (a.pause(), (a.currentTime = frozen)));
        } else {
          running.forEach((a) => a.finish());
          apply();
          running = slide([...cover].reverse(), '0%', '101%', half, ease);
          running.forEach((a) => (a.pause(), (a.currentTime = frozen - half)));
        }
        return;
      }
      await Promise.all(running.map((a) => a.finished));
      apply();
      running = slide([...cover].reverse(), '0%', '101%', half, ease);
      await Promise.all(running.map((a) => a.finished));
      clear();
    } finally {
      lastEnd = performance.now();
    }
  };
}

export function init(root: HTMLElement, opts: EffectOptions): void {
  destroy();
  mount = root;
  root.dataset.state = 'idle';
  if (opts.quality === 'static' || typeof Element.prototype.animate !== 'function') return;
  setTransition(makeTransition(opts.quality === 'lite'));
}

export function destroy(): void {
  setTransition(null);
  clear();
  if (mount) delete mount.dataset.state;
  mount = null;
}
