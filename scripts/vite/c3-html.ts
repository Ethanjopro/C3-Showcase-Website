// Bakes copy (src/content/*.json) and art slots (src/art/manifest.json) into
// index.html at build time, so the complete static poster and every word are
// in the HTML before any JavaScript runs (SPEC §1, "Static first").
//
// The template tags are documented at the top of index.html.

import type { Plugin, ViteDevServer } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rng } from '../../src/core/raster.ts';
import { roughFrame } from '../../src/core/rough-frame.ts';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Slot {
  src: string;
  tint: 'ink' | 'accent' | 'paper';
  inline?: boolean;
  rect?: Rect;
  screens?: Rect[];
}

interface Manifest {
  frame: { width: number; height: number };
  slots: Record<string, Slot>;
}

type Data = Record<string, unknown>;

const BASE = '/';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function lookup(data: Data, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Data)[k] : undefined), data);
}

const truthy = (v: unknown) => v !== undefined && v !== null && v !== '' && v !== false;

const n = (v: number) => +v.toFixed(2);
const pct = (v: number) => `${n(v * 100)}%`;

/** Her stacked hatching strokes (the ≡ marks beside the figure on her poster). */
export function hatch(seed: number): string {
  const r = rng(seed);
  const lines = [0, 1, 2].map((i) => {
    const y = 6 + i * 9 + (r() - 0.5) * 2;
    const x0 = 2 + r() * 6;
    const x1 = 70 + r() * 28;
    return `M${n(x0)} ${n(y + (r() - 0.5) * 2)}Q${n((x0 + x1) / 2)} ${n(y + (r() - 0.5) * 3)} ${n(x1)} ${n(y + (r() - 0.5) * 2)}`;
  });
  return `<svg class="hatch" viewBox="0 0 100 30" aria-hidden="true" focusable="false"><path d="${lines.join('')}"/></svg>`;
}

/** A printer's registration mark (circle and cross), drawn in her wobbly line. */
export function regMark(seed: number): string {
  const r = rng(seed);
  const j = (a: number) => (r() - 0.5) * a;
  const pts: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = 11 + j(1.2);
    pts.push(`${n(16 + Math.cos(a) * rr)} ${n(16 + Math.sin(a) * rr)}`);
  }
  const cross = `M${n(1 + j(1))} ${n(16 + j(1))}L${n(31 + j(1))} ${n(16 + j(1))}M${n(16 + j(1))} ${n(1 + j(1))}L${n(16 + j(1))} ${n(31 + j(1))}`;
  return `<svg class="reg" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M${pts.join('L')}Z${cross}"/></svg>`;
}

/** Her red scribble circle, the one she drew around the chosen colorway. */
function scribbleCircle(seed: number): string {
  const r = rng(seed);
  const pts: string[] = [];
  const turns = 1.7;
  for (let i = 0; i <= 40; i++) {
    const a = -0.6 + (i / 40) * Math.PI * 2 * turns;
    const rr = 1 + (r() - 0.5) * 0.08 + i * 0.002;
    pts.push(`${n(50 + Math.cos(a) * 46 * rr)} ${n(50 + Math.sin(a) * 40 * rr)}`);
  }
  return `<svg class="swatch__circle" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M${pts.join('L')}"/></svg>`;
}

function artLayer(name: string, slot: Slot, root: string): string {
  const open = `<div class="layer layer--${name}" data-slot="${name}"><div class="layer__boil">`;
  const close = `</div>${extras(name, slot)}</div>`;
  if (slot.tint === 'paper') return `${open}<div class="layer__art layer__art--paper"></div>${close}`;
  if (slot.inline) {
    const svg = readFileSync(path.join(root, 'public', slot.src), 'utf8')
      .trim()
      .replace(/^<svg /, '<svg class="art-svg" aria-hidden="true" focusable="false" ');
    return `${open}<div class="layer__art layer__art--vector tint-${slot.tint}">${svg}</div>${close}`;
  }
  return `${open}<div class="layer__art layer__art--mask tint-${slot.tint}"></div>${close}`;
}

/**
 * Every art URL, as an inline <style>. A url() inside a CSS custom property
 * resolves against the stylesheet that uses it (dist/assets/), not the page,
 * so the art rules live here in the document, where relative URLs resolve
 * against the page under any base path.
 */
function artStyles(manifest: Manifest, colorways: string[]): string {
  const rules: string[] = colorways.map(
    (id) => `html[data-colorway="${id}"] .swatch[data-colorway="${id}"] .swatch__circle{opacity:1}`,
  );
  for (const [name, slot] of Object.entries(manifest.slots)) {
    const u = `url(${BASE}${slot.src})`;
    if (slot.tint === 'paper') rules.push(`body,.menu,.panel,.layer__art--paper{background-image:${u}}`);
    else if (!slot.inline) rules.push(`.layer--${name} .layer__art--mask{-webkit-mask-image:${u};mask-image:${u}}`);
  }
  return `<style>${rules.join('')}</style>`;
}

/** Mounts that live inside a slot's layer. */
function extras(name: string, slot: Slot): string {
  if (name === 'cables') return `<div class="fx-mount" data-fx="cables"></div>`;
  if (name === 'eyescreen' && slot.rect) {
    const r = slot.rect;
    return `<div class="layer__crt" data-crt style="left:${pct(r.x)};top:${pct(r.y)};width:${pct(r.w)};height:${pct(r.h)}"></div>`;
  }
  return '';
}

// No radio is `checked` in the HTML: the boot script may already have applied a
// stored colorway, and initColorbar() syncs the radios. The scribble circle
// follows <html data-colorway> (inline rules below), so it's right from first paint.
function colorbar(group: string, data: Data): string {
  const cw = data.colorways as { label: string; items: { id: string; name: string }[] };
  const items = cw.items
    .map(({ id, name }, i) => {
      const inputId = `cw-${group}-${id}`;
      return (
        `<span class="swatch" data-colorway="${id}">` +
        `<input class="swatch__input" type="radio" name="colorway-${group}" id="${inputId}" value="${id}" data-colorway-input>` +
        `<label class="swatch__label" for="${inputId}" title="${escape(name)}">` +
        `<span class="swatch__chip"><span class="swatch__fill"></span></span>` +
        `<span class="visually-hidden">${escape(name)}</span>${scribbleCircle(70 + i)}</label></span>`
      );
    })
    .join('');
  return `<fieldset class="colorbar colorbar--${group}"><legend class="colorbar__legend">${escape(cw.label)}</legend><div class="colorbar__items">${items}</div></fieldset>`;
}

/** A section's heading, as a small boxy screen tagged with its menu number. */
function sectionTag(id: string, data: Data): string {
  const sections = (data.sections as { items: { id: string; index: string; name: string }[] }).items;
  const i = sections.findIndex((s) => s.id === id);
  const s = sections[i];
  if (!s) throw new Error(`c3-html: no section "${id}" in src/content/sections.json`);
  return `<h2 id="${id}-title" class="screen-tag"><span class="screen-tag__no">${escape(s.index)}</span> ${escape(s.name)}${roughFrame(19 + 2 * i)}</h2>`;
}

function menuItems(data: Data): string {
  const sections = (data.sections as { items: { id: string; index: string; name: string }[] }).items;
  return sections
    .map(
      (s, i) =>
        `<li class="menu__item"><a class="menu__screen" href="#${s.id}"><span class="menu__no">${escape(s.index)}</span> ${escape(s.name)}${roughFrame(90 + i)}</a></li>`,
    )
    .join('');
}

function screens(data: Data): string {
  const count = Number((data.projects as { screens: number }).screens) || 0;
  const items = Array.from(
    { length: count },
    (_, i) => `<li class="screen"><div class="screen__glass" data-crt></div>${roughFrame(40 + i)}</li>`,
  ).join('');
  return `<ul class="screens" aria-hidden="true">${items}</ul>`;
}

/** src/core/parse-flags.js, ready to inline: the same code core/flags.ts runs. */
const parseFlagsSource = readFileSync(fileURLToPath(new URL('../../src/core/parse-flags.js', import.meta.url)), 'utf8')
  .replace(/^\/\/.*$/gm, '')
  .replace(/\/\*\*[\s\S]*?\*\//g, '')
  .replace('export function', 'function');

export function bootScript(features: { effects: Record<string, boolean>; prehide: string[] }, colorways: string[]): string {
  // Flags come from parseFlags itself; motion mirrors src/core/motion.ts (?quality, reduced motion).
  const js = `(function(){${parseFlagsSource}
var h=document.documentElement;h.classList.add('js');
try{var c=localStorage.getItem('c3:colorway');if(c&&${JSON.stringify(colorways)}.indexOf(c)>-1)h.setAttribute('data-colorway',c)}catch(e){}
var q=new URLSearchParams(location.search),on=parseFlags(${JSON.stringify(features.effects)},location.search),p=${JSON.stringify(features.prehide)},qq=q.get('quality');
var still=qq==='static'||(qq!=='full'&&qq!=='lite'&&window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
if(!still)p.forEach(function(n){var d=null;try{d=sessionStorage.getItem('c3:fx-done:'+n)}catch(e){}if(on[n]&&!d)h.classList.add('fx-pending-'+n)});
setTimeout(function(){p.forEach(function(n){h.classList.remove('fx-pending-'+n)})},4000)})();`;
  return `<script>${js.replace(/\n\s*/g, '')}</script>`;
}

export function loadData(root: string): { data: Data; manifest: Manifest; features: { effects: Record<string, boolean>; prehide: string[] } } {
  const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), 'utf8'));
  const data: Data = {};
  for (const file of readdirSync(path.join(root, 'src/content'))) {
    if (file.endsWith('.json')) data[file.replace(/\.json$/, '')] = read(`src/content/${file}`);
  }
  const manifest = read('src/art/manifest.json') as Manifest;
  const halo = manifest.slots.halo?.screens ?? [];
  const x0 = Math.min(...halo.map((r) => r.x)),
    y0 = Math.min(...halo.map((r) => r.y));
  const x1 = Math.max(...halo.map((r) => r.x + r.w)),
    y1 = Math.max(...halo.map((r) => r.y + r.h));
  data.art = {
    frameVars: `--frame-w: ${manifest.frame.width}; --frame-h: ${manifest.frame.height}`,
    haloHit: halo.length ? `left:${pct(x0)};top:${pct(y0)};width:${pct(x1 - x0)};height:${pct(y1 - y0)}` : 'display:none',
  };
  return { data, manifest, features: read('src/config/features.json') };
}

export function render(html: string, root: string): string {
  const { data, manifest, features } = loadData(root);
  const colorways = (data.colorways as { items: { id: string }[] }).items.map((c) => c.id);
  let out = html.replace(/<!--[\s\S]*?-->\n?/, ''); // the template notes at the top

  // Conditionals first, so their contents only render when kept.
  out = out.replace(/<c3-(if|unless) path="([\w.]+)">([\s\S]*?)<\/c3-\1>/g, (_, kind: string, key: string, inner: string) =>
    truthy(lookup(data, key)) === (kind === 'if') ? inner : '',
  );
  out = out.replace(/<c3-art slot="(\w+)"><\/c3-art>/g, (_, name: string) => {
    const slot = manifest.slots[name];
    if (!slot) throw new Error(`c3-html: no slot "${name}" in src/art/manifest.json`);
    return artLayer(name, slot, root);
  });
  out = out.replace(/<c3-frame seed="(\d+)"><\/c3-frame>/g, (_, s: string) => roughFrame(Number(s)));
  out = out.replace(/<c3-hatch seed="(\d+)"><\/c3-hatch>/g, (_, s: string) => hatch(Number(s)));
  out = out.replace(/<c3-reg seed="(\d+)"><\/c3-reg>/g, (_, s: string) => regMark(Number(s)));
  out = out.replace(/<c3-colorbar group="(\w+)"><\/c3-colorbar>/g, (_, g: string) => colorbar(g, data));
  out = out.replace(/<c3-menu-items><\/c3-menu-items>/g, () => menuItems(data));
  out = out.replace(/<c3-section-tag id="([\w-]+)"><\/c3-section-tag>/g, (_, id: string) => sectionTag(id, data));
  out = out.replace(/<c3-screens><\/c3-screens>/g, () => screens(data));
  out = out.replace(/<c3-boot><\/c3-boot>/g, () => bootScript(features, colorways) + artStyles(manifest, colorways));
  out = out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = lookup(data, key);
    if (v === undefined || typeof v === 'object') throw new Error(`c3-html: no copy for {{ ${key} }}`);
    return escape(String(v));
  });
  const leftover = out.match(/<\/?c3-[\w-]+[^>]*>/);
  if (leftover) throw new Error(`c3-html: unknown template tag ${leftover[0]}`);
  return out;
}

export function c3Html(): Plugin {
  let root = process.cwd();
  return {
    name: 'c3-html',
    configResolved(config) {
      root = config.root;
    },
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => render(html, root),
    },
    configureServer(server: ViteDevServer) {
      const watched = ['src/content', 'src/art/manifest.json', 'src/config/features.json', 'public/art'].map((p) => path.join(root, p));
      server.watcher.add(watched);
      server.watcher.on('change', (file) => {
        if (watched.some((w) => file.startsWith(w))) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
