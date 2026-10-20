// npm run shots: build, serve dist/, and capture each section at 1440x900 and
// 390x844 into .shots/ with Playwright (CLAUDE.md).
//
//   .shots/<section>@<width>.png          poster (the first screen), info, projects, credits
//   .shots/<section>-reduced@<width>.png  the same with prefers-reduced-motion
//   .shots/menu@<width>.png               the menu dialog, open
//   .shots/page@<width>.png               the whole page
//   .shots/<effect>-<state>@<width>.png   every state in src/effects/*/shots.json
//
// Flags: --no-build (reuse dist/), and effect or section names to capture only
// those, e.g. `npm run shots -- xray poster`.
//
// shots.json format (PLAN 1.9):
//   [{ "name": "revealed", "query": "?freeze=0",
//      "steps": [{ "scrollTo": "#poster" }, { "tap": ".x" }, { "click": ".y" },
//                { "swipe": { "from": [0.3, 0.5], "to": [0.7, 0.5] } },
//                { "press": "Tab" }, { "hover": ".z" }, { "wait": 300 }],
//      "viewports": [390, 1440], "reducedMotion": false }]
// swipe coordinates are fractions of the viewport. Without "viewports", both.

import { build, preview } from 'vite';
import { chromium } from '@playwright/test';
import { readdir, readFile, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
};

const SECTIONS = ['poster', 'info', 'projects', 'credits'];

async function ready(page) {
  await page.waitForSelector('html[data-booted]', { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function swipe(page, cdp, from, to, touch) {
  const { width, height } = page.viewportSize();
  const [x0, y0, x1, y1] = [from[0] * width, from[1] * height, to[0] * width, to[1] * height];
  const steps = 12;
  if (!touch) {
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x1, y1, { steps });
    await page.mouse.up();
    return;
  }
  const point = (x, y) => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(x0, y0) });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function runSteps(page, cdp, steps, touch) {
  for (const step of steps ?? []) {
    if (step.scrollTo) await page.locator(step.scrollTo).first().scrollIntoViewIfNeeded();
    if (step.click) await page.locator(step.click).first().click();
    if (step.tap) await (touch ? page.locator(step.tap).first().tap() : page.locator(step.tap).first().click());
    if (step.hover) await page.locator(step.hover).first().hover();
    if (step.press) await page.keyboard.press(step.press);
    if (step.swipe) await swipe(page, cdp, step.swipe.from, step.swipe.to, touch);
    if (step.wait) await page.waitForTimeout(step.wait);
  }
}

async function effectStates() {
  const dir = path.join(ROOT, 'src/effects');
  const out = [];
  for (const name of await readdir(dir)) {
    const file = path.join(dir, name, 'shots.json');
    if (!existsSync(file)) continue;
    for (const state of JSON.parse(await readFile(file, 'utf8'))) out.push({ effect: name, ...state });
  }
  return out;
}

if (!args.includes('--no-build')) await build({ root: ROOT, logLevel: 'warn' });
const server = await preview({ root: ROOT, preview: { port: 4174, strictPort: false }, logLevel: 'warn' });
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch();
// A full run starts clean; a subset run (`npm run shots -- xray`) only
// overwrites its own files and keeps the rest for comparison.
if (!only.length) await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const written = [];
const errors = [];

try {
  for (const [width, ctxOpts] of Object.entries(VIEWPORTS)) {
    const touch = Boolean(ctxOpts.hasTouch);
    for (const reduced of [false, true]) {
      const context = await browser.newContext({ ...ctxOpts, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      page.on('console', (m) => m.type() === 'error' && errors.push(`${width}${reduced ? ' reduced' : ''}: ${m.text()}`));
      page.on('pageerror', (e) => errors.push(`${width}: ${e.message}`));
      await page.goto(base);
      await ready(page);
      const suffix = reduced ? '-reduced' : '';
      for (const section of SECTIONS) {
        if (!want(section)) continue;
        const file = path.join(OUT, `${section}${suffix}@${width}.png`);
        if (section === 'poster') {
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await page.waitForTimeout(100);
          await page.screenshot({ path: file });
        } else {
          // Pad the clip: each panel's screen tag straddles its top frame line.
          const el = page.locator(`#${section}`);
          await el.scrollIntoViewIfNeeded();
          const box = await el.evaluate((n) => {
            const r = n.getBoundingClientRect();
            return { y: r.top + window.scrollY, height: r.height };
          });
          const pad = 40;
          // Fixed chrome would land mid-section in a full-page clip; it has its own shot (poster).
          const hide = await page.addStyleTag({ content: '.chrome{visibility:hidden}' });
          await page.screenshot({
            path: file,
            fullPage: true,
            clip: { x: 0, y: Math.max(0, box.y - pad), width: page.viewportSize().width, height: box.height + 2 * pad },
          });
          await hide.evaluate((el) => el.remove());
        }
        written.push(file);
      }
      if (want('menu')) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.locator('[data-menu-open=""]').click();
        await page.locator('dialog#menu').waitFor({ state: 'visible' });
        await page.waitForTimeout(150);
        const file = path.join(OUT, `menu${suffix}@${width}.png`);
        await page.screenshot({ path: file });
        written.push(file);
        await page.keyboard.press('Escape');
      }
      if (!reduced && want('page')) {
        const file = path.join(OUT, `page@${width}.png`);
        await page.screenshot({ path: file, fullPage: true });
        written.push(file);
      }
      await context.close();
    }
  }

  for (const state of await effectStates()) {
    if (!want(state.effect) && !want(`${state.effect}-${state.name}`)) continue;
    for (const width of state.viewports ?? Object.keys(VIEWPORTS)) {
      const ctxOpts = VIEWPORTS[width];
      if (!ctxOpts) throw new Error(`${state.effect}/shots.json: unknown viewport ${width}`);
      const context = await browser.newContext({ ...ctxOpts, reducedMotion: state.reducedMotion ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      const cdp = ctxOpts.hasTouch ? await context.newCDPSession(page) : null;
      page.on('pageerror', (e) => errors.push(`${state.effect}-${state.name}@${width}: ${e.message}`));
      await page.goto(base + (state.query ?? ''));
      await ready(page);
      await runSteps(page, cdp, state.steps, Boolean(ctxOpts.hasTouch));
      const file = path.join(OUT, `${state.effect}-${state.name}@${width}.png`);
      await page.screenshot({ path: file });
      written.push(file);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

for (const f of written) console.log(path.relative(ROOT, f));
if (errors.length) {
  console.error(`\n${errors.length} console error(s):\n` + errors.join('\n'));
  process.exitCode = 1;
}
