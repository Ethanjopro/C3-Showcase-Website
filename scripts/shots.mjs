// npm run shots: build, serve dist/, and capture every state of the case at
// 390 x 844, 390 x 664 (a phone with Safari's toolbars up) and 1440 x 900 into .shots/ (CLAUDE.md "Check your work").
//
//   .shots/<state>@<width>.png       sealed, open, scan (phone), info … poster
//   .shots/<state>-reduced@<width>.png  the same with prefers-reduced-motion
//
// Flags: --no-build (reuse dist/), and state names to capture only those,
// e.g. `npm run shots -- open info`.

import { build, preview } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.shots');
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const want = (name) => !only.length || only.includes(name);

export const VIEWPORTS = {
  1440: { viewport: { width: 1440, height: 900 } },
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  // The same phone as Safari first shows it, toolbars up: what a poster-scanner actually sees.
  '390x664': { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, only: ['sealed', 'open', 'info'] },
};

// Each state: a URL hash, whether the case starts open, and an optional action.
const STATES = [
  { name: 'sealed', hash: '' },
  { name: 'open', hash: '', open: true },
  { name: 'scan', hash: '', open: true, widths: [390], act: async (page) => page.mouse.move(195, 380) },
  { name: 'hover', hash: '', open: true, widths: [1440], act: async (page) => page.hover('.feed[data-feed="2"]') },
  { name: 'lens', hash: '', open: true, widths: [1440], act: async (page) => page.mouse.move(720, 560) },
  { name: 'info', hash: '#info' },
  { name: 'attend', hash: '#attend' },
  { name: 'work', hash: '#work' },
  { name: 'poster', hash: '#poster' },
];

if (!args.includes('--no-build')) await build({ root: ROOT, logLevel: 'warn' });
const server = await preview({ root: ROOT, preview: { port: 4183, strictPort: false }, logLevel: 'warn' });
const base = server.resolvedUrls.local[0];
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const reduced of [false, true]) {
  for (const [w, { only: onlyStates, ...opts }] of Object.entries(VIEWPORTS)) {
    for (const s of STATES) {
      if (!want(s.name) || (s.widths && !s.widths.includes(Number(w))) || (onlyStates && !onlyStates.includes(s.name))) continue;
      if (reduced && onlyStates) continue;
      if (reduced && !['sealed', 'open', 'info'].includes(s.name)) continue;
      const ctx = await browser.newContext({ ...opts, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      if (s.open) await ctx.addInitScript(() => sessionStorage.setItem('c3.open', '1'));
      const page = await ctx.newPage();
      await page.goto(`${base}?still=20${s.hash}`);
      await page.waitForSelector('html[data-booted]');
      await page.evaluate(() => document.fonts.ready);
      if (s.act) await s.act(page);
      await page.waitForTimeout(1700);
      const file = `${s.name}${reduced ? '-reduced' : ''}@${w}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      console.log('shot', file);
      await ctx.close();
    }
  }
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
