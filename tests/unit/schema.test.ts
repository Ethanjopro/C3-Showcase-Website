// The shapes every parallel session relies on: art manifest, content files,
// feature flags vs the effect registry, and the colors-only-through-tokens rule.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../../src/art/manifest.json';
import features from '../../src/config/features.json';
import event from '../../src/content/event.json';
import sections from '../../src/content/sections.json';
import projects from '../../src/content/projects.json';
import site from '../../src/content/site.json';

const ROOT = path.resolve(__dirname, '../..');
const SLOTS = ['lineart', 'fill', 'halo', 'cables', 'ribcage', 'eyescreen', 'wings', 'paper', 'title']; // CLAUDE.md

type Rect = { x: number; y: number; w: number; h: number };
const inUnit = (r: Rect) => r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001;

describe('art manifest', () => {
  const slots = manifest.slots as Record<string, Record<string, unknown>>;

  it('has exactly the slots CLAUDE.md names', () => {
    expect(Object.keys(slots).sort()).toEqual([...SLOTS].sort());
  });

  for (const name of SLOTS) {
    it(`${name}: source in art-src/, built file in public/, valid tint`, () => {
      const s = slots[name]!;
      expect(String(s.source)).toMatch(/^art-src\//);
      expect(existsSync(path.join(ROOT, String(s.source)))).toBe(true);
      expect(existsSync(path.join(ROOT, 'public', String(s.src)))).toBe(true);
      expect(['ink', 'accent', 'paper']).toContain(s.tint);
      if (s.tint !== 'paper') {
        expect(s.width).toBe(manifest.frame.width);
        expect(s.height).toBe(manifest.frame.height);
      }
    });
  }

  it('keeps every geometry value inside the poster (0-1)', () => {
    const s = manifest.slots;
    expect(inUnit(s.ribcage.rect)).toBe(true);
    expect(inUnit(s.eyescreen.rect)).toBe(true);
    expect(inUnit(s.title.rect)).toBe(true);
    expect(inUnit(s.title.regions.c3)).toBe(true);
    expect(s.halo.screens.length).toBeGreaterThan(0);
    s.halo.screens.forEach((r) => expect(inUnit(r)).toBe(true));
    expect(s.cables.anchors.length).toBeGreaterThan(0);
    s.cables.anchors.forEach((a) => expect(a.x >= 0 && a.x <= 1 && a.y >= 0 && a.y <= 1 && a.length > 0).toBe(true));
  });

  it('ships nothing from reference/', () => {
    for (const s of Object.values(slots)) expect(String(s.source)).not.toMatch(/reference\//);
  });
});

describe('content', () => {
  it('keeps her placeholders until real details exist', () => {
    expect(typeof event.date).toBe('string');
    expect(typeof event.location).toBe('string');
    expect(event.date.length).toBeGreaterThan(0);
    expect(event.location.length).toBeGreaterThan(0);
  });

  it('has unique section ids that exist in index.html', () => {
    const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const ids = sections.items.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
  });

  it('describes the projects teaser and the poster', () => {
    expect(['teaser', 'archive']).toContain(projects.mode);
    expect(projects.screens).toBeGreaterThan(0);
    expect(site.posterAlt.length).toBeGreaterThan(40);
  });
});

describe('effects', () => {
  const names = Object.keys(features.effects);
  const registry = readFileSync(path.join(ROOT, 'src/effects/registry.ts'), 'utf8');

  it('has a folder with init/destroy, README and shots.json for every flag', () => {
    for (const name of names) {
      const dir = path.join(ROOT, 'src/effects', name);
      const index = readFileSync(path.join(dir, 'index.ts'), 'utf8');
      expect(index).toMatch(/export (async )?function init/);
      expect(index).toMatch(/export function destroy/);
      expect(existsSync(path.join(dir, 'README.md'))).toBe(true);
      expect(Array.isArray(JSON.parse(readFileSync(path.join(dir, 'shots.json'), 'utf8')))).toBe(true);
      expect(registry).toContain(`name: '${name}'`);
    }
  });

  it('lists only known effects as prehidden', () => {
    for (const name of features.prehide) expect(names).toContain(name);
  });
});

describe('colors only through tokens', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  }

  it('has no raw hex colors outside src/styles/tokens.css', () => {
    const offenders: string[] = [];
    for (const file of [...files(path.join(ROOT, 'src')), path.join(ROOT, 'index.html')]) {
      if (file.endsWith('tokens.css') || !/\.(css|ts|html)$/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      const re = file.endsWith('.css') ? /#[0-9a-f]{3,8}\b/gi : /['"`(:\s]#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/gi;
      for (const m of text.match(re) ?? []) offenders.push(`${path.relative(ROOT, file)}: ${m.trim()}`);
    }
    expect(offenders).toEqual([]);
  });
});
