// The printer's color bar: radio groups of her six colorways (in the poster's
// small print and again in the credits). Swaps colorways through
// core/palette, so it works with or without the palette effect's wipe.

import { current, onChange, request, type Colorway } from '../core/palette';

export function initColorbar() {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-colorway-input]'));
  const sync = (name: Colorway) => inputs.forEach((input) => (input.checked = input.value === name));

  sync(current);
  onChange(sync);

  for (const input of inputs) {
    input.addEventListener('change', () => {
      if (input.checked) void request(input.value as Colorway);
    });
  }
}
