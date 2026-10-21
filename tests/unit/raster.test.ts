import { describe, expect, it } from 'vitest';
import { steppedKeyframes } from '../../src/core/raster';
import { roughFrame } from '../../src/core/rough-frame';

describe('raster', () => {
  it('writes step-end keyframes with each frame starting just before its edge', () => {
    expect(steppedKeyframes('k', ['a:1', 'a:2', 'a:3', 'a:4'])).toBe('@keyframes k{0%{a:1}24.99%{a:2}49.99%{a:3}74.99%,100%{a:4}}');
    expect(steppedKeyframes('k', ['a:1', 'a:2', 'a:3'])).toBe('@keyframes k{0%{a:1}33.323%{a:2}66.657%,100%{a:3}}');
    expect(steppedKeyframes('k', ['a:1'])).toBe('@keyframes k{0%{a:1}}');
  });
});

describe('roughFrame', () => {
  it('draws the same frame from the same seed, with an echo by default', () => {
    const svg = roughFrame(19);
    expect(svg).toBe(roughFrame(19));
    expect(svg.match(/<path /g)).toHaveLength(2);
    expect(svg).toContain('class="rough-frame__echo"');
  });

  it('draws one pass per entry; the X-ray toggle uses a single bold pass', () => {
    const svg = roughFrame(29, [3]);
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).not.toContain('rough-frame__echo');
  });
});
