// Boots the site. The HTML already holds the complete static poster and all
// copy; everything here is progressive enhancement. One effect that throws is
// logged and skipped, and never takes the page down with it.

import './styles/index.css';
import { quality, onChange, type Quality } from './core/motion';
import { enabled } from './core/flags';
import type { EffectModule } from './core/effect';
import { effects, type EffectEntry } from './effects/registry';
import { initMenu } from './ui/menu';
import { initColorbar } from './ui/colorbar';
import { initRsvpChip } from './ui/rsvp-chip';

const html = document.documentElement;
const running = new Map<EffectEntry['name'], { mod: EffectModule; root: HTMLElement; q: Quality }>();

function reveal(name: string) {
  html.classList.remove(`fx-pending-${name}`);
}

async function start(entry: EffectEntry, root: HTMLElement, q: Quality) {
  let mod: EffectModule | null = null;
  try {
    mod = await entry.load();
    await mod.init(root, { quality: q });
    // The quality level may have changed while the chunk loaded or init ran;
    // onChange only restarts effects already running, so catch up here.
    while (quality() !== q) {
      mod.destroy();
      q = quality();
      await mod.init(root, { quality: q });
    }
    running.set(entry.name, { mod, root, q });
  } catch (err) {
    console.error(`[c3] effect "${entry.name}" failed and was skipped`, err);
    try {
      mod?.destroy();
    } catch {
      // Already failing; the page carries on without it.
    }
  } finally {
    reveal(entry.name);
  }
}

const idle = (fn: () => void) =>
  typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200);

function schedule(entry: EffectEntry, root: HTMLElement): Promise<void> | void {
  const go = () => start(entry, root, quality());
  switch (entry.when) {
    case 'load':
      return go();
    case 'idle':
      return new Promise((resolve) => idle(() => void go().then(resolve)));
    case 'visible': {
      // Watch what the effect draws into: its `watch` targets, or the box
      // around its mount (a hidden defs mount has no box of its own).
      const targets = entry.watch
        ? Array.from(document.querySelectorAll(entry.watch))
        : [root.closest('.layer, section, .poster-stage') ?? root];
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        void go();
      });
      targets.forEach((t) => io.observe(t));
      return;
    }
    case 'interaction': {
      const events = ['pointerdown', 'keydown', 'scroll'] as const;
      const once = () => {
        events.forEach((type) => window.removeEventListener(type, once));
        void go();
      };
      events.forEach((type) => window.addEventListener(type, once, { passive: true }));
      return;
    }
  }
}

function boot() {
  initMenu();
  initColorbar();
  initRsvpChip();

  const pending: Promise<void>[] = [];
  for (const entry of effects) {
    const root = document.querySelector<HTMLElement>(entry.mount);
    if (!enabled(entry.name) || !root) {
      if (!root && enabled(entry.name)) console.warn(`[c3] no mount for "${entry.name}" (${entry.mount})`);
      reveal(entry.name);
      continue;
    }
    const p = schedule(entry, root);
    if (p) pending.push(p);
  }
  // Tests and screenshots wait for this: every `load` and `idle` effect has
  // settled (started or failed). `visible` and `interaction` effects start later
  // by design; shots and tests that need them scroll or interact first.
  void Promise.all(pending).then(() => (html.dataset.booted = ''));

  // Reduced motion switched on, or the device proved slow: restart running
  // effects at the new quality level. A drop to lite waits while the menu is
  // open: restarting halo-menu would swap the ring for the grid under the
  // visitor's finger (and the ring's own frames are what trip the slow
  // check). Reduced motion applies at once.
  const menu = document.querySelector<HTMLDialogElement>('dialog#menu');
  let held = false;
  onChange((q) => {
    held = q !== 'static' && Boolean(menu?.open);
    if (!held) restart(q);
  });
  menu?.addEventListener('close', () => {
    if (!held) return;
    held = false;
    restart(quality());
  });
}

function restart(q: Quality) {
  for (const [name, { mod, root, q: was }] of running) {
    const entry = effects.find((e) => e.name === name);
    if (!entry || was === q) continue;
    // Its lite is its full: nothing would change but a restart mid-scroll.
    if (entry.liteIsFull && was !== 'static' && q !== 'static') continue;
    try {
      mod.destroy();
    } catch (err) {
      console.error(`[c3] effect "${name}" failed to stop`, err);
    }
    running.delete(name);
    void start(entry, root, q);
  }
}

boot();
