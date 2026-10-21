// The printer's color bar: radio groups of her six colorways (in the poster's
// small print and again in the credits). Swaps colorways through
// core/palette, so it works with or without the palette effect's wipe.

import { current, onChange, request, type Colorway } from '../core/palette';

export function initColorbar() {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-colorway-input]'));
  const check = (name: Colorway) => inputs.forEach((input) => (input.checked = input.value === name));
  // The newest pick still on its way. core/palette applies at most one pick per
  // GAP ms, so while an arrow key is held it applies picks the radio has
  // already moved past; checking those again would send the next arrow press
  // back from there. So the radios only follow the colorway the visitor
  // picked last, or any colorway once no pick is pending.
  let picked: Colorway | null = null;
  const sync = (name: Colorway) => {
    if (picked !== null && name !== picked) return;
    picked = null;
    check(name);
  };

  check(current);
  onChange(sync);

  for (const input of inputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      const name = input.value as Colorway;
      picked = name;
      check(name); // both groups show the pick at once
      void request(name).then(() => {
        // Settled, perhaps without applying it (it was already the colorway).
        if (picked === name) {
          picked = null;
          check(current);
        }
      });
    });
  }
}
