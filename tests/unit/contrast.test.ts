// The floor: text contrast of at least 4.5:1 wherever text sits.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/styles/base.css', import.meta.url), 'utf8');
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!m) throw new Error(`no token --${name}`);
  return m[1] as string;
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

// [text, background] pairs as used in the CSS
const PAIRS: [string, string][] = [
  ['ink', 'paper'],
  ['ink', 'inner'],
  ['ink', 'inner-2'],
  ['mute', 'paper'],
  ['mute', 'inner'],
  ['mute', 'inner-2'],
  ['dtext', 'dark'],
  ['dtext', 'dark-2'],
  ['dmute', 'dark'],
  ['dmute', 'dark-2'],
  ['ext-text', 'dark'],
  ['ext-mute', 'dark'],
  ['dtext', 'ink'],
  ['dtext', 'plum'],
  ['dtext', 'red'],
  ['dark', 'dtext'],
];

describe('contrast', () => {
  for (const [fg, bg] of PAIRS) {
    it(`${fg} on ${bg} is at least 4.5:1`, () => {
      expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
  }
});
