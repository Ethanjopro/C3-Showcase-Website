// Text contrast in all six colorways, parsed from src/styles/tokens.css
// (SPEC §4 and §6: text clears 4.5:1 everywhere; teal is darkened to 5:1).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import colorways from '../../src/content/colorways.json';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');

function block(name: string): Record<string, string> {
  const re = new RegExp(`\\[data-colorway='${name}'\\]\\s*\\{([^}]*)\\}`);
  const body = css.match(re)?.[1];
  if (!body) throw new Error(`tokens.css has no [data-colorway='${name}'] block`);
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('colorway tokens', () => {
  const ids = colorways.items.map((c) => c.id);

  it('defines all six colorways with every token', () => {
    expect(ids).toHaveLength(6);
    for (const id of ids) {
      expect(Object.keys(block(id)).sort()).toEqual(['accent', 'ink', 'on-ink', 'paper', 'paper-2', 'text']);
    }
  });

  for (const id of ids) {
    it(`${id}: text clears 4.5:1 on both papers, and on-ink on ink`, () => {
      const t = block(id);
      expect(contrast(t.text!, t.paper!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.text!, t['paper-2']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['on-ink']!, t.ink!)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('teal-coral text keeps a 5:1 margin for the grain', () => {
    const t = block('teal-coral');
    expect(contrast(t.text!, t.paper!)).toBeGreaterThanOrEqual(5);
  });
});
