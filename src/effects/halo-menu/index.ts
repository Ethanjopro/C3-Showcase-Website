// halo-menu (SPEC §3 row 6, PLAN step 7). The menu becomes her halo: a ring
// of boxy screens strung on a cable loop, one screen per section.
//
// Enhance, don't replace: the <dialog> and its <nav> list (src/ui/menu.ts)
// keep working on their own and stay the source of truth. This module is the
// small part that loads at idle:
//   - arrow keys move focus through the list (all qualities); Enter, Esc and
//     focus return stay native / menu.ts
//   - full quality with WebGL: on `menu:open` it loads ring.ts (Three.js) and
//     mounts the ring; on `menu:close` the ring disposes everything
//   - Three.js is fetched on intent, when a pointer or focus reaches a menu
//     trigger, never at load or idle: SPEC §9.14 checks that no Three.js chunk
//     is requested before the menu is first used (the PR notes the conflict
//     with SPEC §6's "prefetched when idle")
//   - static, lite, or no WebGL: nothing more; the list is the grid of screens
//
// Outside its mount it writes only <html data-fx-halo-menu>:
//   "grid"  the list is the menu (static, lite, no WebGL, or the ring failed)
//   "ring"  the ring is live: style.css turns the list into a strip of small
//           screens under the ring, still visible, focusable and clickable

import type { EffectOptions } from '../../core/effect';
import { on } from '../../core/bus';
import type { Ring } from './ring';
import './style.css';

const ATTR = 'data-fx-halo-menu';

let generation = 0;
let offs: (() => void)[] = [];
let ring: Ring | null = null;
let loading: Promise<typeof import('./ring')> | null = null;

const load = () => (loading ??= import('./ring'));

/** Is WebGL there at all? Asked of a throwaway canvas, so Three.js never logs a failure. */
function webgl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function links(dialog: HTMLDialogElement): HTMLAnchorElement[] {
  return Array.from(dialog.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]'));
}

/** Arrow keys walk the list, wrapping; Home and End jump to its ends. */
function arrows(dialog: HTMLDialogElement) {
  const onKey = (e: KeyboardEvent) => {
    const list = links(dialog);
    const i = list.indexOf(document.activeElement as HTMLAnchorElement);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i < 0 ? 0 : (i + 1) % list.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i < 0 ? list.length - 1 : (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    if (next < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    list[next]?.focus();
  };
  dialog.addEventListener('keydown', onKey);
  return () => dialog.removeEventListener('keydown', onKey);
}

export function init(root: HTMLElement, opts: EffectOptions): void {
  destroy();
  const gen = generation;
  const dialog = root.closest<HTMLDialogElement>('dialog');
  if (!dialog) return;
  const html = document.documentElement;
  offs.push(arrows(dialog));

  if (opts.quality !== 'full' || !webgl()) {
    html.setAttribute(ATTR, 'grid');
    root.dataset.state = 'grid';
    return;
  }
  html.setAttribute(ATTR, 'grid'); // until a ring is up
  root.dataset.state = 'idle';

  // Fetch Three.js on intent: a pointer over, or focus on, a menu trigger.
  const prefetch = () => void load().catch(() => {});
  for (const el of document.querySelectorAll<HTMLElement>('[data-menu-open]')) {
    for (const type of ['pointerenter', 'pointerdown', 'focus'] as const) {
      el.addEventListener(type, prefetch, { passive: true, once: true });
      offs.push(() => el.removeEventListener(type, prefetch));
    }
  }

  const close = () => {
    ring?.dispose();
    ring = null;
    if (gen !== generation) return;
    html.setAttribute(ATTR, 'grid');
    root.dataset.state = 'idle';
  };

  offs.push(
    on('menu:open', ({ source }) => {
      root.dataset.state = 'loading';
      load()
        .then(({ createRing }) => {
          if (gen !== generation || !dialog.open || ring) return;
          const list = links(dialog);
          const active = Math.max(0, list.indexOf(document.activeElement as HTMLAnchorElement));
          ring = createRing(root, { links: list, active, fromHalo: source === 'halo' });
          html.setAttribute(ATTR, 'ring');
          root.dataset.state = 'ring';
        })
        .catch((err) => {
          // The list still works; the ring just doesn't come.
          console.warn('[c3] halo-menu: the ring failed; the menu stays a grid', err);
          close();
          if (gen === generation) root.dataset.state = 'grid';
        });
    }),
    on('menu:close', close),
  );
  offs.push(close);
}

export function destroy(): void {
  generation++;
  const run = offs;
  offs = [];
  run.forEach((off) => off());
  ring?.dispose();
  ring = null;
  document.documentElement.removeAttribute(ATTR);
  document.querySelector<HTMLElement>('[data-fx="halo-menu"]')?.removeAttribute('data-state');
}
