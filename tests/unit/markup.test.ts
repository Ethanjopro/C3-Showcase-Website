import { describe, expect, it } from 'vitest';
import site from '../../src/content/site.json';
import scene from '../../src/art/scene.json';
import widths from '../../src/content/title-widths.json';
import { esc, renderCase, type Content, type Scene } from '../../src/markup.ts';
import { emWidth, fitFraction } from '../../src/fit.ts';

const c = site as unknown as Content;
const s = scene as unknown as Scene;
const W = widths.widths as Record<string, number>;
const html = renderCase(c, s, W);
const count = (re: RegExp) => (html.match(re) ?? []).length;

describe('markup', () => {
  it('has one camera, feed, key and channel per channel', () => {
    expect(c.channels).toHaveLength(6);
    expect(s.cameras).toHaveLength(6);
    expect(count(/class="cam"/g)).toBe(6);
    expect(count(/class="feed"/g)).toBe(6);
    expect(count(/class="key"/g)).toBe(6);
    expect(count(/<section class="ch"/g)).toBe(6);
  });

  it('links every channel the same way from the halo, the feeds and the keys', () => {
    for (const ch of c.channels) expect(count(new RegExp(`href="#${ch.id}"`, 'g'))).toBeGreaterThanOrEqual(3);
  });

  it('never gives a channel section the id its hash uses (no jump-scrolling)', () => {
    for (const ch of c.channels) expect(html).not.toContain(`id="${ch.id}"`);
  });

  it('says what, when and where in the heading', () => {
    expect(html).toMatch(/<h1[^>]*>C3 Showcase[^<]*Date 0\.0\.0[^<]*Location 0\.0\.0/);
  });

  it('hides links whose URL is empty', () => {
    expect(c.rsvpUrl).toBe('');
    expect(html).not.toContain('Add to calendar');
    expect(html).not.toContain('Read the code on GitHub');
    expect(html).toContain(c.rsvpSoon);
    const withUrls = renderCase({ ...c, rsvpUrl: 'https://example.com/rsvp', sourceUrl: 'https://example.com/src' }, s, W);
    expect(withUrls).toContain('href="https://example.com/rsvp"');
    expect(withUrls).toContain('Read the code on GitHub');
    expect(html).not.toContain('bar__follow');
    expect(renderCase({ ...c, followUrl: 'https://example.com/f' }, s, W)).toContain('class="cap bar__rsvp bar__follow" href="https://example.com/f"');
  });

  it('escapes content', () => {
    expect(esc('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
    expect(renderCase({ ...c, date: '<b>' }, s, W)).not.toContain('<b>');
  });

  it('leaves her X-ray to load when the case opens', () => {
    expect(html).not.toContain('her-xray');
    expect(count(/data-xray/g)).toBe(2);
  });

  it('only points at art in src/art', () => {
    const refs = html.match(/\/src\/art\/[\w.-]+/g) ?? [];
    expect(refs.length).toBeGreaterThan(0);
    expect(html).not.toContain('reference/');
  });
});

describe('title fitting', () => {
  it('fills the column with long lines and caps short ones', () => {
    expect(fitFraction('AND WHERE', W) * emWidth('AND WHERE', W)).toBeCloseTo(0.985, 2);
    expect(fitFraction('OFF', W)).toBe(0.36);
    for (const ch of c.channels) for (const line of ch.title) expect(fitFraction(line, W) * emWidth(line, W)).toBeLessThanOrEqual(1);
  });
});
