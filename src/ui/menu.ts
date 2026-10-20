// The menu: a real <dialog> holding a real <nav> list (SPEC §6). Works on its
// own; the halo-menu effect only adds the ring of screens inside it.
//
// Opened by the Menu button or the halo in the poster. Esc and Close shut it,
// and focus returns to whatever opened it. A `navigate` bus event (from the
// halo ring) closes it and scrolls to the section.

import { emit, on } from '../core/bus';
import { reducedMotion } from '../core/motion';

export function initMenu() {
  const dialog = document.querySelector<HTMLDialogElement>('dialog#menu');
  if (!dialog) return;
  let opener: HTMLElement | null = null;

  document.querySelectorAll<HTMLElement>('[data-menu-open]').forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener('click', () => {
      opener = btn;
      dialog.showModal();
      emit('menu:open', { source: btn.dataset.menuOpen === 'halo' ? 'halo' : 'button' });
    });
  });

  dialog.querySelector('[data-menu-close]')?.addEventListener('click', () => dialog.close());

  // A click on the backdrop closes it too. Test the point, not the target: the
  // dialog's own padding is also `e.target === dialog`, and on phones the
  // dialog is the whole screen.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog || (e.clientX === 0 && e.clientY === 0)) return; // keyboard "clicks" have no point
    const r = dialog.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside) dialog.close();
  });

  // Where to go once the dialog has closed. Navigation waits for `close`, because
  // closing a dialog restores focus to its opener and would undo ours.
  let target: string | null = null;

  dialog.addEventListener('close', () => {
    emit('menu:close', {});
    const goingTo = target ? document.getElementById(target) : null;
    if (goingTo) {
      goingTo.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      const heading = goingTo.querySelector<HTMLElement>('h1, h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
      history.replaceState(null, '', `#${goingTo.id}`);
    } else {
      // The halo hit area is pointer-only, so focus goes back to the Menu button.
      const back = opener?.dataset.menuOpen === 'halo' ? document.querySelector<HTMLElement>('[data-menu-open=""]') : opener;
      back?.focus();
    }
    target = null;
    opener = null;
  });

  const go = (id: string) => {
    if (!document.getElementById(id)) return;
    target = id;
    if (dialog.open) dialog.close();
    else dialog.dispatchEvent(new Event('close'));
  };

  dialog.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      go(a.hash.slice(1));
    });
  });

  on('navigate', ({ id }) => go(id));
}
