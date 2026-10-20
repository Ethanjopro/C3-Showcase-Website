// panel-wipe (SPEC §3 row 9, PLAN step 10). Each section header enters once
// from behind a flat block, accent or ink by turns, that slides off it.
//
//   - One block per `[data-fx="panel-wipe"]` mount (one in each section
//     header). Headers below the fold at init start covered; on the header's
//     first scroll.onEnter its block slides off to the right (--dur-wipe,
//     about 500 ms) and is removed. Each section plays once.
//   - A header already on screen or scrolled past at init gets no block:
//     covering what the visitor is reading would be a flash, not an entrance.
//     Headers stay done across restarts (a quality change re-runs init).
//   - The heading stays in the accessibility tree throughout: the block is in
//     an aria-hidden mount, absolutely positioned, and moves by transform only
//     (no layout shift). Focus landing in a header (the menu jumps to a
//     section's heading) finishes its wipe at once, so focus stays visible.
//   - `?freeze=<ms>` holds each wipe at that time after its header enters.
//
// Each mount carries data-state: covered | wiping | done.
//
//   full, lite  as above (it has no extras to drop)
//   static      off: the headers are simply there

import type { EffectOptions } from '../../core/effect';
import { frozenAt } from '../../core/clock';
import { onEnter } from '../../core/scroll';
import './style.css';

/** Used when --dur-wipe is missing. */
const DEFAULT_MS = 500;
const DEFAULT_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

let offs: (() => void)[] = [];
let wraps: HTMLElement[] = [];
let anims: Animation[] = [];
let mounts: HTMLElement[] = [];

/**
 * A time token in ms. core/palette's number() drops the unit, and the CSS
 * minifier writes 500ms as .5s (proposed shared fix in the PR).
 */
function duration(style: CSSStyleDeclaration, token: string, fallback: number): number {
  const raw = style.getPropertyValue(`--${token}`).trim();
  const v = Number.parseFloat(raw);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return /ms$/.test(raw) ? v : /s$/.test(raw) ? v * 1000 : v;
}

/**
 * Headers whose entrance is over: wiped, on screen at init, or already
 * scrolled past. Module state, so a restart (a quality change calls destroy()
 * then init()) never covers them again: each section plays once.
 */
const seen = new WeakSet<Element>();

/** Still ahead of the visitor: entirely below the viewport. */
function ahead(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.top >= window.innerHeight;
}

export function init(root: HTMLElement, opts: EffectOptions): void {
  destroy();
  if (opts.quality === 'static' || typeof Element.prototype.animate !== 'function') return;
  const style = getComputedStyle(document.documentElement);
  const ms = duration(style, 'dur-wipe', DEFAULT_MS);
  const easing = style.getPropertyValue('--ease-in-out').trim() || DEFAULT_EASE;

  // The root mount and the extra ones (data-part), in page order.
  mounts = [root, ...document.querySelectorAll<HTMLElement>('[data-fx="panel-wipe"][data-part]')];
  mounts.forEach((mount, i) => {
    const header = mount.parentElement;
    if (!header || seen.has(header) || !ahead(header)) {
      if (header) seen.add(header);
      mount.dataset.state = 'done';
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'panel-wipe';
    const block = document.createElement('div');
    block.className = `panel-wipe__block panel-wipe__block--${i % 2 ? 'ink' : 'accent'}`;
    wrap.append(block);
    mount.append(wrap);
    wraps.push(wrap);
    mount.dataset.state = 'covered';

    const finish = () => {
      seen.add(header);
      wrap.remove();
      mount.dataset.state = 'done';
      header.removeEventListener('focusin', finish);
    };
    header.addEventListener('focusin', finish);
    offs.push(() => header.removeEventListener('focusin', finish));

    offs.push(
      onEnter(
        header,
        () => {
          if (mount.dataset.state !== 'covered') return;
          mount.dataset.state = 'wiping';
          seen.add(header);
          const anim = block.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(101%)' }], { duration: ms, easing, fill: 'forwards' });
          anims.push(anim);
          if (frozenAt !== null) {
            anim.pause();
            anim.currentTime = Math.min(ms, frozenAt);
            return;
          }
          anim.finished.then(finish, () => {}); // cancelled by destroy()
        },
        { once: true },
      ),
    );
  });
}

export function destroy(): void {
  offs.forEach((off) => off());
  offs = [];
  anims.forEach((a) => a.cancel());
  anims = [];
  wraps.forEach((w) => w.remove());
  wraps = [];
  mounts.forEach((m) => delete m.dataset.state);
  mounts = [];
}
