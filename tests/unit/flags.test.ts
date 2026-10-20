import { describe, expect, it } from 'vitest';
import { parseFlags } from '../../src/core/flags';

const defaults = { 'line-boil': true, xray: true, palette: true, cables: false };

describe('flags', () => {
  it('keeps the defaults with no query', () => {
    expect(parseFlags(defaults, '')).toEqual(defaults);
  });

  it('?off turns named effects off', () => {
    expect(parseFlags(defaults, '?off=xray,palette')).toEqual({ 'line-boil': true, xray: false, palette: false, cables: false });
  });

  it('?only turns everything else off, and can turn on a default-off effect', () => {
    expect(parseFlags(defaults, '?only=line-boil,cables')).toEqual({ 'line-boil': true, xray: false, palette: false, cables: true });
  });

  it('?off wins over ?only', () => {
    expect(parseFlags(defaults, '?only=xray,palette&off=palette')).toEqual({ 'line-boil': false, xray: true, palette: false, cables: false });
  });

  it('?off=all is the static poster', () => {
    expect(Object.values(parseFlags(defaults, '?off=all')).every((v) => v === false)).toBe(true);
  });

  it('ignores unknown names and stray commas', () => {
    expect(parseFlags(defaults, '?off=,nope,,xray')).toEqual({ ...defaults, xray: false });
  });
});
