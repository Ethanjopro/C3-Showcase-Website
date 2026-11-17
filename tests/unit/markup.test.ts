import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import site from '../../src/content/site.json';
import scene from '../../src/art/scene.json';
import widths from '../../src/content/title-widths.json';
import { esc, renderCase, type Content, type Scene } from '../../src/markup.ts';
import { describe as describePage } from '../../scripts/vite/case-html.ts';
import { emWidth, fitFraction } from '../../src/fit.ts';

const c = site as unknown as Content;
const s = scene as unknown as Scene;
const W = widths.widths as Record<string, number>;
const html = renderCase(c, s, W);
const count = (re: RegExp, text = html) => (text.match(re) ?? []).length;
const text = (h: string) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');

describe('markup', () => {
  it('has one camera, feed, key and channel per channel', () => {
    const n = c.channels.length;
    expect(n).toBe(4);
    expect(count(/class="cam"/g)).toBe(n);
    expect(count(/class="feed"/g)).toBe(n);
    expect(count(/class="key"/g)).toBe(n);
    expect(count(/<section class="ch"/g)).toBe(n);
  });

  it('links every channel the same way from the halo, the feeds and the keys', () => {
    for (const ch of c.channels) expect(count(new RegExp(`href="#${ch.id}"`, 'g'))).toBeGreaterThanOrEqual(3);
  });

  it('shows a channel only through CSS that knows its id', () => {
    const css = readFileSync(new URL('../../src/styles/channels.css', import.meta.url), 'utf8');
    for (const ch of c.channels) expect(css).toContain(`.case[data-channel='${ch.id}'] .ch[data-ch='${ch.id}']`);
  });

  it('never gives a channel section the id its hash uses (no jump-scrolling)', () => {
    for (const ch of c.channels) expect(html).not.toContain(`id="${ch.id}"`);
  });

  it('says what, when and where in the heading', () => {
    expect(html).toMatch(/<h1[^>]*>C3 Showcase: the Creative Computing class showcase\. Thursday, December 3, 2026, 5:00–6:30 PM\. Grand Atrium, Meadows School of the Arts, SMU\.<\/h1>/);
  });

  it('puts the date, time and place on the sealed doors, under her card and in the event panel', () => {
    for (const cls of ['door__dl', 'sheet__when', 'event']) expect(html, cls).toMatch(new RegExp(`class="[^"]*\\b${cls}\\b`));
    expect(count(/12\.03\.26/g)).toBeGreaterThanOrEqual(5);
    expect(count(/5:00–6:30 PM/g)).toBeGreaterThanOrEqual(5);
    expect(count(/Grand Atrium/g)).toBeGreaterThanOrEqual(5);
  });

  it('describes the page for a link preview in one line', () => {
    expect(describePage(c)).toBe('The Creative Computing class showcase. Thursday, December 3, 2026, 5:00–6:30 PM. Grand Atrium, Meadows School of the Arts, SMU.');
  });

  it('keeps the moving cameras out of the tab order and the accessible tree (the feeds and keys carry them)', () => {
    expect(count(/<a class="cam"[^>]*tabindex="-1" aria-hidden="true"/g)).toBe(c.channels.length);
    expect(count(/<canvas[^>]*aria-hidden="true"/g)).toBe(2);
  });

  it('offers a way to save the date without an RSVP link, and an RSVP button once there is one', () => {
    expect(c.rsvpUrl).toBe('');
    expect(html).toContain('Add to Google Calendar');
    expect(html).toContain('href="c3-showcase.ics"');
    expect(html).not.toContain('>RSVP<');
    expect(html).toContain('class="bar__cta" href="#attend">Save the date</a>');
    const withRsvp = renderCase({ ...c, rsvpUrl: 'https://example.com/rsvp' }, s, W);
    expect(withRsvp).toContain('href="https://example.com/rsvp"');
    expect(withRsvp).toContain('class="bar__cta" href="#attend">RSVP</a>');
  });

  it('hides links whose URL is empty', () => {
    expect(html).toContain('Open in maps');
    expect(renderCase({ ...c, mapUrl: '' }, s, W)).not.toContain('Open in maps');
    expect(html).not.toContain('bar__follow');
    expect(renderCase({ ...c, followUrl: 'https://example.com/f' }, s, W)).toContain('bar__follow');
  });

  it('opens outside links in a new tab without handing over the page', () => {
    const outside = html.match(/<a [^>]*href="https?:[^>]*>/g) ?? [];
    expect(outside.length).toBeGreaterThan(2);
    for (const a of outside) expect(a).toMatch(/target="_blank" rel="noopener"/);
  });

  it('leaves the poster credit off until her name is in, then shows it', () => {
    expect(c.artist).toBe('0.0.0');
    expect(html).not.toContain('Poster art by');
    expect(text(html)).not.toContain('0.0.0');
    expect(renderCase({ ...c, artist: 'Her Name' }, s, W)).toMatch(/Poster art by<\/p><p class="credit">Her Name</);
  });

  it('lists the class\'s projects once there are some', () => {
    expect(html).not.toContain('class="projects"');
    const withWork = renderCase({ ...c, work: { ...c.work, projects: [{ title: 'Battle Ball', by: 'A. Student', url: 'https://example.com/b' }, { title: 'No Link' }] } }, s, W);
    expect(withWork).toContain('class="projects"');
    expect(withWork).toContain('href="https://example.com/b"');
    expect(withWork).toContain('<span class="projects__title">No Link</span>');
  });

  it('says nothing the event does not: no made-up readouts', () => {
    const t = text(html).toLowerCase();
    for (const word of ['augmentation', 'bpm', 'specimen', 'rec 00', 'booth 0', 'sync']) expect(t, word).not.toContain(word);
  });

  it('escapes content', () => {
    expect(esc(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');
    expect(renderCase({ ...c, about: '<img src=x onerror=alert(1)>' }, s, W)).not.toContain('<img src=x');
  });

  it('sizes every channel title to fit its line', () => {
    for (const ch of c.channels) {
      for (const line of ch.title) {
        const k = fitFraction(line, W);
        expect(k * emWidth(line, W)).toBeLessThanOrEqual(1);
        expect(k).toBeLessThanOrEqual(0.36);
        for (const chr of line) expect(W[chr], `width of "${chr}"`).toBeDefined();
      }
    }
  });
});
