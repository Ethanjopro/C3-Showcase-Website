// The inline boot script in index.html must agree with src/core/flags.ts about
// which effects are on, or prehide hides (or fails to hide) the wrong ones.

import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { bootScript } from '../../scripts/vite/c3-html';
import { parseFlags } from '../../src/core/flags';

const effects = { 'line-boil': true, 'c3-window': true, 'sketch-in': false, xray: true };
const prehide = ['c3-window', 'sketch-in'];
const colorways = ['teal-coral', 'black-red'];

/** Runs the boot script against a fake page; returns the classes it set on <html>. */
function boot(search: string, opts: { reduced?: boolean; stored?: string; done?: string[] } = {}) {
  const classes = new Set<string>();
  const attrs: Record<string, string> = {};
  const html = {
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
    setAttribute: (k: string, v: string) => (attrs[k] = v),
  };
  const js = bootScript({ effects, prehide }, colorways).replace(/^<script>|<\/script>$/g, '');
  runInNewContext(js, {
    document: { documentElement: html },
    location: { search },
    URLSearchParams,
    window: { matchMedia: true },
    matchMedia: () => ({ matches: Boolean(opts.reduced) }),
    localStorage: { getItem: () => opts.stored ?? null },
    sessionStorage: { getItem: (k: string) => (opts.done?.some((n) => k === `c3:fx-done:${n}`) ? '1' : null) },
    setTimeout: () => 0,
  });
  return { pending: [...classes].filter((c) => c.startsWith('fx-pending-')).map((c) => c.slice(11)).sort(), attrs, classes };
}

const expected = (search: string) => prehide.filter((n) => parseFlags(effects, search)[n]).sort();

describe('boot script', () => {
  for (const search of ['', '?off=c3-window', '?only=line-boil', '?only=line-boil,%20c3-window', '?only=sketch-in', '?only=sketch-in&off=sketch-in', '?off=all', '?off=, c3-window ,']) {
    it(`prehides what parseFlags enables: "${search}"`, () => {
      expect(boot(search).pending).toEqual(expected(search));
    });
  }

  it('prehides nothing under reduced motion or ?quality=static', () => {
    expect(boot('', { reduced: true }).pending).toEqual([]);
    expect(boot('?quality=static').pending).toEqual([]);
    expect(boot('?quality=full', { reduced: true }).pending).toEqual(['c3-window']);
  });

  it('skips effects already played this session', () => {
    expect(boot('?only=c3-window,sketch-in', { done: ['sketch-in'] }).pending).toEqual(['c3-window']);
  });

  it('applies a stored colorway, and ignores unknown ones', () => {
    expect(boot('', { stored: 'black-red' }).attrs['data-colorway']).toBe('black-red');
    expect(boot('', { stored: '"><script>' }).attrs['data-colorway']).toBeUndefined();
    expect(boot('').classes.has('js')).toBe(true);
  });
});
